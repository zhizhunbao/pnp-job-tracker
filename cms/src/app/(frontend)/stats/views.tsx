'use client'
// 地区统计视图集(E5-04):全部零计算,渲染 ETL 预聚合行。
// 每级拆「*Content 内容组件」+页面壳(E8-02 时代曾与 /jobs 统计弹窗共用;弹窗 2026-07-11 已退役,顶栏改跳转页面)。
// E13-03(2026-08-06):/stats 索引页与 /stats/compare **退役**(301 → /start,见 next.config redirects)——
// 本文件只剩省级与省×大类两级(S4 的下钻落点)。StatsIndexContent/StatsIndexView/CompareContent/CompareView
// 与它们独占的 StatsCharts 一并删除,不留死代码;省卡形态搬去 start/StartView 的 S4。
import { useMemo } from 'react'
import { StatsShell, MetricCards, CaliberLine, useLang } from './ui'
import { BackLink } from '../BackLink'
import { Card, CardAction, CardKV, Tag } from '../ui/primitives'
import { DataTable } from '../ui/DataTable'
import { BROAD_SLUGS, PROV_NAME, type StatRow, type SrcRow } from './shared'
import { streamDisplay, type TFn } from '../jobs/i18n'

const money = (v: number | null) => (v != null ? `$${Math.round(v / 1000)}K` : '—')

