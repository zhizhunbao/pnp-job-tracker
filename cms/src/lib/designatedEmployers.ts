// 指定雇主名录取数(2026-08-16 Frank「这个怎么没有查雇主按钮」)。
// AIP / RCIP / FCIP 三个制度都要求 offer 出自**被指定的雇主** —— 名录 6,680 行早在库里
// (designated_employers,source=AIP|RCIP|FCIP|RCIP+FCIP),先前没有页面承载,初评表只能不给入口。
// 🔴 口径:被指定 = 该雇主可以走这条试点/试验计划招人,**不等于**它在招、更不等于它要你;
//    「在招」永远以职位库为准(本页每行给「看该雇主在招」直达职位板)。
export type DesignatedEmployerRow = {
  name: string
  province: string
  /** 社区/城市(RCIP/FCIP 的名录按社区发,AIP 按省) */
  location: string
  /** AIP | RCIP | FCIP | RCIP+FCIP(双标社区) */
  source: string
  /** 逗号分隔 NOC(AIP 名录部分行有;RCIP/FCIP 多为空 —— 空=名录没写,不是没有限制) */
  nocs: string
  url: string
  fetched: string
}

type Pool = { query: (q: string, v?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }

/** program 用**子串**匹配:'RCIP+FCIP' 的双标社区对 RCIP 与 FCIP 两个筛选都算数 */
export async function fetchDesignatedEmployers(
  pool: Pool, opts: { program?: string; province?: string } = {},
): Promise<DesignatedEmployerRow[]> {
  const where: string[] = []
  const params: unknown[] = []
  if (opts.program) { params.push(`%${opts.program}%`); where.push(`source LIKE $${params.length}`) }
  if (opts.province) { params.push(opts.province); where.push(`province = $${params.length}`) }
  const { rows } = await pool.query(
    `SELECT name, province, location, source, nocs, url, fetched
       FROM designated_employers
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY location ASC, name ASC`, params,
  ).catch(() => ({ rows: [] as Record<string, unknown>[] }))
  return rows.map((r) => ({
    name: String(r.name ?? ''),
    province: String(r.province ?? ''),
    location: String(r.location ?? ''),
    source: String(r.source ?? ''),
    nocs: String(r.nocs ?? ''),
    url: String(r.url ?? ''),
    fetched: String(r.fetched ?? '').slice(0, 10),
  }))
}
