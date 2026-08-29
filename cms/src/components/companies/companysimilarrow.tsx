'use client'
/**
 * 相似雇主的一行:公司名蓝链 + 右侧灰字(担保档名 + 在招数)。
 * 档色与列表「通道」列同源色阶 —— 🔴 未评/无记录给浅灰,不给负判定的暗示。
 * 2026-08-28 拆域批自 jobs/Company.tsx 的 similar.map 体重写成件。
 *
 * style 白名单:担保档色是数据算出来的运行时值,不是静态样式。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { cssOf } from '@/components/css'
import { CompanyLink } from './companylink'
import { CLS_SEP, KEY_SP_TIER_HEAD, LINK_CLS, URL_COMPANY_HEAD } from './constants'
import { chColorOf } from './functions'
import type { CompanySimilarRowIn } from './types'
import css from './companies.module.css'

/**
 * 相似雇主一行。
 *
 * @param props 这一家、取词函数与新开页(逐格注释见 CompanySimilarRowIn)。
 * @returns 一行。
 */
export function CompanySimilarRow({ employer, t, newTab }: CompanySimilarRowIn) {
  return (
    <div className={css.simRow}>
      <CompanyLink href={URL_COMPANY_HEAD + employer.slug}
        newTab={newTab}
        className={cssOf(css.simName) + CLS_SEP + LINK_CLS}>
        {employer.name}
      </CompanyLink>
      <span className={css.simMeta}>
        {employer.sponsorGrade != null && (
          // eslint-disable-next-line react/forbid-dom-props -- 担保档色由 chColorOf 按档位算出,是运行时值
          <span style={{ color: chColorOf({ grade: employer.sponsorGrade }) }}>
            {t(KEY_SP_TIER_HEAD + String(employer.sponsorGrade))}
          </span>
        )}
        {employer.openCount > 0 && (
          <span className={css.simOpen}>{t('co.openJobs')} {employer.openCount}</span>
        )}
      </span>
    </div>
  )
}
