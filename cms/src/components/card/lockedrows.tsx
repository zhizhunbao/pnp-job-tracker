'use client'
/**
 * card 域的打码锁区(G3 起):行数 = 真实剩余条数(数字真、纹理假 —— 真内容
 * 服务端不下发,渲染的是固定占位假词糊掉)。行数 ≥ OVERLAY_MIN 时 ProCard 悬浮正中,
 * 不足则卡放码尾(卡不许盖住超过一半的码,Frank 拍)。
 * 2026-08-24 自 ui/Card.tsx 拆出(一个 tsx 一个组件)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { BLUR_FILL, OVERLAY_MIN } from './constants'
import { ProCard } from './procard'
import type { LockedRowsIn } from './types'
import css from './card.module.css'

/**
 * 打码锁区;剩余 0 条时整块不渲染。
 *
 * @param props 行数与升级卡三件。
 * @returns 锁区,或 null(不渲染)。
 */
export function LockedRows({ n, text, cta, onClick }: LockedRowsIn) {
  if (n <= 0) {
    return null
  }
  const overlay = n >= OVERLAY_MIN
  const rows = []
  for (let i = 0; i < n; i = i + 1) {
    rows.push(
      <div key={i} aria-hidden className={css.lockRow}>{BLUR_FILL[i % BLUR_FILL.length]}</div>,
    )
  }
  return (
    <div className={css.lockRows}>
      {rows}
      <ProCard text={text} cta={cta} onClick={onClick} overlay={overlay} />
    </div>
  )
}
