// 雇主板 SSR 取数(两个入口路由共用一份;口径由**路径段**定,不由 query 改写)。
// #313 红线:SSR 只带第一页 EMP_SSR_ROWS 行 + total,余下换筛选/翻页走 /api/employers。
import { getPayload } from 'payload'

import config from '@/payload.config'
import {
  EMP_SSR_ROWS, loadEmployerPage, normalizeEmployerFilters,
  type EmployerFilters, type EmployerMode, type EmployerPage, type Pool,
} from '@/lib/designatedEmployers'

type SP = Record<string, string | string[] | undefined>

export async function employersBoardProps(sp: SP, mode: EmployerMode): Promise<{ initial: EmployerPage; initialFilters: EmployerFilters }> {
  const get = (k: string) => { const v = sp[k]; return Array.isArray(v) ? v[0] : v }
  // 入口契约(初评表「查雇主」的落点):/employers/designated?program=…&prov=… 与
  // /employers/hiring?prov=…&noc=… 必须直达且预置筛选 —— 路径段即口径,query 里的 mode 不参与
  const initialFilters: EmployerFilters = { ...normalizeEmployerFilters(get, mode), mode }
  const payload = await getPayload({ config: await config })
  const pool = (payload.db as { pool?: Pool }).pool
  const initial = await loadEmployerPage(pool, initialFilters, EMP_SSR_ROWS)
  return { initial, initialFilters }
}
