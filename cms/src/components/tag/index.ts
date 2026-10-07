/**
 * tag 组件域的桶 —— 状态标签(2026-08-24 自 ui/Tag.tsx 迁入成域)。
 * 对应 lib 域:无(通用件)。
 * 2026-10-05 加 TagRow:已选标签一行(定高一行、放不下横着滚;自 majors 桶已选专业那一行收来)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
export { Tag } from './tag'
export { TagFold } from './tagfold'
export { TagRow } from './tagrow'
export { tagClsOf } from './functions'
export type { TagFoldIn, TagIn, TagRowIn, TagVariant } from './types'
