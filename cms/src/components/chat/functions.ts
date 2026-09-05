/**
 * chat 域(全站悬浮顾问)的函数:正文排版、SSE 读流、错误码分拣、多轮上下文拼装、
 * 示例句/记忆挑选、挂件几何钳制与避让测量,以及全部 make* 手柄工厂(hooks 体内
 * 不留函数体,效果体也在这儿以 make*Effect 工厂给出,壳里只调)。
 * 2026-08-27 换装批自 ChatBox/ChatAnswer/ChatLauncher/chatExamples 四件收拢;
 * 原文的取样、事故与拍板注释全数随迁到各函数头上。
 * 2026-08-29 摘 ref 那批:**渲染期收 ref 的那八个工厂**(发话、贴底滚动、composer
 * 键盘/聚焦、启动器点击/拖动、缩放把手、标题栏拖动)改名 use* 迁去 hooks.ts ——
 * 普通函数在渲染期收 ref 被 react-hooks/refs 判违规,hook 形态才是豁免的那种;
 * 这里留下的是纯件(不碰 ref 的工厂、几何、排版、读流与真身 sendNow)。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */

import { track } from '@/lib/track'
import {
  BAR_H_MIN, BAR_SCAN_SEL, BOTTOM_ZERO, BOX_LS_KEY, CLB_VAR, COARSE_MQ, DIR_E, DIR_N, DIR_S, DIR_W, DISPLAY_FLEX,
  DOCK_BTN, DOCK_GAP, DOCK_LS_KEY, EDGE_GAP, EV_W_CLOSE, EV_W_FALLBACK, EV_W_MAX, EV_W_MIN, EV_W_OPEN, EV_W_RESET,
  EV_W_RESTORE, EV_W_STUCK, EVT_KEYDOWN, EVT_MQ_CHANGE, EVT_RESIZE, EVT_SCROLL, GRAB_MOVE, HINT_DELAY_MS,
  HINT_HIDE_MS, HINT_KEY, HINT_MAX, JOBS_DETAIL_RE, KEY_ESC, LS_OFF, LS_ON, MAIN_SEL, MAX_LS_KEY, NARROW_OFF_RE,
  OPEN_EVT, PANEL_H_MIN, PANEL_W_MIN, PLAN_HEAD, POPOVER_OPEN_SEL, POS_AUTO, POS_FIXED, POS_STICKY, PREFILL_MAX, PX,
  RESET_ASK_MS, WARN_POPOVER, WARN_STUCK, WARN_WATCHDOG, WATCHDOG2_MS, WATCHDOG_MS, WIDE_MQ,
} from './constants'
import type {
  Box, ClampDockIn, DockPos, GrabDir, GrabStart, LazyBoxModule, MutBool, MutBox, PrefillDetail,
} from './types'

/**
 * 钳制面板框:不许拖出视口、不许小到看不见内容。resize 与 drag 共用同一道闸,
 * 也用在读 localStorage 时 —— 上次存的是 1600 宽,这次换了台小屏笔记本,
 * 不钳一下面板就有一半在视口外。
 *
 * @param x 要钳的框。
 * @returns 钳好的框。
 */
export function clampBoxOf(x: {
  /**
   * 要钳的框。
   */
  b: Box
}): Box {
  const de = document.documentElement
  const w = Math.max(PANEL_W_MIN, Math.min(x.b.w, de.clientWidth))
  const h = Math.max(PANEL_H_MIN, Math.min(x.b.h, de.clientHeight))
  return {
    w,
    h,
    x: Math.max(0, Math.min(x.b.x, de.clientWidth - w)),
    y: Math.max(0, Math.min(x.b.y, de.clientHeight - h)),
  }
}

/**
 * 钳制启动器位置(按那颗钮的边长算,不按带提示条的整条 dock ——
 * 提示条在自定义位隐藏,拿带条的宽度钳会让钮够不到屏幕右缘)。
 *
 * @param x 要钳的位置与钮的宽高。
 * @returns 钳好的位置。
 */
export function clampDockOf(x: ClampDockIn): DockPos {
  const de = document.documentElement
  return {
    x: Math.max(EDGE_GAP, Math.min(x.p.x, de.clientWidth - x.w - EDGE_GAP)),
    y: Math.max(EDGE_GAP, Math.min(x.p.y, de.clientHeight - x.h - EDGE_GAP)),
  }
}

