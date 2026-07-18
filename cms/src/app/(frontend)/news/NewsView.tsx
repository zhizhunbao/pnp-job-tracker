'use client'
// 移民动态视图(E12-06 P1c 布局 v2,Frank 三点拍板:主 banner / 单列时间线一行一条 / 无图给省默认图统一格式):
// 列表=渐变 banner(标题+口径+省 chips)+按日分组单列,行=左图右文;缩略图 og 图优先,缺图用省色块默认图
// (程序生成,零外部资产,一省一固定色,联邦=IRCC 红)。详情页=居中+官方 canada.ca 式版式,段内换行保真。
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
      <div style={{ flex: 1 }}>{children(t)}</div>
      <SiteFooter t={t} />
    </div>
  )
}

const regionLabel = (t: TFn, r: string) => (r === 'federal' ? t('news.federal') : newsRegionName(r))

// 省默认图配色(一省一固定色;联邦=IRCC 红)+ 标签色
const TILE: Record<string, [string, string]> = {
  federal: ['#b91c1c', '#dc2626'], ON: ['#0f766e', '#14b8a6'], BC: ['#6d28d9', '#a78bfa'],
  AB: ['#b45309', '#f59e0b'], SK: ['#15803d', '#22c55e'], MB: ['#a16207', '#eab308'],
  QC: ['#1d4ed8', '#60a5fa'], NS: ['#0e7490', '#22d3ee'],
}
const tileBg = (r: string) => { const [a, b] = TILE[r] || ['#374151', '#6b7280']; return `linear-gradient(135deg, ${a}, ${b})` }

