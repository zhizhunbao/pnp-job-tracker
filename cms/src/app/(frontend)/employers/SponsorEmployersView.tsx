'use client'
// B2 在招担保雇主视图(docs/implementation/在招担保雇主/02_B2):纯渲染,数据 SSR 传入(进程内 TTL 聚合)。
// 每行=在招且有凭证的雇主;凭证措辞与 B1 弹框 spl.* 同源;GET 刷新=每个结果页有 URL(SEO)。
// 红线:凭证=历史事实/官方名录,非担保承诺(页头一行免责=蓝图 §4 允许的四类文案)。
import { useState } from 'react'
import { type Lang, type TFn } from '../jobs/i18n'
import { useLang } from '../LangProvider'
import { provName } from '../jobs/JobsTable'
import { track } from '@/lib/track'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { BANNER_IMGS, Button, Card, CardAction, CardKV, PageBanner, PageShell, UI, chipStyle } from '../ui/primitives'
import { DataTable } from '../ui/DataTable'
import { IconUsers } from '../Icons'
import { SE_PAGE_SIZE, type SponsorEmployerRow } from '@/lib/sponsorEmployers'

export type SponsorQuery = { f: string; prov: string; noc: string; q: string; sort: string; page: number }

// 所在地压缩(Frank 文案铁律:不折行不杂糅):单省=市+省全名;两省=省全名并列;≥3 省=「N 省」
function whereText(r: SponsorEmployerRow, t: TFn): string {
  if (!r.provs.length) return r.city || '—'
  if (r.provs.length === 1) return [r.city, provName(t, r.provs[0])].filter(Boolean).join(' ')
  if (r.provs.length === 2) return r.provs.map((p) => provName(t, p)).join('、')
  return t('se.where.multi', { n: r.provs.length })
}

function href(p: Partial<SponsorQuery>, cur: SponsorQuery) {
  const v = { ...cur, page: 0, ...p }
  const sp = new URLSearchParams()
  if (v.f) sp.set('f', v.f)
  if (v.prov) sp.set('prov', v.prov)
  if (v.noc) sp.set('noc', v.noc)
  if (v.q) sp.set('q', v.q)
  if (v.sort && v.sort !== 'open') sp.set('sort', v.sort)
  if (v.page > 0) sp.set('page', String(v.page))
  const s = sp.toString()
  return '/employers' + (s ? `?${s}` : '')
}

