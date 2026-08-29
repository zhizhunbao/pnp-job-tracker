/**
 * start 页面域的桶 —— /start 就业把脉首页:一块视图(Pulse)+ 页面门要用的服务端派生
 * (进程内缓存读写、两条字典取数、聚合组装、预选省)与那张 SSR 契约。
 * 行情主图与担保雇主卡片分别借自 components/stats 与 components/employers,不重造。
 * 2026-08-26 自 app/(frontend)/start/ 迁入(原文件头 @author Claude
 * @time 2026-08-26 19:28:00);2026-08-28 换装批整体重写成小写件形制:
 * Pulse.tsx(1018 行 / 7 顶层函数 / 18 台状态 / 93 处内联样式)拆成 30 个小件一件一文件、
 * 状态收进 hooks.ts、内联 <style> 与内联样式迁 start.module.css、
 * 服务端取数与派生下沉 functions.ts(方案 A:db 与 payload 由页面门注进来,
 * 本桶一个 `/server` 门都不 import,浏览器照样打包得动)。
 * 🔴 桶本身与 types/constants/functions 都**不带 `'use client'`**(老坑 6):
 * 服务端页面门与客户端视图共用这几张形状与派生函数。
 * 对应 lib 域:lib/stats、lib/employers、lib/jobs。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
export { Pulse } from './pulse'
export {
  cachedHomeOf, emptyDocs, emptyOccRows, emptyProvExtra, emptyQueryResult, emptySponsorRows, emptyText,
  homeCoreOf, homeStatsOf, loadCatOptions, loadOccOptions, nullProof, nullUser, provPresetOf, putHomeCache,
} from './functions'
export {
  DRAWS_LIMIT, HEADER_ACTIVE, NEWS_LIMIT, OG_BOLD, OG_BRAND_SIZE, OG_CHIP_GAP, OG_CHIP_RADIUS,
  OG_CHIP_SIZE, OG_CHIP_TOP, OG_DOMAIN_SIZE, OG_DOMAIN_TOP, OG_H, OG_TAGLINE_SIZE, OG_TAGLINE_TOP,
  OG_W, START_META,
} from './constants'
export type { HomeStats } from './types'
