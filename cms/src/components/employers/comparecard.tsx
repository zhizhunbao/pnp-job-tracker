'use client'
/**
 * 对比页里一家雇主的手机卡:卡标题是雇主名(有官网就做成外链)+ 别名灰注,
 * 卡身是维度键值行 —— 键取维度名、值调这一维度的单元格组件。
 * 「简介」那一条独占整行(长文本挤在两列里读不了)。
 * 2026-08-27 换装批自 Compare.tsx 的卡片段提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { Card, CardKV } from '@/components/card'
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { DIM_BRIEF_KEY, TARGET_BLANK, TEXT_NONE } from './constants'
import type { CompareCardIn } from './types'
import css from './employers.module.css'

/**
 * 对比页里一家雇主的手机卡。
 *
 * @param props 这一家的展示行与维度行(见 CompareCardIn 逐格注释)。
 * @returns 一张卡。
 */
export function CompareCard({ r, dims }: CompareCardIn) {
  let name = <>{r.name}</>
  if (r.website !== TEXT_NONE) {
    name = (
      <LinkButton href={r.website} target={TARGET_BLANK} className={cssOf(css.cardLink)}>
        {r.name}
      </LinkButton>
    )
  }
  const items = []
  for (const d of dims) {
    items.push({ k: d.label, v: d.render(r), wide: d.key === DIM_BRIEF_KEY })
  }
  return (
    <Card>
      <div className={css.cardTitle}>{name}</div>
      {r.alias !== TEXT_NONE && <div className={css.cardAlias}>{r.alias}</div>}
      <CardKV items={items} />
    </Card>
  )
}
