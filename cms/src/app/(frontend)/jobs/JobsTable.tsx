'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { makeT, LANGS, LANG_KEY, type Lang, type TFn } from './i18n'

export type JobRow = {
  id: string | number
  title: string
  company: string
  source: string
  sourceLabel: string
  origin: string
  country: string
  province: string
  city: string
  district: string
  address: string
  noc: string
  category: string
  teer: number | null
  broad: string
  mid: string
  fine: string
  accessibility: string
  score: number | null
  pnpEligible: boolean
  aip: boolean
  salary: string
  salaryAnnual: number | null
  salaryText: string
  wageMedHourly: number | null
  wageMedAnnual: number | null
  officialUrl: string
  applyUrl: string
  datePosted: string
  lastSeen: string
  status: string
  closedAt: string
}

const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean))).sort()
const accLabel: Record<string, string> = {
  'co-op': 'co-op', junior: '初级', intermediate: '中级', senior: '高级', unknown: '—',
}
// 大分类颜色(仅显示)。分类名/层级(broad/mid/fine/teer)由 ETL(etl/noc.py→mart)算好
// 存在 job 字段上,前端不再用 NOC 现算 —— 单一来源在数据层。
type Cat = { bg: string; fg: string }
const NA: Cat = { bg: '#fafafa', fg: '#9ca3af' }
const BROAD_COLOR: Record<string, Cat> = {
  管理: { bg: '#dbeafe', fg: '#1e40af' }, 商务: { bg: '#e0e7ff', fg: '#3730a3' },
  科技: { bg: '#cffafe', fg: '#155e75' }, 医疗: { bg: '#dcfce7', fg: '#166534' },
  教育: { bg: '#fae8ff', fg: '#86198f' }, 文体: { bg: '#fce7f3', fg: '#9d174d' },
  服务: { bg: '#fef9c3', fg: '#854d0e' }, 技工: { bg: '#ffedd5', fg: '#9a3412' },
  资源: { bg: '#ecfccb', fg: '#3f6212' }, 制造: { bg: '#f3f4f6', fg: '#374151' },
}
const colorOf = (broad?: string): Cat => (broad && BROAD_COLOR[broad]) || NA

// 薪资归一已下沉到数据层(etl/04d_clean_salary.py → salaryAnnual/salaryText);前端只读不算。
// 各列排序取值:数值列返回 number,文本列返回 string,缺值返回 null(排末尾)
const sortVal = (j: JobRow, key: ColKey): number | string | null => {
  switch (key) {
    case 'score': return j.score
    case 'salary': case 'salaryYr': return j.salaryAnnual
    case 'wageMedHr': return j.wageMedHourly
    case 'wageMedYr': return j.wageMedAnnual
    case 'vsMedian': return (j.salaryAnnual != null && j.wageMedAnnual) ? j.salaryAnnual / j.wageMedAnnual : null
    case 'direct': return isDirect(j) ? 1 : 0
    case 'pnp': return j.pnpEligible ? 1 : 0
    case 'aip': return j.aip ? 1 : 0
    case 'address': return j.address || null
    case 'teer': return j.teer
    case 'datePosted': return j.datePosted || null
    case 'lastSeen': return j.lastSeen || null
    case 'broad': return j.broad && j.broad !== '未分类' ? j.broad : null
    case 'mid': return j.mid && j.mid !== '未分类' ? j.mid : null
    case 'fine': return j.fine && j.fine !== '未分类' ? j.fine : null
    case 'noc': return j.noc || null
    case 'accessibility': return j.accessibility && j.accessibility !== 'unknown' ? j.accessibility : null
    case 'company': return j.company || null
    case 'title': return j.title || null
    case 'source': return sourceLabel(j)
    case 'origin': return ORIGIN_LABEL[j.origin] || j.origin || null
    case 'status': return j.status === 'closed' ? 1 : 0
    case 'closedAt': return j.closedAt || null
    case 'country': return parseLoc(j).country || null
    case 'province': return parseLoc(j).prov || null
    case 'city': return parseLoc(j).city || null
    case 'district': return parseLoc(j).district || null
    default: return null
  }
}
const teerOf = (noc: string): number | null => (noc && noc.length === 5 && /\d/.test(noc[1]) ? Number(noc[1]) : null)
const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
// 本岗年薪 vs NOC 中位年薪(%);缺值返回 null
const vsPct = (j: JobRow): number | null => (j.salaryAnnual != null && j.wageMedAnnual ? (j.salaryAnnual / j.wageMedAnnual - 1) * 100 : null)
// 「更新」时间显示为东部时区(显式 timeZone,避免 dev=host / 容器=UTC 不一致 + SSR 水合差异)
const fmtLocal = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('sv-SE', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return (iso || '').slice(0, 16).replace('T', ' ') }
}
// 大渥太华市 2001 年合并的社区(Job Bank 仍用老社区名标注)→ 显示为「社区, Ottawa」
const OTTAWA_COMMUNITIES = new Set([
  'nepean', 'gloucester', 'kanata', 'kanata north', 'orleans', 'orléans', 'orleans south',
  'stittsville', 'manotick', 'vanier', 'cumberland', 'greely', 'carp', 'dunrobin',
  'metcalfe', 'osgoode', 'richmond', 'barrhaven', 'rockcliffe',
])
// 社区别名归一(同一区域不同写法 → 规范名)
const DISTRICT_ALIAS: Record<string, string> = {
  'orleans': 'Orléans', 'orléans': 'Orléans', 'orleans south': 'Orléans',
  'kanata north': 'Kanata',
}
const canonDistrict = (low: string, core: string): string => DISTRICT_ALIAS[low] || core
// 地点显示名:渥太华社区统一带上「, Ottawa」,其它城市原样
const locDisplay = (j: JobRow): string => {
  let city = (j.city || '').trim()
  if (!city && j.address) city = j.address.split(',')[0].trim()
  if (!city) return ''
  const core = city.replace(/[,\s]+(on|ontario|canada)\b/gi, '').replace(/,\s*$/, '').trim()
  const low = core.toLowerCase()
  if (low.includes('ottawa')) return 'Ottawa'
  if (OTTAWA_COMMUNITIES.has(low)) return `${canonDistrict(low, core)}, Ottawa`
  return core || city
}
// ── 来源:Job Bank 渠道(含它聚合的 indeed/talent 等)统一显示「Job Bank」;ATS 平台名美化 ──
const fromJobBank = (j: JobRow) => /jobbank\.gc\.ca/i.test(j.applyUrl)
// 来源显示标签已在数据层(etl/09_build_mart.py)洗好存 job.sourceLabel,前端只读
const sourceLabel = (j: JobRow): string => j.sourceLabel || '—'
// 直接雇主:ATS 第一方=直接;Job Bank 渠道仅 source=='Job Bank'(雇主直发)算直接,其余是聚合转贴
const isDirect = (j: JobRow): boolean => (fromJobBank(j) ? j.source === 'Job Bank' : true)

