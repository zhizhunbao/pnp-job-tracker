'use client'
// 选职业 = **控件**,不是问卷题(2026-07-31 Frank「统一一下答题功能,不需要弹框答题了」)。
//
// 为什么单独抽出来:三问里「处境」「目标省」是四选一,能并进 SurveyJS 答题器;而「选职业」是
// 搜索 + 多选的控件,SurveyJS 没有这种题型。硬塞成题型 = 为了统一而造轮子。所以拆成两半:
// 四选一的题归答题器,选职业归这个控件,全站共用一份(答题器的职业 chip、职位板、详情页都用它)。
//
// 数据口径照旧(与三问同源,不新写端点):热门清单 = 库里在招量前 24(/api/quiz?top=24),
// 拿不到退回内置常用清单;搜索 = /api/quiz?q=(≥2 字、250ms 防抖);chip 上挂真在招数。
import { useEffect, useRef, useState } from 'react'

import { POPULAR_NOCS } from '../account/profileOptions'
import { IconCheck, IconSearch, IconX } from '../Icons'
import { QuizBar, QuizStyle, QuizTitle } from './QuizUI'
import { Button, UI } from '../ui/primitives'
import { shortOcc } from './EntryQuiz'
import { pickName } from '@/lib/occName'
import type { TFn } from '../jobs/i18n'

// 选职业上限:与 /api/report 的 MAX_NOCS 同一个数(那边超了就 .slice(0,3) 静默丢)。
// 上限**必须在前端也拦一道** —— 否则用户选了 4 个、亮着 4 颗 chip,报告只算前 3 个,他不知道丢了哪个。
const MAX_NOCS = 3
const PAGE_SIZE = 6

type Cand = { noc: string; title: string; titleZh: string; titleZhShort?: string; titleKoShort?: string; titleEnShort?: string }
type Top = Cand & { open: number; broad?: string }
type Kin = Cand & { open: number; eligible: number }

// inline=true:不套弹层,直接铺在答题卡里(2026-07-31 Frank「选职业和其他问题都放到一个方式,
// 不要只有职业是弹框」)—— 职业是第一题,就该和别的题长一个样,而不是另开一层。
// 名字加载中的占位条(与文字同高,避免拿到名字时行高跳一下)
const Skeleton = () => (
  <span aria-hidden style={{ display: 'inline-block', width: 76, height: '0.85em', borderRadius: 4, background: 'rgba(255,255,255,.45)' }} />
)

