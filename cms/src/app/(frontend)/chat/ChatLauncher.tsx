'use client'
// 全站右下角对话挂件的壳(2026-08-04)。参考 Intercom / Crisp / Chatbase / Tidio 的**行为**,不引任何依赖。
//
// 为什么要它(不是锦上添花):30 天数据 67.5% 的会话只看一页,入口=出口=职位详情页
// (最大流量来自 Google 招聘富结果直落 /jobs/<id>)。/start 那个内联 ChatBox 服务的是
// **绝大多数用户根本不会经过的地方** —— 挂件把对话放到流量真正在的地方。
// 2026-08-04 傍晚 Frank 拍板再进一步:内联框整节撤掉,**挂件是全站唯一的对话入口**(含 /start)。
// 于是可发现性从「锦上添花」变成主路径要求 —— 见 HINT_MAX(提示出到用户真的点开为止)。
//
// 五条实现红线:
//   ① 平台特性优先(Ponytail 第 3 格):面板是原生 `popover`,顶层渲染,不受任何父级
//      stacking context / overflow 影响,也不用手搓一套浮层与焦点管理。用 `manual` 而非 `auto`:
//      auto 的 light-dismiss 会让「点一下页面就收起」,与 Intercom/Crisp 的手感不符;
//      Esc 关闭由下面 4 行自己挂(manual 不带 Esc)。
//      **但 popover 只是增强,不是可见性的依据** —— 见红线⑤。
//   ② **绝不压住吸底动作条** —— 详情页 ApplyBar 是全站主转化。生产实测(offer2pr.com/jobs/17728077):
//      ApplyBar `position:sticky;bottom:0;z-index:5`,高 60px(1280)/ 73px(375),右缘距视口
//      227px(1280)/ 39.5px(375)—— 375 上横向压根没地方躲,窄桌面(~900)同样躲不开。
//      **固定上抬量不够**:sticky 条会在「粘住 / 停在正文末尾」之间摆动(滚到页脚它就不粘了),
//      实测 375 上滚到 scrollY=818 时,上抬 96px 的气泡照样盖住申请钮 ——
//      elementFromPoint 在申请钮中心返回的是挂件本身。所以按**它的实时位置**躲(见 useEffect 测量段)。
//      /plan/* 四张评估页的 .quizBar 手机上是 fixed 78px、z-index 30,同一套测量自动覆盖。
//      挂件自身 z-index 40:压得住 ApplyBar(5)、quizBar(30),但**在弹框 SCRIM(50)与 AuthModal(70)之下**。
//   ③ **不自动弹开** —— SaaS 挂件最招人烦的一条。首访只给一句静默提示,9 秒后自己消失,一辈子只出一次。
//   ④ 面板**壳首帧就常驻 DOM**(内容仍等第一次点开才懒加载)→ 最小化后本页会话还在;
//      刷新即丢是设计如此(对话不落库、不做长记忆)。
//   ⑤ **「呼不出来」是不可接受的**(2026-08-04 手机生产事故,三层修):
//      a. 可见性单一真相 = React 的 `open`(写出 `.clOpen`),`showPopover()` 成不成功都不影响;
//      b. 懒加载内容套 PanelGuard 错误边界 —— 事故正主是 ChunkLoadError **掀掉了整站**;
//      c. 看门狗:开了 300ms 还量不到高度就强制普通层,900ms 还不行就把启动器还回去,两级都打点。
//
// 与 ChatBox 的边界:壳只传 compact / autoFocus 两个 prop,**不覆盖它的任何类名**
// (2026-08-04 傍晚拆掉了原来那套 .cbCard/.cbThread 父级覆盖 —— 它的类名一改就静默退化成卡中卡)。
// 「用户正在看哪个岗」的上下文透传要动 chatOrchestrate,本轮不做,Frank 单独排。
//
// 壳只管开合与避让,一句文案都不生成:正文、结论、出处全在 ChatBox / 服务端工具层。
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { IconChat, IconChevronDown, IconMaximize, IconMinimize } from '../Icons'
import { useLang } from '../LangProvider'
import { UI } from '../ui/primitives'
import { track } from '@/lib/track'

