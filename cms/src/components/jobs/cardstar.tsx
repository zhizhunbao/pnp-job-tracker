'use client'
/**
 * 域内小件:卡右上角的收藏星标(#52:收藏入口手机也要有 —— E9-01 闭环第一环;
 * 匿名点 = 注册框,与桌面同一逻辑)。#167⑩:胶囊都归卡底那排,右上角只留星标 ——
 * 它是按钮不是胶囊。
 * 外面那层壳只干一件事:**拦住冒泡** —— 整卡可点(#129「卡片本身点不进去」),
 * 星标是卡内交互,点它不该连带把人送进详情页;而钮本身走全站 Button,拿不到事件对象。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { BTN_GHOST } from './constants'
import { starClsOf, stopClick } from './functions'
import type { CardStarIn } from './types'

/**
 * 渲染收藏星标。
 *
 * @param props 无障碍名、星标字形、已收藏态与开关。
 * @returns 一颗星标。
 */
export function CardStar({ label, star, saved, onToggle }: CardStarIn) {
  return (
    <span onClick={stopClick}>
      <Button kind={BTN_GHOST} ariaLabel={label} onClick={onToggle} className={starClsOf(saved)}>{star}</Button>
    </span>
  )
}