export function OccPicker({ t, lang, initial, onDone, onChange, onClose, inline, doneLabel, hideDone }: {
  t: TFn
  lang: string
  initial: string[]
  onDone: (nocs: string[]) => void
  // 2026-08-01(Frank「不能同时显示出来吗」):合并成一屏后,选职业不再是独立一步 ——
  // 选中即回传(onChange),自己的动作按钮收起(hideDone),整卷底部只留一个「出报告」。
  onChange?: (nocs: string[]) => void
  onClose?: () => void
  inline?: boolean
  doneLabel?: string
  hideDone?: boolean
}) {
  const [nocs, setNocs] = useState<string[]>(initial)
  // 常用职业名同步就有,刷新时不为回显一颗已选 chip 再等一次事实查询。
  const [titles, setTitles] = useState<Record<string, string>>(() => Object.fromEntries(
    POPULAR_NOCS.filter((x) => initial.includes(x.noc)).map((x) => [x.noc, t(x.key)]),
  ))
  const [q, setQ] = useState('')
  const [cands, setCands] = useState<Cand[]>([])
  const [searching, setSearching] = useState(false)
  // 首屏先用内置常用清单,不让冷启动的全表 GROUP BY 把题目冻成骨架 8 秒。
  const [top, setTop] = useState<Top[]>(() => POPULAR_NOCS.map((x) => ({
    noc: x.noc, title: t(x.key), titleZh: t(x.key), open: 0,
  })))
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [kin, setKin] = useState<Kin[]>([])
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 首屏立即用内置常用清单;并行补两份事实:
  // ① 小查询只给这 14 个兜底职业补在招数,让数字尽快出现;
  // ② 完整 top=24 后台跑完后替换成真实热门榜。两者都不阻塞控件,也不再 400ms 就掐断。
  useEffect(() => {
    let dead = false
    const topController = new AbortController()
    const countsController = new AbortController()
    fetch(`/api/quiz?counts=${POPULAR_NOCS.map((x) => x.noc).join(',')}`, { signal: countsController.signal })
      .then((r) => r.json())
      .then((d) => {
        if (dead || !d?.counts) return
        setTop((rows) => rows.map((x) => ({ ...x, open: d.counts[x.noc]?.open ?? x.open })))
      })
      .catch(() => { /* 数字拿不到不影响选择 */ })
    // 24 与服务端启动预热、缓存键完全一致。先前改成 200 会绕过预热,冷启动重新 GROUP BY 全表,
    // 实测把职业题首屏从几十毫秒拖到 2.8 秒。
    fetch('/api/quiz?top=24', { signal: topController.signal })
      .then((r) => r.json())
      .then((d) => {
        if (dead) return
        const rows: Top[] = Array.isArray(d?.top) && d.top.length ? d.top : []
        setTop(rows)
        // 回到这一步时存档只有 NOC 码。热门清单通常比逐码查询先返回,顺手从同一份数据补名字,
        // 避免已选胶囊在慢连接下多空白一拍；冷门职业仍由下面的逐码查询兜底。
        const known = rows.filter((x) => nocs.includes(x.noc)).map((x) => [x.noc, pickName(x, lang)] as [string, string])
        if (known.length) setTitles((m) => ({ ...m, ...Object.fromEntries(known) }))
      })
      .catch(() => { /* 完整榜拿不到就继续使用已补数字的同步兜底 */ })
    return () => { dead = true; topController.abort(); countsController.abort() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- 首屏快照只拉一次;语言切换由逐码查询刷新
  // 选满上限:未选中的 chip 一律置灰不可点(已选的仍可取消,不然就锁死了)
  const full = nocs.length >= MAX_NOCS
  const lockedOut = (noc: string) => full && !nocs.includes(noc)
  // 选满后的置灰只压透明度 + 换光标,不再造一套颜色
  const lockedStyle = (noc: string): React.CSSProperties =>
    lockedOut(noc) ? { opacity: .4, cursor: 'not-allowed' } : {}
  const base: Top[] = top.length
    ? top
    : POPULAR_NOCS.map((x) => ({ noc: x.noc, title: t(x.key), titleZh: t(x.key), open: 0 }))
  const list = base.slice(0, 24)
  const shownList = list.slice(0, visibleCount)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    const query = q.trim()
    if (query.length < 2) { setCands([]); setSearching(false); return }
    const controller = new AbortController()
    setCands([])
    setSearching(true)
    timer.current = setTimeout(() => {
      fetch(`/api/quiz?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((r) => r.json()).then((d) => setCands(Array.isArray(d?.candidates) ? d.candidates : []))
        .catch((e) => { if (e?.name !== 'AbortError') setCands([]) })
        .finally(() => { if (!controller.signal.aborted) setSearching(false) })
    }, 180)
    return () => { if (timer.current) clearTimeout(timer.current); controller.abort() }
  }, [q])

  // 选中一个职业后恢复“同族职业”推荐(NOC 前 4 位同组)。这是帮助学生/转行用户把“程序员”
  // 展开成开发、云、数据等可投方向的关键入口;异步加载,不阻塞搜索和下一题。
  useEffect(() => {
    if (!nocs.length) { setKin([]); return }
    const controller = new AbortController()
    fetch(`/api/quiz?kin=${encodeURIComponent(nocs.join(','))}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setKin(Array.isArray(d?.kin) ? d.kin : []))
      .catch((e) => { if (e?.name !== 'AbortError') setKin([]) })
    return () => controller.abort()
  }, [nocs])

  // 已选职业的名字:答过一轮再回到这一步时,存档里只有 5 位码 —— 名字得现拉,
  // 不拉就在 chip 上甩一个「31301」(代码不裸奔,2026-08-01 翻页改回来后实拍撞到)
  useEffect(() => {
    const miss = nocs.filter((n) => !titles[n])
    if (!miss.length) return
    let dead = false
    Promise.all(miss.map((n) => fetch(`/api/quiz?noc=${encodeURIComponent(n)}`)
      .then((r) => r.json())
      .then((d) => [n, pickName(d?.facts, lang) || n] as [string, string])
      .catch(() => [n, n] as [string, string])))
      .then((rows) => { if (!dead) setTitles((m) => ({ ...m, ...Object.fromEntries(rows) })) })
    return () => { dead = true }
  }, [nocs, lang])   // eslint-disable-line react-hooks/exhaustive-deps -- titles 是这个 effect 的产物,进依赖会自己触发自己

  // 显示名优先用库里的短名(三语,ETL 04g 产)——前端不自己截字符串,清洗归数据层
  const label = (x: Cand) => pickName(x, lang)
  // onChange 必须在 updater **外面**调:React 的 setState updater 跑在渲染阶段,
  // 在里面回调父组件的 setState = 「渲染 A 的时候更新 B」,控制台会红(2026-08-02 走查在 console 抓到:
  // Cannot update a component `PlanPrView` while rendering a different component `OccPicker`)。
  // 事件处理器里 nocs 就是最新值,不需要 updater 形式。
  const toggle = (noc: string, name: string) => {
    // 选满了就只让**取消**,不让再加(加了也会被 /api/report 悄悄丢掉)。
    // 未选中的 chip 同时置灰不可点 —— 拦截逻辑和视觉状态必须是同一个判断,别让用户点了没反应。
    if (full && !nocs.includes(noc)) return
    setTitles((m) => ({ ...m, [noc]: name }))
    const next = nocs.includes(noc) ? nocs.filter((n) => n !== noc) : [...nocs, noc]
    setNocs(next)
    onChange?.(next)
  }

  // 库里会出现同名不同码(中文都叫「厨师」= 63200 Cooks 与 62200 Chefs)——重名时挂英文官方名区分,
  // 不重名的什么都不挂(甩个 5 位码只添噪音,2026-07-27 拍板)
  const dupCount = new Map<string, number>()
  for (const x of list) { const l = label(x); dupCount.set(l, (dupCount.get(l) || 0) + 1) }

  const body = (
    <>
        {/* 已选 chip **换行不横滑**(2026-08-04 Frank 实拍:选到第 4 个,最后那颗被卡片
            右缘切成半透明的一截,桌面既没滚动条也没「还有更多」的提示)。先前的解法是横向滚动
            + 右缘渐隐 mask,但全站铁律是「永不横滚」(CLAUDE.md 展示约定),渐隐本身也读作
            「排版坏了」。改成 flexWrap 让行高自适应:放不下就往下掉一行,一颗也不裁。 */}
        {/* 弹层里用(职位板/详情页)也要带上答题壳的 CSS —— inline 那条路由 PlanPrView 挂了同一份 */}
        {!inline && <QuizStyle />}
        <style>{`
.occSelected{display:flex;align-items:center;flex-wrap:wrap;gap:6px;min-height:30px;margin-bottom:10px}
.occSelectedHead{display:flex;align-items:center;gap:8px;margin-right:2px}
.occSelectedChip{display:inline-flex;align-items:center;gap:5px;max-width:100%;border:1px solid #bfdbfe;border-radius:999px;background:#eff6ff;color:${UI.primaryDeep};padding:5px 8px 5px 10px;font:600 12.5px/1.3 inherit;cursor:pointer}
.occSearchWrap{position:relative;margin-bottom:10px}
.occSearchIcon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:${UI.text3};font-size:15px;pointer-events:none}
.occSearchInput{width:100%;box-sizing:border-box;height:40px;padding:0 38px;border:1px solid ${UI.border};border-radius:10px;font-size:13.5px;background:#fff;color:${UI.text};font-family:inherit;outline:none}
.occSearchInput:focus{border-color:#93c5fd;box-shadow:0 0 0 3px #dbeafe}
.occSearchClear{position:absolute;right:5px;top:50%;transform:translateY(-50%);width:30px;height:30px;border:0;border-radius:8px;background:transparent;color:${UI.text2};cursor:pointer;font-size:15px}
.occSearchClear:hover{background:${UI.hairline}}
.occResultsHead{font-size:12px;color:${UI.text3};margin:0 0 7px}
.occGrid{gap:7px}
.occOption{min-height:44px;padding:8px 12px;text-align:left;font-family:inherit}
.occOptionName{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13.5px!important;font-weight:400}
.occOption--on .occOptionName{font-weight:600}
.occOptionMeta{flex-shrink:0;margin-left:auto;color:${UI.text3};font-size:11.5px;font-variant-numeric:tabular-nums}
.occOptionCheck{color:transparent}
.occOption--on .occOptionCheck{color:#fff}
.occMore{display:block;margin:9px auto 0;border:0;background:transparent;color:${UI.primary};font:600 12.5px/1.4 inherit;cursor:pointer;padding:5px 10px}
.occKin{margin:0 0 12px;padding:9px 10px;border-radius:10px;background:#f8fafc;border:1px solid ${UI.hairline}}
.occKinHead{display:flex;align-items:baseline;gap:7px;margin-bottom:7px;font-size:12px;color:${UI.text2};font-weight:600}
.occKinHint{color:${UI.text3};font-size:11px;font-weight:400}
.occKinList{display:flex;flex-wrap:wrap;gap:6px}
.occKinBtn{display:inline-flex;align-items:center;gap:6px;max-width:100%;border:1px solid #dbeafe;border-radius:999px;background:#fff;color:${UI.primaryDeep};padding:5px 9px;font:500 12px/1.35 inherit;cursor:pointer}
.occKinBtn:hover{border-color:#93c5fd;background:#eff6ff}.occKinBtn:disabled{opacity:.4;cursor:not-allowed}
.occKinN{color:${UI.text3};font-size:10.5px;font-variant-numeric:tabular-nums}
@media(max-width:640px){.occOption{min-height:44px}}`}</style>
        {!inline && (
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <QuizTitle>{t('quiz.q2')}</QuizTitle>
            <button onClick={onClose} aria-label="close" style={{ border: 'none', background: 'none', color: UI.text3, fontSize: 18, cursor: 'pointer', padding: 0 }}>×</button>
          </div>
        )}

        {/* 已选区常驻且只有一行高度:选择时页面不跳,也不再为辅助推荐发慢查询。 */}
        {!hideDone && (
          <div className="occSelected">
            <div className="occSelectedHead">
              <b style={{ fontSize: 12, color: UI.text2 }}>{t('occ.selected', { n: nocs.length })}</b>
            </div>
            {nocs.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {nocs.map((n) => (
                  <button type="button" className="occSelectedChip" key={n} onClick={() => toggle(n, titles[n] || n)}>
                    {/* 名字还没拉回来时**留个占位**,不拿 5 位码顶上去 —— 2026-08-02 Frank
                        「点击跳转为什么先显示的是数字,后变成文字」:码是给机器看的,不该在人眼前闪一下 */}
                    {titles[n] ? shortOcc(titles[n]) : <Skeleton />}<IconX aria-hidden />
                  </button>
                ))}
              </div>
            ) : <span style={{ fontSize: 12, color: UI.text3 }}>{t('occ.max')}</span>}

          </div>
        )}

        <div className="occSearchWrap">
          <span className="occSearchIcon"><IconSearch /></span>
          <input className="occSearchInput" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('quiz.q2ph')}
            aria-label={t('quiz.q2ph')} enterKeyHint="search" autoComplete="off" />
          {q && <button type="button" className="occSearchClear" onClick={() => { setQ(''); setCands([]) }} aria-label="clear"><IconX /></button>}
        </div>

        {q.trim().length < 2 && kin.length > 0 && (
          <div className="occKin">
            <div className="occKinHead">{t('occ.kin')}<span className="occKinHint">{t('occ.kinHint')}</span></div>
            <div className="occKinList">
              {kin.map((x) => {
                const l = label(x)
                return (
                  <button type="button" className="occKinBtn" key={x.noc} disabled={lockedOut(x.noc)}
                    onClick={() => toggle(x.noc, l)} title={l}>
                    <span>＋ {shortOcc(l)}</span>
                    <span className="occKinN">{t('quiz.openN', { n: x.open.toLocaleString('en-CA') })}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {q.trim().length >= 2 && (
          <div style={{ marginBottom: 14 }} aria-live="polite">
            <div className="occResultsHead">{searching ? '…' : t('occ.resultN', { n: cands.length })}</div>
            {!searching && cands.length === 0 ? (
              <div style={{ border: `1px dashed ${UI.border}`, borderRadius: 10, padding: '18px 12px', textAlign: 'center', fontSize: 13, color: UI.text3 }}>{t('occ.noResult')}</div>
            ) : (
              <div className="qzList occGrid">
                {cands.map((c) => {
                  const on = nocs.includes(c.noc)
                  return (
                    <button type="button" className={`qzItem occOption${on ? ' qzItem--on occOption--on' : ''}`} key={c.noc} disabled={lockedOut(c.noc)}
                      onClick={() => { toggle(c.noc, label(c)); setQ(''); setCands([]) }} style={lockedStyle(c.noc)}>
                      <span className="qzBadge occOptionCheck">{on && <IconCheck />}</span>
                      <span className="qzText occOptionName">{shortOcc(label(c))}</span>
                      <span className="occOptionMeta">{c.noc}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* 首屏同步出常用职业,一次露 6 条;缓存若已热好再补真实在招数,完整职业走搜索。 */}
        {q.trim().length < 2 && <div className="qzList occGrid">
          {shownList.map((x) => {
            const l = label(x)
            const hint = (dupCount.get(l) || 0) > 1 ? (x.title && x.title !== l ? x.title : x.noc) : ''
            const on = nocs.includes(x.noc)
            return (
              <button type="button" className={`qzItem occOption${on ? ' qzItem--on occOption--on' : ''}`} key={x.noc} title={l} disabled={lockedOut(x.noc)} onClick={() => toggle(x.noc, l)} style={lockedStyle(x.noc)}>
                <span className="qzBadge occOptionCheck">{on && <IconCheck />}</span>
                <span className="qzText occOptionName">{shortOcc(l)}</span>
                {hint ? <span className="occOptionMeta">{hint}</span> : null}
                {x.open ? <span style={{ fontSize: 12.5, color: UI.text3, flexShrink: 0 }}>{t('quiz.openN', { n: x.open.toLocaleString('en-CA') })}</span> : null}
              </button>
            )
          })}
        </div>}
        {q.trim().length < 2 && visibleCount < list.length && (
          <button type="button" className="occMore" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>{t('quiz.moreNocs')} ↓</button>
        )}

        {/* 动作条**永远在**(2026-08-03 Frank「下一题在最下面点不到」「下一题位置还不统一」):
            先前是「选中才出现」——按钮凭空冒出来又把布局顶一下,而且没选中时这一格是空的,
            用户翻到底发现无处可点。现在恒在、粘在视口底,没选中时放一句灰字说明,
            **位置与答题页的「下一题」对齐**(那边同批也改了 sticky),整条决定线的下一步都在同一个地方。 */}
        {inline ? (
          // 动作条与答题页是**同一个组件**(QuizUI 的 QuizBar),不是照着抄的一套样式 ——
          // 「下一题位置不统一」的病根就是各写各的(2026-08-03 Frank「保证所有答题页面一致」)
          <QuizBar hint={nocs.length === 0 ? t('quiz.pickFirst') : undefined}>
            {nocs.length > 0
              ? <Button kind="primary" onClick={() => onDone(nocs)} style={{ padding: '11px 26px', fontSize: 14 }}>{doneLabel || t('quiz.nextN', { n: nocs.length })}</Button>
              : <Button kind="primary" disabled style={{ padding: '11px 26px', fontSize: 14, background: UI.hairline, color: UI.text3, cursor: 'default' }}>{doneLabel || t('plan.next')}</Button>}
          </QuizBar>
        ) : nocs.length > 0 ? (
          <Button kind="primary" onClick={() => onDone(nocs)} style={{ width: '100%', padding: '11px 0', fontSize: 15, marginTop: 14 }}>
            {t('quiz.nextN', { n: nocs.length })}
          </Button>
        ) : null}
    </>
  )

  if (inline) return body
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.45)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, maxHeight: '86vh', overflow: 'auto', padding: '18px 18px 20px' }}>
        {body}
      </div>
    </div>
  )
}
