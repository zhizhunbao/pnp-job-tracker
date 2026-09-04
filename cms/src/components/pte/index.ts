/**
 * pte 页面域的桶 —— PTE Core 刷题这件事的全部视图与取数:题单页正文(Pte)、单题页正文(PteItem)、
 * 两页的取数(loadPteTypes / loadPteList / loadPteItem / loadPteComments,方案 A 注入连接池)与
 * SEO 头(PTE_META / pteListMetaOf / pteItemMetaOf)。
 * 2026-09-03 批二新立(Frank「上,四型先上,盒子 TTS,20 题」→ 设计稿 docs/design/PTE刷题-20260903.md);
 * 数据来自 etl/pte 的 pte-mart 步灌的 pte_types / pte_questions 两表,题下评论住 comments 表。
 * 对应 lib 域:无(取数住本桶 functions,形照 news;评论经 Payload REST)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
export { PTE_DEFAULT_TYPE, PTE_META } from './constants'
export {
  loadPteComments, loadPteItem, loadPteList, listOf, loadPteListTiers, loadPteNavRows, loadPteTypes, pteItemMetaOf,
  pteListMetaOf, typeAt,
} from './functions'
export { Pte } from './pte'
export { PteItem } from './pteitem'
export type { PteComment, PteItem as PteItemData, PteRow, PteType } from './types'