// 懒加载:挂件挂在全站 layout 上,不该让每个页面都背对话那份 JS —— 第一次点开才下载。
// next/dynamic 是框架自带能力,不是新依赖。
// loading 不是装饰:弱网上这个 chunk 要几秒,没它就是一张全屏白纸(手机上面板是全屏接管)。
const ChatBox = dynamic(() => import('./ChatBox').then((m) => m.ChatBox), {
  ssr: false,
  loading: () => <div className="clLoad" aria-hidden><i /><i /><i /></div>,
})

/**
 * 🔴 面板内容的错误边界 —— **2026-08-04 生产事故的正主**(手机「呼不出来」)。
 * next/dynamic 给的是 Suspense **不是** ErrorBoundary:懒加载 chunk 取不到时
 * `ChunkLoadError` 会一路冒到 Next 的全局边界,**整站被替换成「This page couldn't load」**
 * (playwright 复现:拦掉 /_next/static/chunks/* 后点挂件 → main 内容清零、启动器一起消失)。
 * 为什么偏偏是手机:① 弱网/切后台 fetch 被掐;② 手机标签页能活好几天,
 * 期间任何一次部署都会换 chunk 哈希 → 旧页面点开必 404。桌面刚部署完就刷新,永远撞不上。
 * React 里没有函数式错误边界,这个 class 是 Ponytail 第 6 格的「最小必要实现」。
 */
class PanelGuard extends Component<{ fallback: ReactNode; children: ReactNode }, { dead: boolean }> {
  state = { dead: false }
  static getDerivedStateFromError() { return { dead: true } }
  componentDidCatch(err: unknown) {
    console.warn('[chat] 面板内容加载失败(多半是 chunk 取不到)', err)
    track('widget-load-fail')
  }
  render() { return this.state.dead ? this.props.fallback : this.props.children }
}

const HINT_KEY = 'jt.chat.hint.v1'
// 桌面最大化的记忆位(手机不用:那边本来就是全屏接管)。记住它是因为**这是个人偏好不是一次性动作** ——
// 一个人愿意在 380×600 里读长答复,他每次都愿意;不愿意的那个每次都得再点一遍,那就是每次都在骂我们。
const MAX_KEY = 'jt.chat.max.v1'
/**
 * 桌面的自定义位置+尺寸(2026-08-05 Frank 要拖动与四向缩放)。
 * 上一版判「不做拖拽」的依据是 Open WebUI 自己也没有 —— 那是**它的**取舍不是他的,他要就做。
 * 为什么原生 `resize:both` 不够:它只给右下一个角,而且要求 overflow 非 visible 又会顶掉圆角裁切,
 * 四边四角一个都拉不了。所以自己搓 pointer —— 8 个透明把手 + 一个 pointermove,总共不到 40 行,
 * 比引一个拖拽库便宜得多(Ponytail 第 6 格)。
 * **只在桌面生效**:手机是全屏接管,box 一律不写进 style(否则 localStorage 里存的 900×700
 * 会以内联样式的身份压过 @media 那条 100dvh —— 内联赢 @media,那就是把桌面尺寸泄漏到手机)。
 */
const BOX_KEY = 'jt.chat.box.v1'
type Box = { x: number; y: number; w: number; h: number }
const MIN_W = 320   // 再窄正文就开始逐字折行(ChatBox 的 composer 加发送钮本身要 ~300)
const MIN_H = 360   // 头部 54 + composer ~96 + 至少两三行答复
// 8 个方向:n/s/e/w 四边 + 四角。字母出现在 dir 里就动那条边(下面 startGrab 按 includes 判)
const GRIPS = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'] as const
/** 钳制:不许拖出视口、不许小到看不见内容。resize 与 drag 共用同一道闸,也用在读 localStorage 时
 *  ——上次存的是 1600 宽,这次换了台小屏笔记本,不钳一下面板就有一半在视口外。 */