// ── 地点拆 省/市/区 ──
const PROV_NAMES: Record<string, string> = {
  ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta', QC: 'Quebec', MB: 'Manitoba', SK: 'Saskatchewan',
  NS: 'Nova Scotia', NB: 'New Brunswick', NL: 'Newfoundland and Labrador', PE: 'Prince Edward Island',
  NT: 'Northwest Territories', YT: 'Yukon', NU: 'Nunavut',
}
// 地点已由清洗脚本(04c)规范化进库,这里直接读结构化字段(省码→全称仅用于显示)
const parseLoc = (j: JobRow): { country: string; prov: string; city: string; district: string } => ({
  country: j.country || (j.province ? 'Canada' : ''),
  prov: PROV_NAMES[(j.province || '').toUpperCase()] || j.province || '',
  city: j.city || '',
  district: j.district || '',
})

// 综合检索串:搜索框对所有列字段生效(职位/公司/省市区/NOC/分类/薪资/来源/经验/评分/TEER)
const searchHay = (j: JobRow): string => {
  const t = teerOf(j.noc)
  const L = parseLoc(j)
  return [
    j.title, j.company, sourceLabel(j), j.source, j.noc, j.salary,
    j.broad, j.mid, j.fine,
    L.prov, L.city, L.district, j.address,
    accLabel[j.accessibility], j.accessibility,
    j.score != null ? String(j.score) : '', t != null ? `TEER ${t}` : '',
  ].filter(Boolean).join(' ').toLowerCase()
}
// 来源链接 = 该来源的板块根(区别于职位指向的具体帖子)。
// 例:lever 的公司板块、bamboohr 的 /careers、Job Bank 的 /jobsearch
const sourceUrl = (applyUrl: string): string => {
  if (!applyUrl) return ''
  try {
    const u = new URL(applyUrl)
    const seg = u.pathname.split('/').filter(Boolean)[0]
    return seg ? `${u.origin}/${seg}` : u.origin
  } catch { return '' }
}

// ── 列配置(可勾选;职位列始终显示) ──────────────────────────────
type ColKey = 'score' | 'pnp' | 'aip' | 'broad' | 'mid' | 'fine' | 'teer' | 'title' | 'company' | 'noc' | 'accessibility' | 'salary' | 'salaryYr' | 'wageMedHr' | 'wageMedYr' | 'vsMedian' | 'country' | 'province' | 'city' | 'district' | 'address' | 'source' | 'origin' | 'direct' | 'status' | 'datePosted' | 'lastSeen' | 'closedAt'
const COLUMNS: { key: ColKey; label: string; default: boolean; always?: boolean }[] = [
  { key: 'datePosted', label: '发布时间', default: true },
  { key: 'broad', label: '大分类', default: true },
  { key: 'mid', label: '中分类', default: false },
  { key: 'fine', label: '小分类', default: false },
  { key: 'teer', label: 'TEER', default: false },
  { key: 'company', label: '公司', default: true },
  { key: 'title', label: '职位', default: true, always: true },
  { key: 'noc', label: 'NOC', default: false },
  { key: 'accessibility', label: '经验级别', default: false },
  { key: 'country', label: '国家', default: false },
  { key: 'province', label: '省', default: false },
  { key: 'city', label: '市', default: false },
  { key: 'district', label: '区', default: true },
  { key: 'address', label: '地址', default: false },
  { key: 'salary', label: '薪资', default: true },
  { key: 'salaryYr', label: '年薪(折算)', default: true },
  { key: 'wageMedHr', label: '中位时薪', default: false },
  { key: 'wageMedYr', label: '中位年薪', default: false },
  { key: 'vsMedian', label: 'vs 中位', default: true },
  { key: 'source', label: '来源', default: true },
  { key: 'origin', label: '渠道', default: false },
  { key: 'direct', label: '发布', default: true },
  { key: 'pnp', label: 'PNP', default: true },
  { key: 'aip', label: 'AIP', default: true },
  { key: 'status', label: '状态', default: true },
  { key: 'lastSeen', label: '更新时间', default: false },
  { key: 'closedAt', label: '下架时间', default: false },
  { key: 'score', label: '评分', default: true },
]
const DEFAULT_COLS = COLUMNS.filter((c) => c.default).map((c) => c.key)
const PREF_KEY = 'jobs.visibleCols.v7'  // v7:新增中位工资/vs中位列,bump 版本让新默认生效
const COLW_KEY = 'jobs.colWidths.v1'   // 列宽偏好(拖表头分隔条设置)
const MIN_COLW = 56                     // 列最小宽
const DEFAULT_COLW = 130                // 新列/未测量列的默认宽
const AUTO_MAX = 180                    // 自动滚动加载上限;超过改「显示更多」按钮,让 footer 可达
const ORIGIN_LABEL: Record<string, string> = { jobbank: 'Job Bank', ats: 'ATS', directory: '社区名单' }

