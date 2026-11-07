'use client'
/**
 * me 桶子桶 resume 的结构:求职信的职位名(蓝字可点):草稿去投递框接着写(站内,走 next/link),发出去的新标签页开信的 PDF;
 * 职位删了的草稿没法继续,黑字不可点。表格职位格与手机清单共用。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { PLAIN_BTN_KIND, TARGET_BLANK, TEXT_NONE } from './constants'
import type { LetterTitleIn } from './types'
import css from './resume.module.css'

/**
 * 求职信的职位名。
 *
 * @param props 职位名、去处与草稿否。
 * @returns 链接或黑字。
 */
export function LetterTitle({ title, href, draft }: LetterTitleIn) {
  if (href === TEXT_NONE) {
    return <span className={cssOf(css.plain)}>{title}</span>
  }
  if (draft) {
    return <Button kind={PLAIN_BTN_KIND} className={cssOf(css.name)} href={href}>{title}</Button>
  }
  return <Button kind={PLAIN_BTN_KIND} className={cssOf(css.name)} href={href} target={TARGET_BLANK}>{title}</Button>
}
