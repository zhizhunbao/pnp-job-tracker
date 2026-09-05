'use client'
/**
 * 域内小件:身份胶囊(没工签 / PGWP 或工签),与每张雇主分表的子标题同一行;切一处全段跟着切
 * (2026-09-05 Frank「雇主需要按身份筛选」「这两个换个位置吧」)。
 *
 * @author Frank
 * @time 2026-09-05 01:10:00
 */
import { Chip } from '@/components/chip'
import { kindChipsOf } from './functions'
import type { IdChipsIn } from './types'
import css from './start.module.css'

/**
 * 渲染身份胶囊行。
 *
 * @param props 当前档与切档工厂。
 * @returns 一行胶囊。
 */
export function IdChips({ t, kind, kindPickOf }: IdChipsIn) {
  const items = []
  for (const c of kindChipsOf(t)) {
    items.push(<Chip key={c.key} active={kind === c.key} onClick={kindPickOf(c.key)}>{c.text}</Chip>)
  }
  return <div className={css.idRow}>{items}</div>
}
