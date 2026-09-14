'use client'
/**
 * 了解公司章行:政府机构章 + 知名章(可点跳维基)。公司详情页挂在正文顶(名下),
 * 公司弹框由 CompanyPanel 挂到按钮上面,所以身体里那份藏起来(hideTopInfo)。
 * 行业中文已删(Frank)。知名章可点跳维基是 Frank「有 wiki 把 wiki 加进来」,
 * 章形不是裸链(循 #106)。
 * 2026-08-28 拆域批自 jobs/Company.tsx 重写落位。
 * 2026-09-14 Frank「也去掉」:「知名企业 ↗」章撤(弹框基本信息卡同撤),只剩政府机构章。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { cssOf } from '@/components/css'
import { CLS_SEP } from './constants'
import { isGovCompany } from './functions'
import type { CompanyTopInfoIn } from './types'
import css from './companies.module.css'

/**
 * 章行。
 *
 * @param props 公司档案与取词函数(逐格注释见 CompanyTopInfoIn)。
 * @returns 章行;两个章都没有时整行不渲。
 */
export function CompanyTopInfo({ company, t }: CompanyTopInfoIn) {
  const gov = isGovCompany({ name: company.name })
  if (gov === false) {
    return null
  }
  return (
    <div className={css.badges}>
      {gov && <span className={cssOf(css.badge) + CLS_SEP + cssOf(css.badgeGov)}>{t('co.gov')}</span>}
    </div>
  )
}
