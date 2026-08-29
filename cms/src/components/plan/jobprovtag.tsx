'use client'
/**
 * plan 域的小件:手机卡上的「本岗所在省」标(#325 补的那一行不冒充名次,靠这枚标说清它是谁)。
 * 它占的是职位卡的发布时间槽 —— 初评行没有发布时间,那一格正好摆身份标。
 * 2026-08-28 换装批自 Decision.tsx 的手机卡 date 槽提出成件。
 *
 * @author Frank
 * @time 2026-08-28 00:30:00
 */
import type { TagIn } from './types'
import css from './plan.module.css'

/**
 * 渲染一枚「本岗所在省」标。
 *
 * @param props 标上的字。
 * @returns 标。
 */
export function JobProvTag({ text }: TagIn) {
  return <span className={css.jobProvTagCard}>{text}</span>
}
