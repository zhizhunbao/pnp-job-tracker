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
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { LANGS, type Lang, type TFn } from '@/lib/i18n'
import { useSsrSession } from './SessionProvider'
import { Avatar } from './Avatar'
import { AccountMenu } from './AccountMenu'
import { PricingModal } from './jobs/PricingModal'
import { Button } from './ui'
import { IconTarget, IconChart, IconClipboard, IconCompass, IconNews, IconUsers } from './Icons'

// 登录弹框就地开(2026-08-09 Frank「为什么要跳到 jobtable 页面再弹框」):AuthModal 按需载
// (点开才下载那份 JS,手法同 ChatLauncher),header 常驻包不背它
const AuthModal = dynamic(() => import('./jobs/AuthForm').then((m) => m.AuthModal), { ssr: false })

/** 类名 + 当前态:cx('shNavLink', isActive) → "shNavLink on"。
 *  样式迁进 main.css 后,tsx 里剩的只有「这一项亮不亮」这个布尔,不再逐属性写三元。
 *  只有本文件用它 —— 曾经单独成 ui/cx.ts,一个模块一个消费者、名字还是行话,收回来了。 */
const cx = (base: string, on?: boolean): string => (on ? base + ' on' : base)

type AcctState = { state: 'loading' | 'out' | 'in'; u: { email: string; displayName: string | null; avatar: string | null; pro: boolean } }

// 账户区定宽槽(单一来源):/jobs 的 AccountArea 与本组件 AccountLite 必须同宽 ——
// 导航整排右锚定,账户区差 1px 全排平移 1px(2026-07-31 Frank「header 为什么会不一致」实撞:
// jobs 头像钮裸宽 32 vs 这里 84,登录态两类页面导航错位 52px)。
// 槽宽=头像实宽 28+4(同日 Frank「这两个应该放一起」:原 84 让头像与语言切换之间空出 52px 空档)。
// ⚠️ 这个槽只在 loading 态用,而 loading 现在只剩不在 SessionProvider 下的存量路径 ——
// 正常页首帧登录态由服务端给(见组件内说明),不再靠猜宽度兜底。
export const ACCT_SLOT_W = 32

