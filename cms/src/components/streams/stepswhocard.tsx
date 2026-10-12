'use client'
/**
 * 域内小件:「申请步骤」页的身份分区卡 —— 六枚身份胶囊单选(再点已选的取消),选了卡头右侧出「清空」
 * (2026-10-11 申请步骤分区筛选批 1;Frank「分开的 section 省份 身份 学历 工作经历」)。
 *
 * @author Frank
 * @time 2026-10-11 23:30:00
 */
import { Button } from '@/components/button'
import { Chip } from '@/components/chip'
import { BTN_GHOST, CARD_MD_CLS, FIT_WHOS, K_CLEAR, K_WHO_HEAD, TEXT_NONE, WHO_KEY_HEAD } from './constants'
import type { StepsCardIn } from './types'
import css from './streams.module.css'

/**
 * 渲染身份卡。
 *
 * @param props 整机面板。
 * @returns 分区卡。
 */
export function StepsWhoCard({ p }: StepsCardIn) {
  const chips = []
  for (const who of FIT_WHOS) {
    chips.push(<Chip key={who} onClick={p.whoPickOf(who)} active={p.s.who === who}>{p.t(WHO_KEY_HEAD + who)}</Chip>)
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={css.cardHeadRow}>
        <span className={css.cardHeadText}>{p.t(K_WHO_HEAD)}</span>
        {p.s.who !== TEXT_NONE && (
          <Button kind={BTN_GHOST} className={css.clearBtn} onClick={p.clearWho}>{p.t(K_CLEAR)}</Button>
        )}
      </div>
      <div className={css.cardChips}>{chips}</div>
    </div>
  )
}
