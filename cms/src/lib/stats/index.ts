/**
 * 统计域的桶 —— **客户端也安全的那半**:大类 slug 表、省码省名、slug 映射与全部形状。
 * 门里只有转发(闸 door-forward-only)。
 *
 * 老坑 6:服务端组件从 'use client' 模块导入常量会拿到 undefined —— 共享常量必须住这种普通模块。
 * 2026-08-19 本域自 `app/(frontend)/stats/` 收编进 lib:那个目录根本没有 page.tsx,
 * 却被六个路由跨目录引用 —— 它从来就是个库,只是住在路由树里。
 * 2026-08-22 定型十件套:取数那半(要连库)在 `./server`,混一个桶会把连接池打进浏览器包
 * (tsc 全绿、build 才炸,08-18 实撞)。
 *
 * @author Frank
 * @time 2026-08-22 14:00:00
 */

export { BROAD_SLUGS, PROVS, PROV_NAME } from './constants'
export type { ChannelNocs, CityRow, OccRow, ProvExtra, ProvVol, ProvVolNum, SrcRow, StatRow } from './types'
