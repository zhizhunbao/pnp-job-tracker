'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

// 读 localStorage 偏好(列/语言)用「绘制前」生效,避免 SSR 默认值闪一下再切到保存值。
// SSR 端 useLayoutEffect 无效且会告警 → 服务端退化成 useEffect。
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

import { makeT, LANGS, LANG_KEY, COLS_COOKIE, type Lang, type TFn } from './i18n'

export type JobRow = {
  id: string | number
  title: string
  company: string
  companyDescription: string
  companySectors: string
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
  pnpStream: string
  eeCategory: string
  aip: boolean
  salary: string
  salaryAnnual: number | null
  salaryText: string
  wageMedHourly: number | null
  wageMedAnnual: number | null
  wageLowHourly: number | null
  wageLowAnnual: number | null
  wageHighHourly: number | null
  wageHighAnnual: number | null
  wageYear: string
  officialUrl: string
  applyUrl: string
  datePosted: string
  firstSeen: string
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
    case 'ee': return j.eeCategory || null
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
// 数值预设判定(下拉,不手填):评分高/中/低、年薪档、vs中位
const okScore = (s: number | null, f: string): boolean => !f || (s != null && (f === 'high' ? s >= 75 : f === 'mid' ? s >= 50 && s < 75 : s < 50))
const okSal = (a: number | null, f: string): boolean => !f || (a != null && (f === 'ge100' ? a >= 100000 : f === '80' ? a >= 80000 && a < 100000 : f === '60' ? a >= 60000 && a < 80000 : a < 60000))
const okVs = (v: number | null, f: string): boolean => !f || (v != null && (f === 'above' ? v >= 0 : f === 'above20' ? v >= 20 : v < 0))
// 「更新」时间显示为东部时区(显式 timeZone,避免 dev=host / 容器=UTC 不一致 + SSR 水合差异)
const fmtLocal = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('sv-SE', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return (iso || '').slice(0, 16).replace('T', ' ') }
}
// 同上但带秒(更新时间列要看到时分秒)
const fmtLocalSec = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('sv-SE', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch { return (iso || '').slice(0, 19).replace('T', ' ') }
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
type ColKey = 'score' | 'pnp' | 'ee' | 'aip' | 'broad' | 'mid' | 'fine' | 'teer' | 'title' | 'company' | 'noc' | 'accessibility' | 'salary' | 'salaryYr' | 'wageMedHr' | 'wageMedYr' | 'vsMedian' | 'country' | 'province' | 'city' | 'district' | 'address' | 'source' | 'origin' | 'direct' | 'status' | 'datePosted' | 'lastSeen' | 'closedAt' | 'actions'
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
  { key: 'ee', label: 'EE 类别', default: true },
  { key: 'aip', label: 'AIP', default: true },
  { key: 'status', label: '状态', default: true },
  { key: 'lastSeen', label: '更新时间', default: false },
  { key: 'closedAt', label: '下架时间', default: false },
  { key: 'score', label: '评分', default: true },
  { key: 'actions', label: '操作', default: true, always: true },  // 固定最后一列:公司信息 / 职位描述 按钮
]
const DEFAULT_COLS = COLUMNS.filter((c) => c.default).map((c) => c.key)
const PREF_KEY = 'jobs.visibleCols.v7'  // v7:新增中位工资/vs中位列,bump 版本让新默认生效
const writeColsCookie = (keys: string[]) => {
  try { document.cookie = `${COLS_COOKIE}=${encodeURIComponent(JSON.stringify(keys))}; path=/; max-age=31536000; SameSite=Lax` } catch { /* ignore */ }
}
const AUTO_MAX = 180                    // 自动滚动加载上限;超过改「显示更多」按钮,让 footer 可达
const ORIGIN_LABEL: Record<string, string> = { jobbank: 'Job Bank', ats: 'ATS', directory: '社区名单' }

type PnpOcc = { province: string; stream: string; label: string; type: string; noc: string; name: string; gtaRestricted: boolean; url: string; fetched: string }
type EeOcc = { category: string; label: string; noc: string; teer: number | null; title: string; url: string; fetched: string }
type DesigEmp = { name: string; province: string; location: string; isTech: boolean }
type Dims = {
  provinces: { code: string; name: string }[]
  cities: { name: string; province: string }[]
  districts: { name: string; city: string; province: string }[]
  nocCategories: { broad: string; mid: string; fine: string; teer: number | null }[]
  sources: { name: string }[]
  experienceLevels: { name: string }[]
  pnpOccupations: PnpOcc[]
  eeCategories: EeOcc[]
  designatedEmployers: DesigEmp[]
}
const EMPTY_DIMS: Dims = { provinces: [], cities: [], districts: [], nocCategories: [], sources: [], experienceLevels: [], pnpOccupations: [], eeCategories: [], designatedEmployers: [] }
const PROV_CODE: Record<string, string> = Object.fromEntries(Object.entries(PROV_NAMES).map(([c, n]) => [n, c]))

