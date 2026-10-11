'use client'
/**
 * 「我的求职」的一张分区白卡(2026-10-10 批 2;10-09 Frank「每个 section 都有一个单独的框」,照职位页「相关职位」卡):
 * 全站白卡 cardMd + 卡头 mcardHead(标题 + 灰字计数),下面是卡内容。
 *
 * @author Frank
 * @time 2026-10-10 10:00:00
 */
import { CARD_HEAD_CLS, CARD_MD_CLS } from './constants'
import type { SectionIn } from './types'
import css from './myjobs.module.css'

/**
 * 一张分区白卡。
 *
 * @param props 标题、计数、锚点与内容。
 * @returns 白卡。
 */
export function Section({ title, count, anchor, children }: SectionIn) {
  return (
    <section className={CARD_MD_CLS} id={anchor}>
      <div className={CARD_HEAD_CLS}>
        {title}
        {count != null && <span className={css.secN}>{count}</span>}
      </div>
      <div className={css.sec}>{children}</div>
    </section>
  )
}
