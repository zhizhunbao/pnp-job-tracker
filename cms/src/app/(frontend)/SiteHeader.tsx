'use client'
// 全站唯一顶栏(#65 header 合一,Frank 2026-07-18 拍板:「header 合一也做」「为什么不一样宽」):
// /jobs 的内联头已退役,全部页面用本组件,**头轨统一 1320px**(跟最宽的职位板走;各页正文轨可窄但 header 一致)。
// /jobs 特有件走 props:matchButton(「我的匹配」切换态)/accountArea(带 plan 的完整账户下拉)/sticky/searchBar。
// 二级页缺省:matchButton 不传=链接 /?view=match;accountArea 不传=AccountLite(登录=头像药丸,未登录=登录/注册)。
// E8-07 C/D/E(2026-07-20 内容站骨架借鉴批):
//   C=窄屏通栏搜索带**已退役**(Frank 2026-07-26:「搜索框怎么跑 banner 上面去了」「怎么所有页面都加了这个搜索框」)——
//     搜索只留 /jobs 筛选区首格(banner 之下,手机整行独占);其余页要搜索先回首页。要恢复看 git 史 062e130。
//   D=窄屏汉堡开左侧 4/5 宽侧滑抽屉(条目圆角块,资讯组 chevron 抽屉内展开二级,遮罩/×关,当前页高亮);
//   E=桌面下拉统一 hover 开(离开 150ms 延时关防抖,键盘 focus 同样可开)——资料库改 hover,新增「资讯 ▾」聚合
//     (移民新闻+政策时间线;时间线首次获得顶栏入口)。榜单/统计保持顶级不并组(IA 大改另拍)。
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { LANGS, type Lang, type TFn } from './jobs/i18n'
import { Avatar } from './Avatar'
import { Button } from './ui/primitives'
import { IconTarget, IconChart, IconCompass, IconNews, IconUsers } from './Icons'

// 登录弹框就地开(2026-08-09 Frank「为什么要跳到 jobtable 页面再弹框」):AuthModal 按需载
// (点开才下载那份 JS,手法同 ChatLauncher),header 常驻包不背它
const AuthModal = dynamic(() => import('./jobs/AuthForm').then((m) => m.AuthModal), { ssr: false })

type AcctState = { state: 'loading' | 'out' | 'in'; u: { email: string; displayName: string | null; avatar: string | null; pro: boolean } }

// 账户槽的宽度**必须先占住**:/api/me 是客户端拉的,首帧 loading 只占 32px、拿到结果换成
// 「登录+注册」两钮(实测 84px),右侧整块跟着变宽 —— 表现就是 Frank 说的「header 缩一下再展开」。
// 未登录是绝大多数(匿名流量),所以按未登录态的实宽占位;已登录换成 28px 头像时右对齐,同样不推挤。
// 账户区定宽槽(单一来源):/jobs 的 AccountArea 与本组件 AccountLite 必须同宽 ——
// 导航整排右锚定,账户区差 1px 全排平移 1px(2026-07-31 Frank「header 为什么会不一致」实撞:
// jobs 头像钮裸宽 32 vs 这里 84,登录态两类页面导航错位 52px)。
// 槽宽=头像实宽 28+4(同日 Frank「这两个应该放一起」:原 84 让头像与语言切换之间空出 52px 空档)
export const ACCT_SLOT_W = 32
const ACCT_SEEN = 'acct.seen'   // 上次已知登录态(见 SiteHeader 里的说明)
// SSR 没有 localStorage:服务端渲染用 useEffect(不跑),客户端用 useLayoutEffect(第一帧前就纠正,不闪)
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