export default function JobsTable({ jobs, updatedAt, dims = EMPTY_DIMS, initialCols }: { jobs: JobRow[]; updatedAt?: string; dims?: Dims; initialCols?: string[] }) {
  const [q, setQ] = useState('')
  const [directOnly, setDirectOnly] = useState(false)
  const [fCountry, setFCountry] = useState(''); const [fProv, setFProv] = useState(''); const [fCity, setFCity] = useState(''); const [fDistrict, setFDistrict] = useState('')
  const [fBroad, setFBroad] = useState(''); const [fMid, setFMid] = useState(''); const [fFine, setFFine] = useState('')
  const [fTeer, setFTeer] = useState(''); const [fSource, setFSource] = useState(''); const [fAcc, setFAcc] = useState('')
  const [fPnp, setFPnp] = useState(''); const [fAip, setFAip] = useState(''); const [fStatus, setFStatus] = useState(''); const [fOrigin, setFOrigin] = useState('')
  const [fScore, setFScore] = useState(''); const [fSal, setFSal] = useState(''); const [fVs, setFVs] = useState('')  // 数值预设(下拉,不手填)
  const [showMore, setShowMore] = useState(false)  // 「更多筛选」折叠区(来源/状态/经验/评分/薪资)默认收起
  const moreActive = [fSource, fOrigin, fStatus, fAcc, fScore, fSal, fVs].filter(Boolean).length  // 折叠区里已激活的筛选数
  // 初始列:服务端从 cookie 解析后由 initialCols 传入 → SSR 与客户端首帧一致(零闪);无则用默认
  const [visible, setVisible] = useState<ColKey[]>(() => {
    const v = (initialCols ?? []).filter((k): k is ColKey => COLUMNS.some((c) => c.key === k))
    return v.length ? v : DEFAULT_COLS
  })
  const [popup, setPopup] = useState<{ field: ColKey; job: JobRow; title: string } | null>(null)
  const [actModal, setActModal] = useState<{ kind: 'company' | 'desc'; job: JobRow } | null>(null)
  const [sort, setSort] = useState<{ key: ColKey; dir: 'asc' | 'desc' }>({ key: 'datePosted', dir: 'desc' })
  const [colOpen, setColOpen] = useState(false)
  const colRef = useRef<HTMLDivElement>(null)
  const [limit, setLimit] = useState(60)          // 滚动分页:当前渲染行数
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [lang, setLang] = useState<Lang>('zh')    // 语言(localStorage 持久化)
  useIsoLayoutEffect(() => { try { const l = localStorage.getItem(LANG_KEY) as Lang | null; if (l === 'zh' || l === 'en' || l === 'ko') setLang(l) } catch { /* ignore */ } }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = makeT(lang)
  // 大分类标签:'未分类' 复用规范 key cell.uncat(字典无 broad.未分类,否则会回退成原样输出 "broad.未分类")
  const broadLabel = (v?: string) => (v && v !== '未分类' ? t('broad.' + v) : t('cell.uncat'))
  const toggleSort = (key: ColKey) =>
    setSort((s) => {
      if (s.key !== key) return { key, dir: 'desc' }       // 新列:降序
      if (s.dir === 'desc') return { key, dir: 'asc' }      // 第二下:升序
      return { key: 'score', dir: 'desc' }                  // 第三下:取消 → 回默认(评分降序)
    })

  // 迁移:老用户有 localStorage 列偏好但还没 cookie(本次改动前设的)→ 应用 + 补写 cookie(一次性)。
  // 有 cookie 时服务端已渲对的列、initialCols 已传入 → 直接 return,不进迁移。
  useIsoLayoutEffect(() => {
    if (initialCols && initialCols.length) return
    try {
      const saved = localStorage.getItem(PREF_KEY)
      if (saved) {
        const keys = (JSON.parse(saved) as ColKey[]).filter((k) => COLUMNS.some((c) => c.key === k))
        if (keys.length) { setVisible(keys); writeColsCookie(keys) }
      }
    } catch { /* ignore */ }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  const saveCols = (next: ColKey[]) => {
    writeColsCookie(next)                                      // 写 cookie:下次刷新服务端直接渲对
    try { localStorage.setItem(PREF_KEY, JSON.stringify(next)) } catch { /* ignore */ }  // 留一份兜底
    setVisible(next)
    setWidths({})                                             // 列集变了 → 回自动布局(否则新列在固定布局里塌陷成 0)
  }
  const toggleCol = (key: ColKey) => saveCols(visible.includes(key) ? visible.filter((k) => k !== key) : [...visible, key])
  const TOGGLABLE = COLUMNS.filter((c) => !c.always).map((c) => c.key)
  const selectAllCols = () => saveCols(TOGGLABLE)
  const invertCols = () => saveCols(TOGGLABLE.filter((k) => !visible.includes(k)))
  const mainCols = () => saveCols(DEFAULT_COLS) // 一键只显示默认的核心列
  const shown = COLUMNS.filter((c) => c.always || visible.includes(c.key))

  // ── 列宽:默认纯自动布局(table-layout:auto,永不截断);用户拖表头竖线/双击才切固定布局。
  //    会话内有效、不落 localStorage —— 刷新即回自动布局。当初 bug 正是「localStorage 固定布局 +
  //    缺测列兜底 130px」导致加载后截断/收缩;此处切固定前**全量实测**每列自然宽,无任何常量兜底,
  //    故任何列都不会被压窄。切换可见列时清回自动(防新列塌陷成 0)。
  const [widths, setWidths] = useState<Record<string, number>>({})
  const headRowRef = useRef<HTMLTableRowElement>(null)
  const hasWidths = Object.keys(widths).length > 0
  const totalW = shown.reduce((s, c) => s + (widths[c.key] ?? 0), 0)
  const resetWidths = () => setWidths({})
  // 量当前表头每个可见列的自然渲染宽(auto 布局下为真实内容宽),返回覆盖全可见列的完整 map
  const measureAll = (): Record<string, number> => {
    const head = headRowRef.current
    const m: Record<string, number> = {}
    if (head) shown.forEach((c, i) => {
      const el = head.children[i] as HTMLElement | undefined
      if (el) m[c.key] = Math.round(el.getBoundingClientRect().width)
    })
    return m
  }
  // 拖某列右缘竖线:先以全量实测作基线(已有手动宽优先),再只改本列宽 —— 左列不动、右列平移
  const startResize = (e: React.MouseEvent, key: string) => {
    e.preventDefault(); e.stopPropagation()
    const base = { ...measureAll(), ...widths }
    const startX = e.clientX
    const startW = base[key] ?? 120
    setWidths(base)
    const onMove = (ev: MouseEvent) => setWidths((p) => ({ ...p, [key]: Math.max(56, startW + (ev.clientX - startX)) }))
    const onUp = () => {
      document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); document.body.style.cursor = ''
    }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); document.body.style.cursor = 'col-resize'
  }
  // 双击竖线:按内容自适应该列(量表头+各行该列 scrollWidth 取 max+余量)——只会变宽,永不截断
  const autoFitColumn = (idx: number, key: string) => {
    const head = headRowRef.current
    const table = head?.closest('table') as HTMLTableElement | null
    if (!head || !table) return
    const base = { ...measureAll(), ...widths }
    let max = (head.children[idx] as HTMLElement).scrollWidth
    table.querySelectorAll('tbody tr').forEach((tr) => {
      const cell = (tr as HTMLElement).children[idx] as HTMLElement | undefined
      if (cell) max = Math.max(max, cell.scrollWidth)
    })
    base[key] = Math.max(56, max + 6)
    setWidths(base)
  }

  // Esc 关弹框
  useEffect(() => {
    if (!popup && !actModal) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { setPopup(null); setActModal(null) } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [popup, actModal])

  // 点击其他区域关闭「字段」下拉
  useEffect(() => {
    if (!colOpen) return
    const h = (e: MouseEvent) => { if (colRef.current && !colRef.current.contains(e.target as Node)) setColOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [colOpen])

  // 滚动分页:筛选/排序变化重置;接近底部自动加载更多
  useEffect(() => { setLimit(60) }, [q, directOnly, fCountry, fProv, fCity, fDistrict, fBroad, fMid, fFine, fTeer, fSource, fAcc, fPnp, fAip, fStatus, fOrigin, fScore, fSal, fVs, sort])
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
  const anyFilter = q || directOnly || fCountry || fProv || fCity || fDistrict || fBroad || fMid || fFine || fTeer || fSource || fAcc || fPnp || fAip || fStatus || fOrigin || fScore || fSal || fVs
  const clearAll = () => { setQ(''); setDirectOnly(false); setFCountry(''); setFProv(''); setFCity(''); setFDistrict(''); setFBroad(''); setFMid(''); setFFine(''); setFTeer(''); setFSource(''); setFAcc(''); setFPnp(''); setFAip(''); setFStatus(''); setFOrigin(''); setFScore(''); setFSal(''); setFVs('') }

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    const filtered = jobs.filter((j) => {
      const L = parseLoc(j)
      return (!directOnly || isDirect(j)) &&
        (!fCountry || L.country === fCountry) && (!fProv || L.prov === fProv) && (!fCity || L.city === fCity) && (!fDistrict || L.district === fDistrict) &&
        (!fBroad || j.broad === fBroad) && (!fMid || j.mid === fMid) && (!fFine || j.fine === fFine) &&
        (!fTeer || (j.teer == null ? '未分类' : `TEER ${j.teer}`) === fTeer) &&
        (!fSource || sourceLabel(j) === fSource) && (!fAcc || j.accessibility === fAcc) &&
        (!fPnp || (fPnp === 'yes' ? j.pnpEligible : (!j.pnpEligible && j.province !== 'QC'))) && (!fAip || (fAip === 'yes') === j.aip) &&
        (!fStatus || (j.status || 'open') === fStatus) && (!fOrigin || j.origin === fOrigin) &&
        okScore(j.score, fScore) && okSal(j.salaryAnnual, fSal) && okVs(vsPct(j), fVs) &&
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
  }, [jobs, q, directOnly, fCountry, fProv, fCity, fDistrict, fBroad, fMid, fFine, fTeer, fSource, fAcc, fPnp, fAip, fStatus, fOrigin, fScore, fSal, fVs, sort])

  return (
    <div style={{ background: '#fff', color: '#1f2937', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`.jcell:hover{background:#eff6ff !important}
        .colResize:hover{background:#93c5fd}
        .colResize:active{background:#3b82f6}`}</style>
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
          {/* ═══ 常用筛选(始终显示):4 字标签在上(职业分类/移民资格),地理在下 ═══ */}
          {/* 职业分类(TEER + 大→中→小 联动) */}
          <div style={filtRow}>
            <span style={filtLabel}>{t('filter.cat')}</span>
            <Sel value={fTeer} onChange={setFTeer} opts={teerOpts} all={t('all.teer')} />
            <Sel value={fBroad} onChange={(v) => { setFBroad(v); setFMid(''); setFFine('') }} opts={broadOpts} all={t('all.broad')} labelOf={broadLabel} />
            <Sel value={fMid} onChange={(v) => { setFMid(v); setFFine('') }} opts={midOpts} all={t('all.mid')} />
            <Sel value={fFine} onChange={setFFine} opts={fineOpts} all={t('all.fine')} />
          </div>
          {/* 移民资格 */}
          <div style={filtRow}>
            <span style={filtLabel}>{t('filter.elig')}</span>
            <Sel value={fPnp} onChange={setFPnp} opts={['yes', 'no']} all={t('all.pnp')} labelOf={(v) => t('opt.' + v)} />
            <Sel value={fAip} onChange={setFAip} opts={['yes', 'no']} all={t('all.aip')} labelOf={(v) => t('opt.' + v)} />
          </div>
          {/* 地理(国家→省→市→区 联动) */}
          <div style={filtRow}>
            <span style={filtLabel}>{t('filter.geo')}</span>
            <Sel value={fCountry} onChange={(v) => { setFCountry(v); setFProv(''); setFCity(''); setFDistrict('') }} opts={countryOpts} all={t('all.country')} />
            <Sel value={fProv} onChange={(v) => { setFProv(v); setFCity(''); setFDistrict('') }} opts={provOpts} all={t('all.prov')} />
            <Sel value={fCity} onChange={(v) => { setFCity(v); setFDistrict('') }} opts={cityOpts} all={t('all.city')} />
            <Sel value={fDistrict} onChange={setFDistrict} opts={distOpts} all={t('all.district')} />
          </div>
          {/* ═══ 更多筛选(默认收起):来源/状态/经验/评分/薪资 —— 开关在下方搜索行 ═══ */}
          {showMore && (<>
            {/* 来源 */}
            <div style={filtRow}>
              <span style={filtLabel}>{t('filter.src')}</span>
              <Sel value={fSource} onChange={setFSource} opts={sourceOpts} all={t('all.source')} />
              <Sel value={fOrigin} onChange={setFOrigin} opts={originOpts} all={t('all.origin')} labelOf={(v) => t('origin.' + v)} />
            </div>
            {/* 状态 */}
            <div style={filtRow}>
              <span style={filtLabel}>{t('filter.status')}</span>
              <Sel value={fStatus} onChange={setFStatus} opts={['open', 'closed']} all={t('all.status')} labelOf={(v) => (v === 'open' ? t('cell.open') : t('cell.closed'))} />
            </div>
            {/* 经验 */}
            <div style={filtRow}>
              <span style={filtLabel}>{t('filter.exp')}</span>
              <Sel value={fAcc} onChange={setFAcc} opts={accOpts} all={t('all.exp')} labelOf={(v) => t('acc.' + v)} />
            </div>
            {/* 评分 */}
            <div style={filtRow}>
              <span style={filtLabel}>{t('filter.score')}</span>
              <Sel value={fScore} onChange={setFScore} opts={['high', 'mid', 'low']} all={t('all.score')} labelOf={(v) => t('sc.' + v)} />
            </div>
            {/* 薪资(年薪 + vs中位) */}
            <div style={filtRow}>
              <span style={filtLabel}>{t('filter.salary')}</span>
              <Sel value={fSal} onChange={setFSal} opts={['ge100', '80', '60', 'u60']} all={t('all.sal')} labelOf={(v) => t('sal.' + v)} />
              <Sel value={fVs} onChange={setFVs} opts={['above', 'above20', 'below']} all={t('all.vs')} labelOf={(v) => t('vs.' + v)} />
            </div>
          </>)}
          {/* 行4:搜索 + 仅第一方 + 清除 */}
          <div style={filtRow}>
            <input placeholder={t('search.placeholder')} value={q} onChange={(e) => setQ(e.target.value)} style={{ ...ctrl, flex: '0 1 320px', minWidth: 180 }} />
            <label style={{ ...ctrl, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: directOnly ? '#eef2ff' : '#fff', whiteSpace: 'nowrap' }} title={t('directOnly.tip')}>
              <input type="checkbox" checked={directOnly} onChange={(e) => setDirectOnly(e.target.checked)} />{t('directOnly')}
            </label>
            <button onClick={() => setShowMore((o) => !o)} style={{ ...ctrl, cursor: 'pointer', background: showMore || moreActive ? '#eef2ff' : '#f3f4f6', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              {t('filter.more')}{moreActive ? ` · ${moreActive}` : ''} <span style={{ fontSize: 11, color: '#9ca3af' }}>{showMore ? '▲' : '▼'}</span>
            </button>
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
            {/* 末列宽设 auto:固定布局下吸收剩余空间,右缘始终贴齐容器,无右侧缝隙 */}
            {hasWidths && <colgroup>{shown.map((c, i) => <col key={c.key} style={{ width: i === shown.length - 1 ? 'auto' : widths[c.key] }} />)}</colgroup>}
            <thead>
              <tr ref={headRowRef} style={{ textAlign: 'left', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {shown.map((c, idx) => {
                  const active = sort.key === c.key
                  const isLast = idx === shown.length - 1
                  const handle = (  // 列右缘竖线:拖动调本列宽 / 双击按内容自适应
                    <span className="colResize" onMouseDown={(e) => startResize(e, c.key)} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => { e.stopPropagation(); autoFitColumn(idx, c.key) }} title={t('resize.tip')}
                      style={{ position: 'absolute', top: 0, right: 0, width: 13, height: '100%', cursor: 'col-resize', zIndex: 2 }} />
                  )
                  if (c.key === 'actions') return (  // 操作列:普通末列,不排序(取消 sticky —— 冻结会盖住左侧数据列)
                    <th key={c.key} style={{ padding: '8px 12px', color: '#374151', fontWeight: 600, whiteSpace: 'nowrap', userSelect: 'none', position: 'relative' }}>
                      {t('col.actions')}{handle}
                    </th>
                  )
                  return (
                    <th key={c.key} onClick={() => toggleSort(c.key)} title={t('th.tip')}
                      style={{ padding: '8px 12px', color: active ? '#2563eb' : '#374151', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', position: 'relative', borderRight: isLast ? undefined : '1px solid #e5e7eb' }}>
                      {t('col.' + c.key)}<span style={{ color: active ? '#2563eb' : '#d1d5db', fontSize: 11 }}>{active ? (sort.dir === 'desc' ? ' ▼' : ' ▲') : ' ↕'}</span>{handle}
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
                      if (k === 'actions') return (  // 操作列:普通末列,两按钮(公司信息/职位描述)
                        <td key={k} style={{ ...td, whiteSpace: 'nowrap' }}>
                          <button onClick={(e) => { e.stopPropagation(); setActModal({ kind: 'company', job: j }) }} style={actBtn}>{t('act.company')}</button>
                          <button onClick={(e) => { e.stopPropagation(); setActModal({ kind: 'desc', job: j }) }} style={{ ...actBtn, marginLeft: 6 }}>{t('act.desc')}</button>
                        </td>
                      )
                      let href: string | null = null
                      let node: React.ReactNode
                      const extra: React.CSSProperties = {}
                      if (k === 'score') { node = j.score ?? '—'; Object.assign(extra, { fontWeight: 500, color: scoreColor(j.score) }) }
                      else if (k === 'broad') { node = broadLabel(j.broad); Object.assign(extra, { whiteSpace: 'nowrap', color: cat.fg, fontWeight: 500 }) }
                      else if (k === 'mid') { node = (!j.mid || j.mid === '未分类') ? t('cell.uncat') : j.mid; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'fine') { node = (j.mid === '未分类' || !j.mid) ? '—' : j.fine; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'teer') { node = j.teer == null ? '—' : `TEER ${j.teer}`; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'title') { href = j.applyUrl || null; node = j.title; Object.assign(extra, hasWidths ? wrapCell(360) : clipCell(360)) }
                      else if (k === 'company') { href = j.officialUrl || null; node = j.company; Object.assign(extra, hasWidths ? wrapCell(190) : clipCell(190)) }
                      else if (k === 'noc') node = j.noc || '—'
                      else if (k === 'accessibility') node = t('acc.' + (j.accessibility || 'unknown'))
                      else if (k === 'salary') { node = <span title={j.salary || ''}>{j.salaryText || '—'}</span>; Object.assign(extra, { whiteSpace: 'nowrap', color: j.salary ? '#15803d' : '#9ca3af' }) }
                      else if (k === 'salaryYr') { const a = j.salaryAnnual; node = a != null ? `$${Math.round(a / 1000)}K/yr` : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: a != null ? '#15803d' : '#9ca3af' }) }
                      else if (k === 'wageMedHr') { node = j.wageMedHourly != null ? `$${j.wageMedHourly}/hr` : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: j.wageMedHourly != null ? '#4b5563' : '#9ca3af' }) }
                      else if (k === 'wageMedYr') { const m = j.wageMedAnnual; node = m != null ? `$${Math.round(m / 1000)}K/yr` : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: m != null ? '#4b5563' : '#9ca3af' }) }
                      else if (k === 'vsMedian') { const a = j.salaryAnnual, m = j.wageMedAnnual; if (a != null && m) { const p = Math.round((a / m - 1) * 100); node = `${p >= 0 ? '+' : ''}${p}%`; Object.assign(extra, { whiteSpace: 'nowrap', fontWeight: 600, color: p >= 0 ? '#15803d' : '#b45309' }) } else { node = '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#9ca3af' }) } }
                      else if (k === 'address') { href = j.address ? mapsUrl(j.address) : null; node = j.address || '—'; Object.assign(extra, hasWidths ? wrapCell(220) : clipCell(220)) }
                      else if (k === 'direct') { const dr = isDirect(j); node = dr ? t('cell.first') : t('cell.repost'); Object.assign(extra, { whiteSpace: 'nowrap', color: dr ? '#15803d' : '#9ca3af', fontSize: 12.5 }) }
                      else if (k === 'country') { node = L.country || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'province') { href = mapsFor(L.prov); node = L.prov || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'city') { href = mapsFor(L.city); node = L.city || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'district') { href = mapsFor(L.district); node = L.district || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#1f2937' }) }
                      else if (k === 'source') { href = sourceUrl(j.applyUrl) || null; node = sourceLabel(j); Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'origin') { node = j.origin ? t('origin.' + j.origin) : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'pnp') {  // 三档强度 + 魁省N/A:强=具名紧缺通道(琥珀底色 chip,500)、中=可提名(绿,500)、弱=不符(灰—,400);魁省=紫,400(独立 N/A)
                        const stream = j.pnpStream  // 命中省 inclusion 清单才有,别处看不到的真信号
                        if (j.province === 'QC') { node = t('cell.pnpQc'); Object.assign(extra, { whiteSpace: 'nowrap', color: '#7c3aed', fontSize: 12.5 }) }
                        else if (stream) {       // 强:省点名招 → 浅琥珀底色徽章(全列唯一加底色的一档)
                          node = <span style={{ background: '#fef3c7', color: '#b45309', fontWeight: 500, fontSize: 12, padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>{stream}</span>
                          Object.assign(extra, { whiteSpace: 'nowrap' })
                        }
                        else if (j.pnpEligible) { node = t('cell.pnpSkilled'); Object.assign(extra, { whiteSpace: 'nowrap', color: '#15803d', fontWeight: 500, fontSize: 12.5 }) }  // 中:可提名
                        else { node = '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#9ca3af', fontSize: 12.5 }) }  // 弱:不符
                      }
                      else if (k === 'ee') {  // 联邦 EE 类别抽选(全国单一源,数据层算);命中→蓝,未列入→—
                        node = j.eeCategory || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: j.eeCategory ? '#2563eb' : '#d1d5db', fontSize: 12.5 })
                      }
                      else if (k === 'aip') { node = j.aip ? t('cell.aipYes') : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: j.aip ? '#b45309' : '#d1d5db', fontSize: 12.5 }) }
                      else if (k === 'status') { const cl = j.status === 'closed'; node = cl ? t('cell.closed') : t('cell.open'); Object.assign(extra, { whiteSpace: 'nowrap', color: cl ? '#9ca3af' : '#15803d', fontSize: 12.5 }) }
                      else if (k === 'closedAt') { node = j.closedAt ? j.closedAt.slice(0, 10) : '—'; Object.assign(extra, { color: '#9ca3af', fontSize: 12.5, whiteSpace: 'nowrap' }) }
                      else if (k === 'datePosted') { node = j.datePosted ? j.datePosted.slice(0, 10) : '—'; Object.assign(extra, { color: '#6b7280', fontSize: 12.5, whiteSpace: 'nowrap' }) }
                      else { node = j.lastSeen ? fmtLocalSec(j.lastSeen) : '—'; Object.assign(extra, { color: '#9ca3af', fontSize: 12.5, whiteSpace: 'nowrap' }) }
                      return (
                        <td key={k} className="jcell" style={{ ...td, ...extra, cursor: 'pointer', borderRight: idx === shown.length - 1 ? undefined : '1px solid #f3f4f6', ...(hasWidths ? { whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'break-word' } : null) }} title={typeof node === 'string' ? node : undefined} onClick={() => open(k, typeof node === 'string' ? node : (j.salaryText || j.salary || ''))}>
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

      {popup && <AdvisorModal field={popup.field} job={popup.job} title={popup.title} lang={lang} pnpOcc={dims.pnpOccupations} eeOcc={dims.eeCategories} desigEmp={dims.designatedEmployers} onClose={() => setPopup(null)} />}
      {actModal && <ActModal kind={actModal.kind} job={actModal.job} jobs={jobs} lang={lang} onClose={() => setActModal(null)} />}
    </div>
  )
}

// ── 省提名清单区(点 PNP 字段时显示)────────────────────────────
// 清单是权威「事实」,来自 DB 维度表(pnp-occupations,经 props 传入),绝不让 LLM 编。
// 判定只用本岗既有字段(province/noc/teer)+ 清单比对,不在前端重算资格逻辑。
type PnpStream = { stream: string; label: string; type: string; url: string; fetched: string; occupations: { noc: string; name: string; gtaRestricted: boolean }[] }
function PnpListSection({ job, lang, occ }: { job: JobRow; lang: Lang; occ: PnpOcc[] }) {
  const t = makeT(lang)
  const matchRef = useRef<HTMLDivElement | null>(null)
  const isQc = job.province === 'QC'
  // 从扁平维度表取本省各通道(按 label 分组)
  const streams = useMemo<PnpStream[]>(() => {
    if (isQc || !job.province) return []
    const byLabel = new Map<string, PnpStream>()
    for (const r of occ) {
      if (r.province !== job.province) continue
      let s = byLabel.get(r.label)
      if (!s) { s = { stream: r.stream, label: r.label, type: r.type, url: r.url, fetched: r.fetched, occupations: [] }; byLabel.set(r.label, s) }
      s.occupations.push({ noc: r.noc, name: r.name, gtaRestricted: r.gtaRestricted })
    }
    return [...byLabel.values()]
  }, [occ, job.province, isQc])
  // 高亮行滚进视野(就近滚,尽量不动整个弹框)
  useEffect(() => { matchRef.current?.scrollIntoView({ block: 'nearest' }) }, [streams])

  const noc = job.noc, teer = job.teer, skilled = teer != null && teer <= 3
  let matched: PnpStream | null = null, excluded = false, hasInclusion = false
  for (const s of streams) {
    if (s.type === 'ineligible') { if (s.occupations.some((o) => o.noc === noc)) excluded = true }
    else { hasInclusion = true; if (s.occupations.some((o) => o.noc === noc)) matched = s }
  }
  let verdict = '', tone = '#6b7280'
  if (isQc) { verdict = t('pnplist.qc'); tone = '#7c3aed' }
  else if (streams.length === 0) { verdict = skilled ? t('pnplist.noList') : t('pnplist.notEligible'); tone = skilled ? '#15803d' : '#9ca3af' }
  else if (excluded) { verdict = t('pnplist.excludedHit', { noc }); tone = '#b91c1c' }
  else if (matched) { verdict = t('pnplist.onList', { noc, label: matched.label }); tone = '#b45309' }
  else if (hasInclusion) { verdict = skilled ? t('pnplist.generic', { teer }) : t('pnplist.notEligible'); tone = skilled ? '#15803d' : '#9ca3af' }
  else { verdict = skilled ? t('pnplist.excludedMiss', { teer }) : t('pnplist.notEligible'); tone = skilled ? '#15803d' : '#9ca3af' }

  return (
    <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: tone, marginBottom: 8 }}>{verdict}</div>
      {streams.filter((s) => s.occupations.length).map((s) => (
        <div key={s.label + s.stream} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
            {s.label}{s.url ? <> · <a href={s.url} target="_blank" rel="noreferrer" style={{ ...link, fontSize: 12 }}>{t('pnplist.source')}{s.fetched ? ` (${s.fetched})` : ''} ↗</a></> : null}
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #f3f4f6', borderRadius: 8 }}>
            {s.occupations.map((o) => {
              const hit = o.noc === noc
              return (
                <div key={o.noc + o.name} ref={hit ? matchRef : undefined}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', fontSize: 12.5,
                    background: hit ? '#fef3c7' : undefined, fontWeight: hit ? 600 : 400, color: hit ? '#92400e' : '#374151' }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: hit ? '#92400e' : '#9ca3af' }}>{o.noc}</span>
                  <span style={{ flex: 1 }}>{o.name}</span>
                  {hit && <span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>← {t('pnplist.your')}</span>}
                  {o.gtaRestricted && <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>{t('pnplist.gta')}</span>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 联邦 EE 类别抽选区(点 EE 字段时显示)──────────────────────
// 与 PnpListSection 同理:清单来自 DB 维度表(ee-categories,经 props 传入),全国单一源。
// 命中→只展开该类别清单 + 高亮本岗;未命中→只列出各类别名+数量概览。EE ≠ PNP,独立信号。
type EeCat = { key: string; label: string; occupations: { noc: string; teer: number | null; title: string }[] }
function EeCategorySection({ job, lang, cats }: { job: JobRow; lang: Lang; cats: EeOcc[] }) {
  const t = makeT(lang)
  const matchRef = useRef<HTMLDivElement | null>(null)
  // 扁平维度表按 label 分组
  const grouped = useMemo<EeCat[]>(() => {
    const byLabel = new Map<string, EeCat>()
    for (const r of cats) {
      let c = byLabel.get(r.label)
      if (!c) { c = { key: r.category, label: r.label, occupations: [] }; byLabel.set(r.label, c) }
      c.occupations.push({ noc: r.noc, teer: r.teer, title: r.title })
    }
    return [...byLabel.values()]
  }, [cats])
  useEffect(() => { matchRef.current?.scrollIntoView({ block: 'nearest' }) }, [grouped])

  const noc = job.noc
  const url = cats[0]?.url || '', fetched = cats[0]?.fetched || ''
  const hit = grouped.filter((c) => c.occupations.some((o) => o.noc === noc))
  const shown = hit.length ? hit : grouped  // 命中→只看命中类别清单;未命中→列各类别概览
  return (
    <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: hit.length ? '#2563eb' : '#9ca3af', marginBottom: 6 }}>
        {hit.length ? t('eelist.in', { noc, cats: hit.map((c) => c.label).join('/') }) : t('eelist.out')}
      </div>
      {url ? <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}><a href={url} target="_blank" rel="noreferrer" style={{ ...link, fontSize: 12 }}>{t('eelist.source')}{fetched ? ` (${fetched})` : ''} ↗</a></div> : null}
      {shown.map((c) => (
        <div key={c.key} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{c.label} <span style={{ color: '#9ca3af', fontWeight: 400 }}>· {c.occupations.length}</span></div>
          {hit.length ? (
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #f3f4f6', borderRadius: 8 }}>
              {c.occupations.map((o) => {
                const isHit = o.noc === noc
                return (
                  <div key={o.noc} ref={isHit ? matchRef : undefined}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', fontSize: 12.5,
                      background: isHit ? '#dbeafe' : undefined, fontWeight: isHit ? 600 : 400, color: isHit ? '#1e40af' : '#374151' }}>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: isHit ? '#1e40af' : '#9ca3af' }}>{o.noc}</span>
                    <span style={{ flex: 1 }}>{o.title}</span>
                    {o.teer != null && <span style={{ fontSize: 11, color: '#9ca3af' }}>T{o.teer}</span>}
                    {isHit && <span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>← {t('eelist.your')}</span>}
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

// ── 弹框上半:每字段「事实块」(凭证)—— 值 + 口径,绝不经 LLM ──────
// 框架:按 field 分支。pnp/ee 用既有清单组件;其余「零成本」字段(地点/薪资/分类/来源/经验/时间状态)
// 直接读 job 已加载的真实字段渲染。依赖 Part B 抓取的字段(职位 JD / 公司简介 / 官方职责 / 门槛 / 抽选线)留待后续填。
function FactRow({ k, children }: { k: React.ReactNode; children: React.ReactNode }) {
  if (children == null || children === '' || children === '—') return null
  return (
    <div style={{ display: 'flex', gap: 10, padding: '3px 0', fontSize: 13 }}>
      <span style={{ minWidth: 88, color: '#9ca3af', flexShrink: 0 }}>{k}</span>
      <span style={{ flex: 1, color: '#374151', wordBreak: 'break-word' }}>{children}</span>
    </div>
  )
}
function FactsBox({ children, note }: { children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
      {children}
      {note ? <div style={{ marginTop: 7, fontSize: 11.5, color: '#9ca3af', lineHeight: 1.5 }}>{note}</div> : null}
    </div>
  )
}
// 职位事实块:标题 + 匹配 NOC + 抓取的 JD 正文摘录(走 /api/jobtext,同 ActModal desc;列表 SQL 不带 description)
function TitleFacts({ job, lang }: { job: JobRow; lang: Lang }) {
  const t = makeT(lang)
  const [jd, setJd] = useState<string | null>(null)  // null=loading · ''=无正文
  useEffect(() => {
    const ctrl = new AbortController()
    ;(async () => {
      try {
        const res = await fetch('/api/jobtext?url=' + encodeURIComponent(job.applyUrl || ''), { signal: ctrl.signal })
        setJd((await res.text()).trim())
      } catch { if (!ctrl.signal.aborted) setJd('') }
    })()
    return () => ctrl.abort()
  }, [job])
  return (
    <FactsBox>
      <FactRow k={t('col.title')}>{job.title}</FactRow>
      <FactRow k={t('col.noc')}>{job.noc ? `${job.noc}${job.teer != null ? ` · TEER ${job.teer}` : ''}` : null}</FactRow>
      <div style={{ marginTop: 8, fontSize: 11.5, color: '#9ca3af' }}>{t('fact.jdExcerpt')}</div>
      {jd === null ? <div style={{ marginTop: 4, fontSize: 12.5, color: '#9ca3af' }}>{t('act.loadingText')}</div>
        : jd ? <div style={{ marginTop: 4, fontSize: 12.5, color: '#4b5563', whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 180, overflowY: 'auto', border: '1px solid #f3f4f6', borderRadius: 8, padding: '8px 10px' }}>{jd.slice(0, 900)}</div>
        : <div style={{ marginTop: 4, fontSize: 12.5, color: '#9ca3af' }}>{t('act.noText')}</div>}
    </FactsBox>
  )
}
// 公司名归一(镜像 etl/clean/05c_flag_aip.py 的 norm_name)—— 用于把岗位公司名匹配回 AIP 指定雇主记录
const AIP_SUFFIX = /\b(inc|incorporated|ltd|limited|llp|llc|corp|corporation|co|company|enr|ltee|ltée|holdings?|group|services?|enterprises?)\b\.?/gi
const normName = (name?: string) => (name || '').toLowerCase()
  .split(/\bo\/a\b|\bdba\b|\bd\/b\/a\b/)[0]
  .replace(AIP_SUFFIX, ' ').replace(/[^a-z0-9& ]/g, ' ').replace(/\s+/g, ' ').trim()
const ATLANTIC = new Set(['NL', 'NB', 'NS', 'PE'])
// 评分明细(镜像 etl/08_score.py 的 score())—— 前端同步重建,供「评分」事实块展示。
// 关键:+12 是「省具名通道命中」(NAMED_STREAM_NOCS_BY_PROV = 各省 pnp 清单 nocs 并集),
// 由 pnpOccupations 维度按 (省, noc) 判定 —— 不是写死的低TEER集合(那是旧 route.ts 的错,会对不上库里分数)。
const SCORE_TEER_BASE: Record<number, number> = { 0: 54, 1: 56, 2: 52, 3: 46, 4: 28, 5: 20 }
const SCORE_INDEMAND2 = new Set(['21', '22', '31', '32', '72', '73', '42'])
const SCORE_ACC: Record<string, number> = { 'co-op': 6, junior: 6, intermediate: 4, senior: 2, unknown: 3 }
const SCORE_AGENCY = /recruit|staffing|talent|personnel|placement|outsourc|mercor|adecco|randstad/i
function scoreBreakdown(job: JobRow, named: boolean) {
  const noc = job.noc || '', teer = job.teer
  const base = teer == null ? 18 : (SCORE_TEER_BASE[teer] ?? 18)
  const indemand = noc && SCORE_INDEMAND2.has(noc.slice(0, 2)) ? 10 : 0
  const namedPts = named ? 12 : 0
  const direct = SCORE_AGENCY.test(job.company || '') ? 0 : 12
  const acc = SCORE_ACC[job.accessibility || 'unknown'] ?? 3
  const prov = job.province && job.province !== 'ON' ? -6 : 0
  return { base, indemand, named: namedPts, direct, acc, prov, teer, total: Math.max(0, Math.min(100, base + indemand + namedPts + direct + acc + prov)) }
}
const LOC_FIELDS = new Set<ColKey>(['country', 'province', 'city', 'district', 'address'])
const SAL_FIELDS = new Set<ColKey>(['salary', 'salaryYr', 'wageMedHr', 'wageMedYr', 'vsMedian'])
const CLS_FIELDS = new Set<ColKey>(['noc', 'teer', 'broad', 'mid', 'fine'])
const SRC_FIELDS = new Set<ColKey>(['source', 'origin', 'direct'])
const TIME_FIELDS = new Set<ColKey>(['status', 'datePosted', 'lastSeen', 'closedAt'])
function FieldFactsSection({ field, job, lang, pnpOcc, eeOcc, desigEmp }: { field: ColKey; job: JobRow; lang: Lang; pnpOcc: PnpOcc[]; eeOcc: EeOcc[]; desigEmp: DesigEmp[] }) {
  const t = makeT(lang)
  if (field === 'pnp') return <PnpListSection job={job} lang={lang} occ={pnpOcc} />
  if (field === 'ee') return <EeCategorySection job={job} lang={lang} cats={eeOcc} />
  if (field === 'title') return <TitleFacts job={job} lang={lang} />
  const day = (s?: string) => (s || '').slice(0, 10)

  if (field === 'company') {
    const desc = job.companyDescription
    return (
      <FactsBox note={desc ? undefined : t('fact.coNone')}>
        <FactRow k={t('col.company')}>{job.company}</FactRow>
        {job.officialUrl ? <FactRow k={t('act.site')}><a href={job.officialUrl} target="_blank" rel="noreferrer" style={{ ...link, fontSize: 12.5 }}>{job.officialUrl}</a></FactRow> : null}
        <FactRow k={t('fact.coSectors')}>{job.companySectors}</FactRow>
        {desc ? <>
          <div style={{ marginTop: 8, fontSize: 11.5, color: '#9ca3af' }}>{t('fact.coIntro')}</div>
          <div style={{ marginTop: 4, fontSize: 12.5, color: '#4b5563', whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 180, overflowY: 'auto', border: '1px solid #f3f4f6', borderRadius: 8, padding: '8px 10px' }}>{desc}</div>
        </> : null}
      </FactsBox>
    )
  }
  const sg = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

  if (field === 'score') {
    const named = !!job.noc && pnpOcc.some((o) => o.province === job.province && o.noc === job.noc)
    const b = scoreBreakdown(job, named)
    return (
      <FactsBox note={t('fact.scoreNote')}>
        <FactRow k={t('score.base')}>{`${b.base}  (${b.teer == null ? t('cell.uncat') : 'TEER ' + b.teer})`}</FactRow>
        {b.indemand ? <FactRow k={t('score.indemand')}>{sg(b.indemand)}</FactRow> : null}
        {b.named ? <FactRow k={t('score.low')}>{sg(b.named)}</FactRow> : null}
        <FactRow k={t('score.direct')}>{sg(b.direct)}</FactRow>
        <FactRow k={t('score.exp')}>{sg(b.acc)}</FactRow>
        {b.prov ? <FactRow k={t('score.prov')}>{sg(b.prov)}</FactRow> : null}
        <FactRow k={t('score.total')}><strong style={{ color: '#111827' }}>{b.total}{job.score != null && job.score !== b.total ? `  (${t('score.stored')} ${job.score})` : ''}</strong></FactRow>
      </FactsBox>
    )
  }

  if (field === 'aip') {
    const cn = normName(job.company)
    const matches = ATLANTIC.has(job.province) && cn
      ? desigEmp.filter((e) => e.province === job.province && normName(e.name) === cn)
      : []
    return (
      <FactsBox note={t('fact.aipNote')}>
        <FactRow k={t('col.aip')}>{job.aip ? t('cell.aipYes') : '—'}</FactRow>
        {matches.map((e, i) => (
          <FactRow key={i} k={e.name}>{[e.location, e.province, e.isTech ? t('fact.aipTech') : null].filter(Boolean).join(' · ')}</FactRow>
        ))}
      </FactsBox>
    )
  }

  if (LOC_FIELDS.has(field)) {
    const L = parseLoc(job)
    const full = [job.address, L.district, L.city, L.prov].filter(Boolean).join(', ')
    return (
      <FactsBox>
        <FactRow k={t('col.country')}>{L.country || 'Canada'}</FactRow>
        <FactRow k={t('col.province')}>{L.prov}</FactRow>
        <FactRow k={t('col.city')}>{L.city}</FactRow>
        <FactRow k={t('col.district')}>{L.district}</FactRow>
        <FactRow k={t('col.address')}>{job.address}</FactRow>
        {full ? <FactRow k="🗺"><a href={mapsUrl(full)} target="_blank" rel="noreferrer" style={{ ...link, fontSize: 12.5 }}>{full} ↗</a></FactRow> : null}
      </FactsBox>
    )
  }
  if (SAL_FIELDS.has(field)) {
    const a = job.salaryAnnual, mHr = job.wageMedHourly, mYr = job.wageMedAnnual
    const lHr = job.wageLowHourly, hHr = job.wageHighHourly, lYr = job.wageLowAnnual, hYr = job.wageHighAnnual
    const vs = a != null && mYr ? Math.round((a / mYr - 1) * 100) : null
    const K = (n: number) => `$${Math.round(n / 1000)}K`
    const bandHr = mHr != null ? `${lHr != null ? `$${lHr} – ` : ''}$${mHr}${hHr != null ? ` – $${hHr}` : ''}/hr` : null
    const bandYr = mYr != null ? `${lYr != null ? `${K(lYr)} – ` : ''}${K(mYr)}${hYr != null ? ` – ${K(hYr)}` : ''}/yr` : null
    return (
      <FactsBox note={t('fact.medianSrc') + (job.wageYear ? ` · ${job.wageYear}` : '') + (vs != null ? ' · ' + t('fact.vsNote') : '')}>
        <FactRow k={t('col.salary')}>{job.salaryText || job.salary}</FactRow>
        <FactRow k={t('col.salaryYr')}>{a != null ? `$${Math.round(a / 1000)}K/yr` : null}</FactRow>
        <FactRow k={t('fact.wageBandHr')}>{bandHr}</FactRow>
        <FactRow k={t('fact.wageBandYr')}>{bandYr}</FactRow>
        <FactRow k={t('col.vsMedian')}>{vs != null ? `${vs >= 0 ? '+' : ''}${vs}%` : null}</FactRow>
      </FactsBox>
    )
  }
  if (CLS_FIELDS.has(field)) {
    return (
      <FactsBox>
        <FactRow k={t('col.noc')}>{job.noc}</FactRow>
        <FactRow k={t('col.teer')}>{job.teer != null ? `TEER ${job.teer}` : null}</FactRow>
        <FactRow k={t('col.broad')}>{job.broad && job.broad !== '未分类' ? t('broad.' + job.broad) : null}</FactRow>
        <FactRow k={t('col.mid')}>{job.mid && job.mid !== '未分类' ? job.mid : null}</FactRow>
        <FactRow k={t('col.fine')}>{job.fine && job.fine !== '未分类' ? job.fine : null}</FactRow>
      </FactsBox>
    )
  }
  if (SRC_FIELDS.has(field)) {
    return (
      <FactsBox note={t('fact.sourceNote')}>
        <FactRow k={t('col.source')}>{job.sourceLabel || job.source}</FactRow>
        <FactRow k={t('col.origin')}>{job.origin}</FactRow>
        <FactRow k={t('col.direct')}>{isDirect(job) ? t('fact.firstParty') : t('fact.repost')}</FactRow>
      </FactsBox>
    )
  }
  if (field === 'accessibility') {
    return <FactsBox><FactRow k={t('col.accessibility')}>{t('acc.' + (job.accessibility || 'unknown'))}</FactRow></FactsBox>
  }
  if (TIME_FIELDS.has(field)) {
    return (
      <FactsBox note={t('fact.timeNote')}>
        <FactRow k={t('col.status')}>{t(job.status === 'closed' ? 'cell.closed' : 'cell.open')}</FactRow>
        <FactRow k={t('col.datePosted')}>{day(job.datePosted)}</FactRow>
        <FactRow k={t('col.firstSeen')}>{day(job.firstSeen)}</FactRow>
        <FactRow k={t('col.lastSeen')}>{day(job.lastSeen)}</FactRow>
        <FactRow k={t('col.closedAt')}>{job.closedAt ? day(job.closedAt) : null}</FactRow>
      </FactsBox>
    )
  }
  return null  // title/company/noc-职责/aip/score 等依赖 Part B 抓取或 wiring,后续填
}

// ── AI 顾问弹框 ────────────────────────────────────────────────
// 所有字段都走本地大模型流式生成(按所选语言);前端只给极简头部 + 链接,正文由模型生成。
const ADV_PREF = 'adv_modal_pref'  // 记忆 {full, w, h}(位置每次打开居中,避免窗口缩小后跑出屏外)
function AdvisorModal({ field, job, title, lang, pnpOcc, eeOcc, desigEmp, onClose }: { field: ColKey; job: JobRow; title?: string; lang: Lang; pnpOcc: PnpOcc[]; eeOcc: EeOcc[]; desigEmp: DesigEmp[]; onClose: () => void }) {
  const t = makeT(lang)
  const a = advHeader(field, job, t)
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'loading' | 'streaming' | 'done' | 'error'>('loading')

  // 弹框尺寸/全屏/位置 —— 默认更大(720×620),可全屏、标题栏拖动、右下角拉伸;尺寸+全屏记忆
  const [full, setFull] = useState(false)
  const [size, setSize] = useState({ w: 720, h: 620 })
  const [pos, setPos] = useState(() => {
    if (typeof window === 'undefined') return { x: 80, y: 60 }
    const w = Math.min(720, window.innerWidth - 24), h = Math.min(620, window.innerHeight - 24)
    return { x: Math.max(12, (window.innerWidth - w) / 2), y: Math.max(12, (window.innerHeight - h) / 2) }
  })
  const sizeRef = useRef(size); sizeRef.current = size
  useEffect(() => {  // 载入记忆的尺寸/全屏,并按记忆尺寸重新居中
    try {
      const p = JSON.parse(localStorage.getItem(ADV_PREF) || '{}')
      if (p.full) setFull(true)
      if (p.w && p.h) {
        const w = Math.min(p.w, window.innerWidth - 24), h = Math.min(p.h, window.innerHeight - 24)
        setSize({ w: p.w, h: p.h })
        setPos({ x: Math.max(12, (window.innerWidth - w) / 2), y: Math.max(12, (window.innerHeight - h) / 2) })
      }
    } catch { /* ignore */ }
  }, [])
  const savePref = (next: Record<string, unknown>) => {
    try { localStorage.setItem(ADV_PREF, JSON.stringify({ ...JSON.parse(localStorage.getItem(ADV_PREF) || '{}'), ...next })) } catch { /* ignore */ }
  }

  // 拖动(标题栏)/ 拉伸(右下角)—— 原生 pointer 事件,无依赖
  const startDrag = (e: React.PointerEvent) => {
    if (full) return
    e.preventDefault()
    const ox = e.clientX - pos.x, oy = e.clientY - pos.y
    const move = (ev: PointerEvent) => setPos({ x: ev.clientX - ox, y: ev.clientY - oy })
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
  const startResize = (e: React.PointerEvent) => {
    if (full) return
    e.preventDefault(); e.stopPropagation()
    const sx = e.clientX, sy = e.clientY, sw = size.w, sh = size.h
    const move = (ev: PointerEvent) => setSize({ w: Math.max(360, sw + ev.clientX - sx), h: Math.max(280, sh + ev.clientY - sy) })
    const up = () => { savePref({ w: sizeRef.current.w, h: sizeRef.current.h }); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }

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

  const panel: React.CSSProperties = full
    ? { position: 'fixed', inset: 0, borderRadius: 0 }
    : { position: 'fixed', left: pos.x, top: pos.y, width: size.w, height: size.h, borderRadius: 12 }
  const iconBtn: React.CSSProperties = { border: 'none', background: '#f3f4f6', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 15, color: '#6b7280', flexShrink: 0, lineHeight: 1 }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.45)', zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...panel, background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,.25)', overflow: 'hidden' }}>
        {/* 标题栏 = 拖动手柄 */}
        <div onPointerDown={startDrag} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '14px 18px 10px', cursor: full ? 'default' : 'move', userSelect: 'none', flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, letterSpacing: .3 }}>{t('advisor.tag')} · {a.tag}{status === 'streaming' ? t('advisor.generating') : ''}</div>
            <h3 style={{ margin: '4px 0 0', fontSize: 17, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title || a.title}</h3>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={() => setFull((f) => { savePref({ full: !f }); return !f })} title={t(full ? 'advisor.exitFull' : 'advisor.full')} style={iconBtn}>{full ? '🗗' : '⛶'}</button>
            <button onClick={onClose} style={{ ...iconBtn, fontSize: 16 }}>×</button>
          </div>
        </div>
        {/* 正文(可滚动):上半真实清单 + 下半 AI 建议 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 18px' }}>
          <FieldFactsSection field={field} job={job} lang={lang} pnpOcc={pnpOcc} eeOcc={eeOcc} desigEmp={desigEmp} />
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
          {/* 下半:对话框 —— 基于上方事实 + 初判,多轮 grounded 追问 */}
          {status === 'done' && <AdvisorChat field={field} job={job} lang={lang} initialJudgment={text} />}
        </div>
        {/* 右下角拉伸手柄 */}
        {!full && <div onPointerDown={startResize} style={{ position: 'absolute', right: 0, bottom: 0, width: 18, height: 18, cursor: 'nwse-resize', background: 'linear-gradient(135deg, transparent 50%, #cbd5e1 50%)' }} />}
      </div>
    </div>
  )
}

// ── 顾问对话框(弹框下半)──────────────────────────────────────
// 多轮 grounded chat:把「初判」当首个 assistant 轮喂回去保连续性;后端 system 始终带整条岗位事实 + 铁律。
type ChatMsg = { role: 'user' | 'assistant'; content: string }
function AdvisorChat({ field, job, lang, initialJudgment }: { field: ColKey; job: JobRow; lang: Lang; initialJudgment: string }) {
  const t = makeT(lang)
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }) }, [msgs])

  const send = async () => {
    const q = input.trim()
    if (!q || busy) return
    const convo = [...msgs, { role: 'user' as const, content: q }]
    setMsgs([...convo, { role: 'assistant', content: '' }])  // 占位,流进去
    setInput(''); setBusy(true)
    // 喂回初判作首个 assistant 轮 → 用户可"你刚才说的…";后端 system 另带事实
    const payload: ChatMsg[] = [{ role: 'assistant', content: initialJudgment }, ...convo]
    try {
      const res = await fetch('/api/advisor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, id: String(job.id), job, lang, messages: payload }),
      })
      if (!res.ok || !res.body) {
        setMsgs((m) => { const c = [...m]; c[c.length - 1] = { role: 'assistant', content: t('advisor.failed', { code: res.status }) }; return c })
      } else {
        const reader = res.body.getReader(); const dec = new TextDecoder()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          const d = dec.decode(value, { stream: true })
          setMsgs((m) => { const c = [...m]; c[c.length - 1] = { role: 'assistant', content: c[c.length - 1].content + d }; return c })
        }
      }
    } catch {
      setMsgs((m) => { const c = [...m]; c[c.length - 1] = { role: 'assistant', content: t('advisor.offline') }; return c })
    }
    setBusy(false)
  }

  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', marginBottom: 8 }}>{t('advisor.chatTitle')}</div>
      {msgs.map((m, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
          <div style={{ maxWidth: '85%', padding: '7px 11px', borderRadius: 10, fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-wrap',
            background: m.role === 'user' ? '#eef2ff' : '#f9fafb', color: '#374151' }}>
            {m.role === 'assistant' && !m.content ? <span style={{ color: '#9ca3af' }}>▋</span> : m.content}
          </div>
        </div>
      ))}
      <div ref={endRef} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={t('advisor.chatPlaceholder')}
          style={{ flex: 1, height: 36, boxSizing: 'border-box', padding: '0 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13.5, color: '#1f2937', background: '#fff' }} />
        <button onClick={send} disabled={busy || !input.trim()}
          style={{ border: 'none', background: busy || !input.trim() ? '#c7d2fe' : '#6366f1', color: '#fff', borderRadius: 8, padding: '0 14px', height: 36, cursor: busy || !input.trim() ? 'default' : 'pointer', fontSize: 13.5, flexShrink: 0 }}>
          {t('advisor.chatSend')}
        </button>
      </div>
      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>{t('advisor.chatHint')}</div>
    </div>
  )
}

// ── 操作列弹框:公司基本信息(前端组装) / 职位描述(读真实抓取的 .md 正文)────
function ActRow({ label, value }: { label: string; value: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 10, padding: '3px 0' }}><span style={{ minWidth: 48, color: '#9ca3af', flexShrink: 0 }}>{label}</span><span style={{ flex: 1, color: '#374151', wordBreak: 'break-word' }}>{value}</span></div>
}
function ActModal({ kind, job, jobs, lang, onClose }: { kind: 'company' | 'desc'; job: JobRow; jobs: JobRow[]; lang: Lang; onClose: () => void }) {
  const t = makeT(lang)
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'loading' | 'done' | 'empty'>(kind === 'desc' ? 'loading' : 'done')
  useEffect(() => {
    if (kind !== 'desc') return
    const ctrl = new AbortController()
    setStatus('loading'); setText('')
    ;(async () => {
      try {
        const res = await fetch('/api/jobtext?url=' + encodeURIComponent(job.applyUrl || ''), { signal: ctrl.signal })
        const txt = (await res.text()).trim()
        setText(txt); setStatus(txt ? 'done' : 'empty')
      } catch { if (!ctrl.signal.aborted) setStatus('empty') }
    })()
    return () => ctrl.abort()
  }, [kind, job])
  const sameCo = kind === 'company' ? jobs.filter((x) => x.company && x.company === job.company) : []
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, maxWidth: 560, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '16px 20px 8px' }}>
          <div>
            <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}>{kind === 'company' ? t('act.companyTitle') : t('act.descTitle')}</div>
            <h3 style={{ margin: '4px 0 0', fontSize: 17, color: '#111827' }}>{(kind === 'company' ? job.company : job.title) || job.title || '—'}</h3>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f3f4f6', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 16, color: '#6b7280', flexShrink: 0 }}>×</button>
        </div>
        <div style={{ padding: '4px 20px 20px', fontSize: 14, lineHeight: 1.7, color: '#374151' }}>
          {kind === 'company' ? (
            <div>
              <ActRow label={t('col.company')} value={job.company || '—'} />
              {job.officialUrl && <ActRow label={t('act.site')} value={<a href={job.officialUrl} target="_blank" rel="noreferrer" style={link}>{job.officialUrl}</a>} />}
              <ActRow label={t('act.addr')} value={job.address || [job.city, job.province].filter(Boolean).join(', ') || '—'} />
              <ActRow label={t('act.src')} value={job.sourceLabel || job.source || '—'} />
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f3f4f6' }}>
                <div style={{ fontWeight: 600, color: '#111827', marginBottom: 6 }}>{t('act.jobsHere')} ({sameCo.length})</div>
                {sameCo.slice(0, 40).map((x) => (
                  <div key={x.id} style={{ padding: '2px 0', color: x.id === job.id ? '#2563eb' : '#4b5563' }}>· {x.title}{x.city ? ` — ${x.city}` : ''}</div>
                ))}
              </div>
            </div>
          ) : (
            status === 'loading' ? <p style={{ color: '#9ca3af' }}>{t('act.loadingText')}</p>
              : status === 'empty' ? <p style={{ color: '#9ca3af' }}>{t('act.noText')}</p>
                : <div style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
          )}
        </div>
      </div>
    </div>
  )
}

