'use client'
// 卡②「拿 PR」两态页(L2-01/L2-02:答题与看报告是两个界面,互跳靠一个按钮)。
// 答题态=SurveyJS(2026-07-31 Frank「用框架吧」):题库=lib/questions.ts 纯 JSON 配置,一屏一题/
// 进度条/上一题下一题/多语全由框架出;**选中不自动跳**(2026-07-31 Frank),跳转由用户按「下一题/出报告」。
// 报告态=结论/缺口/下一步/备选(/api/report → rpt.* 三语渲染),与引擎契约同构。
// 跨卡复用铁律:currentStatus/目标省/职业从三问预填(答过的不重新问,预填可改);职业用三问的 nocs[0],
// 没答过 → 页内拉起 EntryQuiz(同一组件不复制)。答案存 localStorage,改答案 → 报告立刻重算。
import { useEffect, useMemo, useRef, useState } from 'react'

import { streamDisplay, eeDisplay, type TFn } from '../jobs/i18n'
import { useLang } from '../LangProvider'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { shortOcc } from '../quiz/EntryQuiz'
import { OccPicker } from '../quiz/OccPicker'
import { QuizProgress, QuizStyle, QuizTitle } from '../quiz/QuizUI'
import { QuizForm } from './QuizForm'
import { Button, Notice, PageShell, Tag, UI } from '../ui/primitives'
import { EMPTY, clearAnswers, readAnswers, toEngineAnswers, writeAnswers, type Answers } from '@/lib/answers'
import { DECISIONS, fieldsOf, missingFields } from '@/lib/decisions'
import { goBackOr } from '../BackLink'
import { pickName } from '@/lib/occName'
import { track } from '@/lib/track'

// 答案存储与档位换算都归 lib/answers + lib/fields(2026-07-31 统一题库:一个 key、一处换算);
// 本页只管两态与版式,不再自己存答案、不再自己抄 CLB/EXP/PROVS 映射表。

type DrawDetail = { date: string; stream: string; score: number | null; invitations: number | null }
type RptLine = { key: string; params: Record<string, string | number>; verdict?: string; source?: { label: string; url: string; fetched: string }; url?: string; more?: boolean; tail?: { key: string; params: Record<string, string | number>; rows?: DrawDetail[] } }
type Lane = { kind: 'prov' | 'ee' | 'alts'; verdict?: string; key: string; params: Record<string, string | number> }
type Emp = { name: string; slug: string; named: number; eligible: number; city: string; province: string; lastPosted: string; lmiaPositions: number | null; lmiaQuarter: string; aip: boolean; area: string; empRevenue: number | null; empStaff: number | null }
type Rpt = {
  noc: string; title: string; conclusions: RptLine[]; requirements: RptLine[]; employers: Emp[]; switches: RptLine[]; gaps: RptLine[]; nextSteps: RptLine[]; alternatives: RptLine[]
  confidence: 'low' | 'mid' | 'high'; asOf: string
  lanes: Lane[]; hint?: RptLine; locked: string[]; moreN: number; pro: boolean   // 付费闸(服务端已裁剪,locked 只有类别键没有正文;moreN=「其余 N 条结论」的 N)
}

const V_DOT: Record<string, string> = { pass: UI.ok, warn: '#b45309', fail: '#b91c1c', na: '#9ca3af' }
const V_CHIP: Record<string, { bg: string; fg: string }> = {
  pass: { bg: '#dcfce7', fg: '#166534' }, warn: { bg: '#fef3c7', fg: '#92400e' },
  fail: { bg: '#fee2e2', fg: '#991b1b' }, na: { bg: '#f3f4f6', fg: '#6b7280' },
}
const CARD: React.CSSProperties = { background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 12, padding: '12px 16px', margin: '10px 0' }

// 动作钮共用样式(报告态顶部的「改答案」「存为 PDF」)
const BTN: React.CSSProperties = { border: `1px solid ${UI.border}`, background: '#fff', color: UI.text, borderRadius: 8, padding: '5px 14px', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }

// 探索两题到底能兑现什么(走查 2026-08-02):
// · EE 分差 —— 只有这个职业**真在某个还在抽的 EE 类别**里才算得出。
//   判据用免费层一定在的那条缺口行(rpt.g.noCrs = 「补个 CRS 就能算你与 X 类别的差距」);
//   不在类别(eeNone)或类别停抽(eeStale)时它根本不会出现。
// · 时间窗 —— 境外没有加拿大签证,拿档位造时间窗=编数(字段库里 pgwpBand 对 overseas 就不传)。
const eeLive = (r: Rpt): boolean => r.gaps.some((g) => g.key === 'rpt.g.noCrs')

