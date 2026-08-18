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
import { QuizNav, QuizStyle, QuizTitle } from './QuizUI'
import { Button, UI } from '../ui'
import { shortOcc } from './EntryQuiz'
import { BROAD_SLUGS } from '../stats/shared'
import { pickName } from '@/lib/occName'
import type { TFn } from '@/lib/i18n'

type Cand = { noc: string; title: string; titleZh: string; titleZhShort?: string; titleKoShort?: string; titleEnShort?: string }
type Top = Cand & { open: number; broad?: string }

// inline=true:不套弹层,直接铺在答题卡里(2026-07-31 Frank「选职业和其他问题都放到一个方式,
// 不要只有职业是弹框」)—— 职业是第一题,就该和别的题长一个样,而不是另开一层。
// 名字加载中的占位条(与文字同高,避免拿到名字时行高跳一下)
const Skeleton = () => (
  <span aria-hidden style={{ display: 'inline-block', width: 76, height: '0.85em', borderRadius: 4, background: 'rgba(255,255,255,.45)' }} />
)

export function OccPicker({ t, lang, initial, onDone, onChange, onClose, inline, doneLabel, hideDone, initialTop, finishLabel, onFinish }: {
  t: TFn
  lang: string
  initial: string[]
  /** 服务端已取好的热门榜(ETL 聚合表 noc_openings 直出)。给了它就**一次成型**:
   *  首帧即终态,不再「内置 14 个 → 补数字 → 换真榜」刷三次,骨架也用不上。
   *  (2026-08-12 Frank「现在是一点一点刷出来,不能一次性刷出来吗」) */
  initialTop?: Top[]
  onDone: (nocs: string[]) => void
  // 2026-08-01(Frank「不能同时显示出来吗」):合并成一屏后,选职业不再是独立一步 ——
  // 选中即回传(onChange),自己的动作按钮收起(hideDone),整卷底部只留一个「出报告」。
  onChange?: (nocs: string[]) => void
  onClose?: () => void
  inline?: boolean
  doneLabel?: string
  hideDone?: boolean
  /** 旁路收卷钮(2026-08-16 Frank「这两个右下角都需要一个完成按钮」);选择经 onChange 已实时落档 */
  finishLabel?: string
  onFinish?: () => void
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
  const [top, setTop] = useState<Top[]>(() => initialTop?.length ? initialTop : POPULAR_NOCS.map((x) => ({
    noc: x.noc, title: t(x.key), titleZh: t(x.key), open: 0,
  })))
  // 真实热门榜(top=24)到没到 —— 没到之前用骨架把格子占满,否则列表从 14 个长到 24 个,
  // 整块跟着重排,看着就是「打开刷了一下」(2026-08-12 Frank 实拍)
  const [topLoaded, setTopLoaded] = useState(!!initialTop?.length)
  const [cat, setCat] = useState('')
  const [catalogByCat, setCatalogByCat] = useState<Record<string, Top[]>>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 首屏立即用内置常用清单;并行补两份事实:
  // ① 小查询只给这 14 个兜底职业补在招数,让数字尽快出现;
  // ② 完整 top=24 后台跑完后替换成真实热门榜。两者都不阻塞控件,也不再 400ms 就掐断。
  useEffect(() => {
    if (initialTop?.length) return          // 服务端已给终态,一个请求都不用发
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
        // **保住首屏已经显示的顺序**:真实热门榜按在招量排,而首屏那份是内置常用清单的固定序 ——
        // 直接整份替换的话,用户眼睁睁看着胶囊重新洗牌(2026-08-12 Frank 实拍:「各种职业瞬间跳到第一个厨师」,
        // 厨师岗最多所以窜到第一)。改成:已显示过的按原位留着(只把在招数合并进来),没显示过的追加在后。
        setTop((prev) => {
          if (!rows.length) return prev
          const byNoc = new Map(rows.map((r) => [r.noc, r]))
          // 首屏那 14 个**一个都不动**(在真实榜里的顺带把在招数合并进来,不在榜里的原样留着) ——
          // 只按榜单过滤的话,榜上没有的内置职业会凭空消失,看着还是重排。榜里多出来的追加在后。
          const kept = prev.map((p) => ({ ...p, ...(byNoc.get(p.noc) ?? {}) }))
          const keptSet = new Set(kept.map((k) => k.noc))
          return [...kept, ...rows.filter((r) => !keptSet.has(r.noc))]
        })
        // 回到这一步时存档只有 NOC 码。热门清单通常比逐码查询先返回,顺手从同一份数据补名字,
        // 避免已选胶囊在慢连接下多空白一拍；冷门职业仍由下面的逐码查询兜底。
        setTopLoaded(true)
        const known = rows.filter((x) => nocs.includes(x.noc)).map((x) => [x.noc, pickName(x, lang)] as [string, string])
        if (known.length) setTitles((m) => ({ ...m, ...Object.fromEntries(known) }))
      })
      // **abort 不算拿不到**:StrictMode/切页会中止第一次请求,把它当失败会立刻撤掉骨架,
      // 骨架一撤、真榜再到,列表照样长一次(2026-08-12 实撞,探针打出 topLoaded=true 才看出来)
      .catch((e) => { if (e?.name !== 'AbortError') setTopLoaded(true) /* 真拿不到就用兜底那 14 个 */ })
    return () => { dead = true; topController.abort(); countsController.abort() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- 首屏快照只拉一次;语言切换由逐码查询刷新
  const base: Top[] = top.length
    ? top
    : POPULAR_NOCS.map((x) => ({ noc: x.noc, title: t(x.key), titleZh: t(x.key), open: 0 }))
  const cats = BROAD_SLUGS.map(([, name]) => name)
  const catRows = cat ? catalogByCat[cat] : undefined
  const catLoading = !!cat && catRows === undefined
  // 分类一次摆全:接口 fetchBroadNocs 硬顶 60 条,不需要再分页(「查看更多」已撤)。
  // 热门那一屏**按在招量降序**(2026-08-12 Frank:「cooks 应该排在第一啊」)—— 胶囊上就写着在招数,
  // 顺序不跟着它走,读者会以为这个序另有含义。分类页的行由接口按量排好,不再动。
  const list = cat ? (catRows || []) : [...base].sort((a, b) => (b.open ?? 0) - (a.open ?? 0)).slice(0, 24)

  // 分类名称同步可见；职业只在用户点中某类后按需查询。这样恢复旧版分类浏览,
  // 又不再让每次打开问卷都为从未点击的 26 类扫描 top=200。
  useEffect(() => {
    if (!cat || Object.prototype.hasOwnProperty.call(catalogByCat, cat)) return
    const controller = new AbortController()
    fetch(`/api/quiz?broad=${encodeURIComponent(cat)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setCatalogByCat((m) => ({ ...m, [cat]: Array.isArray(d?.top) ? d.top : [] })))
      .catch((e) => { if (e?.name !== 'AbortError') setCatalogByCat((m) => ({ ...m, [cat]: [] })) })
    return () => controller.abort()
  }, [cat, catalogByCat])

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
.occCatSel{display:none;width:100%;height:40px;box-sizing:border-box;margin:0 0 11px;padding:0 10px;border:1px solid ${UI.border};border-radius:10px;background:#fff;color:${UI.text};font:13.5px/1 inherit}
.occCatTabs{display:flex;flex-wrap:wrap;gap:14px;margin:1px 0 12px;padding:0 0 9px;border-bottom:1px solid ${UI.hairline}}
.occCatTab{border:0;border-bottom:2px solid transparent;background:transparent;padding:3px 0;color:${UI.text2};font:400 13px/1.4 inherit;cursor:pointer}
.occCatTab--on{border-bottom-color:${UI.primary};color:${UI.primary};font-weight:700}
.occPills{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.occPill{display:inline-flex;align-items:center;gap:7px;max-width:100%;min-height:36px;box-sizing:border-box;padding:7px 13px;border:1px solid ${UI.border};border-radius:999px;background:#fff;color:${UI.text};font:500 13.5px/1.35 inherit;cursor:pointer;transition:border-color .12s,background .12s,color .12s}
.occPill:hover{border-color:#93c5fd;background:#f8fbff}
.occPill--on{border-color:${UI.primary};background:${UI.primary};color:#fff;font-weight:600}
.occPill--on:hover{border-color:${UI.primaryDeep};background:${UI.primaryDeep}}
/* 走查 #296:职业名不许截断(「Restaurant and food service m…」)——名字是用户找自己那一行的唯一线索,
   截了他就认不出。放不下就换行,胶囊变高一点没关系;别再加 ellipsis/nowrap 回来。 */
.occPillName{min-width:0;overflow-wrap:anywhere}
.occPillMeta{flex-shrink:0;color:${UI.text3};font-size:11.5px;font-variant-numeric:tabular-nums}
.occPill--on .occPillMeta{color:#dbeafe}
.occPillCheck{display:inline-flex;align-items:center;font-size:12px}
.occPillSkeleton{height:36px;border-radius:999px;background:${UI.hairline}}
.occMore{display:block;margin:9px auto 0;border:0;background:transparent;color:${UI.primary};font:600 12.5px/1.4 inherit;cursor:pointer;padding:5px 10px}
@media(max-width:640px){.occCatSel{display:block}.occCatTabs{display:none}.occPills{gap:7px}.occPill{min-height:38px;padding:8px 12px}}`}</style>
        {!inline && (
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <QuizTitle>{t('quiz.q2')}</QuizTitle>
            <button onClick={onClose} aria-label="close" style={{ border: 'none', background: 'none', color: UI.text3, fontSize: 18, cursor: 'pointer', padding: 0 }}>×</button>
          </div>
        )}

        <div className="occSearchWrap">
          <span className="occSearchIcon"><IconSearch /></span>
          <input className="occSearchInput" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('quiz.q2ph')}
            aria-label={t('quiz.q2ph')} enterKeyHint="search" autoComplete="off" />
          {q && <button type="button" className="occSearchClear" onClick={() => { setQ(''); setCands([]) }} aria-label="clear"><IconX /></button>}
        </div>

        {q.trim().length >= 2 && (
          <div style={{ marginBottom: 14 }} aria-live="polite">
            <div className="occResultsHead">{searching ? '…' : t('occ.resultN', { n: cands.length })}</div>
            {!searching && cands.length === 0 ? (
              <div style={{ border: `1px dashed ${UI.border}`, borderRadius: 10, padding: '18px 12px', textAlign: 'center', fontSize: 13, color: UI.text3 }}>{t('occ.noResult')}</div>
            ) : (
              <div className="occPills">
                {cands.map((c) => {
                  const on = nocs.includes(c.noc)
                  return (
                    <button type="button" className={`occPill${on ? ' occPill--on' : ''}`} key={c.noc} aria-pressed={on}
                      onClick={() => { toggle(c.noc, label(c)); setQ(''); setCands([]) }}>
                      {on && <span className="occPillCheck"><IconCheck /></span>}
                      <span className="occPillName">{shortOcc(label(c))}</span>
                      <span className="occPillMeta">{c.noc}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* 旧版“分类 + 胶囊”浏览恢复。桌面用文字标签,手机用单行下拉；完整目录后台加载,
            热门首屏不等它,所以刷新速度仍保持这一版的快速路径。 */}
        {q.trim().length < 2 && (
          <>
            <select className="occCatSel" value={cat} aria-label={t('mkt.broad')}
              onChange={(e) => setCat(e.target.value)}>
              <option value="">{t('occ.cat.hot')}</option>
              {cats.map((c) => <option key={c} value={c}>{t('broad.' + c)}</option>)}
            </select>
            <div className="occCatTabs">
              {['', ...cats].map((c) => (
                <button type="button" key={c || 'hot'} className={`occCatTab${cat === c ? ' occCatTab--on' : ''}`}
                  onClick={() => setCat(c)}>
                  {c ? t('broad.' + c) : t('occ.cat.hot')}
                </button>
              ))}
            </div>
          </>
        )}

        {/* 首屏同步出常用职业；缓存若已热好再补真实在招数。分类内按招聘量排列 */}
        {q.trim().length < 2 && <div className="occPills" aria-busy={catLoading}>
          {catLoading ? [104, 146, 122, 168, 112, 138].map((width, i) => (
            <span className="occPillSkeleton" key={i} style={{ width }} />
          )) : list.map((x) => {
            const l = label(x)
            const hint = (dupCount.get(l) || 0) > 1 ? (x.title && x.title !== l ? x.title : x.noc) : ''
            const on = nocs.includes(x.noc)
            return (
              <button type="button" className={`occPill${on ? ' occPill--on' : ''}`} key={x.noc} title={l} aria-pressed={on} onClick={() => toggle(x.noc, l)}>
                {on && <span className="occPillCheck"><IconCheck /></span>}
                <span className="occPillName">{shortOcc(l)}</span>
                {hint ? <span className="occPillMeta">{hint}</span> : null}
                {x.open ? <span className="occPillMeta">{t('quiz.openN', { n: x.open.toLocaleString('en-CA') })}</span> : null}
              </button>
            )
          })}
          {/* 榜还没到 → 用骨架把剩下的格子占住:格子数从头到尾是 24,列表不会长一次、也就不会重排 */}
          {!cat && !catLoading && !topLoaded && Array.from({ length: Math.max(0, 24 - list.length) }, (_, i) => (
            <span className="occPillSkeleton" key={`ph${i}`} // 宽度按真胶囊(名字 + 「N 在招」)的量级取,占位与实物差得越少,填上去那一下越看不出来
            style={{ width: [206, 170, 194, 152, 214, 164][i % 6] }} />
          ))}
        </div>}

        {/* 动态区域统一放在稳定的搜索/分类/职业列表之后。点选时上半屏不再被新增胶囊向下顶；
            列表内的选中态已经即时反馈，底部汇总负责删除和查看全部已选项。 */}
        {!hideDone && (
          <div className="occSelected" style={{ marginTop: 14 }}>
            <div className="occSelectedHead">
              <b style={{ fontSize: 12, color: UI.text2 }}>{t('occ.selected', { n: nocs.length })}</b>
            </div>
            {nocs.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {nocs.map((n) => (
                  <button type="button" className="occSelectedChip" key={n} onClick={() => toggle(n, titles[n] || n)}>
                    {titles[n] ? shortOcc(titles[n]) : <Skeleton />}<IconX aria-hidden />
                  </button>
                ))}
              </div>
            ) : <span style={{ fontSize: 12, color: UI.text3 }}>{t('occ.max')}</span>}
          </div>
        )}

        {/* 动作条**永远在**(2026-08-03 Frank「下一题在最下面点不到」「下一题位置还不统一」):
            先前是「选中才出现」——按钮凭空冒出来又把布局顶一下,而且没选中时这一格是空的,
            用户翻到底发现无处可点。现在恒在、粘在视口底,没选中时放一句灰字说明,
            **位置与答题页的「下一题」对齐**(那边同批也改了 sticky),整条决定线的下一步都在同一个地方。 */}
        {inline ? (
          // 动作条与答题页是**同一个组件**(QuizUI 的 QuizNav),不是照着抄的一套样式 ——
          // 「下一题位置不统一」的病根就是各写各的(2026-08-03 Frank「保证所有答题页面一致」)。
          // 按钮文案也恒定:选了几个写在左边灰字里,不塞进按钮 —— 文案变宽 = 按钮跟着挪。
          <QuizNav prevLabel={t('plan.prev')} nextLabel={doneLabel || t('plan.next')}
            nextDisabled={nocs.length === 0} onNext={() => onDone(nocs)}
            hint={nocs.length === 0 ? t('quiz.pickFirst') : undefined}
            doneLabel={finishLabel && nocs.length > 0 ? finishLabel : undefined} onDone={onFinish} />
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