function AccountLite({ t, acct }: { t: TFn; acct: AcctState }) {
  const { state, u } = acct
  // 就地弹框(2026-08-09 Frank「为什么要跳到 jobtable 页面再弹框,不能直接弹框吗」):
  // 原「登录/注册」是 /?login=1 链接——弹框只挂在职位板,二级页都得先跳过去。现当页开
  // AuthModal;成功后整页刷新让 SSR 登录态(分层列等)生效,同 /jobs 惯例。深链 /?login=1 照旧可用。
  const [auth, setAuth] = useState<'' | 'login' | 'register'>('')
  if (state === 'loading') return <span style={{ display: 'inline-block', width: ACCT_SLOT_W, height: 28 }} />
  if (state === 'in') {
    // #63b(Frank「像 Google 那样只显示图标」):纯头像圆钮,名字/Pro 态挂 title
    return (
      <a href="/account" title={(u.displayName?.trim() || u.email.split('@')[0]) + (u.pro ? ' · Pro' : '')}
        style={{ display: 'inline-flex', justifyContent: 'flex-end', minWidth: ACCT_SLOT_W, padding: 2, borderRadius: '50%', textDecoration: 'none' }}>
        <Avatar src={u.avatar} name={u.displayName || u.email} email={u.email} size={28} />
      </a>
    )
  }
  // Pro 钮不进 header(Frank 2026-07-18:「没有意义」——定价入口=/pricing 与升级卡)
  return (
    <>
      {/* P1 换装(2026-07-19):登录=ghost,注册=primary sm——与 /jobs AccountArea 同规格 */}
      <Button kind="ghost" sm onClick={() => setAuth('login')}>{t('nav.login')}</Button>
      <Button kind="primary" sm onClick={() => setAuth('register')}>{t('nav.register')}</Button>
      {auth && <AuthModal t={t} mode={auth} onClose={() => setAuth('')} onDone={() => window.location.reload()} />}
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
// 2026-08-09 Frank「点击的时候要有一个推动主页面的动画」:抽屉滑入的同时 <main> 同步右移同宽
// (push 而非 overlay)。抽屉因此 portal 到 body——它原来渲在 header 里=main 内部,
// main 一 transform 就成了 fixed 的包含块,抽屉会跟着页面一起被推走。
function MobileDrawer({ t, active, onClose }: { t: TFn; active?: string; onClose: () => void }) {
  const [openGrp, setOpenGrp] = useState<string>('')   // 展开中的组(单开足够:资讯/资料库)
  // 推主页面:挂载=开(推出去),卸载=关(回弹;transition 留到动画放完再摘)。
  // overflow-x 同时按住——main 右移出视口的部分会把横向滚动条顶出来
  useEffect(() => {
    const m = document.querySelector('main')
    const prevBody = document.body.style.overflowX
    const prevHtml = document.documentElement.style.overflowX
    document.body.style.overflowX = 'hidden'
    document.documentElement.style.overflowX = 'hidden'
    if (m) {
      m.style.transition = 'transform .24s cubic-bezier(.4,0,.2,1)'
      requestAnimationFrame(() => { m.style.transform = 'translateX(min(68vw, 280px))' })
    }
    return () => {
      document.body.style.overflowX = prevBody
      document.documentElement.style.overflowX = prevHtml
      if (m) {
        m.style.transform = ''
        setTimeout(() => { m.style.transition = '' }, 300)
      }
    }
  }, [])
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
  return createPortal(
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
          {/* E13-03:开始规划 / 榜单 / 地区统计 三项合一为「就业把脉」(/start) */}
          <a href="/start" style={item('/start', '', active === 'start' || active === 'stats' || active === 'rank')}>{t('pulse.entry')}</a>
          <a href="/?view=match" style={item('/?view=match', '', active === 'match')}>{t('mv.entry')}</a>
          <a href="/plan/pr" style={item('/plan/pr', '', active === 'pathways')}>{t('plan.pr.title')}</a>
          {/* 「担保雇主」一级项 08-08 Frank 摘除(截图点名):/employers 入口=弹框雇主线/报告卡互通链/定价配图,不占顶栏 */}
          {grp('lib', t('nav.library'), [
            { href: '/occupations', label: t('dir.occ.title') },
            { href: '/resources', label: t('res.entry') },
            // 常见案例 2026-08-13 从决策页迁出成独立页,入口归资料库
            { href: '/cases', label: t('dp.cases') },
          ])}
          {/* E13-03:「数据与结论」组原有的 榜单 / 地区统计 两项已并进顶部的「就业把脉」,组标题随之撤 */}
          {grp('info', t('nav.info'), [
            { href: '/news', label: t('news.entry'), active: active === 'news' },
            { href: '/timeline', label: t('nav.timeline') },
          ])}
          {/* 「我的账户」项 2026-08-09 Frank 摘除(账户入口只留头像),同桌面 nav */}
        </nav>
      </div>
    </div>,
    document.body,
  )
}

export function SiteHeader({ lang, setLang, t, active, sticky, matchButton, accountArea, loggedIn }: {
  lang: Lang; setLang: (l: Lang) => void; t: TFn
  active?: 'rank' | 'stats' | 'account' | 'pathways' | 'news' | 'employers' | 'start' | 'match'
  sticky?: boolean
  matchButton?: { active: boolean; onClick: () => void }
  accountArea?: React.ReactNode
  loggedIn?: boolean   // 宿主已知登录态时传入(/jobs 走 plan);不传=本组件自查 /api/users/me
}) {
  // 登录态上提(2026-07-19 Frank:「我的账户模块应该是登录之后才显示」)——原 AccountLite 私有 fetch
  // 提到 header 级,导航「我的账户」与右端账户区共用;loading 期间按未登录处理(不闪入口)
  // 登录态**记在本地**(2026-07-29 Frank:「header 不同页面怎么跑偏」):
  // 导航里的「我的账户」只在登录后渲染,而各页拿登录态的路子不同 —— /jobs 系列由服务端传 loggedIn,
  // 第一帧就有;其余页面要等 /api/users/me 回来才补上,那一下整排导航被挤着移位 = 他看到的「跑偏」。
  // 记住上次结果 → 每页第一帧就是对的;猜错了(如别处退出登录)等 fetch 回来自动纠,匿名照旧不占位。
  const [acct, setAcct] = useState<AcctState>({
    state: loggedIn !== undefined ? (loggedIn ? 'in' : 'out') : 'loading',
    u: { email: '', displayName: null, avatar: null, pro: false },
  })
  useIsoLayoutEffect(() => {
    if (loggedIn !== undefined) return
    try {
      const seen = localStorage.getItem(ACCT_SEEN)
      if (seen === '1' || seen === '0') setAcct((a) => ({ ...a, state: seen === '1' ? 'in' : 'out' }))
    } catch { /* 隐私模式读不到就维持 loading */ }
  }, [loggedIn])
  useEffect(() => {
    if (loggedIn !== undefined || accountArea) return   // 宿主自带账户区(/jobs)时由 loggedIn prop 定导航显隐
    fetch('/api/users/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        const isIn = !!d?.user?.email
        try { localStorage.setItem(ACCT_SEEN, isIn ? '1' : '0') } catch { /* ignore */ }
        if (isIn) {
          setAcct({ state: 'in', u: { email: d.user.email, displayName: d.user.displayName ?? null, avatar: d.user.avatar ?? null, pro: !!(d.user.proUntil && new Date(d.user.proUntil) > new Date()) } })
        } else setAcct((a) => ({ ...a, state: 'out' }))
      })
      .catch(() => setAcct((a) => ({ ...a, state: 'out' })))
  }, [loggedIn, accountArea])
  const [drawer, setDrawer] = useState(false)
  const nav: React.CSSProperties = { textDecoration: 'none', fontSize: 12.5, color: '#6b7280', whiteSpace: 'nowrap' }
  return (
    <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', ...(sticky && { position: 'sticky', top: 0, zIndex: 30 }) }}>
      <div className="shBar" style={{ maxWidth: 1320, margin: '0 auto', padding: '10px 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
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
        {/* ≥1351(标语在显)整条禁折行、右组禁压缩:flex 换行按内容假想宽算,不会先压标语再折 ——
            英文导航长,浏览器宁可把整排导航折下去(2026-07-31 Frank 实拍 EN 折两行);
            改成弹性全给标语(自带省略号),导航永一行。<1350 标语已藏,原折行策略照旧。 */}
        <style>{`@media (max-width:640px){.shDivider{display:none}.shNav{display:none !important}.shBurger{display:inline-block !important}}
          @media (max-width:1350px){.shTagline{display:none}}
          @media (min-width:1351px){.shBar{flex-wrap:nowrap !important}.shRight{flex-wrap:nowrap !important;flex-shrink:0}}`}</style>
        <div className="shRight" style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: '100%', flexWrap: 'wrap' }}>
          <div className="shNav" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {/* E13-03(2026-08-06 三页合一):开始规划 / 榜单 / 地区统计 三项 → 一项「就业把脉」;
                /rankings/[slug] 与 /stats/[prov] 页面仍在(SEO 与下钻落点),只是不再各占一格顶栏 */}
            <a href="/start" style={{ ...nav, color: active === 'start' || active === 'stats' || active === 'rank' ? '#2563eb' : '#6b7280', fontWeight: active === 'start' || active === 'stats' || active === 'rank' ? 700 : 400 }}><IconChart /> {t('pulse.entry')}</a>
            {matchButton
              ? <button onClick={matchButton.onClick} style={{ border: 'none', background: 'none', padding: 0, fontSize: 12.5, color: matchButton.active ? '#2563eb' : '#6b7280', fontWeight: matchButton.active ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}><IconTarget /> {t('mv.entry')}</button>
              : <a href="/?view=match" style={{ ...nav, color: active === 'match' ? '#2563eb' : '#6b7280', fontWeight: active === 'match' ? 700 : 400 }}><IconTarget /> {t('mv.entry')}</a>}
            {/* 判定合一批2:/pathways 301 并入决策页,导航项改指 /plan/pr、label=拿 PR 评估(active 键沿用) */}
            <a href="/plan/pr" style={{ ...nav, color: active === 'pathways' ? '#2563eb' : '#6b7280', fontWeight: active === 'pathways' ? 700 : 400 }}><IconCompass /> {t('plan.pr.title')}</a>
            {/* 「担保雇主」一级项 08-08 Frank 摘除;/employers 走弹框雇主线/报告卡/定价配图入口 */}
            {/* 资料库 ▾(2026-07-19 Frank 批提案方案 A;E8-07 E:点击开改 hover 开,NavDrop 统一交互) */}
            <NavDrop label={t('nav.library')} icon={<IconUsers />} highlight={false} items={[
              { href: '/occupations', label: t('dir.occ.title') },
              { href: '/resources', label: t('res.entry') },
              // 常见案例 2026-08-13 从决策页迁出成独立页,入口归资料库
              { href: '/cases', label: t('dp.cases') },
            ]} />
            {/* 资讯 ▾(E8-07 E):移民新闻+政策时间线聚合(时间线首次进顶栏);原「移民动态」顶级项并入 */}
            <NavDrop label={t('nav.info')} icon={<IconNews />} highlight={active === 'news'} items={[
              { href: '/news', label: t('news.entry'), active: active === 'news' },
              { href: '/timeline', label: t('nav.timeline') },
            ]} />
            {/* 「我的账户」独立选项卡 2026-08-09 Frank 摘除(「登录之后不要在 header 显示这个导航」):
                账户入口只留右端头像(/jobs 头像下拉里本就有「我的账户」项,二级页头像直达 /account) */}
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
      {/* C 件:窄屏通栏搜索带(桌面藏;sticky 时随 header 一起吸顶)。jobs 传受控输入;缺省=GET / 提交(?q= 深链语义 #92 已有)。
          hideSearch=页面自己在 banner 下有搜索框(/jobs),不在顶栏再挂一条 */}
      {drawer && <MobileDrawer t={t} active={active} onClose={() => setDrawer(false)} />}
    </header>
  )
}
