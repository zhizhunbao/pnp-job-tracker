'use client'
/**
 * ESDC 三档工资表卡(Frank 2026-07-26「换算成年薪,同时显示,多一列」):
 * 三档 × 时薪 + 折算年薪两列。首行是表头,整行走注格样式 ——
 * 同一列在不同行里角色不同,所以角色类**按格写**不按列位派。
 * 2026-08-28 换装批自 Advisor.tsx 的薪资分支重写成件。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { Grid } from '@/components/grid'
import { makeT } from '@/lib/i18n'
import {
  GRID_COLS_3, GRID_K_CLS, GRID_N_CLS, GRID_V_CLS, HEAD_KEY_BLANK, HEAD_KEY_HR, HEAD_KEY_YR, KEY_TAIL_HR,
  KEY_TAIL_K, KEY_TAIL_YR,
} from './constants'
import { FactsBox } from './factsbox'
import { esdcRowsOf } from './functions'
import type { AdvisorFactsIn } from './types'

/**
 * 渲染 ESDC 三档工资表卡。
 *
 * @param props 取数包。
 * @returns 三列网格。
 */
export function EsdcWages({ f }: AdvisorFactsIn) {
  const t = makeT(f.lang)
  const cells = [
    <span key={HEAD_KEY_BLANK} className={GRID_N_CLS} />,
    <span key={HEAD_KEY_HR} className={GRID_N_CLS}>{t('sal.hrCol')}</span>,
    <span key={HEAD_KEY_YR} className={GRID_N_CLS}>{t('col.salaryYr')}</span>,
  ]
  for (const r of esdcRowsOf({ t, job: f.job })) {
    cells.push(<span key={r.key + KEY_TAIL_K} className={GRID_K_CLS}>{r.label}</span>)
    cells.push(<span key={r.key + KEY_TAIL_HR} className={GRID_V_CLS}>{r.hr}</span>)
    cells.push(<span key={r.key + KEY_TAIL_YR} className={GRID_V_CLS}>{r.yr}</span>)
  }
  return <FactsBox><Grid cols={GRID_COLS_3}>{cells}</Grid></FactsBox>
}