// 把 AI 文本里的【小标题】加粗,保留换行
function renderAI(text: string): React.ReactNode {
  return text.split(/(【[^】]+】)/g).map((seg, i) => {
    if (/^【[^】]+】$/.test(seg)) return <strong key={i} style={{ display: 'block', marginTop: i ? 10 : 0, marginBottom: 2, color: '#111827' }}>{seg}</strong>
    const body = seg.replace(/^\n+/, '').replace(/\n+$/, '').replace(/\n{3,}/g, '\n\n')  // 去段首尾空行+压多余空行,免大空隙
    return body ? <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{body}</span> : null
  })
}

// ── 按字段类型生成顾问解读(基于该行数据;无需 API) ─────────────
// AI 顾问头部:标签(三语,复用列名)+ 上下文标题 + 链接;正文全部由 /api/advisor 大模型按所选语言生成。
function advHeader(field: ColKey, j: JobRow, t: TFn): { tag: string; title: string; links: { label: string; href: string }[] } {
  const links: { label: string; href: string }[] = []
  if (j.applyUrl) links.push({ label: t('advisor.applyLink'), href: j.applyUrl })
  if (j.officialUrl) links.push({ label: t('advisor.siteLink'), href: j.officialUrl })
  return { tag: t('col.' + field), title: j.title || j.company || '—', links }
}

