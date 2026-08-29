'use client'
/**
 * 分类弹框的卡①:职业分类身份卡 —— 点进来的那一格该行高亮,这是
 * 「点哪个字段就显示哪个字段」在「始终出完整三卡」下的落地。
 * #198(Frank「这部分删掉」):NOC/TEER 解释注撤 —— 枚举值已人话化,不必每次复述定义。
 * 2026-08-28 换装批自 Advisor.tsx 的 CategoryPanel 卡①提出成件。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { CARD_HEAD_CLS, CARD_MD_CLS, TEXT_NONE } from './constants'
import { HlRow } from './hlrow'
import type { CategoryIdCardIn } from './types'

/**
 * 渲染职业分类身份卡。
 *
 * @param props 取词函数、身份行与点进来的那一格。
 * @returns 身份卡。
 */
export function CategoryIdCard({ t, rows, srcField }: CategoryIdCardIn) {
  const out = []
  for (const r of rows) {
    if (r.value === TEXT_NONE) {
      continue
    }
    out.push(<HlRow key={r.key} label={r.label} on={r.field === srcField} narrow={false}>{r.value}</HlRow>)
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{t('grp.category')}</div>
      {out}
    </div>
  )
}
