'use client'
/**
 * 域内小件:分类分区卡 —— 卡头「分类」,下面本省各分类胶囊带条数(各省官方分类;魁北克按项目;联邦工作 / 投资创业 / 家庭团聚 / 难民);
 * 默认不选 = 全部,点一类只看这一类,再点取消。本省不分组(只有一类或官方平铺)时不出卡。「申请门槛」「申请通道」两页共用,
 * 形照省份卡 ProvChips。2026-10-12 Frank「省份 下面加一个 分类 section 筛选」「比如常用的 PEQ」。
 *
 * @author Frank
 * @time 2026-10-13 00:40:00
 */
import { Chip } from '@/components/chip'
import { CARD_HEAD_CLS, CARD_MD_CLS, GROUP_CHIPS_MIN, K_GROUP_HEAD } from './constants'
import { groupChipTextOf } from './functions'
import type { GroupChipsIn } from './types'
import css from './streams.module.css'

/**
 * 渲染分类卡。
 *
 * @param props 取词函数、本省分类胶囊、当前分类与逐类手柄。
 * @returns 分区卡;不到两类不出。
 */
export function GroupChips({ t, chips, group, groupPickOf }: GroupChipsIn) {
  if (chips.length < GROUP_CHIPS_MIN) {
    return null
  }
  const items = []
  for (const c of chips) {
    items.push(
      <Chip key={c.key} onClick={groupPickOf(c.key)} active={group === c.key}>
        {groupChipTextOf(c)}
      </Chip>,
    )
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={css.cardHeadRow}>
        <span className={CARD_HEAD_CLS}>{t(K_GROUP_HEAD)}</span>
      </div>
      <div className={css.cardChips}>{items}</div>
    </div>
  )
}
