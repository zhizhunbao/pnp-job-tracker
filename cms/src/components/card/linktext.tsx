'use client'
/**
 * card 域的可点文本小件:三形态 —— 纯文本(不传 href/onClick)、链接、
 * 拦截成弹框的链接。target 传了就新开页并自动补 rel="noreferrer"。
 * 2026-08-24 自 ui/Card.tsx 拆出(一个 tsx 一个组件;域内自用,不出桶)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import type { LinkTextIn } from './types'
import css from './card.module.css'

/**
 * 可点文本;不可点时渲 span。
 *
 * @param props 文本数据与底类。
 * @returns 文本或链接。
 */
export function LinkText({ v, className }: LinkTextIn) {
  const clickable = v.href != null || v.onClick != null
  if (clickable === false) {
    return <span title={v.title} className={className}>{v.text}</span>
  }
  if (v.target != null) {
    return (
      <a href={v.href}
        title={v.title}
        onClick={v.onClick}
        target={v.target}
        rel="noreferrer"
        className={`${className} ${css.link}`}>{v.text}</a>
    )
  }
  return (
    <a href={v.href} title={v.title} onClick={v.onClick} className={`${className} ${css.link}`}>{v.text}</a>
  )
}