/**
 * 有吸底动作条的路由才开避让测量。为什么要这道闸而不是全站都测:职位板列表页
 * DOM 上千个 div,扫不到条子就每帧白扫一遍;详情页只有 39 个,可以忽略。
 * 两条:职位详情页(ApplyBar)、/plan/* 四张评估页(.quizBar 手机上 fixed)。
 *
 * @param x 当前路径。
 * @returns 要测 = true。
 */
export function hasBottomBarOf(x: {
  /**
   * 当前路径。
   */
  path: string
}): boolean {
  return JOBS_DETAIL_RE.test(x.path) || x.path.startsWith(PLAN_HEAD)
}

/**
 * 找页面的吸底动作条。按**特征**找不按 class 找:ApplyBar / quizBar 都是别的
 * 组件的内联样式,写死选择器等着被改坏;特征(bottom:0 的 sticky|fixed 块)
 * 稳定得多,以后新加的底栏自动被躲开。只扫 main 内 —— 挂件自己挂在 main 外,
 * 天然不会把自己认成底栏。生产实测:详情页 39 个 div 全扫 0.3ms;找到后缓存,
 * 滚动时只剩一次 getBoundingClientRect。
 *
 * @param x 上次找到的缓存。
 * @returns 条子;没有 = null。
 */
export function findBarOf(x: {
  /**
   * 上次找到的缓存;还连着就直接用。
   */
  cached: HTMLElement | null
}): HTMLElement | null {
  if (x.cached != null && x.cached.isConnected) {
    return x.cached
  }
  for (const el of document.querySelectorAll<HTMLElement>(BAR_SCAN_SEL)) {
    const s = getComputedStyle(el)
    const stuck = s.position === POS_STICKY || s.position === POS_FIXED
    if (s.bottom === BOTTOM_ZERO && stuck && el.offsetHeight > BAR_H_MIN) {
      return el
    }
  }
  return null
}

/**
 * 这条路由的手机端连启动器圆球也不出吗(走查 #298:56×56 fixed 在 375 视口永久
 * 盖住右下角内容,顾问在评估/处境两条动线上本就不导流;职位页照旧。面板本身
 * 不受影响:页面里的「问 AI」入口 dispatch 事件仍能打开)。
 *
 * @param x 当前路径。
 * @returns 窄屏藏球 = true。
 */
export function isNarrowOffPath(x: {
  /**
   * 当前路径。
   */
  path: string
}): boolean {
  return NARROW_OFF_RE.test(x.path)
}

/**
 * 造打开面板的手柄:点开过 = 轻提示永久不再出(HINT_KEY 写成 MAX)。
 *
 * @param x 三个落格。
 * @returns 打开手柄。
 */
export function makeShow(x: {
  /**
   * 内容挂载落格(打开过一次就不再卸载)。
   */
  setMounted: (v: boolean) => void

  /**
   * 面板开合落格。
   */
  setOpen: (v: boolean) => void

  /**
   * 轻提示落格。
   */
  setHint: (v: boolean) => void
}): () => void {
  return function show(): void {
    x.setMounted(true)
    x.setOpen(true)
    x.setHint(false)
    track(EV_W_OPEN)
    try {
      localStorage.setItem(HINT_KEY, String(HINT_MAX))
    } catch {
      ignoreNetErr()
    }
  }
}

/**
 * 造关闭面板的手柄。
 *
 * @param x 面板开合落格。
 * @returns 关闭手柄。
 */
export function makeHide(x: {
  /**
   * 面板开合落格。
   */
  setOpen: (v: boolean) => void
}): () => void {
  return function hide(): void {
    x.setOpen(false)
    track(EV_W_CLOSE)
  }
}

/**
 * 造最小化手柄(与关闭同效,埋点分开 —— 最小化是「等会儿回来」,关闭是「不要了」)。
 *
 * @param x 面板开合落格。
 * @returns 最小化手柄。
 */
export function makeMinimize(x: {
  /**
   * 面板开合落格。
   */
  setOpen: (v: boolean) => void
}): () => void {
  return function minimize(): void {
    x.setOpen(false)
    track(EV_W_MIN)
  }
}

