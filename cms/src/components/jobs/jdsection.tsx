'use client'
/**
 * 整理版的一节:小标题 + 按档渲的正文。六档的判据在 functions 的 jdSecModeOf
 * (「怎么投」三档、薪资兜底、整节缺、有内容)。
 * 2026-08-28 换装批自 Jd.tsx 的 JdFormattedView 体内提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { SEC_MODE, TARGET_BLANK, TEXT_NONE } from './constants'
import { JdApplyLines } from './jdapplylines'
import { JdSecLines } from './jdseclines'
import type { JdSectionIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染整理版的一节。
 *
 * @param props 这一节的展示行。
 * @returns 一节。
 */
export function JdSection({ sec }: JdSectionIn) {
  return (
    <div className={cssOf(css.sec)}>
      {sec.head !== TEXT_NONE && <div className={cssOf(css.secHead)}>{sec.head}</div>}
      {sec.mode === SEC_MODE.applyEmail && (
        <div className={`${cssOf(css.indent)} ${cssOf(css.indentWrap)}`}>{sec.applyEmail}</div>
      )}
      {sec.mode === SEC_MODE.applyLink && (
        <div className={cssOf(css.indent)}>
          <LinkButton href={sec.applyUrl} target={TARGET_BLANK} className={cssOf(css.jdLink)}>
            {sec.officialText}
          </LinkButton>
        </div>
      )}
      {sec.mode === SEC_MODE.applyLines && (
        <JdApplyLines pairs={sec.pairs} applyUrl={sec.applyUrl} applyEmail={sec.applyEmail} />
      )}
      {sec.mode === SEC_MODE.payFallback && <div className={cssOf(css.indent)}>{sec.payFallback}</div>}
      {sec.mode === SEC_MODE.none && (
        <div className={`${cssOf(css.indent)} ${cssOf(css.indentNone)}`}>{sec.noneText}</div>
      )}
      {sec.mode === SEC_MODE.lines && (
        <>
          {sec.payFallback !== TEXT_NONE && <div className={cssOf(css.indent)}>{sec.payFallback}</div>}
          <JdSecLines pairs={sec.pairs} bullets={sec.bullets} />
        </>
      )}
    </div>
  )
}
