'use client'
/**
 * 相似雇主的一行:公司名蓝链 + 右侧灰字(担保档名 + 在招数)。
 * 档色与列表「通道」列同源色阶 —— 🔴 未评/无记录给浅灰,不给负判定的暗示。
 * 2026-08-28 拆域批自 jobs/Company.tsx 的 similar.map 体重写成件。
 *
 * style 白名单:担保档色是数据算出来的运行时值,不是静态样式。
 * 2026-09-14 Frank「相似雇主要加翻译」「这些相似雇主的中文名都加上懒加载翻译」:名下第二行出中 / 韩别名,
 * 库里没有的开框懒翻一次落库(useCompanyAlias)。
 * 2026-09-14 Frank「这些都删了」:行右的「近期办过 LMIA / 办过 LMIA」担保档字撤,只留在招数(档位仍是排序键)。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { cssOf } from '@/components/css'
import { CompanyLink } from './companylink'
import { CLS_SEP, LINK_CLS, TEXT_NONE, URL_COMPANY_HEAD } from './constants'
import { aliasOf } from './functions'
import { useCompanyAlias } from './hooks'
import type { CompanySimilarRowIn } from './types'
import css from './companies.module.css'

/**
 * 相似雇主一行。
 *
 * @param props 这一家、取词函数与新开页(逐格注释见 CompanySimilarRowIn)。
 * @returns 一行。
 */
export function CompanySimilarRow({ employer, t, lang, newTab }: CompanySimilarRowIn) {
  const alias = useCompanyAlias({
    name: employer.name, lang, cached: aliasOf({ lang, aliasZh: employer.aliasZh, aliasKo: employer.aliasKo }),
  }).alias
  return (
    <div className={css.simRow}>
      <CompanyLink href={URL_COMPANY_HEAD + employer.slug}
        newTab={newTab}
        className={cssOf(css.simName) + CLS_SEP + LINK_CLS}>
        {employer.name}
        {alias !== TEXT_NONE && <span className={css.simAlias}>{alias}</span>}
      </CompanyLink>
      <span className={css.simMeta}>
        {employer.openCount > 0 && (
          <span className={css.simOpen}>{t('co.openJobs')} {employer.openCount}</span>
        )}
      </span>
    </div>
  )
}
