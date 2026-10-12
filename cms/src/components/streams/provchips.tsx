'use client'
/**
 * 域内小件:省份分区卡 —— 卡头左「省份」、右灰字通道总数,下面九省胶囊各带这省的通道条数(一次看一省;字用界面语言全名,
 * 手机胶囊例外保留中文短名)。「通道」「申请步骤」两页共用。
 * 2026-10-11 申请步骤分区筛选批 1 起「申请步骤」页套分区卡(Frank「省份也加 section」);
 * 2026-10-12 Frank「全部省份 去掉吧」「这个加上通道数」「加一个通道总数」:「全部省份」撤,两页同一张卡,条数由 pnp 桶按省数
 * (usePnpProvCounts;整表没到时只出省名、总数不出)。
 *
 * @author Frank
 * @time 2026-09-30 21:46:44
 */
import { Chip } from '@/components/chip'
import { CARD_HEAD_CLS, CARD_MD_CLS, K_PROV_HEAD, K_PROV_TOTAL, PROV_KEY_HEAD, STREAM_PROVS } from './constants'
import { provChipTextOf, provTotalOf } from './functions'
import type { ProvChipsIn } from './types'
import css from './streams.module.css'

/**
 * 渲染省份卡。
 *
 * @param props 取词函数、当前省份、逐省手柄与各省条数。
 * @returns 分区卡。
 */
export function ProvChips({ t, prov, provPickOf, counts }: ProvChipsIn) {
  const chips = []
  for (const code of STREAM_PROVS) {
    chips.push(
      <Chip key={code} onClick={provPickOf(code)} active={prov === code}>
        {provChipTextOf({ name: t(PROV_KEY_HEAD + code), code, counts })}
      </Chip>,
    )
  }
  const total = provTotalOf(counts)
  return (
    <div className={CARD_MD_CLS}>
      <div className={css.cardHeadRow}>
        <span className={CARD_HEAD_CLS}>{t(K_PROV_HEAD)}</span>
        {total > 0 && <span className={css.cardHeadSub}>{t(K_PROV_TOTAL, { n: total })}</span>}
      </div>
      <div className={css.cardChips}>{chips}</div>
    </div>
  )
}
