'use client'
// 入口三问(付费漏斗重设计-20260726,Frank「用户一访问页面就应该弹出一些问题,吸引用户填,然后最终拿结果付费」)。
// 四步:问 → 免费结果 → 注册保存 → 付费清单(付费包下一阶段)。本组件负责前两步 + 把注册接出去。
//
// 硬约束(写死在这,别再放宽):
//   ① 三题封顶、每题一屏、进度条可见;只弹一次(localStorage)。
//      (底部「先随便看看」2026-07-27 撤 —— Frank「右上角不是有关闭的 ❌ 了吗」;出口仍在:× 与 Esc。)
//   ② 答完**立刻**出结果——结果来自 /api/quiz 的库内聚合(毫秒级),不碰 AI、不转圈。
//   ③ 跳过的人照常进职位板,不再骚扰。
//   ④ 匿名答案存 localStorage,注册后由调用方落库成档案(不让用户填两遍)。
import { useEffect, useMemo, useRef, useState } from 'react'

import { POPULAR_NOCS } from '../account/profileOptions'
import { Button, chipStyle } from '../ui/primitives'
import { track } from '@/lib/track'
import type { TFn } from './i18n'

export const QUIZ_KEY = 'jobs_quiz_v1'   // 记忆键(单一来源;JobsTable 判定是否弹也用它)

export type QuizAnswers = { status: string; nocs: string[]; provs: string[] }
export type QuizFacts = {
  noc: string; teer: number | null; title: string
  titleZh: string
  open: number; eligible: number; named: number
  streams: { stream: string; n: number }[]
  byProv: { province: string; n: number; eligible: number }[]
  medianSalary: number | null
}

const STATUS_SLUGS = ['overseas', 'studying', 'working', 'jobhunting'] as const
const PROVS = ['ON', 'BC', 'AB', 'SK', 'MB', 'NS', 'NB', 'NL', 'PE']

export function readQuiz(): (QuizAnswers & { done?: boolean }) | null {
  try { const s = localStorage.getItem(QUIZ_KEY); return s ? JSON.parse(s) : null } catch { return null }
}

