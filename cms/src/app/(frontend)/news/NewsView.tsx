'use client'
// 移民动态视图(E12-06 v3 门户形态,Frank 2026-07-18 拍板「1 上 2 用」):
// ① 主 banner=TOP5 重要新闻轮播(importance 驱动,5s 自动+圆点/箭头;摘要用中文速读,EN/KO 退英文摘要)
// ② 二级信息(标题/口径/省 chips)下沉正文区,banner 只讲新闻本身
// ③ 博客式条目:图+标签+徽标+日期+标题+摘要+评论数+阅读全文
// ④ 详情页评论区:登录可评 → 人工审核(approved)后显示;未登录=引导登录
// 缩略图 og 图优先,缺图用省色块默认图(程序生成,一省一固定色,联邦=IRCC 红)。
// 转载姿势四件套(E4-03 框架):© 出处方 · 非官方声明 · 原文链接 ↗ · 官方发布日期。
import { useMemo, useState } from 'react'
import { type Lang, type TFn } from '../jobs/i18n'
import { useLang } from '../stats/ui'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { BackLink } from '../BackLink'
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

// AI 重要度徽标(P1d):5=红「重要」/ 4=琥珀「关注」(首批实测 4 分占半,单档红标会狼来了);
// hover=一句理由+口径声明(AI 评,非资格判定)
function ImpBadge({ t, importance, note }: { t: TFn; importance: number | null; note: string | null }) {
  if (importance == null || importance < 4) return null
  const top = importance >= 5
  return <span title={`${note || ''}${note ? ' · ' : ''}${t('news.aiScore')}`}
    style={{ background: top ? '#dc2626' : '#fef3c7', color: top ? '#fff' : '#b45309', borderRadius: 6, padding: '1px 7px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{top ? t('news.imp') : t('news.watch')}</span>
}

// 列表小色块(v4:调小调淡——96×64 淡底深字,原高饱和大块太吵)
const MUTED: Record<string, [string, string]> = {
  federal: ['#fef2f2', '#b91c1c'], ON: ['#f0fdfa', '#0f766e'], BC: ['#f5f3ff', '#6d28d9'],
  AB: ['#fffbeb', '#b45309'], SK: ['#f0fdf4', '#15803d'], MB: ['#fefce8', '#a16207'],
  QC: ['#eff6ff', '#1d4ed8'], NS: ['#ecfeff', '#0e7490'],
}
function ListTile({ region }: { region: string }) {
  const [bg, fg] = MUTED[region] || ['#f3f4f6', '#374151']
  // v4.1:副行一行内截断(联邦全名 96px 宽折三行撑破定高的教训);overflow hidden 硬保 64px
  return (
    <div style={{ width: 96, minWidth: 96, height: 64, borderRadius: 8, background: bg, color: fg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontWeight: 700, overflow: 'hidden' }}>
      <div style={{ fontSize: region === 'federal' ? 17 : 20, lineHeight: 1.2 }}>{region === 'federal' ? 'IRCC' : region}</div>
      <div style={{ fontSize: 9.5, fontWeight: 500, opacity: 0.75, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 88 }}>{region === 'federal' ? 'Canada' : newsRegionName(region)}</div>
    </div>
  )
}

// ── 头条区:1 大 + 4 小(v4,BBC/Reuters 式;轮播退役——自动轮播是新闻站反模式,超宽屏还散架)──
// 高度固定(Frank:「banner 的高度应该是固定的」):图区恒 240px,标题/摘要行数截断,不随内容抖。
// 头条图**不用抓来的 og 图**(Frank:「很多文字的图片不适合作为 banner」——政府 og 图多为文字模板图,
// 裁剪救不回):一律省色字标底,视觉恒定;og 图只在详情页/原文里看。
function HeroImage({ s }: { s: NewsHero }) {
  // flex:1=图区弹性吃掉与右列的高度差(v4.1:头条卡下半截空白),minHeight 保底
  return (
    <div style={{ flex: 1, minHeight: 240, background: tileBg(s.region), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'rgba(255,255,255,.9)', fontWeight: 800, fontSize: 38, letterSpacing: 2, textTransform: 'uppercase' }}>{s.region === 'federal' ? 'IRCC' : newsRegionName(s.region)}</span>
    </div>
  )
}

function FeaturedGrid({ t, lang, slides }: { t: TFn; lang: Lang; slides: NewsHero[] }) {
  if (!slides.length) return null
  const [hero, ...side] = slides
  const aiSum = lang === 'zh' ? hero.summaryZh : lang === 'ko' ? hero.summaryKo : null
  const summary = (aiSum || hero.excerpt || '') as string
  return (
    <div className="nwTop" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginBottom: 8 }}>
      <a href={`/news/${hero.slug}`} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
        <HeroImage s={hero} />
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
  const [impOnly, setImpOnly] = useState(false)
  return (
    <NewsShell>{(t, lang) => {
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
        border: '1px solid ' + (active ? '#2563eb' : '#e5e7eb'), background: active ? '#2563eb' : '#fff',
        color: active ? '#fff' : '#6b7280', fontWeight: active ? 600 : 400,
        borderRadius: 999, padding: '4px 12px', fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap',
      })
      return (
        <>
          {/* v4:头条网格窄屏折单列 */}
          <style>{`@media (max-width:760px){.nwTop{grid-template-columns:1fr !important}}`}</style>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '4px 1rem 32px' }}>
            {/* 页头:标题+口径+筛选(v4:全页统一 1100 单轨,不再有全宽深色 banner) */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '16px 0 4px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 21, margin: 0 }}>{t('news.title')}</h1>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{t('news.sub')}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0 14px' }}>
              <button style={chip(!region)} onClick={() => setRegion('')}>{t('chart.all')}</button>
              {present.map((r) => <button key={r} style={chip(region === r)} onClick={() => setRegion(r)}>{regionLabel(t, r)}</button>)}
              {hasImp && <button style={{ ...chip(impOnly), color: impOnly ? '#fff' : '#b91c1c', borderColor: impOnly ? '#2563eb' : '#fecaca' }} title={t('news.aiScore')} onClick={() => setImpOnly(!impOnly)}>{t('news.impOnly')}</button>}
            </div>
            {/* 头条区(v4):1 大 + 4 小,固定高;筛选态下不显(看筛选结果为主) */}
            {!region && !impOnly && <FeaturedGrid t={t} lang={lang} slides={hero} />}
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
          </div>
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
      return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '18px 1rem 32px' }}>
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
      )
    }}</NewsShell>
  )
}
