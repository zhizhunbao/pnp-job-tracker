'use client'
/**
 * plan 域的结构:抽选线的一张手机卡。手机走卡片而不是表格 ——
 * 375 上四列会挤成两行,读的人分不清哪个数属于哪一列。
 * 2026-08-28 换装批第二段自 ScoreLineCard.tsx 的 slCards 行提出成件。
 *
 * @author Frank
 * @time 2026-08-28 02:15:00
 */
import { LineGapCell } from './linegapcell'
import { LineStreamText } from './linestreamtext'
import type { ScoreLineDrawRowIn } from './types'
import css from './plan.module.css'

/**
 * 渲染一轮抽选的手机卡。
 *
 * @param props 取词函数、界面语、这个省的估分与这一轮抽选。
 * @returns 一张卡。
 */
export function ScoreLineDrawRow({ t, lang, score, draw }: ScoreLineDrawRowIn) {
  return (
    <div className={css.lineRow}>
      <div className={css.lineRowHead}>
        <b className={css.lineRowName}><LineStreamText lang={lang} draw={draw} /></b>
        <span className={css.lineRowGap}><LineGapCell score={score} draw={draw} /></span>
      </div>
      <div className={css.lineRowMeta}>
        <span className={css.lineRowDate}>{draw.drawDate}</span>
        <span className={css.lineRowCut}>{t('sl.cutoffN', { n: draw.score })}</span>
      </div>
    </div>
  )
}