// 按人群分表的列组(Frank 08-08 三拍:每表只描述自己那条通道):
// lmia 表(没工签→要雇主办 LMIA):获批量/技能类/最近季度;
// named 表(有工签→要打包省提名):PR 股获批(担保过移民的硬证)/省清单岗;
// aip 表(去海洋省):指定身份即表题,行内只留 在招/所在地;'' = 货架总览(三凭证并列)。
const NIL = <span style={{ color: '#9ca3af' }}>—</span>
export type SponsorKind = '' | 'aip' | 'lmia' | 'named'
export function sponsorEmployerCols(t: TFn, lang: Lang, kind: SponsorKind = '') {
  // Frank 08-08「胶囊和中文应该弄两列」:别名/担保档从雇主格拆出各占一列(EN 界面无别名,列整体不出)
  const name = { key: 'name', label: t('dir.col.employer'), sort: (r: SponsorEmployerRow) => r.name.toLowerCase(), render: (r: SponsorEmployerRow) => (
    <a href={`/?q=${encodeURIComponent(r.name)}`} onClick={() => track('se-view-jobs')} style={{ color: UI.primary, textDecoration: 'none', fontWeight: 600 }}>{r.name}</a>
  ) }
  const alias = { key: 'alias', label: t('se.col.alias'), sort: (r: SponsorEmployerRow) => (lang === 'zh' ? r.aliasZh : r.aliasKo) || null, render: (r: SponsorEmployerRow) => {
    const v = lang === 'zh' ? r.aliasZh : r.aliasKo
    return v ? <span style={{ color: '#6b7280', fontSize: 12.5 }}>{v}</span> : NIL
  } }
  const grade = { key: 'grade', label: t('se.col.grade'), nowrap: true, sort: (r: SponsorEmployerRow) => r.sponsorGrade ?? null, render: (r: SponsorEmployerRow) => (
    r.sponsorGrade != null
      ? <span title={t('gr.sponsorTip')} style={{ fontSize: 10.5, padding: '1px 7px', borderRadius: 999, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', whiteSpace: 'nowrap' }}>{t('gr.sp.' + r.sponsorGrade)}</span>
      : NIL
  ) }
  const aip = { key: 'aip', label: t('se.chip.aip'), nowrap: true, sort: (r: SponsorEmployerRow) => (r.aip ? 1 : 0), render: (r: SponsorEmployerRow) => (r.aip ? <span style={{ color: '#15803d', fontWeight: 700 }}>✓</span> : NIL) }
  const lmia = { key: 'lmia', label: t('se.col.lmia'), nowrap: true, sort: (r: SponsorEmployerRow) => r.lmiaPositions, render: (r: SponsorEmployerRow) => (r.lmiaPositions > 0 ? <span style={{ color: '#0f766e', fontWeight: 700 }}>{r.lmiaPositions}</span> : NIL) }
  const skilled = { key: 'skilled', label: t('dir.col.skilled'), nowrap: true, sort: (r: SponsorEmployerRow) => r.lmiaPositionsSkilled ?? null, render: (r: SponsorEmployerRow) => (r.lmiaPositionsSkilled ? <span style={{ color: '#0f766e', fontWeight: 700 }}>{r.lmiaPositionsSkilled}</span> : NIL) }
  const quarter = { key: 'quarter', label: t('dir.col.quarter'), nowrap: true, sort: (r: SponsorEmployerRow) => r.lmiaLastQuarter || null, render: (r: SponsorEmployerRow) => (r.lmiaLastQuarter ? <span style={{ color: '#6b7280' }}>{r.lmiaLastQuarter}</span> : NIL) }
  const pr = { key: 'pr', label: t('se.col.pr'), nowrap: true, sort: (r: SponsorEmployerRow) => r.lmiaPr, render: (r: SponsorEmployerRow) => (r.lmiaPr > 0 ? <span style={{ color: '#92400e', fontWeight: 700 }}>{r.lmiaPr}</span> : NIL) }
  const namedJobs = { key: 'namedJobs', label: t('se.col.namedJobs'), nowrap: true, sort: (r: SponsorEmployerRow) => (r.named ? 1 : 0), render: (r: SponsorEmployerRow) => (r.named ? <span style={{ color: '#92400e', fontWeight: 700 }}>✓</span> : NIL) }
  const namedMix = { key: 'named', label: t('se.col.named'), nowrap: true, sort: (r: SponsorEmployerRow) => r.lmiaPr * 1000 + (r.named ? 1 : 0), render: (r: SponsorEmployerRow) => (r.lmiaPr > 0 ? <span style={{ color: '#92400e', fontWeight: 700 }}>{t('se.pr', { n: r.lmiaPr })}</span> : r.named ? <span style={{ color: '#92400e', fontWeight: 700 }}>✓</span> : NIL) }
  const open = { key: 'open', label: t('se.col.open'), nowrap: true, sort: (r: SponsorEmployerRow) => r.openJobs, render: (r: SponsorEmployerRow) => <span style={{ fontWeight: 700 }}>{r.openJobs}</span> }
  const where = { key: 'where', label: t('se.col.where'), sort: (r: SponsorEmployerRow) => r.provs[0] ?? null, render: (r: SponsorEmployerRow) => <>{whereText(r, t)}</> }
  const base = lang === 'en' ? [name, grade] : [name, alias, grade]
  if (kind === 'lmia') return [...base, lmia, skilled, quarter, open, where]
  if (kind === 'named') return [...base, pr, namedJobs, open, where]
  if (kind === 'aip') return [...base, open, where]
  return [...base, aip, lmia, namedMix, open, where]
}

export function SponsorCard({ r, lang, t, kind = '' }: { r: SponsorEmployerRow; lang: Lang; t: TFn; kind?: SponsorKind }) {
  const alias = lang === 'zh' ? r.aliasZh : lang === 'ko' ? r.aliasKo : ''
  const NILC = <span style={{ color: '#9ca3af' }}>—</span>
  const kv: { k: string; v: React.ReactNode }[] = []
  if (kind === 'lmia') {
    kv.push({ k: t('se.col.lmia'), v: r.lmiaPositions > 0 ? <b style={{ color: '#0f766e' }}>{r.lmiaPositions}</b> : NILC })
    kv.push({ k: t('dir.col.skilled'), v: r.lmiaPositionsSkilled ? <b style={{ color: '#0f766e' }}>{r.lmiaPositionsSkilled}</b> : NILC })
    kv.push({ k: t('dir.col.quarter'), v: r.lmiaLastQuarter || NILC })
  } else if (kind === 'named') {
    kv.push({ k: t('se.col.pr'), v: r.lmiaPr > 0 ? <b style={{ color: '#92400e' }}>{r.lmiaPr}</b> : NILC })
    kv.push({ k: t('se.col.namedJobs'), v: r.named ? <b style={{ color: '#92400e' }}>✓</b> : NILC })
  } else if (kind !== 'aip') {
    kv.push({ k: t('se.chip.aip'), v: r.aip ? <b style={{ color: '#15803d' }}>✓</b> : NILC })
    kv.push({ k: t('se.col.lmia'), v: r.lmiaPositions > 0 ? <b style={{ color: '#0f766e' }}>{r.lmiaPositions}</b> : NILC })
    kv.push({ k: t('se.col.named'), v: r.lmiaPr > 0 ? <b style={{ color: '#92400e' }}>{t('se.pr', { n: r.lmiaPr })}</b> : r.named ? <b style={{ color: '#92400e' }}>✓</b> : NILC })
  }
  kv.push({ k: t('se.col.open'), v: <span style={{ fontWeight: 700 }}>{r.openJobs}</span> })
  kv.push({ k: t('se.col.where'), v: whereText(r, t) })
  return (
    <Card>
      <div style={{ fontSize: 14.5, fontWeight: 600 }}>
        <a href={`/?q=${encodeURIComponent(r.name)}`} onClick={() => track('se-view-jobs')} style={{ color: UI.primary, textDecoration: 'none' }}>{r.name}</a>
        {r.sponsorGrade != null && <span title={t('gr.sponsorTip')} style={{ marginLeft: 6, fontSize: 10.5, padding: '1px 7px', borderRadius: 999, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontWeight: 600, whiteSpace: 'nowrap' }}>{t('gr.sp.' + r.sponsorGrade)}</span>}
      </div>
      {alias ? <div style={{ fontSize: 12.5, color: '#9ca3af', marginTop: 2 }}>{alias}</div> : null}
      <CardKV items={kv} />
    </Card>
  )
}

export function SponsorEmployersView({ query, items, total, occTitle, pro = false, myFilter = null }: {
  query: SponsorQuery; items: SponsorEmployerRow[]; total: number
  occTitle: string   // noc 筛选时的 NOC 官方职业名('' = 无筛选)
  pro?: boolean                                        // B3:导出钮 Pro 直链 / 免费落定价(?from=se-export)
  myFilter?: { noc: string; prov: string } | null      // B3:档案一键筛(nocCodes/targetProvinces 有值才传)
}) {
  const [lang, setLangSaved, t] = useLang()
  const [qInput, setQInput] = useState(query.q)
  const pages = Math.max(1, Math.ceil(total / SE_PAGE_SIZE))

  const chips: { key: string; label: string }[] = [
    { key: '', label: t('se.chip.all') },
    { key: 'aip', label: t('se.chip.aip') },
    { key: 'lmia', label: t('se.chip.lmia') },
    { key: 'named', label: t('se.chip.named') },
  ]
  const PROVS = ['NS', 'NB', 'NL', 'PE', 'ON', 'BC', 'AB', 'SK', 'MB', 'QC']

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="employers" />
      <PageShell pad="1rem 1.25rem 32px">
        <PageBanner module="jobs" icon={<IconUsers />} title={t('se.title')} sub={t('se.sub')} images={BANNER_IMGS.jobs} />

        {/* 凭证 chips + 名称搜索(GET 刷新);旧名录入口保留(SEO 页不断链) */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '0 0 10px' }}>
          {chips.map((c) => (
            <a key={c.key || 'all'} href={href({ f: c.key }, query)} style={{ ...chipStyle(query.f === c.key), textDecoration: 'none', display: 'inline-block' }}>{c.label}</a>
          ))}
          <form action="/employers" method="get" onSubmit={() => track('se-search')} style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
            {query.f && <input type="hidden" name="f" value={query.f} />}
            {query.noc && <input type="hidden" name="noc" value={query.noc} />}
            {query.sort !== 'open' && <input type="hidden" name="sort" value={query.sort} />}
            {/* 省筛=全名下拉(与职位板同款,循 #146 全名惯例);选中即提交 */}
            <select name="prov" value={query.prov} onChange={(e) => e.currentTarget.form?.submit()}
              style={{ height: 30, border: `1px solid ${UI.border}`, borderRadius: 8, background: '#fff', fontSize: 12.5, color: '#374151', padding: '0 6px' }}>
              <option value="">{t('all.prov')}</option>
              {PROVS.map((p) => <option key={p} value={p}>{provName(t, p)}</option>)}
            </select>
            <input name="q" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder={t('dir.search')}
              style={{ border: `1px solid ${UI.border}`, borderRadius: 8, padding: '5px 10px', fontSize: 13, minWidth: 180 }} />
            <Button sm style={{ fontSize: 13, padding: '5px 14px' }}>{t('dir.searchBtn')}</Button>
          </form>
        </div>
        {/* 排序 chips + 职业筛(可摘)一行 */}
        <div style={{ display: 'flex', gap: 6, margin: '0 0 12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <a href={href({ sort: 'open' }, query)} style={{ ...chipStyle(query.sort !== 'skilled'), textDecoration: 'none', display: 'inline-block' }}>{t('se.sort.open')}</a>
          <a href={href({ sort: 'skilled' }, query)} style={{ ...chipStyle(query.sort === 'skilled'), textDecoration: 'none', display: 'inline-block' }}>{t('se.sort.skilled')}</a>
          {query.noc ? (
            <a href={href({ noc: '' }, query)} style={{ ...chipStyle(true), textDecoration: 'none', display: 'inline-block' }}>
              {t('se.occFilter', { name: occTitle || query.noc })} ×
            </a>
          ) : null}
          {/* B3 档案一键筛(有档案才出);导出=付费交付物,免费落定价页(?from= 漏斗口径) */}
          {myFilter ? (
            <a href={href({ noc: myFilter.noc, prov: myFilter.prov }, query)} onClick={() => track('se-my-filter')}
              style={{ ...chipStyle(false), textDecoration: 'none', display: 'inline-block' }}>{t('se.myFilter')}</a>
          ) : null}
          <a href={pro ? '/api/employers-export' + (() => { const s = href({}, query).split('?')[1]; return s ? '?' + s : '' })() : '/pricing?from=se-export'}
            onClick={() => track(pro ? 'se-export' : 'se-export-gate')}
            style={{ ...chipStyle(false), textDecoration: 'none', display: 'inline-block', marginLeft: 'auto' }}>{t('se.export')}</a>
        </div>
        {/* 免责一行(蓝图 §4 四类允许文案:非担保承诺) */}
        <div style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 12px' }}>{t('se.note')}</div>

        <div className="tcCards">
          {items.map((r) => <SponsorCard key={r.name} r={r} lang={lang} t={t} kind={(query.f as SponsorKind) || ''} />)}
          {items.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>{t('dir.empty')}</div>}
        </div>
        <div className="tcTableWrap">
          <DataTable<SponsorEmployerRow> rows={items} rowKey={(r) => r.name} empty={t('dir.empty')} cols={sponsorEmployerCols(t, lang, (query.f as SponsorKind) || '')} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '12px 0', fontSize: 12.5, color: '#6b7280', flexWrap: 'wrap' }}>
          <span>{t('dir.total', { n: total })} · {t('dir.page', { p: query.page + 1, m: pages })}</span>
          {query.page > 0 && <a href={href({ page: query.page - 1 }, query)} style={{ color: UI.primary, textDecoration: 'none' }}>{t('dir.prev')}</a>}
          {query.page + 1 < pages && <a href={href({ page: query.page + 1 }, query)} style={{ color: UI.primary, textDecoration: 'none' }}>{t('dir.next')}</a>}
        </div>
      </PageShell>
      <SiteFooter t={t} />
    </div>
  )
}
