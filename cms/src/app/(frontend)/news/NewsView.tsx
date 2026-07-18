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

// ── 主 banner:TOP5 重要新闻轮播(v3 ①)──────────────────────
function HeroCarousel({ t, lang, slides }: { t: TFn; lang: Lang; slides: NewsHero[] }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (slides.length < 2) return
    const id = setInterval(() => setI((x) => (x + 1) % slides.length), 5000)
    return () => clearInterval(id)
  }, [slides.length])
  if (!slides.length) return null
  const s = slides[i]
  // 摘要按界面语言(Frank 拍板):中→中文速读 / 韩→韩语速读 / 英→英文摘要(缺则逐级回退)
  const aiSum = lang === 'zh' ? s.summaryZh : lang === 'ko' ? s.summaryKo : null
  const summary = (aiSum || s.excerpt || '') as string
  const bg = s.ogImage
    ? `linear-gradient(rgba(17,24,39,.72), rgba(17,24,39,.72)), url(${JSON.stringify(s.ogImage)}) center/cover no-repeat`
    : tileBg(s.region)
  const btn: React.CSSProperties = { width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.18)', color: '#fff', cursor: 'pointer', fontSize: 14, lineHeight: '28px' }
  return (
    <div style={{ position: 'relative', background: bg, color: '#fff', transition: 'background .4s' }}>
      <a href={`/news/${s.slug}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '36px 1rem 48px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ background: '#fff', color: '#b91c1c', fontWeight: 700, borderRadius: 6, padding: '2px 8px' }}>{t('news.impN', { n: s.importance ?? '' })}</span>
            <span style={{ background: 'rgba(255,255,255,.18)', borderRadius: 6, padding: '2px 8px' }}>{regionLabel(t, s.region)}</span>
            <span style={{ opacity: 0.85, fontVariantNumeric: 'tabular-nums' }}>{s.date}</span>
          </div>
          <h2 style={{ fontSize: 23, margin: '0 0 10px', lineHeight: 1.35, maxWidth: 680 }}>{s.title}</h2>
          {summary && (
            <p style={{ fontSize: 13.5, lineHeight: 1.7, opacity: 0.92, margin: 0, maxWidth: 680, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {!!aiSum && <span style={{ border: '1px solid rgba(255,255,255,.45)', borderRadius: 4, padding: '0 5px', fontSize: 10.5, marginRight: 6, verticalAlign: '1px' }}>{t('news.aiSum')}</span>}
              {summary}
            </p>
          )}
        </div>
      </a>
      {slides.length > 1 && (
        <>
          <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 860, padding: '0 1rem', boxSizing: 'border-box', display: 'flex', gap: 6 }}>
            {slides.map((x, k) => (
              <button key={x.slug} onClick={() => setI(k)} aria-label={`slide ${k + 1}`}
                style={{ width: 22, height: 4, borderRadius: 2, border: 'none', cursor: 'pointer', background: k === i ? '#fff' : 'rgba(255,255,255,.35)', padding: 0 }} />
            ))}
          </div>
          <div style={{ position: 'absolute', right: 16, bottom: 10, display: 'flex', gap: 8 }}>
            <button style={btn} aria-label="prev" onClick={() => setI((i - 1 + slides.length) % slides.length)}>‹</button>
            <button style={btn} aria-label="next" onClick={() => setI((i + 1) % slides.length)}>›</button>
          </div>
        </>
      )}
    </div>
  )
}

// ── 列表 /news:banner 轮播 + 页头(下沉) + 按日分组单列时间线 ──
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
          <style>{`.nwThumb{width:168px;min-width:168px;height:118px}
            @media (max-width:640px){.nwThumb{width:104px;min-width:104px;height:96px}}`}</style>
          <HeroCarousel t={t} lang={lang} slides={hero} />
          <div style={{ maxWidth: 860, margin: '0 auto', padding: '4px 1rem 32px' }}>
            {/* 二级信息下沉(v3 ②):标题+口径+筛选不占 banner */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '20px 0 4px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 20, margin: 0 }}>{t('news.title')}</h1>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>{t('news.sub')}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0 6px' }}>
              <button style={chip(!region)} onClick={() => setRegion('')}>{t('chart.all')}</button>
              {present.map((r) => <button key={r} style={chip(region === r)} onClick={() => setRegion(r)}>{regionLabel(t, r)}</button>)}
              {hasImp && <button style={{ ...chip(impOnly), color: impOnly ? '#fff' : '#b91c1c', borderColor: impOnly ? '#2563eb' : '#fecaca' }} title={t('news.aiScore')} onClick={() => setImpOnly(!impOnly)}>{t('news.impOnly')}</button>}
            </div>
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
                    <div style={{ padding: '11px 16px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 11.5, color: '#9ca3af', flexWrap: 'wrap' }}>
                        <RegionTag t={t} region={n.region} />
                        <ImpBadge t={t} importance={n.importance} note={n.importanceNote} />
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{n.date}</span>
                        {n.region === 'QC' && <span style={{ color: '#b45309' }}>{t('news.qcNote')}</span>}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>{n.title}</div>
                      {n.excerpt && <div style={{ fontSize: 12.5, color: '#6b7280', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.excerpt}</div>}
                      {/* 条目脚(v3 ③):评论数+阅读全文 */}
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
  return (
    <NewsShell>{(t, lang) => {
      // 对照按界面语言(Frank 拍板):中→中文 / 韩→韩语 / 英→无开关(原文即英文)。
      // 译文由编号协议保证与原文段对段对齐(缺号=整条不入库),按序配对安全;超长稿只翻前段,尾段只显英文。
      const trans = lang === 'zh' ? row.bodyZh : lang === 'ko' ? row.bodyKo : null
      const zhParas = (trans || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
      return (
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
                {zh ? t('news.trOff') : t('news.trOn')}
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
        </article>{/* 底部深链钮已删(Frank 2026-07-18:「不需要」);找岗入口=顶栏/省页块 */}
        <CommentsSection t={t} slug={row.slug} comments={comments} loggedIn={loggedIn} />
      </div>
      )
    }}</NewsShell>
  )
}
