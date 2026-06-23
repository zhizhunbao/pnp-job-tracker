'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

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
type ColKey = 'score' | 'pnp' | 'aip' | 'broad' | 'mid' | 'fine' | 'teer' | 'title' | 'company' | 'noc' | 'accessibility' | 'salary' | 'salaryYr' | 'country' | 'province' | 'city' | 'district' | 'address' | 'source' | 'origin' | 'direct' | 'status' | 'datePosted' | 'lastSeen' | 'closedAt'
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
const PREF_KEY = 'jobs.visibleCols.v6'
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
  const [visible, setVisible] = useState<ColKey[]>(DEFAULT_COLS)
  const [popup, setPopup] = useState<{ field: ColKey; job: JobRow } | null>(null)
  const [sort, setSort] = useState<{ key: ColKey; dir: 'asc' | 'desc' }>({ key: 'datePosted', dir: 'desc' })
  const [colOpen, setColOpen] = useState(false)
  const colRef = useRef<HTMLDivElement>(null)
  const [limit, setLimit] = useState(60)          // 滚动分页:当前渲染行数
  const sentinelRef = useRef<HTMLDivElement>(null)
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
  useEffect(() => { setLimit(60) }, [q, directOnly, fCountry, fProv, fCity, fDistrict, fBroad, fMid, fFine, fTeer, fSource, fAcc, sort])
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) setLimit((l) => l + 60) }, { rootMargin: '400px' })
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
  const accOpts = useMemo(() => (dims.experienceLevels.length ? uniq(dims.experienceLevels.map((e) => accLabel[e.name] ?? '—')) : uniq(jobs.map((j) => accLabel[j.accessibility] ?? '—'))), [dims, jobs])
  const anyFilter = q || directOnly || fCountry || fProv || fCity || fDistrict || fBroad || fMid || fFine || fTeer || fSource || fAcc
  const clearAll = () => { setQ(''); setDirectOnly(false); setFCountry(''); setFProv(''); setFCity(''); setFDistrict(''); setFBroad(''); setFMid(''); setFFine(''); setFTeer(''); setFSource(''); setFAcc('') }

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    const filtered = jobs.filter((j) => {
      const L = parseLoc(j)
      return (!directOnly || isDirect(j)) &&
        (!fCountry || L.country === fCountry) && (!fProv || L.prov === fProv) && (!fCity || L.city === fCity) && (!fDistrict || L.district === fDistrict) &&
        (!fBroad || j.broad === fBroad) && (!fMid || j.mid === fMid) && (!fFine || j.fine === fFine) &&
        (!fTeer || (j.teer == null ? '未分类' : `TEER ${j.teer}`) === fTeer) &&
        (!fSource || sourceLabel(j) === fSource) && (!fAcc || (accLabel[j.accessibility] ?? '—') === fAcc) &&
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
  }, [jobs, q, directOnly, fCountry, fProv, fCity, fDistrict, fBroad, fMid, fFine, fTeer, fSource, fAcc, sort])

  return (
    <div style={{ background: '#fff', color: '#1f2937', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`.jcell:hover{background:#eff6ff !important}`}</style>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '1.5rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap' }}>
          <h1 style={{ margin: '0 0 2px', color: '#111827' }}>Jobs</h1>
          {updatedAt && <span style={{ color: '#9ca3af', fontSize: 12.5, whiteSpace: 'nowrap' }}>更新 {updatedAt.slice(0, 16).replace('T', ' ')}</span>}
        </div>
        <p style={{ color: '#6b7280', marginTop: 0, fontSize: 13 }}>
          {rows.length === jobs.length ? `${jobs.length} 个职位` : `${rows.length} / ${jobs.length}`} · 评分排序
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '1rem 0' }}>
          {/* 行1:地理(国家→省→市→区 联动) */}
          <div style={filtRow}>
            <span style={filtLabel}>地理</span>
            <Sel value={fCountry} onChange={(v) => { setFCountry(v); setFProv(''); setFCity(''); setFDistrict('') }} opts={countryOpts} all="全部国家" />
            <Sel value={fProv} onChange={(v) => { setFProv(v); setFCity(''); setFDistrict('') }} opts={provOpts} all="全部省" />
            <Sel value={fCity} onChange={(v) => { setFCity(v); setFDistrict('') }} opts={cityOpts} all="全部市" />
            <Sel value={fDistrict} onChange={setFDistrict} opts={distOpts} all="全部区" />
          </div>
          {/* 行2:分类(TEER + 大→中→小 联动) */}
          <div style={filtRow}>
            <span style={filtLabel}>分类</span>
            <Sel value={fTeer} onChange={setFTeer} opts={teerOpts} all="全部 TEER" />
            <Sel value={fBroad} onChange={(v) => { setFBroad(v); setFMid(''); setFFine('') }} opts={broadOpts} all="全部大类" />
            <Sel value={fMid} onChange={(v) => { setFMid(v); setFFine('') }} opts={midOpts} all="全部中类" />
            <Sel value={fFine} onChange={setFFine} opts={fineOpts} all="全部小类" />
          </div>
          {/* 行3:属性 */}
          <div style={filtRow}>
            <span style={filtLabel}>属性</span>
            <Sel value={fSource} onChange={setFSource} opts={sourceOpts} all="全部来源" />
            <Sel value={fAcc} onChange={setFAcc} opts={accOpts} all="全部经验" />
          </div>
          {/* 行4:搜索 + 仅第一方 + 清除 */}
          <div style={filtRow}>
            <input placeholder="搜索 职位/公司/地点/NOC…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...ctrl, flex: '0 1 320px', minWidth: 180 }} />
            <label style={{ ...ctrl, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: directOnly ? '#eef2ff' : '#fff', whiteSpace: 'nowrap' }} title="只看雇主第一方发布的(公司 ATS / Job Bank 直发),隐藏聚合转贴">
              <input type="checkbox" checked={directOnly} onChange={(e) => setDirectOnly(e.target.checked)} />仅第一方
            </label>
            {anyFilter && <button onClick={clearAll} style={{ ...ctrl, cursor: 'pointer', background: '#f3f4f6', color: '#b91c1c' }}>清除筛选</button>}
            {/* 字段选择:右对齐,与搜索同一行 */}
            <div ref={colRef} style={{ position: 'relative', marginLeft: 'auto' }}>
              <button onClick={() => setColOpen((o) => !o)} style={{ ...ctrl, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', background: '#f3f4f6', whiteSpace: 'nowrap' }}>⚙ 字段 ({shown.length})</button>
              {colOpen && (
                <div style={colPanel}>
                  <div style={{ display: 'flex', gap: 6, padding: '2px 4px 6px', borderBottom: '1px solid #f3f4f6', marginBottom: 4 }}>
                    <button onClick={mainCols} style={{ ...colBtn, fontWeight: 600, color: '#2563eb', borderColor: '#bfdbfe' }}>主要</button>
                    <button onClick={selectAllCols} style={colBtn}>全选</button>
                    <button onClick={invertCols} style={colBtn}>反选</button>
                  </div>
                  {COLUMNS.map((c) => (
                    <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', fontSize: 13, color: c.always ? '#9ca3af' : '#1f2937', cursor: c.always ? 'default' : 'pointer' }}>
                      <input type="checkbox" checked={c.always || visible.includes(c.key)} disabled={c.always} onChange={() => toggleCol(c.key)} />
                      {c.label}{c.always ? ' (固定)' : ''}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflowX: 'auto' }}>
          <table style={{ width: 'auto', minWidth: '100%', borderCollapse: 'collapse', fontSize: 13.5, tableLayout: 'auto' }}>
            <thead>
              <tr style={{ textAlign: 'left', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {shown.map((c) => {
                  const active = sort.key === c.key
                  return (
                    <th key={c.key} onClick={() => toggleSort(c.key)} title="点击表头排序"
                      style={{ padding: '8px 12px', color: active ? '#2563eb' : '#374151', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                      {c.label}<span style={{ color: active ? '#2563eb' : '#d1d5db', fontSize: 11 }}>{active ? (sort.dir === 'desc' ? ' ▼' : ' ▲') : ' ↕'}</span>
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
                const open = (field: ColKey) => setPopup({ field, job: j })
                return (
                  <tr key={j.id} className="jrow" style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 ? '#fcfcfd' : '#fff' }}>
                    {shown.map((c) => {
                      const k = c.key
                      let href: string | null = null
                      let node: React.ReactNode
                      const extra: React.CSSProperties = {}
                      if (k === 'score') { node = j.score ?? '—'; Object.assign(extra, { fontWeight: 600, color: scoreColor(j.score) }) }
                      else if (k === 'broad') { node = j.broad || '未分类'; Object.assign(extra, { whiteSpace: 'nowrap', color: cat.fg, fontWeight: 500 }) }
                      else if (k === 'mid') { node = j.mid || '未分类'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'fine') { node = (j.mid === '未分类' || !j.mid) ? '—' : j.fine; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'teer') { node = j.teer == null ? '—' : `TEER ${j.teer}`; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'title') { href = j.applyUrl || null; node = j.title; Object.assign(extra, wrapCell(360)) }
                      else if (k === 'company') { href = j.officialUrl || null; node = j.company; Object.assign(extra, wrapCell(190)) }
                      else if (k === 'noc') node = j.noc || '—'
                      else if (k === 'accessibility') node = accLabel[j.accessibility] ?? '—'
                      else if (k === 'salary') { node = <span title={j.salary || ''}>{j.salaryText || '—'}</span>; Object.assign(extra, { whiteSpace: 'nowrap', color: j.salary ? '#15803d' : '#9ca3af' }) }
                      else if (k === 'salaryYr') { const a = j.salaryAnnual; node = a != null ? `$${Math.round(a / 1000)}K/yr` : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: a != null ? '#15803d' : '#9ca3af' }) }
                      else if (k === 'address') { href = j.address ? mapsUrl(j.address) : null; node = j.address || '—'; Object.assign(extra, wrapCell(220)) }
                      else if (k === 'direct') { const dr = isDirect(j); node = dr ? '第一方' : '转贴'; Object.assign(extra, { whiteSpace: 'nowrap', color: dr ? '#15803d' : '#9ca3af', fontSize: 12.5 }) }
                      else if (k === 'country') { node = L.country || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'province') { href = mapsFor(L.prov); node = L.prov || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'city') { href = mapsFor(L.city); node = L.city || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'district') { href = mapsFor(L.district); node = L.district || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#1f2937' }) }
                      else if (k === 'source') { href = sourceUrl(j.applyUrl) || null; node = sourceLabel(j); Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'origin') { node = ORIGIN_LABEL[j.origin] || j.origin || '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: '#4b5563' }) }
                      else if (k === 'pnp') { node = j.pnpEligible ? '✅ 可省提名' : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: j.pnpEligible ? '#15803d' : '#d1d5db', fontSize: 12.5 }) }
                      else if (k === 'aip') { node = j.aip ? '🏅 指定雇主' : '—'; Object.assign(extra, { whiteSpace: 'nowrap', color: j.aip ? '#b45309' : '#d1d5db', fontSize: 12.5 }) }
                      else if (k === 'status') { const cl = j.status === 'closed'; node = cl ? '已下架' : '在招'; Object.assign(extra, { whiteSpace: 'nowrap', color: cl ? '#9ca3af' : '#15803d', fontSize: 12.5 }) }
                      else if (k === 'closedAt') { node = j.closedAt ? j.closedAt.slice(0, 10) : '—'; Object.assign(extra, { color: '#9ca3af', fontSize: 12.5, whiteSpace: 'nowrap' }) }
                      else if (k === 'datePosted') { node = j.datePosted ? j.datePosted.slice(0, 10) : '—'; Object.assign(extra, { color: '#6b7280', fontSize: 12.5, whiteSpace: 'nowrap' }) }
                      else { node = j.lastSeen ? j.lastSeen.slice(0, 10) : '—'; Object.assign(extra, { color: '#9ca3af', fontSize: 12.5, whiteSpace: 'nowrap' }) }
                      return (
                        <td key={k} className="jcell" style={{ ...td, ...extra, cursor: 'pointer' }} title={typeof node === 'string' ? node : undefined} onClick={() => open(k)}>
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
                <tr><td colSpan={shown.length} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>无匹配职位</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* 滚动到此自动加载更多 */}
        <div ref={sentinelRef} style={{ textAlign: 'center', padding: '12px', fontSize: 12.5, color: '#9ca3af' }}>
          {rows.length === 0 ? '' : limit < rows.length ? `下滑加载更多 · 已显示 ${Math.min(limit, rows.length)} / ${rows.length}` : `已全部显示 ${rows.length} 个`}
        </div>
      </div>

      {popup && <AdvisorModal field={popup.field} job={popup.job} onClose={() => setPopup(null)} />}
    </div>
  )
}

// ── AI 顾问弹框 ────────────────────────────────────────────────
// 职位/公司 → 调本地大模型流式生成;其余字段 → 模板即时解读
const AI_FIELDS = new Set<ColKey>(['title', 'company'])

function AdvisorModal({ field, job, onClose }: { field: ColKey; job: JobRow; onClose: () => void }) {
  const a = advise(field, job)
  const useAI = AI_FIELDS.has(field)
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'loading' | 'streaming' | 'done' | 'error'>('loading')

  useEffect(() => {
    if (!useAI) return
    const ctrl = new AbortController()
    setText(''); setStatus('loading')
    ;(async () => {
      try {
        const res = await fetch('/api/advisor', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
          body: JSON.stringify({ field, id: String(job.id), job }),
        })
        if (!res.ok || !res.body) { setStatus('error'); setText(`生成失败(${res.status})`); return }
        const reader = res.body.getReader(); const dec = new TextDecoder()
        setStatus('streaming')
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          setText((t) => t + dec.decode(value, { stream: true }))
        }
        setStatus('done')
      } catch {
        if (!ctrl.signal.aborted) { setStatus('error'); setText('无法连接本地大模型(Ollama),请确认服务在线。') }
      }
    })()
    return () => ctrl.abort()
  }, [field, job, useAI])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, maxWidth: 520, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '16px 20px 8px' }}>
          <div>
            <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, letterSpacing: .3 }}>🧭 AI 顾问 · {a.tag}{useAI && status === 'streaming' ? ' · 生成中…' : ''}</div>
            <h3 style={{ margin: '4px 0 0', fontSize: 17, color: '#111827' }}>{a.title}</h3>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f3f4f6', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 16, color: '#6b7280', flexShrink: 0 }}>×</button>
        </div>
        <div style={{ padding: '4px 20px 20px' }}>
          {useAI ? (
            status === 'loading' ? (
              <p style={{ margin: '10px 0', fontSize: 14, color: '#9ca3af' }}>⏳ 本地大模型生成中,请稍候…</p>
            ) : (
              <div style={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}>{renderAI(text)}{status === 'streaming' && <span style={{ color: '#9ca3af' }}>▋</span>}</div>
            )
          ) : (
            a.body.map((p, i) => (
              <p key={i} style={{ margin: '10px 0', fontSize: 14, lineHeight: 1.6, color: '#374151' }}>{p}</p>
            ))
          )}
          {a.links.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #f3f4f6', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {a.links.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer" style={{ ...link, fontSize: 13, background: '#eef2ff', padding: '6px 12px', borderRadius: 8 }}>{l.label} ↗</a>
              ))}
            </div>
          )}
          <p style={{ marginTop: 14, fontSize: 11.5, color: '#9ca3af' }}>{useAI ? '由本地大模型生成 · 可能有误,仅供参考' : '说明由榜单数据自动生成 · 仅供参考,不构成移民/法律建议'}</p>
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
type Advice = { tag: string; title: string; body: string[]; links: { label: string; href: string }[] }

const TEER_DESC: Record<number, string> = {
  0: 'TEER 0(管理岗):属技能类职业,是雇主 offer 省提名(如 OINP 雇主类)的核心目标。',
  1: 'TEER 1:通常需大学学历的专业岗(工程、IT、医生等)。高技能,省提名/EE 通道首选。',
  2: 'TEER 2:需 college 文凭或 2 年以上培训/学徒。技能岗,多数省提名雇主通道可走。',
  3: 'TEER 3:需高中学历加几周在职培训,或相关经验。部分省雇主/紧缺通道可走。',
  4: 'TEER 4:需高中或短期在岗培训。低技能,通道有限;部分紧缺职业(医护辅助、服务)有专门通道。',
  5: 'TEER 5:无正式教育要求的短期示范类岗位。技能门槛最低,移民通道最少。',
}
const teerLine = (noc: string): string => {
  const t = teerOf(noc)
  return t == null ? '此岗标题未匹配 NOC 规则,暂未分类。' : TEER_DESC[t]
}

// 评分公式常量(与 etl/08_score.py 保持一致)——用于在弹框里还原每一分怎么来的
const TEER_BASE: Record<number, number> = { 0: 54, 1: 56, 2: 52, 3: 46, 4: 28, 5: 20 }
const INDEMAND2 = new Set(['21', '22', '31', '32', '72', '73', '42']) // 紧缺大类:科技/医疗/技工运输/教育社区
const INDEMAND_LOW = new Set(['44101', '75110', '85100', '85101', '84120', '65202']) // TEER4-5 专项紧缺通道
const ACC_PTS: Record<string, number> = { 'co-op': 6, junior: 6, intermediate: 4, senior: 2, unknown: 3 }
const AGENCY_RE = /recruit|staffing|talent|personnel|placement|outsourc|mercor|adecco|randstad/i

type ScoreBd = { teer: number | null; base: number; indemand: number; indemandLow: number; direct: number; acc: number; prov: number; total: number }
function scoreBreakdown(j: JobRow): ScoreBd {
  const noc = j.noc || ''
  const teer = teerOf(noc)
  const base = teer == null ? 18 : (TEER_BASE[teer] ?? 18)
  const indemand = noc && INDEMAND2.has(noc.slice(0, 2)) ? 10 : 0
  const indemandLow = noc && INDEMAND_LOW.has(noc) ? 12 : 0
  const direct = AGENCY_RE.test(j.company || '') ? 0 : 12
  const acc = ACC_PTS[j.accessibility] ?? 3
  const prov = j.province && j.province !== 'ON' ? -6 : 0
  const total = Math.max(0, Math.min(100, base + indemand + indemandLow + direct + acc + prov))
  return { teer, base, indemand, indemandLow, direct, acc, prov, total }
}

function advise(field: ColKey, j: JobRow): Advice {
  const links: { label: string; href: string }[] = []
  if (j.applyUrl) links.push({ label: '投递页', href: j.applyUrl })
  if (j.officialUrl) links.push({ label: '公司官网', href: j.officialUrl })
  const locStr = j.address || [j.city, j.province].filter(Boolean).join(', ')
  const prov = j.province || '—'
  const cat = j.broad || '未分类'
  const provPnp: Record<string, string> = { ON: 'OINP(安省省提名)', BC: 'BC PNP', AB: 'AAIP(阿省)', MB: 'MPNP(曼省)', SK: 'SINP(萨省)', NS: 'NSNP(新斯科舍)', NB: 'NBPNP(新省)' }

  switch (field) {
    case 'score': {
      const s = j.score
      const level = s == null ? '暂未评分' : s >= 75 ? '移民价值高' : s >= 50 ? '中等' : '偏低'
      const b = scoreBreakdown(j)
      const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`)
      const body = [
        '评分 = 该职位 TEER 的基线 + 多项加减分(各 TEER 独立基线,不跨级直接比较)。本岗构成:',
        `① 基线(${b.teer == null ? '未分类' : 'TEER ' + b.teer}):${b.base}`,
        `② 紧缺大类(NOC 前2位 21/22/31/32/72/73/42):${sign(b.indemand)}`,
        `③ TEER4–5 专项紧缺通道:${sign(b.indemandLow)}`,
        `④ 直接雇主(非中介):${sign(b.direct)}`,
        `⑤ 经验级别(${accLabel[j.accessibility] ?? '—'}):${sign(b.acc)}`,
        `⑥ 省份(${j.province || '—'}${b.prov < 0 ? ',非安省扣分' : ',安省'}):${sign(b.prov)}`,
        `= 合计:${b.total}(封顶 0–100)${s != null && s !== b.total ? ` · 入库分 ${s}` : ''}`,
      ]
      if (s == null) return { tag: '移民价值评分', title: '暂未评分', body: ['此岗标题未匹配 NOC 规则,无法分类,因此未评分。可补更明确的职位名以匹配 NOC。'], links }
      return { tag: `移民价值评分 · ${level}`, title: `评分 ${s} / 100`, body, links }
    }
    case 'broad': {
      return {
        tag: '大分类', title: cat,
        body: [
          `职业层级:${cat}(大类) › ${j.mid || '—'}(中类) › ${j.fine || '—'}(小类),取自官方 NOC ${j.noc || '—'}。`,
          '大分类 = NOC 第 1 位的 10 大职业类(管理 / 科技 / 医疗 / 技工 / 服务 等);勾选「中/小分类」列可看更细方向。',
          `移民技能等级看 NOC 第 2 位的 TEER:${teerLine(j.noc)}`,
        ],
        links,
      }
    }
    case 'mid':
    case 'fine': {
      return {
        tag: field === 'mid' ? '中分类' : '小分类', title: (field === 'mid' ? j.mid : j.fine) || '未分类',
        body: [
          `职业层级:${cat}(大类) › ${j.mid || '—'}(中类) › ${j.fine || '—'}(小类),取自官方 NOC ${j.noc || '—'}。`,
          '中分类把大类细分(如「科技」分 IT / 工程,「技工」分 技工 / 运输 / 物流);小分类是具体职业方向,便于按方向投递与筛选。',
          teerLine(j.noc),
        ],
        links,
      }
    }
    case 'teer': {
      const t = teerOf(j.noc)
      return {
        tag: '技能等级 (TEER)', title: t == null ? '未分类' : `TEER ${t}`,
        body: [
          'TEER = Training, Education, Experience and Responsibilities,取自 NOC 五位码第 2 位,是加拿大移民判断「技能岗」的核心依据。',
          teerLine(j.noc),
          'TEER 0–3 属技能岗,雇主 offer 省提名(OINP 等)的主路线;TEER 4–5 偏低技能,仅特定紧缺职业有专门通道。',
        ],
        links,
      }
    }
    case 'title':
      return {
        tag: '职位', title: j.title,
        body: [
          `这是 ${j.company || '该公司'} 发布的岗位${j.noc ? `,对应 NOC ${j.noc}` : ''}${j.accessibility && accLabel[j.accessibility] && j.accessibility !== 'unknown' ? `,经验级别约为${accLabel[j.accessibility]}` : ''}。`,
          j.applyUrl ? '右键「投递页」可在新标签打开原始招聘链接,查看完整职责与要求。' : '该来源未提供直接投递链接。',
          `职业大类:${cat}。${teerLine(j.noc)}`,
        ],
        links,
      }
    case 'company':
      return {
        tag: '公司', title: j.company || '—',
        body: [
          j.officialUrl ? `官网:${j.officialUrl}(右键公司名可在新标签打开)。` : '榜单暂未抓到该公司官网。',
          j.source === 'Job Bank' || j.officialUrl ? '来源为政府 Job Bank / 第一方页面,通常是直接雇主——雇主 offer 省提名要求 offer 来自真实雇主而非中介,直接雇主更有价值。' : `来源为 ${j.source},可能是聚合平台,需核实是否直接雇主。`,
          locStr ? `公司地点:${locStr}。雇主 offer 省提名按公司所在省走对应通道(${provPnp[prov] || `${prov} 省提名`})。` : '',
        ].filter(Boolean),
        links,
      }
    case 'noc':
      return {
        tag: 'NOC 职业代码', title: j.noc ? `NOC ${j.noc}` : '未识别 NOC',
        body: [
          j.noc ? `NOC(National Occupational Classification)是加拿大国家职业分类,五位码。第 2 位 = TEER 等级(本岗为 ${j.category || '—'})。` : '此岗标题未匹配到 NOC 代码,因此未评分。',
          '省提名与快速通道(EE)都按 NOC 判断职业是否符合通道、是否在紧缺/优先清单上。',
          j.noc ? '可在官方 NOC 网站用此代码查职责、薪资与对应移民通道。' : '可补充更明确的职位名以帮助匹配 NOC 规则。',
        ],
        links: j.noc ? [...links, { label: `NOC ${j.noc} 官方页`, href: `https://noc.esdc.gc.ca/Structure/NocSearch?objectid=&val65=${encodeURIComponent(j.noc)}` }] : links,
      }
    case 'accessibility': {
      const lvl = accLabel[j.accessibility] ?? '—'
      return {
        tag: '经验级别', title: j.accessibility === 'unknown' || !j.accessibility ? '未标注' : lvl,
        body: [
          `经验级别由职位标题/描述推断:co-op(实习)、初级(junior)、中级(intermediate)、高级(senior)。本岗为${lvl}。`,
          '对走 PGWP→雇主 offer 省提名的应届/早期求职者,初级与中级岗位往往更现实;高级岗要求更高但加分也更多。',
        ],
        links,
      }
    }
    case 'salary':
    case 'salaryYr': {
      const a = j.salaryAnnual
      const yr = a != null ? `$${Math.round(a / 1000)}K/yr` : '—'
      const med = j.wageMedAnnual
      const vs = a != null && med ? `,本岗${a >= med ? '高于' : '低于'}中位 ${Math.abs(Math.round((a / med - 1) * 100))}%` : ''
      return {
        tag: field === 'salaryYr' ? '年薪(折算)' : '薪资',
        title: field === 'salaryYr' ? yr : (j.salary || '未标注'),
        body: [
          j.salary ? `原始:${j.salary}` : '未公开薪资',
          a != null ? `折算年薪 ≈ ${yr}` : '',
          med ? `该 NOC 当地中位:$${j.wageMedHourly}/hr(≈$${Math.round(med / 1000)}K/yr)${vs}` : '该 NOC 暂无中位工资数据',
        ].filter(Boolean),
        links,
      }
    }
    case 'country':
    case 'province':
    case 'city':
    case 'district':
    case 'address': {
      const L = parseLoc(j)
      const ttl = field === 'country' ? L.country : field === 'province' ? L.prov : field === 'city' ? L.city : field === 'address' ? (j.address || L.district) : L.district
      return {
        tag: field === 'country' ? '国家' : field === 'province' ? '省' : field === 'city' ? '市' : field === 'address' ? '地址' : '区', title: ttl || '—',
        body: [
          `该岗地点:${[L.district, L.city, L.prov].filter(Boolean).join(' · ') || '—'}(省 › 市 › 区)。右键「区」列可开 Google 地图。`,
          `所在省:${prov}。雇主 offer 省提名按公司所在省走对应通道——${provPnp[prov] || `${prov} 省提名`}。`,
          '渥太华的 Kanata / Nepean / Orléans 等都是「大渥太华市」的社区(区),同属安省 OINP。',
        ],
        links,
      }
    }
    case 'origin':
      return {
        tag: '数据渠道', title: ORIGIN_LABEL[j.origin] || j.origin || '—',
        body: [
          '渠道 = 这条岗经 raw 下哪个来源进来的:jobbank(政府职位板)/ ats(公司第一方招聘系统)/ directory(社区/园区名单)。',
          j.origin === 'ats' ? '本岗来自公司自己的 ATS(由 Kanata North 社区名单发现的公司)→ 直接雇主。' : j.origin === 'jobbank' ? `本岗来自 Job Bank;原始板:${j.source}。` : '本岗来自社区/园区名单。',
        ],
        links,
      }
    case 'source':
    case 'direct': {
      const label = sourceLabel(j)
      const first = isDirect(j)
      return {
        tag: field === 'direct' ? '发布渠道' : '数据来源', title: `${first ? '第一方发布' : '聚合转贴'} · ${label}`,
        body: [
          '「第一方 / 转贴」说的是发布渠道,不是雇主真假:第一方=雇主在公司 ATS 或 Job Bank 直接发;转贴=Job Bank 收录了 indeed / Talent.com 等平台上的帖子。',
          '转贴里大多仍是真实雇主——公司 HR 在 indeed 发的也算直接雇主,对省提名一样有效;只是可能和别处重复,投递前点进去核实雇主即可。',
          '真正要避开的是「中介 / 派遣」(offer 不来自实际雇主),这类已在入库时按公司名过滤掉,所以列表里基本都是真实雇主。',
          first ? `本岗:${label} 第一方发布。` : `本岗经 Job Bank 收录,原始出处「${j.source}」。`,
        ],
        links,
      }
    }
    case 'pnp':
      return {
        tag: 'PNP 资格', title: j.pnpEligible ? '✅ 可走雇主 offer 省提名' : '一般不符合(技能门槛)',
        body: [
          j.pnpEligible
            ? '该岗的 NOC 属 TEER 0-3(技能岗),或在 TEER4-5 的专门紧缺通道清单——是各省「雇主 offer→省提名」通道通常要求的技能门槛。'
            : '该岗 NOC 属 TEER 4-5(高中/无正式教育要求)且不在紧缺低 TEER 通道,大多数省提名雇主类通道不收。',
          '⚠️ 这只是按 NOC/TEER 的**粗筛信号**,不是资格认定:各省(OINP/SINP/AAIP…)有自己的职业清单、语言/工资/居住要求,QC 更是走自己的体系(不属 PNP)。以官方通道要求为准。',
          '本站是全职业职位板,PNP 只是其中一个状态标记,不代表其他岗没价值。',
        ],
        links,
      }
    case 'aip':
      return {
        tag: 'AIP 指定雇主', title: j.aip ? '🏅 在官方 AIP 指定雇主名单' : '不在名单(或非大西洋四省)',
        body: [
          j.aip
            ? '该雇主出现在**大西洋移民项目(AIP)**官方「指定雇主」名单上。AIP 是唯一公布指定雇主名单的移民通道——这类雇主已获批可担保移民,是大西洋四省(NL/NB/NS/PE)最实在的 sponsor 线索。'
            : 'AIP 只限大西洋四省(NL/NB/NS/PE),且雇主需在官方指定名单上。本岗不满足(别省或雇主未上名单)。',
          '⚠️ 按雇主名匹配官方名单的**粗筛**:同名 franchise 可能是不同加盟商;投递前以官方名单为准。',
        ],
        links,
      }
    case 'datePosted':
      return {
        tag: '发布时间', title: j.datePosted ? j.datePosted.slice(0, 10) : '—',
        body: [
          j.datePosted ? `该岗发布于 ${j.datePosted.slice(0, 10)}。` : '未取得发布时间。',
          '发布越新越可能仍在招;Job Bank 等渠道的岗位有时效,建议尽快投递。',
        ],
        links,
      }
    case 'lastSeen':
      return {
        tag: '更新时间', title: j.lastSeen ? j.lastSeen.slice(0, 10) : '—',
        body: [
          j.lastSeen ? `本榜单最近一次在 ${j.lastSeen.slice(0, 10)} 仍抓到该岗(说明当时还挂着)。` : '未记录最近抓取时间。',
          '更新时间反映岗位是否仍在线;长时间未更新的岗位可能已关闭。',
        ],
        links,
      }
    case 'status':
    case 'closedAt': {
      const cl = j.status === 'closed'
      return {
        tag: '岗位状态', title: cl ? '已下架' : '在招',
        body: [
          cl ? `该岗已下架${j.closedAt ? `(${j.closedAt.slice(0, 10)} 起最近一次抓取不再出现)` : ''}。` : '该岗仍在招(最近一次抓取还在线)。',
          '判定方式:每次抓取若某岗不再出现,就标记为已下架并记录下架时间。',
        ],
        links,
      }
    }
  }
}

const scoreColor = (s: number | null) => (s == null ? '#9ca3af' : s >= 75 ? '#15803d' : s >= 50 ? '#b45309' : '#6b7280')
const ctrl: React.CSSProperties = { height: 38, boxSizing: 'border-box', padding: '0 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, color: '#1f2937', background: '#fff' }
const filtRow: React.CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }
const filtLabel: React.CSSProperties = { fontSize: 12, color: '#9ca3af', minWidth: 28, whiteSpace: 'nowrap' }
// 联动下拉:上级选了,下级选项随之收窄;当前值不在选项里也保留显示
function Sel({ value, onChange, opts, all }: { value: string; onChange: (v: string) => void; opts: string[]; all: string }) {
  const list = value && !opts.includes(value) ? [value, ...opts] : opts
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...ctrl, maxWidth: 180 }}>
      <option value="">{all}</option>
      {list.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}
const td: React.CSSProperties = { padding: '7px 12px', verticalAlign: 'top' }
// 按词换行(不逐字断词);不设 wordBreak 以免列被挤成 1 字符宽
const wrapCell = (w: number): React.CSSProperties => ({ maxWidth: w, whiteSpace: 'normal', overflowWrap: 'break-word', wordBreak: 'normal' })
const link: React.CSSProperties = { color: '#2563eb', textDecoration: 'none' }
const colPanel: React.CSSProperties = { position: 'absolute', top: '110%', right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,.12)', padding: 8, zIndex: 20, minWidth: 160 }
const colBtn: React.CSSProperties = { flex: 1, padding: '4px 6px', fontSize: 12.5, border: '1px solid #d1d5db', borderRadius: 5, background: '#f9fafb', color: '#374151', cursor: 'pointer' }
