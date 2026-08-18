'use client'
// 统计图表(E8-06):EChart 薄壳(echarts 动态 import 懒加载——展开图才拉,首屏不背体积)+ 统计主图 MarketChart。
// E13-03(2026-08-06):按省/按大类的预设四图与自定义区(StatsCharts)随 /stats 索引页退役一并删 ——
// 主图折进把脉首页 S4(默认收起)。红线不变:计数类可跨省求和,中位数不做跨省合并。
import { useEffect, useMemo, useRef, useState } from 'react'
import { BROAD_SLUGS, PROVS, PROV_NAME, type StatRow, type OccRow, type CityRow } from './shared'
import type { TFn } from '@/lib/i18n'

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
      // 铁律「不能点就不要 hover 和小手」(Frank 2026-07-31):echarts 系列默认 cursor:pointer,
      // 没挂 onBarClick 的图(landing 主图、末级下钻)柱子悬停会出小手但点了没反应 → 集中归 default
      const opt = clickRef.current ? option : { ...option, series: ((option as any).series ?? []).map((s: any) => ({ ...s, cursor: 'default' })) }
      inst.current.setOption(opt, true)
      inst.current.resize()
    })
    const onResize = () => inst.current?.resize()
    window.addEventListener('resize', onResize)
    return () => { alive = false; window.removeEventListener('resize', onResize) }
  }, [option, height])
  useEffect(() => () => { inst.current?.dispose(); inst.current = null }, [])
  return <div ref={ref} style={{ width: '100%', height, cursor: onBarClick ? 'pointer' : undefined, overflow: 'hidden' }} />
}

