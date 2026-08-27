'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react'

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 职位表列宽:**唯一控制点**(Frank 2026-08-03「宽度控制放到一个地方」)。
 * 刷新页面 / 查完筛选 / 拖列竖线 —— 三条触发全走这一个 hook,不再有第二套分支。
 *
 * 规则(按优先级,Frank「列宽应该优先考虑 title 宽度,其次是内容宽度」):
 *   ① **表头第一**:每列先拿够表头单行宽 —— 表头永不折行、永不截断。
 *   ② **内容第二**:余量先把各列补到「九成的值不折行」(p90),还有余再补到最长值(max);
 *      不够分就按「还差多少」按比例给(缺得多的多拿),不搞雨露均沾。
 *   ③ **谁都不缺了还有剩**:全给内容最长的那列 —— 免得「vs 中位」这种恒短值白占一片空地。
 *   ④ 总宽恒等于容器宽 → **永不横滚**;只有「表头都放不下」或用户手动拖宽才允许滚。
 *   ⑤ 手动拖过的列钉死在拖出来的宽度,其余列照 ①②③ 重分;双击竖线取消该列的手动值。
 *
 * 历史教训(别再走回头路):
 *   - 手配权重表(FIT_WEIGHT):每加删一列就得重配一次,删了三列后每列等比变胖 —— 已废。
 *   - 量宽的 key 在**量之前**就标记为「已量」:首帧 tbody 还没行 → 量空了也不会重来,
 *     线上于是所有列一律 120px 均分(2026-08-03 实测 prod)。现在只有**量到了**才记 key。
 *   - 筛选换了数据不重量 → 筛「IT」后大分类列还按上一批的宽度占地。现在数据指纹变了就重量。
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** 一列量到的宽度(含单元格内边距)。word=最长的那个词,列再窄也不能把词拦腰断开 */
type ColMeasure = { head: number; word: number; p90: number; max: number }

type Alloc = { key: string; head: number; word: number; p90: number; max: number; pinned?: number }

/** 任何列都不低于这个宽(表头量不到时的兜底) */
const FLOOR = 44

/** 数组格的读值兜底(开灯批 2026-08-26:数字数组下标缺席就是 undefined,就地折默认) */
function nOf(v: number | undefined, or: number): number {
  if (v == null) { return or }
  return v
}

/**
 * 拖列的**纯算法**(Excel 式,2026-08-16):把第 idx 列拉到 want 宽,总宽恒定不变。
 *   · idx 左边的列一律不动(先前全局重分,左边会跟着跳 —— Frank「有时候左边的列移动」)
 *   · 拉宽:差额从**右边**列里出,自最右一列开始逐列让到各自下限;中间列宽度不变=整体平移
 *   · 缩窄:腾出的宽度按**内容**给(见 takerOf),不按位置甩给最右一列
 *   · 最后一列没有右邻居,只能反过来向左要(否则拖了没反应)
 * floors[i] = 该列下限(表头不折行:max(FLOOR, head, word));maxes[i] = 该列内容自然宽(可不给)。
 * 返回整数像素,和恒等于输入和。
 */
export function resizeColWidths(base: number[], idx: number, want: number, floors: number[], maxes?: number[]): number[] {
  const w = base.slice()
  if (idx < 0 || idx >= w.length) return w
  const donors = idx < w.length - 1
    ? Array.from({ length: w.length - 1 - idx }, (_, n) => w.length - 1 - n)
    : Array.from({ length: idx }, (_, n) => idx - 1 - n)
  let need = Math.max(floors[idx] ?? FLOOR, want) - nOf(base[idx], FLOOR)
  if (need < 0) { const t = takerOf(donors, w, maxes); w[t] = nOf(w[t], FLOOR) - need; need = 0 }   // 缩窄:整块给一列(见下)
  for (const d of donors) {
    if (need === 0) break
    const give = Math.min(need, nOf(w[d], FLOOR) - (floors[d] ?? FLOOR)); w[d] = nOf(w[d], FLOOR) - give; need -= give
  }
  w[idx] = nOf(base[idx], FLOOR) + (Math.max(floors[idx] ?? FLOOR, want) - nOf(base[idx], FLOOR) - need)
  return w.map((x) => Math.round(x))
}

