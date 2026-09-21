'use client'
/**
 * 基本信息卡「公司名称」那一格(2026-09-21 自 CompanyBasicCard 提出,那件超了行数上限):
 * 职位页 / 职位弹框里的公司信息卡递了点公司名的去处 —— 名字成公司页真链接(普通左键开公司弹框,Ctrl 点照常新开页),
 * 名字下面出库里存好的别名;公司弹框与公司页不递,照旧纯文字(别名在页眉副题)。没有公司页(slug 空)的也是纯文字。
 *
 * @author Frank
 * @time 2026-09-21 18:30:00
 */
import { CompanyLink } from './companylink'
import { LINK_CLS, TEXT_NONE, URL_COMPANY_HEAD } from './constants'
import { makeOpenCompany } from './functions'
import type { CompanyNameCellIn } from './types'
import css from './companies.module.css'

/**
 * 渲染公司名称那一格。
 *
 * @param props 公司档案、别名与点公司名的去处(逐格注释见 CompanyNameCellIn)。
 * @returns 公司名(链接或纯文字)+ 别名。
 */
export function CompanyNameCell({ company, alias, onOpenCompany }: CompanyNameCellIn) {
  return (
    <>
      {(onOpenCompany == null || company.slug === TEXT_NONE) && company.name}
      {onOpenCompany != null && company.slug !== TEXT_NONE && (
        <CompanyLink href={URL_COMPANY_HEAD + company.slug}
          newTab={false}
          onClick={makeOpenCompany({ peek: { slug: company.slug, name: company.name }, onOpenCompany })}
          className={LINK_CLS}>
          {company.name}
        </CompanyLink>
      )}
      {alias != null && alias !== TEXT_NONE && <span className={css.simAlias}>{alias}</span>}
    </>
  )
}
