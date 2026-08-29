'use client'
/**
 * chat 域的状态机器:useChatBox 一台管对话面板(轮次/流式/示例/记忆/composer),
 * useChatLauncher 一台管挂件壳(开合/避让/拖拽缩放/看门狗/轻提示)。
 * 体内不留函数体:带口径的步骤全在 ./functions 的工厂里(注释即它们的 JSDoc),
 * 这里只剩 useState、具名 effect 壳与工厂装配(形制同 account 的 useAccountPage)。
 * 2026-08-27 换装批自 ChatBox/ChatLauncher 的组件体收进来。
 * 2026-08-29 摘 ref 那批:**渲染期收 ref 的八个工厂**改名 use* 迁了进来(useSend、
 * useThreadScroll、useComposerKey、useComposerFocus、useDockClick、useDockDown、
 * useGripDownOf、useHeadDown),外加新立的 useFocusInput,函数体一字未改 ——
 * 普通函数在渲染期收 ref 会被 react-hooks/refs 判违规,hook 形态才是豁免的那种。
 * 上面「体内不留函数体」那句自此只管两台机器本身:纯件仍在 ./functions,
 * 迁进来的是「非得在渲染期拿到 ref 不可」的那一小撮。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/components/i18n'
import { track } from '@/lib/track'
import {
  BOX_LS_KEY, BTN_SEL, DOCK_BTN, DOCK_GAP, DOCK_LS_KEY, DRAG_SLOP, EV_OPEN, EV_W_DOCK_DRAG, EV_W_DRAG, EV_W_RESIZE,
  EVT_POINTERCANCEL, EVT_POINTERMOVE, EVT_POINTERUP, GRAB_MOVE, KEY_ENTER, PATH_ROOT, POINTER_MOUSE, SELECT_NONE,
  STICK_SLACK, TEXT_NONE} from './constants'
import {
  clampBoxOf, clampDockOf, dockStyleOf, grabbedBoxOf, hasBottomBarOf, ignoreNetErr, makeAskResetTimer,
  makeAutofocusEffect, makeBoxResizeEffect, makeCoarseEffect, makeComposerChange, makeCopyThread,
  makeDockResizeEffect, makeDodgeEffect, makeDoReset, makeEscEffect, makeHide, makeHintEffect, makeLoadMe,
  makeMinimize, makeMountPrefsEffect, makeOpenEvtEffect, makePopoverEffect, makeResetStep, makeSecsTickEffect,
  makeShow, makeStepsToggle, makeStickEffect, makeToggleMax, makeWatchdogEffect, panelStyleOf, pickExamples,
  profileMemories, sendNow, threadOf} from './functions'
import type {
  Box, ChatBoxOut, ChatMe, ComposerKeyEvent, DockPos, GrabDir, LauncherOut, MutBool, MutBox, SendIn,
  ThreadScrollEvent, Turn, UseSendIn} from './types'

/**
 * 对话面板整机(C2 对话即产品):轮次表 + 流式落格 + 三态示例/记忆 + composer
 * 手柄。本机只管状态,一句结论都不生成 —— 结论、数字、判定全部来自服务端工具层
 * 并挂 evidence(总红线)。
 *
 * @param x 预填问句与展开聚焦档(挂件壳递进来)。
 * @returns 对话面板:状态 + 手柄,两枚 DOM 引用另交(ref 不进面板对象,见 ChatBoxOut)。
 */
