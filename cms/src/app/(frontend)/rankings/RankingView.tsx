'use client'
// 榜单视图(E5-02):纯渲染(计算在 ETL);三语壳;岗位行链官方原帖,公司行链官网。
// RankingTable = 内容单一来源(E8-02):页面版与 /jobs 榜单弹窗共用,不许 fork。
import { useEffect, useState } from 'react'
import { makeT, streamDisplay, eeDisplay, LANG_KEY, type Lang, type TFn } from '../jobs/i18n'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { BANNER_IMGS, PageBanner } from '../ui/primitives'
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

const th: React.CSSProperties = { textAlign: 'left', padding: '9px 12px', fontSize: 12.5, color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap', borderBottom: '1px solid #e5e7eb' }
const td: React.CSSProperties = { padding: '9px 12px', fontSize: 13, color: '#374151', borderBottom: '1px solid #f3f4f6' }

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
      <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 16 }}>{t(slug.startsWith('daily-top') ? 'rank.note.daily-top' : 'rank.note.' + slug)}</div>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            {isCompany ? (
              <tr><th style={th}>#</th><th style={th}>{t('rank.col.company')}</th><th style={th}>{t('col.province')}</th><th style={th}>{t('rank.col.lmia')}</th>{showNamed && <th style={th}>{t('rank.col.namedJobs')}</th>}<th style={th}>{t('rank.col.openJobs')}</th><th style={th}>{t('rank.col.avgScore')}</th><th style={th}></th></tr>
            ) : (
              <tr><th style={th}>#</th><th style={th}>{t('col.title')}</th><th style={th}>{t('col.company')}</th><th style={th}>{t('col.city')}</th><th style={th}>{t('col.salary')}</th><th style={th}>PNP/EE</th><th style={th}>{t('col.score')}</th><th style={th}>{t('col.datePosted')}</th></tr>
            )}
          </thead>
          <tbody>
            {items.map((r) => isCompany ? (
              <tr key={r.rank}>
                <td style={{ ...td, color: '#9ca3af' }}>{r.rank}</td>
                <td style={{ ...td, fontWeight: 600 }}>{r.officialUrl ? <a href={r.officialUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{r.company} ↗</a> : r.company}</td>
                {/* #48(第 18 轮):跨省雇主(如加拿大军队)province 为空,裸空像渲染缺陷 → 占位「—」 */}
                <td style={r.province ? td : { ...td, color: '#9ca3af' }}>{r.province || '—'}</td>
                {/* #21:第一排序键(近两年 LMIA 技能股获批职位数)上榜可见;灰色尾缀=最近获批季度 */}
                <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.lmiaPositions
                  ? <><span style={{ fontWeight: 600, color: '#15803d' }}>{r.lmiaPositions}</span>{r.lmiaQuarter && <span style={{ color: '#9ca3af', fontSize: 11.5 }}> · {r.lmiaQuarter}</span>}</>
                  : <span style={{ color: '#9ca3af' }}>—</span>}</td>
                {showNamed && <td style={{ ...td, fontWeight: 600, color: '#b45309' }}>{r.namedJobs}</td>}
                <td style={td}>{r.openJobs}</td>
                <td style={td}>{r.avgScore ?? '—'}</td>
                <td style={td}><a href={`/?q=${encodeURIComponent(r.company)}`} style={{ color: '#2563eb', textDecoration: 'none', fontSize: 12.5 }}>{t('rank.viewJobs')}</a></td>
              </tr>
            ) : (
              <tr key={r.rank}>
                <td style={{ ...td, color: '#9ca3af' }}>{r.rank}</td>
                <td style={{ ...td, fontWeight: 600, maxWidth: 320 }}>{r.applyUrl ? <a href={r.applyUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{r.title} ↗</a> : r.title}</td>
                <td style={td}>{r.company}</td>
                <td style={{ ...td, whiteSpace: 'nowrap' }}>{[r.city, r.province].filter(Boolean).join(', ')}</td>
                <td style={{ ...td, whiteSpace: 'nowrap', color: '#15803d' }}>{r.salaryText || '—'}</td>
                <td style={{ ...td, fontSize: 12 }}>{[r.pnpStream ? streamDisplay(t, r.pnpStream) : '', r.eeCategory ? eeDisplay(t, r.eeCategory) : ''].filter(Boolean).join(' · ') || '—'}</td>
                <td style={{ ...td, fontWeight: 600 }}>{r.score ?? '—'}</td>
                <td style={{ ...td, whiteSpace: 'nowrap', color: '#9ca3af', fontSize: 12.5 }}>{(r.datePosted || '').slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      {/* 顶栏换全站共享 SiteHeader(2026-07-11 用户指出子页 header 与 /jobs 样式不一致) */}
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="rank" />

      <div style={{ maxWidth: 1100, margin: '2rem auto', padding: '0 1rem' }}>
        {/* 页头=PageBanner(#65 五模块统一浅色带,榜单=金) */}
        <PageBanner module="rank" icon={<IconChart />} title={rankTitle(t, slug)} images={BANNER_IMGS.rank} />
        {/* 榜单导航(E9-02 分类榜矩阵):只列当前有数据的榜;当前榜加粗黑。
            #61(2026-07-19 Frank 拍板「就是那个意思」):从页底挪到页头下方——导航是切换入口不是脚注 */}
        <div style={{ margin: '0 0 12px', fontSize: 12.5, display: 'flex', flexWrap: 'wrap', gap: '6px 14px' }}>
          {['daily-top', ...Object.keys(BROAD_BY_SLUG).map((k) => `daily-top-${k}`), 'weekly-top', 'sponsor-likely']
            .filter((x) => x === slug || slugs.includes(x) || x === 'weekly-top' || x === 'sponsor-likely')
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
