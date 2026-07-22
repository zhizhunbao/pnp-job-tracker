'use client'
// 榜单视图(E5-02):纯渲染(计算在 ETL);三语壳;岗位行链官方原帖,公司行链官网。
// RankingTable = 内容单一来源(E8-02):页面版与 /jobs 榜单弹窗共用,不许 fork。
import { useEffect, useState } from 'react'
import { makeT, streamDisplay, eeDisplay, LANG_KEY, type Lang, type TFn } from '../jobs/i18n'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { BANNER_IMGS, Card, CardAction, CardKV, PageBanner } from '../ui/primitives'
import { DataTable } from '../ui/DataTable'
import { IconChart } from '../Icons'

export type RankRow = {
  rank: number; kind: string; externalId: string
  title: string; company: string; city: string; province: string
  noc: string; teer: number | null; score: number | null
  salaryText: string; salaryAnnual: number | null
  pnpStream: string; eeCategory: string; datePosted: string
  applyUrl: string; officialUrl: string
  openJobs: number | null; namedJobs: number | null; avgScore: number | null
  lmiaPositions: number | null; lmiaQuarter: string  // #21(第 17 轮):第一排序键上榜可见
}


// ── E8-08 #121 手机域卡(按逻辑拆):公司榜卡 / 职位榜卡——#排名进标题行,数字语义色与桌面列一致 ──
function RankCompanyCard({ r, t, showNamed }: { r: RankRow; t: TFn; showNamed: boolean }) {
  return (
    <Card>
      <div style={{ fontSize: 14.5, fontWeight: 600 }}>
        <span style={{ color: '#9ca3af', fontWeight: 400 }}>#{r.rank}</span>{' '}
        {r.officialUrl ? <a href={r.officialUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{r.company} ↗</a> : r.company}
      </div>
      {r.province ? <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>{r.province}</div> : null}
      <CardKV items={[
        { k: t('rank.col.lmia'), v: r.lmiaPositions ? <span style={{ fontWeight: 600, color: '#15803d' }}>{r.lmiaPositions}</span> : <span style={{ color: '#9ca3af' }}>—</span> },
        ...(r.lmiaQuarter ? [{ k: t('dir.col.quarter'), v: <span style={{ color: '#9ca3af' }}>{r.lmiaQuarter}</span> }] : []),
        ...(showNamed ? [{ k: t('rank.col.namedJobs'), v: <span style={{ fontWeight: 600, color: '#b45309' }}>{r.namedJobs}</span> }] : []),
        { k: t('rank.col.openJobs'), v: r.openJobs ?? '—' },
        { k: t('rank.col.avgScore'), v: r.avgScore ?? '—' },
      ]} />
      <CardAction><a href={`/?q=${encodeURIComponent(r.company)}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{t('rank.viewJobs')}</a></CardAction>
    </Card>
  )
}
function RankJobCard({ r, t }: { r: RankRow; t: TFn }) {
  return (
    <Card>
      <div style={{ fontSize: 14.5, fontWeight: 600 }}>
        <span style={{ color: '#9ca3af', fontWeight: 400 }}>#{r.rank}</span>{' '}
        {r.applyUrl ? <a href={r.applyUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{r.title} ↗</a> : r.title}
      </div>
      {r.company ? <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>{r.company}</div> : null}
      <CardKV items={[
        { k: t('col.city'), v: [r.city, r.province].filter(Boolean).join(', ') || '—' },
        { k: t('col.salary'), v: r.salaryText ? <span style={{ color: '#15803d', fontWeight: 600 }}>{r.salaryText}</span> : '—' },
        { k: t('col.score'), v: r.score ?? '—' },
        { k: t('col.datePosted'), v: <span style={{ color: '#9ca3af' }}>{(r.datePosted || '').slice(0, 10)}</span> },
      ]} />
    </Card>
  )
}

/** 更新时间 + 口径说明 + 榜单表(页面/弹窗共用;壳与标题由宿主渲) */
export function RankingTable({ slug, items, t }: { slug: string; items: RankRow[]; t: TFn }) {
  const isCompany = slug === 'sponsor-likely'
  // 第 2 轮 #7 核查:LMIA 强雇主与省提名清单命中长期不重叠(全库 436 命中岗,30 强全 0)——
  // 整列 0 像坏数据,全零时藏列;哪天数据重叠了自动恢复,排序键不受影响(ETL 侧)。
  const showNamed = isCompany && items.some((i) => (i.namedJobs ?? 0) > 0)
  // 「更新于」= 榜内最新发布日(第 11 轮 #30),但**不超过今天**(第 12 轮 #32:帖面日期是 ET 时区
  // 可到「明天」,「更新于未来」损口径可信度)——用浏览者本地日期封顶
  const today = new Date().toLocaleDateString('en-CA')  // en-CA = YYYY-MM-DD
  const maxPosted = items.reduce((m, i) => (i.datePosted && i.datePosted > m ? i.datePosted : m), '').slice(0, 10)
  const updated = (maxPosted && maxPosted < today ? maxPosted : today)
  return (
    <>
      <div style={{ fontSize: 12.5, color: '#9ca3af', margin: '6px 0 4px' }}>{t('rank.updated', { d: updated })}</div>
      {/* #198(Frank「删掉」周榜口径注):note 为空则整行不渲(空键=已删) */}
      {(() => { const nk = slug.startsWith('daily-top') ? 'rank.note.daily-top' : 'rank.note.' + slug; const nv = t(nk); return nv && nv !== nk ? <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 16 }}>{nv}</div> : null })()}
      {/* 组件统一 P2 余批(#110):换公共 DataTable;E8-08 #121:≤640 换域卡(CSS 双渲染) */}
      <div className="tcCards">
        {items.map((r) => isCompany ? <RankCompanyCard key={r.rank} r={r} t={t} showNamed={showNamed} /> : <RankJobCard key={r.rank} r={r} t={t} />)}
      </div>
      <div className="tcTableWrap">
      {isCompany ? (
        <DataTable<RankRow> rows={items} rowKey={(r) => String(r.rank)} cols={[
          { key: 'rank', label: '#', nowrap: true, sort: (r) => r.rank, render: (r) => <span style={{ color: '#9ca3af' }}>{r.rank}</span> },
          { key: 'company', label: t('rank.col.company'), sort: (r) => r.company.toLowerCase(), render: (r) => <span style={{ fontWeight: 600 }}>{r.officialUrl ? <a href={r.officialUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{r.company} ↗</a> : r.company}</span> },
          // #48(第 18 轮):跨省雇主(如加拿大军队)province 为空,裸空像渲染缺陷 → 占位「—」
          { key: 'prov', label: t('col.province'), nowrap: true, sort: (r) => r.province || null, render: (r) => r.province || <span style={{ color: '#9ca3af' }}>—</span> },
          // #21:第一排序键(近两年 LMIA 技能股获批职位数)上榜可见;最近获批季度独立灰行
          { key: 'lmia', label: t('rank.col.lmia'), nowrap: true, sort: (r) => r.lmiaPositions ?? null, render: (r) => r.lmiaPositions
            ? <><span style={{ fontWeight: 600, color: '#15803d' }}>{r.lmiaPositions}</span>{r.lmiaQuarter && <div style={{ color: '#9ca3af', fontSize: 11.5 }}>{r.lmiaQuarter}</div>}</>
            : <span style={{ color: '#9ca3af' }}>—</span> },
          ...(showNamed ? [{ key: 'named', label: t('rank.col.namedJobs'), sort: (r: RankRow) => r.namedJobs ?? null, render: (r: RankRow) => <span style={{ fontWeight: 600, color: '#b45309' }}>{r.namedJobs}</span> }] : []),
          { key: 'open', label: t('rank.col.openJobs'), sort: (r) => r.openJobs ?? null, render: (r) => <>{r.openJobs}</> },
          { key: 'avg', label: t('rank.col.avgScore'), sort: (r) => r.avgScore ?? null, render: (r) => <>{r.avgScore ?? '—'}</> },
          { key: 'go', label: '', nowrap: true, render: (r) => <a href={`/?q=${encodeURIComponent(r.company)}`} style={{ color: '#2563eb', textDecoration: 'none', fontSize: 12.5 }}>{t('rank.viewJobs')}</a> },
        ]} />
      ) : (
        <DataTable<RankRow> rows={items} rowKey={(r) => String(r.rank)} cols={[
          { key: 'rank', label: '#', nowrap: true, sort: (r) => r.rank, render: (r) => <span style={{ color: '#9ca3af' }}>{r.rank}</span> },
          { key: 'title', label: t('col.title'), sort: (r) => r.title.toLowerCase(), render: (r) => <span style={{ fontWeight: 600, display: 'inline-block', maxWidth: 320 }}>{r.applyUrl ? <a href={r.applyUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{r.title} ↗</a> : r.title}</span> },
          { key: 'company', label: t('col.company'), sort: (r) => r.company.toLowerCase(), render: (r) => <>{r.company}</> },
          { key: 'city', label: t('col.city'), nowrap: true, sort: (r) => r.city || null, render: (r) => <>{[r.city, r.province].filter(Boolean).join(', ')}</> },
          { key: 'salary', label: t('col.salary'), nowrap: true, sort: (r) => r.salaryAnnual ?? null, render: (r) => <span style={{ color: '#15803d' }}>{r.salaryText || '—'}</span> },
          { key: 'pnpee', label: 'PNP/EE', render: (r) => {
            const parts = [r.pnpStream ? streamDisplay(t, r.pnpStream) : '', r.eeCategory ? eeDisplay(t, r.eeCategory) : ''].filter(Boolean)
            return parts.length ? <span style={{ fontSize: 12 }}>{parts.map((x) => <div key={x}>{x}</div>)}</span> : <>—</>
          } },
          { key: 'score', label: t('col.score'), sort: (r) => r.score ?? null, render: (r) => <span style={{ fontWeight: 600 }}>{r.score ?? '—'}</span> },
          { key: 'date', label: t('col.datePosted'), nowrap: true, sort: (r) => r.datePosted || null, render: (r) => <span style={{ color: '#9ca3af', fontSize: 12.5 }}>{(r.datePosted || '').slice(0, 10)}</span> },
        ]} />
      )}
      </div>
    </>
  )
}

// 每日分类榜(E9-02):slug 段 → 大类 zh(与 etl/10_build_rankings BROAD_SLUG 镜像,勿单改)
const BROAD_BY_SLUG: Record<string, string> = { tech: '科技', health: '医疗', trades: '技工', service: '服务', business: '商务', education: '教育', manufacturing: '制造', resources: '资源', arts: '文体', management: '管理' }
const rankTitle = (t: TFn, slug: string): string => {
  if (!slug.startsWith('daily-top')) return t('rank.title.' + slug)
  const zh = BROAD_BY_SLUG[slug.replace('daily-top-', '')]
  return t('rank.title.daily-top') + (zh ? ' · ' + t('broad.' + zh) : '')
}

export function RankingView({ slug, items, slugs = [] }: { slug: string; items: RankRow[]; slugs?: string[] }) {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { const s = localStorage.getItem(LANG_KEY) as Lang | null; if (s) setLang(s) }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = makeT(lang)
  // 有数据的榜单清单(导航与 banner 数字块共用)
  const boards = ['daily-top', ...Object.keys(BROAD_BY_SLUG).map((k) => `daily-top-${k}`), 'weekly-top', 'sponsor-likely']
    .filter((x) => x === slug || slugs.includes(x) || x === 'weekly-top' || x === 'sponsor-likely')

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      {/* 顶栏换全站共享 SiteHeader(2026-07-11 用户指出子页 header 与 /jobs 样式不一致) */}
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="rank" />

      {/* #67 宽度统一:1100 → 1320 与头轨/职位板同宽 */}
      <div style={{ maxWidth: 1320, width: '100%', boxSizing: 'border-box', margin: '2rem auto', padding: '0 1.25rem' }}>
        {/* 页头=PageBanner(#65 五模块统一浅色带,榜单=金) */}
        <PageBanner module="rank" icon={<IconChart />} title={rankTitle(t, slug)} images={BANNER_IMGS.rank}
          sub={t('rank.bnSub')} stats={[{ v: boards.length, label: t('rank.bnBoards') }, { v: items.length, label: t('rank.bnRows') }]} />
        {/* 榜单导航(E9-02 分类榜矩阵):只列当前有数据的榜;当前榜加粗黑。
            #61(2026-07-19 Frank 拍板「就是那个意思」):从页底挪到页头下方——导航是切换入口不是脚注 */}
        <div style={{ margin: '0 0 12px', fontSize: 12.5, display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
          {boards
            .map((x) => (
              <a key={x} href={`/rankings/${x}`} style={{ color: x === slug ? '#111827' : '#2563eb', textDecoration: 'none', fontWeight: x === slug ? 700 : 400, whiteSpace: 'nowrap' }}>
                {rankTitle(t, x)}
              </a>
            ))}
        </div>
        <RankingTable slug={slug} items={items} t={t} />
      </div>
      <SiteFooter t={t} />
    </div>
  )
}
