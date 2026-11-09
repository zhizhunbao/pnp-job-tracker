'use client'
/**
 * ops 域的单元格:按种类画文字、胶囊、删除钮。新增观察维度不用新写单元格。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import { Name } from '@/components/name'
import { AlertButton } from './alertbutton'
import { CELL_ACT, CELL_COPY, CELL_DEL, CELL_NAMED, CELL_TAGS } from './constants'
import { CopyError } from './copyerror'
import { DelButton } from './delbutton'
import { OpsTags } from './opstags'
import type { OpsCellViewIn } from './types'

/**
 * 画一个单元格。
 *
 * @param props 这个单元格。
 * @returns 节点。
 */
export function OpsCellView({ cell }: OpsCellViewIn) {
  if (cell.kind === CELL_TAGS) {
    return <OpsTags tags={cell.tags} />
  }
  if (cell.kind === CELL_DEL) {
    return <DelButton del={cell.del} />
  }
  if (cell.kind === CELL_ACT) {
    return <AlertButton act={cell.act} />
  }
  if (cell.kind === CELL_COPY) {
    return <CopyError text={cell.text} />
  }
  if (cell.kind === CELL_NAMED) {
    return <Name en={cell.main} sub={cell.sub} />
  }
  return cell.text
}
