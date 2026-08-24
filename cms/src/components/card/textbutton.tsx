'use client'
/**
 * card 域的可点文本钮 TextButton(2026-08-24 Frank「能点的都应该叫 button」,
 * 原名 TextButton):三形态 —— 纯文本(不传 href/onClick 时渲 span,空态兜底)、
 * 链接、拦截成弹框的链接;可点分支经 button 族的 LinkButton。
 * 自 ui/Card.tsx 拆出(一个 tsx 一个组件;域内自用,不出桶)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { LinkButton } from '@/components/button'
import type { TextButtonIn } from './types'
import css from './card.module.css'

/**
 * 可点文本钮;不可点时渲 span。
 *
 * @param props 文本数据与底类。
 * @returns 文本或链接。
 */
export function TextButton({ v, className }: TextButtonIn) {
  const clickable = v.href != null || v.onClick != null
  if (clickable === false) {
    return <span title={v.title} className={className}>{v.text}</span>
  }
  return (
    <LinkButton href={v.href}
      title={v.title}
      onClick={v.onClick}
      target={v.target}
      className={`${className} ${css.link}`}>
      {v.text}
    </LinkButton>
  )
}
