'use client'
/**
 * 抓取的 JD 正文 → Job Bank 原版式(2026-07-06 用户拍板「按人家的格式」):大节头加粗放大、
 * 子节头加粗,内容行缩进纯文本;源头自带的圆点剥掉(否则双圆点);全部展开不做内层滚动
 * (弹窗整体滚)。断行与分档的全部口径在 functions 的 jdLinesOf / jdLineViewOf。
 * 2026-08-28 换装批自 Jd.tsx 重写落位。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { JD_MAX_LEN } from './constants'
import { jdLineViewOf, jdLinesOf } from './functions'
import { JdLine } from './jdline'
import type { JdTextViewIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染原文保真轨。
 *
 * @param props 抓到的正文与截断长度。
 * @returns 逐行渲好的正文。
 */
export function JdTextView({ text, max = JD_MAX_LEN }: JdTextViewIn) {
  const lines = []
  let i = 0
  for (const l of jdLinesOf({ text, max })) {
    lines.push(<JdLine key={i} view={jdLineViewOf(l)} />)
    i = i + 1
  }
  return (
    <div className={cssOf(css.raw)}>{lines}</div>
  )
}