export function EntryQuiz({ t, lang, onClose, onRegister, onApply, initial, startAt, stats }: {
  t: TFn
  lang: string
  onClose: () => void                      // 关闭/跳过:置位不再弹
  onRegister: (a: QuizAnswers) => void     // 结果页「注册保存」:交给宿主开注册框并落库
  onApply: (a: QuizAnswers) => void        // 结果页「看这些岗」:把答案套进列表筛选
  initial?: QuizAnswers | null             // 重答:预填上次答案(填错/跳过了都能回来改)
  startAt?: 0 | 3                          // 3=直接落结果页(「看上次结果」入口)
  // Frank 2026-07-26「现在设计这么简陋,用户一看以为是钓鱼网站」:全屏页必须自证身份 ——
  // 品牌头 + **库内真数字**(在招/命中省提名清单/有外劳雇佣记录的雇主/最近核对时间)。数字由调用方传,
  // 与横幅同一份口径(不另查、不写死)。
  stats?: { total?: number; named?: number; lmia?: number; checkedAt?: string }
}) {
  const [step, setStep] = useState<number>(startAt ?? 0)   // 0/1/2 = 三题;3 = 结果
  const [status, setStatus] = useState(initial?.status || '')
  const [nocs, setNocs] = useState<string[]>(initial?.nocs || [])
  const [provs, setProvs] = useState<string[]>(initial?.provs || [])
  const [q, setQ] = useState('')
  const [cands, setCands] = useState<{ noc: string; title: string; titleZh: string }[]>([])
  // Frank 2026-07-26「这个弹框看着还是太单薄了」:热门职业按钮挂**真在招数** —— 光一排职业名
  // 既没信息也没说服力,挂上库里的数才是这个站与普通问卷的差别。一次拿全,不逐个查。
  const [counts, setCounts] = useState<Record<string, { open: number; eligible: number }>>({})
  // Frank 2026-07-26「还能加一些常规热门的职业吗」「列表可以列得全一些」:清单不手写,
  // 按**库里在招量**取前 24(/api/quiz?top=24),会随市场自己变;拿不到就退回内置常用清单。
  const [top, setTop] = useState<{ noc: string; title: string; titleZh: string; open: number }[]>([])
  const [moreNocs, setMoreNocs] = useState(false)   // 第 2 题默认只露 8 个(Frank「看着有点乱」),其余收起
  const [nocTitle, setNocTitle] = useState('')   // 已选职业名(第 3 题顶部回显,让用户看见自己答到哪了)
  const [facts, setFacts] = useState<QuizFacts | null | 'loading'>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { track('quiz-open', { mode: startAt === 3 ? 'result' : initial ? 'redo' : 'first' }) }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (startAt !== 3) return
    const noc = (initial?.nocs || [])[0]
    if (!noc) { setFacts(null); return }
    setFacts('loading')
    fetch(`/api/quiz?noc=${encodeURIComponent(noc)}`)
      .then((r) => r.json()).then((d) => setFacts(d?.facts ?? null)).catch(() => setFacts(null))
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch('/api/quiz?top=24').then((r) => r.json()).then((d) => setTop(Array.isArray(d?.top) ? d.top : [])).catch(() => setTop([]))
    fetch(`/api/quiz?counts=${POPULAR_NOCS.map((p) => p.noc).join(',')}`)
      .then((r) => r.json()).then((d) => setCounts(d?.counts || {})).catch(() => { /* 没数就不显示,不挡答题 */ })
  }, [])

  // 进第 3 题即预取该职业事实:省按钮直接挂「该省多少岗」(Frank「弹框太单薄」——
  // 让用户在**选省的当下**就看见各省行情,而不是答完才知道;端点与结果页同一个,结果页因此也秒开)
  useEffect(() => {
    const noc = nocs[0]
    if (step !== 2 || !noc || facts) return
    setFacts('loading')
    fetch(`/api/quiz?noc=${encodeURIComponent(noc)}`)
      .then((r) => r.json()).then((d) => setFacts(d?.facts ?? null)).catch(() => setFacts(null))
  }, [step, nocs, facts])

  // 第 2 题搜索:250ms 防抖,≥2 字才打后端(库内 ILIKE,≤8 条)
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (q.trim().length < 2) { setCands([]); return }
    timer.current = setTimeout(() => {
      fetch(`/api/quiz?q=${encodeURIComponent(q.trim())}`)
        .then((r) => r.json()).then((d) => setCands(Array.isArray(d?.candidates) ? d.candidates : []))
        .catch(() => setCands([]))
    }, 250)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [q])

  const answers = useMemo<QuizAnswers>(() => ({ status, nocs, provs }), [status, nocs, provs])
  const save = (done: boolean) => { try { localStorage.setItem(QUIZ_KEY, JSON.stringify({ ...answers, done })) } catch { /* ignore */ } }

  const toResult = () => {
    save(true); track('quiz-done', { step: '3' })
    setStep(3)
    const noc = nocs[0]
    if (!noc) { setFacts(null); return }
    if (facts && facts !== 'loading' && facts.noc === noc) return   // 第 3 题已预取,别再打一次
    setFacts('loading')
    fetch(`/api/quiz?noc=${encodeURIComponent(noc)}`)
      .then((r) => r.json()).then((d) => setFacts(d?.facts ?? null))
      .catch(() => setFacts(null))
  }

  const skip = () => { save(false); track('quiz-skip', { step: String(step) }); onClose() }
  // Escape 关框(与站内其他弹框同款;漏了它 → 用户按 Esc 以为关了,其实遮罩还在挡点击)
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') skip() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  })
  const next = () => {
    track('quiz-step', { step: String(step) })
    if (step >= 2) toResult(); else setStep(step + 1)
  }

  // Frank 2026-07-26 三拍,定稿=**居中弹框**:520 窄条 → 900 面板 → 整屏 → 退回居中弹框
  //(「全屏看着内容太单薄了」——同样的内容摊到整屏,四周全是空地,反而更空)。
  // 保留全屏那版加的品牌头与信任栏,只是装回一个有边界的卡里:960 宽、两栏、最高 88vh 自滚。
  const sheet: React.CSSProperties = {
    background: '#fff', width: '100%', maxWidth: 960, maxHeight: '88vh',
    borderRadius: 16, boxShadow: '0 18px 50px rgba(17,24,39,.22)', overflowY: 'auto',
    display: 'flex', flexDirection: 'column',
  }
  const inner: React.CSSProperties = { width: '100%', padding: '18px 20px 22px' }
  const opt = (on: boolean): React.CSSProperties => ({
    border: `1px solid ${on ? '#2563eb' : '#e5e7eb'}`, background: on ? '#eff6ff' : '#fff',
    color: on ? '#1d4ed8' : '#1f2937', fontWeight: on ? 600 : 400,
    borderRadius: 10, padding: '12px 14px', fontSize: 14.5, marginBottom: 8, cursor: 'pointer', width: '100%', textAlign: 'left',
  })
  const pickedChip: React.CSSProperties = { fontSize: 11.5, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, padding: '2px 9px' }
  const provName = (p: string) => t('prov.' + p) !== 'prov.' + p ? t('prov.' + p) : p

  // Frank 2026-07-26「这个入口还是需要重新设计一下,专业、信任、能留住用户;现在这么简陋像钓鱼网站」:
  // 全屏页三件事自证身份 —— ①站名与定位(用户得知道自己在哪);②**库里的真数字**(在招、命中省提名清单、
  // 有外劳雇佣记录的雇主)+ 最近核对时间;③官方数据来源署名。这些都是事实,不是宣传语。
  const num = (n?: number) => (n == null ? '' : n.toLocaleString('en-CA'))
  const trust = [
    stats?.total ? [num(stats.total), t('quiz.tr.jobs')] : null,
    stats?.named ? [num(stats.named), t('quiz.tr.named')] : null,
    stats?.lmia ? [num(stats.lmia), t('quiz.tr.lmia')] : null,
  ].filter(Boolean) as [string, string][]

  return (
    <div onClick={skip} className="eqWrap" style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.45)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      {/* Frank 2026-07-27「问题弹框看着还是有点乱,很多人一看就跑偏了」:两栏(问题 + 信任卡)同屏
          六件事 —— 进度、回显、标题、副标题、搜索、24 个 chip、右栏三个数字、跳过。重排为**单栏一屏一件事**:
          信任数字压成标题上方一行小字;第 2 题默认只露 8 个热门,其余收进「更多职业」。 */}
      <style>{`@media (max-width:860px){.eqWrap{padding:0;align-items:flex-end}.eqSheet{max-height:92vh;border-radius:16px 16px 0 0}}`}</style>
      <div className="eqSheet" onClick={(e) => e.stopPropagation()} style={sheet}>
        {/* ① 品牌头:站名 + 定位 + 关闭。没有这条,用户不知道自己在哪个站(这正是「像钓鱼」的来源) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
          <span style={{ fontSize: 16.5, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>🍁 Offer2PR</span>
            <button onClick={skip} aria-label={t('quiz.skip')}
            style={{ marginLeft: 'auto', border: 'none', background: 'none', color: '#9ca3af', fontSize: 22, lineHeight: 1, cursor: 'pointer', padding: 4 }}>×</button>
        </div>
        <div style={inner}>
        {step < 3 ? (
          <>
            {/* 信任信息压成一行,且**只在第 1 题**出现:信任在开头建立就够,第 2、3 题让位给问题本身 */}
            {trust.length && step === 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 11.5, color: '#9ca3af', marginBottom: 10 }}>
                {trust.map(([n, label]) => (
                  <span key={label}><b style={{ color: '#4b5563', fontWeight: 600 }}>{n}</b> {label}</span>
                ))}
              </div>
            ) : null}
            {/* 三段粗条 + 步骤名(Frank「进度条太细了」「这块排版混乱」;查了通行做法:stepper = 段 + 标签 + 状态,
                标签让人知道后面还要答什么,不确定感降下来,完成率才上得去)。「2 / 3」那行字撤,段本身在表达。 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['quiz.step1', 'quiz.step2', 'quiz.step3'] as const).map((k, i) => (
                <div key={k} style={{ flex: 1 }}>
                  <span style={{ display: 'block', height: 8, borderRadius: 999, background: i <= step ? '#2563eb' : '#e5e7eb' }} />
                  <span style={{ display: 'block', marginTop: 5, fontSize: 11, color: i === step ? '#1d4ed8' : '#9ca3af', fontWeight: i === step ? 600 : 400 }}>{t(k)}</span>
                </div>
              ))}
            </div>
            {step === 0 && (
              <>
                <div style={{ fontSize: 21, fontWeight: 700, margin: '2px 0 6px', color: '#111827' }}>{t('quiz.q1')}</div>
                {STATUS_SLUGS.map((s) => (
                  <button key={s} onClick={() => { setStatus(s); track('quiz-step', { step: '0' }); setStep(1) }} style={opt(status === s)}>{t('quiz.st.' + s)}</button>
                ))}
                {initial && <div onClick={() => setStep(1)} style={{ textAlign: 'center', fontSize: 12.5, color: '#2563eb', marginTop: 6, cursor: 'pointer' }}>{t('quiz.keep')}</div>}
              </>
            )}
            {step === 1 && (
              <>
                <div style={{ fontSize: 21, fontWeight: 700, margin: '2px 0 6px', color: '#111827' }}>{t('quiz.q2')}</div>
                <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 12 }}>{t('quiz.q2sub')}</div>
                {/* 已答回显跟在副标题之后:层级 标题 > 副标题 > 已答,不再打断标题 */}
                {(status || nocTitle) ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '0 0 12px' }}>
                    {status ? <span style={pickedChip}>{t('quiz.st.' + status)}</span> : null}
                    {nocTitle ? <span style={pickedChip}>{nocTitle}</span> : null}
                  </div>
                ) : null}
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('quiz.q2ph')} enterKeyHint="search"
                  style={{ width: '100%', boxSizing: 'border-box', height: 42, padding: '0 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14.5, background: '#fafafa', marginBottom: 10 }} />
                {cands.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    {cands.map((c) => (
                      <button key={c.noc} onClick={() => {
                        const on = nocs.includes(c.noc)
                        setNocs(on ? nocs.filter((n) => n !== c.noc) : [...nocs, c.noc])
                        setNocTitle(on ? '' : (lang === 'zh' && c.titleZh ? c.titleZh : c.title))
                        setQ(''); setCands([])
                      }} style={opt(nocs.includes(c.noc))}>
                        {lang === 'zh' && c.titleZh ? c.titleZh : c.title}
                        <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 6 }}>{c.noc}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {/* 多选(Frank「这个可以多选而且」):点=加/减,不再一点就跳下一题;下面给「下一步」。
                      清单优先用库里在招量前 24(top),拿不到才退回内置常用清单。 */}
                  {(top.length ? (() => {
                    // 库里会出现同名不同码(「厨师」= 63200 与 62200):**重名的才**挂灰色 NOC 码区分,
                    // 不重名的不挂(ui-plain-language:人话名主文案,代码只在必要时作小注)
                    const seenLabel = new Map<string, number>()
                    for (const x of top) { const l = (lang === 'zh' && x.titleZh) ? x.titleZh : x.title; seenLabel.set(l, (seenLabel.get(l) || 0) + 1) }
                    return top.map((x) => {
                      const l = (lang === 'zh' && x.titleZh) ? x.titleZh : x.title
                      return { noc: x.noc, label: l, dup: (seenLabel.get(l) || 0) > 1, open: x.open }
                    })
                  })()
                    : POPULAR_NOCS.map((p) => ({ noc: p.noc, label: t(p.key), dup: false, open: counts[p.noc]?.open }))
                  ).slice(0, moreNocs ? 99 : 8).map((x) => {
                    const on = nocs.includes(x.noc)
                    return (
                      <button key={x.noc} title={x.label}
                        onClick={() => {
                          setNocs(on ? nocs.filter((n) => n !== x.noc) : [...nocs, x.noc])
                          setNocTitle(on ? '' : x.label)
                        }}
                        style={{ ...chipStyle(on), display: 'inline-flex', alignItems: 'baseline', gap: 6, maxWidth: '100%' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.label}</span>
                        {x.dup ? <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>{x.noc}</span> : null}
                        {x.open ? <span style={{ fontSize: 11.5, color: '#9ca3af', flexShrink: 0 }}>{t('quiz.openN', { n: x.open.toLocaleString('en-CA') })}</span> : null}
                      </button>
                    )
                  })}
                </div>
                {/* 24 个 chip 一次铺开是「乱」的主因;默认 8 个,想看全再展开 */}
                {(top.length || POPULAR_NOCS.length) > 8 && !moreNocs ? (
                  <button onClick={() => setMoreNocs(true)}
                    style={{ border: 'none', background: 'none', padding: '8px 0 0', color: '#2563eb', cursor: 'pointer', fontSize: 12.5 }}>
                    ▾ {t('quiz.moreNocs')}
                  </button>
                ) : null}
                {/* 多选后不能再靠「点一下就跳」推进 —— 给一个明确的下一步(未选时不出,别让人点空) */}
                {nocs.length ? (
                  <Button kind="primary" onClick={() => { track('quiz-step', { step: '1' }); setStep(2) }}
                    style={{ width: '100%', padding: '11px 0', fontSize: 15, marginTop: 12 }}>
                    {t('quiz.nextN', { n: nocs.length })}
                  </Button>
                ) : null}
              </>
            )}
            {step === 2 && (
              <>
                <div style={{ fontSize: 21, fontWeight: 700, margin: '2px 0 6px', color: '#111827' }}>{t('quiz.q3')}</div>
                <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 12 }}>{t('quiz.q3sub')}</div>
                {/* 已答回显跟在副标题之后:层级 标题 > 副标题 > 已答,不再打断标题 */}
                {(status || nocTitle) ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '0 0 12px' }}>
                    {status ? <span style={pickedChip}>{t('quiz.st.' + status)}</span> : null}
                    {nocTitle ? <span style={pickedChip}>{nocTitle}</span> : null}
                  </div>
                ) : null}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
                  {PROVS.map((p) => {
                    const on = provs.includes(p)
                    const n = facts && facts !== 'loading' ? facts.byProv.find((r) => r.province === p)?.n : undefined
                    return (
                      <button key={p} onClick={() => setProvs(on ? provs.filter((x) => x !== p) : [...provs, p])}
                        style={{ ...chipStyle(on), display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                        {provName(p)}
                        {n ? <span style={{ fontSize: 11.5, color: '#9ca3af' }}>{t('quiz.jobsN', { n })}</span> : null}
                      </button>
                    )
                  })}
                </div>
                <Button kind="primary" onClick={next} style={{ width: '100%', padding: '12px 0', fontSize: 15 }}>
                  {provs.length ? t('quiz.see') : t('quiz.seeAny')}
                </Button>
              </>
            )}
          </>
        ) : (
          <QuizResult t={t} lang={lang} answers={answers} facts={facts} provName={provName}
            onRegister={() => { track('quiz-register'); onRegister(answers) }}
            onApply={() => { track('quiz-apply'); onApply(answers) }}
            onClose={() => { save(true); onClose() }} />
        )}
        </div>
      </div>
    </div>
  )
}

