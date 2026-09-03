'use client'
/**
 * header 域的状态机器:账户三态、桌面 hover 下拉、抽屉推主页面。
 *
 * @author Frank
 * @time 2026-08-24 08:00:00
 */
import { useEffect, useState } from 'react'

import { useSsrSession } from '@/components/auth'
import {
  ACCT_IN, ACCT_LOADING, ACCT_OUT, API_ME, CRED_INCLUDE, OVERFLOW_LOCK, PUSH_RESET_MS,
  PUSH_TRANSITION, PUSH_X, SEL_MAIN, STYLE_RESET,
} from './constants'
import { emptyUser, meToAcct, seedUser } from './functions'
import type { AcctHookIn, AcctPhase, AcctState, MeJson } from './types'

/**
 * 账户三态整机(2026-07-19 Frank「我的账户模块应该是登录之后才显示」上提到 header 级)。
 * 2026-08-29 种子升格:SSR 首帧连**身份四格**一起给(治「切换页面头像来回闪」——
 * 原先身份要等 /api/users/me,每次整页导航都先画占位点再换字母);种子带 email 就不再拉接口,
 * in=true 但 email 空(认人失败)保持登录占位并回落拉接口。
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
      if (ssr.in) {
        phase = ACCT_IN
      }
    }
    if (ssr != null && ssr.in && ssr.email !== '') {
      return { state: ACCT_IN, u: seedUser(ssr) }
    }
    return { state: phase, u: emptyUser() }
  }

  const [acct, setAcct] = useState<AcctState>(init)

  useEffect(function fetchMe() {
    if (x.loggedIn != null || x.hasAccountArea) {
      return
    }
    if (ssr != null && (ssr.in === false || ssr.email !== '')) {
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
  }, [x.loggedIn, x.hasAccountArea, ssr])

  return acct
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
