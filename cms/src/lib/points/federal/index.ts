/**
 * points 域的子桶 federal 的桶门 —— 联邦两套表(CRS 与联邦技工 67 分)共用的部分:联邦区间解析、学历档、needsInfoOf / pickEduRow / sumPoints。
 * 2026-11-12 Frank「加拿大有各种打分机制,都要分好」:points 的 functions / constants / types 三个文件都超 1000 行,
 * 参考 LlamaIndex(core 加每个机制一个同形目录)按打分机制拆目录;纯搬家,逻辑一字未改。
 * 依赖口子(points 首例,同日 Frank 定):federal、provinces/mb 可以取 core,federal/crs、federal/fsw 可以取 federal
 * 与 core,同层不互取;types 与 constants 不 import,别的目录的形状要用就本目录自抄一份。
 * 门里只有转发。
 *
 * @author Frank
 * @time 2026-11-12 13:30:00
 */

export type { CrsProfile, EeGridRow, EstimateItem, EstimateResult } from './types'
export { estimateCrs } from './crs'
export { estimateFsw67 } from './fsw'