/**
 * 造桌面全屏开合手柄(偏好落 localStorage:愿意在小窗里读长答复的人每次都愿意)。
 *
 * @param x 全屏落格。
 * @returns 开合手柄。
 */
export function makeToggleMax(x: {
  /**
   * 全屏落格(函数式:翻转现值)。
   */
  setMax: (f: (v: boolean) => boolean) => void
}): () => void {
  return function toggleMax(): void {
    x.setMax(function flip(v: boolean): boolean {
      const n = v === false
      try {
        let saved = LS_OFF
        if (n) {
          saved = LS_ON
        }
        localStorage.setItem(MAX_LS_KEY, saved)
      } catch {
        ignoreNetErr()
      }
      if (n) {
        track(EV_W_MAX)
      } else {
        track(EV_W_RESTORE)
      }
      return n
    })
  }
}

/**
 * 造真清空手柄:换 ChatBox 的 key 让它整个重挂 —— 对话本就不落库、刷新即丢,
 * 「清空」就是清 state,而 remount 是 React 里最省的清 state 手段。
 *
 * @param x 两个落格。
 * @returns 清空手柄。
 */
export function makeDoReset(x: {
  /**
   * 重挂计数落格(函数式自增)。
   */
  setResetN: (f: (n: number) => number) => void

  /**
   * 二次确认落格(清完熄掉)。
   */
  setAskReset: (v: boolean) => void
}): () => void {
  return function doReset(): void {
    x.setResetN(function bump(n: number): number {
      return n + 1
    })
    x.setAskReset(false)
    track(EV_W_RESET)
  }
}

/**
 * 造重置钮的点击手柄:第一下亮二次确认(误清一整轮问答不可逆,但为这个弹模态框
 * 又太重),第二下真清。
 *
 * @param x 现确认态、真清手柄与确认落格。
 * @returns 点击手柄。
 */
export function makeResetStep(x: {
  /**
   * 二次确认亮着。
   */
  askReset: boolean

  /**
   * 真清手柄。
   */
  doReset: () => void

  /**
   * 二次确认落格。
   */
  setAskReset: (v: boolean) => void
}): () => void {
  return function resetStep(): void {
    if (x.askReset) {
      x.doReset()
      return
    }
    x.setAskReset(true)
  }
}

/**
 * 拖动/缩放中的下一帧框(纯几何):move 整体平移;拉边改宽高,拉左/上边对边钉住 ——
 * 撞到最小值后左沿不许再走,否则面板被「推着」横向漂移(缩到底还在动是手感最糟的
 * 那种 resize)。钳制由调用方过 clampBoxOf。
 * 2026-08-29 摘 ref 那批起对本桶导出:唯一消费者 useGripDownOf 跟着 ref 迁去了
 * hooks.ts,而这段是纯几何,留在纯件这边。
 *
 * @param g 起始几何、方向与位移。
 * @returns 未钳制的下一帧框。
 */
export function grabbedBoxOf(g: {
  /**
   * 按下时的起始几何。
   */
  s: GrabStart

  /**
   * 方向档。
   */
  d: GrabDir

  /**
   * 横向位移。
   */
  dx: number

  /**
   * 纵向位移。
   */
  dy: number
}): Box {
  let bx = g.s.x
  let by = g.s.y
  let bw = g.s.w
  let bh = g.s.h
  if (g.d === GRAB_MOVE) {
    return { x: bx + g.dx, y: by + g.dy, w: bw, h: bh }
  }
  if (g.d.includes(DIR_E)) {
    bw = g.s.w + g.dx
  }
  if (g.d.includes(DIR_S)) {
    bh = g.s.h + g.dy
  }
  if (g.d.includes(DIR_W)) {
    bw = g.s.w - g.dx
    if (bw < PANEL_W_MIN) {
      bx = g.s.x + g.s.w - PANEL_W_MIN
    } else {
      bx = g.s.x + g.dx
    }
  }
  if (g.d.includes(DIR_N)) {
    bh = g.s.h - g.dy
    if (bh < PANEL_H_MIN) {
      by = g.s.y + g.s.h - PANEL_H_MIN
    } else {
      by = g.s.y + g.dy
    }
  }
  return { x: bx, y: by, w: bw, h: bh }
}

