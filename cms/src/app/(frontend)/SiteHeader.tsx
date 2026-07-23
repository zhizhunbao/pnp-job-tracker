'use client'
// 全站唯一顶栏(#65 header 合一,Frank 2026-07-18 拍板:「header 合一也做」「为什么不一样宽」):
// /jobs 的内联头已退役,全部页面用本组件,**头轨统一 1320px**(跟最宽的职位板走;各页正文轨可窄但 header 一致)。
// /jobs 特有件走 props:matchButton(「我的匹配」切换态)/accountArea(带 plan 的完整账户下拉)/sticky/searchBar。
// 二级页缺省:matchButton 不传=链接 /?view=match;accountArea 不传=AccountLite(登录=头像药丸,未登录=登录/注册)。
// E8-07 C/D/E(2026-07-20 内容站骨架借鉴批):
//   C=窄屏(≤640)header 下挂通栏搜索带(searchBar 槽:jobs 传受控输入保即时筛选;缺省=form 提交跳 /?q=);
//   D=窄屏汉堡开左侧 4/5 宽侧滑抽屉(条目圆角块,资讯组 chevron 抽屉内展开二级,遮罩/×关,当前页高亮);
//   E=桌面下拉统一 hover 开(离开 150ms 延时关防抖,键盘 focus 同样可开)——资料库改 hover,新增「资讯 ▾」聚合
//     (移民新闻+政策时间线;时间线首次获得顶栏入口)。榜单/统计保持顶级不并组(IA 大改另拍)。
import { useEffect, useRef, useState } from 'react'
import { LANGS, type Lang, type TFn } from './jobs/i18n'
import { Avatar } from './Avatar'
import { Button } from './ui/primitives'
import { IconTarget, IconChart, IconCompass, IconMapPin, IconNews, IconUser, IconUsers } from './Icons'

type AcctState = { state: 'loading' | 'out' | 'in'; u: { email: string; displayName: string | null; avatar: string | null; pro: boolean } }

function AccountLite({ t, acct }: { t: TFn; acct: AcctState }) {
  const { state, u } = acct
  if (state === 'loading') return <span style={{ width: 32 }} />
  if (state === 'in') {
    // #63b(Frank「像 Google 那样只显示图标」):纯头像圆钮,名字/Pro 态挂 title
    return (
      <a href="/account" title={(u.displayName?.trim() || u.email.split('@')[0]) + (u.pro ? ' · Pro' : '')}
        style={{ display: 'inline-flex', padding: 2, borderRadius: '50%', textDecoration: 'none' }}>
        <Avatar src={u.avatar} name={u.displayName || u.email} email={u.email} size={28} />
      </a>
    )
  }
  // Pro 钮不进 header(Frank 2026-07-18:「没有意义」——定价入口=/pricing 与升级卡)
  return (
    <>
      {/* P1 换装(2026-07-19):登录=ghost,注册=primary sm——与 /jobs AccountArea 同规格 */}
      <Button kind="ghost" sm href="/?login=1">{t('nav.login')}</Button>
      <Button kind="primary" sm href="/?signup=1">{t('nav.register')}</Button>
    </>
  )
}