function AccountLite({ t, acct }: { t: TFn; acct: AcctState }) {
  const { state, u } = acct
  // 就地弹框(2026-08-09 Frank「为什么要跳到 jobtable 页面再弹框,不能直接弹框吗」):
  // 原「登录/注册」是 /?login=1 链接——弹框只挂在职位板,二级页都得先跳过去。现当页开
  // AuthModal;成功后整页刷新让 SSR 登录态(分层列等)生效,同 /jobs 惯例。深链 /?login=1 照旧可用。
  const [auth, setAuth] = useState<'' | 'login' | 'register'>('')
  const [pricing, setPricing] = useState(false)
  if (state === 'loading') return <span className="shAcctSlot" />
  // 已知有会话、但还不知道是谁(SSR 只读得到 cookie 里有票据,身份要等 /api/users/me)。
  // 这一步必须自己占位,**不能**把空 email 丢给 Avatar —— 它会兜底成「?」,于是用户看到
  // 问号闪一下再变成自己的首字母(2026-08-17 Frank「会先变成问号,然后才变成 4」)。
  // 尺寸与真头像同为 28,外框同 32:换上真身时只换内容,不推挤。
  if (state === 'in' && !u.email) {
    return <span className="shAcctSlot"><span className="shAcctDot" aria-hidden="true" /></span>
  }
  if (state === 'in') {
    // 2026-08-15 Frank「登录之后点这个应该还是下拉啊,怎么变成跳页面了」:二级页原是
    // `<a href="/account">` 直达,而 /jobs 的同一个头像是下拉 —— 同一元素两种行为。
    // 菜单收敛进共用的 AccountMenu(升级框仍归本组件开,与 /jobs 各管各的上下文)
    return (
      <>
        <AccountMenu t={t} email={u.email} displayName={u.displayName} avatar={u.avatar}
          isPro={u.pro} onPricing={() => setPricing(true)} />
        {pricing && <PricingModal t={t} loggedIn pro={u.pro} onClose={() => setPricing(false)} />}
      </>
    )
  }
  // Pro 钮不进 header(Frank 2026-07-18:「没有意义」——定价入口=/pricing 与升级卡)
  return (
    <>
      {/* P1 换装(2026-07-19):登录=ghost,注册=primary sm——与 /jobs AccountArea 同规格 */}
      <Button kind="ghost" sm className="shTapY" onClick={() => setAuth('login')}>{t('nav.login')}</Button>
      <Button kind="primary" sm className="shTapY" onClick={() => setAuth('register')}>{t('nav.register')}</Button>
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
    <span className="shDropWrap" onMouseEnter={enter} onMouseLeave={leave} onFocus={enter}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false) }}>
      <button className={cx('shDropBtn', highlight)} onClick={() => setOpen((o) => !o)}>
        {icon} {label} <span className="shDropCaret">▾</span>
      </button>
      {open && (
        <span className="shDropPanel">
          {items.map((it) => (
            <a key={it.href} href={it.href} className={cx('shDropItem', it.active)}>{it.label}</a>
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
  // #300:抽屉条目/二级链触控靶抬到 ≥44(真实高度,成列小控件 ::after 会被邻行抢点——第 27 轮教训);
  // 抽屉只在 ≤640 汉堡后出现,桌面零影响
  const grp = (key: string, label: React.ReactNode, children: { href: string; label: React.ReactNode; active?: boolean }[]) => (
    <>
      <button className="shDrawerGrpBtn" onClick={() => setOpenGrp((g) => (g === key ? '' : key))}>
        <span>{label}</span><span className="shDrawerChev">{openGrp === key ? '▾' : '▸'}</span>
      </button>
      {openGrp === key && children.map((c) => (
        <a key={c.href} href={c.href} className={cx('shDrawerSub', c.active)}>{c.label}</a>
      ))}
    </>
  )
  return createPortal(
    // 平移动画(Frank 2026-07-23「呼出太宽太大,加平移动画+缩小」):遮罩淡入、面板从左 translateX(-100%)→0 滑入;
    // 挂载即播关键帧(无需 open 态);宽度 80%/340 → 68%/280 收窄,条目内距略缩(仍保 ≥40px 触控高)
    <div className="shDrawerMask" onClick={onClose}>
      <div className="shDrawer" onClick={(e) => e.stopPropagation()}>
        <div className="shDrawerHead">
          <span className="shDrawerBrand">🍁 Offer2PR</span>
          <button className="shDrawerClose" onClick={onClose} aria-label={t('nav.menu')}>✕</button>
        </div>
        <nav className="shDrawerNav">
          <a href="/" className={cx('shDrawerItem', !active)}>{t('detail.crumbHome')}</a>
          {/* E13-03:开始规划 / 榜单 / 地区统计 三项合一为「就业把脉」(/start) */}
          <a href="/start" className={cx('shDrawerItem', active === 'start' || active === 'stats' || active === 'rank')}>{t('pulse.entry')}</a>
          {/* 2026-08-16 Frank「我的匹配 名字是不是换成职位更好」:顶栏是名词并列(职位/雇主),
              而且先前**没有职位板入口** —— 首页就是职位板,从二级页只能点 logo 回去。
              「我的匹配」降为板内视图切换(它本来就是板的一个视图,不是一个页面) */}
          <a href="/" className={cx('shDrawerItem', active === 'jobs' || active === 'match')}>{t('nav.jobs')}</a>
          <a href="/plan/pr" className={cx('shDrawerItem', active === 'pathways')}>{t('plan.pr.title')}</a>
          {/* 「雇主」一级项 2026-08-16 挂回(Frank「header 需要加一个雇主的 title 吧」+ 拍板叫「雇主」):
              08-08 摘的是那个已下架的货架页;今天有了真雇主板(指定名录 + 在招雇主,带筛选),入口该回来。
              名字只两个字:板里本来就有口径筛选,名字不必替筛选说话;「担保雇主」旧名会与 LMIA 担保混淆。 */}
          <a href="/employers/designated" className={cx('shDrawerItem', active === 'employers')}>{t('nav.employers')}</a>
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

export function Header({ lang, setLang, t, active, sticky, matchButton, accountArea, loggedIn }: {
  lang: Lang; setLang: (l: Lang) => void; t: TFn
  active?: 'rank' | 'stats' | 'account' | 'pathways' | 'news' | 'employers' | 'start' | 'match' | 'jobs'
  sticky?: boolean
  matchButton?: { active: boolean; onClick: () => void }
  accountArea?: React.ReactNode
  loggedIn?: boolean   // 宿主已知登录态时传入(/jobs 走 plan);不传=本组件自查 /api/users/me
}) {
  // 登录态上提(2026-07-19 Frank:「我的账户模块应该是登录之后才显示」)——原 AccountLite 私有 fetch
  // 提到 header 级,导航「我的账户」与右端账户区共用。
  // 首帧登录态**由服务端给**(2026-08-17 Frank「点击切换的时候会先伸缩一下,然后再展开」):
  // 各页拿登录态的路子原本不同 —— /jobs 系列由服务端传 loggedIn,第一帧就有;其余 20 页只能等
  // /api/users/me 回来,那一下账户区从 32px 占位撑到「登录+注册」的 84px,右侧块长 52px,
  // space-between 把整排导航往左拽 = 他看到的伸缩。中间试过拿 localStorage 的 acct.seen 记上次结果,
  // 治不了:浏览器先照 SSR 的 HTML 画一帧,useLayoutEffect 是那之后才跑的,该抖还是抖。
  // 现在 layout 用 ssrHasSession() 从 cookie 读一次经 SessionProvider 分发 → SSR 出的就是终态宽度。
  // 优先级:宿主 prop(/jobs 有真身份)> 服务端票据 > loading(不在 Provider 下的存量路径)。
  const ssrSession = useSsrSession()
  const [acct, setAcct] = useState<AcctState>({
    state: loggedIn !== undefined ? (loggedIn ? 'in' : 'out')
      : ssrSession !== undefined ? (ssrSession ? 'in' : 'out')
        : 'loading',
    u: { email: '', displayName: null, avatar: null, pro: false },
  })
  useEffect(() => {
    if (loggedIn !== undefined || accountArea) return   // 宿主自带账户区(/jobs)时由 loggedIn prop 定导航显隐
    fetch('/api/users/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        const isIn = !!d?.user?.email
        if (isIn) {
          setAcct({ state: 'in', u: { email: d.user.email, displayName: d.user.displayName ?? null, avatar: d.user.avatar ?? null, pro: !!(d.user.proUntil && new Date(d.user.proUntil) > new Date()) } })
        } else setAcct((a) => ({ ...a, state: 'out' }))
      })
      .catch(() => setAcct((a) => ({ ...a, state: 'out' })))
  }, [loggedIn, accountArea])
  const [drawer, setDrawer] = useState(false)
  return (
    <header className={sticky ? 'shHeader isSticky' : 'shHeader'}>
      <div className="shBar">
        <div className="shBrand">
          {/* D 件:窄屏汉堡(桌面藏);抽屉替代窄屏平铺导航 */}
          <button className="shBurger" onClick={() => setDrawer(true)} aria-label={t('nav.menu')}>☰</button>
          <a href="/" className="shTapY shLogo">🍁 Offer2PR</a>
          <span className="shTagline">{t('tagline')}</span>
        </div>
        {/* 方案 A(2026-07-17 用户拍板,与 /jobs 顶栏同款):导航/操作两组+竖线分隔;窄屏竖线隐藏。
            副标语 <1350px 隐藏(Frank 2026-07-18「长度自己换行了」——先牺牲标语保导航一行)。
            E8-07 D:≤640 平铺导航整组隐藏(汉堡抽屉接管),右端语言/账户保留。
            断点规则与 ::after 触控靶原本是两段 <style> 标签挂在这里(每次渲染重新注入),
            2026-08-17 一并迁进 main.css 的「顶栏 Header」段,原委注释跟着搬过去了。 */}
        <div className="shRight">
          <div className="shNav">
            {/* E13-03(2026-08-06 三页合一):开始规划 / 榜单 / 地区统计 三项 → 一项「就业把脉」;
                /rankings/[slug] 与 /stats/[prov] 页面仍在(SEO 与下钻落点),只是不再各占一格顶栏 */}
            <a href="/start" className={cx('shNavLink', active === 'start' || active === 'stats' || active === 'rank')}><IconChart /> {t('pulse.entry')}</a>
            <a href="/" className={cx('shNavLink', active === 'jobs' || active === 'match')}><IconClipboard /> {t('nav.jobs')}</a>
            {/* 判定合一批2:/pathways 301 并入决策页,导航项改指 /plan/pr、label=拿 PR 评估(active 键沿用) */}
            <a href="/plan/pr" className={cx('shNavLink', active === 'pathways')}><IconCompass /> {t('plan.pr.title')}</a>
            <a href="/employers/designated" className={cx('shNavLink', active === 'employers')}><IconUsers /> {t('nav.employers')}</a>
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
          <span className="shDivider" />
          <div className="shAcct">
            <div className="shLangWrap">
              {LANGS.map((l) => (
                <button key={l.code} className={cx('shLangBtn', lang === l.code)} onClick={() => setLang(l.code)}>{l.label}</button>
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