/**
 * 面板的内联样式合成:避让距离(--clB 变量)+ 看门狗强制显示 + 桌面自定义框。
 * 自定义框只在**桌面 + 非全屏**时写成内联(手机档一个字都不写 —— 内联赢 @media,
 * 写了就是把桌面尺寸泄漏到手机的 100dvh 全屏档上)。
 *
 * @param x 避让距离、强制档与自定义框。
 * @returns 内联样式。
 */
export function panelStyleOf(x: {
  /**
   * 离视口底的实测距离(px)。
   */
  clear: number

  /**
   * 看门狗强制显示档。
   */
  force: boolean

  /**
   * 生效中的自定义框;默认档 = null。
   */
  box: Box | null
}): React.CSSProperties {
  const st: React.CSSProperties = {}
  const bag = st as Record<string, string | number>
  bag[CLB_VAR] = x.clear + PX
  if (x.force) {
    st.display = DISPLAY_FLEX
  }
  if (x.box != null) {
    st.left = x.box.x
    st.top = x.box.y
    st.right = POS_AUTO
    st.bottom = POS_AUTO
    st.width = x.box.w
    st.height = x.box.h
  }
  return st
}

/**
 * 启动器的内联样式合成:拖过用自定义位(left/top),没拖过用避让距离变量。
 *
 * @param x 自定义位与避让距离。
 * @returns 内联样式。
 */
export function dockStyleOf(x: {
  /**
   * 自定义位;没拖过 = null。
   */
  dockPos: DockPos | null

  /**
   * 离视口底的实测距离(px)。
   */
  clear: number
}): React.CSSProperties {
  const st: React.CSSProperties = {}
  if (x.dockPos != null) {
    st.left = x.dockPos.x
    st.top = x.dockPos.y
    st.right = POS_AUTO
    st.bottom = POS_AUTO
    return st
  }
  const bag = st as Record<string, string | number>
  bag[CLB_VAR] = x.clear + PX
  return st
}

/**
 * 效果体:触屏判定(coarse 引用只在挂载时定一次)。
 *
 * @param x 触屏引用。
 * @returns 效果体(无清理)。
 */
export function makeCoarseEffect(x: {
  /**
   * 触屏引用。
   */
  coarse: MutBool
}): () => void {
  return function detectCoarse(): void {
    x.coarse.current = window.matchMedia(COARSE_MQ).matches
  }
}

/**
 * 效果体:C6 通道卡 CTA 从页面任意处拉起挂件并预填问句(prefill 只进输入框,
 * 不自动发送 —— 以用户身份发话必须由用户按发送)。detail 是我们自己 dispatch 的,
 * 仍设长度帽防手滑。
 *
 * @param x 预填落格与打开手柄。
 * @returns 效果体(返回清理)。
 */
export function makeOpenEvtEffect(x: {
  /**
   * 预填落格。
   */
  setPrefill: (v: string) => void

  /**
   * 打开面板。
   */
  show: () => void
}): () => () => void {
  return function listen(): () => void {
    function onOpenEvt(e: Event): void {
      const detail = (e as CustomEvent).detail as PrefillDetail
      if (detail != null && typeof detail.prefill === 'string') {
        x.setPrefill(detail.prefill.slice(0, PREFILL_MAX))
      }
      x.show()
    }
    window.addEventListener(OPEN_EVT, onOpenEvt)
    return function stop(): void {
      window.removeEventListener(OPEN_EVT, onOpenEvt)
    }
  }
}

/**
 * 效果体:挂载时读三份 localStorage 偏好(全屏/自定义框/启动器位)并跟踪桌面档。
 * 读在 effect 里,不在 useState 初值里:localStorage 在服务端不存在,当初值会
 * hydration 不一致。存的东西坏了/隐私模式:退回默认档,不报错。
 *
 * @param x 四个落格与最新框引用。
 * @returns 效果体(返回清理)。
 */