// E 件:hover 下拉(桌面)——统一交互:hover 即开、离开 150ms 延时关、键盘 focus 可开、点击切换(触屏兜底);
// 面板=白卡描边圆角,当前项蓝底高亮。资料库/资讯共用本组件。
function NavDrop({ label, icon, highlight, items }: {
  label: React.ReactNode; icon?: React.ReactNode; highlight: boolean
  items: { href: string; label: React.ReactNode; active?: boolean }[]
}) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enter = () => { if (timer.current) clearTimeout(timer.current); setOpen(true) }
  const leave = () => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 150) }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  return (
    <span onMouseEnter={enter} onMouseLeave={leave} onFocus={enter}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false) }}
      style={{ position: 'relative', display: 'inline-flex' }}>
      <button onClick={() => setOpen((o) => !o)}
        style={{ border: 'none', background: 'none', padding: 0, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap', color: highlight ? '#2563eb' : '#6b7280', fontWeight: highlight ? 700 : 400 }}>
        {icon} {label} <span style={{ fontSize: 10, color: '#9ca3af' }}>▾</span>
      </button>
      {open && (
        <span style={{ position: 'absolute', top: 'calc(100% + 6px)', left: -10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,.12)', padding: '4px 0', zIndex: 40, minWidth: 168, display: 'block' }}>
          {items.map((it) => (
            <a key={it.href} href={it.href}
              style={{ display: 'block', padding: '6px 14px', fontSize: 12.5, textDecoration: 'none', whiteSpace: 'nowrap',
                color: it.active ? '#1d4ed8' : '#374151', background: it.active ? '#eff6ff' : undefined, fontWeight: it.active ? 600 : 400 }}>{it.label}</a>
          ))}
        </span>
      )}
    </span>
  )
}

// D 件:窄屏侧滑抽屉。条目圆角块;带二级的组 chevron 展开;遮罩/×关。
function MobileDrawer({ t, active, showAcctTab, onClose }: { t: TFn; active?: string; showAcctTab: boolean; onClose: () => void }) {
  const [openGrp, setOpenGrp] = useState<string>('')   // 展开中的组(单开足够:资讯/资料库)
  const item = (href: string, label: React.ReactNode, cur: boolean): React.CSSProperties => ({
    display: 'block', padding: '10px 12px', borderRadius: 9, fontSize: 14, textDecoration: 'none',
    background: cur ? '#eff6ff' : '#f9fafb', border: `1px solid ${cur ? '#bfdbfe' : '#e5e7eb'}`,
    color: cur ? '#1d4ed8' : '#374151', fontWeight: cur ? 600 : 400,
  })
  const sub: React.CSSProperties = { display: 'block', padding: '7px 8px', margin: '0 6px 0 16px', borderRadius: 8, fontSize: 13, color: '#4b5563', textDecoration: 'none' }
  const grpBtn: React.CSSProperties = { width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 9, fontSize: 14, background: '#f9fafb', border: '1px solid #e5e7eb', color: '#374151', cursor: 'pointer' }
  const grp = (key: string, label: React.ReactNode, children: { href: string; label: React.ReactNode; active?: boolean }[]) => (
    <>
      <button onClick={() => setOpenGrp((g) => (g === key ? '' : key))} style={grpBtn}>
        <span>{label}</span><span style={{ color: '#9ca3af' }}>{openGrp === key ? '▾' : '▸'}</span>
      </button>
      {openGrp === key && children.map((c) => (
        <a key={c.href} href={c.href} style={{ ...sub, ...(c.active ? { color: '#1d4ed8', background: '#eff6ff', fontWeight: 600 } : {}) }}>{c.label}</a>
      ))}
    </>
  )
  return (
    // 平移动画(Frank 2026-07-23「呼出太宽太大,加平移动画+缩小」):遮罩淡入、面板从左 translateX(-100%)→0 滑入;
    // 挂载即播关键帧(无需 open 态);宽度 80%/340 → 68%/280 收窄,条目内距略缩(仍保 ≥40px 触控高)
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.28)', zIndex: 60, animation: 'drwFade .18s ease' }}>
      <style>{'@keyframes drwFade{from{opacity:0}to{opacity:1}}@keyframes drwSlide{from{transform:translateX(-100%)}to{transform:translateX(0)}}'}</style>
      <div onClick={(e) => e.stopPropagation()}
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '68%', maxWidth: 280, background: '#fff', borderRight: '1px solid #e5e7eb', padding: '0 12px', overflowY: 'auto', animation: 'drwSlide .24s cubic-bezier(.4,0,.2,1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 2px 10px' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>🍁 Offer2PR</span>
          <button onClick={onClose} aria-label={t('nav.menu')} style={{ width: 32, height: 32, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 20 }}>
          <a href="/" style={item('/', t('detail.crumbHome'), !active)}>{t('detail.crumbHome')}</a>
          <a href="/?view=match" style={item('/?view=match', '', false)}>{t('mv.entry')}</a>
          <a href="/pathways" style={item('/pathways', '', active === 'pathways')}>{t('pw.entry')}</a>
          {grp('lib', t('nav.library'), [
            { href: '/employers', label: t('dir.title'), active: active === 'employers' },
            { href: '/occupations', label: t('dir.occ.title') },
            { href: '/resources', label: t('res.entry') },
          ])}
          <div style={{ fontSize: 10.5, color: '#9ca3af', letterSpacing: .5, padding: '6px 4px 0' }}>{t('nav.sect.data')}</div>
          <a href="/rankings/weekly-top" style={item('/rankings/weekly-top', '', active === 'rank')}>{t('rank.entry')}</a>
          <a href="/stats" style={item('/stats', '', active === 'stats')}>{t('stats.entry')}</a>
          {grp('info', t('nav.info'), [
            { href: '/news', label: t('news.entry'), active: active === 'news' },
            { href: '/timeline', label: t('nav.timeline') },
          ])}
          {showAcctTab && <>
            <div style={{ fontSize: 10.5, color: '#9ca3af', letterSpacing: .5, padding: '6px 4px 0' }}>{t('nav.sect.mine')}</div>
            <a href="/account" style={item('/account', '', active === 'account')}>{t('nav.acctTab')}</a>
          </>}
        </nav>
      </div>
    </div>
  )
}

