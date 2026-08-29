'use client'
/**
 * 域内小件:「怎么投」一节的正文行。#125(Frank「重复」):整节文本直接渲成官方原帖链接 ——
 * 一处内容一处链接,不再额外附按钮行(与底部合规来源行重复);「Click Here」类废句
 * 自身变成可点出口。dd24-#110:抽到投递邮箱的先出一行人话邮箱。
 * 2026-08-28 换装批自 Jd.tsx 的 JdFormattedView 体内提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { ARROW_LINK, TARGET_BLANK, TEXT_NONE } from './constants'
import { jdStripDash } from './functions'
import type { JdApplyLinesIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染「怎么投」的正文行。
 *
 * @param props 这一节的行、官方原帖链接与投递邮箱。
 * @returns 邮箱行 + 逐行链官方原帖。
 */
export function JdApplyLines({ pairs, applyUrl, applyEmail }: JdApplyLinesIn) {
  const items = []
  let i = 0
  for (const p of pairs) {
    items.push(
      <div key={i} className={cssOf(css.indent)}>
        <LinkButton href={applyUrl} target={TARGET_BLANK} className={cssOf(css.jdLink)}>
          {jdStripDash(p.en)}{ARROW_LINK}
        </LinkButton>
      </div>,
    )
    i = i + 1
  }
  return (
    <>
      {applyEmail !== TEXT_NONE && (
        <div className={`${cssOf(css.indent)} ${cssOf(css.indentWrap)}`}>{applyEmail}</div>
      )}
      {items}
    </>
  )
}
