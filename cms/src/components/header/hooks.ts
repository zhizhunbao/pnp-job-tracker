'use client'
/**
 * header 域的状态机器:账户三态、桌面 hover 下拉、抽屉推主页面。
 *
 * @author Frank
 * @time 2026-08-24 08:00:00
 */
import { useEffect, useRef, useState } from 'react'

import { useSsrSession } from '@/components/auth'
import {
  ACCT_IN,
  ACCT_LOADING,
  ACCT_OUT,
  API_ME,
  CRED_INCLUDE,
  HOVER_CLOSE_MS,
  OVERFLOW_LOCK,
  PUSH_RESET_MS,
  PUSH_TRANSITION,
  PUSH_X,
  SEL_MAIN,
  STYLE_RESET,
} from './constants'
import { emptyUser, meToAcct } from './functions'
import type { AcctHookIn, AcctPhase, AcctState, HoverOut, MeJson } from './types'

/**
 * 账户三态整机(2026-07-19 Frank「我的账户模块应该是登录之后才显示」上提到 header 级)。
 * 首帧登录态**由服务端给**(2026-08-17「点击切换的时候会先伸缩一下」:其余 20 页原本
 * 只能等 /api/users/me,那一下账户区从 32px 撑到 84px,导航整排被拽 52px;localStorage
 * 记上次结果治不了 —— 浏览器先照 SSR 的 HTML 画一帧)。优先级:宿主 prop(/jobs 有
 * 真身份)> 服务端票据(SessionProvider)> loading(不在 Provider 下的存量路径)。
 *
 * @param x 宿主已知的登录态与账户区。
 * @returns 账户状态。
 */
export function useAcct(x: AcctHookIn): AcctState {
  const ssr = useSsrSession()

  function init(): AcctState {
    let phase: AcctPhase = ACCT_LOADING
    if (x.loggedIn != null) {
      phase = ACCT_OUT
      if (x.loggedIn) {
        phase = ACCT_IN
      }
    } else if (ssr != null) {
      phase = ACCT_OUT
      if (ssr) {
        phase = ACCT_IN
      }
    }
    return { state: phase, u: emptyUser() }
  }

  const [acct, setAcct] = useState<AcctState>(init)

  useEffect(function fetchMe() {
    if (x.loggedIn != null || x.hasAccountArea) {
      return
    }

    function readJson(r: Response): Promise<MeJson> {
      return r.json()
    }

    function markOut(a: AcctState): AcctState {
      return { state: ACCT_OUT, u: a.u }
    }

    function applyMe(d: MeJson) {
      const next = meToAcct(d)
      if (next.state === ACCT_IN) {
        setAcct(next)
        return
      }
      setAcct(markOut)
    }

    function onFail() {
      setAcct(markOut)
    }

    fetch(API_ME, { credentials: CRED_INCLUDE }).then(readJson).then(applyMe).catch(onFail)
  }, [x.loggedIn, x.hasAccountArea])

  return acct
}

/**
 * 桌面 hover 下拉整机(E8-07 E 统一交互):hover 即开、离开 150ms 延时关(斜着移进
 * 面板不闪关)、键盘 focus 可开、点击切换(触屏兜底)、焦点移出整块关。
 *
 * @returns 机器面板(开合与四枚手柄)。
 */
export function useHoverOpen(): HoverOut {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clear() {
    if (timer.current != null) {
      clearTimeout(timer.current)
    }
  }

  function close() {
    setOpen(false)
  }

  function enter() {
    clear()
    setOpen(true)
  }

  function leave() {
    clear()
    timer.current = setTimeout(close, HOVER_CLOSE_MS)
  }

  function toggle() {
    setOpen(open === false)
  }

  function onBlur(e: React.FocusEvent<HTMLElement>) {
    // relatedTarget 是 DOM 的宽类型,contains 要 Node —— 跨边界断言收在这一行。
    const next = e.relatedTarget as Node
    if (e.currentTarget.contains(next) === false) {
      setOpen(false)
    }
  }

  useEffect(function bind() {
    return clear
  }, [])

  return { open, enter, leave, toggle, onBlur }
}

/**
 * 抽屉推主页面(2026-08-09 Frank「点击的时候要有一个推动主页面的动画」):
 * 挂载 = main 右移抽屉同宽(push 而非 overlay),卸载 = 回弹(transition 留到动画
 * 放完再摘);overflow-x 同时按住 —— main 右移出视口的部分会把横向滚动条顶出来。
 *
 * @returns 无。
 */
export function useMainPush() {
  useEffect(function push() {
    const m = document.querySelector(SEL_MAIN)
    const prevBody = document.body.style.overflowX
    const prevHtml = document.documentElement.style.overflowX
    document.body.style.overflowX = OVERFLOW_LOCK
    document.documentElement.style.overflowX = OVERFLOW_LOCK
    if (m != null) {
      m.style.transition = PUSH_TRANSITION

      function slide() {
        if (m != null) {
          m.style.transform = PUSH_X
        }
      }

      requestAnimationFrame(slide)
    }

    function off() {
      document.body.style.overflowX = prevBody
      document.documentElement.style.overflowX = prevHtml
      if (m != null) {
        m.style.transform = STYLE_RESET

        function reset() {
          if (m != null) {
            m.style.transition = STYLE_RESET
          }
        }

        setTimeout(reset, PUSH_RESET_MS)
      }
    }
    return off
  }, [])
}
