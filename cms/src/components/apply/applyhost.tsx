'use client'
/**
 * 投递框宿主(2026-10-09 A 批投递搬进弹框):挂在全站骨架上(与 GateSync 同一处),任何一页地址栏带 `?apply=<职位号>`
 * 就弹投递框 —— 职位页、职位弹框、收藏行、草稿「继续」、求职信卡「继续」、付完回跳、邮件链接都走这一个口(设计稿故事 1)。
 * 本体 ApplyWatch 读查询串用 useSearchParams,这里包一层 Suspense(静态渲染的页不因它整页退回客户端渲染)。
 *
 * @author Frank
 * @time 2026-10-09 01:40:00
 */
import { Suspense } from 'react'
import { ApplyWatch } from './applywatch'

/**
 * 投递框宿主。
 *
 * @returns 宿主本体(读查询串前什么都不渲)。
 */
export function ApplyHost() {
  return (
    <Suspense fallback={null}>
      <ApplyWatch />
    </Suspense>
  )
}