// 主图卡壳(MarketChart 用;原「预设四图/自定义区」那套 DrillCard 与 byProv/byCat/byMid/barOption
// 随 /stats 索引页 2026-08-06 退役一并删,不留死代码)

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
  // 全屏态:fs 跟着浏览器的 fullscreenchange 走(用户按 ESC / 返回手势退出时也要还原图高)
  const fsRef = useRef<HTMLDivElement | null>(null)
  const [fs, setFs] = useState(false)
  const [vh, setVh] = useState(420)
  useEffect(() => {
    const onFs = () => {
      const on = document.fullscreenElement === fsRef.current
      setFs(on)
      setVh(window.innerHeight)
    }
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])
  const toggleFs = () => {
    const el = fsRef.current
    if (!el) return
    // 退出:先解锁朝向再退全屏(顺序反了 unlock 会因为已不在全屏而报错)
    if (document.fullscreenElement) {
      try { (screen.orientation as unknown as { unlock?: () => void })?.unlock?.() } catch { /* 不支持 */ }
      document.exitFullscreen?.()
      return
    }
    // iOS Safari 不支持元素全屏(只有 video)——调不动就静默留在页面里,不弹错误
    el.requestFullscreen?.()
      // 全屏后自动转横屏(Frank 2026-08-02:「变成横屏的全屏」)。
      // 只有全屏态下才允许 lock;Android Chrome 生效,iOS Safari 没有 orientation.lock —— 失败就留竖屏,用户自己转手机
      .then(() => {
        const o = screen.orientation as unknown as { lock?: (t: string) => Promise<void> } | undefined
        return o?.lock?.('landscape')?.catch(() => { /* 不支持就算了 */ })
      })
      .catch(() => { /* 不支持就算了 */ })
  }
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
    <div className="card" style={{ padding: '12px 14px' }}>
      {/* 控件区重设计(Frank 2026-07-28:「这个地方是不是需要重新设计一下,并且加一些搜索和过滤条件」):
          四行药丸 → **常用一行 + 更多筛选折叠**,与职位板筛选区同一套语言(#59 拍板的形态)。
          原生 select 不用药丸:四组都是单选,药丸横铺白占竖向空间(效果图 Frank 过目后实施)。 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', margin: '8px 0 0' }}>
        <input className="mktCtl" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('mkt.search')}
          style={{ height: 32, border: '1px solid #e5e7eb', borderRadius: 8, padding: '0 10px', fontSize: 12.5, width: 190 }} />
        <span style={ctlLb}>{t('mkt.x')}</span>
        <select className="mktCtl" value={xKey} onChange={(e) => setXKey(e.target.value as 'occ' | 'prov' | 'city')} style={selS}>
          <option value="occ">{t('mkt.x.occ')}</option><option value="prov">{t('mkt.x.prov')}</option><option value="city">{t('mkt.x.city')}</option>
        </select>
        <span style={ctlLb}>{t('mkt.g')}</span>
        <select className="mktCtl" value={g} onChange={(e) => setGrp(e.target.value as 'none' | 'prov' | 'broad' | 'teer')} style={selS}>
          {([['none', t('mkt.g.none')], ['prov', t('mkt.g.prov')], ['broad', t('mkt.g.broad')], ['teer', 'TEER']] as const).map(([k, lb]) => (
            <option key={k} value={k} disabled={!legal(k)}>{lb}</option>   /* 退化组合仍然置灰,不画退化图 */
          ))}
        </select>
        <span style={ctlLb}>{t('mkt.sort')}</span>
        <select className="mktCtl" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'jobs' | 'med')} style={selS}>
          <option value="jobs">{t('stats.openJobs')}</option><option value="med">{medName}</option>
        </select>
        <span className="mktCtl" style={{ display: 'inline-flex', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', height: 32 }}>
          {([['desc', t('mkt.sort.desc')], ['asc', t('mkt.sort.asc')]] as const).map(([k, lb]) => (
            <button key={k} onClick={() => setSortDir(k as 'desc' | 'asc')}
              style={{ border: 'none', padding: '0 10px', fontSize: 12.5, cursor: 'pointer',
                background: sortDir === k ? '#eff6ff' : '#fff', color: sortDir === k ? '#1d4ed8' : '#374151',
                fontWeight: sortDir === k ? 600 : 400 }}>{lb}</button>
          ))}
        </span>
        <button className="mktCtl" onClick={() => setMore((v) => !v)} style={{ height: 32, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', fontSize: 12.5, color: '#374151', padding: '0 11px', cursor: 'pointer' }}>
          {t('mkt.more')}{chan !== 'all' || y2 !== 'wage' || minJobs !== 5 || fBroad || fMid || fFine ? <span style={{ display: 'inline-block', background: '#2563eb', color: '#fff', borderRadius: 999, fontSize: 10.5, padding: '0 5px', marginLeft: 5 }}>{(chan !== 'all' ? 1 : 0) + (y2 !== 'wage' ? 1 : 0) + (minJobs !== 5 ? 1 : 0) + (fBroad ? 1 : 0) + (fMid ? 1 : 0) + (fFine ? 1 : 0)}</span> : null}
        </button>
      </div>
      {more && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e5e7eb' }}>
          <span style={ctlLb}>{t('mkt.chan')}</span>
          <select className="mktCtl" value={chan} onChange={(e) => setChan(e.target.value as 'all' | 'pnp' | 'ee')} style={selS} disabled={xKey !== 'occ'}>
            <option value="all">{t('mkt.chan.all')}</option>
            <option value="pnp">{t('mkt.chan.pnp')}</option>
            <option value="ee">{t('mkt.chan.ee')}</option>
          </select>
          <span style={ctlLb}>{t('mkt.y2')}</span>
          <select className="mktCtl" value={y2} onChange={(e) => setY2(e.target.value as 'wage' | 'posted' | 'off')} style={selS}>
            <option value="wage">{t('stats.medWage')}</option>
            <option value="posted">{t('stats.medSalary')}</option>
            <option value="off">{t('mkt.y2.off')}</option>
          </select>
          <span style={ctlLb}>{t('mkt.broad')}</span>
          <select className="mktCtl" value={fBroad} onChange={(e) => { setFBroad(e.target.value); setFMid(''); setFFine('') }} style={selS} disabled={xKey !== 'occ'}>
            <option value="">{t('mkt.cat.all')}</option>
            {broads.map((b) => <option key={b} value={b}>{t('broad.' + b) || b}</option>)}
          </select>
          <span style={ctlLb}>{t('mkt.mid')}</span>
          <select className="mktCtl" value={fMid} onChange={(e) => { setFMid(e.target.value); setFFine('') }} style={selS} disabled={xKey !== 'occ'}>
            <option value="">{t('mkt.cat.all')}</option>
            {mids.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <span style={ctlLb}>{t('mkt.fine')}</span>
          <select className="mktCtl" value={fFine} onChange={(e) => setFFine(e.target.value)} style={selS} disabled={xKey !== 'occ'}>
            <option value="">{t('mkt.cat.all')}</option>
            {fines.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <span style={ctlLb}>{t('mkt.minJobs')}</span>
          <select className="mktCtl" value={minJobs} onChange={(e) => setMinJobs(Number(e.target.value))} style={selS}>
            {[1, 5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          {xKey !== 'occ' ? <span style={{ fontSize: 11.5, color: '#9ca3af' }}>{t('mkt.chan.occOnly')}</span> : null}
        </div>
      )}
      {/* 全屏(2026-08-01 Frank 队列⑥「主图手机端加全屏按钮」):375 上图挤成一团,横过来看才读得动。
          走浏览器原生 requestFullscreen —— 退出由 ESC/返回手势管,不自己造关闭态;
          全屏时图撑满视口高度(fs ? '100vh' : 420),退出自动还原。桌面不出这个钮(用不上)。 */}
      <div ref={fsRef} style={{ position: 'relative', background: '#fff' }}>
        <button className="mktFs" onClick={toggleFs}
          style={{ position: 'absolute', top: 6, right: 6, zIndex: 2, border: '1px solid #e5e7eb', borderRadius: 8,
            background: '#fff', color: '#374151', fontSize: 12, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
          {t(fs ? 'mkt.fs.exit' : 'mkt.fs')}
        </button>
        <EChart option={opt} height={fs ? Math.max(320, vh - 24) : 420} />
      </div>
      {/* #300(第 38 轮):全屏钮手机触控靶 ≥44;控件行 .mktCtl 的 44 规则在全局 main.css 640 块(单一来源) */}
      <style>{'@media(min-width:900px){.mktFs{display:none}}@media(max-width:640px){.mktFs{min-height:44px;min-width:44px}}'}</style>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, lineHeight: 1.6 }}>{t('mkt.note')}</div>
    </div>
  )
}