const clampBox = (b: Box): Box => {
  const de = document.documentElement
  const w = Math.max(MIN_W, Math.min(b.w, de.clientWidth))
  const h = Math.max(MIN_H, Math.min(b.h, de.clientHeight))
  return {
    w, h,
    x: Math.max(0, Math.min(b.x, de.clientWidth - w)),
    y: Math.max(0, Math.min(b.y, de.clientHeight - h)),
  }
}
// 挂件是全站**唯一**的对话入口(2026-08-04 傍晚 /start 内联框已撤)→ 轻提示出到用户真的点开为止,
// 但最多 3 次:再多就是牛皮癣。点开过一次就永久不再出。
const HINT_MAX = 3
const BASE = 16                 // 常规离底距离(px)
/**
 * 有吸底动作条的路由(见头注释②)→ 才开测量。为什么要这道闸而不是全站都测:
 * 职位板列表页 DOM 上千个 div,扫不到条子就每帧白扫一遍;详情页只有 39 个,可以忽略。
 * 两条:职位详情页(ApplyBar)、/plan/* 四张评估页(QuizUI 的 .quizBar,手机上 fixed)。
 */
const hasBottomBar = (p: string) => /^\/jobs\/[^/]+$/.test(p) || p.startsWith('/plan')
/**
 * 找页面的吸底动作条。按**特征**找不按 class 找:ApplyBar / quizBar 都是别的组件的内联样式,
 * 写死选择器等着被改坏;特征(bottom:0 的 sticky|fixed 块)稳定得多,以后新加的底栏自动被躲开。
 * 只扫 <main> 内 —— 挂件自己挂在 <main> 外(layout),天然不会把自己认成底栏。
 * 生产实测:详情页 39 个 div,全扫 0.3ms;找到后缓存,滚动时只剩一次 getBoundingClientRect。
 */
const findBar = (cached: HTMLElement | null): HTMLElement | null => {
  if (cached?.isConnected) return cached
  for (const el of document.querySelectorAll<HTMLElement>('main div')) {
    const s = getComputedStyle(el)
    if (s.bottom === '0px' && (s.position === 'sticky' || s.position === 'fixed') && el.offsetHeight > 24) return el
  }
  return null
}

