// 通道域**要连库的那半**(2026-08-19 立这扇门)。
//
// 分界不是风格,是运行环境:`./index.ts` 是 13 条通道的策略清单,纯数据、浏览器也能跑,
// 而 `plan/pr/Decision.tsx` 是 `'use client'` 且取的是**值**(uiOf / regionProvincesOf)。
// 本文件这半 import 了 payload,混进那个桶就会把连接池整条链拉进浏览器包 ——
// tsc 全绿,build 才炸(lib/jobs 2026-08-18 实撞)。
//
// 眼下只有一件:RCIP/FCIP 的社区名额状态。

export { fetchPilotQuota } from './pilotQuota'
export type { PilotQuotaAgg, PilotQuotaCommunityRow } from './pilotQuota'
