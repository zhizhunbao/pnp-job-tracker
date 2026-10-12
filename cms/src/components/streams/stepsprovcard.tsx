'use client'
/**
 * 域内小件:「申请步骤」页的省份分区卡 ——「全部省份」+ 九省胶囊(2026-10-11 申请步骤分区筛选批 1;Frank「省份也加 section」
 * 「省份 可能 不需要选」)。胶囊字用界面语言全名(手机胶囊例外,保留中文短名),同「通道」页的省份胶囊行。
 *
 * @author Frank
 * @time 2026-10-11 23:30:00
 */
import { Chip } from '@/components/chip'
import { CARD_HEAD_CLS, CARD_MD_CLS, K_ALL_PROV, K_PROV_HEAD, PROV_ALL, PROV_KEY_HEAD, STREAM_PROVS } from './constants'
import type { StepsCardIn } from './types'
import css from './streams.module.css'

/**
 * 渲染省份卡。
 *
 * @param props 整机面板。
 * @returns 分区卡。
 */
export function StepsProvCard({ p }: StepsCardIn) {
  const chips = [
    <Chip key={PROV_ALL} onClick={p.provPickOf(PROV_ALL)} active={p.prov === PROV_ALL}>{p.t(K_ALL_PROV)}</Chip>,
  ]
  for (const code of STREAM_PROVS) {
    chips.push(
      <Chip key={code} onClick={p.provPickOf(code)} active={p.prov === code}>{p.t(PROV_KEY_HEAD + code)}</Chip>,
    )
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{p.t(K_PROV_HEAD)}</div>
      <div className={css.cardChips}>{chips}</div>
    </div>
  )
}
