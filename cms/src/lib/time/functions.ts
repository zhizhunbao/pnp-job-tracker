/**
 * time 域的纯函数:时间显示口径。库里存 UTC ISO,绝对时间一律按**渥太华时间**渲染
 * (标识符 America/Toronto —— 同一个东部时区,理由见 constants 的 TZ);
 * 相对时间(几天前)按访客此刻算。解析失败退原串截断 —— 宁可显示得难看,
 * 不要显示 Invalid Date。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */
import { DAY_MS, ISO_LOCALE, ISO_T, MIDNIGHT_SUFFIX, MIN_LEN, SEC_LEN, SPACE, TZ, YMD_LEN } from './constants'
import type { DaysSinceIn } from './types'

/**
 * 到分(列表「更新时间」页脚等)。
 *
 * @param iso 库里的 UTC ISO 串。
 * @returns 渥太华时间 'YYYY-MM-DD HH:mm';解析不了退原串截断。
 */
export function fmtLocal(iso: string): string {
  try {
    return new Date(iso).toLocaleString(ISO_LOCALE, {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return cutFallback({ iso, len: MIN_LEN })
  }
}

/**
 * 同上但带秒(「最近看到」列要看到时分秒)。
 *
 * @param iso 库里的 UTC ISO 串。
 * @returns 渥太华时间 'YYYY-MM-DD HH:mm:ss';解析不了退原串截断。
 */
export function fmtLocalSec(iso: string): string {
  try {
    return new Date(iso).toLocaleString(ISO_LOCALE, {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return cutFallback({ iso, len: SEC_LEN })
  }
}

/**
 * 距今几天(职位「已挂 N 天」、抽选「距今 N 天」)。
 * 纯日期按**本地零点**解析:'2026-08-24' 直接 new Date 会按 UTC 零点算,
 * 在西五区差出一天 —— 这正是收拢前三处各自手写时踩过的坑。
 * 此刻由调用方传进来(纯函数不自己读时钟,测试才注得进固定值)。
 *
 * @param x 起点与此刻。
 * @returns 天数(≥0);算不了给 null。
 */
export function daysSince(x: DaysSinceIn): number | null {
  if (x.iso == null || x.iso === '') {
    return null
  }
  let text = x.iso
  if (text.includes(ISO_T) === false) {
    text = ymd(text) + MIDNIGHT_SUFFIX
  }
  const t = new Date(text).getTime()
  if (Number.isNaN(t)) {
    return null
  }
  return Math.max(0, Math.floor((x.now - t) / DAY_MS))
}

/**
 * 纯日期(全站显示日期的唯一口径):ISO 串裁到 'YYYY-MM-DD'。
 * 2026-08-24 立域时收拢 —— 此前是 32 处裸 slice(0, 10) 加 Advisor.day /
 * Pulse.ymd 两个同义本地小件。
 *
 * @param iso ISO 串;null/空串照样收(给空串,调用点不必先判)。
 * @returns 'YYYY-MM-DD';没值给空串。
 */
export function ymd(iso: string | null): string {
  if (iso == null) {
    return ''
  }
  return iso.slice(0, YMD_LEN)
}

/**
 * 退化路径:格式化不了就裁原串并把 ISO 的 T 换成空格。
 *
 * @param x 原串与裁到第几位。
 * @returns 截断后的串。
 */
function cutFallback(x: { iso: string; len: number }): string {
  if (x.iso === '') {
    return ''
  }
  return x.iso.slice(0, x.len).replace(ISO_T, SPACE)
}