function RegionTag({ t, region }: { t: TFn; region: string }) {
  const fed = region === 'federal'
  return <span style={{ background: fed ? '#fee2e2' : '#eef2ff', color: fed ? '#b91c1c' : '#3730a3', borderRadius: 6, padding: '1px 7px', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{regionLabel(t, region)}</span>
}

// AI 重要度徽标(P1d):≥4 显「重要」;hover=一句理由+口径声明(AI 评,非资格判定)
function ImpBadge({ t, importance, note }: { t: TFn; importance: number | null; note: string | null }) {
  if (importance == null || importance < 4) return null
  return <span title={`${note || ''}${note ? ' · ' : ''}${t('news.aiScore')}`}
    style={{ background: '#dc2626', color: '#fff', borderRadius: 6, padding: '1px 7px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{t('news.imp')}</span>
}

// 缩略图:og 图优先(加载失败退默认图);缺图=省色块默认图(缩写大字+全名,格式统一)
function NewsThumb({ region, src }: { region: string; src: string | null }) {
  const [dead, setDead] = useState(false)
  if (src && !dead) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="nwThumb" src={src} alt="" onError={() => setDead(true)} style={{ objectFit: 'cover', display: 'block', background: '#f3f4f6', flexShrink: 0 }} />
  }
  return (
    <div className="nwThumb" style={{ background: tileBg(region), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
      <div style={{ fontSize: region === 'federal' ? 24 : 30, fontWeight: 700, letterSpacing: 1 }}>{region === 'federal' ? 'IRCC' : region}</div>
      <div style={{ fontSize: 10.5, opacity: 0.85, marginTop: 2 }}>{region === 'federal' ? 'Government of Canada' : newsRegionName(region)}</div>
    </div>
  )
}

// ── 列表 /news:banner + 按日分组单列时间线 ───────────────────
export function NewsListView({ items }: { items: NewsCard[] }) {
  const [region, setRegion] = useState('')
  const [impOnly, setImpOnly] = useState(false)
  return (
    <NewsShell>{(t) => {
      const present = NEWS_REGIONS.filter((r) => items.some((i) => i.region === r))
      const hasImp = items.some((i) => (i.importance ?? 0) >= 4)
      const shown = items.filter((i) => (!region || i.region === region) && (!impOnly || (i.importance ?? 0) >= 4))
      const byDay: [string, NewsCard[]][] = []
      for (const n of shown) {
        const last = byDay[byDay.length - 1]
        if (last && last[0] === n.date) last[1].push(n)
        else byDay.push([n.date, [n]])
      }
      const chip = (active: boolean): React.CSSProperties => ({
        border: '1px solid ' + (active ? '#fff' : 'rgba(255,255,255,.35)'), background: active ? '#fff' : 'rgba(255,255,255,.12)',
        color: active ? '#1e3a8a' : '#eff6ff', fontWeight: active ? 600 : 400,
        borderRadius: 999, padding: '4px 12px', fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap',
      })
      return (
        <>
          <style>{`.nwThumb{width:168px;min-width:168px;height:112px}
            @media (max-width:640px){.nwThumb{width:104px;min-width:104px;height:96px}}`}</style>
          {/* 主 banner(P1c 拍板):标题+口径+省筛选 chips 全收进横幅 */}
          <div style={{ background: 'linear-gradient(120deg, #1e3a8a, #2563eb 55%, #3b82f6)', color: '#fff', padding: '30px 0 24px' }}>
            <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 1rem' }}>
              <h1 style={{ fontSize: 24, margin: 0 }}>{t('news.title')}</h1>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#dbeafe' }}>{t('news.sub')}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                <button style={chip(!region)} onClick={() => setRegion('')}>{t('chart.all')}</button>
                {present.map((r) => <button key={r} style={chip(region === r)} onClick={() => setRegion(r)}>{regionLabel(t, r)}</button>)}
                {/* 只看重要(P1d):AI 重要度 ≥4;有徽标数据才显 */}
                {hasImp && <button style={{ ...chip(impOnly), marginLeft: 6 }} title={t('news.aiScore')} onClick={() => setImpOnly(!impOnly)}>{t('news.impOnly')}</button>}
              </div>
            </div>
          </div>
          <div style={{ maxWidth: 860, margin: '0 auto', padding: '4px 1rem 32px' }}>
            {!shown.length && <div style={{ color: '#9ca3af', fontSize: 13.5, marginTop: 16 }}>{t('news.empty')}</div>}
            {byDay.map(([day, rows]) => (
              <div key={day}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#9ca3af', margin: '16px 0 8px', fontVariantNumeric: 'tabular-nums' }}>
                  {day}<span style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                </div>
                {rows.map((n) => (
                  <a key={n.slug} href={`/news/${n.slug}`}
                    style={{ display: 'flex', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 10, textDecoration: 'none', color: 'inherit' }}>
                    <NewsThumb region={n.region} src={n.ogImage} />
                    <div style={{ padding: '11px 16px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 11.5, color: '#9ca3af', flexWrap: 'wrap' }}>
                        <RegionTag t={t} region={n.region} />
                        <ImpBadge t={t} importance={n.importance} note={n.importanceNote} />
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{n.date}</span>
                        {n.region === 'QC' && <span style={{ color: '#b45309' }}>{t('news.qcNote')}</span>}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>{n.title}</div>
                      {n.excerpt && <div style={{ fontSize: 12.5, color: '#6b7280', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.excerpt}</div>}
                    </div>
                  </a>
                ))}
              </div>
            ))}
          </div>
        </>
      )
    }}</NewsShell>
  )
}

// ── 详情页 /news/[slug]:居中,官方版式,段内换行保真 ─────────
const withBreaks = (p: string) => p.split('\n').map((ln, j, arr) => <span key={j}>{ln}{j < arr.length - 1 && <br />}</span>)

export function NewsDetailView({ row }: { row: NewsRow }) {
  // 段落=\n\n 分隔;段内 \n(联系人块等)渲染为换行(P1c 保真)
  const paras = useMemo(() => row.bodyEn.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean), [row.bodyEn])
  // 逐段中文对照(P1d,Frank 拍板):bodyZh 与原文同分段(翻译管线约束),按序配对;多出的段尾部兜底
  const zhParas = useMemo(() => (row.bodyZh || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean), [row.bodyZh])
  const [zh, setZh] = useState(false)
  return (
    <NewsShell>{(t) => (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '18px 1rem 32px' }}>
        <div style={{ fontSize: 12.5, marginBottom: 10 }}><a href="/news" style={{ color: '#2563eb', textDecoration: 'none' }}>{t('news.back')}</a></div>
        <article style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '22px 26px' }}>
          <div style={{ fontSize: 11.5, color: '#9ca3af', display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <RegionTag t={t} region={row.region} />
            <ImpBadge t={t} importance={row.importance} note={row.importanceNote} />
            <span>{t('news.published', { d: row.date })}</span>
          </div>
          <h1 style={{ fontSize: 21, margin: '8px 0 4px', lineHeight: 1.4 }}>{row.title}</h1>
          {/* 转载姿势四件套:©+非官方声明(一行)+ 原文链 + 日期(上方 meta 行);底部不再重复原文钮(P1c) */}
          <div style={{ fontSize: 11.5, color: '#9ca3af', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span>
              {t('news.copy', { who: newsPublisher(row.region) })}
              {' · '}<a href={row.url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{t('news.official')}</a>
            </span>
            {zhParas.length > 0 && (
              <button onClick={() => setZh(!zh)}
                style={{ border: '1px solid ' + (zh ? '#2563eb' : '#e5e7eb'), background: zh ? '#eef2ff' : '#fff', color: '#2563eb', borderRadius: 999, padding: '2px 10px', fontSize: 11.5, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {zh ? t('news.zhOff') : t('news.zhOn')}
              </button>
            )}
          </div>
          {row.region === 'QC' && <div style={{ fontSize: 12, color: '#b45309', background: '#fffbeb', borderRadius: 8, padding: '6px 10px', marginBottom: 12 }}>{t('news.qcNote')}</div>}
          {zh && <div style={{ fontSize: 11.5, color: '#9ca3af', marginBottom: 10 }}>{t('news.aiNote')}</div>}
          <div style={{ fontSize: 14, lineHeight: 1.75, color: '#374151', marginTop: 4 }}>
            {paras.map((p, i) => (
              <div key={i} style={{ margin: '0 0 12px' }}>
                <p style={{ margin: 0 }}>{withBreaks(p)}</p>
                {zh && zhParas[i] && (
                  <p style={{ margin: '4px 0 0', padding: '4px 0 4px 12px', borderLeft: '3px solid #dbeafe', color: '#1e40af', fontSize: 13.5 }}>{withBreaks(zhParas[i])}</p>
                )}
              </div>
            ))}
            {/* 译文段落多于原文的尾部兜底(不吞) */}
            {zh && zhParas.length > paras.length && zhParas.slice(paras.length).map((p, i) => (
              <p key={`z${i}`} style={{ margin: '4px 0 12px', padding: '4px 0 4px 12px', borderLeft: '3px solid #dbeafe', color: '#1e40af', fontSize: 13.5 }}>{withBreaks(p)}</p>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14, marginTop: 4 }}>
            {/* 新闻→找岗闭环深链(§6):省新闻带省筛选,联邦看全部 */}
            <a href={row.region === 'federal' ? '/' : `/?prov=${row.region}`}
              style={{ color: '#2563eb', textDecoration: 'none', fontSize: 13 }}>{row.region === 'federal' ? t('news.toJobsAll') : t('news.toJobs')}</a>
          </div>
        </article>
      </div>
    )}</NewsShell>
  )
}
