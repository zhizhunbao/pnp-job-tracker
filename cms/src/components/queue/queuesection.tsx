'use client'
/**
 * /queue 的一张分区白卡(CLAUDE.md「页面与弹框正文一律分区卡」):全站白卡 cardMd + 卡头 mcardHead(标题 + 灰字计数),
 * 下面一张表。形照「我的求职」的 Section(myjobs 桶),本域自写一份 —— 域之间不互取件。
 *
 * @author Frank
 * @time 2026-11-05 23:30:00
 */
import { CARD_HEAD_CLS, CARD_MD_CLS, CLS_SEP } from './constants'
import type { QueueSectionIn } from './types'
import css from './queue.module.css'

/**
 * 一张分区白卡。
 *
 * @param props 标题、计数与卡内容。
 * @returns 白卡。
 */
export function QueueSection({ title, count, children }: QueueSectionIn) {
  return (
    <section className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS + CLS_SEP + css.secHead}>
        {title}
        <span className={css.secN}>{count}</span>
      </div>
      <div className={css.sec}>{children}</div>
    </section>
  )
}
