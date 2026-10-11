'use client'
/**
 * 「更多推荐 N」卡(2026-10-10 批 2,16d;只给免费号、推荐多于 3 条时出):
 * 网页端卡头一行 = 标题 + 「升级 Pro 解锁:」+ 两枚 pro 胶囊(每天推荐无上限 / 智能投递)+ 右上主钮「升级 Pro」;
 * 下面两条锁住的推荐。手机端:标题、两条锁住的、两条好处 bullet、整宽「升级 Pro」(网页 / 手机两套由 css 媒体查询切)。
 * 同日 Frank「这个删了吧。用户 看到 升级 Pro 自动就知道啥意思了」:「升级 Pro 解锁:」、两枚好处胶囊、手机端好处 bullet 撤,只留标题、锁住的两条与「升级 Pro」。
 *
 * @author Frank
 * @time 2026-10-10 10:00:00
 */
import { Button } from '@/components/button'
import { CARD_MD_CLS, UPGRADE_KIND } from './constants'
import { reasonTextsOf } from './functions'
import { LockedPick } from './lockedpick'
import type { MorePicksIn } from './types'
import css from './myjobs.module.css'

/**
 * 「更多推荐」卡。
 *
 * @param props 取词函数、看不见的条数、锁住的几条与「升级 Pro」手柄。
 * @returns 白卡。
 */
export function MorePicks({ t, more, locked, onUpgrade }: MorePicksIn) {
  const rows = []
  for (const [i, l] of locked.entries()) {
    const reasons = reasonTextsOf({ reasons: l.reasons, program: l.program, t })
    rows.push(<LockedPick key={i} i={i} title={l.title} reasons={reasons} />)
  }
  return (
    <section className={CARD_MD_CLS}>
      <div className={css.moreHead}>
        <span className={css.moreTitle}>
          {t('mj.more')}
          <span className={css.secN}>{more}</span>
        </span>
        <span className={css.moreBtnWide}>
          <Button kind={UPGRADE_KIND} sm onClick={onUpgrade}>{t('mj.upgrade')}</Button>
        </span>
      </div>
      <div className={css.lockedList}>{rows}</div>
      <div className={css.moreBtnNarrow}>
        <Button kind={UPGRADE_KIND} onClick={onUpgrade}>{t('mj.upgrade')}</Button>
      </div>
    </section>
  )
}
