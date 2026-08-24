/**
 * time 组件域的纯函数:按档取值与类名预算。
 * 口径本身归 lib/time —— 这里只挑用哪一个。
 *
 * @author Frank
 * @time 2026-08-24 13:00:00
 */
import { fmtLocal, fmtLocalSec, ymd } from '@/lib/time'
import { EMPTY_MARK } from './constants'
import type { TimeGrain, TimeTextValueIn, TimeTone } from './types'
import css from './time.module.css'

/**
 * 按显示档取文本(date 纯日期 / minute 到分 / second 到秒);
 * 没值给空值符 —— 调用点不必先判。
 *
 * @param x ISO 串与显示档。
 * @returns 显示文本。
 */
export function textOf(x: TimeTextValueIn): string {
  if (x.iso == null || x.iso === '') {
    return EMPTY_MARK
  }
  const byGrain: Record<TimeGrain, string> = {
    date: ymd(x.iso),
    minute: fmtLocal(x.iso),
    second: fmtLocalSec(x.iso),
  }
  return byGrain[x.grain]
}

/**
 * 字色档 → 类名。
 *
 * @param tone 字色档。
 * @returns 拼好的 className。
 */
export function toneClsOf(tone: TimeTone): string {
  const byTone: Record<TimeTone, string> = {
    dim: `${css.time} ${css.dim}`,
    normal: `${css.time} ${css.normal}`,
  }
  return byTone[tone]
}
