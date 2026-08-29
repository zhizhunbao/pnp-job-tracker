'use client'
/**
 * 法务正文的一段:把三语文档里的支持邮箱占位记号换成可点的 mailto 链接。
 * 三语文案只写记号不写地址(换邮箱不必动三份文案),真地址由 supportEmailOf 取。
 * 2026-08-27 换装批自 Legal.tsx 拆出成件:原先切片判断写成三目(按下标比长度),
 * 现在切片由 functions 的 emailPartsOf 算好,本件只渲。
 *
 * @author Frank
 * @time 2026-08-27 23:08:05
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { emailPartsOf, mailtoOf, supportEmailOf } from './functions'
import type { LegalParagraphIn } from './types'
import css from './legal.module.css'

/**
 * 正文一段。
 *
 * @param props 段落原文(逐格注释见 LegalParagraphIn)。
 * @returns 一段。
 */
export function LegalParagraph({ text }: LegalParagraphIn) {
  const email = supportEmailOf()
  const parts = []
  for (const [k, part] of emailPartsOf({ text }).entries()) {
    parts.push(
      <span key={k}>
        {part.text}
        {part.email === true && (
          <LinkButton href={mailtoOf({ email })} className={cssOf(css.mail)}>{email}</LinkButton>
        )}
      </span>,
    )
  }
  return (
    <p className={css.p}>{parts}</p>
  )
}