type Dims = {
  provinces: { code: string; name: string }[]
  cities: { name: string; province: string }[]
  districts: { name: string; city: string; province: string }[]
  nocCategories: { broad: string; mid: string; fine: string; teer: number | null }[]
  sources: { name: string }[]
  experienceLevels: { name: string }[]
}
const EMPTY_DIMS: Dims = { provinces: [], cities: [], districts: [], nocCategories: [], sources: [], experienceLevels: [] }
const PROV_CODE: Record<string, string> = Object.fromEntries(Object.entries(PROV_NAMES).map(([c, n]) => [n, c]))

export default function JobsTable({ jobs, updatedAt, dims = EMPTY_DIMS }: { jobs: JobRow[]; updatedAt?: string; dims?: Dims }) {
  const [q, setQ] = useState('')
  const [directOnly, setDirectOnly] = useState(false)
  const [fCountry, setFCountry] = useState(''); const [fProv, setFProv] = useState(''); const [fCity, setFCity] = useState(''); const [fDistrict, setFDistrict] = useState('')
  const [fBroad, setFBroad] = useState(''); const [fMid, setFMid] = useState(''); const [fFine, setFFine] = useState('')
  const [fTeer, setFTeer] = useState(''); const [fSource, setFSource] = useState(''); const [fAcc, setFAcc] = useState('')
  const [fPnp, setFPnp] = useState(''); const [fAip, setFAip] = useState(''); const [fStatus, setFStatus] = useState(''); const [fOrigin, setFOrigin] = useState('')
  const [scoreMin, setScoreMin] = useState(''); const [scoreMax, setScoreMax] = useState('')   // 数值区间
  const [salMin, setSalMin] = useState(''); const [salMax, setSalMax] = useState('')           // 年薪(单位 K)
  const [vsMin, setVsMin] = useState(''); const [vsMax, setVsMax] = useState('')               // vs 中位(%)
  const [visible, setVisible] = useState<ColKey[]>(DEFAULT_COLS)
  const [popup, setPopup] = useState<{ field: ColKey; job: JobRow; title: string } | null>(null)
  const [sort, setSort] = useState<{ key: ColKey; dir: 'asc' | 'desc' }>({ key: 'datePosted', dir: 'desc' })
  const [colOpen, setColOpen] = useState(false)
  const colRef = useRef<HTMLDivElement>(null)
  const [widths, setWidths] = useState<Partial<Record<ColKey, number>>>({})  // 列宽(空=自动布局;拖动后转固定布局)
  const headRowRef = useRef<HTMLTableRowElement>(null)
  const [limit, setLimit] = useState(60)          // 滚动分页:当前渲染行数
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [lang, setLang] = useState<Lang>('zh')    // 语言(localStorage 持久化)
  useEffect(() => { try { const l = localStorage.getItem(LANG_KEY) as Lang | null; if (l === 'zh' || l === 'en' || l === 'ko') setLang(l) } catch { /* ignore */ } }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = makeT(lang)
  const toggleSort = (key: ColKey) =>
    setSort((s) => {
      if (s.key !== key) return { key, dir: 'desc' }       // 新列:降序
      if (s.dir === 'desc') return { key, dir: 'asc' }      // 第二下:升序
      return { key: 'score', dir: 'desc' }                  // 第三下:取消 → 回默认(评分降序)
    })

  // 读/存列偏好(挂载后再读,避免 SSR 水合不一致)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREF_KEY)
      if (saved) {
        const keys = (JSON.parse(saved) as ColKey[]).filter((k) => COLUMNS.some((c) => c.key === k))
        if (keys.length) setVisible(keys)
      }
    } catch { /* ignore */ }
  }, [])
  const saveCols = (next: ColKey[]) => {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(next)) } catch { /* ignore */ }
    setVisible(next)
  }
  const toggleCol = (key: ColKey) => saveCols(visible.includes(key) ? visible.filter((k) => k !== key) : [...visible, key])
  const TOGGLABLE = COLUMNS.filter((c) => !c.always).map((c) => c.key)
  const selectAllCols = () => saveCols(TOGGLABLE)
  const invertCols = () => saveCols(TOGGLABLE.filter((k) => !visible.includes(k)))
  const mainCols = () => saveCols(DEFAULT_COLS) // 一键只显示默认的核心列
  const shown = COLUMNS.filter((c) => c.always || visible.includes(c.key))

  // ── 列宽:拖表头右缘分隔条调整;空={}时走自动布局,首次拖动测量当前各列宽→转固定布局 ──
  useEffect(() => {
    try { const s = localStorage.getItem(COLW_KEY); if (s) { const w = JSON.parse(s); if (w && typeof w === 'object') setWidths(w) } } catch { /* ignore */ }
  }, [])
  const hasWidths = Object.keys(widths).length > 0
  const colW = (k: ColKey) => widths[k] ?? DEFAULT_COLW
  const totalW = shown.reduce((s, c) => s + colW(c.key), 0)
  const resetWidths = () => { try { localStorage.removeItem(COLW_KEY) } catch { /* ignore */ } ; setWidths({}) }
  const startResize = (e: React.MouseEvent, key: ColKey) => {
    e.preventDefault(); e.stopPropagation()
    const base: Partial<Record<ColKey, number>> = { ...widths }
    const ths = headRowRef.current?.children
    if (ths) shown.forEach((c, i) => { if (base[c.key] == null) base[c.key] = Math.round((ths[i] as HTMLElement).getBoundingClientRect().width) })
    setWidths(base)
    const startX = e.clientX
    const startW = base[key] ?? DEFAULT_COLW
    // 拖这条线 = 改它左侧「当前列」的宽:左边列不动,右边列宽不变、整体平移(表总宽随之变化)
    const onMove = (ev: MouseEvent) => setWidths((p) => ({ ...p, [key]: Math.max(MIN_COLW, startW + (ev.clientX - startX)) }))
    const onUp = () => {
      document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); document.body.style.cursor = ''
      setWidths((p) => { try { localStorage.setItem(COLW_KEY, JSON.stringify(p)) } catch { /* ignore */ } ; return p })
    }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); document.body.style.cursor = 'col-resize'
  }
  // 双击竖线:所有列平均分配(总宽不变,均分给每一列)
  const equalizeWidths = () => {
    const ths = headRowRef.current?.children
    if (!ths) return
    let total = 0
    shown.forEach((_, i) => { total += (ths[i] as HTMLElement).getBoundingClientRect().width })
    const avg = Math.max(MIN_COLW, Math.round(total / shown.length))
    const next: Partial<Record<ColKey, number>> = {}
    shown.forEach((c) => { next[c.key] = avg })
    setWidths(next)
    try { localStorage.setItem(COLW_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  // Esc 关弹框
  useEffect(() => {
    if (!popup) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setPopup(null) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [popup])

  // 点击其他区域关闭「字段」下拉
  useEffect(() => {
    if (!colOpen) return
    const h = (e: MouseEvent) => { if (colRef.current && !colRef.current.contains(e.target as Node)) setColOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [colOpen])

  // 滚动分页:筛选/排序变化重置;接近底部自动加载更多
  useEffect(() => { setLimit(60) }, [q, directOnly, fCountry, fProv, fCity, fDistrict, fBroad, fMid, fFine, fTeer, fSource, fAcc, fPnp, fAip, fStatus, fOrigin, scoreMin, scoreMax, salMin, salMax, vsMin, vsMax, sort])
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) setLimit((l) => (l < AUTO_MAX ? l + 60 : l)) }, { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // 联动选项来自维度表(provinces/cities/districts);维度表为空时回退到从 job 行现推。
  const countryOpts = useMemo(() => (dims.provinces.length ? ['Canada'] : uniq(jobs.map((j) => parseLoc(j).country))), [dims, jobs])
  const provOpts = useMemo(() => (dims.provinces.length ? dims.provinces.map((p) => p.name)
    : uniq(jobs.filter((j) => !fCountry || parseLoc(j).country === fCountry).map((j) => parseLoc(j).prov))), [dims, jobs, fCountry])
  const cityOpts = useMemo(() => {
    if (dims.cities.length) { const code = fProv ? PROV_CODE[fProv] : ''; return uniq(dims.cities.filter((c) => !code || c.province === code).map((c) => c.name)) }
    return uniq(jobs.filter((j) => { const L = parseLoc(j); return (!fCountry || L.country === fCountry) && (!fProv || L.prov === fProv) }).map((j) => parseLoc(j).city))
  }, [dims, jobs, fCountry, fProv])
  const distOpts = useMemo(() => {
    if (dims.districts.length) { const code = fProv ? PROV_CODE[fProv] : ''; return uniq(dims.districts.filter((d) => (!code || d.province === code) && (!fCity || d.city === fCity)).map((d) => d.name)) }
    return uniq(jobs.filter((j) => { const L = parseLoc(j); return (!fCountry || L.country === fCountry) && (!fProv || L.prov === fProv) && (!fCity || L.city === fCity) }).map((j) => parseLoc(j).district))
  }, [dims, jobs, fCountry, fProv, fCity])
  // 分类/来源/经验筛选项来自维度表(noc_categories/sources/experience_levels),回退到 job 行
  const nc = dims.nocCategories
  const broadOpts = useMemo(() => (nc.length ? uniq(nc.map((c) => c.broad)) : uniq(jobs.map((j) => j.broad))), [nc, jobs])
  const midOpts = useMemo(() => (nc.length ? uniq(nc.filter((c) => !fBroad || c.broad === fBroad).map((c) => c.mid))
    : uniq(jobs.filter((j) => !fBroad || j.broad === fBroad).map((j) => j.mid))), [nc, jobs, fBroad])
  const fineOpts = useMemo(() => (nc.length ? uniq(nc.filter((c) => (!fBroad || c.broad === fBroad) && (!fMid || c.mid === fMid)).map((c) => c.fine))
    : uniq(jobs.filter((j) => (!fBroad || j.broad === fBroad) && (!fMid || j.mid === fMid)).map((j) => j.fine))), [nc, jobs, fBroad, fMid])
  const teerOpts = useMemo(() => (nc.length ? uniq(nc.map((c) => (c.teer == null ? '未分类' : `TEER ${c.teer}`)))
    : uniq(jobs.map((j) => (j.teer == null ? '未分类' : `TEER ${j.teer}`)))), [nc, jobs])
  const sourceOpts = useMemo(() => (dims.sources.length ? dims.sources.map((s) => s.name) : uniq(jobs.map((j) => sourceLabel(j)))), [dims, jobs])
  const accOpts = useMemo(() => (dims.experienceLevels.length ? uniq(dims.experienceLevels.map((e) => e.name)) : uniq(jobs.map((j) => j.accessibility))), [dims, jobs])
  const originOpts = useMemo(() => uniq(jobs.map((j) => j.origin)), [jobs])
  const anyFilter = q || directOnly || fCountry || fProv || fCity || fDistrict || fBroad || fMid || fFine || fTeer || fSource || fAcc || fPnp || fAip || fStatus || fOrigin || scoreMin || scoreMax || salMin || salMax || vsMin || vsMax
  const clearAll = () => { setQ(''); setDirectOnly(false); setFCountry(''); setFProv(''); setFCity(''); setFDistrict(''); setFBroad(''); setFMid(''); setFFine(''); setFTeer(''); setFSource(''); setFAcc(''); setFPnp(''); setFAip(''); setFStatus(''); setFOrigin(''); setScoreMin(''); setScoreMax(''); setSalMin(''); setSalMax(''); setVsMin(''); setVsMax('') }

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    const filtered = jobs.filter((j) => {
      const L = parseLoc(j)
      return (!directOnly || isDirect(j)) &&
        (!fCountry || L.country === fCountry) && (!fProv || L.prov === fProv) && (!fCity || L.city === fCity) && (!fDistrict || L.district === fDistrict) &&
        (!fBroad || j.broad === fBroad) && (!fMid || j.mid === fMid) && (!fFine || j.fine === fFine) &&
        (!fTeer || (j.teer == null ? '未分类' : `TEER ${j.teer}`) === fTeer) &&
        (!fSource || sourceLabel(j) === fSource) && (!fAcc || j.accessibility === fAcc) &&
        (!fPnp || (fPnp === 'yes') === j.pnpEligible) && (!fAip || (fAip === 'yes') === j.aip) &&
        (!fStatus || (j.status || 'open') === fStatus) && (!fOrigin || j.origin === fOrigin) &&
        (!scoreMin || (j.score != null && j.score >= +scoreMin)) && (!scoreMax || (j.score != null && j.score <= +scoreMax)) &&
        (!salMin || (j.salaryAnnual != null && j.salaryAnnual >= +salMin * 1000)) && (!salMax || (j.salaryAnnual != null && j.salaryAnnual <= +salMax * 1000)) &&
        (!vsMin || (vsPct(j) != null && (vsPct(j) as number) >= +vsMin)) && (!vsMax || (vsPct(j) != null && (vsPct(j) as number) <= +vsMax)) &&
        (!term || searchHay(j).includes(term))
    })
    const dir = sort.dir === 'asc' ? 1 : -1
    return filtered.slice().sort((a, b) => {
      const va = sortVal(a, sort.key)
      const vb = sortVal(b, sort.key)
      // 缺值始终排到最后(不受升降序影响)
      let cmp = 0
      if (va == null && vb == null) cmp = 0
      else if (va == null) return 1
      else if (vb == null) return -1
      else if (typeof va === 'number' && typeof vb === 'number') cmp = (va - vb) * dir
      else cmp = String(va).localeCompare(String(vb), 'zh') * dir
      // 主键相等时按评分降序兜底(同一天发布的高价值岗优先)
      if (cmp === 0 && sort.key !== 'score') cmp = (b.score ?? -Infinity) - (a.score ?? -Infinity)
      return cmp
    })
  }, [jobs, q, directOnly, fCountry, fProv, fCity, fDistrict, fBroad, fMid, fFine, fTeer, fSource, fAcc, fPnp, fAip, fStatus, fOrigin, scoreMin, scoreMax, salMin, salMax, vsMin, vsMax, sort])

  return (
    <div style={{ background: '#fff', color: '#1f2937', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`.jcell:hover{background:#eff6ff !important}`}</style>
      {/* sticky 顶栏:品牌 + 语言切换(手机/电脑都贴顶) */}
      <header style={{ position: 'sticky', top: 0, zIndex: 30, background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '10px 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>🍁 PNP Job Tracker</span>
            <span style={{ fontSize: 12, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('tagline')}</span>
          </div>
          <div style={{ display: 'inline-flex', border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
            {LANGS.map((l) => (
              <button key={l.code} onClick={() => setLangSaved(l.code)}
                style={{ border: 'none', padding: '3px 9px', fontSize: 12.5, cursor: 'pointer', background: lang === l.code ? '#2563eb' : '#fff', color: lang === l.code ? '#fff' : '#6b7280' }}>{l.label}</button>
            ))}
          </div>
        </div>
      </header>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '1.5rem 1.25rem', width: '100%', boxSizing: 'border-box', flex: '1 0 auto' }}>
        <h1 style={{ margin: '0 0 2px', color: '#111827' }}>Jobs</h1>
        <p style={{ color: '#6b7280', marginTop: 0, fontSize: 13 }}>
          {rows.length === jobs.length ? t('subtitle.count', { n: jobs.length }) : `${rows.length} / ${jobs.length}`}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '1rem 0' }}>
          {/* 行1:地理(国家→省→市→区 联动) */}
          <div style={filtRow}>
            <span style={filtLabel}>{t('filter.geo')}</span>
            <Sel value={fCountry} onChange={(v) => { setFCountry(v); setFProv(''); setFCity(''); setFDistrict('') }} opts={countryOpts} all={t('all.country')} />
            <Sel value={fProv} onChange={(v) => { setFProv(v); setFCity(''); setFDistrict('') }} opts={provOpts} all={t('all.prov')} />
            <Sel value={fCity} onChange={(v) => { setFCity(v); setFDistrict('') }} opts={cityOpts} all={t('all.city')} />
            <Sel value={fDistrict} onChange={setFDistrict} opts={distOpts} all={t('all.district')} />
          </div>
          {/* 行2:分类(TEER + 大→中→小 联动) */}
          <div style={filtRow}>
            <span style={filtLabel}>{t('filter.cat')}</span>
            <Sel value={fTeer} onChange={setFTeer} opts={teerOpts} all={t('all.teer')} />
            <Sel value={fBroad} onChange={(v) => { setFBroad(v); setFMid(''); setFFine('') }} opts={broadOpts} all={t('all.broad')} labelOf={(v) => t('broad.' + v)} />
            <Sel value={fMid} onChange={(v) => { setFMid(v); setFFine('') }} opts={midOpts} all={t('all.mid')} />
            <Sel value={fFine} onChange={setFFine} opts={fineOpts} all={t('all.fine')} />
          </div>
          {/* 行3:属性 */}
          <div style={filtRow}>
            <span style={filtLabel}>{t('filter.attr')}</span>
            <Sel value={fSource} onChange={setFSource} opts={sourceOpts} all={t('all.source')} />
            <Sel value={fAcc} onChange={setFAcc} opts={accOpts} all={t('all.exp')} labelOf={(v) => t('acc.' + v)} />
            <Sel value={fPnp} onChange={setFPnp} opts={['yes', 'no']} all={t('all.pnp')} labelOf={(v) => t('opt.' + v)} />
            <Sel value={fAip} onChange={setFAip} opts={['yes', 'no']} all={t('all.aip')} labelOf={(v) => t('opt.' + v)} />
            <Sel value={fStatus} onChange={setFStatus} opts={['open', 'closed']} all={t('all.status')} labelOf={(v) => (v === 'open' ? t('cell.open') : t('cell.closed'))} />
            <Sel value={fOrigin} onChange={setFOrigin} opts={originOpts} all={t('all.origin')} labelOf={(v) => t('origin.' + v)} />
          </div>
          {/* 行3.5:数值区间(评分 / 年薪K / vs中位%)min–max */}
          <div style={filtRow}>
            <span style={filtLabel}>{t('filter.num')}</span>
            <NumRange label={t('col.score')} min={scoreMin} max={scoreMax} onMin={setScoreMin} onMax={setScoreMax} phMin={t('min')} phMax={t('max')} />
            <NumRange label={`${t('col.salaryYr')} (K)`} min={salMin} max={salMax} onMin={setSalMin} onMax={setSalMax} phMin={t('min')} phMax={t('max')} />
            <NumRange label={`${t('col.vsMedian')} (%)`} min={vsMin} max={vsMax} onMin={setVsMin} onMax={setVsMax} phMin={t('min')} phMax={t('max')} />
          </div>
          {/* 行4:搜索 + 仅第一方 + 清除 */}
          <div style={filtRow}>
            <input placeholder={t('search.placeholder')} value={q} onChange={(e) => setQ(e.target.value)} style={{ ...ctrl, flex: '0 1 320px', minWidth: 180 }} />
            <label style={{ ...ctrl, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: directOnly ? '#eef2ff' : '#fff', whiteSpace: 'nowrap' }} title={t('directOnly.tip')}>
              <input type="checkbox" checked={directOnly} onChange={(e) => setDirectOnly(e.target.checked)} />{t('directOnly')}
            </label>
            {anyFilter && <button onClick={clearAll} style={{ ...ctrl, cursor: 'pointer', background: '#f3f4f6', color: '#b91c1c' }}>{t('clear')}</button>}
            {/* 字段选择:右对齐,与搜索同一行 */}
            <div ref={colRef} style={{ position: 'relative', marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <button onClick={() => setColOpen((o) => !o)} style={{ ...ctrl, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', background: '#f3f4f6', whiteSpace: 'nowrap' }}>{t('fields', { n: shown.length })}</button>
              {colOpen && (
                <div style={colPanel}>
                  <div style={{ display: 'flex', gap: 6, padding: '2px 4px 6px', borderBottom: '1px solid #f3f4f6', marginBottom: 4 }}>
                    <button onClick={mainCols} style={{ ...colBtn, fontWeight: 600, color: '#2563eb', borderColor: '#bfdbfe' }}>{t('fields.main')}</button>
                    <button onClick={selectAllCols} style={colBtn}>{t('fields.all')}</button>
                    <button onClick={invertCols} style={colBtn}>{t('fields.invert')}</button>
                    {hasWidths && <button onClick={resetWidths} style={colBtn}>{t('fields.resetW')}</button>}
                  </div>
                  {COLUMNS.map((c) => (
                    <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', fontSize: 13, color: c.always ? '#9ca3af' : '#1f2937', cursor: c.always ? 'default' : 'pointer' }}>
                      <input type="checkbox" checked={c.always || visible.includes(c.key)} disabled={c.always} onChange={() => toggleCol(c.key)} />
                      {t('col.' + c.key)}{c.always ? t('fields.fixed') : ''}
                    </label>
                  ))}
                </div>
              )}
              {updatedAt && <span style={{ color: '#9ca3af', fontSize: 12, whiteSpace: 'nowrap' }}>{t('updated', { t: fmtLocal(updatedAt) })}</span>}
            </div>
          </div>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflowX: 'auto' }}>
          <table style={{ width: hasWidths ? totalW : 'auto', minWidth: '100%', borderCollapse: 'collapse', fontSize: 13.5, tableLayout: hasWidths ? 'fixed' : 'auto' }}>
            <colgroup>
              {shown.map((c) => <col key={c.key} style={hasWidths ? { width: colW(c.key) } : undefined} />)}
            </colgroup>
            <thead>
              <tr ref={headRowRef} style={{ textAlign: 'left', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {shown.map((c, idx) => {
                  const active = sort.key === c.key
                  const isLast = idx === shown.length - 1
                  return (
                    <th key={c.key} onClick={() => toggleSort(c.key)} title={t('th.tip')}
                      style={{ padding: '8px 12px', color: active ? '#2563eb' : '#374151', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', position: 'relative', borderRight: isLast ? undefined : '1px solid #e5e7eb' }}>
                      {t('col.' + c.key)}<span style={{ color: active ? '#2563eb' : '#d1d5db', fontSize: 11 }}>{active ? (sort.dir === 'desc' ? ' ▼' : ' ▲') : ' ↕'}</span>
                      {!isLast && <span onMouseDown={(e) => startResize(e, c.key)} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => { e.stopPropagation(); equalizeWidths() }} title={t('resize.tip')}
                        style={{ position: 'absolute', top: 0, right: 0, width: 9, height: '100%', cursor: 'col-resize', zIndex: 1 }} />}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((j, i) => {
                // 各地点列点击 → Google 地图按**自己那一级**查询(省→省/市→市/区→区/地址→地址)
                const mapsFor = (...parts: (string | undefined)[]) => { const q = parts.filter(Boolean).join(', '); return q ? mapsUrl(q) : null }
                const L = parseLoc(j)                                                       // 省/市/区
                const cat = colorOf(j.broad)
                const open = (field: ColKey, title: string) => setPopup({ field, job: j, title })
                return (
                  <tr key={j.id} className="jrow" style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 ? '#fcfcfd' : '#fff' }}>
                    {shown.map((c, idx) => {
                      const k = c.key
                      let href: string | null = null
                      let node: React.ReactNode
                      const extra: React.CSSProperties = {}
                      if (k === 'score') { node = j.score ?? '—'; Object.assign(extra, { fontWeight: 600, color: scoreColor(j.score) }) }
                      else if (k === 'broad') { node = j.broad ? t('broad.' + j.broad) : t('cell.uncat'); Object.assign(extra, { whiteSpace: 'nowrap', color: cat.fg, fontWeight: 500 }) }
                      else if (k === 'mid') { node = (!j.mid || j.mid === '未分类') ? t('cell.uncat') : j.mid; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'fine') { node = (j.mid === '未分类' || !j.mid) ? '—' : j.fine; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'teer') { node = j.teer == null ? '—' : `TEER ${j.teer}`; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'title') { href = j.applyUrl || null; node = j.title; Object.assign(extra, wrapCell(360)) }
                      else if (k === 'company') { href = j.officialUrl || null; node = j.company; Object.assign(extra, wrapCell(190)) }
                      else if (k === 'noc') node = j.noc || '—'
                      else if (k === 'accessibility') node = t('acc.' + (j.accessibility || 'unknown'))
                      else if (k === 'salary') { node = <span title={j.salary || ''}>{j.salaryText || '—'}</span>; Object.assign(extra, { whiteSpace: 'nowrap', color: j.salary ? '#15803d' : '#9ca3af' }) }
                      else if (k === 'salaryYr') { const a = j.salaryAnnual; node = a != null ? `$${Math.round(a / 1000)}K/yr` : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: a != null ? '#15803d' : '#9ca3af' }) }
                      else if (k === 'wageMedHr') { node = j.wageMedHourly != null ? `$${j.wageMedHourly}/hr` : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: j.wageMedHourly != null ? '#4b5563' : '#9ca3af' }) }
                      else if (k === 'wageMedYr') { const m = j.wageMedAnnual; node = m != null ? `$${Math.round(m / 1000)}K/yr` : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: m != null ? '#4b5563' : '#9ca3af' }) }
                      else if (k === 'vsMedian') { const a = j.salaryAnnual, m = j.wageMedAnnual; if (a != null && m) { const p = Math.round((a / m - 1) * 100); node = `${p >= 0 ? '+' : ''}${p}%`; Object.assign(extra, { whiteSpace: 'nowrap', fontWeight: 600, color: p >= 0 ? '#15803d' : '#b45309' }) } else { node = '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#9ca3af' }) } }
                      else if (k === 'address') { href = j.address ? mapsUrl(j.address) : null; node = j.address || '—'; Object.assign(extra, wrapCell(220)) }
                      else if (k === 'direct') { const dr = isDirect(j); node = dr ? t('cell.first') : t('cell.repost'); Object.assign(extra, { whiteSpace: 'nowrap', color: dr ? '#15803d' : '#9ca3af', fontSize: 12.5 }) }
                      else if (k === 'country') { node = L.country || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'province') { href = mapsFor(L.prov); node = L.prov || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'city') { href = mapsFor(L.city); node = L.city || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'district') { href = mapsFor(L.district); node = L.district || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#1f2937' }) }
                      else if (k === 'source') { href = sourceUrl(j.applyUrl) || null; node = sourceLabel(j); Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'origin') { node = j.origin ? t('origin.' + j.origin) : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'pnp') { node = j.pnpEligible ? t('cell.pnpYes') : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: j.pnpEligible ? '#15803d' : '#d1d5db', fontSize: 12.5 }) }
                      else if (k === 'aip') { node = j.aip ? t('cell.aipYes') : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: j.aip ? '#b45309' : '#d1d5db', fontSize: 12.5 }) }
                      else if (k === 'status') { const cl = j.status === 'closed'; node = cl ? t('cell.closed') : t('cell.open'); Object.assign(extra, { whiteSpace: 'nowrap', color: cl ? '#9ca3af' : '#15803d', fontSize: 12.5 }) }
                      else if (k === 'closedAt') { node = j.closedAt ? j.closedAt.slice(0, 10) : '—'; Object.assign(extra, { color: '#9ca3af', fontSize: 12.5, whiteSpace: 'nowrap' }) }
                      else if (k === 'datePosted') { node = j.datePosted ? j.datePosted.slice(0, 10) : '—'; Object.assign(extra, { color: '#6b7280', fontSize: 12.5, whiteSpace: 'nowrap' }) }
                      else { node = j.lastSeen ? j.lastSeen.slice(0, 10) : '—'; Object.assign(extra, { color: '#9ca3af', fontSize: 12.5, whiteSpace: 'nowrap' }) }
                      return (
                        <td key={k} className="jcell" style={{ ...td, ...extra, cursor: 'pointer', borderRight: idx === shown.length - 1 ? undefined : '1px solid #f3f4f6', ...(hasWidths ? { overflow: 'hidden', textOverflow: 'ellipsis' } : null) }} title={typeof node === 'string' ? node : undefined} onClick={() => open(k, typeof node === 'string' ? node : (j.salaryText || j.salary || ''))}>
                          {href
                            ? <a href={href} target="_blank" rel="noreferrer" style={link} onClick={(e) => e.stopPropagation()}>{node}</a>
                            : node}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={shown.length} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>{t('empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* 滚动到此自动加载更多 */}
        <div ref={sentinelRef} style={{ textAlign: 'center', padding: '12px', fontSize: 12.5, color: '#9ca3af' }}>
          {rows.length === 0 ? ''
            : limit >= rows.length ? t('allShown', { total: rows.length })
            : limit < AUTO_MAX ? t('more', { x: Math.min(limit, rows.length), total: rows.length })
            : <button onClick={() => setLimit((l) => l + 300)} style={{ ...ctrl, cursor: 'pointer', background: '#f3f4f6', color: '#374151' }}>{t('loadMore', { x: Math.min(limit, rows.length), total: rows.length })}</button>}
        </div>
      </div>
      {/* footer:免责 + 版权,窄屏自动换行 */}
      <footer style={{ borderTop: '1px solid #e5e7eb', background: '#fafafa', flexShrink: 0 }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '16px 1.25rem', display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', color: '#9ca3af', fontSize: 12.5 }}>
          <span>{t('foot.disclaimer')}</span>
          <span style={{ whiteSpace: 'nowrap' }}>© 2026 PNP Job Tracker</span>
        </div>
      </footer>

      {popup && <AdvisorModal field={popup.field} job={popup.job} title={popup.title} lang={lang} onClose={() => setPopup(null)} />}
    </div>
  )
}

// ── AI 顾问弹框 ────────────────────────────────────────────────
// 所有字段都走本地大模型流式生成(按所选语言);前端只给极简头部 + 链接,正文由模型生成。
function AdvisorModal({ field, job, title, lang, onClose }: { field: ColKey; job: JobRow; title?: string; lang: Lang; onClose: () => void }) {
  const t = makeT(lang)
  const a = advHeader(field, job, t)
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'loading' | 'streaming' | 'done' | 'error'>('loading')

  useEffect(() => {
    const ctrl = new AbortController()
    setText(''); setStatus('loading')
    ;(async () => {
      try {
        const res = await fetch('/api/advisor', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
          body: JSON.stringify({ field, id: String(job.id), job, lang }),
        })
        if (!res.ok || !res.body) { setStatus('error'); setText(t('advisor.failed', { code: res.status })); return }
        const reader = res.body.getReader(); const dec = new TextDecoder()
        setStatus('streaming')
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          setText((t) => t + dec.decode(value, { stream: true }))
        }
        setStatus('done')
      } catch {
        if (!ctrl.signal.aborted) { setStatus('error'); setText(t('advisor.offline')) }
      }
    })()
    return () => ctrl.abort()
  }, [field, job, lang])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, maxWidth: 520, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '16px 20px 8px' }}>
          <div>
            <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, letterSpacing: .3 }}>{t('advisor.tag')} · {a.tag}{status === 'streaming' ? t('advisor.generating') : ''}</div>
            <h3 style={{ margin: '4px 0 0', fontSize: 17, color: '#111827' }}>{title || a.title}</h3>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f3f4f6', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 16, color: '#6b7280', flexShrink: 0 }}>×</button>
        </div>
        <div style={{ padding: '4px 20px 20px' }}>
          {status === 'loading' ? (
            <p style={{ margin: '10px 0', fontSize: 14, color: '#9ca3af' }}>{t('advisor.loading')}</p>
          ) : (
            <div style={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}>{renderAI(text)}{status === 'streaming' && <span style={{ color: '#9ca3af' }}>▋</span>}</div>
          )}
          {a.links.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {a.links.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer" style={{ ...link, fontSize: 13, background: '#eef2ff', padding: '6px 12px', borderRadius: 8 }}>{l.label} ↗</a>
              ))}
            </div>
          )}
          <p style={{ marginTop: 14, fontSize: 11.5, color: '#9ca3af' }}>{t('advisor.footAI')}</p>
        </div>
      </div>
    </div>
  )
}

