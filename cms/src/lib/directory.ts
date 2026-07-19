// 实体名录读取(B4-01):/employers 与 /occupations 的 SQL 层(照 lib/rankings 模式,零计算只 SELECT)。
// 语义红线循 E6-02:LMIA=「雇过外国人的历史事实」≠「能担保」;AIP 指定=「已注册」≠「有配额」。

export const DIR_PAGE_SIZE = 100

export type AipRow = { name: string; province: string; location: string; isTech: boolean }
export type LmiaRow = { name: string; region: string; website: string; lmiaPositions: number; lmiaPositionsSkilled: number | null; lmiaStreams: string; lmiaLastQuarter: string }
export type OccRow = { province: string; stream: string; label: string; type: string; noc: string; name: string; url: string; fetched: string }

const like = (q: string) => `%${q.replace(/[%_\\]/g, (c) => '\\' + c)}%`

export async function fetchAipEmployers(pool: any, { q, prov, page }: { q: string; prov: string; page: number }) {
  const cond: string[] = []
  const args: any[] = []
  if (q) { args.push(like(q)); cond.push(`name ILIKE $${args.length}`) }
  if (prov) { args.push(prov); cond.push(`province = $${args.length}`) }
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : ''
  const { rows: [{ n }] } = await pool.query(`SELECT COUNT(*)::int AS n FROM designated_employers ${where}`, args)
  const { rows } = await pool.query(
    `SELECT name, province, location, is_tech FROM designated_employers ${where}
     ORDER BY name ASC LIMIT ${DIR_PAGE_SIZE} OFFSET ${Math.max(0, page) * DIR_PAGE_SIZE}`, args)
  const items: AipRow[] = rows.map((r: any) => ({ name: r.name ?? '', province: r.province ?? '', location: r.location ?? '', isTech: !!r.is_tech }))
  return { items, total: n as number }
}

export async function fetchLmiaEmployers(pool: any, { q, page }: { q: string; page: number }) {
  const cond = [`lmia_positions > 0`]
  const args: any[] = []
  if (q) { args.push(like(q)); cond.push(`name ILIKE $${args.length}`) }
  const where = `WHERE ${cond.join(' AND ')}`
  const { rows: [{ n }] } = await pool.query(`SELECT COUNT(*)::int AS n FROM companies ${where}`, args)
  // B4-02:技能股(High Wage/GTS)优先排序——农业/低薪股大户(果园/农场)沉底,与担保雇主榜口径一致
  const { rows } = await pool.query(
    `SELECT name, region, website, lmia_positions, lmia_positions_skilled, lmia_streams, lmia_last_quarter FROM companies ${where}
     ORDER BY COALESCE(lmia_positions_skilled, 0) DESC, lmia_positions DESC, name ASC LIMIT ${DIR_PAGE_SIZE} OFFSET ${Math.max(0, page) * DIR_PAGE_SIZE}`, args)
  const items: LmiaRow[] = rows.map((r: any) => ({
    name: r.name ?? '', region: r.region ?? '', website: r.website ?? '',
    lmiaPositions: Number(r.lmia_positions) || 0, lmiaPositionsSkilled: r.lmia_positions_skilled == null ? null : Number(r.lmia_positions_skilled),
    lmiaStreams: r.lmia_streams ?? '', lmiaLastQuarter: r.lmia_last_quarter ?? '',
  }))
  return { items, total: n as number }
}

export async function fetchOccupations(pool: any): Promise<OccRow[]> {
  const { rows } = await pool.query(
    `SELECT province, stream, label, type, noc, name, url, fetched FROM pnp_occupations ORDER BY province ASC, stream ASC, noc ASC`)
  return rows.map((r: any) => ({
    province: r.province ?? '', stream: r.stream ?? '', label: r.label ?? '', type: r.type ?? '',
    noc: r.noc ?? '', name: r.name ?? '', url: r.url ?? '', fetched: (r.fetched ?? '').slice?.(0, 10) ?? '',
  }))
}
