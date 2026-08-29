'use client'
/**
 * 用户原话卡:原话一个字不改,套语言相称的引号(quotedOf)。「用户原话」那个标签
 * 2026-08-11 Frank 撤掉 —— 引号自己就说明了。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
import { quotedOf, caseQKeyOf } from './functions'
import type { CaseQuoteIn } from './types'
import css from './cases.module.css'

/**
 * 用户原话卡。
 *
 * @param props 语言、案例编号与取词函数(见 CaseQuoteIn 逐格注释)。
 * @returns 淡蓝底的原话卡。
 */
export function CaseQuote({ lang, caseId, t }: CaseQuoteIn) {
  return (
    <div className={`${css.card} ${css.quoteCard}`}>
      <div className={css.quoteText}>{quotedOf({ lang, text: t(caseQKeyOf({ id: caseId })) })}</div>
    </div>
  )
}