/**
 * 缩窄一列时,腾出来的宽度归谁 —— 和分宽规则③同一条:**给内容最需要的那列**。
 * 先前按位置给最右一列:那通常是「操作」(内容恒短),于是每缩一次就在右端空出一大片
 * (Frank「操作右面空了一大截」的老毛病换个入口又长出来)。
 * 缺口最大的优先;都补平了(或压根没量到内容)就给内容最长的那列;maxes 缺席才退回最右一列。
 */
function takerOf(donors: number[], w: number[], maxes?: number[]): number {
  if (!maxes) return nOf(donors[0], 0)
  const gap = (i: number) => Math.max(0, (maxes[i] ?? 0) - nOf(w[i], 0))
  const best = donors.reduce((a, b) => (gap(b) > gap(a) ? b : a), nOf(donors[0], 0))
  return gap(best) > 0 ? best : donors.reduce((a, b) => ((maxes[b] ?? 0) > (maxes[a] ?? 0) ? b : a), nOf(donors[0], 0))
}

/**
 * 纯函数:按 ①②③ 把 avail 像素分给各列。返回整数像素,和恒等于 avail(除非表头都放不下)。
 */
function allocateColWidths(cols: Alloc[], avail: number): Record<string, number> {
  const out: Record<string, number> = {}
  if (!cols.length) return out
  const flex: Alloc[] = []
  let room = avail
  for (const c of cols) {
    if (c.pinned != null) { const pw = Math.round(c.pinned); out[c.key] = pw; room -= pw }
    else flex.push(c)
  }
  if (!flex.length) return out

  // ① 表头优先(顺带保底:再挤也不把一个词拦腰断成「Newfoundlan / d」)
  for (const c of flex) out[c.key] = Math.max(FLOOR, c.head, c.word)
  let extra = room - flex.reduce((s, c) => s + nOf(out[c.key], 0), 0)

  // ② 内容:先把各列补到 p90(九成的值不折行),还有余再补到最长值。
  //    **缺口小的先补满**:薪资/省市这种原子值只差几十像素,补满就彻底不折行;
  //    职位/公司这种长文本再怎么给也给不完,让它们分剩下的 —— 一句话:短值列不折行,
  //    挤压全压在本来就要多行的文本列上(和 Frank「哪个最宽优先缩哪个」同一个意思)。
  for (const target of ['p90', 'max'] as const) {
    if (extra <= 0) break
    let rest = flex.map((c) => ({ key: c.key, want: Math.max(0, c[target] - nOf(out[c.key], 0)) }))
      .filter((x) => x.want > 0).sort((a, b) => a.want - b.want)
    while (rest.length && extra > 0) {
      const restHead = rest[0]
      if (restHead == null) { break }
      if (restHead.want <= extra / rest.length) {        // 均分下来够它补满 → 先把它喂饱,剩下的再分
        out[restHead.key] = nOf(out[restHead.key], 0) + restHead.want
        extra -= restHead.want
        rest = rest.slice(1)
        continue
      }
      const restWant = rest.reduce((s, x) => s + x.want, 0)   // 谁都补不满了 → 按缺口比例分掉余量
      for (const x of rest) out[x.key] = nOf(out[x.key], 0) + extra * (x.want / restWant)
      extra = 0
    }
  }

  // ③ 还有剩:给内容最长的那列(通常是职位/公司),别摊给恒短值列
  if (extra > 0) { const widest = flex.reduce((a, b) => (b.max > a.max ? b : a)).key; out[widest] = nOf(out[widest], 0) + extra }

  // 整数化:小数列宽会让 1px 列分隔线落在半个设备像素上被吃掉(Frank 实拍「列的竖线怎么没了」)。
  // 四舍五入后把误差补回最宽那列,保证总和不多不少 = avail。
  let sum = 0
  for (const c of flex) { const rounded = Math.round(nOf(out[c.key], 0)); out[c.key] = rounded; sum += rounded }
  const drift = room - sum
  if (drift !== 0) { const widest = flex.reduce((a, b) => (b.max > a.max ? b : a)).key; out[widest] = nOf(out[widest], 0) + drift }
  return out
}

