// 路径规划域的**服务端**入口 —— 政策时间线取数,要连库,只能在服务端跑。
//
// 🔴 为什么和 `index.ts` 分开:`timeline` 走 `../db/sql` 取库里的政策事件,
//    而 `Timeline.tsx` 是 `'use client'`、只要行的形状(类型 import 会被编译期擦除,不进浏览器包)。
//    分界是**运行环境**,不是风格(lib/jobs 08-18 实撞:混一个桶 tsc 全绿,build 才炸)。

export { fetchTimeline } from './timeline'
export type { TlCadence, TlEvent } from './timeline'
