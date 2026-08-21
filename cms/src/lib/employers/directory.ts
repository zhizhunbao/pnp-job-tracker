// 实体名录读取(B4-01):/occupations 的 SQL 层(照 lib/rankings 模式,零计算只 SELECT)。
// AIP/LMIA 两张雇主表的读函数 2026-08-18 删除(零调用点;/employers 的数据走 employers/board.ts)。

import { SQL } from '../db'   // SQL 文本全在那儿,本文件只管取数与映射

export type OccRow = { province: string; stream: string; label: string; type: string; noc: string; name: string; url: string; fetched: string }

export async function fetchOccupations(pool: any): Promise<OccRow[]> {
  const { rows } = await pool.query(
    SQL.PNP_OCCUPATIONS_ALL)
  return rows.map((r: any) => ({
    province: r.province ?? '', stream: r.stream ?? '', label: r.label ?? '', type: r.type ?? '',
    noc: r.noc ?? '', name: r.name ?? '', url: r.url ?? '', fetched: (r.fetched ?? '').slice?.(0, 10) ?? '',
  }))
}