export function ChatLauncher() {
  const [, , t] = useLang()
  const path = usePathname() || '/'
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)   // 打开过一次就不再卸载(会话不因最小化丢失)
  const [hint, setHint] = useState(false)
  const [force, setForce] = useState(false)          // 看门狗判定「开了却量不到高度」→ 内联 display 硬顶上去
  const [max, setMax] = useState(false)              // 桌面最大化(手机 ≤640 恒为全屏,这个钮那边不出现)
  const [clear, setClear] = useState(BASE)           // 离视口底的实测距离(躲吸底动作条)
  const [box, setBox] = useState<Box | null>(null)   // 桌面自定义位置/尺寸;null = 还是右下角锚定的默认档
  const [wide, setWide] = useState(false)            // 是不是桌面档(>640)。拖拽/缩放/box 全挂在它下面
  const [resetN, setResetN] = useState(0)            // 变一次 = 换掉 ChatBox 的 key = 会话清空回空态
  const [askReset, setAskReset] = useState(false)    // 就地二次确认(误清一整轮问答不可逆)
  const panel = useRef<HTMLDivElement | null>(null)
  const dock = useRef<HTMLDivElement | null>(null)
  const lastBox = useRef<Box | null>(null)           // 拖拽过程中的最新值(pointerup 时落盘,不靠 setState 回调)

  const show = useCallback(() => {
    setMounted(true); setOpen(true); setHint(false); track('widget-open')
    try { localStorage.setItem(HINT_KEY, String(HINT_MAX)) } catch { /* ignore */ }  // 点开过=不再提示
  }, [])
  const hide = useCallback(() => { setOpen(false); track('widget-close') }, [])
  // 读在 effect 里,不在 useState 初值里:localStorage 在服务端不存在,当初值会 hydration 不一致。
  // 同一处也判桌面档并跟着窗口变化走(从桌面拖窄到手机档时,box 要立刻停止生效)。
  useEffect(() => {
    try { setMax(localStorage.getItem(MAX_KEY) === '1') } catch { /* 隐私模式:默认小窗 */ }
    try {
      const raw = localStorage.getItem(BOX_KEY)
      if (raw) { const b = clampBox(JSON.parse(raw) as Box); lastBox.current = b; setBox(b) }
    } catch { /* 存的东西坏了/隐私模式:退回默认档,不报错 */ }
    const mq = window.matchMedia('(min-width:641px)')
    const sync = () => setWide(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  const toggleMax = useCallback(() => {
    setMax((v) => {
      const n = !v
      try { localStorage.setItem(MAX_KEY, n ? '1' : '0') } catch { /* ignore */ }
      track(n ? 'widget-max' : 'widget-restore')
      return n
    })
  }, [])
  // 重置 = 换 ChatBox 的 key 让它整个重挂 —— 对话本就不落库、刷新即丢,所以「清空」就是清 state,
  // 而 remount 是 React 里最省的清 state 手段(不新增 prop、ChatBox 一行都不用改)。
  const doReset = useCallback(() => {
    setResetN((n) => n + 1); setAskReset(false); track('widget-reset')
  }, [])
  // 面板一收就撤掉待确认态:再打开时看见一个亮着「确认清空」的钮是纯粹的惊吓
  useEffect(() => { if (!open) setAskReset(false) }, [open])
  // 问了 4 秒没人确认 = 误点,自己撤回(不留一个随时会清掉对话的活钮在头上)
  useEffect(() => {
    if (!askReset) return
    const id = setTimeout(() => setAskReset(false), 4000)
    return () => clearTimeout(id)
  }, [askReset])

  /**
   * 拖动(dir='move',抓标题栏)与四向缩放(dir 含 n/s/e/w,抓 8 个透明把手)共用这一个入口。
   * 监听挂 window 不挂元素:指针拖出面板外(缩放时必然会)也要跟得住。
   * 每帧都过 clampBox —— 钳制发生在**过程中**不是松手时,否则拖出视口再回弹会闪。
   */
  const startGrab = useCallback((e: React.PointerEvent, dir: string) => {
    if (!panel.current || e.button !== 0) return
    e.preventDefault()
    const r = panel.current.getBoundingClientRect()
    const s = { px: e.clientX, py: e.clientY, x: r.left, y: r.top, w: r.width, h: r.height }
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - s.px
      const dy = ev.clientY - s.py
      let { x, y, w, h } = s
      if (dir === 'move') { x += dx; y += dy }
      else {
        if (dir.includes('e')) w = s.w + dx
        if (dir.includes('s')) h = s.h + dy
        // 拉左/上边时对边要钉住:改宽的同时把左沿跟着挪。撞到最小值后左沿就不许再走,
        // 否则面板会被「推着」横向漂移(缩到底还在动 = 手感最糟的那种 resize)
        if (dir.includes('w')) { w = s.w - dx; x = w < MIN_W ? s.x + s.w - MIN_W : s.x + dx }
        if (dir.includes('n')) { h = s.h - dy; y = h < MIN_H ? s.y + s.h - MIN_H : s.y + dy }
      }
      const nb = clampBox({ x, y, w, h })
      lastBox.current = nb
      setBox(nb)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      document.body.style.userSelect = ''
      try { if (lastBox.current) localStorage.setItem(BOX_KEY, JSON.stringify(lastBox.current)) } catch { /* 隐私模式:这次生效,下次不记得 */ }
      track(dir === 'move' ? 'widget-drag' : 'widget-resize')
    }
    document.body.style.userSelect = 'none'   // 拖标题栏时别把面板里的文字一路选中
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }, [])

  // 窗口变小(换屏 / 分屏)时把记住的框拉回视口内 —— 不然面板可能整个在屏幕外,等于又「呼不出来」
  useEffect(() => {
    if (!wide) return
    const onResize = () => setBox((b) => (b ? clampBox(b) : b))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [wide])

  /**
   * popover 只是**增强**(顶层渲染、绕开父级 stacking context),**不是可见性的依据** ——
   * 可见性单一真相是 React 的 `open`,由 `.clOpen` 那条 CSS 兑现(见 CSS 段)。
   * 所以这里三条:① 只在 effect 里调(元素早已 commit,不会撞未连接的 InvalidStateError);
   * ② 全包 try/catch,老引擎(Safari<17 没有 showPopover、`:popover-open` 选择器还解析不了)静默降级;
   * ③ 重开前先问一次当前状态 —— 对已开的 popover 再调 showPopover 会抛 already-open。
   * 面板从首帧就挂在 DOM 里(见 render),所以依赖只有 open。
   */
  useEffect(() => {
    const el = panel.current
    if (!el) return
    try {
      let on = false
      try { on = el.matches(':popover-open') } catch { on = false }  // 老引擎:选择器解析不了,当作没开
      if (open && !on) el.showPopover()
      else if (!open && on) el.hidePopover()
    } catch (e) {
      console.warn('[chat] popover 不可用,退普通 fixed 层', e)
    }
  }, [open])

  /**
   * 看门狗(红线:**呼不出来是不可接受的**)。open 之后 300ms 还量不到高度,说明
   * 上面那套 CSS/popover 在这个引擎上没兑现 → 把它从顶层拽下来、用内联 display 硬顶上去,并留痕。
   * 再等 600ms 仍是 0 = 遇到了我们没预料到的引擎:**把面板收掉,让启动器回来** ——
   * 用户至少还看得见那个钮,而不是对着一张什么都没有的页面。两条都打点,下次出问题有据可查。
   */
  useEffect(() => {
    if (!open) { setForce(false); return }
    const invisible = () => !panel.current || panel.current.getBoundingClientRect().height === 0
    const a = setTimeout(() => {
      if (!invisible()) return
      console.warn('[chat] 面板开了 300ms 仍不可见 —— 强制退普通 fixed 层')
      try { panel.current?.hidePopover() } catch { /* 本来就没在顶层 */ }
      setForce(true)
      track('widget-fallback')
    }, 300)
    const b = setTimeout(() => {
      if (!invisible()) return
      console.warn('[chat] 强制普通层后仍不可见 —— 收起面板,把启动器还回去')
      track('widget-stuck')
      setOpen(false)
    }, 900)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [open])

  // Esc 关闭(manual popover 不自带)。只在打开时挂,避免全站常驻一个 keydown 监听
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, hide])

  // 吸底动作条避让(红线②):量它的实时位置,不用固定上抬量。
  // 相交判定用**基准位的合成矩形**(而不是挂件的实时矩形)—— 抬起来之后就不相交了,
  // 拿实时矩形判会抬起→落下→抬起地来回抖。条子异步渲出(JD 整理完才挂)→ MutationObserver 补测。
  useEffect(() => {
    if (open || !hasBottomBar(path)) { setClear(BASE); return }
    let bar: HTMLElement | null = null
    let raf = 0
    const measure = () => {
      raf = 0
      const d = dock.current
      bar = findBar(bar)
      if (!bar || !d) { setClear(BASE); return }
      const b = bar.getBoundingClientRect()
      // 用 documentElement.clientWidth/Height 而不是 innerWidth/Height:后者**含滚动条**,
      // 而 position:fixed 是按不含滚动条的初始包含块定位的 —— 生产实测差 15px,
      // 桌面上刚好把「提示条压住动作条 7px」判成不相交。
      const de = document.documentElement
      const top = de.clientHeight - BASE - d.offsetHeight     // 挂件在基准位时的上沿
      const left = de.clientWidth - BASE - d.offsetWidth
      const clash = b.bottom > top && b.top < de.clientHeight - BASE
        && b.right > left && b.left < de.clientWidth - BASE
      setClear(clash ? Math.max(BASE, Math.round(de.clientHeight - b.top + BASE)) : BASE)
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(measure) }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    const main = document.querySelector('main')
    const mo = new MutationObserver(schedule)
    if (main) mo.observe(main, { childList: true, subtree: true })
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      mo.disconnect()
    }
  }, [path, open, hint])

  // 轻提示:延迟出场(别跟首屏抢注意力),9 秒自己走。**只是提示,不弹面板**(红线③)
  // 依赖带 open:用户在 1.6s 内就点开了的话,cleanup 掐掉待触发的定时器(否则提示会在面板开着时冒出来);
  // 关闭后本效果重跑,那时 HINT_KEY 已被 show() 写成 MAX,直接返回。
  useEffect(() => {
    if (open) return
    let n = 0
    try { n = Number(localStorage.getItem(HINT_KEY)) || 0 } catch { return }  // 隐私模式读不到就干脆不提示
    if (n >= HINT_MAX) return
    const a = setTimeout(() => {
      setHint(true)
      try { localStorage.setItem(HINT_KEY, String(n + 1)) } catch { /* ignore */ }
    }, 1600)
    const b = setTimeout(() => setHint(false), 9600)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [path, open])

  const bottom = { '--clB': clear + 'px' } as React.CSSProperties
  // 自定义框只在**桌面 + 非最大化**时写成内联样式。手机档 wide=false → 一个字都不写,
  // @media 里那条 inset:0/100dvh 原样生效(内联样式赢 @media,所以这道闸不能只靠 CSS)。
  const boxed = wide && box && !max
  const style: React.CSSProperties = {
    ...bottom,
    ...(force ? { display: 'flex' } : null),
    ...(boxed ? { left: box.x, top: box.y, right: 'auto', bottom: 'auto', width: box.w, height: box.h } : null),
  }
  return (
    <>
      <style>{CSS}</style>
      {/* 启动器:面板开着时整块收走(手机是全屏接管,桌面面板正压在它头上) */}
      {!open && (
        <div ref={dock} className="clDock" style={bottom}>
          {hint && <button className="clHint" onClick={show}>{t('cw.hint')}</button>}
          <button className="clBtn" onClick={show} aria-label={t('cw.open')} title={t('cw.open')}>
            <IconChat size={24} />
          </button>
        </div>
      )}
      {/* 面板**首帧就在 DOM 里**(display:none),不再「点了才创建」。
          代价:全站每页多挂一个空壳(一个 div + 三行头部,display:none 不参与布局/绘制)——
          换来的是 ref 从第一次 commit 就存在,showPopover 永远撞不上「元素还没连接」。
          ChatBox 的懒加载优势没丢:**壳先在,内容仍等 mounted**(第一次点开才下载那份 JS)。 */}
      <div ref={panel} popover="manual" role="dialog" aria-label={t('chat.title')} style={style}
        className={'clPanel' + (open ? ' clOpen' : '') + (max ? ' clMaxed' : '')}>
        {mounted && (
          <>
          {/* 缩放把手:8 个透明块贴着内边缘(不敢用负偏移 —— .clPanel 是 overflow:hidden,会被裁掉)。
              最大化时不出:那是「贴满视口」的一档,拉它没有意义。手机侧 @media 里整批清掉 */}
          {wide && !max && GRIPS.map((d) => (
            <div key={d} className="clGrip" data-d={d} onPointerDown={(e) => startGrab(e, d)} />
          ))}
          {/* 标题栏兼拖拽把手 —— 但按在钮上时不拖(不然点「收起」会先被当成一次 0 像素的拖动) */}
          <div className="clHead"
            onPointerDown={(e) => {
              if (!wide || max) return
              if ((e.target as HTMLElement).closest('button')) return
              startGrab(e, 'move')
            }}>
            <span className="clTitle">{t('chat.title')}</span>
            {/* 重置:清掉本轮对话回空态(三条示例重新出现)。**就地二次确认**不上弹框 ——
                误点清掉一整轮问答不可逆,但为这个弹个模态框又太重(还得管焦点陷阱)。
                两态都用文字不用图标:图标→文字会让头部宽度跳一下,380 面板上很显眼 */}
            <button className={askReset ? 'clReset clAsk' : 'clReset'}
              onClick={() => (askReset ? doReset() : setAskReset(true))}
              aria-label={t(askReset ? 'cw.resetOk' : 'cw.reset')} title={t(askReset ? 'cw.resetOk' : 'cw.reset')}>
              {t(askReset ? 'cw.resetOk' : 'cw.reset')}
            </button>
            {/* 桌面最大化:380×600 里读一段长答复很憋(Frank 实测)。手机侧 CSS 里整个藏掉 —— 那边已经全屏 */}
            <button className="clMax" onClick={toggleMax}
              aria-label={t(max ? 'cw.restore' : 'cw.max')} title={t(max ? 'cw.restore' : 'cw.max')}>
              {max ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
            </button>
            <button className="clMin" onClick={hide} aria-label={t('cw.close')} title={t('cw.close')}>
              <IconChevronDown size={18} />
            </button>
          </div>
          {/* compact/autoFocus 是 ChatBox 自己声明的契约(2026-08-04 加):壳不再靠覆盖它的类名做样式。
              autoFocus 跟着 open 翻,每次展开聚焦一次;触屏侧 ChatBox 内部会跳过。
              PanelGuard 兜住 chunk 取不到 —— 不兜的话它会掀掉整站(见类注释) */}
          <div className="clBody">
            <PanelGuard fallback={
              <div className="clFail">
                <span>{t('chat.err.net')}</span>
                <button className="clRetry" onClick={() => location.reload()}>{t('chat.retry')}</button>
              </div>
            }>
              {/* key 一变 ChatBox 整个重挂 = 会话清空回空态。见 doReset 注释 */}
              <ChatBox key={resetN} compact autoFocus={open} />
            </PanelGuard>
          </div>
          </>
        )}
      </div>
    </>
  )
}

// --clB = 离视口底的距离,由上面的测量段按吸底动作条的实时位置写进来(默认 16px)。
// env(safe-area-inset-bottom):iPhone 底部横条,不加会被横条压住半个钮。
const CSS = `
.clDock{--clB:16px;position:fixed;right:16px;bottom:calc(var(--clB) + env(safe-area-inset-bottom,0px));
  z-index:40;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 32px)}
.clBtn{width:56px;height:56px;flex:none;border-radius:50%;border:none;background:${UI.primary};color:#fff;
  display:flex;align-items:center;justify-content:center;cursor:pointer;
  box-shadow:0 8px 24px rgba(37,99,235,.34);transition:transform .08s,background .12s}
.clBtn:hover{background:${UI.primaryDeep}}
.clBtn:active{transform:scale(.93)}
/* 首访轻提示:一行放得下、点了直接开;不是气泡对话,不带尾巴 */
.clHint{min-width:0;background:${UI.card};color:${UI.text};border:1px solid ${UI.border};border-radius:999px;
  padding:8px 14px;font-size:12.5px;line-height:1.2;font-family:inherit;white-space:nowrap;cursor:pointer;
  overflow:hidden;text-overflow:ellipsis;box-shadow:0 6px 18px rgba(15,23,42,.12)}
.clHint:hover{border-color:#bfdbfe}

/* 面板:UA 给 [popover] 的 border/padding/margin/inset 全部要覆盖掉 */
.clPanel{--clB:16px;display:none;position:fixed;margin:0;padding:0;box-sizing:border-box;
  inset:auto 16px calc(var(--clB) + env(safe-area-inset-bottom,0px)) auto;z-index:45;
  width:min(380px,calc(100vw - 32px));height:min(600px,calc(100dvh - 96px));
  flex-direction:column;overflow:hidden;background:${UI.card};color:${UI.text};
  border:1px solid ${UI.border};border-radius:16px;box-shadow:0 20px 52px rgba(15,23,42,.20)}
/* 🔴 可见性**只认 React 的 open**(它写出 .clOpen),不认 popover 开没开。
   原来这里还有一条 .clPanel:popover-open{display:flex},两条规则各说各话:
   ① 老引擎里 :popover-open 解析不了 → 整条被丢弃,可见性就悬在 showPopover 成没成功上;
   ② 反向更阴 —— hidePopover 万一没生效,那条会把已经 open=false 的面板继续显示出来。
   .clPanel.clOpen(0,2,0)压得过本文件的 .clPanel,也压得过 UA 那条
   [popover]:not(:popover-open){display:none}(作者样式 > UA 样式),所以顶层与否都显示得出来。 */
.clPanel.clOpen{display:flex}
.clHead{flex:none;display:flex;align-items:center;gap:8px;padding:11px 8px 11px 14px;
  border-bottom:1px solid ${UI.hairline};position:relative;z-index:1}
/* 缩放把手:透明、贴内边缘。8px 是「够得着又不误触」的档(macOS 窗口边框同量级)。
   touch-action:none —— 不写的话触屏板/触屏上的拖动会被当成滚动手势吃掉 */
.clGrip{position:absolute;z-index:2;touch-action:none}
.clGrip[data-d=n]{top:0;left:10px;right:10px;height:8px;cursor:ns-resize}
.clGrip[data-d=s]{bottom:0;left:10px;right:10px;height:8px;cursor:ns-resize}
.clGrip[data-d=w]{left:0;top:10px;bottom:10px;width:8px;cursor:ew-resize}
.clGrip[data-d=e]{right:0;top:10px;bottom:10px;width:8px;cursor:ew-resize}
.clGrip[data-d=nw]{top:0;left:0;width:14px;height:14px;cursor:nwse-resize}
.clGrip[data-d=se]{bottom:0;right:0;width:14px;height:14px;cursor:nwse-resize}
.clGrip[data-d=ne]{top:0;right:0;width:14px;height:14px;cursor:nesw-resize}
.clGrip[data-d=sw]{bottom:0;left:0;width:14px;height:14px;cursor:nesw-resize}
/* 重置:弱化到不抢标题(灰字),按下待确认时才变红 —— 「这一下会清掉东西」得看得出来 */
.clReset{flex:none;border:none;background:none;font-family:inherit;font-size:12px;line-height:1;
  color:${UI.text3};border-radius:8px;padding:8px 6px;cursor:pointer;white-space:nowrap}
.clReset:hover{background:${UI.hairline};color:${UI.text2}}
.clReset.clAsk{color:${UI.danger};font-weight:600}
.clReset.clAsk:hover{background:#fef2f2}
.clPanel:not(.clMaxed) .clHead{cursor:move}   /* 标题栏即拖拽把手;最大化档没得拖 */
.clTitle{flex:1;min-width:0;font-size:14px;font-weight:700;color:${UI.text};
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.clMin,.clMax{flex:none;width:32px;height:32px;display:flex;align-items:center;justify-content:center;
  border:none;background:none;color:${UI.text2};border-radius:8px;cursor:pointer}
.clMin:hover,.clMax:hover{background:${UI.hairline};color:${UI.text}}
/* 最大化:贴着视口留 12px,窗宽封到 1100。**行宽不靠窗宽管** ——
   正文读列由 ChatBox 的 --cbW(860px,对齐 Open WebUI 取样)自己居中收窄,
   所以窗放到 1100 也不会出现「一行 90+ 词、眼睛回不到行首」。
   仍靠右下角锚定 —— 它得还像那个挂件,不是突然变成一个居中弹框 */
.clPanel.clMaxed{inset:12px 12px 12px auto;width:min(1100px,calc(100vw - 24px));height:calc(100dvh - 24px)}
/* 卡壳与历史区高度由 ChatBox 的 compact 自己管(它的 .cbFill),这里只给容器 —— 壳**不覆盖别人的类名** */
.clBody{flex:1;min-height:0;display:flex;flex-direction:column;padding:10px 12px 12px;overflow:hidden}
/* 懒加载那份 JS 在路上(弱网几秒)。手机是全屏接管,没这行就是一张全屏白纸 */
.clLoad{flex:1;display:flex;align-items:center;justify-content:center;gap:4px}
.clLoad i{width:6px;height:6px;border-radius:50%;background:#93c5fd;animation:clBlink 1.2s infinite}
.clLoad i:nth-child(2){animation-delay:.2s}
.clLoad i:nth-child(3){animation-delay:.4s}
@keyframes clBlink{0%,80%,100%{opacity:.28}40%{opacity:1}}
/* chunk 取不到(手机弱网 / 标签页跨了一次部署)。重载是**真的解法**:换回新哈希那份 */
.clFail{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;
  padding:16px;font-size:13px;line-height:1.5;color:${UI.text2};text-align:center}
.clRetry{border:1px solid ${UI.border};background:${UI.card};color:${UI.text};font-family:inherit;
  font-size:13px;border-radius:8px;padding:7px 16px;cursor:pointer}
.clRetry:hover{border-color:#bfdbfe}

/* 手机:展开=全屏接管(缩在角落挤成一条没法读长答复);底部留出 iPhone 横条。
   .clPanel.clMaxed 必须一起点名(它比单个 .clPanel 更具体),不点名的话
   ——一个在桌面上按过最大化的人换到手机就会看到一个 12px 内缩的「最大化」窗,而不是全屏。 */
@media(max-width:640px){
  .clPanel,.clPanel.clMaxed{inset:0;width:100%;height:100dvh;max-height:none;border:none;border-radius:0;
    padding-bottom:env(safe-area-inset-bottom,0px)}
  .clMax,.clGrip{display:none}   /* 已经是全屏:放大钮与缩放把手在这儿都没有意义 */
  .clHead{cursor:default}        /* 全屏没什么可拖的 */
}
@media (prefers-reduced-motion:reduce){.clBtn{transition:none}.clLoad i{animation:none;opacity:.6}}
`
