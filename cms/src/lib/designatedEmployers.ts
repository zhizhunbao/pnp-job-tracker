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

/**
 * 在招雇主(2026-08-16 Frank「其他的查雇主按钮呢?」):普通省提名没有「指定雇主」这回事,
 * 对它们有意义的雇主视图 = **这个省正在招这个职业的雇主**,数据来自本站每日职位库。
 * 🔴 口径:在招数是**本站库内**的数(不是该雇主全部招聘),排序按岗位数降序。
 */
export type HiringEmployerRow = { name: string; province: string; location: string; openJobs: number }

export async function fetchHiringEmployers(
  pool: Pool, opts: { province: string; noc: string },
): Promise<HiringEmployerRow[]> {
  if (!/^[A-Z]{2}$/.test(opts.province) || !/^\d{5}$/.test(opts.noc)) return []
  const { rows } = await pool.query(
    `SELECT c.name AS name, j.province AS province,
            MIN(COALESCE(j.city, '')) AS location, COUNT(*)::int AS n
       FROM jobs j JOIN companies c ON c.id = j.company_id
      WHERE j.status = 'open' AND j.province = $1 AND j.noc = $2 AND COALESCE(c.name, '') <> ''
      GROUP BY c.name, j.province
      ORDER BY n DESC, c.name ASC
      LIMIT 300`, [opts.province, opts.noc],
  ).catch(() => ({ rows: [] as Record<string, unknown>[] }))
  return rows.map((r) => ({
    name: String(r.name ?? ''),
    province: String(r.province ?? ''),
    location: String(r.location ?? ''),
    openJobs: Number(r.n) || 0,
  }))
}
