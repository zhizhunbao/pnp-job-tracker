'use client'
// 移民动态视图(E12-06 P1b):卡片流 + 详情页。零前端计算——渲染 DB news 行(ETL 近 60 条滚动)。
// v3 拍板:详情页主体=官方英文原文直贴;中文翻译/速读/朗读后置(DB 已留列,恢复=开关式)。
// 转载姿势四件套(E4-03 框架):© 出处方 · 非官方声明 · 原文链接 ↗ · 官方发布日期。
import { useMemo, useState } from 'react'
import { type TFn } from '../jobs/i18n'
import { useLang } from '../stats/ui'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { newsPublisher, newsRegionName, NEWS_REGIONS, type NewsCard, type NewsRow } from './shared'

function NewsShell({ children }: { children: (t: TFn) => React.ReactNode }) {
  const [lang, setLang, t] = useLang()
  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLang} t={t} active="news" />
      <div style={{ maxWidth: 1100, margin: '2rem auto', padding: '0 1rem', width: '100%', boxSizing: 'border-box', flex: 1 }}>{children(t)}</div>
      <SiteFooter t={t} />
    </div>
  )
}

const regionLabel = (t: TFn, r: string) => (r === 'federal' ? t('news.federal') : newsRegionName(r))

// og:image hotlink(链接预览惯例)+ 加载失败整块隐藏,不落盘缓存原图(§2)
function OgImage({ src, alt, height }: { src: string | null; alt: string; height: number }) {
  const [dead, setDead] = useState(false)
  if (!src || dead) return null
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} onError={() => setDead(true)}
    style={{ width: '100%', height, objectFit: 'cover', borderRadius: '10px 10px 0 0', display: 'block', background: '#f3f4f6' }} />
}

// ── 卡片流 /news ─────────────────────────────────────────────
export function NewsListView({ items }: { items: NewsCard[] }) {
  const [region, setRegion] = useState('')
  return (
    <NewsShell>{(t) => {
      // 省 chips:有数据的源才显(同榜单先例);顺序按 NEWS_REGIONS
      const present = NEWS_REGIONS.filter((r) => items.some((i) => i.region === r))
      const shown = region ? items.filter((i) => i.region === region) : items
      const chip = (active: boolean): React.CSSProperties => ({
        border: '1px solid ' + (active ? '#2563eb' : '#e5e7eb'), background: active ? '#2563eb' : '#fff',
        color: active ? '#fff' : '#6b7280', borderRadius: 999, padding: '4px 12px', fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap',
      })
      return (
        <>
          <h1 style={{ fontSize: 22, margin: 0 }}>{t('news.title')}</h1>
          <div style={{ fontSize: 12.5, color: '#6b7280', margin: '6px 0 14px' }}>{t('news.sub')}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <button style={chip(!region)} onClick={() => setRegion('')}>{t('chart.all')}</button>
            {present.map((r) => <button key={r} style={chip(region === r)} onClick={() => setRegion(r)}>{regionLabel(t, r)}</button>)}
          </div>
          {!shown.length && <div style={{ color: '#9ca3af', fontSize: 13.5 }}>{t('news.empty')}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {shown.map((n) => (
              <a key={n.slug} href={`/news/${n.slug}`}
                style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, textDecoration: 'none', color: '#1f2937', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <OgImage src={n.ogImage} alt="" height={140} />
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  <div style={{ fontSize: 11.5, color: '#9ca3af', display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <span style={{ background: '#eef2ff', color: '#3730a3', borderRadius: 6, padding: '1px 7px', fontWeight: 600 }}>{regionLabel(t, n.region)}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{n.date}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.45 }}>{n.title}</div>
                  {n.excerpt && <div style={{ fontSize: 12.5, color: '#6b7280', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.excerpt}</div>}
                  {n.region === 'QC' && <div style={{ fontSize: 11.5, color: '#b45309', marginTop: 'auto' }}>{t('news.qcNote')}</div>}
                </div>
              </a>
            ))}
          </div>
        </>
      )
    }}</NewsShell>
  )
}

// ── 详情页 /news/[slug] ──────────────────────────────────────
export function NewsDetailView({ row }: { row: NewsRow }) {
  const paras = useMemo(() => row.bodyEn.split(/\n+/).map((p) => p.trim()).filter(Boolean), [row.bodyEn])
  return (
    <NewsShell>{(t) => (
      <>
        <div style={{ fontSize: 12.5, marginBottom: 10 }}><a href="/news" style={{ color: '#2563eb', textDecoration: 'none' }}>{t('news.back')}</a></div>
        <article style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 22px', maxWidth: 780 }}>
          <div style={{ fontSize: 11.5, color: '#9ca3af', display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span style={{ background: '#eef2ff', color: '#3730a3', borderRadius: 6, padding: '1px 7px', fontWeight: 600 }}>{regionLabel(t, row.region)}</span>
            <span>{t('news.published', { d: row.date })}</span>
          </div>
          <h1 style={{ fontSize: 20, margin: '8px 0 4px', lineHeight: 1.4 }}>{row.title}</h1>
          {/* 转载姿势四件套:©+非官方声明(一行)+ 原文链 + 日期(上方 meta 行) */}
          <div style={{ fontSize: 11.5, color: '#9ca3af', marginBottom: 12 }}>
            {t('news.copy', { who: newsPublisher(row.region) })}
            {' · '}<a href={row.url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{t('news.official')}</a>
          </div>
          {row.region === 'QC' && <div style={{ fontSize: 12, color: '#b45309', background: '#fffbeb', borderRadius: 8, padding: '6px 10px', marginBottom: 12 }}>{t('news.qcNote')}</div>}
          <OgImage src={row.ogImage} alt="" height={220} />
          <div style={{ fontSize: 14, lineHeight: 1.75, color: '#374151', marginTop: 12 }}>
            {paras.map((p, i) => <p key={i} style={{ margin: '0 0 12px' }}>{p}</p>)}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: 14, marginTop: 4 }}>
            <a href={row.url} target="_blank" rel="noreferrer"
              style={{ background: '#2563eb', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>{t('news.official')}</a>
            {/* 新闻→找岗闭环深链(§6):省新闻带省筛选,联邦看全部 */}
            <a href={row.region === 'federal' ? '/' : `/?prov=${row.region}`}
              style={{ color: '#2563eb', textDecoration: 'none', fontSize: 13 }}>{row.region === 'federal' ? t('news.toJobsAll') : t('news.toJobs')}</a>
          </div>
        </article>
      </>
    )}</NewsShell>
  )
}
