/**
 * legal 页面域的桶 —— 法务四页(/about、/legal/terms、/legal/privacy、
 * /legal/disclaimer)共用的同一块正文白卡,正文由 lib/legal 的三语文档喂进来。
 * 2026-08-26 自 app/(frontend)/legal/ 迁入(原文件头 @author Claude
 * @time 2026-08-26 19:28:00);2026-08-27 换装批整体重写成小写件形制:
 * 内联样式逐格迁 legal.module.css、切片与取值进 functions.ts、死值进 constants.ts、
 * props 契约进 types.ts。同批收壳件一刀:顶栏 / 页脚 / 整页外框(shell 域的 Frame)
 * 由四个 page.tsx 直接拼,Legal 只出白卡。
 * 域内件 LegalSection / LegalParagraph 不出桶(只有 Legal 一个对外面)。
 * 对应 lib 域:lib/legal。
 *
 * @author Frank
 * @time 2026-08-27 23:08:05
 */
export { Legal } from './legal'
