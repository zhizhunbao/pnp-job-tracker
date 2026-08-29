/**
 * advisor 域的桶 —— 字段顾问:点表格里的一格,开这一格背后的事实。
 * 装两个弹框 —— 按字段/按组装配事实块的 AdvisorModal,与投递前速览的 ActModal;
 * 外加内嵌在 JD 与公司弹框里的初判段 JdAdvisorSection。
 * 它答的问题是「这一格的事实从哪来、怎么摆」,不是「职位板怎么排」,所以自己成域。
 * 2026-08-28 自 components/jobs 拆域迁入(Advisor.tsx 一件原样搬);同日换装批把那一件
 * 按形制重写成 40 余个小件 + 六个抽屉,旧形整份退役。
 *
 * ⚠️ 过渡边(截至 2026-08-28 换装批的事实):
 * · 本域点 **components/jobs 的文件**不走桶 —— jobbody / jdtextview / nocdutiesview /
 *   renderai / functions(extractSug、fetchJobText)。走 jobs 桶会成环:jobs 的职位板
 *   (boardmodals)反过来要本桶的两个弹框,import/no-cycle 当场报错
 *   (先例:header/accountlite.tsx)。待 JD 身体自己成域(或职位板改懒加载本桶)后换桶。
 * · 本域点 **components/companies 的桶**(CompanyPanel)—— 那一域反过来只点本桶的
 *   `jdadvisorsection` 一个文件,不成环,所以这条边不必点文件。
 * 2026-08-28 换装批收入 JdAdvisorSection(Frank 拍板):内嵌初判段本来寄居在
 * components/jobs/Jd.tsx,可它答的是顾问的问题(这一岗/这家公司对我意味着什么),
 * 不是 JD 排版的问题 —— 三个消费点(职位详情的 AI 速读卡、公司弹框、本域完整弹框)
 * 一并改指本桶。
 * 对应 lib 域:lib/jobs、lib/pathways。
 *
 * @author Frank
 * @time 2026-08-28 16:26:43
 */
export { ActModal } from './actmodal'
export { AdvisorModal } from './advisormodal'
export { JdAdvisorSection } from './jdadvisorsection'
export type { JdAdvisorSectionIn } from './types'
