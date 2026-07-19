'use client'
// 移民动态视图(E12-06 v3 门户形态,Frank 2026-07-18 拍板「1 上 2 用」):
// ① 主 banner=TOP5 重要新闻轮播(importance 驱动,5s 自动+圆点/箭头;摘要用中文速读,EN/KO 退英文摘要)
// ② 二级信息(标题/口径/省 chips)下沉正文区,banner 只讲新闻本身
// ③ 博客式条目:图+标签+徽标+日期+标题+摘要+评论数+阅读全文
// ④ 详情页评论区:登录可评 → 人工审核(approved)后显示;未登录=引导登录
// 缩略图 og 图优先,缺图用省色块默认图(程序生成,一省一固定色,联邦=IRCC 红)。
// 转载姿势四件套(E4-03 框架):© 出处方 · 非官方声明 · 原文链接 ↗ · 官方发布日期。
import { useEffect, useMemo, useState } from 'react'
import { type Lang, type TFn } from '../jobs/i18n'
import { useLang } from '../stats/ui'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { BackLink } from '../BackLink'
import { PageBanner, PageShell, SectionTabs } from '../ui/primitives'
import { IconNews } from '../Icons'
import { newsPublisher, newsRegionName, NEWS_REGIONS, type NewsCard, type NewsComment, type NewsHero, type NewsRow } from './shared'

function NewsShell({ children }: { children: (t: TFn, lang: Lang) => React.ReactNode }) {
  const [lang, setLang, t] = useLang()
  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLang} t={t} active="news" />
      <div style={{ flex: 1 }}>{children(t, lang)}</div>
      <SiteFooter t={t} />
    </div>
  )
}

const regionLabel = (t: TFn, r: string) => (r === 'federal' ? t('news.federal') : newsRegionName(r))

// 省默认图配色(一省一固定色;联邦=IRCC 红)
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