// eslint-disable-next-line local/function-length -- 一台机器不拆:轮次/流式/示例的状态互相咬合,拆开要互相穿参;体内只剩 state 与工厂装配
export function useChatBox(x: {
  /**
   * 预填问句(只进输入框不自动发送;变化一次覆盖一次 —— 事件只来自用户点 CTA,
   * 是明确意图,不算误伤草稿)。
   */
  prefill: string

  /**
   * 变 true 时聚焦输入框(挂件每次展开翻一次;触屏跳过)。
   */
  autoFocus: boolean
}): ChatBoxOut {
  const [lang, , t] = useLang()
  const [input, setInput] = useState(x.prefill)
  const [thCopied, setThCopied] = useState(false)
  const [prefillSeen, setPrefillSeen] = useState(x.prefill)
  if (x.prefill !== prefillSeen) {
    setPrefillSeen(x.prefill)
    if (x.prefill !== '') {
      setInput(x.prefill)
    }
  }
  const [turns, setTurns] = useState<Turn[]>([])
  const [busy, setBusy] = useState(false)
  const [secs, setSecs] = useState(0)
  const opened = useRef(false)
  const threadEl = useRef<HTMLDivElement | null>(null)
  const taEl = useRef<HTMLTextAreaElement | null>(null)
  const stick = useRef(true)
  const coarse = useRef(false)
  const [me, setMe] = useState<ChatMe>({ loggedIn: false, profile: null })

  useEffect(function detectCoarse() {
    makeCoarseEffect({ coarse })()
  }, [])

  useEffect(function firstLoadMe() {
    makeLoadMe({ setMe })()
  }, [])

  useEffect(function focusOnOpen() {
    if (x.autoFocus === false) {
      return
    }
    makeAutofocusEffect({ taEl })()
  }, [x.autoFocus])

  useEffect(function tickWhileBusy() {
    if (busy === false) {
      return
    }
    return makeSecsTickEffect({ setSecs })()
  }, [busy])

  useEffect(function followBottom() {
    makeStickEffect({ threadEl, stick })()
  }, [turns, busy])

  const send = useSend({
    turns,
    busy,
    lang,
    t,
    setTurns,
    setInput,
    setSecs,
    setBusy,
    stick,
    taEl,
    refreshMe: makeLoadMe({ setMe }),
  })
  const thread = threadOf({ turns })

  return {
    p: {
      t,
      input,
      setInput,
      turns,
      busy,
      secs,
      empty: turns.length === 0,
      examples: pickExamples({ loggedIn: me.loggedIn, profile: me.profile, t }),
      memories: profileMemories({ loggedIn: me.loggedIn, profile: me.profile, t }),
      me,
      thCopied,
      thread,
      focusInput: useFocusInput({ taEl }),
      send,
      onToggleSteps: makeStepsToggle({ setTurns }),
      onScroll: useThreadScroll({ stick }),
      onKeyDown: useComposerKey({ coarse, input, send }),
      onChange: makeComposerChange({ setInput }),
      onFocus: useComposerFocus({ opened }),
      onCopyThread: makeCopyThread({ thread, setThCopied }),
    },
    threadEl,
    taEl,
  }
}

/**
 * 挂件壳整机:开合(可见性单一真相 = open)、避让测量、拖拽缩放、看门狗与轻提示。
 * 壳只管开合与避让,一句文案都不生成。
 *
 * @returns 挂件面板:状态 + 手柄,两枚 DOM 引用另交(ref 不进面板对象,见 LauncherOut)。
 */
// eslint-disable-next-line local/function-length -- 一台机器不拆:开合/避让/拖拽/看门狗共用同批 ref 与 state;体内只剩 state 与工厂装配
export function useChatLauncher(): LauncherOut {
  const [, , t] = useLang()
  const rawPath = usePathname()
  let path = PATH_ROOT
  if (rawPath != null && rawPath !== '') {
    path = rawPath
  }
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [hint, setHint] = useState(false)
  const [force, setForce] = useState(false)
  const [max, setMax] = useState(false)
  const [clear, setClear] = useState(DOCK_GAP)
  const [box, setBox] = useState<Box | null>(null)
  const [wide, setWide] = useState(false)
  const [resetN, setResetN] = useState(0)
  const [askReset, setAskReset] = useState(false)
  const [prefill, setPrefill] = useState(TEXT_NONE)
  const [dockPos, setDockPos] = useState<DockPos | null>(null)
  const panelEl = useRef<HTMLDivElement | null>(null)
  const dockEl = useRef<HTMLDivElement | null>(null)
  const lastBox = useRef<Box | null>(null)
  const dragged = useRef(false)

  const show = makeShow({ setMounted, setOpen, setHint })
  const hide = makeHide({ setOpen })

  const [openSeen, setOpenSeen] = useState(open)
  if (open !== openSeen) {
    setOpenSeen(open)
    if (open === false) {
      setAskReset(false)
      setForce(false)
    }
  }

  const noDodge = open || dockPos != null || hasBottomBarOf({ path }) === false
  const [noDodgeSeen, setNoDodgeSeen] = useState(noDodge)
  if (noDodge !== noDodgeSeen) {
    setNoDodgeSeen(noDodge)
    if (noDodge) {
      setClear(DOCK_GAP)
    }
  }

  useEffect(function readPrefs() {
    return makeMountPrefsEffect({ setMax, setBox, lastBox, setDockPos, setWide })()
  }, [])

  useEffect(function listenOpenEvt() {
    return makeOpenEvtEffect({ setPrefill, show })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- show 是纯工厂装配、行为恒定:重挂监听只会重复 add/remove
  }, [])

  useEffect(function reclampDock() {
    return makeDockResizeEffect({ setDockPos })()
  }, [])

  useEffect(function reclampBox() {
    if (wide === false) {
      return
    }
    return makeBoxResizeEffect({ setBox })()
  }, [wide])

  useEffect(function syncPopover() {
    makePopoverEffect({ panelEl, open })()
  }, [open])

  useEffect(function watchdog() {
    if (open === false) {
      return
    }
    return makeWatchdogEffect({ panelEl, setForce, setOpen })()
  }, [open])

  useEffect(function escToClose() {
    if (open === false) {
      return
    }
    return makeEscEffect({ hide })()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hide 是纯工厂装配、行为恒定,依赖 open 已足够
  }, [open])

  useEffect(function dodgeBottomBar() {
    if (open || dockPos != null || hasBottomBarOf({ path }) === false) {
      return
    }
    return makeDodgeEffect({ dockEl, setClear })()
  }, [path, open, hint, dockPos])

  useEffect(function hintOnce() {
    if (open) {
      return
    }
    return makeHintEffect({ setHint })()
  }, [path, open])

  useEffect(function autoCancelAsk() {
    if (askReset === false) {
      return
    }
    return makeAskResetTimer({ setAskReset })()
  }, [askReset])

  let boxedBox: Box | null = null
  if (wide && max === false) {
    boxedBox = box
  }
  const gripDownOf = useGripDownOf({ panelEl, lastBox, setBox })

  return {
    p: {
      t,
      open,
      mounted,
      hint,
      max,
      wide,
      askReset,
      resetN,
      prefill,
      dockPos,
      panelStyle: panelStyleOf({ clear, force, box: boxedBox }),
      dockStyle: dockStyleOf({ dockPos, clear }),
      show,
      hide,
      minimize: makeMinimize({ setOpen }),
      toggleMax: makeToggleMax({ setMax }),
      onResetClick: makeResetStep({ askReset, doReset: makeDoReset({ setResetN, setAskReset }), setAskReset }),
      onDockDown: useDockDown({ dockEl, dragged, setDockPos }),
      onDockClick: useDockClick({ dragged, show }),
      onHeadDown: useHeadDown({ wide, max, gripDownOf }),
      gripDownOf,
    },
    panelEl,
    dockEl,
  }
}

