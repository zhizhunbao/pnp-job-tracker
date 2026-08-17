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
import { Header } from '../Header'
import { Footer } from '../Footer'
import { BackLink } from '../BackLink'
import { BANNER_IMGS, CARD_SHELL, Banner, Shell, SectionTabs, chipStyle } from '../ui'
import { IconNews } from '../Icons'
import { newsPublisher, newsRegionName, NEWS_REGIONS, type NewsCard, type NewsComment, type NewsHero, type NewsRow } from './shared'

function NewsShell({ children }: { children: (t: TFn, lang: Lang) => React.ReactNode }) {
  const [lang, setLang, t] = useLang()
  return (
    <div className="nwShell">
      <Header lang={lang} setLang={setLang} t={t} active="news" />
      <div className="nwMain">{children(t, lang)}</div>
      <Footer t={t} />
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
  return <span className={fed ? 'nwRegion fed' : 'nwRegion'}>{regionLabel(t, region)}</span>
}

// AI 重要度徽标(P1d;P1f 收窄):只给 5 分挂红「重要」——琥珀「关注」档 Frank 拍板删(没用)。
// hover=一句理由+口径声明(AI 评,非资格判定);「只看重要」筛选仍取 ≥4(重要动态梯队)。
function ImpBadge({ t, lang, importance, note }: { t: TFn; lang: string; importance: number | null; note: string | null }) {
  if (importance == null || importance < 5) return null
  // #216(第 27 轮体检):importanceNote 是数据层生成的**中文**理由,英/韩界面悬停会漏出中文(实测 12 处)。
  // 非中文界面只挂口径声明,不拿中文当国际文案;要真给三语,得在数据层把 note 翻好(翻译管线另立项)。
  // 顺手:原来两截用「·」拼(属性也是 UI 文案,no-dot 硬规矩),改成一行一条。
  const tip = [lang === 'zh' ? note : '', t('news.aiScore')].filter(Boolean).join('\n')
  return <span className="nwImp" title={tip}>{t('news.imp')}</span>
}

// 省份地标图路径(本站静态,来源见 public/img/regions/SOURCES.md;致谢挂 title——Frank 2026-07-18「水印去掉」,
// CC BY/BY-SA 致谢不能全删,挪 hover)
// #206(第 26 轮体检):NB/NL/PE 没有地标图,原来照拼路径 → /img/regions/nb.jpg 404 裂图(全站唯一 4xx)。
// 缺图退联邦通用图,不拿别省照片冒充;补齐真实地标照后把省码加进 HAS_IMG 即可。
const HAS_IMG = new Set(['ab', 'bc', 'mb', 'ns', 'on', 'qc', 'sk'])
const regionImg = (r: string) => {
  const k = r.toLowerCase()
  return `/img/regions/${HAS_IMG.has(k) ? k : 'federal'}.jpg`
}
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
      <div className="nwTile fallback" style={{ '--tbg': bg, '--tfg': fg } as React.CSSProperties}>
        <div className={region === 'federal' ? 'nwTileCode fed' : 'nwTileCode'}>{region === 'federal' ? 'IRCC' : region}</div>
        <div className="nwTileSub">{region === 'federal' ? 'Canada' : newsRegionName(region)}</div>
      </div>
    )
  }
  return (
    <div className="nwTile">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="nwTileImg" src={regionImg(region)} alt="" title={IMG_CREDIT} onError={() => setDead(true)} />
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
  // 图区**定高 300**(2026-07-19 Frank:「图片不一样大小到现在都没解决」):此前 flex:1 弹性吃高度差,
  // 每张 slide 文字行数不同 → 图片忽大忽小;高度差改由下方文字区(flex:1+minHeight)吸收,图恒定。
  const [dead, setDead] = useState(false)
  if (dead) {
    return (
      <div className="nwHero fallback" style={{ '--tile': tileBg(s.region) } as React.CSSProperties}>
        <span className="nwHeroCode">{s.region === 'federal' ? 'IRCC' : newsRegionName(s.region)}</span>
      </div>
    )
  }
  return (
    <div className="nwHero">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={regionImg(s.region)} alt="" title={IMG_CREDIT}
        onError={() => setDead(true)}
        className="nwHeroImg" />
      <div className="nwHeroScrim" />
      {/* 角标水印已删(Frank 2026-07-18);Commons 致谢=img title 悬停 + SOURCES.md */}
      <span className="nwHeroTag">{s.region === 'federal' ? 'Canada' : newsRegionName(s.region)}</span>
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
  const step = (d: number) => (e: React.MouseEvent) => { e.preventDefault(); setIdx((i) => (i + d + n) % n) }
  return (
    <div className="nwTop">
      <a className="nwBig" href={`/news/${hero.slug}`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        {/* 图区包一层相对定位:箭头/圆点锚在图内;图定高,与右列的高度差由下方文字区吸收 */}
        <div className="nwBigImg">
          <HeroImage key={hero.slug} s={hero} />
          {n > 1 && (<>
            <button className="nwArrow prev" aria-label="prev" onClick={step(-1)}>‹</button>
            <button className="nwArrow next" aria-label="next" onClick={step(1)}>›</button>
            {/* #212(第 26 轮体检续):圆点原来钮就是那颗 8×8 的点 —— 钮改透明热区(手机 40×40),视觉点挪进内层 span */}
            <span className="nwDots">
              {slides.map((s, i) => (
                <button key={s.slug} className="nwDot" aria-label={`slide ${i + 1}`}
                  onClick={(e) => { e.preventDefault(); setIdx(i) }}>
                  <span className={i === idx % n ? 'nwDotIn on' : 'nwDotIn'} />
                </button>
              ))}
            </span>
          </>)}
        </div>
        <div className="nwBigBody">
          <div className="nwMeta">
            {/* #205:原为裸档「重要 5/5」(禁裸 X/5,#132 同规矩)——与列表统一走 ImpBadge,理由与口径挂 title */}
            <ImpBadge t={t} lang={lang} importance={hero.importance} note={hero.importanceNote} />
            <RegionTag t={t} region={hero.region} />
            <span className="nwNum">{hero.date}</span>
          </div>
          <div className="nwBigTitle">{hero.title}</div>
          {summary && (
            <div className="nwBigSum">
              {!!aiSum && <span className="nwAiTag">{t('news.aiSum')}</span>}
              {summary}
            </div>
          )}
        </div>
      </a>
      <div className="nwSide">
        <h3 className="nwSideH">{t('news.topTitle')}</h3>
        {side.map((s, i) => (
          <a key={s.slug} href={`/news/${s.slug}`} className={i ? 'rowHover nwSideItem sep' : 'rowHover nwSideItem'}>
            <div className="nwSideTitle">{s.title}</div>
            <div className="nwSideMeta">
              <ImpBadge t={t} lang={lang} importance={s.importance} note={s.importanceNote} />
              <RegionTag t={t} region={s.region} />
              <span className="nwNum">{s.date.slice(5)}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}

// ── 列表 /news(v4 头版式):页头+筛选 → 头条网格(1大+4小) → 按日分组单列时间线,全页 1100 单轨 ──
export function News({ items, hero, cmtCounts }: { items: NewsCard[]; hero: NewsHero[]; cmtCounts: Record<string, number> }) {
  const [region, setRegion] = useState('')
  // 「只看重要」筛选已删(Frank 2026-07-18「这个去掉」);重要度徽标/头条梯队保留
  return (
    <NewsShell>{(t, lang) => {
      const present = NEWS_REGIONS.filter((r) => items.some((i) => i.region === r))
      // #210(第 26 轮体检):头条区那 5 条(1 大 + 4 小)在下方时间线里又出现一遍,同页同一条读两次。
      // 头条区只在未筛选时显示 → 未筛选时把这 5 条从时间线剔掉;筛选态头条不显,列表照旧全给。
      const heroSlugs = new Set(hero.map((h) => h.slug))
      const shown = items.filter((i) => (region ? i.region === region : !heroSlugs.has(i.slug)))
      const byDay: [string, NewsCard[]][] = []
      for (const n of shown) {
        const last = byDay[byDay.length - 1]
        if (last && last[0] === n.date) last[1].push(n)
        else byDay.push([n.date, [n]])
      }
      const chip = chipStyle   // P3 chips 归并(#114):与 primitives 同款,本地副本退役
      return (
        <>
          {/* 正文轨=Shell 1320(Frank 2026-07-18 宽度统一拍板),原 1100 单轨退役 */}
          <Shell pad="1rem 1.25rem 32px">
            {/* 页头=Banner 图版(2026-07-31 banner 统一:上距全站 1rem、补 news 图组,原 marginTop:16 包层撤) */}
            {/* 2026-07-19 Frank 批提案:二级导航=统一 SectionTabs(公告|时间线),右槽链接退役 */}
            <Banner module="news" icon={<IconNews />} title={t('news.title')} images={BANNER_IMGS.news} />
            <SectionTabs color="#0f766e" tabs={[
              { href: '/news', label: t('tl.tabNews'), active: true },
              { href: '/timeline', label: t('tl.title') },
            ]} />
            <div className="nwChips">
              <button className="tapPad" style={chip(!region)} onClick={() => setRegion('')}>{t('chart.all')}</button>
              {present.map((r) => <button key={r} className="tapPad" style={chip(region === r)} onClick={() => setRegion(r)}>{regionLabel(t, r)}</button>)}
            </div>
            {/* 头条区:1 大 + 4 小(大卡轮播);筛选态下不显(看筛选结果为主) */}
            {!region && <FeaturedGrid t={t} lang={lang} slides={hero} />}
            {!shown.length && <div className="nwEmpty">{t('news.empty')}</div>}
            {byDay.map(([day, rows]) => (
              <div key={day}>
                <div className="nwDay">
                  {day}<span className="nwDayLine" />
                </div>
                {rows.map((n) => (
                  <a key={n.slug} href={`/news/${n.slug}`} className="cardHover nwRow" style={CARD_SHELL}>
                    <ListTile region={n.region} />
                    <div className="nwRowBody">
                      <div className="nwRowMeta">
                        <RegionTag t={t} region={n.region} />
                        <ImpBadge t={t} lang={lang} importance={n.importance} note={n.importanceNote} />
                        <span className="nwNum">{n.date}</span>
                        {n.region === 'QC' && <span className="nwQc">{t('news.qcNote')}</span>}
                      </div>
                      <div className="nwRowTitle">{n.title}</div>
                      {n.excerpt && <div className="nwRowExcerpt">{n.excerpt}</div>}
                      <div className="nwRowFoot">
                        {COMMENTS_ON && <span>💬 {t('news.cmt.n', { n: cmtCounts[n.slug] || 0 })}</span>}
                        <span className="nwRead">{t('news.read')}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ))}
          </Shell>
        </>
      )
    }}</NewsShell>
  )
}

// ── 评论区(v3 ④ → F 件 v2,E8-07 2026-07-20):登录可评 → 人工审核后显示 ─────────────────
// #95 暂藏后亮回(Frank「新闻资讯板块完全参考」内容站评论形态,拍板=开;日审归 Frank):
// v2 形态=计数头 + 官方置顶楼(admin 号发+pinned,蓝底卡)+ 楼中楼一层(「展开 N 条回复」折叠,≤3 直接展开)。
// 不学匿名直发(信任边界):登录+pending 审核制原样;脱敏昵称快照照旧。
const COMMENTS_ON = true
function CommentRow({ cm, t, loggedIn, onReply, replying }: { cm: NewsComment; t: TFn; loggedIn: boolean; onReply?: () => void; replying?: boolean }) {
  const av = (
    <span className={cm.official ? 'nwCmtAv official' : 'nwCmtAv'}>{(cm.authorName || '?')[0].toUpperCase()}</span>
  )
  return (
    <div className="nwCmt">
      {av}
      <div className="nwCmtMain">
        <div className="nwCmtHead">
          <span className={cm.official ? 'nwCmtName official' : 'nwCmtName'}>{cm.authorName}</span>
          {cm.official && <span className="nwCmtTag">{t('news.cmt.official')}</span>}
          {cm.pinned && <span className="nwCmtTag pinned">{t('news.cmt.pinnedTag')}</span>}
          <span className="nwCmtDate">{cm.date}</span>
        </div>
        <div className="nwCmtText">{cm.body}</div>
        {loggedIn && onReply && (
          <button className={replying ? 'nwCmtReply on' : 'nwCmtReply'} onClick={onReply}>{t('news.cmt.reply')}</button>
        )}
      </div>
    </div>
  )
}
function CommentsSection({ t, slug, comments, loggedIn }: { t: TFn; slug: string; comments: NewsComment[]; loggedIn: boolean }) {
  const [body, setBody] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'err'>('idle')
  const [replyTo, setReplyTo] = useState<number | null>(null)   // 展开中的回复框(顶层楼 id)
  const [replyBody, setReplyBody] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())   // 折叠展开的楼
  // 楼序:顶层=置顶先、再时间倒序;楼内回复=时间正序(SSR 给的就是 ASC,分组即得)
  const tops = comments.filter((c) => !c.parentId).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id))
  const replies = new Map<number, NewsComment[]>()
  for (const c of comments) if (c.parentId) { const l = replies.get(c.parentId) || []; l.push(c); replies.set(c.parentId, l) }
  const post = async (text: string, parent: number | null) => {
    if (!text || state === 'busy') return false
    setState('busy')
    try {
      const r = await fetch('/api/comments', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsSlug: slug, body: text, ...(parent != null ? { parent } : {}) }),
      })
      if (!r.ok) throw new Error(String(r.status))
      setState('sent'); return true
    } catch { setState('err'); return false }
  }
  const submit = async () => { if (await post(body.trim(), null)) setBody('') }
  const submitReply = async () => { if (await post(replyBody.trim(), replyTo)) { setReplyBody(''); setReplyTo(null) } }
  const thread = (top: NewsComment) => {
    const rs = replies.get(top.id) || []
    const open = rs.length <= 3 || expanded.has(top.id)
    return (
      <div key={top.id} className={top.pinned ? 'nwThread pinned' : 'nwThread'}>
        <CommentRow cm={top} t={t} loggedIn={loggedIn} onReply={() => { setReplyTo(replyTo === top.id ? null : top.id); setReplyBody('') }} replying={replyTo === top.id} />
        {replyTo === top.id && (
          <div className="nwReplyBox">
            <textarea value={replyBody} onChange={(e) => { setReplyBody(e.target.value); if (state === 'sent' || state === 'err') setState('idle') }}
              maxLength={1000} rows={2} placeholder={t('news.cmt.replyPh')} autoFocus className="nwTextarea sm" />
            <button className="nwSend sm" onClick={submitReply} disabled={!replyBody.trim() || state === 'busy'}>{t('news.cmt.send')}</button>
          </div>
        )}
        {rs.length > 0 && (
          <div className="nwReplies">
            {open && rs.map((r) => <CommentRow key={r.id} cm={r} t={t} loggedIn={false} />)}
            {rs.length > 3 && (
              <button onClick={() => setExpanded((s) => { const n = new Set(s); if (n.has(top.id)) n.delete(top.id); else n.add(top.id); return n })}
                className="nwExpand">
                {open ? t('news.cmt.collapse') : t('news.cmt.expand', { n: rs.length })}
              </button>
            )}
          </div>
        )}
      </div>
    )
  }
  return (
    <section id="comments" className="nwCmtSec" style={CARD_SHELL}>
      <h3 className="nwCmtTitle">{t('news.cmt.title', { n: comments.length })}</h3>
      {loggedIn ? (
        <div className="nwCmtForm">
          <textarea value={body} onChange={(e) => { setBody(e.target.value); if (state === 'sent' || state === 'err') setState('idle') }}
            maxLength={1000} rows={3} placeholder={t('news.cmt.ph')} className="nwTextarea" />
          <div className="nwCmtActions">
            <button className="nwSend" onClick={submit} disabled={!body.trim() || state === 'busy'}>{t('news.cmt.send')}</button>
            {state === 'sent' && <span className="nwOk">{t('news.cmt.sent')}</span>}
            {state === 'err' && <span className="nwErr">{t('news.cmt.err')}</span>}
          </div>
        </div>
      ) : (
        <a className="nwLoginLink" href="/?login=1">{t('news.cmt.login')}</a>
      )}
      {tops.map(thread)}
    </section>
  )
}

// ── 详情页 /news/[slug]:居中,官方版式,段内换行保真,对照翻译,评论区 ──
const withBreaks = (p: string) => p.split('\n').map((ln, j, arr) => <span key={j}>{ln}{j < arr.length - 1 && <br />}</span>)

export function NewsDetail({ row, comments, loggedIn }: { row: NewsRow; comments: NewsComment[]; loggedIn: boolean }) {
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
      // 外轨=Shell 1320(宽度统一拍板);阅读列 860 居中保行长可读
      <Shell pad="18px 1.25rem 32px">
      <div className="nwRead860">
        <div className="nwBack"><BackLink href="/news" label={t('news.back')} /></div>
        <article className="nwArticle" style={CARD_SHELL}>
          <div className="nwDetMeta">
            <RegionTag t={t} region={row.region} />
            <ImpBadge t={t} lang={lang} importance={row.importance} note={row.importanceNote} />
            <span>{t('news.published', { d: row.date })}</span>
          </div>
          <h1 className="nwDetTitle">{row.title}</h1>
          {/* 转载姿势四件套:©+非官方声明(一行)+ 原文链 + 日期(上方 meta 行);底部不再重复原文钮(P1c) */}
          <div className="nwDetSrc">
            <span>
              {t('news.copy', { who: newsPublisher(row.region) })}
              {' · '}<a className="nwLink" href={row.url} target="_blank" rel="noreferrer">{t('news.official')}</a>
            </span>
            {/* AI 速读钮(P1f):没生成过才显钮;生成后常驻速读框 */}
            {!summary && (
              <button className="nwPill" disabled={sumState === 'busy'} onClick={() => fetchSum(lang)}>
                {sumState === 'busy' ? t('news.sumBusy') : `⚡ ${t('news.aiSum')}`}
              </button>
            )}
            {sumState === 'err' && <span className="nwErr">{t('news.trErr')}</span>}
            {lang !== 'en' && (
              <button disabled={trState === 'busy'}
                onClick={() => { if (zh) setZh(false); else if (trans) setZh(true); else fetchTrans(lang as 'zh' | 'ko') }}
                className={zh ? 'nwPill on' : 'nwPill'}>
                {trState === 'busy' ? t('news.trBusy') : zh ? t('news.trOff') : t('news.trOn')}
              </button>
            )}
            {trState === 'err' && <span className="nwErr">{t('news.trErr')}</span>}
          </div>
          {row.region === 'QC' && <div className="nwQcNote">{t('news.qcNote')}</div>}
          {/* AI 速读框(P1f):生成后常驻正文上方 */}
          {summary && (
            <div className="nwSum">
              <div className="nwSumHead">⚡ {t('news.aiSum')} <span className="nwSumGen">· {t('news.aiGen')}</span></div>
              <div className="nwSumBody">{summary}</div>
            </div>
          )}
          {zh && <div className="nwAiNote">{t('news.aiNote')}</div>}
          <div className="nwBody">
            {paras.map((p, i) => (
              <div key={i} className="nwPara">
                <p>{withBreaks(p)}</p>
                {zh && zhParas[i] && (
                  <p className="nwTrans">{withBreaks(zhParas[i])}</p>
                )}
              </div>
            ))}
            {/* 译文段落多于原文的尾部兜底(不吞) */}
            {zh && zhParas.length > paras.length && zhParas.slice(paras.length).map((p, i) => (
              <p key={`z${i}`} className="nwTrans tail">{withBreaks(p)}</p>
            ))}
          </div>
        </article>{/* 底部深链钮已删(Frank 2026-07-18:「不需要」);找岗入口=顶栏/省页块 */}
        {COMMENTS_ON && <CommentsSection t={t} slug={row.slug} comments={comments} loggedIn={loggedIn} />}
      </div>
      </Shell>
      )
    }}</NewsShell>
  )
}
