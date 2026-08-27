/**
 * companies 页面域的桶 —— /companies/[slug] 公司详情整页。
 * 2026-08-26 自 app/(frontend)/companies/[slug]/ 迁入(动态段拍平进域根);
 * 身体部分(CompanyBody)仍与职位板弹框同源,住 components/jobs。
 * 对应 lib 域:lib/jobs(loadCompanyBySlug 一族)。
 *
 * @author Claude
 * @time 2026-08-26 19:28:00
 */
export { default as Company } from './Company'