/**
 * 造发话手柄(新一轮或重试):POST /api/consult/chat,流式(SSE)与 JSON 两条路。
 * 流式:轨迹逐条、正文按句、撤回清屏不留半段(服务端撤回的理由恰是「这一稿要被
 * 换掉」);终局一律走 finishTurn。JSON:引导码渲助手气泡并把光标还回输入框,
 * 认得的故障码原样用、认不得的落 net(busy 走 JSON 是真会发生的:纯联邦问句
 * 没有「认出职业」那一格,流压根没开)。
 * 2026-08-29 自 functions 的 makeSend 改名迁入(收 stick/taEl 两枚 ref);
 * 真身 sendNow 与两条分支是纯件,仍住 ./functions。
 *
 * @param x 本轮状态与全部落格。
 * @returns 发话手柄。
 */
export function useSend(x: UseSendIn): (s: SendIn) => void {
  return function send(s: SendIn): void {
    void sendNow(x, s)
  }
}

/**
 * 造聚焦输入框的手柄:把光标还回输入框(「自己说」那枚选项按下时用)。
 * 2026-08-29 摘 ref 那批新立 —— 输入框引用不再挂在面板对象上,面板改带这枚手柄,
 * 判空口径原样搬自 functions 的 makeSelf 体内那两行。
 *
 * @param x 输入框引用。
 * @returns 聚焦手柄。
 */
export function useFocusInput(x: {
  /**
   * 输入框 DOM 引用。
   */
  taEl: React.RefObject<HTMLTextAreaElement | null>
}): () => void {
  return function focusInput(): void {
    if (x.taEl.current != null) {
      x.taEl.current.focus()
    }
  }
}

/**
 * 造历史区的滚动手柄:离底不足 STICK_SLACK 算贴底,新内容来了跟着滚 ——
 * 用户往回翻看旧答复时别把他甩到底。
 * 2026-08-29 自 functions 的 makeThreadScroll 改名迁入(收 stick 一枚 ref)。
 *
 * @param x 贴底引用。
 * @returns 滚动手柄。
 */
export function useThreadScroll(x: {
  /**
   * 贴底引用。
   */
  stick: MutBool
}): (e: ThreadScrollEvent) => void {
  return function onScroll(e: ThreadScrollEvent): void {
    const el = e.currentTarget
    x.stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_SLACK
  }
}

