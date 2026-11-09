'use client'
/**
 * ops 域的小件:手机上的一行卡片(走通用 JobCard)。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import { JobCard } from '@/components/card'
import { AlertButton } from './alertbutton'
import { CELL_ACT, CELL_COPY, CELL_DEL, CELL_TAGS } from './constants'
import { CopyError } from './copyerror'
import { DelButton } from './delbutton'
import { rowCardPartsOf } from './functions'
import { OpsTags } from './opstags'
import type { OpsRowCardIn } from './types'

/**
 * 手机上的一行卡片。
 *
 * @param props 这一行。
 * @returns 卡片。
 */
export function OpsRowCard({ row }: OpsRowCardIn) {
  const parts = rowCardPartsOf(row)
  const chips = []
  let action = null
  for (const c of row.cells) {
    if (c.kind === CELL_TAGS) {
      chips.push(<OpsTags key={chips.length} tags={c.tags} />)
    }
    if (c.kind === CELL_COPY) {
      chips.push(<CopyError key={chips.length} text={c.text} />)
    }
    if (c.kind === CELL_ACT) {
      action = <AlertButton act={c.act} />
    }
    if (c.kind === CELL_DEL) {
      action = <DelButton del={c.del} />
    }
  }
  return <JobCard title={{ text: parts.title }} note={parts.note} chips={chips} action={action} />
}
