'use client'
// 卡②「拿 PR」两态页(L2-01/L2-02:答题与看报告是两个界面,互跳靠一个按钮)。
// 答题态=SurveyJS(2026-07-31 Frank「用框架吧」):题库=lib/questions.ts 纯 JSON 配置,一屏一题/
// 进度条/上一题下一题/多语全由框架出;**选中不自动跳**(2026-07-31 Frank),跳转由用户按「下一题/出报告」。
// 报告态=结论/缺口/下一步/备选(/api/report → rpt.* 三语渲染),与引擎契约同构。
// 跨卡复用铁律:currentStatus/目标省/职业从三问预填(答过的不重新问,预填可改);职业用三问的 nocs[0],
// 没答过 → 页内拉起 EntryQuiz(同一组件不复制)。答案存 localStorage,改答案 → 报告立刻重算。
import { useEffect, useMemo, useState } from 'react'
import { Model, surveyLocalization } from 'survey-core'
import { Survey } from 'survey-react-ui'
import 'survey-core/survey-core.css'
import 'survey-core/i18n/simplified-chinese'
import 'survey-core/i18n/korean'

import { initialLang, makeT, LANG_KEY, type Lang, type TFn } from '../jobs/i18n'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { shortOcc } from '../quiz/EntryQuiz'
import { OccPicker } from '../quiz/OccPicker'
import { Button, Notice, PageShell, Tag, UI } from '../ui/primitives'
import { clearAnswers, readAnswers, toEngineAnswers, writeAnswers, type Answers } from '@/lib/answers'
import { DECISIONS, fieldsOf } from '@/lib/decisions'
import { buildSurvey, SURVEY_THEME } from '@/lib/questions'
import { goBackOr } from '../BackLink'
import { track } from '@/lib/track'

// 进度文字:框架 zh-cn 包把 "Answered {0}/{1} questions" 译成「第 {0}/{1} 题」(第一题显示「第 0/4 题」,
// 像页码且是错的)。2026-07-31 Frank 又指出「已答 0/2 题」这套考试口吻不专业、不像会付费的东西 ——
// 改成建档口吻「已填 {0}/{1} 项」(英韩同族),卡头标签同步从「基本题」改「你的条件」。
surveyLocalization.locales['zh-cn'].questionsProgressText = '已填 {0}/{1} 项'
surveyLocalization.locales.en.questionsProgressText = '{0}/{1} completed'
surveyLocalization.locales.ko.questionsProgressText = '{0}/{1} 완료'

// 答案存储与档位换算都归 lib/answers + lib/fields(2026-07-31 统一题库:一个 key、一处换算);
// 本页只管两态与版式,不再自己存答案、不再自己抄 CLB/EXP/PROVS 映射表。

type RptLine = { key: string; params: Record<string, string | number>; verdict?: string; source?: { label: string; url: string; fetched: string }; url?: string }
type Lane = { kind: 'prov' | 'ee' | 'alts'; verdict?: string; key: string; params: Record<string, string | number> }
type Rpt = {
  noc: string; title: string; conclusions: RptLine[]; requirements: RptLine[]; gaps: RptLine[]; nextSteps: RptLine[]; alternatives: RptLine[]
  confidence: 'low' | 'mid' | 'high'; asOf: string
  lanes: Lane[]; hint?: RptLine; locked: string[]; pro: boolean   // 付费闸(服务端已裁剪,locked 只有类别键没有正文)
}

const V_DOT: Record<string, string> = { pass: UI.ok, warn: '#b45309', fail: '#b91c1c', na: '#9ca3af' }
const V_CHIP: Record<string, { bg: string; fg: string }> = {
  pass: { bg: '#dcfce7', fg: '#166534' }, warn: { bg: '#fef3c7', fg: '#92400e' },
  fail: { bg: '#fee2e2', fg: '#991b1b' }, na: { bg: '#f3f4f6', fg: '#6b7280' },
}
const CARD: React.CSSProperties = { background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 12, padding: '12px 16px', margin: '10px 0' }

// 动作钮共用样式(报告态顶部的「改答案」「存为 PDF」)
const BTN: React.CSSProperties = { border: `1px solid ${UI.border}`, background: '#fff', color: UI.text, borderRadius: 8, padding: '5px 14px', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }

