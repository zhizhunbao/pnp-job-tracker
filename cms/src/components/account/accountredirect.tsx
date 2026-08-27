'use client'
/**
 * account 域的结构:未登录时把人送回首页的登录弹框 —— 不渲染任何东西,只做跳转。
 * 登录入口全站只有一个 = /jobs 顶栏弹框(Frank 定):未登录访问账户页 →
 * 跳回首页并带 `?login=1` 自动弹框,本站没有独立登录页。
 * 2026-08-26 自 app/(frontend)/account/page.tsx 的 RedirectToLogin 迁出
 * (页面「纯拼装门」改造批:默认导出之外的 JSX 一律下沉成组件),行为原样。
 *
 * @author Frank
 * @time 2026-08-26 20:30:20
 */
import { useEffect } from 'react'
import { LOGIN_URL } from './constants'

/**
 * 未登录跳转。
 *
 * @returns 不渲染任何节点(null)。
 */
export function AccountRedirect() {
  useEffect(function toLogin() {
    window.location.replace(LOGIN_URL)
  }, [])
  return null
}
