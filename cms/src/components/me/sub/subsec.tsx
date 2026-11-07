'use client'
/**
 * me 桶子桶 sub 的结构:一段一张分区卡(全站白卡 cardMd + 卡头 mcardHead;CLAUDE.md「页面与弹框正文一律分区卡」)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { CARD_HEAD_CLS, CARD_MD_CLS } from './constants'
import type { SubSecIn } from './types'

/**
 * 一张分区卡。
 *
 * @param props 卡头标题与卡内容。
 * @returns 白卡。
 */
export function SubSec({ title, children }: SubSecIn) {
  return (
    <section className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{title}</div>
      {children}
    </section>
  )
}
