'use client'
/**
 * 只读投递框宿主(2026-10-10 批 3「点已投行『打开』」,docs/design/我的/我的求职-20261009.md 1.6 / 2.6):摆在「我的」页门里,
 * 地址栏带 `?app=<投递行 id>` 就弹只读投递框 —— 我的投递「打开」、收件箱「打开这次投递」、邮件里的链接都走这一个口;
 * 换一条按投递行 id 整框重挂。
 *
 * @author Frank
 * @time 2026-10-10 23:50:00
 */
import { AppView } from './appview'
import { useAppHost } from './hooks'
import type { AppViewHostIn } from './types'

/**
 * 只读投递框宿主。
 *
 * @param props 取词函数。
 * @returns 地址栏带了投递行就是只读投递框,其余什么都不渲。
 */
export function AppViewHost({ t }: AppViewHostIn) {
  const h = useAppHost()
  if (h.id == null) {
    return null
  }
  return <AppView key={h.id} appId={h.id} t={t} onClose={h.onClose} />
}