// 5 档综合价值色阶(分位 ~37/55/64/72):灰底 → 4 级绿越高越深(数字本身给精度,颜色作梯度强化)
const scoreColor = (s: number | null) => (
  s == null ? '#9ca3af'
    : s >= 72 ? '#166534'   // 高
    : s >= 64 ? '#15803d'   // 中高
    : s >= 55 ? '#16a34a'   // 中
    : s >= 38 ? '#65a30d'   // 中低
    : '#9ca3af'             // 低 → 灰
)
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
const td: React.CSSProperties = { padding: '7px 12px', verticalAlign: 'top' }
// 按词换行(不逐字断词);不设 wordBreak 以免列被挤成 1 字符宽
const wrapCell = (w: number): React.CSSProperties => ({ maxWidth: w, whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'normal' })
// 默认(自动布局)长文本列单行截断 + 省略号,保持行紧凑;仅当用户拖窄列(hasWidths)才换行展开
const clipCell = (w: number): React.CSSProperties => ({ maxWidth: w, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })
const link: React.CSSProperties = { color: '#2563eb', textDecoration: 'none' }
const colPanel: React.CSSProperties = { position: 'absolute', top: '110%', right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,.12)', padding: 8, zIndex: 20, minWidth: 210 }
const colBtn: React.CSSProperties = { flex: 1, whiteSpace: 'nowrap', padding: '4px 8px', fontSize: 12.5, border: '1px solid #d1d5db', borderRadius: 5, background: '#f9fafb', color: '#374151', cursor: 'pointer' }
const actBtn: React.CSSProperties = { whiteSpace: 'nowrap', padding: '3px 8px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 5, background: '#fff', color: '#374151', cursor: 'pointer' }
