/**
 * cases 页面域的桶 —— 常见案例索引(Cases)与处境详情(Case)两页的正文,
 * 加两页共用的外框(CasesShell)。2026-08-26 自 app/(frontend)/cases/ 整体迁入,
 * 2026-08-27 换装批整体重写成小写件形制;同批壳件拼装提回页面门
 * (Frank 新令「组装只许在 (frontend) 页面门里」),CaseRow/CasePath 等九个
 * 子件是域内件不出桶。对应 lib 域:lib/ruling(判定核与页面装配)。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
export { Case } from './case'
export { Cases } from './cases'
export { CasesShell } from './casesshell'
