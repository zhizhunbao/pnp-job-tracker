'use client'
/**
 * chat 域的状态机器:useChatBox 一台管对话面板(轮次/流式/示例/记忆/composer),
 * useChatLauncher 一台管挂件壳(开合/避让/拖拽缩放/看门狗/轻提示)。
 * 体内不留函数体:带口径的步骤全在 ./functions 的工厂里(注释即它们的 JSDoc),
 * 这里只剩 useState、具名 effect 壳与工厂装配(形制同 account 的 useAccountPage)。
 * 2026-08-27 换装批自 ChatBox/ChatLauncher 的组件体收进来。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/components/i18n'
import { DOCK_GAP, PATH_ROOT, TEXT_NONE } from './constants'
import {
  dockStyleOf, hasBottomBarOf, makeAskResetTimer, makeAutofocusEffect, makeBoxResizeEffect, makeCoarseEffect,
  makeComposerChange, makeComposerFocus, makeComposerKey, makeCopyThread, makeDockClick, makeDockDown,
  makeDockResizeEffect, makeDodgeEffect, makeDoReset, makeEscEffect, makeGripDownOf, makeHeadDown, makeHide,
  makeHintEffect, makeLoadMe, makeMinimize, makeMountPrefsEffect, makeOpenEvtEffect, makePopoverEffect,
  makeResetStep, makeSecsTickEffect, makeSend, makeShow, makeStepsToggle, makeStickEffect, makeThreadScroll,
  makeToggleMax, makeWatchdogEffect, panelStyleOf, pickExamples, profileMemories, threadOf} from './functions'
import type { Box, ChatBoxPanel, ChatMe, DockPos, LauncherPanel, Turn } from './types'

/**
 * 对话面板整机(C2 对话即产品):轮次表 + 流式落格 + 三态示例/记忆 + composer
 * 手柄。本机只管状态,一句结论都不生成 —— 结论、数字、判定全部来自服务端工具层
 * 并挂 evidence(总红线)。
 *
 * @param x 预填问句与展开聚焦档(挂件壳递进来)。
 * @returns 对话面板:状态 + 手柄。
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
}): ChatBoxPanel {
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

  const send = makeSend({
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
    threadEl,
    taEl,
    send,
    onToggleSteps: makeStepsToggle({ setTurns }),
    onScroll: makeThreadScroll({ stick }),
    onKeyDown: makeComposerKey({ coarse, input, send }),
    onChange: makeComposerChange({ setInput }),
    onFocus: makeComposerFocus({ opened }),
    onCopyThread: makeCopyThread({ thread, setThCopied }),
  }
}

/**
 * 挂件壳整机:开合(可见性单一真相 = open)、避让测量、拖拽缩放、看门狗与轻提示。
 * 壳只管开合与避让,一句文案都不生成。
 *
 * @returns 挂件面板:状态 + 手柄。
 */
// eslint-disable-next-line local/function-length -- 一台机器不拆:开合/避让/拖拽/看门狗共用同批 ref 与 state;体内只剩 state 与工厂装配
export function useChatLauncher(): LauncherPanel {
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
  const gripDownOf = makeGripDownOf({ panelEl, lastBox, setBox })

  return {
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
    panelEl,
    dockEl,
    show,
    hide,
    minimize: makeMinimize({ setOpen }),
    toggleMax: makeToggleMax({ setMax }),
    onResetClick: makeResetStep({ askReset, doReset: makeDoReset({ setResetN, setAskReset }), setAskReset }),
    onDockDown: makeDockDown({ dockEl, dragged, setDockPos }),
    onDockClick: makeDockClick({ dragged, show }),
    onHeadDown: makeHeadDown({ wide, max, gripDownOf }),
    gripDownOf,
  }
}
