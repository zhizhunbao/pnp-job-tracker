'use client'
// 统计图表(E8-06,2026-07-10 用户拍板「开源漂亮图表,任意维度×指标;上常见下自定义」):
// EChart 薄壳(echarts 动态 import 懒加载——打开统计页/弹窗才拉,/jobs 首屏不背体积)+ 预设四图 + 自定义区。
// 数据=stats 表 119 行零计算透传;红线:计数类可跨省求和,中位数不做跨省合并(提示引导选省,不瞎算)。
import { useEffect, useMemo, useRef, useState } from 'react'
import { BROAD_SLUGS, PROVS, PROV_NAME, type StatRow, type OccRow, type CityRow } from './shared'
import type { TFn } from '../jobs/i18n'
import { track } from '@/lib/track'   // #129 功能级 umami 埋点

type ChartInst = { setOption: (o: object, notMerge?: boolean) => void; resize: () => void; clear: () => void; dispose: () => void; on: (ev: string, cb: (e: { dataIndex: number }) => void) => void }

function EChart({ option, height, onBarClick }: { option: object; height: number; onBarClick?: (dataIndex: number) => void }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const inst = useRef<ChartInst | null>(null)
  const clickRef = useRef(onBarClick); clickRef.current = onBarClick  // ref 转发:init 只绑一次,回调随渲染更新
  useEffect(() => {
    let alive = true
    import('echarts').then((e) => {
      if (!alive || !ref.current) return
      if (!inst.current) {
        inst.current = e.init(ref.current) as unknown as ChartInst
        inst.current.on('click', (ev) => clickRef.current?.(ev.dataIndex))
      }
      // #128(批A):下钻条数变化 → 容器高度变,canvas 尺寸不跟 → 残影透叠进相邻卡。
      // clear 掉旧帧 + notMerge 全量换 option + resize 对齐新高度,三连根治
      inst.current.clear()
      inst.current.setOption(option, true)
      inst.current.resize()
    })
    const onResize = () => inst.current?.resize()
    window.addEventListener('resize', onResize)
    return () => { alive = false; window.removeEventListener('resize', onResize) }
  }, [option, height])
  useEffect(() => () => { inst.current?.dispose(); inst.current = null }, [])
  return <div ref={ref} style={{ width: '100%', height, cursor: onBarClick ? 'pointer' : undefined, overflow: 'hidden' }} />
}

// #128(批A):类目过多图变长梯——计数类 >20 收 TOP15+「其他」归并条(其他=不可下钻);
// 中位类不归并(跨类目中位不能求和,红线),原样全列
const CAP_AT = 20
const CAP_TOP = 15
const OTHER_KEY = '__other'
function capItems(items: Item[], sum: boolean, t: TFn): Item[] {
  if (!sum || items.length <= CAP_AT) return items
  const top = items.slice(-CAP_TOP)   // 升序数组,尾部=最大
  const rest = items.slice(0, items.length - CAP_TOP)
  const other: Item = { name: t('chart.other'), full: `${t('chart.other')}(${rest.length})`, key: OTHER_KEY, value: rest.reduce((a, b) => a + b.value, 0) }
  return [other, ...top].sort(asc)
}

type Item = { name: string; full: string; value: number; key: string }  // key=原始维度值(省码/大类中文),下钻用
const fmtOf = (money: boolean) => (v: number) => (money ? `$${Math.round(v / 1000)}K` : String(v))

