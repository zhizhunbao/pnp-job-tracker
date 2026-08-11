/**
 * Safely load one province's verified PNP score table without running the full seed.
 *
 * Usage:
 *   npx tsx scripts/load-pnp-score-table.ts NL          # read-only check
 *   npx tsx scripts/load-pnp-score-table.ts NL --write  # replace only NL rows
 */
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'

import config from '../src/payload.config'

type Row = Record<string, unknown>
type DbClient = {
  query: (sql: string, params?: unknown[]) => Promise<{ rowCount: number | null; rows: Row[] }>
  release: () => void
}

const province = String(process.argv[2] || '').trim().toUpperCase()
const write = process.argv.includes('--write')
if (!/^[A-Z]{2}$/.test(province)) throw new Error('Pass a two-letter province code, for example: NL')

const martPath = path.resolve(process.cwd(), '..', 'data', 'mart', 'pnp_score_factors.json')
const source: Row[] = JSON.parse(fs.readFileSync(martPath, 'utf8'))
const rows = source.filter((r) => r.province === province)
if (!rows.length) throw new Error(`No ${province} rows in ${martPath}`)
if (rows.some((r) => !r.system || !r.factor || !r.kind || !r.label || !r.url || !r.fetched)) {
  throw new Error(`${province} score rows failed required-field validation`)
}
if (new Set(rows.map((r) => r.system)).size !== 1) throw new Error(`${province} rows contain multiple scoring systems`)

const payload = await getPayload({ config: await config })
const client: DbClient = await (payload.db as any).pool.connect()
try {
  const before = await client.query('SELECT count(*)::int AS n FROM pnp_score_factors WHERE province=$1', [province])
  const current = Number(before.rows[0]?.n ?? 0)
  if (!write) {
    console.log(`${province}: mart=${rows.length}, database=${current}; dry run only`)
    process.exitCode = current === rows.length ? 0 : 2
  } else {
    const cols = ['province', 'system', 'factor', 'kind', 'seq', 'label', 'points', 'xor_prev', 'rule',
      'factor_max', 'factor_group', 'group_max', 'pass_mark', 'max_total', 'guide_effective', 'url', 'fetched',
      'created_at', 'updated_at']
    const now = new Date().toISOString()
    const mapped = rows.map((r) => ({
      province: r.province, system: r.system, factor: r.factor, kind: r.kind, seq: r.seq, label: r.label,
      points: r.points, xor_prev: r.xorPrev, rule: r.rule, factor_max: r.factorMax,
      factor_group: r.factorGroup, group_max: r.groupMax, pass_mark: r.passMark, max_total: r.maxTotal,
      guide_effective: r.guideEffective, url: r.url, fetched: r.fetched, created_at: now, updated_at: now,
    }))
    const params: unknown[] = []
    const values = mapped.map((r, ri) => `(${cols.map((c, ci) => {
      params.push(r[c as keyof typeof r] ?? null)
      return `$${ri * cols.length + ci + 1}`
    }).join(',')})`).join(',')

    await client.query('BEGIN')
    await client.query(
      'DELETE FROM payload_locked_documents_rels WHERE pnp_score_factors_id IN (SELECT id FROM pnp_score_factors WHERE province=$1)',
      [province],
    )
    await client.query('DELETE FROM pnp_score_factors WHERE province=$1', [province])
    await client.query(`INSERT INTO pnp_score_factors (${cols.join(',')}) VALUES ${values}`, params)
    await client.query('DELETE FROM seed_state WHERE name=$1', ['pnp_score_factors'])
    await client.query('COMMIT')
    console.log(`${province}: replaced ${current} database rows with ${rows.length} verified mart rows`)
  }
} catch (error) {
  if (write) await client.query('ROLLBACK').catch(() => undefined)
  throw error
} finally {
  client.release()
}
process.exit(process.exitCode ?? 0)
