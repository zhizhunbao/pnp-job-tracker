'use client'
/**
 * 「付款记录」表(2026-10-08):日期 / 内容 / 金额 / 操作(收据),通用 Table 形;数据按本人的 Stripe 客户 id 现查(懒查,不落库)。
 * 没买过不出这一段(由上层按条数判)。
 * 2026-10-10 批 2(外层大白卡拆掉,CLAUDE.md「页面与弹框正文一律分区卡」):本段自己成一张分区卡(cardMd + 卡头 mcardHead)。
 *
 * @author Frank
 * @time 2026-10-08 10:00:00
 */
import { Table } from '@/components/table'
import { payCellRowsOf, payColsOf, payKeyOf } from './functions'
import { CARD_HEAD_CLS, CARD_MD_CLS } from './constants'
import type { SubPaymentsIn } from './types'

/**
 * 渲染付款记录。
 *
 * @param props 取词函数与清单。
 * @returns 段标题 + 表。
 */
export function SubPayments({ t, items }: SubPaymentsIn) {
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{t('sub.pay')}</div>
      <Table cols={payColsOf(t)} rows={payCellRowsOf({ items, t })} rowKey={payKeyOf} />
    </div>
  )
}