// cookie 名与解析在 colWidths.shared.ts(服务端也要读,那边不能带 hook);这里原样转出,
// 客户端照旧只 import 这一个文件
export { COLW_COOKIE, parseColWidthSeed, type ColWidthSeed } from './colWidths.shared'
import { COLW_COOKIE, type ColWidthSeed } from './colWidths.shared'

type ColWidths = {
  /** 有宽度可下没:量到了 or 有 cookie 种子。没有就先让浏览器 auto 布局顶一帧 */
  ready: boolean
  /** colgroup 用:量到了给像素,只有种子时给百分比(服务端渲染就能定版式,水合不再抻一下) */
  width: (key: string) => number | string | undefined
  /** table 的 width:不溢出时 '100%',溢出时总像素 */
  tableWidth: string | number
  /** 总宽超容器(表头都放不下 / 手动拖宽)→ 需要横滚,此时才有必要固定左列 */
  overflow: boolean
  startResize: (e: ReactMouseEvent, key: string) => void
  /** 双击竖线:该列回归自动 */
  autoFit: (key: string) => void
  hasManual: boolean
  reset: () => void
}

/**
 * @param keys      当前可见列(顺序即渲染顺序)
 * @param headRowRef 表头 <tr>(量宽的锚点,同时用于定位 table / 容器)
 * @param pinnedPx  固定像素列(操作列按钮宽,不参与瓜分)
 * @param dataKey   数据指纹:列集/语言/当前这批行 —— 变了就重量
 * @param pad       单元格左右内边距之和(量到的是纯内容宽,分宽时要加上)
 * @param seed      服务端从 cookie 读到的上次比例:首屏就按它定版式,免得水合后抻一下
 */