// AI 重要度徽标(P1d;P1f 收窄):只给 5 分挂红「重要」——琥珀「关注」档 Frank 拍板删(没用)。
// hover=一句理由+口径声明(AI 评,非资格判定);「只看重要」筛选仍取 ≥4(重要动态梯队)。
function ImpBadge({ t, importance, note }: { t: TFn; importance: number | null; note: string | null }) {
  if (importance == null || importance < 5) return null
  return <span title={`${note || ''}${note ? ' · ' : ''}${t('news.aiScore')}`}
    style={{ background: '#dc2626', color: '#fff', borderRadius: 6, padding: '1px 7px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{t('news.imp')}</span>
}

// 省份地标图路径(本站静态,来源见 public/img/regions/SOURCES.md;致谢挂 title——Frank 2026-07-18「水印去掉」,
// CC BY/BY-SA 致谢不能全删,挪 hover)
const regionImg = (r: string) => `/img/regions/${r === 'federal' ? 'federal' : r.toLowerCase()}.jpg`
const IMG_CREDIT = 'Wikimedia Commons'

// 列表小色块(仅作缺图兜底;v5 主视觉换真实地标图——Frank 2026-07-18「整个真实的图片进来,大小裁剪也要包含」)
const MUTED: Record<string, [string, string]> = {
  federal: ['#fef2f2', '#b91c1c'], ON: ['#f0fdfa', '#0f766e'], BC: ['#f5f3ff', '#6d28d9'],
  AB: ['#fffbeb', '#b45309'], SK: ['#f0fdf4', '#15803d'], MB: ['#fefce8', '#a16207'],
  QC: ['#eff6ff', '#1d4ed8'], NS: ['#ecfeff', '#0e7490'],
}
function ListTile({ region }: { region: string }) {
  const [dead, setDead] = useState(false)
  const [bg, fg] = MUTED[region] || ['#f3f4f6', '#374151']
  if (dead) {
    // 缺图兜底=v4 淡色字标;副行一行内截断(联邦全名 96px 宽折三行撑破定高的教训)
    return (
      <div style={{ width: 96, minWidth: 96, height: 64, borderRadius: 8, background: bg, color: fg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 700, overflow: 'hidden' }}>
        <div style={{ fontSize: region === 'federal' ? 17 : 20, lineHeight: 1.2 }}>{region === 'federal' ? 'IRCC' : region}</div>
        <div style={{ fontSize: 9.5, fontWeight: 500, opacity: 0.75, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 88 }}>{region === 'federal' ? 'Canada' : newsRegionName(region)}</div>
      </div>
    )
  }
  return (
    <div style={{ width: 96, minWidth: 96, height: 64, borderRadius: 8, overflow: 'hidden' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={regionImg(region)} alt="" title={IMG_CREDIT} onError={() => setDead(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  )
}

// ── 头条区:1 大 + 4 小(v4 BBC/Reuters 式布局保留;v5 大卡恢复轮播——Frank 2026-07-18「这部分
//    应该加个轮播的功能」,推翻 v4「轮播退役」:5s 自动+圆点+箭头,hover 暂停,右列恒显其余 4 条)──
// 高度固定(Frank:「banner 的高度应该是固定的」):图区恒 240px,标题/摘要行数截断,不随内容抖。
// 头条图**不用抓来的 og 图**(Frank:「很多文字的图片不适合作为 banner」——政府 og 图多为文字模板图,
// 裁剪救不回):一律省色字标底,视觉恒定;og 图只在详情页/原文里看。
function HeroImage({ s }: { s: NewsHero }) {
  // P1f(Frank:「最好背景图能用真实的图片」):省份地标实景照(本站静态 /img/regions/,Wikimedia Commons
  // 来源见 SOURCES.md,不外链不用 og 文字图)+ 底部渐变压字;缺图/加载失败退省色字标。
  // flex:1=图区弹性吃掉与右列的高度差(v4.1),minHeight 保底。
  const [dead, setDead] = useState(false)
  if (dead) {
    return (
      <div style={{ flex: 1, minHeight: 240, background: tileBg(s.region), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,.9)', fontWeight: 800, fontSize: 38, letterSpacing: 2, textTransform: 'uppercase' }}>{s.region === 'federal' ? 'IRCC' : newsRegionName(s.region)}</span>
      </div>
    )
  }
  return (
    <div style={{ flex: 1, minHeight: 240, position: 'relative', overflow: 'hidden' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={regionImg(s.region)} alt="" title={IMG_CREDIT}
        onError={() => setDead(true)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(17,24,39,0) 45%, rgba(17,24,39,.55))' }} />
      {/* 角标水印已删(Frank 2026-07-18);Commons 致谢=img title 悬停 + SOURCES.md */}
      <span style={{ position: 'absolute', left: 16, bottom: 10, color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: 1.5, textShadow: '0 1px 4px rgba(0,0,0,.6)', textTransform: 'uppercase' }}>{s.region === 'federal' ? 'Canada' : newsRegionName(s.region)}</span>
    </div>
  )
}

function FeaturedGrid({ t, lang, slides }: { t: TFn; lang: Lang; slides: NewsHero[] }) {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const n = slides.length
  // 5s 自动轮播;hover 暂停;单条不轮
  useEffect(() => {
    if (n < 2 || paused) return
    const id = setInterval(() => setIdx((i) => (i + 1) % n), 5000)
    return () => clearInterval(id)
  }, [n, paused])
  if (!n) return null
  const hero = slides[idx % n]
  const side = slides.filter((_, i) => i !== idx % n).slice(0, 4)
  const aiSum = lang === 'zh' ? hero.summaryZh : lang === 'ko' ? hero.summaryKo : null
  const summary = (aiSum || hero.excerpt || '') as string
  const arrow: React.CSSProperties = { position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(17,24,39,.45)', color: '#fff', fontSize: 15, cursor: 'pointer', lineHeight: 1, zIndex: 2 }
  const step = (d: number) => (e: React.MouseEvent) => { e.preventDefault(); setIdx((i) => (i + d + n) % n) }
  return (
    <div className="nwTop" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginBottom: 8 }}>
      <a href={`/news/${hero.slug}`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
        style={{ position: 'relative', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
        {/* 图区包一层相对定位:箭头/圆点锚在图内,不随下方文字区高度漂移 */}
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <HeroImage key={hero.slug} s={hero} />
          {n > 1 && (<>
            <button aria-label="prev" onClick={step(-1)} style={{ ...arrow, left: 10 }}>‹</button>
            <button aria-label="next" onClick={step(1)} style={{ ...arrow, right: 10 }}>›</button>
            <span style={{ position: 'absolute', left: 0, right: 0, bottom: 10, display: 'flex', justifyContent: 'center', gap: 6, zIndex: 2 }}>
              {slides.map((s, i) => (
                <button key={s.slug} aria-label={`slide ${i + 1}`}
                  onClick={(e) => { e.preventDefault(); setIdx(i) }}
                  style={{ width: 8, height: 8, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', background: i === idx % n ? '#fff' : 'rgba(255,255,255,.45)' }} />
              ))}
            </span>
          </>)}
        </div>
        <div style={{ padding: '14px 18px 16px' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 11.5, color: '#9ca3af', marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ background: '#dc2626', color: '#fff', fontWeight: 700, borderRadius: 6, padding: '1px 7px', fontSize: 11 }}>{t('news.impN', { n: hero.importance ?? '' })}</span>
            <RegionTag t={t} region={hero.region} />
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{hero.date}</span>
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.35, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{hero.title}</div>
          {summary && (
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {!!aiSum && <span style={{ border: '1px solid #d1d5db', borderRadius: 4, padding: '0 5px', fontSize: 10.5, marginRight: 6, color: '#9ca3af' }}>{t('news.aiSum')}</span>}
              {summary}
            </div>
          )}
        </div>
      </a>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '6px 16px 10px' }}>
        <h3 style={{ fontSize: 12.5, color: '#9ca3af', fontWeight: 600, margin: '10px 0 4px', letterSpacing: 0.5 }}>{t('news.topTitle')}</h3>
        {side.map((s, i) => (
          <a key={s.slug} href={`/news/${s.slug}`} style={{ display: 'block', padding: '10px 0', borderTop: i ? '1px solid #f3f4f6' : 'none', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.45, color: '#111827', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.title}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 11.5, color: '#9ca3af', marginTop: 3 }}>
              <ImpBadge t={t} importance={s.importance} note={s.importanceNote} />
              <RegionTag t={t} region={s.region} />
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{s.date.slice(5)}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

// ── 列表 /news(v4 头版式):页头+筛选 → 头条网格(1大+4小) → 按日分组单列时间线,全页 1100 单轨 ──
export function NewsListView({ items, hero, cmtCounts }: { items: NewsCard[]; hero: NewsHero[]; cmtCounts: Record<string, number> }) {
  const [region, setRegion] = useState('')
  // 「只看重要」筛选已删(Frank 2026-07-18「这个去掉」);重要度徽标/头条梯队保留
  return (
    <NewsShell>{(t, lang) => {
      const present = NEWS_REGIONS.filter((r) => items.some((i) => i.region === r))
      const shown = items.filter((i) => !region || i.region === region)
      const byDay: [string, NewsCard[]][] = []
      for (const n of shown) {
        const last = byDay[byDay.length - 1]
        if (last && last[0] === n.date) last[1].push(n)
        else byDay.push([n.date, [n]])
      }
      const chip = (active: boolean): React.CSSProperties => ({
        border: '1px solid ' + (active ? '#2563eb' : '#e5e7eb'), background: active ? '#2563eb' : '#fff',
        color: active ? '#fff' : '#6b7280', fontWeight: active ? 600 : 400,
        borderRadius: 999, padding: '4px 12px', fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap',
      })
      return (
        <>
          {/* v4:头条网格窄屏折单列 */}
          <style>{`@media (max-width:760px){.nwTop{grid-template-columns:1fr !important}}`}</style>
          {/* 正文轨=PageShell 1320(Frank 2026-07-18 宽度统一拍板),原 1100 单轨退役 */}
          <PageShell>
            {/* 页头=PageBanner(#65 五模块统一浅色带,动态=青;口径句已删——P1f Frank「没什么用」) */}
            {/* 2026-07-19 Frank 批提案:二级导航=统一 SectionTabs(公告|时间线),右槽链接退役 */}
            <div style={{ marginTop: 16 }}><PageBanner module="news" icon={<IconNews />} title={t('news.title')} /></div>
            <SectionTabs color="#0f766e" tabs={[
              { href: '/news', label: t('tl.tabNews'), active: true },
              { href: '/timeline', label: t('tl.title') },
            ]} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0 14px' }}>
              <button style={chip(!region)} onClick={() => setRegion('')}>{t('chart.all')}</button>
              {present.map((r) => <button key={r} style={chip(region === r)} onClick={() => setRegion(r)}>{regionLabel(t, r)}</button>)}
            </div>
            {/* 头条区:1 大 + 4 小(大卡轮播);筛选态下不显(看筛选结果为主) */}
            {!region && <FeaturedGrid t={t} lang={lang} slides={hero} />}
            {!shown.length && <div style={{ color: '#9ca3af', fontSize: 13.5, marginTop: 16 }}>{t('news.empty')}</div>}
            {byDay.map(([day, rows]) => (
              <div key={day}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#9ca3af', margin: '16px 0 8px', fontVariantNumeric: 'tabular-nums' }}>
                  {day}<span style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                </div>
                {rows.map((n) => (
                  <a key={n.slug} href={`/news/${n.slug}`}
                    style={{ display: 'flex', gap: 14, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '12px 14px', marginBottom: 10, textDecoration: 'none', color: 'inherit', alignItems: 'flex-start', height: 128, boxSizing: 'border-box', overflow: 'hidden' }}>
                    {/* 行定高 128(Frank:「卡片的宽度和高度也应该是固定的」);标题 2 行/摘要 1 行截断,脚钉底 */}
                    <ListTile region={n.region} />
                    <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 4, height: '100%' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 11.5, color: '#9ca3af', flexWrap: 'wrap', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        <RegionTag t={t} region={n.region} />
                        <ImpBadge t={t} importance={n.importance} note={n.importanceNote} />
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{n.date}</span>
                        {n.region === 'QC' && <span style={{ color: '#b45309' }}>{t('news.qcNote')}</span>}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.title}</div>
                      {n.excerpt && <div style={{ fontSize: 12.5, color: '#6b7280', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.excerpt}</div>}
                      <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: '#9ca3af', marginTop: 'auto' }}>
                        <span>💬 {t('news.cmt.n', { n: cmtCounts[n.slug] || 0 })}</span>
                        <span style={{ color: '#2563eb' }}>{t('news.read')}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ))}
          </PageShell>
        </>
      )
    }}</NewsShell>
  )
}

// ── 评论区(v3 ④):登录可评 → 人工审核后显示 ─────────────────
function CommentsSection({ t, slug, comments, loggedIn }: { t: TFn; slug: string; comments: NewsComment[]; loggedIn: boolean }) {
  const [body, setBody] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'err'>('idle')
  const submit = async () => {
    const text = body.trim()
    if (!text || state === 'busy') return
    setState('busy')
    try {
      const r = await fetch('/api/comments', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsSlug: slug, body: text }),
      })
      if (!r.ok) throw new Error(String(r.status))
      setBody(''); setState('sent')
    } catch { setState('err') }
  }
  const av = (name: string) => (
    <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{(name || '?')[0].toUpperCase()}</span>
  )
  return (
    <section id="comments" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 18px', marginTop: 16 }}>
      <h3 style={{ fontSize: 14.5, margin: '0 0 10px' }}>{t('news.cmt.title', { n: comments.length })}</h3>
      {loggedIn ? (
        <div style={{ marginBottom: 12 }}>
          <textarea value={body} onChange={(e) => { setBody(e.target.value); if (state === 'sent' || state === 'err') setState('idle') }}
            maxLength={1000} rows={3} placeholder={t('news.cmt.ph')}
            style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
            <button onClick={submit} disabled={!body.trim() || state === 'busy'}
              style={{ background: body.trim() && state !== 'busy' ? '#2563eb' : '#93c5fd', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 13, fontWeight: 600, cursor: body.trim() ? 'pointer' : 'default' }}>{t('news.cmt.send')}</button>
            {state === 'sent' && <span style={{ fontSize: 12.5, color: '#15803d' }}>{t('news.cmt.sent')}</span>}
            {state === 'err' && <span style={{ fontSize: 12.5, color: '#b91c1c' }}>{t('news.cmt.err')}</span>}
          </div>
        </div>
      ) : (
        <a href="/?login=1" style={{ display: 'block', border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', color: '#2563eb', fontSize: 13, textDecoration: 'none', marginBottom: 12 }}>{t('news.cmt.login')}</a>
      )}
      {comments.map((cm, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: '1px solid #f3f4f6', fontSize: 13 }}>
          {av(cm.authorName)}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: '#9ca3af', marginBottom: 2 }}>{cm.authorName} · {cm.date}</div>
            <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>{cm.body}</div>
          </div>
        </div>
      ))}
    </section>
  )
}

// ── 详情页 /news/[slug]:居中,官方版式,段内换行保真,对照翻译,评论区 ──
const withBreaks = (p: string) => p.split('\n').map((ln, j, arr) => <span key={j}>{ln}{j < arr.length - 1 && <br />}</span>)

export function NewsDetailView({ row, comments, loggedIn }: { row: NewsRow; comments: NewsComment[]; loggedIn: boolean }) {
  // 段落=\n\n 分隔;段内 \n(联系人块等)渲染为换行(P1c 保真)
  const paras = useMemo(() => row.bodyEn.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean), [row.bodyEn])
  const [zh, setZh] = useState(false)
  // 懒翻译(P1e,Frank 终版「线上实时」):DB 缓存(SSR 带下)命中秒开;缺则点开关时调 /api/news-translate
  // (朋友的 qwen 服务,编号协议服务端校验对齐后写回 DB=永久缓存)。per-lang 各自缓存。
  const [transCache, setTransCache] = useState<{ zh: string | null; ko: string | null }>({ zh: row.bodyZh, ko: row.bodyKo })
  const [trState, setTrState] = useState<'idle' | 'busy' | 'err'>('idle')
  // AI 速读按需生成(P1f):per-lang 缓存(SSR 带下命中秒显);点按钮 → /api/news-summarize → 写库
  const [sumCache, setSumCache] = useState<{ zh: string | null; ko: string | null; en: string | null }>({ zh: row.summaryZh, ko: row.summaryKo, en: row.summaryEn })
  const [sumState, setSumState] = useState<'idle' | 'busy' | 'err'>('idle')
  const fetchSum = async (lang: 'zh' | 'ko' | 'en') => {
    if (sumState === 'busy') return
    setSumState('busy')
    try {
      const r = await fetch('/api/news-summarize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: row.slug, lang }),
      })
      const d = await r.json()
      if (!r.ok || !d.ok) throw new Error(d.error || String(r.status))
      setSumCache((c) => ({ ...c, [lang]: d.summary }))
      setSumState('idle')
    } catch { setSumState('err') }
  }
  const fetchTrans = async (lang: 'zh' | 'ko') => {
    if (trState === 'busy') return
    setTrState('busy')
    try {
      const r = await fetch('/api/news-translate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: row.slug, lang }),
      })
      const d = await r.json()
      if (!r.ok || !d.ok) throw new Error(d.error || String(r.status))
      setTransCache((c) => ({ ...c, [lang]: d.body }))
      setTrState('idle'); setZh(true)
    } catch { setTrState('err') }
  }
  return (
    <NewsShell>{(t, lang) => {
      // 对照按界面语言(Frank 拍板):中→中文 / 韩→韩语 / 英→无开关(原文即英文)。
      // 译文由编号协议保证与原文段对段对齐(缺号=拒收),按序配对安全;超长稿只翻前段,尾段只显英文。
      const trans = lang === 'zh' ? transCache.zh : lang === 'ko' ? transCache.ko : null
      const zhParas = (trans || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
      const summary = sumCache[lang]
      return (
      // 外轨=PageShell 1320(宽度统一拍板);阅读列 860 居中保行长可读
      <PageShell pad="18px 1.25rem 32px">
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ marginBottom: 12 }}><BackLink href="/news" label={t('news.back')} /></div>
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
            {/* AI 速读钮(P1f):没生成过才显钮;生成后常驻速读框 */}
            {!summary && (
              <button disabled={sumState === 'busy'} onClick={() => fetchSum(lang)}
                style={{ border: '1px solid #e5e7eb', background: '#fff', color: '#2563eb', borderRadius: 999, padding: '2px 10px', fontSize: 11.5, cursor: sumState === 'busy' ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
                {sumState === 'busy' ? t('news.sumBusy') : `⚡ ${t('news.aiSum')}`}
              </button>
            )}
            {sumState === 'err' && <span style={{ color: '#b91c1c', fontSize: 11.5 }}>{t('news.trErr')}</span>}
            {lang !== 'en' && (
              <button disabled={trState === 'busy'}
                onClick={() => { if (zh) setZh(false); else if (trans) setZh(true); else fetchTrans(lang as 'zh' | 'ko') }}
                style={{ border: '1px solid ' + (zh ? '#2563eb' : '#e5e7eb'), background: zh ? '#eef2ff' : '#fff', color: '#2563eb', borderRadius: 999, padding: '2px 10px', fontSize: 11.5, cursor: trState === 'busy' ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
                {trState === 'busy' ? t('news.trBusy') : zh ? t('news.trOff') : t('news.trOn')}
              </button>
            )}
            {trState === 'err' && <span style={{ color: '#b91c1c', fontSize: 11.5 }}>{t('news.trErr')}</span>}
          </div>
          {row.region === 'QC' && <div style={{ fontSize: 12, color: '#b45309', background: '#fffbeb', borderRadius: 8, padding: '6px 10px', marginBottom: 12 }}>{t('news.qcNote')}</div>}
          {/* AI 速读框(P1f):生成后常驻正文上方 */}
          {summary && (
            <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600, marginBottom: 4 }}>⚡ {t('news.aiSum')} <span style={{ color: '#9ca3af', fontWeight: 400 }}>· {t('news.aiGen')}</span></div>
              <div style={{ fontSize: 13.5, color: '#1e40af', lineHeight: 1.7 }}>{summary}</div>
            </div>
          )}
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
        </article>{/* 底部深链钮已删(Frank 2026-07-18:「不需要」);找岗入口=顶栏/省页块 */}
        <CommentsSection t={t} slug={row.slug} comments={comments} loggedIn={loggedIn} />
      </div>
      </PageShell>
      )
    }}</NewsShell>
  )
}
