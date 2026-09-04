'use client'
/**
 * 域内小件:答题卡头(英文题型名 + 缩写灰注 | 「考过 (N)」钮 + 位置;下一行官方一句指令;
 * 准备倒计时 2026-09-04 撤 —— Frank「不要显示准备时间」,朗读改麦克风钮开录)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { instKeyOf } from './functions'
import type { PteAnswerPartIn } from './types'
import css from './pte.module.css'

/**
 * 渲染答题卡头。
 *
 * @param props 同答题卡。
 * @returns 头两三行。
 */
export function PteAnswerHead({ t, q, type, pos, seen }: PteAnswerPartIn) {
  return (
    <>
      <div className={css.qHead}>
        <div>
          {type.nameEn}
          <span className={css.code}>{q.type}</span>
        </div>
        <div className={css.headRight}>
          {seen}
          <span className={css.pos}>{pos}</span>
        </div>
      </div>
      <div className={css.inst}>{t(instKeyOf({ type: q.type }))}</div>
    </>
  )
}
