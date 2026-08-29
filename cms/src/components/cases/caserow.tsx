'use client'
/**
 * 索引页的一行:处境标签 + 「完整案例」钮(08-11 Frank 连拍四刀后的终态:
 * 一行一条不折叠;做了事实层的才有钮 —— 答不了就不假装能答)。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { caseHrefOf, caseLabelKeyOf, makeTrackIndex } from './functions'
import type { CaseRowIn } from './types'
import css from './cases.module.css'

/**
 * 索引页一行。
 *
 * @param props 案例编号、slug 与取词函数(见 CaseRowIn 逐格注释)。
 * @returns 一行。
 */
export function CaseRow({ id, page, t }: CaseRowIn) {
  return (
    <div className={css.row}>
      <span className={css.rowLabel}>{t(caseLabelKeyOf({ id }))}</span>
      {page !== '' && (
        <LinkButton href={caseHrefOf({ page })} onClick={makeTrackIndex({ id })} className={cssOf(css.rowBtn)}>
          {t('dp.caseAnswer')}
        </LinkButton>
      )}
    </div>
  )
}
