/**
 * ops 桶的子桶 saved 的行为:用户收藏页,全站收藏只读一张表加四格。
 * 站上的收藏清单只给本人(管理员也一样),要看全部来这一页(2026-11-10 Frank「应该在运维模块能看到全部」)。
 *
 * @author Frank
 * @time 2026-11-10 12:00:00
 */
import { queryRowsOrEmpty, SQL } from '../../db'
import { cardOf, dashOf, sayOf, tagsCell, textCell } from '../cell'
import {
  CARD, CELL, ROWS_KEY, ROWS_MAX, SAVED_COLS, STATUS_NAME, STATUS_WISH, TEXT_NONE, TITLE_SAVED, VAR,
} from './constants'
import type { BoardIn, BoardOut, MaybeText, OpsText, SavedDbRow, SavedRow, SavedStatsDbRow, SavedTag } from './types'

/**
 * 用户收藏页。
 *
 * @param x 连接与取数时刻。
 * @returns 看板。
 */
export async function savedBoard(x: BoardIn): BoardOut {
  const rows = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_SAVED, params: [ROWS_MAX], map: toSavedRow })
  const stats = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_SAVED_STATS, params: [], map: toSavedStats })
  let s: SavedStatsDbRow = { total: 0, users: 0, jobs: 0, today: 0 }
  const first = stats[0]
  if (first != null) {
    s = first
  }
  return {
    cards: [
      cardOf({ value: s.total, label: CARD.total }), cardOf({ value: s.users, label: CARD.users }),
      cardOf({ value: s.jobs, label: CARD.jobs }), cardOf({ value: s.today, label: CARD.today }),
    ],
    tables: [{ title: TITLE_SAVED, count: { key: ROWS_KEY, vars: { n: s.total } }, cols: SAVED_COLS, rows }],
    updatedAt: x.updatedAt,
  }
}

/**
 * 原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toSavedStats(row: SavedStatsDbRow): SavedStatsDbRow {
  return row
}

/**
 * 一条收藏 → 表格行。
 *
 * @param row 库原始行。
 * @returns 表格行。
 */
function toSavedRow(row: SavedDbRow): SavedRow {
  let jobId = TEXT_NONE
  if (row.job_id != null) {
    jobId = String(row.job_id)
  }
  let variant: SavedTag['variant'] = VAR.info
  if (row.status == null || row.status === TEXT_NONE || row.status === STATUS_WISH) {
    variant = VAR.gray
  }
  return {
    key: String(row.id),
    cells: [
      textCell(dashOf(row.saved_text)), textCell(dashOf(row.email)),
      { kind: CELL.named, main: dashOf(row.title), sub: dashOf(row.company) }, textCell(dashOf(jobId)),
      tagsCell({ text: statusTextOf(row.status), variant, warn: TEXT_NONE }),
    ],
  }
}

/**
 * 状态码 → 显示词;空的按想投算(站上点收藏落的就是它),表外的原样。
 *
 * @param s 状态码。
 * @returns 显示词。
 */
function statusTextOf(s: MaybeText): OpsText {
  let code = STATUS_WISH
  if (s != null && s !== TEXT_NONE) {
    code = s
  }
  const name = STATUS_NAME[code]
  if (name == null) {
    return code
  }
  return sayOf(name)
}
