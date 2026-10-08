'use client'
/**
 * 域内哑单元格:付款记录的操作格 —— 「收据」开 Stripe 的收据页;没有收据画横杠。
 *
 * @author Frank
 * @time 2026-10-08 10:00:00
 */
import { Button } from '@/components/button'
import { DASH, RECEIPT_BTN_KIND, TARGET_BLANK, TEXT_NONE } from './constants'
import type { PayCellRow } from './types'

/**
 * 渲染操作格。
 *
 * @param r 展示行。
 * @returns 一颗钮或横杠。
 */
export function PayReceiptCell(r: PayCellRow) {
  if (r.receiptUrl === TEXT_NONE) {
    return <span>{DASH}</span>
  }
  return <Button kind={RECEIPT_BTN_KIND} sm href={r.receiptUrl} target={TARGET_BLANK}>{r.receiptText}</Button>
}