// 职业 chip:答题态常驻;报告态**没职业时**也出(空报告说「先选职业」却没有入口=死路,2026-07-31 实拍抓到)
function OccChip({ noc, nocTitle, t, onPick }: { noc: string; nocTitle: string; t: TFn; onPick: () => void }) {
  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', maxWidth: '100%', fontSize: 12.5, color: UI.text2, background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 999, padding: '5px 12px' }}>
      <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{t('plan.occ')}</span>
      {noc
        ? <b style={{ color: '#111827', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortOcc(nocTitle || noc)}</b>
        : <span style={{ color: '#b45309', whiteSpace: 'nowrap' }}>{t('plan.occ.none')}</span>}
      <button onClick={onPick} style={{ border: 'none', background: 'none', color: UI.primary, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>{t('plan.occ.pick')}</button>
    </span>
  )
}

// 脚注编号:正文里只留 [n],链接与出处全部收在底部「依据与链接」一节
// (2026-07-31 Frank「出处和跳转放到一个 section 统一管理」——原先每行尾巴挂一个链接,
//  五六条结论就是五六个散落的入口,读的时候被打断,打印出来更是一堆没用的箭头)
// 正文只留文字:上标编号 2026-07-31 撤掉(Frank「每一行后面都有一个小数字是什么」——
// 要靠解释才懂的记号就是没做对)。出处与跳转仍统一收在底部「依据与链接」,按名字自解释。
function Line({ l, t }: { l: RptLine; t: TFn }) {
  return (
    <li style={{ margin: '7px 0', lineHeight: 1.7, listStyle: 'none', display: 'flex', gap: 9, alignItems: 'baseline' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: V_DOT[l.verdict ?? 'na'], position: 'relative', top: -1 }} />
      <span style={{ flex: 1, minWidth: 0 }}>{t(l.key, l.params)}</span>
    </li>
  )
}

// 报告里所有对外链接的**唯一出口**:结论/缺口/备选的出处 + 下一步的跳转,按出现顺序编号去重。
// label 用它自己的名字(官方清单名 / 动作名),不写「点这里」;日期跟着出处走。
type RefRow = { n: number; label: string; url: string; fetched?: string }
function collectRefs(r: Rpt, t: TFn): { rows: RefRow[]; of: (l: RptLine) => number | undefined } {
  const rows: RefRow[] = []
  const byUrl = new Map<string, number>()
  const add = (url: string, label: string, fetched?: string): number => {
    const seen = byUrl.get(url)
    if (seen) return seen
    const n = rows.length + 1
    byUrl.set(url, n)
    rows.push({ n, label, url, fetched })
    return n
  }
  const urlOf = (l: RptLine): string => l.source?.url || l.url || ''
  // 名字按**目的地**取,不按引用它的那一行取 —— 同一个页面被三行引用时,编号合并了,
  // 名字却只留第一行的说法就对不上(实撞:三条都指 /pathways,却写着「BC 有官方分值表」)
  const DEST: Record<string, string> = { '': 'rpt.dest.jobs', pathways: 'rpt.dest.pathways', stats: 'rpt.dest.stats', occupations: 'rpt.dest.occ', plan: 'rpt.dest.plan' }
  const labelOf = (l: RptLine): string => {
    if (l.source?.label) return l.source.label
    const u = urlOf(l)
    if (!u) return ''
    if (u.startsWith('http')) { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }
    const seg = u.replace(/^\//, '').split(/[?#/]/)[0]
    if (!DEST[seg]) return t('rpt.dest.site')
    // 同一个目的地被多条引用时,靠参数区分(两条「职位板」看不出谁是哪个省)
    const prov = u.match(/[?&]prov=([A-Z]{2})/)?.[1]
    const noc = u.match(/[?&]noc=(\d{5})/)?.[1]
    return t(DEST[seg]) + (prov ? ` ${prov}` : noc ? ` ${noc}` : '')
  }
  for (const l of [...r.conclusions, ...(r.requirements ?? []), ...r.gaps, ...r.alternatives, ...r.nextSteps]) {
    const u = urlOf(l)
    if (u) add(u, labelOf(l), l.source?.fetched)
  }
  return { rows, of: (l) => byUrl.get(urlOf(l)) }
}

// ① hero:大数字取自首条结论的真数(命中具名 named/open;不公布清单的省只有 open),
// 取不出数就退成纯文本行 —— 不发明合成分(65/100 式移民可行度总分是伪权威)。
function Hero({ r, t }: { r: Rpt; t: TFn }) {
  const c = r.conclusions[0]
  const big = c?.key === 'rpt.c.listedHit' ? { n: c.params.named, of: c.params.open, cap: t('rpt.hero.hit', { prov: c.params.prov }) }
    : c?.key === 'rpt.c.screenPass' ? { n: c.params.open, of: null, cap: t('rpt.hero.open', { prov: c.params.prov }) }
    // 卡①找工作:大数字=目标省在招量;卡⑥职业规划:=你这行全国在招量(都是库里的真数,不合成分)
    : c?.key === 'rpt.p.best' || c?.key === 'rpt.j.openNamed' ? { n: c.params.named, of: c.params.open, cap: t('rpt.hero.hit', { prov: c.params.prov }) }
      : c?.key === 'rpt.p.screen' || c?.key === 'rpt.j.open' ? { n: c.params.open, of: null, cap: t('rpt.hero.jobs', { prov: c.params.prov }) }
        : c?.key === 'rpt.k.self' || c?.key === 'rpt.k.selfWage' ? { n: c.params.open, of: null, cap: t('rpt.hero.self') }
          : null
  if (!big && !r.hint && !c) return null
  return (
    <div className="rptHero" style={{ background: 'linear-gradient(180deg,#eff6ff,#e0edff)', border: '1px solid #dbeafe', borderRadius: 12, padding: '16px 18px', margin: '10px 0' }}>
      <div style={{ flexShrink: 0 }}>
        {big ? (
          <>
            <div style={{ lineHeight: 1 }}>
              <span style={{ fontSize: 40, fontWeight: 800, color: UI.primary, letterSpacing: -1 }}>{big.n}</span>
              {big.of != null && <span style={{ fontSize: 20, fontWeight: 700, color: '#60a5fa' }}>/{big.of}</span>}
            </div>
            <div style={{ fontSize: 12.5, color: '#3b82f6', marginTop: 5 }}>{big.cap}</div>
          </>
        ) : c ? (
          <div style={{ fontSize: 15, fontWeight: 600, color: UI.primaryDeep, lineHeight: 1.6 }}>{t(c.key, c.params)}</div>
        ) : null}
      </div>
      {/* 卡点句不自带链接:它的出处已经在底部「依据与链接」里(全站唯一出口) */}
      {r.hint && (
        <div style={{ fontSize: 14.5, fontWeight: 700, color: UI.primaryDeep, lineHeight: 1.6 }}>
          {t(r.hint.key, r.hint.params)}
        </div>
      )}
    </div>
  )
}

// ② 三卡(Resume Worded 范式:维度名 + 判定词 + 状态章)。判定词是事实,免费;数字在锁区。
function Lanes({ lanes, t }: { lanes: Lane[]; t: TFn }) {
  const NAME: Record<string, string> = { prov: 'rpt.lane.t.prov', ee: 'rpt.lane.t.ee', alts: 'rpt.lane.t.alts' }
  return (
    <div className="rptLanes">
      {lanes.map((l) => {
        const chip = V_CHIP[l.verdict ?? 'na']
        return (
          <div key={l.kind} style={{ ...CARD, margin: 0, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: UI.text2 }}>{t(NAME[l.kind], l.params)}</div>
            <div style={{ fontSize: 17, fontWeight: 700, margin: '6px 0 7px', color: V_DOT[l.verdict ?? 'na'] }}>{t(l.key, l.params)}</div>
            <span style={{ background: chip.bg, color: chip.fg, borderRadius: 6, padding: '2px 8px', fontSize: 11.5, fontWeight: 600 }}>{t(l.key + '.b')}</span>
          </div>
        )
      })}
    </div>
  )
}

// 一个决定=一个参数(统一题库 §3:入口三处共用同一答题器与同一报告页,差别只有问哪些字段、答完出哪份报告)
export function PlanPrView({ decision = 'pr' }: { decision?: 'pr' | 'job' | 'career' | 'prov' } = {}) {
  const hasExplore = (DECISIONS[decision]?.explore.length ?? 0) > 0
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { setLang(initialLang()) }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = useMemo(() => makeT(lang), [lang])

  const [bands, setBands] = useState<Answers>({ status: '', nocs: [], provs: [], clbBand: 0, expBand: 0, provBand: 0, crsBand: 0, pgwpBand: 0 })
  const [noc, setNoc] = useState('')
  const [nocTitle, setNocTitle] = useState('')
  const [view, setView] = useState<'quiz' | 'report'>('quiz')
  const [stage, setStage] = useState<'basic' | 'explore'>('basic')   // 探索卷=报告 hook 的落点(基本 4 题满才进得来)
  // 职业是第一步(2026-07-31 Frank「第一个问题可以先选职业吗」):每条决定的每条结论都要 NOC,
  // 所以它不是常驻 chip 而是流程第一步;已经选过的照样先看到这一步(可换),按「下一题」才进问卷。
  const [occStep, setOccStep] = useState(true)
  const [ready, setReady] = useState(false)
  const [resetArmed, setResetArmed] = useState(false)   // 重置两步:点一下变「确认重置」,再点才清(不弹系统 confirm)
  const [resetNonce, setResetNonce] = useState(0)       // 清完要让 SurveyJS 模型重建,否则旧答案还留在卷里
  // 「确认重置」不能一直红着等在那(Frank 实拍到):8 秒没下文就自己收回
  useEffect(() => {
    if (!resetArmed) return
    const id = setTimeout(() => setResetArmed(false), 8000)
    return () => clearTimeout(id)
  }, [resetArmed])
  const [rpt, setRpt] = useState<Rpt | null | 'loading'>(null)

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    // 入口带职业进来(职位详情页/弹框的报告入口):落地即用,不逼他先答题
    const fromUrl = (sp.get('noc') || '').trim()
    const a = /^\d{5}$/.test(fromUrl) ? writeAnswers({ nocs: [fromUrl] }) : readAnswers()
    setBands(a)
    setNoc(a.nocs[0] || '')
    if (sp.get('view') === 'report') setView('report')
    setReady(true)
    track(`plan-${decision}-open`)
  }, [])
  // 职业名回显(代码不裸奔):/api/quiz?noc 与三问结果页同端点
  useEffect(() => {
    if (!noc) { setNocTitle(''); return }
    fetch(`/api/quiz?noc=${encodeURIComponent(noc)}`).then((r) => r.json())
      .then((d) => setNocTitle(lang === 'zh' && d?.facts?.titleZh ? d.facts.titleZh : d?.facts?.title || noc))
      .catch(() => setNocTitle(noc))
  }, [noc, lang])

  const gotoReport = () => {
    track(`plan-${decision}-report`)
    setView('report')
    try { window.history.replaceState(null, '', '?view=report') } catch { /* ignore */ }
  }
  const gotoQuiz = (to: 'basic' | 'explore' = 'basic') => {
    setStage(to)
    setOccStep(to === 'basic')   // 回来改条件,还是从第一步(职业)看起
    setView('quiz')
    try { window.history.replaceState(null, '', window.location.pathname) } catch { /* ignore */ }
  }

  // SurveyJS 模型:题库 JSON → Model;预填=survey.data;答案变更实时落 localStorage(改答案立刻重算的底座)。
  // ready 后才建(要先读回预填);lang / stage 切换重建(换语言或换卷),当前答案原样带回。
  const survey = useMemo(() => {
    if (!ready || view !== 'quiz') return null
    const m = new Model(buildSurvey(decision, stage))
    m.applyTheme(SURVEY_THEME as any)
    m.locale = lang === 'zh' ? 'zh-cn' : lang === 'ko' ? 'ko' : 'en'
    const b = readAnswers()
    const names = fieldsOf(decision, stage)
    m.data = Object.fromEntries(names.map((n) => [n, (b as any)[n]]).filter(([, v]) => v))
    // 起步落在第一道没答的题(答过的不重走,上一题仍可回去改)。
    // v2 的 questionPerPage 模式导航不走 currentPageNo,走 currentSingleQuestion(实撞:设页号被无视)
    const firstUnanswered = names.map((n) => (b as any)[n]).findIndex((v) => !v)
    if (firstUnanswered > 0) {
      const target = m.getQuestionByName(names[firstUnanswered])
      if (target) m.currentSingleQuestion = target
    }
    // 只合并本卷答到的字段(两卷同住一份答案,整体覆盖会把另一卷的答案抹掉)
    m.onValueChanged.add((s) => {
      const patch = Object.fromEntries(Object.entries(s.data as Record<string, unknown>).filter(([, v]) => v))
      setBands(writeAnswers(patch as Partial<Answers>))
    })
    m.onComplete.add(() => gotoReport())
    return m
  }, [ready, view, stage, lang, decision, resetNonce])   // eslint-disable-line react-hooks/exhaustive-deps

  // 报告态进入即拉(改答案回来再进=重算;答案是幂等输入)
  useEffect(() => {
    if (view !== 'report' || !ready) return
    setRpt('loading')
    const ctrl = new AbortController()
    fetch('/api/report', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', signal: ctrl.signal,
      body: JSON.stringify({ goal: decision, answers: toEngineAnswers(readAnswers()) }),
    }).then((r) => (r.ok ? r.json() : null)).then((d) => setRpt(d?.report ?? null))
      .catch(() => { if (!ctrl.signal.aborted) setRpt(null) })
    return () => ctrl.abort()
  }, [view, ready])

  // 链接编号只算一次:正文的 [n] 与底部「依据与链接」是同一张表,不会对不上
  const refs = useMemo(
    () => (rpt && rpt !== 'loading' ? collectRefs(rpt, t) : { rows: [] as RefRow[], of: () => undefined as number | undefined }),
    [rpt, t])

  const secH: React.CSSProperties = { fontSize: 14.5, fontWeight: 700, margin: '16px 0 4px', color: '#111827' }

  return (
    <div style={{ background: UI.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="start" />
      {/* 外轨=PageShell 1320(全站统一容器铁律,2026-07-18 拍板「新页面按这个宽度套壳」——
          本页初版自造 760 main 违规,2026-07-31 Frank 点名纠正);答题/报告列 760 居中保行长可读(news 阅读页先例) */}
      <div style={{ flex: '1 0 auto' }}>
        <PageShell pad="1rem 1.25rem 40px">
          <div style={{ maxWidth: view === 'quiz' ? 560 : 760, margin: '0 auto' }}>
        {/* 面包屑(照职位详情页的骨架,2026-07-31 Frank「这个像 job 的导航也没有」):
            入口是 /start 的七目标卡,所以上一级就是「开始规划」 */}
        <div style={{ fontSize: 12, color: UI.text2, marginBottom: 8, lineHeight: 1.7 }}>
          <a href="/start" style={{ color: UI.primary, textDecoration: 'none' }}>{t('home.entry')}</a>
          {' › '}{t(`plan.${decision}.title`)}
        </div>
        {/* 返回(铁律 2026-07-31 Frank「以后加新页面都要加这个返回按钮」):
            照职位详情页那把 —— 有历史走 history.back(保留来处的滚动与筛选),新标签页无处可回就落职位板 */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{ fontSize: 22, margin: '6px 0 4px', flex: 1, minWidth: 0 }}>{t(`plan.${decision}.title`)}</h1>
          {/* 样式与全站返回口径一致(BackLink 药丸、无箭头);这里要 goBackOr 的行为所以用 button 同款样式 */}
          <button onClick={() => goBackOr('/')} style={{ flexShrink: 0, border: `1px solid ${UI.border}`, background: '#fff', color: UI.primary, borderRadius: 999, padding: '4px 14px', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{t('detail.back')}</button>
        </div>

        {view === 'quiz' ? (
          // 答题列比报告列更窄(2026-07-31 Frank「这个问题页面跟狗屎一样」):一屏一题在桌面
          // 撑满 760 轨 = 四个字的选项拉一整行、右边全是空白。Typeform 范式的前提是窄列居中。
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, color: UI.text3, margin: '2px 0 14px' }}>
              <span>{t(stage === 'explore' ? 'plan.explore.sub' : `plan.${decision}.sub`)}</span>
              <span style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                {stage === 'explore' && (
                  <button onClick={() => setStage('basic')} style={{ border: 'none', background: 'none', color: UI.primary, fontSize: 12, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>{t('plan.explore.basic')}</button>
                )}
                {/* 重置:把答案整份丢掉(含三问那份)。两步确认,不用系统 confirm 弹窗 */}
                <button onClick={() => {
                  if (!resetArmed) { setResetArmed(true); return }
                  setBands(clearAnswers()); setNoc(''); setResetArmed(false); setResetNonce((n) => n + 1)
                  track(`plan-${decision}-reset`)
                }} style={{ border: 'none', background: 'none', color: resetArmed ? '#b91c1c' : UI.text3, fontSize: 12, fontWeight: resetArmed ? 700 : 400, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                  {t(resetArmed ? 'plan.reset.ok' : 'plan.reset')}
                </button>
              </span>
            </div>
            {/* 职业进了流程(第一步),这里不再另挂常驻 chip —— 同一件事只出现一次 */}
            {/* 题卡:框架只出题与导航,壳与配色归站内 token —— 选项做成可点的卡(能点才有 hover 和小手),
                主按钮=站蓝(全站按钮统一,不留框架灰块) */}
            <style>{`
.plSurvey .sd-root-modern{background:transparent}
.plSurvey .sd-body{padding:0 !important}
.plSurvey .sd-page{padding:0}
.plSurvey .sd-question__title{font-size:19px;font-weight:700;color:${UI.text};margin-bottom:16px;line-height:1.55}
.plSurvey .sd-selectbase{gap:0;counter-reset:opt}
/* 内边距归 label 不归 item(2026-07-31 Frank「点一下还不行,要点好几下」):
   padding 留在 item 上时,那一圈 11-14px 的边不属于 label,点在上面 radio 收不到 —— 
   看起来就是「有时候点不动」。把 padding 挪进 label,整块卡片才真的是一个点击目标。 */
.plSurvey .sd-item{background:#fff;border:1px solid ${UI.border};border-radius:10px;padding:0;margin-bottom:10px;cursor:pointer;counter-increment:opt}
.plSurvey .sd-item--allowhover:hover{border-color:#93c5fd;background:#f8fbff}
.plSurvey .sd-item--checked{border-color:${UI.primary};background:#eff6ff}
/* 选项字母徽标(照 Frank 的三个答题项目:A/B/C/D 徽标 + 选中反白)——原生 radio 圆点点击目标感弱 */
/* label 必须铺满整行:它只包住文字时,短选项(「中级」「有」)的行中间点下去落在 sd-item 上,
   不在 label 上 —— 用户看到的就是「点了没反应」(2026-07-31 Frank 在卡③实拍到,四个选项都是两个字) */
.plSurvey .sd-selectbase__label{cursor:pointer;display:flex;align-items:center;gap:12px;width:100%;margin:0;padding:11px 14px;box-sizing:border-box}
.plSurvey .sd-radio__decorator{display:none}
.plSurvey .sd-selectbase__label::before{content:counter(opt,upper-alpha);flex-shrink:0;width:26px;height:26px;
  border:1px solid ${UI.border};border-radius:7px;background:#fff;color:${UI.text2};
  font-size:12.5px;font-weight:700;display:flex;align-items:center;justify-content:center}
.plSurvey .sd-item--checked .sd-selectbase__label::before{background:${UI.primary};border-color:${UI.primary};color:#fff}
.plSurvey .sd-item--checked .sd-item__control-label{color:${UI.primaryDeep};font-weight:600}
.plSurvey .sd-progress{background:${UI.hairline};border-radius:999px;height:5px;margin:0 0 26px}
.plSurvey .sd-progress__bar{border-radius:999px}
/* 框架把进度文字绝对定位在进度条上,窄列里正好压住题干 → 拉回文档流,单独一行右对齐 */
.plSurvey .sd-progress__text{position:static;margin:6px 0 0;padding:0;font-size:11.5px;font-weight:400;color:${UI.text3};text-align:right}
.plSurvey .sd-btn{border-radius:8px;font-size:14px;font-weight:600;padding:11px 26px;box-shadow:none;font-family:inherit;width:auto}
/* 框架用 background-color 覆盖 background 简写,且导航条走 float 布局(sd-clearfix)——
   这两处必须 !important 才压得住,是与框架抢版式的最小面积 */
.plSurvey .sd-navigation__next-btn,.plSurvey .sd-navigation__complete-btn{background-color:${UI.primary} !important;color:#fff}
.plSurvey .sd-navigation__next-btn:hover,.plSurvey .sd-navigation__complete-btn:hover{background-color:${UI.primaryDeep} !important}
.plSurvey .sd-navigation__prev-btn{background-color:#fff !important;color:${UI.text2};border:1px solid ${UI.border}}
/* 按钮各占半幅是框架默认;收成内容宽、靠右(主按钮在右=站内表单惯例) */
.plSurvey .sd-body__navigation{display:flex !important;margin-top:18px;padding:16px 0 0;border-top:1px solid ${UI.hairline};justify-content:space-between !important;gap:10px}
.plSurvey .sd-body__navigation>.sv-action:only-child{margin-left:auto}
.plSurvey .sd-body__navigation>.sv-action,.plSurvey .sd-body__navigation .sd-btn{flex:0 0 auto !important;width:auto;min-width:0;float:none !important}
/* 框架的禁用态=主按钮透明度 25%(蓝底白字褪成一团看不清);换成站内灰底灰字的正经禁用样式 */
.plSurvey .sd-btn:disabled{opacity:1;background:${UI.hairline};color:${UI.text3};cursor:default}`}</style>
            {/* 第一步:职业。没选→只有选职业按钮;已选→显示已选职业 + 换一个,再「下一题」进问卷 */}
            {occStep || !noc ? (
              // 第一步=选职业,**内联**在同一张答题卡里(Frank「不要只有职业是弹框」):
              // 题干 + 搜索 + 分类 + 选项 + 靠右的「下一题」,与四选一题一个样
              <div style={{ ...CARD, padding: '14px 20px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 12, marginBottom: 14, borderBottom: `1px solid ${UI.hairline}` }}>
                  <Tag variant="region">{t('plan.set.basic')}</Tag>
                </div>
                <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.55, marginBottom: 6 }}>{t('quiz.q2')}</div>
                <div style={{ fontSize: 12.5, color: UI.text2, marginBottom: 12 }}>{t('quiz.q2sub')}</div>
                <OccPicker inline t={t} lang={lang} initial={bands.nocs} doneLabel={t('plan.next')}
                  onDone={(nocs) => { const a = writeAnswers({ nocs }); setBands(a); setNoc(a.nocs[0] || ''); setOccStep(false) }} />
              </div>
            ) : (
              <div style={{ ...CARD, padding: '14px 20px 6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 12, marginBottom: 14, borderBottom: `1px solid ${UI.hairline}` }}>
                  <Tag variant={stage === 'explore' ? 'warn' : 'region'}>{t(stage === 'explore' ? 'plan.set.explore' : 'plan.set.basic')}</Tag>
                </div>
                <div className="plSurvey">{survey && <Survey model={survey} />}</div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* v2c 五段:① hero 大数字 ② 三卡判定 ③ 结论/缺口 ④ 编号下一步 ⑤ 锁区+CTA+hook */}
            <style>{`.rptHero{display:flex;flex-direction:column;gap:10px}
.rptLanes{display:grid;gap:10px;grid-template-columns:repeat(3,1fr)}
@media(max-width:640px){.rptHero{gap:8px}.rptLanes{grid-template-columns:repeat(2,1fr)}.rptLanes>:first-child{grid-column:1/-1}}
@media(min-width:641px){.rptHero{flex-direction:row;align-items:center;gap:30px}}
/* 存 PDF = 浏览器打印(react-pdf 已评估否决:CJK 字体必须内嵌是决定性成本)。
   打印稿只留内容:导航、按钮、锁区与 CTA 都不印(那是屏幕上的操作件与营销位,印在纸上是噪音);
   抬头与免责声明改成打印专用行 —— 纸上必须能认出这是谁的什么报告、什么日期、不是法律建议 */
.printOnly{display:none}
@media print{
  header,footer,.noPrint{display:none !important}
  .printOnly{display:block !important}
  body{background:#fff}
  .rptHero{background:none !important;border:1px solid #ddd !important}
  a{color:#111 !important;text-decoration:none}
  @page{margin:14mm}
}`}</style>
            <div className="printOnly" style={{ borderBottom: '1px solid #ddd', paddingBottom: 8, marginBottom: 12, fontSize: 12, color: UI.text2 }}>
              Offer2PR{rpt && rpt !== 'loading' && rpt.asOf ? ` — ${rpt.asOf}` : ''}
            </div>
            <div className="noPrint" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '2px 0 10px' }}>
              {/* 人话名优先(nocTitle 走 /api/quiz 出中文名),代码作灰字小注 */}
              {rpt && rpt !== 'loading' && (rpt.noc
                ? <span style={{ fontSize: 15, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortOcc(nocTitle || rpt.title)}<span style={{ color: UI.text3, fontWeight: 400, fontSize: 12, marginLeft: 6 }}>{rpt.noc}</span></span>
                : <OccChip noc="" nocTitle="" t={t} onPick={() => gotoQuiz()} />)}
              {/* 两个动作钮同组靠右:窄屏一起换行,不会一个贴右一个掉到左边 */}
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button onClick={() => gotoQuiz()} style={BTN}>{t('plan.back')}</button>
                {rpt && rpt !== 'loading' && rpt.noc && (
                  <button onClick={() => { track(`plan-${decision}-print`); window.print() }} style={BTN}>{t('plan.pdf')}</button>
                )}
              </span>
            </div>
            {rpt === 'loading' || rpt === null ? (
              <div style={{ background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 12, minHeight: 220 }} />
            ) : (
              <>
                <div className="printOnly" style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
                  {shortOcc(nocTitle || rpt.title)}<span style={{ color: UI.text3, fontWeight: 400, fontSize: 12, marginLeft: 6 }}>{rpt.noc}</span>
                </div>
                <Hero r={rpt} t={t} />
                {rpt.lanes.length > 0 && <Lanes lanes={rpt.lanes} t={t} />}

                {/* ③ 结论(免费两条)+ 缺口;分隔线代替小标题(卡片自解释,不写废话) */}
                {/* 每节带标题(2026-07-31 Frank「每个 section 连个 title 都没有」):
                    v2c 当初撤标题是因为只有两条结论、卡片自解释;内容变多之后就成了一锅粥 */}
                {rpt.conclusions.length > 0 && (
                  <div style={CARD}>
                    <div style={secH}>{t('rpt.sec.c')}</div>
                    <ul style={{ margin: 0, padding: 0 }}>{rpt.conclusions.map((l, i) => <Line key={l.key + i} l={l} t={t} />)}</ul>
                  </div>
                )}
                {/* 门槛对照(规则引擎):官方门槛 × 你的情况,一行一条,出处照旧收在底部「依据与链接」。
                    免费层已在服务端把「差多少」摘掉(gateReport),这里不做任何裁剪判断 */}
                {rpt.requirements?.length > 0 && (
                  <div style={CARD}>
                    <div style={secH}>{t('rpt.sec.r')}</div>
                    <ul style={{ margin: 0, padding: 0 }}>{rpt.requirements.map((l, i) => <Line key={l.key + i} l={l} t={t} />)}</ul>
                  </div>
                )}
                {rpt.gaps.length > 0 && (
                  <div style={CARD}>
                    <div style={secH}>{t('rpt.sec.g')}</div>
                    <ul style={{ margin: 0, padding: 0 }}>{rpt.gaps.map((l, i) => <Line key={l.key + i} l={l} t={t} />)}</ul>
                  </div>
                )}

                {/* ④ 下一步:编号 1/2/3 + 尾链 */}
                {rpt.nextSteps.length > 0 && (
                  <div style={CARD}>
                    <div style={secH}>{t('rpt.sec.n')}</div>
                    {rpt.nextSteps.map((s, i) => (
                      <div key={s.key + i} style={{ display: 'flex', gap: 10, alignItems: 'baseline', margin: '7px 0', lineHeight: 1.7 }}>
                        <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, background: '#eff6ff', color: UI.primary, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>{t(s.key, s.params)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pro:备选省完整对照(免费端服务端已清空) */}
                {rpt.alternatives.length > 0 && (
                  <div style={CARD}>
                    <div style={secH}>{t('rpt.sec.a')}</div>
                    <ul style={{ margin: 0, padding: 0 }}>{rpt.alternatives.map((l, i) => <Line key={l.key + i} l={l} t={t} />)}</ul>
                  </div>
                )}

                {/* 依据与链接:全报告唯一的对外出口(出处 + 跳转),编号与正文的 [n] 对应 */}
                {refs.rows.length > 0 && (
                  <div style={CARD}>
                    <div style={secH}>{t('rpt.sec.ref')}</div>
                    {refs.rows.map((r) => (
                      <div key={r.n} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'baseline', margin: '7px 0', fontSize: 13, lineHeight: 1.6 }}>
                        <span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: '50%', background: UI.text3, position: 'relative', top: -2 }} />
                        <a href={r.url} target={r.url.startsWith('http') ? '_blank' : undefined} rel={r.url.startsWith('http') ? 'noreferrer' : undefined}
                          style={{ flex: 1, minWidth: 0, color: UI.primary, textDecoration: 'none' }}>{r.label}</a>
                        {r.fetched && <span style={{ flexShrink: 0, fontSize: 11.5, color: UI.text3 }}>{r.fetched}</span>}
                        {/* 打印稿里链接点不了 —— 把地址印出来,纸上才回得去 */}
                        {/* 打印稿里链接点不了 —— 地址单独占一行印出来,纸上才回得去(挤在同一行会把名字压成竖排) */}
                        <span className="printOnly" style={{ flex: '0 0 100%', marginLeft: 32, fontSize: 10.5, color: UI.text3, wordBreak: 'break-all' }}>{r.url.startsWith('http') ? r.url : `offer2pr.com${r.url}`}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ⑤ 锁区:只有类别标题(正文服务端就没下发)+ CTA(价格归 /pricing 不硬编)+ 答题 hook */}
                {rpt.locked.length > 0 && (
                  <div className="noPrint" style={CARD}>
                    <div style={secH}>{t('rpt.sec.lock')}</div>
                    {rpt.locked.map((k) => (
                      <div key={k} style={{ display: 'flex', gap: 9, alignItems: 'center', margin: '9px 0' }}>
                        <span style={{ flexShrink: 0 }}>🔒</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: UI.text, minWidth: 0 }}>{t('rpt.lock.' + k)}</span>
                        <span style={{ marginLeft: 'auto' }}><Tag variant="pro">{t('rpt.pro')}</Tag></span>
                      </div>
                    ))}
                  </div>
                )}
                {/* CTA 只在真锁住了东西时才出(2026-07-31 实拍抓到:没选职业的空报告什么都算不出,
                    却照样挂「完整报告 + 30 天全站 Pro」—— 那是卖不存在的东西,红线) */}
                {!rpt.pro && rpt.locked.length > 0 && (
                  <Notice kind="warn" lead={t('rpt.cta.t')} style={{ margin: '10px 0' }} className="noPrint"
                    action={<span onClick={() => track(`plan-${decision}-cta`)}><Button kind="pro" href="/pricing">{t('rpt.cta.btn')}</Button></span>} />
                )}
                {/* 同理:没职业时探索两题也改不了任何结论,不劝答 */}
                {!rpt.pro && rpt.noc && hasExplore && (!bands.crsBand || !bands.pgwpBand) && (
                  <div className="noPrint" style={{ textAlign: 'center', fontSize: 12.5, color: UI.text2, margin: '10px 0 0' }}>
                    {t('rpt.hook')}
                    <button onClick={() => gotoQuiz('explore')} style={{ marginLeft: 8, border: 'none', background: 'none', color: UI.primary, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>{t('rpt.hook.go')} →</button>
                  </div>
                )}
                {/* 数据诚实脚注:置信度与数据日期(v2c 头部只留职业,这两项挪到脚注不丢) */}
                <div className="printOnly" style={{ marginTop: 14, paddingTop: 8, borderTop: '1px solid #ddd', fontSize: 11, color: UI.text2 }}>
                  {t('foot.disclaimer')}
                </div>
                {/* 页脚的置信度也删了(2026-07-31 Frank「置信度低是什么意思」):
                    它是内部术语,而且与缺口行「还有 N 项条件没填」说的是同一件事 ——
                    那句具体、能照着做,这句只是把它换成抽象等级再讲一遍。数据日期同理(出处行各自带)。 */}
              </>
            )}
          </>
        )}
          </div>
        </PageShell>
      </div>
      <SiteFooter t={t} />
      {/* 选职业不再有弹层版本:它是答题流程的第一步,内联在卡里(2026-07-31 Frank 拍板) */}
    </div>
  )
}
