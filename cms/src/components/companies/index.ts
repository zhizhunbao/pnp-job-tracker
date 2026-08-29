/**
 * companies 页面域的桶 —— 公司这件事的全部视图:/companies/[slug] 整页正文(Company)、
 * 公司身体(CompanyBody,详情页与职位板公司弹框同源同一份数据)、公司弹框本体
 * (CompanyPanel,职位板/顾问弹框里的那一屏)、卡片内职位行(JobMiniRow,职位详情页
 * 的「相似职位」也用同一副皮)。
 * 2026-08-26 自 app/(frontend)/companies/[slug]/ 迁入(动态段拍平进域根,
 * 原文件头 @author Claude @time 2026-08-26 19:28:00);2026-08-27 换装批整体重写成
 * 小写件形制:内联样式逐格迁 companies.module.css、派生与手柄进 functions.ts、
 * 死值进 constants.ts、props 契约进 types.ts。同日 Frank 走查再收一刀:壳件拼装归
 * 页面门(Frank「组装只许在 (frontend) 页面门里」,样张 account)——顶栏与页脚由
 * page.tsx 直接拼,Company 只出正文;整页外框那层容器在旧页里逐字重复十余处,
 * 同日收拢成 shell 域的通用件 Frame(「有重复才抽公共」),本桶不留自己的外壳件。
 * 2026-08-28 拆域批把身体族(原 components/jobs/Company.tsx 的九个顶层函数)
 * 以重写姿势吸收进来:一件一文件全小写(粒度照 news),状态进 hooks.ts,
 * 原文件 git rm —— 公司这件事从此只有本桶一个家。
 * 对应 lib 域:lib/jobs(loadCompanyBySlug 一族;公司弹框走 /api/jobs/company)。
 *
 * @author Frank
 * @time 2026-08-27 02:10:00
 */
export { CompaniesJsonLd } from './companiesjsonld'
export { Company } from './company'
export { CompanyBody } from './companybody'
export { CompanyPanel } from './companypanel'
export { JobMiniRow } from './jobminirow'