export function makeMountPrefsEffect(x: {
  /**
   * 全屏落格。
   */
  setMax: (v: boolean) => void

  /**
   * 自定义框落格。
   */
  setBox: (v: Box) => void

  /**
   * 最新框引用。
   */
  lastBox: MutBox

  /**
   * 启动器位落格。
   */
  setDockPos: (v: DockPos) => void

  /**
   * 桌面档落格(跟着窗口变化走 —— 从桌面拖窄到手机档时 box 要立刻停止生效)。
   */
  setWide: (v: boolean) => void
}): () => () => void {
  return function readPrefs(): () => void {
    try {
      x.setMax(localStorage.getItem(MAX_LS_KEY) === LS_ON)
    } catch {
      ignoreNetErr()
    }
    try {
      const raw = localStorage.getItem(BOX_LS_KEY)
      if (raw != null) {
        const b = clampBoxOf({ b: JSON.parse(raw) as Box })
        x.lastBox.current = b
        x.setBox(b)
      }
    } catch {
      ignoreNetErr()
    }
    try {
      const raw = localStorage.getItem(DOCK_LS_KEY)
      if (raw != null) {
        x.setDockPos(clampDockOf({ p: JSON.parse(raw) as DockPos, w: DOCK_BTN, h: DOCK_BTN }))
      }
    } catch {
      ignoreNetErr()
    }
    const mq = window.matchMedia(WIDE_MQ)
    function sync(): void {
      x.setWide(mq.matches)
    }
    sync()
    mq.addEventListener(EVT_MQ_CHANGE, sync)
    return function stop(): void {
      mq.removeEventListener(EVT_MQ_CHANGE, sync)
    }
  }
}

/**
 * 效果体:popover 调度。popover 只是**增强**(顶层渲染、绕开父级 stacking
 * context),**不是可见性的依据** —— 可见性单一真相是 React 的 open。三条:
 * ① 只在 effect 里调(元素早已 commit);② 全包 try/catch,老引擎(Safari<17
 * 没有 showPopover、:popover-open 解析不了)静默降级;③ 重开前先问当前状态 ——
 * 对已开的 popover 再调 showPopover 会抛 already-open。
 *
 * @param x 面板引用与开合态。
 * @returns 效果体。
 */
export function makePopoverEffect(x: {
  /**
   * 面板 DOM 引用。
   */
  panelEl: React.RefObject<HTMLDivElement | null>

  /**
   * 面板开着。
   */
  open: boolean
}): () => void {
  return function syncPopover(): void {
    const el = x.panelEl.current
    if (el == null) {
      return
    }
    try {
      let on = false
      try {
        on = el.matches(POPOVER_OPEN_SEL)
      } catch {
        on = false
      }
      if (x.open && on === false) {
        el.showPopover()
      } else if (x.open === false && on) {
        el.hidePopover()
      }
    } catch (e) {
      console.warn(WARN_POPOVER, e)
    }
  }
}

/**
 * 效果体:看门狗(红线:**呼不出来是不可接受的**)。open 之后 300ms 还量不到
 * 高度 = CSS/popover 在这个引擎上没兑现 → 拽下顶层、内联 display 硬顶上去并留痕;
 * 再等 600ms 仍是 0 = 没预料到的引擎 → 收面板还启动器(用户至少看得见那个钮,
 * 而不是对着一张什么都没有的页面)。两级都打点,下次出问题有据可查。
 *
 * @param x 面板引用与两个落格。
 * @returns 效果体(返回清理)。
 */
export function makeWatchdogEffect(x: {
  /**
   * 面板 DOM 引用。
   */
  panelEl: React.RefObject<HTMLDivElement | null>

  /**
   * 强制普通层落格。
   */
  setForce: (v: boolean) => void

  /**
   * 面板开合落格(二级收面板)。
   */
  setOpen: (v: boolean) => void
}): () => () => void {
  return function watch(): () => void {
    function invisible(): boolean {
      return x.panelEl.current == null || x.panelEl.current.getBoundingClientRect().height === 0
    }
    const a = setTimeout(function levelOne(): void {
      if (invisible() === false) {
        return
      }
      console.warn(WARN_WATCHDOG)
      try {
        if (x.panelEl.current != null) {
          x.panelEl.current.hidePopover()
        }
      } catch {
        ignoreNetErr()
      }
      x.setForce(true)
      track(EV_W_FALLBACK)
    }, WATCHDOG_MS)
    const b = setTimeout(function levelTwo(): void {
      if (invisible() === false) {
        return
      }
      console.warn(WARN_STUCK)
      track(EV_W_STUCK)
      x.setOpen(false)
    }, WATCHDOG2_MS)
    return function stop(): void {
      clearTimeout(a)
      clearTimeout(b)
    }
  }
}

