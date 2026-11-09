'use client'
/**
 * me 桶子桶 sub 的提醒表:频率格(不发 / 每天 / 每周;选「不发」即停用)。
 *
 * @author Frank
 * @time 2026-11-08 23:30:00
 */
import { Select } from '@/components/select'
import { PUSH_FREQS } from './constants'
import type { AlertRow } from './types'

/**
 * 频率格。
 *
 * @param r 表行。
 * @returns 下拉。
 */
export function AlertFreqCell(r: AlertRow) {
  return <Select value={r.freq} onChange={r.onFreq} opts={PUSH_FREQS} all={r.offText} labelOf={r.labelOf} />
}
