/**
 * resources 页面域的桶 —— /resources 官方资料索引(一块视图 + 一块结构化数据)。
 * 2026-08-26 自 app/(frontend)/resources/ 迁入(原文件头 @author Claude
 * @time 2026-08-26 19:28:00);2026-08-28 换装批整体重写成小写件形制:内联样式逐格迁
 * resources.module.css、状态进 hooks.ts、派生与手柄进 functions.ts、死值进 constants.ts、
 * props 契约进 types.ts;壳件拼装归页面门(样张 companies),整页外框走 shell 域的通用件
 * Frame,本桶不留自己的外壳件。页面元信息两句挂在这里出门 —— 门里不许有死值常量。
 * 对应 lib 域:lib/official。
 *
 * @author Frank
 * @time 2026-08-28 12:39:03
 */
export { RES_META_DESC, RES_META_TITLE } from './constants'
export { Resources } from './resources'
export { resItemListJsonOf } from './functions'
