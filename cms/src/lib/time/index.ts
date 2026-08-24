/**
 * time 域的桶 —— 日期与时间的**唯一**显示口径(基建叶子)。
 * 2026-08-24 由单文件 lib/time.ts 升域(Frank「日期时间也需要一个单独的域」):
 * 收拢当场抓出三组重复 —— 32 处裸 `slice(0, 10)` 裁日期(其中 Advisor.day /
 * Pulse.ymd 是两个同义本地小件)、四处裸 86400000 与两个各自的 MS_PER_DAY/DAY_MS
 * 常量、三处各自手算「几天前」。
 *
 * 口径:库里存 UTC ISO,绝对时间一律按渥太华时间渲染(不跟随访客本地时区,理由见 constants);
 * 解析失败退原串截断 —— 宁可显示得难看,不要显示 Invalid Date。
 *
 * @author Frank
 * @time 2026-08-24 12:00:00
 */
export { DAY_MS, TZ } from './constants'
export { daysSince, fmtLocal, fmtLocalSec, ymd } from './functions'
export type { DaysSinceIn } from './types'