/**
 * 效果体:Esc 关闭(manual popover 不自带)。只在打开时挂,避免全站常驻一个
 * keydown 监听。
 *
 * @param x 关闭手柄。
 * @returns 效果体(返回清理)。
 */
export function makeEscEffect(x: {
  /**
   * 关闭面板。
   */
  hide: () => void
}): () => () => void {
  return function listen(): () => void {
    function onKey(e: KeyboardEvent): void {
      if (e.key === KEY_ESC) {
        x.hide()
      }
    }
    document.addEventListener(EVT_KEYDOWN, onKey)
    return function stop(): void {
      document.removeEventListener(EVT_KEYDOWN, onKey)
    }
  }
}

/**
 * 效果体:吸底动作条避让(红线:绝不压住吸底动作条 —— ApplyBar 是全站主转化)。
 * 量它的实时位置,不用固定上抬量(sticky 条在「粘住/停在正文末尾」之间摆动)。
 * 相交判定用**基准位的合成矩形**而不是挂件实时矩形 —— 抬起来之后就不相交了,
 * 拿实时矩形判会抬起→落下→抬起地来回抖。条子异步渲出(JD 整理完才挂)→
 * MutationObserver 补测。用 documentElement.clientWidth/Height 而不是 inner* ——
 * 后者**含滚动条**,而 fixed 按不含滚动条的初始包含块定位,生产实测差 15px,
 * 刚好把「提示条压住动作条 7px」判成不相交。
 *
 * @param x 启动器引用与距离落格。
 * @returns 效果体(返回清理)。
 */
export function makeDodgeEffect(x: {
  /**
   * 启动器 DOM 引用。
   */
  dockEl: React.RefObject<HTMLDivElement | null>

  /**
   * 离底距离落格。
   */
  setClear: (v: number) => void
}): () => () => void {
  return function watch(): () => void {
    let bar: HTMLElement | null = null
    let raf = 0
    function measure(): void {
      raf = 0
      const d = x.dockEl.current
      bar = findBarOf({ cached: bar })
      if (bar == null || d == null) {
        x.setClear(DOCK_GAP)
        return
      }
      const b = bar.getBoundingClientRect()
      const de = document.documentElement
      const top = de.clientHeight - DOCK_GAP - d.offsetHeight
      const left = de.clientWidth - DOCK_GAP - d.offsetWidth
      const clash = b.bottom > top && b.top < de.clientHeight - DOCK_GAP
        && b.right > left && b.left < de.clientWidth - DOCK_GAP
      if (clash) {
        x.setClear(Math.max(DOCK_GAP, Math.round(de.clientHeight - b.top + DOCK_GAP)))
      } else {
        x.setClear(DOCK_GAP)
      }
    }
    function schedule(): void {
      if (raf === 0) {
        raf = requestAnimationFrame(measure)
      }
    }
    schedule()
    window.addEventListener(EVT_SCROLL, schedule, { passive: true })
    window.addEventListener(EVT_RESIZE, schedule)
    const main = document.querySelector(MAIN_SEL)
    const mo = new MutationObserver(schedule)
    if (main != null) {
      mo.observe(main, { childList: true, subtree: true })
    }
    return function stop(): void {
      if (raf !== 0) {
        cancelAnimationFrame(raf)
      }
      window.removeEventListener(EVT_SCROLL, schedule)
      window.removeEventListener(EVT_RESIZE, schedule)
      mo.disconnect()
    }
  }
}

/**
 * 效果体:窗口变小时把记住的框拉回视口内 —— 不然面板可能整个在屏幕外,
 * 等于又「呼不出来」。
 *
 * @param x 框落格(函数式:有框才钳)。
 * @returns 效果体(返回清理)。
 */
export function makeBoxResizeEffect(x: {
  /**
   * 框落格(函数式)。
   */
  setBox: (f: (b: Box | null) => Box | null) => void
}): () => () => void {
  return function listen(): () => void {
    function onResize(): void {
      x.setBox(function reclamp(b: Box | null): Box | null {
        if (b == null) {
          return b
        }
        return clampBoxOf({ b })
      })
    }
    window.addEventListener(EVT_RESIZE, onResize)
    return function stop(): void {
      window.removeEventListener(EVT_RESIZE, onResize)
    }
  }
}

