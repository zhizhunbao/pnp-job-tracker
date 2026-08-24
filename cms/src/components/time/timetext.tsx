'use client'
/**
 * time 域的时间戳文本:三档粒度(纯日期/到分/到秒)× 两档字色。
 * 值的口径归 lib/time(绝对时间按渥太华时间渲染);空值给「—」,调用点不必先判。
 *
 * ⚠️ suppressHydrationWarning:服务端与浏览器算同一串(时区锁死在 lib/time),
 * 本不该有差异 —— 但职位板早年实测过 SSR/CSR 边界的偶发不一致,那张膏药随
 * 调用点搬进来收在这一处,别再散写。
 *
 * @author Frank
 * @time 2026-08-24 13:00:00
 */
import { textOf, toneClsOf } from './functions'
import type { TimeTextIn } from './types'

/**
 * 时间戳文本。
 *
 * @param props ISO 串/粒度/字色档。
 * @returns 文本。
 */
export function TimeText({ iso, grain = 'date', tone = 'dim' }: TimeTextIn) {
  return (
    <span className={toneClsOf(tone)} suppressHydrationWarning>{textOf({ iso, grain })}</span>
  )
}
