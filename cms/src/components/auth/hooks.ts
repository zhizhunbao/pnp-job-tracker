'use client'
/**
 * auth 域的状态机器:首帧会话上下文、OAuth 回跳失败提示、点外面关菜单。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
import { createContext, useContext, useEffect, useState } from 'react'
import { FLOW_ERR, FLOW_SENT, OAUTH_FAIL, OAUTH_PARAM } from './constants'
import { finishAuth, googleHrefOf, localeOf, runAuthFlow } from './functions'
import type { AuthFormHookIn, AuthFormHookOut, AuthMode, ClickOutsideIn } from './types'

/**
 * 首帧登录态上下文(照 LangProvider 先例,治 SSR 先猜后纠的抖动:二级页 SSR 恒渲
 * 32px 占位槽,水合后换成实宽 84px 会把导航整排拽 52px —— 唯一能让首帧就对的位置
 * 是服务端,值从 layout 的 ssrHasSession() 下来)。undefined = 不在 Provider 下。
 * 上下文对象是 react 的接缝件,住机器抽屉不住 variables(它不随运行变)。
 */
const SessionCtx = createContext<boolean | undefined>(undefined)

/**
 * SessionProvider 组件要用的上下文本体(域内取,不出桶)。
 *
 * @returns 上下文对象。
 */
export function sessionCtxOf() {
  return SessionCtx
}

/**
 * 首帧登录态。undefined = 不在 Provider 下(测试/存量路径)→ 调用方维持原 loading 占位。
 *
 * @returns 首帧是否已登录;undefined = 无从得知。
 */
export function useSsrSession(): boolean | undefined {
  return useContext(SessionCtx)
}

/**
 * Google 回跳失败提示(E11-03 遗留):?oauth=fail 落回登录框 → 触发一次 onFail,
 * 并把参数从 URL 摘除(刷新不复现)。
 *
 * @param onFail 失败提示回调(只在挂载时判一次)。
 * @returns 无。
 */
export function useOauthFail(onFail: () => void) {
  useEffect(function bind() {
    try {
      const u = new URL(window.location.href)
      if (u.searchParams.get(OAUTH_PARAM) === OAUTH_FAIL) {
        onFail()
        u.searchParams.delete(OAUTH_PARAM)
        let qs = ''
        if (u.searchParams.toString() !== '') {
          qs = '?' + u.searchParams.toString()
        }
        window.history.replaceState(null, '', u.pathname + qs + u.hash)
      }
    } catch {
      return
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在挂载时读一次 URL,依赖列表空是本意
  }, [])
}

/**
 * 登录/注册/找回/重置四态机整机:六格状态 + 全部手柄。提交流本体在 functions
 * (runAuthFlow 收三种收场),这里只做状态摆布;报错文案在机器里翻好交出去。
 *
 * @param x 完成回调与入口参数。
 * @returns 机器面板(状态六格 + 手柄六枚)。
 */
export function useAuthForm(x: AuthFormHookIn): AuthFormHookOut {
  const [mode, setMode] = useState<AuthMode>(x.init)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [sent, setSent] = useState(false)
  useOauthFail(oauthFailed)

  function oauthFailed() {
    setErr(x.t('acct.err.oauth'))
  }

  function switchMode(m: AuthMode) {
    setMode(m)
    setErr('')
  }

  function backFromSent() {
    setMode('login')
    setSent(false)
    setErr('')
  }

  function onEmail(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value)
  }

  function onPw(e: React.ChangeEvent<HTMLInputElement>) {
    setPw(e.target.value)
  }

  function goGoogle(e: React.MouseEvent) {
    e.preventDefault()
    window.location.href = googleHrefOf({ returnTo: x.returnTo })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const out = await runAuthFlow({ mode, email, pw, resetToken: x.resetToken, locale: localeOf() })
      if (out.kind === FLOW_SENT) {
        setSent(true)
        return
      }
      if (out.kind === FLOW_ERR) {
        if (out.errKey != null) {
          setErr(x.t(out.errKey))
        }
        return
      }
      setPw('')
      await finishAuth({ returnTo: x.returnTo, onDone: x.onDone })
    } catch {
      setErr(x.t('acct.err.generic'))
    } finally {
      setBusy(false)
    }
  }

  return { mode, email, pw, busy, err, sent, switchMode, backFromSent, onEmail, onPw, goGoogle, submit }
}

/**
 * 点外面关弹层:按下落在 ref 外面就调 close(键盘出口另有 Esc,两条各管各的 ——
 * 键盘用户没有「点外面」)。
 *
 * @param x 弹层根节点 ref、当前开合、关闭回调。
 * @returns 无。
 */
export function useClickOutside(x: ClickOutsideIn) {
  useEffect(function bind() {
    if (x.open === false) {
      return
    }
    function onDown(e: MouseEvent) {
      // DOM 事件目标是宽类型,contains 要 Node —— 跨边界断言收在这一行。
      const target = e.target as Node
      if (x.ref.current != null && x.ref.current.contains(target) === false) {
        x.close()
      }
    }
    document.addEventListener('mousedown', onDown)
    function off() {
      document.removeEventListener('mousedown', onDown)
    }
    return off
  }, [x.open, x.ref, x.close, x])
}