/**
 * 效果体:窗口变小时把启动器自定义位拉回视口内(同面板那条的理由)。
 *
 * @param x 位置落格(函数式)。
 * @returns 效果体(返回清理)。
 */
export function makeDockResizeEffect(x: {
  /**
   * 位置落格(函数式)。
   */
  setDockPos: (f: (p: DockPos | null) => DockPos | null) => void
}): () => () => void {
  return function listen(): () => void {
    function onResize(): void {
      x.setDockPos(function reclamp(p: DockPos | null): DockPos | null {
        if (p == null) {
          return p
        }
        return clampDockOf({ p, w: DOCK_BTN, h: DOCK_BTN })
      })
    }
    window.addEventListener(EVT_RESIZE, onResize)
    return function stop(): void {
      window.removeEventListener(EVT_RESIZE, onResize)
    }
  }
}

/**
 * 效果体:首访轻提示(红线:**不自动弹开** —— SaaS 挂件最招人烦的一条;只给
 * 一句静默提示,延迟出场别跟首屏抢注意力,9 秒自己走,最多 HINT_MAX 次,
 * 点开过永久不出)。隐私模式读不到就干脆不提示。
 *
 * @param x 提示落格。
 * @returns 效果体(返回清理)。
 */
export function makeHintEffect(x: {
  /**
   * 提示落格。
   */
  setHint: (v: boolean) => void
}): () => () => void {
  return function schedule(): () => void {
    let n = 0
    try {
      const raw = localStorage.getItem(HINT_KEY)
      if (raw != null) {
        n = Number(raw)
        if (Number.isNaN(n)) {
          n = 0
        }
      }
    } catch {
      return ignoreNetErr
    }
    if (n >= HINT_MAX) {
      return ignoreNetErr
    }
    const a = setTimeout(function showHint(): void {
      x.setHint(true)
      try {
        localStorage.setItem(HINT_KEY, String(n + 1))
      } catch {
        ignoreNetErr()
      }
    }, HINT_DELAY_MS)
    const b = setTimeout(function hideHint(): void {
      x.setHint(false)
    }, HINT_HIDE_MS)
    return function stop(): void {
      clearTimeout(a)
      clearTimeout(b)
    }
  }
}

/**
 * 效果体:重置二次确认问了 RESET_ASK_MS 没人确认 = 误点,自己撤回
 * (不留一个随时会清掉对话的活钮在头上)。
 *
 * @param x 二次确认落格。
 * @returns 效果体(返回清理)。
 */
export function makeAskResetTimer(x: {
  /**
   * 二次确认落格。
   */
  setAskReset: (v: boolean) => void
}): () => () => void {
  return function arm(): () => void {
    const id = setTimeout(function cancel(): void {
      x.setAskReset(false)
    }, RESET_ASK_MS)
    return function stop(): void {
      clearTimeout(id)
    }
  }
}

/**
 * 懒加载的取件函数(dynamic 的入参形状由 next 定;模块路径是打包器要的静态字面量)。
 * 2026-08-27 自 chatloading.tsx 迁入 —— 一个 tsx 只住一个渲染 function(闸 one-function-per-tsx)。
 *
 * @returns ChatBox 组件的 Promise。
 */
export function loadChatBox() {
  return import('@/components/guide').then(pickGuideBox)
}

/**
 * 从模块里挑出组件(then 的具名回调)。2026-09-05 批三:挂件面板里装的是站内向导对话框(components/guide),
 * 老 ChatBox 随 consult 循环退役;壳这边只换了取件那一行。
 *
 * @param m guide 桶(只声明真取的那一格)。
 * @returns GuideBox 组件。
 */
function pickGuideBox(m: LazyBoxModule) {
  return m.GuideBox
}

/**
 * chunk 取不到时的重载(**真的解法**:换回新哈希那份)。
 * 2026-08-27 自 chatlauncher.tsx 迁入,理由同上。
 *
 * @returns 无。
 */
export function reloadPage(): void {
  location.reload()
}

/**
 * fetch / popover 这类「失败也不影响壳」的 Promise 收尾:只吞不报(壳的红线 ⑤「呼不出来」有看门狗兜)。
 *
 * @returns 无。
 */
export function ignoreNetErr(): void {
  return
}
