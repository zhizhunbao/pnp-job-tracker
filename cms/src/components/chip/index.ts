/**
 * chip 组件域的桶 —— 筛选药丸(2026-08-24 自 ui/Chip.tsx 迁入成域)。
 * chipStyle 是过渡导出(spread 消费方还在,见 functions 头注),消费页类化后撤。
 * 对应 lib 域:无(通用件)。
 * 2026-10-04 加选择格 ChipTile(图标格 / 整宽大卡)与大号档(访客四题改版首例)。
 * 同日 A2 加大号胶囊的加载占位 ChipSkel(访客第 2 题热门专业、第 3 题按专业取的职业共用)。
 * 同日 A2 收口加大号胶囊一排 ChipRow(gate 与 quiz 各写一份的胶囊排并到这里)。
 * 2026-10-05 加一行选项 ChipLine(访客第 2 题照掌上高考:热门、展开的专业类、搜索结果一行一个)。
 * 同日撤 ChipSkel 与 ChipRow(访客第 3 题 Frank「也改成左右 两部分吗?」「改啊」:改成与第 2 题同一副左右两栏、行用 ChipLine,
 * 大号胶囊排与占位再没有消费者)。大号档(Chip 的 lg)本身照留:消费者也没了,但 chipClsOf 的入参形里 lg 一格还被 pnp 桶
 * sponsorleadcard 按 lg: false 写死在调用里(并行批次的区,本批不碰),等那边去掉这一格再连 .lg / .lgOn 一起删。
 * 同日收口:Chip 组件 props 的 lg 先撤(pnp 那处钉住的只是 chipClsOf 的入参 ChipClsIn.lg,不是组件 props);
 * 上一句「大号档(Chip 的 lg)本身照留」改成只留 chipClsOf 入参那一格与 .lg / .lgOn 两块样式。
 * 同日 ChipLine 多一格灰字小注 sub(访客第 3 题重名职业挂官方英文名)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
export { Chip } from './chip'
export { ChipLine } from './chipline'
export { ChipTile } from './chiptile'
export { chipClsOf, chipStyle } from './functions'
export type { ChipIn, ChipLineIn, ChipTileIn } from './types'
