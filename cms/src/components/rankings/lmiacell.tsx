'use client'
/**
 * 公司榜表格「LMIA 获批职位(近两年)」列的单元格:青绿粗体的获批数,下面挂一行
 * 最近获批季度的灰注。#21(第 17 轮):这是公司榜的第一排序键,上榜要看得见。
 * 🔴 季度灰行只在获批数**有值**时出:单挂一个季度而没有它注解的那个数,读不出在说什么
 * (卡片上有键名撑着,表格没有)—— 这一条判定在洗展示行时就做完了。
 * 2026-08-28 换装批自 Ranking.tsx 的公司榜列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 12:49:56
 */
import { TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { RankCompanyCellRow } from './types'
import css from './rankings.module.css'

/**
 * 渲染公司榜「LMIA 获批职位」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 获批数(带季度灰行),没有记录时是灰色横杠。
 */
export function LmiaCell(r: RankCompanyCellRow) {
  return (
    <>
      <DashText v={r.lmia} />
      {r.lmiaSubText !== TEXT_NONE && <div className={css.quarter}>{r.lmiaSubText}</div>}
    </>
  )
}
