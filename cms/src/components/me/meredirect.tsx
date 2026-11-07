'use client'
/**
 * me 域的结构:没登录访问「我的」时跳去登录(全站登录入口只有一个:首页弹框,带回跳;替 account 桶 AccountRedirect)。
 *
 * @author Frank
 * @time 2026-11-07 17:00:00
 */
import { useEffect } from 'react'
import { loginLinkOf } from './functions'

/**
 * 跳登录。
 *
 * @returns 无界面。
 */
export function MeRedirect() {
  useEffect(function toLogin() {
    window.location.replace(loginLinkOf())
  }, [])
  return null
}