function TopCities({ raw, t }: { raw: string; t: TFn }) {
  const cities = useMemo(() => { try { return JSON.parse(raw) as { city: string; n: number }[] } catch { return [] } }, [raw])
  if (!cities.length) return null
  // #208(第 26 轮体检):原为裸文字流,375 下城市名被拆行(Fort / McMurray)且胶囊互相重叠 →
  // 改 flex 换行 + 胶囊内 nowrap,名字永不断行
  return (
    <div style={{ margin: '8px 0', fontSize: 12.5, color: '#6b7280', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
      <span style={{ whiteSpace: 'nowrap' }}>{t('stats.topCities')}</span>
      {cities.map((c) => <span key={c.city} style={{ background: '#eef2ff', color: '#3730a3', borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap' }}>{c.city}　{c.n}</span>)}
    </div>
  )
}

// ── E12-07 省难度卡(2026-07-20 Frank 拍板「stats 卡先行/人话档名」):分档+逐因子出处;
//    红线:粗口径注(竞争基数≠申请人数)/分数只与自身历史比/禁概率;H 基础卡规格,一行一条(W 规矩)──
const TIER_TAG: Record<string, 'ok' | 'warn' | 'federal'> = { easy: 'ok', mid: 'warn', tight: 'federal' }
function DifficultyCard({ raw, t }: { raw: StatRow['difficulty']; t: TFn }) {
  const d = useMemo(() => { try { return typeof raw === 'string' ? JSON.parse(raw) : raw } catch { return null } }, [raw]) as any
  if (!d?.tier) return null
  const f = (k: string) => (d.factors || []).find((x: any) => x.key === k)
  const comp = f('comp'), trend = f('quotaTrend'), act = f('activity'), score = f('scoreLevel')
  const row: React.CSSProperties = { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', fontSize: 13, color: '#374151', marginTop: 6 }
  const src = (_x: any) => null   // #106:官方来源 ↗ 外链撤(归拢到 /resources)
  const pctS = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', margin: '12px 0 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{t('diff.title')}</span>
        <Tag variant={TIER_TAG[d.tier]}>{t('diff.' + d.tier)}</Tag>
      </div>
      {comp && (
        <div style={row}>
          <span style={{ fontWeight: 600 }}>{t('diff.comp', { v: comp.value })}</span>
          <span style={{ color: '#9ca3af', fontSize: 12 }}>{t('diff.compNote', { pool: Number(comp.pool).toLocaleString(), quota: Number(comp.quota).toLocaleString(), y: comp.quotaYear, py: comp.asOf ?? '' })}</span>
          {src(comp)}
        </div>
      )}
      {trend && <div style={row}><span>{t('diff.trend', { v: pctS(trend.value) })}</span>{src(trend)}</div>}
      {act && <div style={row}><span>{t('diff.act', { n: act.value, m: Number(act.invitations || 0).toLocaleString() })}</span>{src(act)}</div>}
      {score && <div style={row}><span>{t('diff.score', { p: score.value, s: score.latestScore, sc: score.scale || '—' })}</span>{src(score)}</div>}
    </div>
  )
}

// 该省移民动态块(E12-06):近 3 条官方新闻标题链 /news/[slug];无数据整块不出现
type NewsSlimRow = { title: string; date: string; slug: string }
function ProvNewsBlock({ news, t }: { news: NewsSlimRow[]; t: TFn }) {
  if (!news.length) return null
  return (
    <div style={{ margin: '14px 0 0' }}>
      <h2 style={{ fontSize: 15.5, margin: '0 0 8px' }}>{t('news.blockTitle')} <a href="/news" style={{ fontSize: 12.5, color: '#2563eb', textDecoration: 'none', fontWeight: 400, marginLeft: 8 }}>{t('news.more')}</a></h2>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12 }}>
        {news.map((n) => (
          <div key={n.slug} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '8px 14px', fontSize: 13, borderBottom: '1px solid #f3f4f6' }}>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: '#9ca3af', whiteSpace: 'nowrap', fontSize: 12.5 }}>{n.date}</span>
            <a href={`/news/${n.slug}`} style={{ color: '#2563eb', textDecoration: 'none', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={n.title}>{n.title}</a>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 省级(汇总指标 + 按大类表)────────────────────────────────
export function StatsProvContent({ prov, rows, srcs, t, ranks, news = [] }: { prov: string; rows: StatRow[]; srcs: SrcRow[]; t: TFn; ranks?: { open: number | null; wage: number | null; total: number }; news?: NewsSlimRow[] }) {
  const all = rows.find((r) => r.broad === 'all')
  const cats = BROAD_SLUGS.map(([slug, broad]) => ({ slug, broad, row: rows.find((r) => r.broad === broad) })).filter((x) => x.row)
  const broadLabel = (b: string) => (b === '未分类' ? t('cell.uncat') : t('broad.' + b))
  return (
    <>
      <div style={{ marginBottom: 8 }}><BackLink href="/start" label={t('pulse.entry')} /></div>
      <h1 style={{ fontSize: 22, margin: 0 }}>{t('stats.title', { prov: PROV_NAME[prov] || prov })}</h1>
      {all && <MetricCards r={all} t={t} />}
      {/* 全国排名一句话结论(第 5 轮 #19):P3 要的是答案,不是让用户跨页心算。
          跨省对比入口 2026-08-06 随 /stats/compare 退役一并撤(E13-00 §1 拍板 2) */}
      {ranks && (ranks.open != null || ranks.wage != null) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#eef2ff', border: '1px solid #e0e7ff', borderRadius: 8, padding: '8px 12px', margin: '10px 0 0', fontSize: 13 }}>
          <span style={{ color: '#3730a3' }}>{t('stats.rank', { a: ranks.open ?? '—', b: ranks.wage ?? '—', total: ranks.total })}</span>
        </div>
      )}
      {all && <TopCities raw={all.topCities} t={t} />}
      {all && <DifficultyCard raw={all.difficulty} t={t} />}
      <ProvNewsBlock news={news} t={t} />
      <h2 style={{ fontSize: 15.5, margin: '18px 0 8px' }}>{t('stats.byCat')}</h2>
      {/* E8-08 #121:≤640 大类卡(域卡,minWidth 横滚退役);桌面 DataTable 照旧 */}
      <div className="tcCards">
        {cats.map((x) => (
          <Card key={x.slug}>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}><a href={`/stats/${prov.toLowerCase()}/${x.slug}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{broadLabel(x.broad)}</a></div>
            <CardKV items={[
              { k: t('stats.openJobs'), v: x.row!.openJobs },
              { k: t('stats.new7d'), v: x.row!.new7d },
              { k: t('stats.medWage'), v: money(x.row!.medianWageAnnual) },
              { k: t('stats.named'), v: x.row!.namedJobs ? <span style={{ color: '#b45309', fontWeight: 600 }}>{x.row!.namedJobs}</span> : <span style={{ color: '#9ca3af' }}>—</span> },
            ]} />
            <CardAction><a href={`/?prov=${prov}&broad=${encodeURIComponent(x.broad)}`} style={{ color: '#2563eb', textDecoration: 'none' }}>{t('stats.toJobs')}</a></CardAction>
          </Card>
        ))}
      </div>
      <div className="tcTableWrap">
      {/* 组件统一 P2 余批(#110):换公共 DataTable;minWidth 560=窄屏横滚不挤竖排(第 2 轮 #10) */}
      <DataTable<typeof cats[number]> rows={cats} rowKey={(x) => x.slug} minWidth={560} cols={[
        { key: 'cat', label: t('filter.cat'), sort: (x) => broadLabel(x.broad), render: (x) => <a href={`/stats/${prov.toLowerCase()}/${x.slug}`} style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>{broadLabel(x.broad)}</a> },
        { key: 'open', label: t('stats.openJobs'), sort: (x) => x.row!.openJobs, render: (x) => <>{x.row!.openJobs}</> },
        { key: 'new7d', label: t('stats.new7d'), sort: (x) => x.row!.new7d, render: (x) => <>{x.row!.new7d}</> },
        { key: 'wage', label: t('stats.medWage'), sort: (x) => x.row!.medianWageAnnual ?? null, render: (x) => <>{money(x.row!.medianWageAnnual)}</> },
        { key: 'named', label: t('stats.named'), sort: (x) => x.row!.namedJobs ?? null, render: (x) => x.row!.namedJobs ? <span style={{ color: '#b45309', fontWeight: 600 }}>{x.row!.namedJobs}</span> : <span style={{ color: '#9ca3af' }}>—</span> },
        { key: 'go', label: '', nowrap: true, render: (x) => <a href={`/?prov=${prov}&broad=${encodeURIComponent(x.broad)}`} style={{ color: '#2563eb', textDecoration: 'none', fontSize: 12.5 }}>{t('stats.toJobs')}</a> },
      ]} />
      </div>
      <CaliberLine t={t} srcs={srcs} fetched={all?.fetched || ''} />
    </>
  )
}
export function StatsProvView({ prov, rows, srcs, ranks, news }: { prov: string; rows: StatRow[]; srcs: SrcRow[]; ranks?: { open: number | null; wage: number | null; total: number }; news?: NewsSlimRow[] }) {
  const [lang, setLang, t] = useLang()
  return <StatsShell lang={lang} setLang={setLang} t={t}><StatsProvContent prov={prov} rows={rows} srcs={srcs} t={t} ranks={ranks} news={news} /></StatsShell>
}

// ── 省×大类详情 ──────────────────────────────────────────────
export function StatsCatContent({ prov, row, srcs, t }: { prov: string; row: StatRow; srcs: SrcRow[]; t: TFn }) {
  const broadLabel = row.broad === '未分类' ? t('cell.uncat') : t('broad.' + row.broad)
  return (
    <>
      <div style={{ marginBottom: 8 }}><BackLink href={`/stats/${prov.toLowerCase()}`} label={t('stats.title', { prov: PROV_NAME[prov] || prov })} /></div>
      <h1 style={{ fontSize: 22, margin: 0 }}>{t('stats.catTitle', { prov: PROV_NAME[prov] || prov, cat: broadLabel })}</h1>
      <MetricCards r={row} t={t} />
      {row.streamLabels && (
        <div style={{ margin: '8px 0', fontSize: 12.5, color: '#6b7280' }}>
          {t('stats.streams')}:{row.streamLabels.split('、').map((s2) => <span key={s2} style={{ background: '#fef3c7', color: '#b45309', borderRadius: 6, padding: '2px 8px', marginLeft: 6, fontWeight: 500 }}>{streamDisplay(t, s2)}</span>)}
        </div>
      )}
      <TopCities raw={row.topCities} t={t} />
      <a href={`/?prov=${prov}&broad=${encodeURIComponent(row.broad)}`}
        style={{ display: 'inline-block', marginTop: 10, background: '#2563eb', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>
        {t('stats.toJobs')}
      </a>
      <CaliberLine t={t} srcs={srcs} fetched={row.fetched} />
    </>
  )
}
export function StatsCatView({ prov, row, srcs }: { prov: string; row: StatRow; srcs: SrcRow[]; catSlug?: string }) {
  const [lang, setLang, t] = useLang()
  return <StatsShell lang={lang} setLang={setLang} t={t}><StatsCatContent prov={prov} row={row} srcs={srcs} t={t} /></StatsShell>
}