// 职业 chip:答题态常驻;报告态**没职业时**也出(空报告说「先选职业」却没有入口=死路,2026-07-31 实拍抓到)
function OccChip({ noc, nocTitle, t, onPick }: { noc: string; nocTitle: string; t: TFn; onPick: () => void }) {
  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', maxWidth: '100%', fontSize: 12.5, color: UI.text2, background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 999, padding: '5px 12px' }}>
      <span style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{t('plan.occ')}</span>
      {noc
        ? (nocTitle
          ? <b style={{ color: '#111827', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortOcc(nocTitle)}</b>
          // 名字异步拉(/api/quiz),没到就留占位 —— 先闪一个 5 位码再换成文字,用户看到的是「乱码变字」
          : <span aria-hidden style={{ display: 'inline-block', width: 84, height: '0.85em', borderRadius: 4, background: UI.hairline }} />)
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
// 参数里带 i18n 键的(如换省对照的 factorKey='ps.f.education')先翻成人话再代入 ——
// 官方因素名的三语只住 `ps.f.*` 一处(打分卡也用它),引擎不该再抄一份译名表
function Line({ l, t }: { l: RptLine; t: TFn }) {
  const [open, setOpen] = useState(false)
  // 清单名与 EE 类别名在数据层是**中文有限集**(STREAM_L10N / EE_L10N 早就把它们映射成三语,
  // 职位板一直在用)—— 报告页先前直接甩原值,于是英文界面第一屏就是
  // `This occupation is on the BC PNP list "BC 医疗"`(#247,2026-08-03 375/en 实拍;
  // 88% 流量是英文用户)。这里走同一套映射:不新造字段、不改数据层,顺带韩文也对了,
  // 而且映射出来的是**短名**(「B.C. Health Authority」而不是官方全名),手机上少折一行。
  const params = Object.fromEntries(Object.entries(l.params).map(([k, v]) => {
    if (typeof v !== 'string') return [k, v]
    if (k === 'label') return [k, streamDisplay(t, v)]
    if (k === 'cat') return [k, eeDisplay(t, v)]
    return [k, v.startsWith('ps.f.') ? t(v) : v]
  }))
  const rows = l.tail?.rows ?? []
  return (
    <li style={{ margin: 0, padding: '14px 0', borderTop: `1px solid ${UI.hairline}`, lineHeight: 1.75, fontSize: 15, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 11, alignItems: 'baseline' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: V_DOT[l.verdict ?? 'na'], position: 'relative', top: -1 }} />
      <span style={{ flex: 1, minWidth: 0 }}>{t(l.key, params)}</span>
      {/* 行尾灰字(v5 定稿 .tail):桌面靠右一列,手机(<=640)自成一行、跟正文左对齐。
          有明细就可点开 —— 摘要只说得下一个数,逐轮的日期/通道/分数线/邀请数收在这里面 */}
      {l.tail ? (
        rows.length ? (
          <button className="rptTail" onClick={() => setOpen((v) => !v)}
            style={{ color: UI.text3, fontSize: 13.5, whiteSpace: 'nowrap', flexShrink: 0, fontVariantNumeric: 'tabular-nums', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
            {t(l.tail.key, l.tail.params)}<span style={{ marginLeft: 5 }}>{open ? '▴' : '▾'}</span>
          </button>
        ) : (
          <span className="rptTail" style={{ color: UI.text3, fontSize: 13.5, whiteSpace: 'nowrap', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{t(l.tail.key, l.tail.params)}</span>
        )
      ) : null}
      {open && rows.length ? (
        <div style={{ width: '100%', paddingLeft: 19, marginTop: 6 }}>
          <div className="drawRow" style={{ fontSize: 12, color: UI.text3 }}>
            <span>{t('rpt.s.d.date')}</span><span>{t('rpt.s.d.stream')}</span><span>{t('rpt.s.d.score')}</span><span>{t('rpt.s.d.inv')}</span>
          </div>
          {rows.map((d, i) => (
            <div key={d.date + i} className="drawRow" style={{ fontSize: 13, color: UI.text2, borderTop: `1px solid ${UI.hairline}`, paddingTop: 5, marginTop: 5 }}>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{d.date}</span>
              {/* 通道名长得离谱(「Temporary Rural/Remote Health Support Initiative」),窄屏折成五行 ——
                  截断 + title 兜住全名,一行一条不折行 */}
              <span title={streamDisplay(t, d.stream)} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{streamDisplay(t, d.stream)}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{d.score ?? '—'}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{d.invitations ?? '—'}</span>
            </div>
          ))}
        </div>
      ) : null}
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
    // 出处名也是数据层那套中文清单名 —— 屏幕上这一块是 printOnly(0×0),但**会印进 PDF**,
    // 于是英文用户下下来的报告底部一串「BC 医疗」(#247 收口,2026-08-03 375/en 实测定位到这里)
    if (l.source?.label) return streamDisplay(t, l.source.label)
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
  for (const l of [...r.conclusions, ...(r.requirements ?? []), ...(r.switches ?? []), ...r.gaps, ...r.alternatives, ...r.nextSteps]) {
    const u = urlOf(l)
    if (u) add(u, labelOf(l), l.source?.fetched)
  }
  return { rows, of: (l) => byUrl.get(urlOf(l)) }
}

// 一个决定=一个参数(统一题库 §3:入口三处共用同一答题器与同一报告页,差别只有问哪些字段、答完出哪份报告)
// v5 定稿(2026-08-01 Frank「网页尽量给结论,详细放 PDF」+「文字太密集」):
// 一节 = 一个用户会问的问题(小灰标)+ 一张白卡;标题降级成灰字,卡里靠发丝线分行 ——
// 页面从「每块都是同样粗的白卡」变成有主次。撤掉了 hero 大数字与三判定卡(同批拍板)。
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ margin: '22px 0 0' }}>
      <div style={{ fontSize: 14, color: UI.text3, margin: '0 0 9px' }}>{title}</div>
      <div style={{ background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 12, padding: '2px 18px' }}>{children}</div>
    </section>
  )
}

// 结论按「用户会问的问题」分桶(只在显示层分,引擎照旧给一个数组):
// prov=省份口径 / pay=薪资 / peer=相关职业;没登记的键一律归 prov,不丢行。
const BUCKET: Record<string, 'prov' | 'pay' | 'peer' | 'emp'> = {
  'rpt.j.sponsors': 'emp',
  'rpt.j.wageAbove': 'pay', 'rpt.j.wageBelow': 'pay', 'rpt.j.wageSame': 'pay', 'rpt.j.wageEsdc': 'pay',
  'rpt.k.selfWage': 'pay', 'rpt.k.selfProv': 'pay', 'rpt.k.selfProvWage': 'pay', 'rpt.j.related': 'peer', 'rpt.k.peer': 'peer', 'rpt.k.alt': 'peer',
  // 2026-08-03 卡⑥ 撤锁后**才暴露**出来的漏网:peerGap 先前被付费闸摘掉,免费层从来没渲过它,
  // 于是它一直靠 `?? 'prov'` 的兜底落在「这个职业在哪个省更有优势?」下面 ——
  // 生产实拍:那个标题下面跟着「执业护士的中位年薪比你这行高 48%」,驴唇不对马嘴。
  'rpt.k.peerGap': 'peer',
}
const group = (ls: RptLine[], b: 'prov' | 'pay' | 'peer' | 'emp'): RptLine[] => ls.filter((l) => (BUCKET[l.key] ?? 'prov') === b)

export function PlanPrView({ decision = 'pr' }: { decision?: 'pr' | 'job' | 'career' | 'prov' } = {}) {
  const hasExplore = (DECISIONS[decision]?.explore.length ?? 0) > 0
  const [lang, setLangSaved, t] = useLang()   // 语言/文案:全站一处(LangProvider),初值由服务端 cookie 定

  const [bands, setBands] = useState<Answers>(EMPTY)
  const [noc, setNoc] = useState('')
  const [nocTitles, setNocTitles] = useState<Record<string, string>>({})
  const [view, setView] = useState<'quiz' | 'report'>('quiz')
  const [stage, setStage] = useState<'basic' | 'explore'>('basic')   // 探索卷=报告 hook 的落点(基本 4 题满才进得来)
  // 职业是流程第一步(2026-07-31 Frank「第一个问题可以先选职业吗」):每条结论都要 NOC。
  // 2026-08-01 走过一轮「与基本题同屏」,题库扩到 7 道后一屏太长 → 随卷面一起改回翻页,
  // 它就是第 1 页;已经选过的照样先看到这一步(可换),按「下一题」才进问卷。
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
  // 多职业(2026-08-02 Frank「选多个职业,报告也应该支持多个职业」):一个职业一份报告,
  // 顶部切一下换一份 —— 不混算(清单命中/门槛/抽选线全是按职业来的),也不重新请求(一次全拿回来)
  const [rpts, setRpts] = useState<Rpt[] | null | 'loading'>(null)
  const [rptIdx, setRptIdx] = useState(0)
  const rpt: Rpt | null | 'loading' = rpts === 'loading' ? 'loading' : (rpts?.[rptIdx] ?? null)
  const [addedProvs, setAddedProvs] = useState<string[]>([])   // 换省对照:用户从下拉里加出来看的省
  // 漏斗第 3 步(主线 M2):锁区**进了视口**才算曝光 —— 渲染即算会把「拉到一半就走」的人也算进去,
  // 那样 M3 的分叉判断(曝光够点击少 vs 根本没人看见)就分不开了。一次会话只记一次。
  const lockBox = useRef<HTMLDivElement | null>(null)
  const lockSeen = useRef(false)
  useEffect(() => {
    const el = lockBox.current
    if (!el || lockSeen.current || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting) && !lockSeen.current) {
        lockSeen.current = true
        track('rpt-lock-seen', { card: decision })
        io.disconnect()
      }
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [rpt, decision])

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
  // 职业名回显(代码不裸奔):/api/quiz?noc 与三问结果页同端点。
  // 多职业下要**每个都拉** —— 切到第二个职业时 H1 退回英文官方名就等于中文界面上突然冒出英文
  useEffect(() => {
    const list = bands.nocs.length ? bands.nocs : (noc ? [noc] : [])
    if (!list.length) { setNocTitles({}); return }
    let dead = false
    // 名字优先用**库里算好的短名**(ETL 04g 产,三语齐):「注册护士和注册精神科护士」在 375 的 H1 上折三行,
    // 短名是「注册护士」。前端不再自己截字符串 —— 清洗归数据层(CLAUDE.md)。
    Promise.all(list.map((n) => fetch(`/api/quiz?noc=${encodeURIComponent(n)}`).then((r) => r.json())
      .then((d) => [n, pickName(d?.facts, lang)] as [string, string])
      .catch(() => [n, ''] as [string, string])))
      .then((rows) => { if (!dead) setNocTitles(Object.fromEntries(rows)) })
    return () => { dead = true }
  }, [bands.nocs, noc, lang])

  const gotoReport = () => {
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
  // 清空重填:两步确认(点一下变「确认重置」,8 秒没下文自己收回),样式与「返回」「改答案」同一把钮 ——
  // 原先是卡头右上的裸文字,2026-08-01 Frank 点名「放到下面的 section,样式保持一致」
  const ResetBtn = () => (
    <button onClick={() => {
      if (!resetArmed) { setResetArmed(true); return }
      setBands(clearAnswers()); setNoc(''); setResetArmed(false); setResetNonce((n) => n + 1); setOccStep(true)
      track(`plan-${decision}-reset`)
    }} style={{ ...BTN, ...(resetArmed ? { color: '#b91c1c', borderColor: '#fecaca', fontWeight: 600 } : {}) }}>
      {t(resetArmed ? 'plan.reset.ok' : 'plan.reset')}
    </button>
  )

  // 漏斗第 2 步(主线 M2 收口 2026-08-02):**报告态真渲染**才算「打开报告」,
  // 而不是「点了出报告那个按钮」—— 从详情页进来的是深链 `?view=report`,按钮根本没被按过,
  // 先前那种记法会把这条最主要的来路整条漏掉。一次页面加载只记一次(来回切答题/报告不重复计)。
  const reportCounted = useRef(false)
  useEffect(() => {
    if (view !== 'report' || reportCounted.current) return
    reportCounted.current = true
    track(`plan-${decision}-report`)
  }, [view, decision])

  // 报告态进入即拉(改答案回来再进=重算;答案是幂等输入)
  useEffect(() => {
    if (view !== 'report' || !ready) return
    setRpts('loading')
    const ctrl = new AbortController()
    fetch('/api/report', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', signal: ctrl.signal,
      body: JSON.stringify({ goal: decision, answers: toEngineAnswers(readAnswers()) }),
    }).then((r) => (r.ok ? r.json() : null)).then((d) => {
      const list: Rpt[] = Array.isArray(d?.reports) ? d.reports : (d?.report ? [d.report] : [])
      setRpts(list.length ? list : null)
      setRptIdx(0)
    })
      .catch(() => { if (!ctrl.signal.aborted) setRpts(null) })
    return () => ctrl.abort()
  }, [view, ready])

  // 链接编号只算一次:正文的 [n] 与底部「依据与链接」是同一张表,不会对不上
  const canWindow = bands.status !== 'overseas'   // 境外没有加拿大签证 → 时间窗算不出(见 fields.ts 的 pgwpBand)
  const refs = useMemo(
    () => (rpt && rpt !== 'loading' ? collectRefs(rpt, t) : { rows: [] as RefRow[], of: () => undefined as number | undefined }),
    [rpt, t])

  const secH: React.CSSProperties = { fontSize: 14.5, fontWeight: 700, margin: '16px 0 4px', color: '#111827' }

  // 进度(#253):本卷要哪几项走 fieldsOf、答没答走 missingFields —— 都是既有单一来源,不在这里另数一遍。
  // 基本卷把职业算成第 1 项(它是自绘的第 1 页);探索卷是另起的一小批,不带职业。
  const stepNames = fieldsOf(decision, stage)
  const stepTotal = stepNames.length + (stage === 'basic' ? 1 : 0)
  const stepDone = stepNames.length - missingFields(stepNames, bands).length + (stage === 'basic' && noc ? 1 : 0)

  return (
    <div style={{ background: UI.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="start" />
      {/* 外轨=PageShell 1320(全站统一容器铁律,2026-07-18 拍板「新页面按这个宽度套壳」——
          本页初版自造 760 main 违规,2026-07-31 Frank 点名纠正);答题/报告列 760 居中保行长可读(news 阅读页先例) */}
      <div style={{ flex: '1 0 auto' }}>
        <PageShell pad="1rem 1.25rem 40px">
          {/* 骨架照职位详情页(铁律 page-template-job-detail;2026-07-31 Frank「这两个布局怎么不一样呢」):
              面包屑在卡外 → **一张白卡包住 H1 + 右上返回 + 副题 + 正文**,列宽 860 与详情页同轨。
              答题态的题目区在卡内再收窄(见下面 plQ),因为四选一撑满 860 就成了「四个字拉一整行」。 */}
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ fontSize: 12, color: UI.text2, marginBottom: 8, lineHeight: 1.7 }}>
          <a href="/start" style={{ color: UI.primary, textDecoration: 'none' }}>{t('home.entry')}</a>
          {' › '}{t(`plan.${decision}.title`)}
        </div>
        {/* 答题态**不出卡头**(2026-08-01 Frank「为什么要有一个重复的 title」):
            面包屑已经写着「开始规划 › 找工作」,卡头再写一遍「找工作」是同一句话说两遍;
            屏幕上真正的标题是第一道题的题干。返回与清空重填搬进题卡自己的动作行。 */}
        {view === 'report' && (
        <div style={{ ...CARD, position: 'relative', margin: '0 0 10px', padding: '14px 16px 16px' }}>
          {/* 返回:与详情页同一把(方角、灰边白底、绝对定位右上);行为仍是 goBackOr */}
          {/* 一行两个钮(2026-08-01 Frank「返回按钮和下面的按钮是不是放到一行」):
              报告态多一个「修改条件」,答题态只有返回 */}
          <div className="noPrint" style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
            {view === 'report' && rpt && rpt !== 'loading' && (
              <button onClick={() => gotoQuiz()} style={BTN}>{t('plan.back')}</button>
            )}
            <button onClick={() => goBackOr('/')} style={BTN}>{t('detail.back')}</button>
          </div>
          {/* 报告态的主角是**这个职业**,不是「找工作」——那个词面包屑里已经有了(2026-08-01 Frank
              「找工作这个还需要显示吗」/「为什么要有一个重复的 title」)。 */}
          <h1 style={{ margin: '0 0 2px', fontSize: 22, lineHeight: 1.35, color: '#111827', paddingRight: 170 }}>
            {rpt && rpt !== 'loading' && rpt.noc
              ? <>{shortOcc(nocTitles[rpt.noc] || rpt.title)}<span style={{ color: UI.text3, fontWeight: 400, fontSize: 13, marginLeft: 8 }}>{rpt.noc}</span></>
              : t(`plan.${decision}.title`)}
          </h1>
          {/* 没选职业的空报告:留一个选职业入口(说「先选职业」却没入口=死路)。
              「数据日期」那行 2026-08-01 撤掉(Frank):它的值是请求当天的 new Date(),
              跟数据新不新毫无关系 —— 真日期跟着各自出处走,已经逐条列在底部「依据与链接」里。 */}
          {rpt && rpt !== 'loading' && !rpt.noc
            ? <div className="noPrint" style={{ margin: '6px 0 2px' }}><OccChip noc="" nocTitle="" t={t} onPick={() => gotoQuiz()} /></div>
            : null}
          {/* 多职业:一个职业一份报告,这里只负责切 —— 结论不混算(清单/门槛/抽选线都是按职业的)。
              一个职业时整条不渲染(单选的人不该看见一个只有一格的切换器)。 */}
          {Array.isArray(rpts) && rpts.length > 1 && (
            <div className="noPrint" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0 0' }}>
              {rpts.map((r, i) => (
                <button key={r.noc || i} onClick={() => setRptIdx(i)}
                  style={{ ...BTN, padding: '6px 12px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
                    ...(i === rptIdx ? { background: '#eff6ff', borderColor: '#bfdbfe', color: UI.primaryDeep, fontWeight: 600 } : {}) }}>
                  {shortOcc(nocTitles[r.noc] || r.title || r.noc)}
                </button>
              ))}
            </div>
          )}
        </div>
        )}

        {view === 'quiz' ? (
          // 答题列比报告列更窄(2026-07-31 Frank「这个问题页面跟狗屎一样」):一屏一题在桌面
          // 撑满 760 轨 = 四个字的选项拉一整行、右边全是空白。Typeform 范式的前提是窄列居中。
          <>
            {/* 职业进了流程(第一步),这里不再另挂常驻 chip —— 同一件事只出现一次 */}
            {/* 版式全部来自 quiz/QuizUI:选工作页与四选一那几页共用同一段 CSS
                (2026-08-03 Frank「保证所有答题页面一致,包括选工作」)。
                先前这里是 25 行压 SurveyJS 默认样式的 .sd-* 覆盖 —— 框架撤掉,它们一起没了。 */}
            <QuizStyle />
            {/* 翻页(Frank 2026-08-01「还是改成翻页的吧」):职业=第 1 页,其余一屏一题。
                中途试过一屏全放,题库扩到 7 道后手机上要滚三四屏才看得到「出报告」。
                动作行(清空重填/返回)两页共用一套,卡头照旧不出标题 —— 面包屑已经写着「开始规划 › 拿 PR」。 */}
            <div style={{ ...CARD, padding: '14px 20px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, marginBottom: 14, borderBottom: `1px solid ${UI.hairline}` }}>
                {stage === 'explore' && <Tag variant="warn">{t('plan.set.explore')}</Tag>}
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  {stage === 'explore' && (
                    <button onClick={() => setStage('basic')} style={BTN}>{t('plan.explore.basic')}</button>
                  )}
                  <ResetBtn />
                  <button onClick={() => goBackOr('/')} style={BTN}>{t('detail.back')}</button>
                </span>
              </div>
              {/* 进度行两页共用(#253):选职业页先前一格进度都没有,而它是决定线第一步、漏斗最宽的地方。
                  职业算第 1 项 —— 用户看到的步数从头到尾是同一套(基本卷 1/8 → 8/8) */}
              {ready && <div style={{ maxWidth: 600, margin: '0 auto' }}><QuizProgress lang={lang} done={stepDone} total={stepTotal} /></div>}
              {/* 第 1 页=职业(题干与四选一同一套字号,只是控件不是单选框):
                  选中即写入(onChange),按自己的「下一题」才进问卷 —— 跳转永远由用户按 */}
              {/* 读盘(readAnswers)在 effect 里,所以第一页必须等 ready 再挂 ——
                  提前挂 OccPicker 会拿着空的 initial 定型,已经选过的职业回显不出来(实拍撞到) */}
              {!ready ? null : stage === 'basic' && (occStep || !noc) ? (
                <div className="plQuizPad" style={{ maxWidth: 600, margin: '0 auto' }}>
                  <QuizTitle>{t('quiz.q2')}</QuizTitle>
                  <OccPicker inline t={t} lang={lang} initial={bands.nocs} doneLabel={t('plan.next')}
                    onChange={(nocs) => { const a = writeAnswers({ nocs }); setBands(a); setNoc(a.nocs[0] || '') }}
                    onDone={(nocs) => { const a = writeAnswers({ nocs }); setBands(a); setNoc(a.nocs[0] || ''); setOccStep(false) }} />
                </div>
              ) : (
                <div className="plQuizPad" style={{ maxWidth: 600, margin: '0 auto' }}>
                  {/* key=resetNonce:清空重填之后从第一题重新起步(答案已清,停在原位会指着一道空题) */}
                  <QuizForm key={resetNonce} decision={decision} stage={stage} lang={lang} t={t} answers={bands}
                    onPatch={(patch) => setBands(writeAnswers(patch))} onComplete={gotoReport} />
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* v2c 五段:① hero 大数字 ② 三卡判定 ③ 结论/缺口 ④ 编号下一步 ⑤ 锁区+CTA+hook */}
            <style>{`.rptHero{display:flex;flex-direction:column;gap:10px}
.rptLanes{display:grid;gap:10px;grid-template-columns:repeat(3,1fr)}
@media(max-width:640px){.rptHero{gap:8px}.rptLanes{grid-template-columns:repeat(2,1fr)}.rptLanes>:first-child{grid-column:1/-1}
  /* 行尾灰字在手机上自成一行(挤在句尾会把正文压成一列一个字) */
  .rptTail{width:100%;padding-left:19px;white-space:normal !important}}
@media(min-width:641px){.rptTail{margin-left:auto}}
.drawRow{display:grid;grid-template-columns:88px minmax(0,1fr) 52px 56px;column-gap:10px;align-items:baseline}
@media(max-width:640px){.drawRow{grid-template-columns:78px minmax(0,1fr) 42px 44px;column-gap:6px;font-size:12px}
  /* 手机上没有 hover 看不到 title:通道名给两行的余地(截成「Temporary R...」等于没显示) */
  .drawRow>span:nth-child(2){white-space:normal !important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.35}}
@media(min-width:641px){.rptHero{flex-direction:row;align-items:center;gap:30px}}
/* 存 PDF = 浏览器打印(react-pdf 已评估否决:CJK 字体必须内嵌是决定性成本)。
   打印稿只留内容:导航、按钮、锁区与 CTA 都不印(那是屏幕上的操作件与营销位,印在纸上是噪音);
   抬头与免责声明改成打印专用行 —— 纸上必须能认出这是谁的什么报告、什么日期、不是法律建议 */
.printOnly{display:none}
@media print{
  header,footer,.noPrint{display:none !important}
  .printOnly{display:block !important}
  body{background:#fff}
  /* 网页删掉的细节在纸上要回来,并保持原来的排布(printOnly 默认 block 会把并排的事实压成竖排) */
  .empMeta.printOnly{display:flex !important}
  .rptHero{background:none !important;border:1px solid #ddd !important}
  a{color:#111 !important;text-decoration:none}
  @page{margin:14mm}
}`}</style>
            <div className="printOnly" style={{ borderBottom: '1px solid #ddd', paddingBottom: 8, marginBottom: 12, fontSize: 12, color: UI.text2 }}>
              Offer2PR{rpt && rpt !== 'loading' && rpt.asOf ? ` — ${rpt.asOf}` : ''}
            </div>
            {rpt === 'loading' || rpt === null ? (
              <div style={{ background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 12, minHeight: 220 }} />
            ) : (
              <>
                <div className="printOnly" style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
                  {shortOcc(nocTitles[rpt.noc] || rpt.title)}<span style={{ color: UI.text3, fontWeight: 400, fontSize: 12, marginLeft: 6 }}>{rpt.noc}</span>
                </div>
                {/* ③ 结论(免费两条)+ 缺口;分隔线代替小标题(卡片自解释,不写废话) */}
                {/* 每节带标题(2026-07-31 Frank「每个 section 连个 title 都没有」):
                    v2c 当初撤标题是因为只有两条结论、卡片自解释;内容变多之后就成了一锅粥 */}
                {/* 结论按「用户会问的问题」分组(2026-08-01 定稿 v5):省份 / 薪资 / 相关职业各成一节,
                    不再一锅粥地平铺。分组只在显示层做 —— 引擎契约(conclusions 一个数组)不动。 */}
                {group(rpt.conclusions, 'prov').length > 0 && (
                  <Sec title={t('rpt.q.prov')}>{group(rpt.conclusions, 'prov').map((l, i) => <Line key={l.key + i} l={l} t={t} />)}</Sec>
                )}
                {/* 门槛对照(规则引擎):官方门槛 × 你的情况,一行一条,出处照旧收在底部「依据与链接」。
                    免费层已在服务端把「差多少」摘掉(gateReport),这里不做任何裁剪判断 */}
                {rpt.requirements?.length > 0 && (
                  <Sec title={t('rpt.q.req')}>{rpt.requirements.map((l, i) => <Line key={l.key + i} l={l} t={t} />)}</Sec>
                )}
                {/* 雇主线索(锁区正文,只有 Pro 拿得到):一行一家,全是可核验事实 ——
                    命中清单的在招岗数 / 地点 / ESDC LMIA 历史 / AIP 名单 / 最近发布。
                    永不写「这家好签」:愿不愿意担保只有雇主自己知道(措辞红线同 match.ts) */}
                {(rpt.employers?.length > 0 || group(rpt.conclusions, 'emp').length > 0) && (
                  <Sec title={t('rpt.q.emp')}>
                    {group(rpt.conclusions, 'emp').map((l, i) => <Line key={l.key + i} l={l} t={t} />)}
                    {/* 那段口径说明网页不显示(太长),打印稿里才出 —— 网页给结论、PDF 给解释 */}
                    <div className="printOnly" style={{ fontSize: 12, color: UI.text3, margin: '-2px 0 8px', lineHeight: 1.6 }}>{t('rpt.emp.note')}</div>
                    {/* 手机:名字+岗数一行、地点一行、事实一行(左对齐,别让地点飘到右边);
                        桌面:名字 | 岗数 | 地点 三列,事实收在名字下面那行 */}
                    <style>{`.empRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;padding:9px 0;border-top:1px solid ${UI.hairline};
  grid-template-areas:"name named" "loc loc" "meta meta"}
.empRow:first-of-type{border-top:none}
.empName{grid-area:name}.empNamed{grid-area:named}.empLoc{grid-area:loc;text-align:left}
.empMeta{grid-area:meta;display:flex;flex-wrap:wrap;gap:10px;font-size:12px;color:${UI.text3}}
/* 雇主的细节(LMIA / AIP / 最近发布 / 雇主门槛)网页不出、只进 PDF —— 但 .empMeta 的 display:flex
   写在 .printOnly 之后,同权重下后写的赢,所以这里要显式再关一次(实拍抓到:网页上还在显示) */
.empMeta.printOnly{display:none}
@media(min-width:641px){.empRow{grid-template-columns:minmax(0,1fr) 110px 150px;align-items:baseline;
  grid-template-areas:"name named loc" "meta meta meta"}
.empLoc{text-align:right}}`}</style>
                    {rpt.employers.map((e) => (
                      <div key={e.slug || e.name} className="empRow">
                        <a className="empName" href={e.slug ? `/companies/${e.slug}` : '/'} style={{ fontWeight: 600, color: UI.primary, textDecoration: 'none', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</a>
                        <span className="empNamed" style={{ fontSize: 12.5, color: UI.text2, whiteSpace: 'nowrap' }}>
                          {e.named > 0 ? t('rpt.emp.named', { n: e.named }) : t('rpt.emp.screened', { n: e.eligible })}
                        </span>
                        <span className="empLoc" style={{ fontSize: 12.5, color: UI.text3, whiteSpace: 'nowrap' }}>{[e.city, e.province].filter(Boolean).join(', ')}</span>
                        <span className="empMeta printOnly">
                          {e.lmiaPositions ? <span>{t('rpt.emp.lmia', { n: e.lmiaPositions, q: e.lmiaQuarter || '—' })}</span> : null}
                          {e.aip ? <span>{t('rpt.emp.aip')}</span> : null}
                          {e.lastPosted ? <span>{t('rpt.emp.last', { d: e.lastPosted })}</span> : null}
                          {/* 雇主侧门槛落到这一家:地点这项本站判得了(GTA 内外 / 大温内外),
                              营业额认不出普查区时只说雇员数 —— 缺的那半照实不写 */}
                          {e.empStaff ? (
                            <span style={{ color: UI.text2 }}>
                              {t(e.area === 'gta' ? 'rpt.emp.bar.gta' : e.area === 'on-listed-cd' ? 'rpt.emp.bar.cd'
                                : e.area === 'outside-gta' ? 'rpt.emp.bar.outGta' : e.area === 'metro-vancouver' ? 'rpt.emp.bar.metro' : 'rpt.emp.bar.restBc',
                              { staff: e.empStaff, rev: e.empRevenue != null ? (e.empRevenue >= 1e6 ? `${e.empRevenue / 1e6}M` : `${Math.round(e.empRevenue / 1000)}K`) : '' })}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    ))}
                  </Sec>
                )}
                {/* 换省对照(L2-08):位置照 v5 定稿 —— 雇主线索之后、薪资之前 */}
                {rpt.switches?.length > 0 && (
                  <Sec title={t('rpt.q.switch')}>
                    {rpt.switches.filter((l) => !l.more || addedProvs.includes(String(l.params.prov))).map((l, i) => <Line key={l.key + i} l={l} t={t} />)}
                    {/* 还没露面的省进下拉(Frank 2026-08-01「最好有个下拉列表吧」):
                        哪几个省值得看是用户的判断,引擎已经把每个省都算好了,这里只管显示 */}
                    {rpt.switches.some((l) => l.more && !addedProvs.includes(String(l.params.prov))) && (
                      <div style={{ padding: '12px 0', borderTop: `1px solid ${UI.hairline}` }}>
                        <select value="" onChange={(e) => e.target.value && setAddedProvs((p) => [...p, e.target.value])}
                          style={{ height: 32, border: `1px solid ${UI.border}`, borderRadius: 8, fontSize: 13, background: '#fff', padding: '0 8px', color: UI.text2, fontFamily: 'inherit', maxWidth: '100%' }}>
                          <option value="">{t('rpt.s.pick')}</option>
                          {rpt.switches.filter((l) => l.more && !addedProvs.includes(String(l.params.prov))).map((l) => (
                            <option key={String(l.params.prov)} value={String(l.params.prov)}>{t('prov.' + l.params.prov) || String(l.params.prov)}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </Sec>
                )}
                {group(rpt.conclusions, 'pay').length > 0 && (
                  <Sec title={t('rpt.q.pay')}>{group(rpt.conclusions, 'pay').map((l, i) => <Line key={l.key + i} l={l} t={t} />)}</Sec>
                )}
                {rpt.gaps.length > 0 && (
                  <Sec title={t('rpt.q.gap')}>{rpt.gaps.map((l, i) => <Line key={l.key + i} l={l} t={t} />)}</Sec>
                )}

                {/* ④ 下一步:编号 1/2/3 + 尾链 */}
                {/* 相关职业那两条属于「还能往哪走」,归到下一步里,不再混在结论中间 */}
                {(rpt.nextSteps.length > 0 || group(rpt.conclusions, 'peer').length > 0) && (
                  <Sec title={t('rpt.q.next')}>
                    {rpt.nextSteps.map((s, i) => (
                      <div key={s.key + i} style={{ padding: '14px 0', borderTop: `1px solid ${UI.hairline}`, lineHeight: 1.75, fontSize: 15 }}>
                        {s.url
                          ? <a href={s.url} style={{ color: UI.primary, textDecoration: 'none' }}>{t(s.key, s.params)}</a>
                          : <span>{t(s.key, s.params)}</span>}
                      </div>
                    ))}
                    {group(rpt.conclusions, 'peer').map((l, i) => <Line key={l.key + i} l={l} t={t} />)}
                  </Sec>
                )}

                {/* Pro:备选省完整对照(免费端服务端已清空) */}
                {rpt.alternatives.length > 0 && (
                  // 标题按**这一节装的是什么**来定,不按卡名:拿 PR / 选省份的备选是省,
                  // 卡⑥ 职业规划的备选是**职业** —— 生产实拍「其他可考虑的省」下面摆着「医师助理(NOC 31303)」。
                  // 同样是撤锁之后才暴露的(先前 alternatives 被付费闸清空,免费层根本没这一节)。
                  <Sec title={t(rpt.alternatives.some((l) => BUCKET[l.key] === 'peer') ? 'rpt.q.altOcc' : 'rpt.q.alt')}>{rpt.alternatives.map((l, i) => <Line key={l.key + i} l={l} t={t} />)}</Sec>
                )}

                {/* 依据与链接:全报告唯一的对外出口(出处 + 跳转),编号与正文的 [n] 对应 */}
                {refs.rows.length > 0 && (
                  <div className="printOnly" style={CARD}>
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

                {/* PDF 带(2026-08-01 拍板「网页给结论,详细放 PDF」):网页删掉的出处/门槛明细/雇主细节
                    都在打印稿里 —— 所以这条只在屏幕上出,纸上不印(印出来叫人下载 PDF 是废话) */}
                {rpt.noc && (
                  <div className="noPrint rptPdf" style={{ ...CARD, borderColor: '#bfdbfe', display: 'flex', alignItems: 'center', gap: 14, marginTop: 22 }}>
                    {/* #248:375/en 上「文字 + 右侧按钮」抢横向 —— 标题折 2 行、小注折 3 行,挤成一团。
                        手机改上下堆叠(文字整块一行、按钮独占一行),桌面维持并排。 */}
                    <style>{`@media(max-width:640px){.rptPdf{flex-direction:column;align-items:stretch;gap:10px}.rptPdf>span{margin-left:0 !important}}`}</style>
                    <div style={{ minWidth: 0 }}>
                      <b style={{ fontSize: 14, fontWeight: 600, display: 'block' }}>{t('rpt.pdf.t')}</b>
                      {/* #242(第 31 轮收费走查,P0):这一块**没有任何 pro 判断**,免费态却承诺
                          「雇主明细与 LMIA 记录」—— 而免费报告的 employers 是服务端清空的,
                          他下下来会发现没有。文案按**这份 PDF 真有什么**说:免费只承诺出处与门槛对照。
                          「真实数据」是这个站的命,自家文案先撒谎,后面卖什么都不作数。 */}
                      <span style={{ fontSize: 12.5, color: UI.text3 }}>{t(rpt.pro ? 'rpt.pdf.sub' : 'rpt.pdf.subFree')}</span>
                    </div>
                    <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
                      <Button kind="primary" onClick={() => { track(`plan-${decision}-print`); window.print() }}>{t('rpt.pdf.btn')}</Button>
                    </span>
                  </div>
                )}

                {/* ⑤ 锁区:只有类别标题(正文服务端就没下发)+ CTA(价格归 /pricing 不硬编)+ 答题 hook */}
                {rpt.locked.length > 0 && (
                  <div className="noPrint" style={CARD} ref={lockBox}>
                    <div style={secH}>{t('rpt.sec.lock')}</div>
                    {rpt.locked.map((k) => (
                      <div key={k} style={{ display: 'flex', gap: 9, alignItems: 'center', margin: '9px 0' }}>
                        <span style={{ flexShrink: 0 }}>🔒</span>
                        {/* #245:「其余结论全文」改成带条数 —— 只有这一行需要参数,其余锁行文案没有占位符 */}
                        <span style={{ fontSize: 14, fontWeight: 600, color: UI.text, minWidth: 0 }}>{t('rpt.lock.' + k, k === 'more' ? { n: rpt.moreN } : undefined)}</span>
                        <span style={{ marginLeft: 'auto' }}><Tag variant="pro">{t('rpt.pro')}</Tag></span>
                      </div>
                    ))}
                  </div>
                )}
                {/* CTA 只在真锁住了东西时才出(2026-07-31 实拍抓到:没选职业的空报告什么都算不出,
                    却照样挂「完整报告 + 30 天全站 Pro」—— 那是卖不存在的东西,红线) */}
                {!rpt.pro && rpt.locked.length > 0 && (
                  <Notice kind="warn" lead={t('rpt.cta.t')} style={{ margin: '10px 0' }} className="noPrint"
                    action={<span onClick={() => track(`plan-${decision}-cta`)}><Button kind="pro" href={`/pricing?from=rpt-${decision}`}>{t('rpt.cta.btn')}</Button></span>} />
                )}
                {/* 同理:没职业时探索两题也改不了任何结论,不劝答。
                    文案按**真能兑现的**说(2026-08-02 走查实见):这个职业不在任何 EE 类别时,
                    答完 CRS 也算不出「EE 分差」—— 承诺里就不能有它。境外没有加拿大签证,时间窗同理算不出,
                    两样都兑现不了就整条不挂(说了做不到比不说更伤)。 */}
                {!rpt.pro && rpt.noc && hasExplore && (!bands.crsBand || !bands.pgwpBand) && (eeLive(rpt) || canWindow) && (
                  <div className="noPrint" style={{ textAlign: 'center', fontSize: 12.5, color: UI.text2, margin: '10px 0 0' }}>
                    {t(eeLive(rpt) ? (canWindow ? 'rpt.hook' : 'rpt.hook.ee') : 'rpt.hook.win')}
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
