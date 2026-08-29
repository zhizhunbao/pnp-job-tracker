/**
 * cases 页面域的桶 —— 常见案例索引(Cases)与处境详情(Case)两页的正文,
 * 加索引页 JSON-LD 的拼装(casesJsonLd;壳件 2026-08-29 收拢进通用桶 jsonld)。2026-08-26 自 app/(frontend)/cases/ 整体迁入,
 * 2026-08-29 CasesShell 退役(体是全站 Frame 的逐字克隆,违「通用形态单一出口」;
 * 640 断点 summary 触控靶挪挂 .grow),两页面门改拼 shell 桶的 Frame。
 * 2026-08-27 换装批整体重写成小写件形制;同批壳件拼装提回页面门
 * (Frank 新令「组装只许在 (frontend) 页面门里」),CaseRow/CasePath 等九个
 * 子件是域内件不出桶。对应 lib 域:lib/ruling(判定核与页面装配)。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
export { CASES_META } from './constants'
export { Case } from './case'
export { Cases } from './cases'
export { casesJsonLd } from './functions'
