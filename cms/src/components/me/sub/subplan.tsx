'use client'
/**
 * me 桶子桶 sub 的结构:「当前方案」一段(2026-10-08 照 AIApply 的 Billing 卡立;2026-11-07 照 Fluent 效果图改成分区卡,
 * 星标框、金色描边与卡右边的钮撤,钮挪到页标题右边)。
 * 免费态 = 「免费版」+ 灰字两档价格一行;Pro 态 = 「Pro」+ 「还剩 N 天」胶囊,下一行有效期至。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { PRICE } from '@/components/pricing'
import { Tag } from '@/components/tag'
import { ymd } from '@/lib/time'
import { CLS_SEP, LEFT_TAG, PRO_LABEL } from './constants'
import { daysLeftOf } from './functions'
import { SubSec } from './subsec'
import type { SubPartIn } from './types'
import css from './sub.module.css'

/**
 * 「当前方案」。
 *
 * @param props 「我的订阅」状态与取词。
 * @returns 一张分区卡。
 */
export function SubPlan({ s, t }: SubPartIn) {
  return (
    <SubSec title={t('sub.cur')}>
      <div className={cssOf(css.planRow)}>
        {s.pro && <span className={cssOf(css.planName)}>{PRO_LABEL}</span>}
        {s.pro && <Tag variant={LEFT_TAG}>{t('sub.left', { n: daysLeftOf(s.until) })}</Tag>}
        {s.pro === false && <span className={cssOf(css.planName)}>{t('acct.plan.free')}</span>}
        {s.pro === false && (
          <span className={cssOf(css.planMeta)}>{t('sub.price', { a: PRICE.p30, b: PRICE.p90 })}</span>
        )}
      </div>
      {s.pro && (
        <div className={cssOf(css.planMeta) + CLS_SEP + cssOf(css.until)}>
          {t('acct.plan.pro', { d: ymd(s.until) })}
        </div>
      )}
    </SubSec>
  )
}
