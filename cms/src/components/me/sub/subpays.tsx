'use client'
/**
 * me 桶子桶 sub 的结构:「付款记录」一段(2026-10-08 立:日期 / 内容 / 金额 / 操作(收据),通用 Table 形;
 * 数据按本人的 Stripe 客户 id 现查,不落库)。
 * 2026-11-07 照 Fluent 效果图:没买过也出这一段,写「还没有付款」(原先没买过整段不出);拉失败出一句,
 * 不再当没买过;还没拉回来时卡里先空着(卡头占位)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { Table } from '@/components/table'
import { payCellRowsOf, payColsOf, payKeyOf } from './functions'
import { SubSec } from './subsec'
import type { SubPartIn } from './types'
import css from './sub.module.css'

/**
 * 「付款记录」。
 *
 * @param props 「我的订阅」状态与取词。
 * @returns 一张分区卡。
 */
export function SubPays({ s, t }: SubPartIn) {
  const items = s.payments
  return (
    <SubSec title={t('sub.pay')}>
      {s.payFailed && <div className={cssOf(css.note)}>{t('mj.fail')}</div>}
      {items != null && items.length === 0 && <div className={cssOf(css.note)}>{t('sub.noPay')}</div>}
      {items != null && items.length > 0 && (
        <Table cols={payColsOf(t)} rows={payCellRowsOf({ items, t })} rowKey={payKeyOf} />
      )}
    </SubSec>
  )
}
