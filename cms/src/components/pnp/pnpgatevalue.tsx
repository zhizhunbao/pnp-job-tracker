'use client'
/**
 * 域内小件:「本岗通道的门槛」卡一行的值格 —— 整格一枚 ghost 钮:左边摘要(一行一条,雇主 offer 那行下面灰字摆本岗),
 * 右边开合记号(同抽选组头的 ▾ / ▴);点开在下面露出官方原句(逐字英文)。
 * 2026-09-27 Frank 勾「门槛卡」「用本岗通道的门槛」。
 *
 * @author Frank
 * @time 2026-09-27 12:40:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { PLAIN_BTN_KIND, TEXT_NONE } from './constants'
import { caretOf } from './functions'
import type { PnpGateValueIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染门槛卡一行的值格。
 *
 * @param props 这一行、展开着没有与开合手柄。
 * @returns 值格。
 */
export function PnpGateValue({ row, open, onToggle }: PnpGateValueIn) {
  const lines = []
  for (const l of row.lines) {
    lines.push(<span key={l} className={css.gateLine}>{l}</span>)
  }
  const quotes = []
  for (const q of row.quotes) {
    quotes.push(<span key={q.key} className={css.gateQuote}>{q.text}</span>)
  }
  return (
    <>
      <Button kind={PLAIN_BTN_KIND} className={cssOf(css.gateBtn)} onClick={onToggle}>
        <span className={css.gateText}>
          {lines}
          {row.sub !== TEXT_NONE && <span className={css.gateSub}>{row.sub}</span>}
        </span>
        <span className={css.gateCaret}>{caretOf(open)}</span>
      </Button>
      {open && <span className={css.gateQuotes}>{quotes}</span>}
    </>
  )
}
