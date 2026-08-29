'use client'
/**
 * plan 域的结构:估分卡下半段 —— 该省近几轮的官方抽选线。
 * 边界(2026-08-16 Frank「虽然在一个 section,但是也应该有一个明显的边界吧」):
 * 上半是**你要动手的**(结论 + 估分题),下半是**不用动手的参照**(官方抽选线)。
 * 动作在前、参照在后;一条实线加一个小标题,不靠留白硬分。
 * 手机 = 卡片行,桌面 = 表格(与页尾抽选表同款二选一渲染):两份都在 DOM 里,
 * 由媒体查询选出一份。
 * 2026-08-28 换装批第二段自 ScoreLineCard.tsx 的抽选线两块提出成件。
 *
 * @author Frank
 * @time 2026-08-28 02:15:00
 */
import { Table } from '@/components/table'
import { ScoreLineDrawRow } from './scorelinedrawrow'
import { makeLineGapCell } from './makelinegapcell'
import { makeLineStreamCell } from './makelinestreamcell'
import { lineColsOf, lineRowKey } from './functions'
import type { LineDraw, ScoreLineDrawsIn } from './types'
import css from './plan.module.css'

/**
 * 渲染官方抽选线那一段。
 *
 * @param props 取词函数、界面语、这个省的估分与要摆的那几轮。
 * @returns 抽选线段。
 */
export function ScoreLineDraws({ t, lang, score, list }: ScoreLineDrawsIn) {
  const cards = []
  let i = 0
  for (const draw of list) {
    cards.push(
      <ScoreLineDrawRow key={lineRowKey(draw, i)} t={t} lang={lang} score={score} draw={draw} />,
    )
    i += 1
  }
  return (
    <>
      <div className={css.lineDrawsHead}>
        <div className={css.lineDrawsTitle}>{t('sl.drawsTitle')}</div>
      </div>
      <div className={css.lineCards}>{cards}</div>
      <div className={css.lineTbl}>
        <Table<LineDraw> rows={list} rowKey={lineRowKey} bare
          cols={lineColsOf({
            t,
            score,
            streamCell: makeLineStreamCell({ lang }),
            gapCell: makeLineGapCell({ score }),
          })} />
      </div>
    </>
  )
}