export function useColWidths(opts: {
  keys: string[]
  headRowRef: RefObject<HTMLTableRowElement | null>
  pinnedPx?: Record<string, number>
  dataKey: string
  pad: number
  seed?: ColWidthSeed | null
}): ColWidths {
  const { keys, headRowRef, pinnedPx, dataKey, pad, seed } = opts
  const [measured, setMeasured] = useState<Record<string, ColMeasure>>({})
  const [wrapW, setWrapW] = useState(0)
  const [manual, setManual] = useState<Record<string, number>>({})
  const doneKey = useRef('')
  const keysKey = keys.join(',')
  // 拖列回调是 useCallback([]) 常驻件,直接闭包 keys/measured 会钉死在首帧的值(列集换了、量宽更新了都读不到)
  const keysRef = useRef(keys); keysRef.current = keys
  const measuredRef = useRef(measured); measuredRef.current = measured

  // ── 量宽:整表临时「不折行 + 按内容撑开」,读每列真实需要多宽,量完立刻还原(只存在一帧)
  const measure = useCallback((): boolean => {
    const head = headRowRef.current
    const table = head?.closest('table') as HTMLTableElement | null
    if (!head || !table || !table.querySelector('tbody tr')) return false
    const wrap = table.closest('.jtTableWrap') as HTMLElement | null
    if (!wrap || !wrap.clientWidth) return false      // 手机端容器 display:none → 量不了,等桌面再说

    const prev = { tl: table.style.tableLayout, w: table.style.width, mw: table.style.minWidth }
    table.classList.add('jtMeasure')
    table.style.tableLayout = 'auto'
    table.style.width = 'max-content'
    table.style.minWidth = '0'
    // 量的是**内容**不是格子:量宽模式下格子被拉到整列宽,读 td 宽度只会读回「最长那条」。
    // 用 Range 圈住格内内容量它自己,才分得出「这一列大多数值有多宽」。
    // +1:文字实宽是小数(85.2px),向上取整还差半个像素就会折行 —— 留 1px 富余
    const contentW = (el: HTMLElement): number => {
      const r = document.createRange()
      r.selectNodeContents(el)
      return Math.ceil(r.getBoundingClientRect().width) + 1
    }
    const rows = [...table.querySelectorAll('tbody tr')].slice(0, 60)
    const cellsOf = (i: number) => rows.map((tr) => tr.children[i] as HTMLElement | undefined)
      .filter(Boolean).map((el) => contentW(el!))
    const m: Record<string, ColMeasure> = {}
    keys.forEach((key, i) => {
      const th = head.children[i] as HTMLElement | undefined
      const cells = cellsOf(i).sort((a, b) => a - b)
      // 九成位而不是最大值:整列宽度不该被一条超长值绑架(一条「Manufacturing and utilities」
      // 能把大分类撑到 249px,右边几列全被压到底线反而更折行)。最长值留给「还有余量」那步。
      const p90 = cells.length ? nOf(cells[Math.min(cells.length - 1, Math.floor(cells.length * 0.9))], 0) : 0
      m[key] = { head: (th ? contentW(th) : 0) + pad, word: 0, p90: p90 + pad, max: (cells[cells.length - 1] ?? 0) + pad }
    })
    // 第二趟:整表按 min-content 摊开(允许折行)→ 每格的 Range 宽 = 它最宽的那一行 = 最长的那个词。
    // 这就是「列的下限」:比它还窄就会出现「Newfoundlan / d and Labrador」这种断词。
    table.classList.remove('jtMeasure')
    table.style.width = 'min-content'
    keys.forEach((key, i) => { const mk = m[key]; if (mk != null) { mk.word = Math.max(...cellsOf(i), 0) + pad } })
    table.style.tableLayout = prev.tl
    table.style.width = prev.w
    table.style.minWidth = prev.mw
    setMeasured(m)
    setWrapW(wrap.clientWidth)
    return true
  }, [keys, headRowRef, pad])

  // 触发点一:首屏/刷新、换列、换语言、筛选换数据 —— 全靠 dataKey。
  // **量到了才记 key**:首帧还没数据时量不到,下一帧继续试(老版本在这儿把 key 提前记死,
  // 于是线上永远停在「没量到」的均分状态)。
  useIsoLayoutEffect(() => {
    if (doneKey.current === dataKey) return
    if (measure()) doneKey.current = dataKey
  })

  // 字体加载完再量一次:首帧用兜底字体量出来的宽度会偏(中文字形差异尤其大)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const f = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts
    if (!f?.ready) return
    let alive = true
    f.ready.then(() => { if (alive) { doneKey.current = ''; setTick((n) => n + 1) } })
    return () => { alive = false }
  }, [])
  void tick   // 只为触发一次重量,值本身不参与计算

  // 触发点二:容器宽变了(窗口缩放/侧栏开合)——内容自然宽不变,只要重分即可
  useEffect(() => {
    const wrap = headRowRef.current?.closest('.jtTableWrap') as HTMLElement | null
    if (!wrap || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setWrapW(wrap.clientWidth))
    ro.observe(wrap)
    setWrapW(wrap.clientWidth)
    return () => ro.disconnect()
  }, [headRowRef, keysKey])

  // 换列集 → 手动宽作废(新列在固定布局里会塌成 0)
  useEffect(() => { setManual({}) }, [keysKey])

  // ── 分宽(唯一出口)
  // 可分宽度 = 容器 clientWidth,**不要再减边框**:clientWidth 本来就不含 border(减了就凭空少 2px)。
  // 少这 2px 的后果不是「窄一点」,是**假横滚**:拖列时所有列都按实宽钉住,minTotal=wrapW>avail=wrapW-2
  // → overflow 判真 → 固定左列开 sticky → 偏移量一旦跟不上拖动就把隔壁列盖住(2026-08-16 Frank 实拍「穿透了职位列」)。
  const avail = wrapW || 0
  const cols: Alloc[] = keys.map((k) => ({
    key: k,
    head: measured[k]?.head ?? FLOOR,
    word: measured[k]?.word ?? 0,
    p90: measured[k]?.p90 ?? FLOOR,
    max: measured[k]?.max ?? FLOOR,
    pinned: manual[k] ?? pinnedPx?.[k],
  }))
  const minTotal = cols.reduce((s, c) => s + (c.pinned ?? Math.max(FLOOR, c.head, c.word)), 0)
  const overflow = avail > 0 && minTotal > avail
  const px = allocateColWidths(cols, Math.max(avail, minTotal))
  const total = keys.reduce((s, k) => s + (px[k] ?? 0), 0)

  // ── 触发点三:拖列竖线 —— **Excel 式**(2026-08-16 Frank「有时候右边的列移动,有时候左边的列移动,
  //    能不能统一都改成右边的列整体移动」)。
  //    先前只钉被拖的那一列、其余列照 ①②③ 重分 → 重分是全局的,左边的列也会跟着跳。
  //    现在:拖之前**把所有列按当前实宽钉住**(左边从此一动不动),被拖列吃掉位移,
  //    差额只从**右边**列里出、且从最右一列开始逐列让 —— 中间那些列宽度不变,整体平移,正是 Excel 的手感。
  //    总宽恒定不变,所以「永不横滚」那条铁律仍然成立(④)。
  //    让宽的下限仍是「表头不折行」(max(FLOOR, head, word)),让到底了再找左边一列继续让。
  //    最后一列没有右邻居 → 只能反过来从它左边那列让,否则拖了没反应。
  const startResize = useCallback((e: React.MouseEvent, key: string) => {
    e.preventDefault(); e.stopPropagation()
    const th = (e.currentTarget as HTMLElement).closest('th') as HTMLElement | null
    const rowEl = th?.parentElement
    if (!th || !rowEl) return
    const ths = Array.from(rowEl.children) as HTMLElement[]
    const base = ths.map((el) => el.getBoundingClientRect().width)
    const order = keysRef.current
    const idx = order.indexOf(key)
    if (idx < 0 || base.length !== order.length) return
    const floorOf = (i: number) => {
      const k = order[i]
      if (k == null) { return FLOOR }
      const m = measuredRef.current[k]
      return Math.max(FLOOR, m?.head ?? FLOOR, m?.word ?? FLOOR)
    }
    const floors = order.map((_, i) => floorOf(i))
    const maxes = order.map((k) => measuredRef.current[k]?.max ?? 0)   // 缩窄时按内容决定谁接手
    const startX = e.clientX
    const onMove = (ev: MouseEvent) => {
      const w = resizeColWidths(base, idx, Math.round(nOf(base[idx], FLOOR) + (ev.clientX - startX)), floors, maxes)
      setManual(Object.fromEntries(order.map((k, i) => [k, nOf(w[i], FLOOR)])))
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'col-resize'
  }, [])

  const autoFit = useCallback((key: string) => {
    setManual((p) => { const n = { ...p }; delete n[key]; return n })
  }, [])

  const measuredReady = avail > 0 && Object.keys(measured).length > 0

  // ── 首屏不抻:把算好的**比例**记进 cookie,下次刷新服务端就能把 colgroup 一起渲出来。
  //    存比例不存像素:视口宽窄不同也照样对得上(百分比之和 = 100% = 容器宽)。
  //    只在比例真的变了时写(±0.3% 以内算没变),避免每次重分都碰 document.cookie。
  const seedOut = useRef('')
  useEffect(() => {
    if (!measuredReady || !total) return
    const pct = keys.map((k) => +((px[k] ?? 0) / total * 100).toFixed(2))
    const val = JSON.stringify({ keys: keysKey, pct })
    if (val === seedOut.current) return
    seedOut.current = val
    try { document.cookie = `${COLW_COOKIE}=${encodeURIComponent(val)}; path=/; max-age=2592000; SameSite=Lax` } catch { /* ignore */ }
  })   // 依赖数组故意不写:上面自己比对 seedOut 去重,写依赖反而容易漏写一项

  // 种子只在「还没量到 + 列集对得上」时顶班:量到了立刻换成像素(同一批数据,差几像素看不出来)
  const useSeed = !measuredReady && seed?.keys === keysKey
  const ready = measuredReady || useSeed
  return {
    ready,
    width: (k) => (measuredReady ? px[k] : useSeed ? `${seed!.pct[keys.indexOf(k)]}%` : undefined),
    tableWidth: measuredReady && overflow ? total : '100%',
    overflow: measuredReady && overflow,
    startResize,
    autoFit,
    hasManual: Object.keys(manual).length > 0,
    reset: () => setManual({}),
  }
}
