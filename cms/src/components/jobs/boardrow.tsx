'use client'
/**
 * 表格一行(斑马纹两档)。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { BoardCell } from './boardcell'
import { rowClsOf } from './functions'
import type { BoardRowIn } from './types'

/**
 * 渲染表格一行。
 *
 * @param props 整台状态机、这一行的库行与斑马纹档。
 * @returns 一行。
 */
export function BoardRow({ b, job, alt }: BoardRowIn) {
  const tds = []
  for (const c of b.cols.shown) {
    tds.push(<BoardCell key={c.key} b={b} job={job} k={c.key} alt={alt} />)
  }
  return (
    <tr className={rowClsOf(alt)}>{tds}</tr>
  )
}
