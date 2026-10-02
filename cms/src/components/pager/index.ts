/**
 * pager 组件域的桶 —— 翻页行(2026-08-24 自 ui/Pager.tsx 迁入成域)。
 * 对应 lib 域:无(通用件)。
 *
 * 2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」「展开 20, 再展开 20, 再开其余, 收起」:加 FoldLine(清单展开 / 收起两只钮,全站唯一出口)与 useFold。
 * 同日加 usePagedFold(服务器按页取的清单:AIP 指定雇主卡、相似雇主卡)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
export { FoldLine } from './foldline'
export { useFold, usePagedFold } from './hooks'
export { MoreLine } from './moreline'
export { Pager } from './pager'
export type { FoldLineIn, MoreLineIn, PagerIn } from './types'
