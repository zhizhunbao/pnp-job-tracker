'use client'
/**
 * ④ 第一步:零经验的人先要的是「谁肯带」—— 各省标了带训的在招岗数两列表。
 * 2026-10-09 N 批(Frank「职位名、公司名、地点同形」「城市 和 省份 点击 跳 google 地图」):省名格换 name 桶 ProvName ——
 * 英文全名蓝链在上(点了新标签开 Google 地图)、界面语省名灰字在下。
 *
 * @author Frank
 * @time 2026-08-27 01:30:00
 */
import { ProvName } from '@/components/name'
import { CELL_NUM_TAIL, CELL_PROV_TAIL } from './constants'
import { CaseLead } from './caselead'
import type { CaseFirstStepIn } from './types'
import css from './cases.module.css'

/**
 * 「第一步」卡。
 *
 * @param props 整份答案与取词函数(逐格注释见 CaseFirstStepIn)。
 * @returns 卡;一条带训岗都没有 = null。
 */
export function CaseFirstStep({ answer, t }: CaseFirstStepIn) {
  if (answer.trainable.length === 0) {
    return null
  }
  const cells = []
  for (const x of answer.trainable) {
    cells.push(
      <span key={x.province + CELL_PROV_TAIL} className={css.gridProv}><ProvName code={x.province} /></span>,
    )
    cells.push(<span key={x.province + CELL_NUM_TAIL} className={css.gridNum}>{x.n}</span>)
  }
  return (
    <div className={css.card}>
      <h2 className={css.h2}>{t('case.firstStepTitle')}</h2>
      <CaseLead lines={[t('case.firstStepOffer'), t('case.firstStepCount', { n: answer.trainableTotal })]} />
      <div className={css.grid}>{cells}</div>
    </div>
  )
}