/**
 * 造输入框键盘手柄:Enter 发送 / Shift+Enter 换行(IME 组合中不发);
 * 触屏上 Enter 是换行不是发送(手机上写三句话被 Enter 截断很恼人),
 * ⌘/Ctrl+Enter 仍强制发送。
 * 2026-08-29 自 functions 的 makeComposerKey 改名迁入(收 coarse 一枚 ref,
 * 且 send 本身是闭包了 taEl 的手柄)。
 *
 * @param x 触屏引用、现输入与发话手柄。
 * @returns 键盘手柄。
 */
export function useComposerKey(x: {
  /**
   * 触屏引用。
   */
  coarse: MutBool

  /**
   * 输入框现值。
   */
  input: string

  /**
   * 发话手柄。
   */
  send: (s: SendIn) => void
}): (e: ComposerKeyEvent) => void {
  return function onKeyDown(e: ComposerKeyEvent): void {
    if (e.key !== KEY_ENTER) {
      return
    }
    if (e.nativeEvent.isComposing === true) {
      return
    }
    if (e.shiftKey) {
      return
    }
    if (x.coarse.current === false || e.metaKey || e.ctrlKey) {
      e.preventDefault()
      x.send({ q: x.input, at: null })
    }
  }
}

/**
 * 造输入框首次聚焦手柄:chat-open 只打第一次(每次点回输入框都算会把口径撑爆)。
 * 2026-08-29 自 functions 的 makeComposerFocus 改名迁入(收 opened 一枚 ref)。
 *
 * @param x 已打过的引用。
 * @returns 聚焦手柄。
 */
export function useComposerFocus(x: {
  /**
   * 已打过 chat-open 的引用。
   */
  opened: MutBool
}): () => void {
  return function onFocus(): void {
    if (x.opened.current) {
      return
    }
    x.opened.current = true
    track(EV_OPEN)
  }
}

/**
 * 造启动器的点击手柄:拖完松手的那一下 click 要压掉,不然拖完必弹面板。
 * 2026-08-29 自 functions 的 makeDockClick 改名迁入(收 dragged 一枚 ref)。
 *
 * @param x 拖动判定引用与打开手柄。
 * @returns 点击手柄。
 */
export function useDockClick(x: {
  /**
   * 这一轮指针是拖动。
   */
  dragged: MutBool

  /**
   * 打开面板。
   */
  show: () => void
}): () => void {
  return function dockClick(): void {
    if (x.dragged.current) {
      x.dragged.current = false
      return
    }
    x.show()
  }
}

/**
 * 造启动器拖动的按下手柄(2026-08-06 Frank「图标可自由拖动到任意位置,防挡内容」):
 * 位移超过 DRAG_SLOP 才算拖;监听挂 window(指针拖出钮外也要跟得住);
 * 松手落盘 localStorage(隐私模式:这次生效,下次不记得)。
 * 2026-08-29 自 functions 的 makeDockDown 改名迁入(收 dockEl/dragged 两枚 ref)。
 *
 * @param x 启动器引用、拖动判定引用与位置落格。
 * @returns 按下手柄。
 */
export function useDockDown(x: {
  /**
   * 启动器 DOM 引用。
   */
  dockEl: React.RefObject<HTMLDivElement | null>

  /**
   * 这一轮指针是拖动(松手后压掉那次 click)。
   */
  dragged: MutBool

  /**
   * 位置落格。
   */
  setDockPos: (v: DockPos) => void
}): (e: React.PointerEvent) => void {
  return function dockDown(e: React.PointerEvent): void {
    if (e.pointerType === POINTER_MOUSE && e.button !== 0) {
      return
    }
    const d = x.dockEl.current
    if (d == null) {
      return
    }
    const r = d.getBoundingClientRect()
    const s = { px: e.clientX, py: e.clientY, x: r.left, y: r.top }
    x.dragged.current = false
    let last: DockPos | null = null
    function onMove(ev: PointerEvent): void {
      const dx = ev.clientX - s.px
      const dy = ev.clientY - s.py
      if (x.dragged.current === false && Math.hypot(dx, dy) < DRAG_SLOP) {
        return
      }
      x.dragged.current = true
      last = clampDockOf({ p: { x: s.x + dx, y: s.y + dy }, w: DOCK_BTN, h: DOCK_BTN })
      x.setDockPos(last)
    }
    function onUp(): void {
      window.removeEventListener(EVT_POINTERMOVE, onMove)
      window.removeEventListener(EVT_POINTERUP, onUp)
      window.removeEventListener(EVT_POINTERCANCEL, onUp)
      document.body.style.userSelect = TEXT_NONE
      if (last == null) {
        return
      }
      try {
        localStorage.setItem(DOCK_LS_KEY, JSON.stringify(last))
      } catch {
        ignoreNetErr()
      }
      track(EV_W_DOCK_DRAG)
    }
    document.body.style.userSelect = SELECT_NONE
    window.addEventListener(EVT_POINTERMOVE, onMove)
    window.addEventListener(EVT_POINTERUP, onUp)
    window.addEventListener(EVT_POINTERCANCEL, onUp)
  }
}

