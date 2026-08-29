'use client'
/**
 * 地点弹框的卡①:地点身份卡(与分类卡①同款行,点进来的那一格该行高亮)。
 * 有值行的值文字 = 地图链接(与表格格同一规则,查询词按所看层级拼)。
 * 2026-08-28 换装批自 Advisor.tsx 的 LocationPanel 卡①提出成件。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { mapQuery, mapsUrl } from '@/lib/location'
import { CARD_HEAD_CLS, CARD_MD_CLS, TARGET_BLANK, TEXT_NONE } from './constants'
import { locRowsOf } from './functions'
import { HlRow } from './hlrow'
import type { LocationCardIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染地点身份卡。
 *
 * @param props 取词函数、这一岗与点进来的那一格。
 * @returns 身份卡。
 */
export function LocationCard({ t, job, srcField }: LocationCardIn) {
  const out = []
  for (const r of locRowsOf({ t, job })) {
    if (r.value === TEXT_NONE) {
      continue
    }
    let value = <>{r.value}</>
    if (r.map) {
      value = (
        <LinkButton href={mapsUrl(mapQuery({ field: r.field, job }))} target={TARGET_BLANK}
          className={cssOf(css.valueLink)}>{r.value}</LinkButton>
      )
    }
    out.push(<HlRow key={r.key} label={r.label} on={r.field === srcField} narrow>{value}</HlRow>)
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{t('grp.location')}</div>
      {out}
    </div>
  )
}