// 横向条形(10 类目手机窄屏也可读;降序=最大在最上)
function barOption(items: Item[], money: boolean): object {
  const fmt = fmtOf(money)
  return {
    animationDuration: 400,
    grid: { left: 8, right: 48, top: 6, bottom: 6, containLabel: true },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { color: '#9ca3af', fontSize: 11, formatter: (v: number) => fmt(v) } },
    yAxis: { type: 'category', data: items.map((i) => i.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#374151', fontSize: 12 } },
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' }, borderColor: '#e5e7eb', textStyle: { fontSize: 12.5 },
      formatter: (ps: { dataIndex: number; value: number }[]) => { const p = ps[0]; const it = items[p.dataIndex]; return `${it.full}:<b> ${fmt(p.value)}</b>` },
    },
    series: [{
      type: 'bar', data: items.map((i) => i.value), barMaxWidth: 16,
      itemStyle: { color: '#2563eb', borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', color: '#6b7280', fontSize: 11, formatter: (p: { value: number }) => fmt(p.value) },
    }],
  }
}

// 指标配置:sum=计数类(跨省求和成立);中位类只透传预聚合值,不合并
const METRICS = [
  { key: 'openJobs', label: 'stats.openJobs', money: false, sum: true },
  { key: 'new7d', label: 'stats.new7d', money: false, sum: true },
  { key: 'medianWageAnnual', label: 'stats.medWage', money: true, sum: false },
  { key: 'medianSalaryAnnual', label: 'stats.medSalary', money: true, sum: false },
  { key: 'namedJobs', label: 'stats.named', money: false, sum: true },
  { key: 'aipJobs', label: 'stats.aip', money: false, sum: true },
] as const
type MetricKey = (typeof METRICS)[number]['key']

const asc = (a: Item, b: Item) => a.value - b.value // 横向条形:数组升序 = 最大条在最上

// 维度=省:broad=cat('all'=全部职业)的 10 省行(mid='all' 守卫:行集已含中类行,别错配)
function byProv(rows: StatRow[], metric: MetricKey, cat: string): Item[] {
  return PROVS
    .map((p) => ({ name: p, full: PROV_NAME[p] || p, key: p, value: rows.find((r) => r.province === p && r.broad === cat && r.mid === 'all')?.[metric] ?? null }))
    .filter((i): i is Item => i.value != null)
    .sort(asc)
}

// 维度=大类:某省 filter;全部省=计数求和(中位类由调用侧挡在 medianBlocked)
function byCat(rows: StatRow[], metric: MetricKey, prov: string, label: (b: string) => string): Item[] {
  return BROAD_SLUGS
    .map(([, broad]) => {
      const rs = rows.filter((r) => r.broad === broad && r.mid === 'all' && (prov === 'all' || r.province === prov))
      const vals = rs.map((r) => r[metric]).filter((v): v is number => v != null)
      const value = !vals.length ? null : prov === 'all' ? vals.reduce((a, b) => a + b, 0) : vals[0]
      return { name: label(broad), full: label(broad), key: broad, value }
    })
    .filter((i): i is Item => i.value != null)
    .sort(asc)
}

// NOC 中类显示翻译(同 JobsTable catName:cat.* 缺键退 broad.* 再退原值;不从 JobsTable 导入避免拖整模块进 stats 包)
const midName = (t: TFn, v: string) => { for (const k of ['cat.' + v, 'broad.' + v]) { const s = t(k); if (s !== k) return s } return v }

// 维度=中类:单省×单大类的中类行(L2;单省内不触碰跨省中位合并红线)
function byMid(rows: StatRow[], metric: MetricKey, prov: string, broad: string, t: TFn): Item[] {
  return rows
    .filter((r) => r.province === prov && r.broad === broad && r.mid !== 'all')
    .map((r) => ({ name: midName(t, r.mid), full: midName(t, r.mid), key: r.mid, value: r[metric] as number | null }))
    .filter((i): i is Item => i.value != null)
    .sort(asc)
}

const selS: React.CSSProperties = { padding: '5px 8px', fontSize: 12.5, border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', color: '#374151' }
const cardS: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 14px' }
const h2S: React.CSSProperties = { fontSize: 15.5, margin: '18px 0 8px' }

const chartH = (n: number) => n * 26 + 40

// 预设图卡:三级下钻+面包屑(#57 两级;2026-07-19 Frank 拍板加中类层 L2「统计=选行业选地区的概率指导」)——
// L0 全景;L1 省图→该省按大类 / 大类图→该类按省;L2 = 单省×单大类按 NOC 中类;L3 = 小类(仅 openJobs)。
// 2026-07-25 Frank 拍板:点条形一律不跳职位板 —— 末级点条无动作,图表只做统计浏览。
// 面包屑「全部 › ON › 服务」任意段上卷。中位类全程单省,不触碰跨省合并红线。
function DrillCard({ rows, t, title, kind, metric, money, broadLabel }: {
  rows: StatRow[]; t: TFn; title: string; kind: 'prov' | 'cat'; metric: MetricKey; money: boolean; broadLabel: (b: string) => string
}) {
  const [path, setPath] = useState<Item[]>([])  // []=L0;[a]=L1;[a,b]=L2;[a,b,mid]=L3(批A,#127 小类层,仅 openJobs)
  const provBroad = (): { prov: string; broad: string } => (
    kind === 'prov' ? { prov: path[0]?.key ?? '', broad: path[1]?.key ?? '' } : { prov: path[1]?.key ?? '', broad: path[0]?.key ?? '' })
  // #127(批A)L3:小类不进 stats 表 —— 单省×大类×中类现查 /api/statsfine(count by fine),null=加载中
  const [fineItems, setFineItems] = useState<Item[] | null>(null)
  useEffect(() => {
    if (path.length !== 3) { setFineItems(null); return }
    const { prov, broad } = provBroad()
    const ctrl = new AbortController()
    fetch(`/api/statsfine?prov=${prov}&broad=${encodeURIComponent(broad)}&mid=${encodeURIComponent(path[2].key)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) { setFineItems([]); return }
        setFineItems((d.rows as { fine: string; n: number }[])
          .map((r) => ({ name: midName(t, r.fine), full: midName(t, r.fine), key: r.fine, value: r.n }))
          .sort(asc))
      })
      .catch(() => { if (!ctrl.signal.aborted) setFineItems([]) })
    return () => ctrl.abort()
  }, [path]) // eslint-disable-line react-hooks/exhaustive-deps
  const items = useMemo(() => {
    const sum = METRICS.find((x) => x.key === metric)?.sum ?? false
    if (!path.length) return kind === 'prov' ? byProv(rows, metric, 'all') : byCat(rows, metric, 'all', broadLabel)
    if (path.length === 1) return capItems(kind === 'prov' ? byCat(rows, metric, path[0].key, broadLabel) : byProv(rows, metric, path[0].key), sum, t)
    if (path.length === 3) return capItems(fineItems ?? [], true, t)
    const { prov, broad } = provBroad()
    return capItems(byMid(rows, metric, prov, broad, t), sum, t)
  }, [rows, metric, kind, path, fineItems]) // eslint-disable-line react-hooks/exhaustive-deps
  // 末级=没有更深层可钻:L3;或 L2 非 openJobs(中位类小类级无数据)。末级不挂点击回调(也不给 pointer 光标)
  const terminal = path.length === 3 || (path.length === 2 && metric !== 'openJobs')
  return (
    <div style={cardS}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{title}</div>
        {path.length ? (
          <span style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>
            <button onClick={() => setPath([])} style={{ border: 'none', background: 'none', padding: 0, fontSize: 12, color: '#2563eb', cursor: 'pointer' }}>{t('chart.all')}</button>
            {path.map((seg, i) => (
              <span key={seg.key}>
                {' › '}
                {i < path.length - 1
                  ? <button onClick={() => setPath(path.slice(0, i + 1))} style={{ border: 'none', background: 'none', padding: 0, fontSize: 12, color: '#2563eb', cursor: 'pointer' }}>{seg.full}</button>
                  : <span style={{ color: '#374151', fontWeight: 600 }}>{seg.full}</span>}
              </span>
            ))}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: '#d1d5db', whiteSpace: 'nowrap' }}>{t('chart.drillHint')}</span>
        )}
      </div>
      {path.length === 3 && fineItems === null
        ? <p style={{ margin: '10px 0', fontSize: 13, color: '#9ca3af' }}>{t('chart.loading')}</p>
        : items.length
        ? <EChart option={barOption(items, money)} height={chartH(items.length)}
            onBarClick={terminal ? undefined : (i) => {
              const it = items[i]; if (!it || it.key === OTHER_KEY) return   // 「其他」归并条不可下钻
              if (path.length === 1) {  // L1→L2 前探一眼:该桶无中类行(列未落地/数据缺)→ 到底,点条无动作
                const pb = kind === 'prov' ? { prov: path[0].key, broad: it.key } : { prov: it.key, broad: path[0].key }
                if (!byMid(rows, metric, pb.prov, pb.broad, t).length) return
              }
              track('stats-drill', { depth: path.length + 1 })   // #129
              setPath([...path, it])
            }} />
        : <p style={{ margin: '10px 0', fontSize: 13, color: '#9ca3af' }}>—</p>}
    </div>
  )
}

// ── /api/market-stats 客户端拉取(SSR 瘦身,手法照 /jobs 的 /api/dims):主图四份数据与用户无关、
// mart 日更,不该 SSR 直出(occ ~3400 行占 /start HTML 大头)。null=加载中(调用侧渲占位高度防 CLS);
// 失败/缺表回空数组 → 调用侧整节不渲(红线:查不到不出空壳)。/start 与 /stats 首页同吃这一个端点。
export type MarketData = { occ: OccRow[]; city: CityRow[]; rows: StatRow[]; channels: { pnp: string[]; ee: string[] } }
export function useMarketStats(): MarketData | null {
  const [d, setD] = useState<MarketData | null>(null)
  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/api/market-stats', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setD({ occ: j?.occ ?? [], city: j?.city ?? [], rows: j?.rows ?? [], channels: j?.channels ?? { pnp: [], ee: [] } }))
      .catch(() => { if (!ctrl.signal.aborted) setD({ occ: [], city: [], rows: [], channels: { pnp: [], ee: [] } }) })
    return () => ctrl.abort()
  }, [])
  return d
}

// ── E8-14 统计主图:一张图回答「在招的是什么工作、在哪、值多少钱」──────────────────
// Frank 拍板「这个大图要做全,作为页面最主要的统计图之一」。
// 横轴三切换(职业 / 省份 / 城市)× 簇内四选 × 右轴叠中位年薪。
// **全用 echarts 原生**(Frank「不要自己实现」):簇状柱=多 series 共 xAxis;缩放=dataZoom;不手搓柱子与滑块。
const MC_PAL = ['#2563eb', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#ec4899', '#6366f1', '#94a3b8']

export function MarketChart({ occ, city, rows, t, lang = 'zh', channels, firstScreen = 12 }: { occ: OccRow[]; city: CityRow[]; rows: StatRow[]; t: TFn; lang?: string; channels?: { pnp: string[]; ee: string[] }; firstScreen?: number }) {
  // firstScreen=横轴职业时首屏露几个职业(dataZoom 初窗)。Top N 选择器 2026-07-31 Frank「这个 top 去掉」撤:
  // 排行职责移交 landing 职位榜「最多」tab,主图回归完整分布(缩放窗仍在,拉 dataZoom 看全)
  const [xKey, setXKey] = useState<'occ' | 'prov' | 'city'>('occ')
  const [grp, setGrp] = useState<'none' | 'prov' | 'broad' | 'teer'>('prov')
  // 右轴三档(2026-07-28 数据地基落地后):
  //   wage   = ESDC 官方中位年薪 —— **权威基线**,不随我们抓到多少帖子漂,规划类结论只能站在它上面
  //   posted = 帖面中位(本站折算) —— 当下行情;**样本 < MIN_N 的点留空**(1 个帖的「中位」不是中位)
  const [y2, setY2] = useState<'wage' | 'posted' | 'off'>('wage')
  const showMed = y2 !== 'off'
  const medName = y2 === 'wage' ? t('stats.medWage') : t('stats.medSalary')   // 右轴那条线的名字随档走
  // 排序(Frank 2026-07-28「加上排序按钮」):按岗位数 / 按中位年薪,各含高低两向;空值恒排最后
  const [sortBy, setSortBy] = useState<'jobs' | 'med'>('jobs')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  // 搜索 + 通道筛选(Frank 2026-07-28:「加一些搜索和过滤条件」「哪些能走 ee pnp aip qc 的单独通道也需要筛选」)。
  // 通道只放**职业粒度判得了**的两条:省提名具名清单、联邦 EE 类别。AIP 是雇主级、QC 数据层没清单 —— 不假装能筛。
  const [q, setQ] = useState('')
  const [chan, setChan] = useState<'all' | 'pnp' | 'ee'>('all')
  // 最低在招岗数(Frank 2026-07-28 点「从低到高」实拍:最前面全是只有 1 个岗的职业,柱子齐刷刷是 1)。
  // 1 个岗的职业进「分布图」没有意义 —— 默认 5,想看全部把它调回 1。
  const [minJobs, setMinJobs] = useState(5)
  // 职业分类三级(Frank 2026-07-28:「过滤需要加 职业 大类 种类 小类吧」)——大→中→小逐级收窄,
  // 选项从**当前数据**里长出来(不写死清单):选了大类,中类只列该大类下有职业的;小类同理。
  const [fBroad, setFBroad] = useState('')
  const [fMid, setFMid] = useState('')
  const [fFine, setFFine] = useState('')
  const natlAll = useMemo(() => occ.filter((o) => o.province === 'all'), [occ])
  const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort()
  const broads = useMemo(() => uniq(natlAll.map((o) => o.broad)), [natlAll])
  const mids = useMemo(() => uniq(natlAll.filter((o) => !fBroad || o.broad === fBroad).map((o) => o.mid)), [natlAll, fBroad])
  const fines = useMemo(() => uniq(natlAll.filter((o) => (!fBroad || o.broad === fBroad) && (!fMid || o.mid === fMid)).map((o) => o.fine)), [natlAll, fBroad, fMid])
  const [more, setMore] = useState(false)          // 更多筛选折叠(与职位板 #59 同款)
  const pnpSet = useMemo(() => new Set(channels?.pnp || []), [channels])
  const eeSet = useMemo(() => new Set(channels?.ee || []), [channels])
  // 职业名按界面语言取(Frank 实拍:韩文界面轴上全是中文)。中文=本站短名,英文=NOC 官方名,
  // 韩文=noc_descriptions 的译名,缺则回退官方英文 —— 不拿中文名冒充国际化。
  const occName = (o: OccRow) => (lang === 'zh' ? (o.titleZhShort || o.titleZh || o.titleEn)
    : lang === 'ko' ? (o.titleKo || o.titleEn) : (o.titleEn || o.titleZh))
  // 省名同理走三语键(#58 口径:界面显示全名,两字码只在幕后)
  const provLabel = (p: string) => t('pr.' + p) || PROV_NAME[p] || p

  // 组合合法性:一个职业只对应一个大类与一个 TEER → 横轴=职业时按它们分簇是退化图(每组一根柱);
  // 城市 × 大类需再切一层聚合,数据层没有 → 只给不分组。**宁可禁用,不画退化图。**
  const legal = (k: string) => (xKey === 'occ' ? ['none', 'prov'].includes(k) : xKey === 'city' ? k === 'none' : true)
  const g = legal(grp) ? grp : 'none'

  const opt = useMemo(() => {
    const natl = occ.filter((o) => o.province === 'all')
    let axis: string[] = []
    let series: any[] = []
    let med: (number | null)[] = []
    let provMed: any[] = []   // 分省中位线(只在横轴=职业且簇内=省份时有)
    let cellTitle: ((k: number) => string | null) | null = null   // 分省时:第 k 格属于「职业/省」
    let end = 100
    const bar = (name: string, data: (number | null)[], i: number) =>
      ({ name, type: 'bar', data, itemStyle: { color: MC_PAL[i % MC_PAL.length] } })

    // 帖面中位的最小样本量:统计上中位数至少要几个观测才有意义。实核 489 个职业里
    // 73 个帖面样本 <5(其中 17 个只有 1 个岗)—— 这些点在「帖面」档留空,但官方档照常有数。
    const MIN_N = 5
    const pick = (medWage: number | null | undefined, medPost: number | null | undefined, n: number | null | undefined) =>
      (y2 === 'wage' ? (medWage ?? null) : ((n ?? 0) >= MIN_N ? (medPost ?? null) : null))
    // 排序比较器:空值永远垫底(不管升降),否则「低到高」会被一堆没薪资的职业占满头部
    const by = (v: number | null | undefined, w: number | null | undefined) => {
      if (v == null && w == null) return 0
      if (v == null) return 1
      if (w == null) return -1
      return sortDir === 'desc' ? w - v : v - w
    }

    if (xKey === 'occ') {
      const kw = q.trim().toLowerCase()
      const hit = (o: OccRow) => (!kw || occName(o).toLowerCase().includes(kw) || (o.titleEn || '').toLowerCase().includes(kw) || o.noc.includes(kw))
        && (o.openJobs ?? 0) >= minJobs
        && (!fBroad || o.broad === fBroad) && (!fMid || o.mid === fMid) && (!fFine || o.fine === fFine)
        && (chan === 'all' || (chan === 'pnp' ? pnpSet.has(o.noc) : eeSet.has(o.noc)))
      const ks = [...natl].filter(hit).sort((a, b) => by(sortBy === 'med' ? pick(a.medianWageAnnual, a.medianSalaryAnnual, a.salaryN) : a.openJobs,
        sortBy === 'med' ? pick(b.medianWageAnnual, b.medianSalaryAnnual, b.salaryN) : b.openJobs)).slice(0, 200)
      axis = ks.map(occName)
      med = ks.map((o) => pick(o.medianWageAnnual, o.medianSalaryAnnual, o.salaryN))
      end = Math.min(100, (firstScreen / Math.max(ks.length, 1)) * 100)
      if (g === 'prov') {
        // 分省时岗数与中位年薪**都按省取**(Frank:「每个省的中位薪资还不一样」),
        // 中位连成**一根线穿过每一根柱**(Frank:「簇内的柱子要画薪资线,整个是一根线」)。
        //
        // 关键是**数据形状**,不是画法(Frank:「echart 没有对应的图表,我们直接填数就完事了吗」——对)。
        // 前两版我拿「一个类目=一个职业」的形状,再手算「簇内第 j 根柱」的小数偏移去摆点:
        // 类目轴不做插值 → 点全归到格心叠成竖线;改挂隐藏数值轴后又与 dataZoom 的取窗对不齐 → 跑偏。
        // 定稿改成 **一个类目 = 一根柱**(职业×省,每组末尾插一个空类目当簇间距):
        // 线与柱共用同一根类目轴,对齐是天生的,零偏移计算、零第二轴。
        const byNoc = new Map<string, Map<string, { jobs: number; med: number | null }>>()
        for (const o of occ) {
          if (o.province === 'all') continue
          if (!byNoc.has(o.noc)) byNoc.set(o.noc, new Map())
          byNoc.get(o.noc)!.set(o.province, { jobs: o.openJobs ?? 0, med: pick(o.medianWageAnnual, o.medianSalaryAnnual, o.salaryN) })
        }
        const P = PROVS.length
        const cellOcc: number[] = []          // 每个类目属于第几个职业(-1=簇间距)
        const cellProv: number[] = []         // 每个类目属于第几个省(-1=簇间距)
        axis = []
        ks.forEach((o, oi) => {
          PROVS.forEach((_, pi) => {
            cellOcc.push(oi); cellProv.push(pi)
            axis.push(pi === (P >> 1) ? occName(o) : '')   // 职业名只标在本组中间那格
          })
          cellOcc.push(-1); cellProv.push(-1); axis.push('')
        })
        const val = (k: number, pi: number) => {
          if (cellProv[k] !== pi) return null                 // 每个省只在自己那格有柱
          return byNoc.get(ks[cellOcc[k]].noc)?.get(PROVS[pi])?.jobs ?? 0
        }
        // barGap:'-100%' = 各省系列叠在同一格里 → 每格只有一根柱,占满该格
        series = PROVS.map((p, pi) => ({ ...bar(provLabel(p), axis.map((_, k) => val(k, pi)), pi),
          barGap: '-100%', barCategoryGap: '12%' }))
        med = axis.map((_, k) => (cellProv[k] < 0 ? null
          : byNoc.get(ks[cellOcc[k]].noc)?.get(PROVS[cellProv[k]])?.med ?? null))
        // 簇间距那格没数 → connectNulls 让线跨过去,全图仍是连续一根
        provMed = [{ name: medName, type: 'line', yAxisIndex: 1, data: med, symbol: 'circle',
          symbolSize: 3, connectNulls: true, z: 6, lineStyle: { width: 1.4, color: '#111827' },
          itemStyle: { color: '#111827' } }]
        cellTitle = (k: number) => (cellProv[k] < 0 ? null : `${occName(ks[cellOcc[k]])}　${provLabel(PROVS[cellProv[k]])}`)
        end = Math.min(100, (firstScreen * (P + 1) / Math.max(axis.length, 1)) * 100)   // 首屏约 firstScreen 个职业
      } else series = [bar(t('stats.openJobs'), ks.map((o) => o.openJobs), 0)]
    } else if (xKey === 'prov') {
      const cell = (p: string, b: string) => rows.find((r) => r.province === p && r.broad === b && r.mid === 'all')
      const ps = [...PROVS].sort((a, b) => by(sortBy === 'med' ? cell(a, 'all')?.medianSalaryAnnual : cell(a, 'all')?.openJobs,
        sortBy === 'med' ? cell(b, 'all')?.medianSalaryAnnual : cell(b, 'all')?.openJobs))
      axis = ps.map(provLabel)
      med = ps.map((p) => pick(cell(p, 'all')?.medianWageAnnual, cell(p, 'all')?.medianSalaryAnnual, cell(p, 'all')?.openJobs))
      if (g === 'broad') {
        // BROAD_SLUGS 是 [中文名, slug] 对,不是纯字符串数组 —— 取 slug 那一项
        const cats = BROAD_SLUGS.map((x) => (Array.isArray(x) ? x[1] : x)).filter((b) => b && b !== 'all')
        series = cats.map((b, i) => bar(t('broad.' + b), ps.map((p) => cell(p, b)?.openJobs ?? 0), i))
      } else series = [bar(t('stats.openJobs'), ps.map((p) => cell(p, 'all')?.openJobs ?? 0), 0)]
    } else {
      const kwc = q.trim().toLowerCase()
      const cs = [...city].filter((c) => (c.openJobs ?? 0) >= minJobs).filter((c) => !kwc || c.city.toLowerCase().includes(kwc)
        || (c.cityZh || '').includes(q.trim()) || (c.cityKo || '').includes(q.trim())).sort((a, b) => by(sortBy === 'med' ? pick(a.medianWageAnnual, a.medianSalaryAnnual, a.salaryN) : a.openJobs,
        sortBy === 'med' ? pick(b.medianWageAnnual, b.medianSalaryAnnual, b.salaryN) : b.openJobs)).slice(0, 200)
      axis = cs.map((c) => (lang === 'zh' ? (c.cityZh || c.city) : lang === 'ko' ? (c.cityKo || c.city) : c.city))
      med = cs.map((c) => pick(c.medianWageAnnual, c.medianSalaryAnnual, c.salaryN))
      end = Math.min(100, (14 / Math.max(cs.length, 1)) * 100)
      series = [bar(t('stats.openJobs'), cs.map((c) => c.openJobs), 0)]
    }

    const multi = series.length > 1
    // 可见类目数 → 每格宽度 → 标签折行宽(留 4px 间隙);窄屏与宽屏都按实际容器算
    const vw = typeof window !== 'undefined' ? Math.min(window.innerWidth - 80, 1200) : 1100
    // 分省时一个职业占 (省数+1) 个类目(末尾那格是簇间距) → 标签宽按**组**算,不按格算
    const span = provMed.length ? PROVS.length + 1 : 1
    const mid = PROVS.length >> 1
    const visible = Math.max(1, Math.round(axis.length * (end / 100) / span))
    // 标签盒宽要**比格距窄一截**(留 14px 沟):等宽时相邻盒子边缘相接,echarts 判为重叠 →
    // 上一版我为救「只剩一个名字」把 hideOverlap 整个关了,结果缩放到多组时全撞一起(Frank 实拍)。
    // 正解=留沟 + hideOverlap 照常开:挤得下就全显,挤不下自动隐,放大即回。
    const labelW = Math.max(30, Math.floor(vw / visible) - 14)
    return {
      // 分省时同一个省有柱也有线 → tooltip 合成一行「省名 岗数 中位年薪」,不铺成 20 行
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true, textStyle: { fontSize: 12 },
        formatter: !provMed.length ? undefined : (ps: any[]) => {
          const b0 = ps.find((q: any) => q.seriesType === 'bar' && q.value != null)
          const ln = ps.find((q: any) => q.seriesType === 'line')
          const k = (b0 ?? ln)?.dataIndex ?? 0
          const head = cellTitle?.(k)
          if (!head) return ''
          const jobs = b0 ? `${t('stats.openJobs')}　${b0.value}` : ''
          const m = ln?.value
          return `<b>${head}</b><br/>${jobs}${m != null ? `<br/>${medName}　$${Math.round(m / 1000)}K` : ''}`
        } },
      legend: { show: multi, type: 'scroll', bottom: 36, itemWidth: 11, itemHeight: 11, textStyle: { fontSize: 11.5, color: '#6b7280' } },
      grid: { left: 8, right: showMed ? 8 : 4, top: 12, bottom: multi ? 62 : 40, containLabel: true },
      // 轴标签**往下折行显示全名**(Frank 2026-07-28:「名字可以往下扩展,显示完整,因为有很多空间」)。
      // 原来横排斜切 7 个字 —— 中文短名勉强,英文直接成了「Transpo…」「Food co…」(他实拍),
      // 而英文用户是主要人群。改:不斜排、按可见宽度自动折行(echarts 原生 overflow:'break'),
      // 底部留出三行的高度;实在挤不下的由 hideOverlap 隐掉,拉 dataZoom 放大就全出来。
      xAxis: [{ type: 'category', data: axis, axisTick: { show: false }, axisLine: { lineStyle: { color: '#e5e7eb' } },
        // 折行/截断/留白全走 echarts 原生(Frank:「echart 本身就有这个功能」):
        // overflow:'break' 折行、height+lineOverflow:'truncate' 封顶三行、grid.containLabel 自动留边距
        // interval 回调:分省时只在每组中间那格出标签,其余格**根本不渲染**(不是渲染空串);
        // 空串会占满 width 的盒子 → 与相邻盒子相交 → hideOverlap 连真名字一起隐掉(2026-07-28 两次实拍教训)。
        axisLabel: { fontSize: 10.5, color: '#6b7280', rotate: 0, hideOverlap: true,
          interval: provMed.length ? ((idx: number) => idx % span === mid) : 0,
          width: labelW, overflow: 'break', height: 38, lineOverflow: 'truncate', lineHeight: 12.5, margin: 10 } }],
      // 双轴:左=岗数(柱)、右=中位年薪(线)。量纲差两个数量级,同轴会把薪资线压成一条平线
      yAxis: [
        // 岗位数是整数:minInterval 1(Frank 实拍「0.2 个岗位」——排到只有 1 个岗的职业时轴自动切小数)
        { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { fontSize: 11, color: '#9ca3af' } },
        { type: 'value', show: showMed, splitLine: { show: false },
          axisLabel: { fontSize: 11, color: '#9ca3af', formatter: (v: number) => '$' + Math.round(v / 1000) + 'K' } },
      ],
      dataZoom: [{ type: 'inside', start: 0, end }, { type: 'slider', start: 0, end, height: 18, bottom: 8,
        borderColor: 'transparent', backgroundColor: '#f3f4f6', fillerColor: 'rgba(37,99,235,.12)',
        handleStyle: { color: '#2563eb' }, textStyle: { fontSize: 10, color: '#9ca3af' } }],
      series: !showMed ? series
        : provMed.length ? series.concat(provMed)
          : series.concat([{ name: medName, type: 'line', yAxisIndex: 1, data: med,
            symbol: 'circle', symbolSize: 5, connectNulls: true, z: 5,
            lineStyle: { width: 2, color: '#111827' }, itemStyle: { color: '#111827' } }]),
    }
  }, [occ, city, rows, xKey, g, y2, showMed, medName, sortBy, sortDir, q, chan, minJobs, fBroad, fMid, fFine, pnpSet, eeSet, lang, t])

  if (!occ.length && !city.length) return null   // 数据层没落地 → 整块不渲(不出空壳)

  const chip = (on: boolean, dis?: boolean): React.CSSProperties => ({
    fontSize: 12.5, padding: '4px 10px', borderRadius: 999, cursor: dis ? 'not-allowed' : 'pointer',
    border: `1px solid ${on ? '#bfdbfe' : '#e5e7eb'}`, background: on ? '#eff6ff' : '#fff',
    color: on ? '#1d4ed8' : '#374151', fontWeight: on ? 600 : 400, opacity: dis ? 0.4 : 1,
  })
  const selS: React.CSSProperties = { height: 32, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', fontSize: 12.5, padding: '0 8px' }
  const ctlLb: React.CSSProperties = { fontSize: 11.5, color: '#9ca3af' }
  const Ctl = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', margin: '8px 0 0' }}>
      <span style={{ fontSize: 12, color: '#6b7280', minWidth: 30 }}>{label}</span>{children}
    </div>
  )

  return (
    <div style={cardS}>
      {/* 控件区重设计(Frank 2026-07-28:「这个地方是不是需要重新设计一下,并且加一些搜索和过滤条件」):
          四行药丸 → **常用一行 + 更多筛选折叠**,与职位板筛选区同一套语言(#59 拍板的形态)。
          原生 select 不用药丸:四组都是单选,药丸横铺白占竖向空间(效果图 Frank 过目后实施)。 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', margin: '8px 0 0' }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('mkt.search')}
          style={{ height: 32, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 10px', fontSize: 12.5, width: 190 }} />
        <span style={ctlLb}>{t('mkt.x')}</span>
        <select value={xKey} onChange={(e) => setXKey(e.target.value as 'occ' | 'prov' | 'city')} style={selS}>
          <option value="occ">{t('mkt.x.occ')}</option><option value="prov">{t('mkt.x.prov')}</option><option value="city">{t('mkt.x.city')}</option>
        </select>
        <span style={ctlLb}>{t('mkt.g')}</span>
        <select value={g} onChange={(e) => setGrp(e.target.value as 'none' | 'prov' | 'broad' | 'teer')} style={selS}>
          {([['none', t('mkt.g.none')], ['prov', t('mkt.g.prov')], ['broad', t('mkt.g.broad')], ['teer', 'TEER']] as const).map(([k, lb]) => (
            <option key={k} value={k} disabled={!legal(k)}>{lb}</option>   /* 退化组合仍然置灰,不画退化图 */
          ))}
        </select>
        <span style={ctlLb}>{t('mkt.sort')}</span>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'jobs' | 'med')} style={selS}>
          <option value="jobs">{t('stats.openJobs')}</option><option value="med">{medName}</option>
        </select>
        <span style={{ display: 'inline-flex', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', height: 32 }}>
          {([['desc', t('mkt.sort.desc')], ['asc', t('mkt.sort.asc')]] as const).map(([k, lb]) => (
            <button key={k} onClick={() => setSortDir(k as 'desc' | 'asc')}
              style={{ border: 'none', padding: '0 10px', fontSize: 12.5, cursor: 'pointer',
                background: sortDir === k ? '#eff6ff' : '#fff', color: sortDir === k ? '#1d4ed8' : '#374151',
                fontWeight: sortDir === k ? 600 : 400 }}>{lb}</button>
          ))}
        </span>
        <button onClick={() => setMore((v) => !v)} style={{ height: 32, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', fontSize: 12.5, color: '#374151', padding: '0 11px', cursor: 'pointer' }}>
          {t('mkt.more')}{chan !== 'all' || y2 !== 'wage' || minJobs !== 5 || fBroad || fMid || fFine ? <span style={{ display: 'inline-block', background: '#2563eb', color: '#fff', borderRadius: 999, fontSize: 10.5, padding: '0 5px', marginLeft: 5 }}>{(chan !== 'all' ? 1 : 0) + (y2 !== 'wage' ? 1 : 0) + (minJobs !== 5 ? 1 : 0) + (fBroad ? 1 : 0) + (fMid ? 1 : 0) + (fFine ? 1 : 0)}</span> : null}
        </button>
      </div>
      {more && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e5e7eb' }}>
          <span style={ctlLb}>{t('mkt.chan')}</span>
          <select value={chan} onChange={(e) => setChan(e.target.value as 'all' | 'pnp' | 'ee')} style={selS} disabled={xKey !== 'occ'}>
            <option value="all">{t('mkt.chan.all')}</option>
            <option value="pnp">{t('mkt.chan.pnp')}</option>
            <option value="ee">{t('mkt.chan.ee')}</option>
          </select>
          <span style={ctlLb}>{t('mkt.y2')}</span>
          <select value={y2} onChange={(e) => setY2(e.target.value as 'wage' | 'posted' | 'off')} style={selS}>
            <option value="wage">{t('stats.medWage')}</option>
            <option value="posted">{t('stats.medSalary')}</option>
            <option value="off">{t('mkt.y2.off')}</option>
          </select>
          <span style={ctlLb}>{t('mkt.broad')}</span>
          <select value={fBroad} onChange={(e) => { setFBroad(e.target.value); setFMid(''); setFFine('') }} style={selS} disabled={xKey !== 'occ'}>
            <option value="">{t('mkt.cat.all')}</option>
            {broads.map((b) => <option key={b} value={b}>{t('broad.' + b) || b}</option>)}
          </select>
          <span style={ctlLb}>{t('mkt.mid')}</span>
          <select value={fMid} onChange={(e) => { setFMid(e.target.value); setFFine('') }} style={selS} disabled={xKey !== 'occ'}>
            <option value="">{t('mkt.cat.all')}</option>
            {mids.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <span style={ctlLb}>{t('mkt.fine')}</span>
          <select value={fFine} onChange={(e) => setFFine(e.target.value)} style={selS} disabled={xKey !== 'occ'}>
            <option value="">{t('mkt.cat.all')}</option>
            {fines.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <span style={ctlLb}>{t('mkt.minJobs')}</span>
          <select value={minJobs} onChange={(e) => setMinJobs(Number(e.target.value))} style={selS}>
            {[1, 5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          {xKey !== 'occ' ? <span style={{ fontSize: 11.5, color: '#9ca3af' }}>{t('mkt.chan.occOnly')}</span> : null}
        </div>
      )}
      <EChart option={opt} height={420} />
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, lineHeight: 1.6 }}>{t('mkt.note')}</div>
    </div>
  )
}

export function StatsCharts({ rows, t }: { rows: StatRow[]; t: TFn }) {
  const broadLabel = (b: string) => t('broad.' + b)

  const presets = useMemo(() => [
    { title: `${t('stats.openJobs')}(${t('chart.dimProv')})`, kind: 'prov' as const, metric: 'openJobs' as const, money: false },
    { title: `${t('stats.medWage')}(${t('chart.dimProv')})`, kind: 'prov' as const, metric: 'medianWageAnnual' as const, money: true },
    { title: `${t('stats.named')}(${t('chart.dimProv')})`, kind: 'prov' as const, metric: 'namedJobs' as const, money: false },
    { title: `${t('stats.openJobs')}(${t('chart.dimCat')})`, kind: 'cat' as const, metric: 'openJobs' as const, money: false },
  ], [t])

  const [dim, setDim] = useState<'prov' | 'cat'>('prov')
  const [metric, setMetric] = useState<MetricKey>('openJobs')
  const [fixCat, setFixCat] = useState('all')   // 维度=省 时锁某大类
  const [fixProv, setFixProv] = useState('all') // 维度=大类 时锁某省
  const m = METRICS.find((x) => x.key === metric)!
  const medianBlocked = dim === 'cat' && fixProv === 'all' && !m.sum // 红线:中位数不跨省合并
  const custom = useMemo(
    () => (dim === 'prov' ? byProv(rows, metric, fixCat) : byCat(rows, metric, fixProv, broadLabel)),
    [rows, dim, metric, fixCat, fixProv, t], // eslint-disable-line react-hooks/exhaustive-deps
  )

  return (
    <>
      <h2 style={h2S}>{t('chart.common')}</h2>
      {/* #60:min 420px 的 auto-fit 让 4 卡在 1100px 容器内恒为 2×2 等宽(300px auto-fill 会落成 3+1,
          第二行两格空白=用户指的「中间和右边大量空白」);窄屏自然单列,min(100%,·) 防超窄溢出 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 12 }}>
        {presets.map((p) => (
          <DrillCard key={p.title} rows={rows} t={t} title={p.title} kind={p.kind} metric={p.metric} money={p.money} broadLabel={broadLabel} />
        ))}
      </div>

      <h2 style={h2S}>{t('chart.custom')}</h2>
      <div style={cardS}>
        <div className="stCtl" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 12.5, color: '#6b7280', marginBottom: 8 }}>
          <label>{t('chart.dim')}{' '}
            <select style={selS} value={dim} onChange={(e) => setDim(e.target.value as 'prov' | 'cat')}>
              <option value="prov">{t('chart.dimProv')}</option>
              <option value="cat">{t('chart.dimCat')}</option>
            </select>
          </label>
          <label>{t('chart.metric')}{' '}
            <select style={selS} value={metric} onChange={(e) => setMetric(e.target.value as MetricKey)}>
              {METRICS.map((x) => <option key={x.key} value={x.key}>{t(x.label)}</option>)}
            </select>
          </label>
          {dim === 'prov' ? (
            <label>{t('filter.cat')}{' '}
              <select style={selS} value={fixCat} onChange={(e) => setFixCat(e.target.value)}>
                <option value="all">{t('chart.all')}</option>
                {BROAD_SLUGS.map(([slug, broad]) => <option key={slug} value={broad}>{broadLabel(broad)}</option>)}
              </select>
            </label>
          ) : (
            <label>{t('col.province')}{' '}
              <select style={selS} value={fixProv} onChange={(e) => setFixProv(e.target.value)}>
                <option value="all">{t('chart.all')}</option>
                {PROVS.map((p) => <option key={p} value={p}>{PROV_NAME[p] || p}</option>)}
              </select>
            </label>
          )}
          <span style={{ fontSize: 11, color: '#d1d5db', whiteSpace: 'nowrap' }}>{t('chart.drillHint')}</span>
        </div>
        {medianBlocked
          ? <p style={{ margin: '10px 0', fontSize: 13, color: '#9ca3af' }}>{t('chart.medianNote')}</p>
          : custom.length
            ? <EChart option={barOption(custom, m.money)} height={chartH(custom.length)}
                onBarClick={(i) => {  // 自定义图下钻=切维度联动:点省→该省按大类;点大类→该大类按省(选择器即上卷)
                  const it = custom[i]; if (!it) return
                  if (dim === 'prov') { setDim('cat'); setFixProv(it.key) }
                  else { setDim('prov'); setFixCat(it.key) }
                }} />
            : <p style={{ margin: '10px 0', fontSize: 13, color: '#9ca3af' }}>—</p>}
      </div>
    </>
  )
}