export function SiteHeader({ lang, setLang, t, active, sticky, matchButton, accountArea, loggedIn, searchBar }: {
  lang: Lang; setLang: (l: Lang) => void; t: TFn
  active?: 'rank' | 'stats' | 'account' | 'pathways' | 'news' | 'employers'
  sticky?: boolean
  matchButton?: { active: boolean; onClick: () => void }
  accountArea?: React.ReactNode
  loggedIn?: boolean   // 宿主已知登录态时传入(/jobs 走 plan);不传=本组件自查 /api/users/me
  searchBar?: React.ReactNode   // C 件:窄屏搜索带内容(jobs 传受控输入;不传=form 提交跳 /?q=)
}) {
  // 登录态上提(2026-07-19 Frank:「我的账户模块应该是登录之后才显示」)——原 AccountLite 私有 fetch
  // 提到 header 级,导航「我的账户」与右端账户区共用;loading 期间按未登录处理(不闪入口)
  const [acct, setAcct] = useState<AcctState>({
    state: loggedIn === undefined ? 'loading' : loggedIn ? 'in' : 'out',
    u: { email: '', displayName: null, avatar: null, pro: false },
  })
  useEffect(() => {
    if (loggedIn !== undefined || accountArea) return   // 宿主自带账户区(/jobs)时由 loggedIn prop 定导航显隐
    fetch('/api/users/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.email) {
          setAcct({ state: 'in', u: { email: d.user.email, displayName: d.user.displayName ?? null, avatar: d.user.avatar ?? null, pro: !!(d.user.proUntil && new Date(d.user.proUntil) > new Date()) } })
        } else setAcct((a) => ({ ...a, state: 'out' }))
      })
      .catch(() => setAcct((a) => ({ ...a, state: 'out' })))
  }, [loggedIn, accountArea])
  const showAcctTab = loggedIn !== undefined ? loggedIn : acct.state === 'in'
  const [drawer, setDrawer] = useState(false)
  const nav: React.CSSProperties = { textDecoration: 'none', fontSize: 12.5, color: '#6b7280', whiteSpace: 'nowrap' }
  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', ...(sticky && { position: 'sticky', top: 0, zIndex: 30 }) }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '10px 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {/* D 件:窄屏汉堡(桌面藏);抽屉替代窄屏平铺导航 */}
          <button className="shBurger" onClick={() => setDrawer(true)} aria-label={t('nav.menu')}
            style={{ display: 'none', width: 34, height: 34, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 15, flexShrink: 0 }}>☰</button>
          <a href="/" style={{ fontSize: 17, fontWeight: 700, color: '#111827', textDecoration: 'none', whiteSpace: 'nowrap' }}>🍁 Offer2PR</a>
          <span className="shTagline" style={{ fontSize: 12, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('tagline')}</span>
        </div>
        {/* 方案 A(2026-07-17 用户拍板,与 /jobs 顶栏同款):导航/操作两组+竖线分隔;窄屏竖线隐藏。
            副标语 <1350px 隐藏(Frank 2026-07-18「长度自己换行了」——先牺牲标语保导航一行)。
            E8-07 D:≤640 平铺导航整组隐藏(汉堡抽屉接管),右端语言/账户保留。 */}
        <style>{`@media (max-width:640px){.shDivider{display:none}.shNav{display:none !important}.shBurger{display:inline-block !important}.shSearch{display:block !important}}
          @media (max-width:1350px){.shTagline{display:none}}`}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: '100%', flexWrap: 'wrap' }}>
          <div className="shNav" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {matchButton
              ? <button onClick={matchButton.onClick} style={{ border: 'none', background: 'none', padding: 0, fontSize: 12.5, color: matchButton.active ? '#2563eb' : '#6b7280', fontWeight: matchButton.active ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}><IconTarget /> {t('mv.entry')}</button>
              : <a href="/?view=match" style={nav}><IconTarget /> {t('mv.entry')}</a>}
            <a href="/pathways" style={{ ...nav, color: active === 'pathways' ? '#2563eb' : '#6b7280', fontWeight: active === 'pathways' ? 700 : 400 }}><IconCompass /> {t('pw.entry')}</a>
            <a href="/rankings/weekly-top" style={{ ...nav, color: active === 'rank' ? '#2563eb' : '#6b7280', fontWeight: active === 'rank' ? 700 : 400 }}><IconChart /> {t('rank.entry')}</a>
            {/* 资料库 ▾(2026-07-19 Frank 批提案方案 A;E8-07 E:点击开改 hover 开,NavDrop 统一交互) */}
            <NavDrop label={t('nav.library')} icon={<IconUsers />} highlight={active === 'employers'} items={[
              { href: '/employers', label: t('dir.title'), active: active === 'employers' },
              { href: '/occupations', label: t('dir.occ.title') },
              { href: '/resources', label: t('res.entry') },
            ]} />
            <a href="/stats" style={{ ...nav, color: active === 'stats' ? '#2563eb' : '#6b7280', fontWeight: active === 'stats' ? 700 : 400 }}><IconMapPin /> {t('stats.entry')}</a>
            {/* 资讯 ▾(E8-07 E):移民新闻+政策时间线聚合(时间线首次进顶栏);原「移民动态」顶级项并入 */}
            <NavDrop label={t('nav.info')} icon={<IconNews />} highlight={active === 'news'} items={[
              { href: '/news', label: t('news.entry'), active: active === 'news' },
              { href: '/timeline', label: t('nav.timeline') },
            ]} />
            {/* 我的账户=独立选项卡(2026-07-16 拍板);2026-07-19 Frank:未登录不显示(登录入口=右端登录/注册钮) */}
            {showAcctTab && (active === 'account'
              ? <span style={{ ...nav, color: '#2563eb', fontWeight: 700 }}><IconUser /> {t('nav.acctTab')}</span>
              : <a href="/account" style={nav}><IconUser /> {t('nav.acctTab')}</a>)}
          </div>
          <span className="shDivider" style={{ width: 1, height: 16, background: '#e5e7eb' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
              {LANGS.map((l) => (
                <button key={l.code} onClick={() => setLang(l.code)}
                  style={{ border: 'none', padding: '3px 9px', fontSize: 12.5, cursor: 'pointer', background: lang === l.code ? '#2563eb' : '#fff', color: lang === l.code ? '#fff' : '#6b7280' }}>{l.label}</button>
              ))}
            </div>
            {accountArea ?? <AccountLite t={t} acct={acct} />}
          </div>
        </div>
      </div>
      {/* C 件:窄屏通栏搜索带(桌面藏;sticky 时随 header 一起吸顶)。jobs 传受控输入;缺省=GET / 提交(?q= 深链语义 #92 已有) */}
      <div className="shSearch" style={{ display: 'none', maxWidth: 1320, margin: '0 auto', padding: '0 1.25rem 10px' }}>
        {searchBar ?? (
          <form action="/" method="get" style={{ margin: 0 }}>
            <input name="q" placeholder={t('search.placeholder')} enterKeyHint="search"
              style={{ width: '100%', boxSizing: 'border-box', height: 38, padding: '0 12px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14, color: '#1f2937', background: '#fafafa' }} />
          </form>
        )}
      </div>
      {drawer && <MobileDrawer t={t} active={active} showAcctTab={showAcctTab} onClose={() => setDrawer(false)} />}
    </header>
  )
}