// 把 AI 文本里的【小标题】加粗,保留换行
function renderAI(text: string): React.ReactNode {
  return text.split(/(【[^】]+】)/g).map((seg, i) =>
    /^【[^】]+】$/.test(seg)
      ? <strong key={i} style={{ display: 'block', marginTop: i ? 12 : 0, color: '#111827' }}>{seg}</strong>
      : <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{seg}</span>,
  )
}

// ── 按字段类型生成顾问解读(基于该行数据;无需 API) ─────────────
// AI 顾问头部:标签(三语,复用列名)+ 上下文标题 + 链接;正文全部由 /api/advisor 大模型按所选语言生成。
function advHeader(field: ColKey, j: JobRow, t: TFn): { tag: string; title: string; links: { label: string; href: string }[] } {
  const links: { label: string; href: string }[] = []
  if (j.applyUrl) links.push({ label: t('advisor.applyLink'), href: j.applyUrl })
  if (j.officialUrl) links.push({ label: t('advisor.siteLink'), href: j.officialUrl })
  return { tag: t('col.' + field), title: j.title || j.company || '—', links }
}

const scoreColor = (s: number | null) => (s == null ? '#9ca3af' : s >= 75 ? '#15803d' : s >= 50 ? '#b45309' : '#6b7280')
const ctrl: React.CSSProperties = { height: 38, boxSizing: 'border-box', padding: '0 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, color: '#1f2937', background: '#fff' }
const filtRow: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }
const filtLabel: React.CSSProperties = { fontSize: 12, color: '#9ca3af', minWidth: 28, whiteSpace: 'nowrap' }
// 联动下拉:上级选了,下级选项随之收窄;当前值不在选项里也保留显示
function Sel({ value, onChange, opts, all, labelOf }: { value: string; onChange: (v: string) => void; opts: string[]; all: string; labelOf?: (v: string) => string }) {
  const list = value && !opts.includes(value) ? [value, ...opts] : opts
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...ctrl, maxWidth: 180 }}>
      <option value="">{all}</option>
      {list.map((o) => <option key={o} value={o}>{labelOf ? labelOf(o) : o}</option>)}
    </select>
  )
}
// 数值区间筛选:标签 + min – max 两个数字框
function NumRange({ label, min, max, onMin, onMax, phMin, phMax }: { label: string; min: string; max: string; onMin: (v: string) => void; onMax: (v: string) => void; phMin: string; phMax: string }) {
  const inp: React.CSSProperties = { ...ctrl, width: 64, padding: '0 6px' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{label}</span>
      <input type="number" value={min} onChange={(e) => onMin(e.target.value)} placeholder={phMin} style={inp} />
      <span style={{ color: '#9ca3af' }}>–</span>
      <input type="number" value={max} onChange={(e) => onMax(e.target.value)} placeholder={phMax} style={inp} />
    </span>
  )
}
const td: React.CSSProperties = { padding: '7px 12px', verticalAlign: 'top' }
// 按词换行(不逐字断词);不设 wordBreak 以免列被挤成 1 字符宽
const wrapCell = (w: number): React.CSSProperties => ({ maxWidth: w, whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'normal' })
const link: React.CSSProperties = { color: '#2563eb', textDecoration: 'none' }
const colPanel: React.CSSProperties = { position: 'absolute', top: '110%', right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,.12)', padding: 8, zIndex: 20, minWidth: 210 }
const colBtn: React.CSSProperties = { flex: 1, whiteSpace: 'nowrap', padding: '4px 8px', fontSize: 12.5, border: '1px solid #d1d5db', borderRadius: 5, background: '#f9fafb', color: '#374151', cursor: 'pointer' }
