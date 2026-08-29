'use client'
/**
 * 域内小件:依据链判定药丸里的那枚图标(符合=对勾 / 提示=警示 / 不符合=叉 / 不适用=一个点)。
 * 2026-08-28 换装批自 Pnp.tsx 的 VERDICT_ICON 表改写成件 —— 原表的 color 一格全站零消费者
 * (色由药丸的类给),随之退役。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { IconCheck, IconWarn, IconX } from '@/components/icons'
import { DOT_MARK, TONE_FAIL, TONE_PASS, TONE_WARN } from './constants'
import type { VerdictIconIn } from './types'

/**
 * 渲染判定图标。
 *
 * @param props 判定档。
 * @returns 图标;不适用档给一个点。
 */
export function VerdictIcon({ tone }: VerdictIconIn) {
  if (tone === TONE_PASS) {
    return <IconCheck />
  }
  if (tone === TONE_WARN) {
    return <IconWarn />
  }
  if (tone === TONE_FAIL) {
    return <IconX />
  }
  return <>{DOT_MARK}</>
}
