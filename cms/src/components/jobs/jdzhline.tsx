'use client'
/**
 * 域内小件:一行原文底下贴着的对照译文(蓝条 + 深蓝字,与资讯页对照同规范)。
 * 译文由行号协议保证与原文行位对齐;这一行没有对照就整条不渲。
 * 2026-08-28 换装批自 Jd.tsx 的 JdFormattedView 体内那个 zh 闭包提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { TEXT_NONE } from './constants'
import type { JdZhLineIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染一行对照译文。
 *
 * @param props 译文;'' = 不渲。
 * @returns 对照行。
 */
export function JdZhLine({ zh }: JdZhLineIn) {
  if (zh === TEXT_NONE) {
    return null
  }
  return (
    <div className={cssOf(css.zh)}>{zh}</div>
  )
}