/**
 * 造缩放/拖动把手的按下手柄工厂:dir='move' 抓标题栏整体拖,其余按方向拉边
 * (拉左/上边时对边钉住:撞到最小值后左沿不许再走,否则面板被「推着」横向漂移 ——
 * 缩到底还在动是手感最糟的那种 resize)。每帧都过 clampBoxOf —— 钳制发生在
 * **过程中**不是松手时,否则拖出视口再回弹会闪。监听挂 window 不挂元素:
 * 指针拖出面板外(缩放时必然会)也要跟得住。
 * 2026-08-29 自 functions 的 makeGripDownOf 改名迁入(收 panelEl/lastBox 两枚 ref);
 * 下一帧框的纯几何 grabbedBoxOf 留在 functions。
 *
 * @param x 面板引用、最新框引用与框落格。
 * @returns 按方向造按下手柄的工厂。
 */
export function useGripDownOf(x: {
  /**
   * 面板 DOM 引用。
   */
  panelEl: React.RefObject<HTMLDivElement | null>

  /**
   * 拖拽过程中的最新框(pointerup 时落盘,不靠 setState 回调)。
   */
  lastBox: MutBox

  /**
   * 框落格。
   */
  setBox: (v: Box) => void
}): (d: GrabDir) => (e: React.PointerEvent) => void {
  return function gripDownOf(d: GrabDir): (e: React.PointerEvent) => void {
    return function gripDown(e: React.PointerEvent): void {
      if (x.panelEl.current == null || e.button !== 0) {
        return
      }
      e.preventDefault()
      const r = x.panelEl.current.getBoundingClientRect()
      const s = { px: e.clientX, py: e.clientY, x: r.left, y: r.top, w: r.width, h: r.height }
      function onMove(ev: PointerEvent): void {
        const nb = clampBoxOf({ b: grabbedBoxOf({ s, d, dx: ev.clientX - s.px, dy: ev.clientY - s.py }) })
        x.lastBox.current = nb
        x.setBox(nb)
      }
      function onUp(): void {
        window.removeEventListener(EVT_POINTERMOVE, onMove)
        window.removeEventListener(EVT_POINTERUP, onUp)
        window.removeEventListener(EVT_POINTERCANCEL, onUp)
        document.body.style.userSelect = TEXT_NONE
        try {
          if (x.lastBox.current != null) {
            localStorage.setItem(BOX_LS_KEY, JSON.stringify(x.lastBox.current))
          }
        } catch {
          ignoreNetErr()
        }
        if (d === GRAB_MOVE) {
          track(EV_W_DRAG)
        } else {
          track(EV_W_RESIZE)
        }
      }
      document.body.style.userSelect = SELECT_NONE
      window.addEventListener(EVT_POINTERMOVE, onMove)
      window.addEventListener(EVT_POINTERUP, onUp)
      window.addEventListener(EVT_POINTERCANCEL, onUp)
    }
  }
}

/**
 * 造标题栏按下手柄:桌面非全屏 = 拖动把手;按在钮上时不拖(不然点「收起」会先
 * 被当成一次 0 像素的拖动)。
 * 2026-08-29 自 functions 的 makeHeadDown 改名迁入(gripDownOf 是闭包了 panelEl
 * 的把手工厂,渲染期交给普通函数同样会被判成读 ref)。
 *
 * @param x 桌面档、全屏档与把手工厂。
 * @returns 按下手柄。
 */
export function useHeadDown(x: {
  /**
   * 桌面档。
   */
  wide: boolean

  /**
   * 全屏档(没得拖)。
   */
  max: boolean

  /**
   * 把手工厂(dir 固定 move)。
   */
  gripDownOf: (d: GrabDir) => (e: React.PointerEvent) => void
}): (e: React.PointerEvent) => void {
  return function headDown(e: React.PointerEvent): void {
    if (x.wide === false || x.max) {
      return
    }
    const target = e.target as HTMLElement
    if (target.closest(BTN_SEL) != null) {
      return
    }
    x.gripDownOf(GRAB_MOVE)(e)
  }
}