// ── 免费结果页:只报库里查得到的事实,一个字都不许编 ────────────────────────────
function QuizResult({ t, lang, answers, facts, provName, onRegister, onApply, onClose }: {
  t: TFn; lang: string; answers: QuizAnswers; facts: QuizFacts | null | 'loading'
  provName: (p: string) => string
  onRegister: () => void; onApply: () => void; onClose: () => void
}) {
  useEffect(() => { if (facts && facts !== 'loading') track('quiz-result', { noc: facts.noc }) }, [facts])
  if (facts === 'loading') return <div style={{ padding: '30px 0', textAlign: 'center', color: '#6b7280', fontSize: 13.5 }}>{t('loading')}</div>
  if (!facts) {
    // 选了职业但当前零在招,或跳过了职业题 —— 说实话,不编数字
    return (
      <>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{t('quiz.noData')}</div>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, marginBottom: 14 }}>{t('quiz.noDataSub')}</div>
        <Button kind="primary" onClick={onClose} style={{ width: '100%', padding: '12px 0' }}>{t('quiz.browse')}</Button>
      </>
    )
  }
  const title = lang === 'zh' && facts.titleZh ? facts.titleZh : (facts.title || facts.noc)
  const picked = answers.provs.length ? facts.byProv.filter((r) => answers.provs.includes(r.province)) : []
  const rest = facts.byProv.filter((r) => !picked.includes(r)).slice(0, 4 - Math.min(picked.length, 2))
  const rows = [...picked, ...rest].slice(0, 5)
  const kv = (k: React.ReactNode, v: React.ReactNode, dim = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', lineHeight: 2, opacity: dim ? .65 : 1 }}>
      <span>{k}</span><span>{v}</span>
    </div>
  )
  return (
    <>
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '13px 14px', marginBottom: 10 }}>
        <div style={{ fontSize: 15.5, fontWeight: 700, color: '#1e40af' }}>{title}</div>
        {answers.provs.length > 0 && (
          <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 2 }}>{t('quiz.target', { p: answers.provs.map(provName).join('、') })}</div>
        )}
        <div style={{ height: 6 }} />
        <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.75 }}>
          {t('quiz.sum', { open: facts.open.toLocaleString('en-CA'), elig: facts.eligible.toLocaleString('en-CA') })}
          {facts.named > 0 && facts.streams[0] ? ' ' + t('quiz.sumNamed', { n: facts.named, s: facts.streams[0].stream }) : ''}
          {/* 原来这里挂一句「TEER x —— 多数省提名通道门槛卡在 TEER 0-3」:与本人无关的通用科普,
              且上一句「其中 N 个可提名」已经回答了同一个问题(Frank 2026-07-26「这种都属于废话」)→ 删 */}
        </div>
      </div>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '13px 14px', marginBottom: 12 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 6 }}>{t('quiz.byProv')}</div>
        {rows.map((r) => kv(provName(r.province),
          <span><b style={{ color: '#111827', fontSize: 15 }}>{r.n}</b> {t('quiz.jobs')}
            {/* 「·」禁用(no-dot-separator 铁律)——第二个事实用括号收,不用点号杂糅 */}
            {r.eligible > 0 ? <span style={{ color: '#15803d', fontWeight: 700 }}>({t('quiz.eligN', { n: r.eligible })})</span> : null}</span>,
          !answers.provs.includes(r.province)))}
        {facts.medianSalary != null && (
          <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 6 }}>
            {t('quiz.med', { v: '$' + Math.round(facts.medianSalary / 1000) + 'K' })}
          </div>
        )}
      </div>
      <Button kind="primary" onClick={onApply} style={{ width: '100%', padding: '12px 0', fontSize: 15 }}>{t('quiz.seeJobs')}</Button>
      <button onClick={onRegister} style={{ width: '100%', marginTop: 8, padding: '12px 0', fontSize: 14, fontWeight: 600, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, cursor: 'pointer' }}>
        {t('quiz.save')}
      </button>
      <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 8, lineHeight: 1.6 }}>{t('quiz.foot')}</div>
    </>
  )
}
