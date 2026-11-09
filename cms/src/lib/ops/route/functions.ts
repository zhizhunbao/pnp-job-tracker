/**
 * ops 桶的子桶 route 的行为:功能通道、通道实测、Workspace 和 Key 三页。子桶 watch 超 1000 行,按关注点切开。
 *
 * @author Frank
 * @time 2026-11-08 23:59:00
 */
import { queryRowsOrEmpty, SQL } from '../../db'
import { cardOf, dashOf, intOf, tagsCell, textCell, usdOf } from '../cell'
import {
  API_KEYS, BACKUP_TEXT, CARD, CELL, CH_ANTHROPIC, CHANNEL_NAME, DASH, EVAL_COLS, EVAL_RUN_COLS, EVAL_RUNNING, GIVE_UP_DEGRADE, GIVE_UP_ERROR,
  KEY_ACTIVE, KEY_COLS, KEY_DISABLED, MS_TAIL, ROUTE_COLS, ROUTES, ROWS_MAX, ROWS_TAIL, SCORE_DIGITS, TEXT_NONE, TITLE, USD_DIGITS, VAR, WORKSPACES,
} from './constants'
import type {
  BoardIn, BoardOut, CountDbRow, EvalDbRow, KeyInfo, MaybeNumber, RouteInfo, RouteModelDbRow, RouteRowIn, RouteTable, RouteTableIn, RouteTag, RouteRow,
} from './types'

/**
 * 一张表,灰字显示总条数。
 *
 * @param x 标题、列与行。
 * @returns 表。
 */
function tableOf(x: RouteTableIn): RouteTable {
  return { title: x.title, count: x.rows.length + ROWS_TAIL, cols: x.cols, rows: x.rows }
}

/**
 * 原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toCount(row: CountDbRow): CountDbRow {
  return row
}

/**
 * 原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toRouteModel(row: RouteModelDbRow): RouteModelDbRow {
  return row
}

/**
 * 功能的主通道:环境变量优先,与调用点同一口径。
 *
 * @param r 功能登记。
 * @returns 通道代码。
 */
function mainChannelOf(r: RouteInfo): string {
  if (r.env === TEXT_NONE) {
    return r.main
  }
  const value = process.env[r.env]
  if (value == null || value === TEXT_NONE) {
    return r.main
  }
  return value
}

/**
 * 功能通道页。现状只读:切通道改环境变量;模型取账本里这个功能最近一次用的。
 *
 * @param x 连接与取数时刻。
 * @returns 看板。
 */
export async function routesBoard(x: BoardIn): BoardOut {
  const models = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_ROUTE_MODELS, params: [], map: toRouteModel })
  const degraded = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_DEGRADED_TODAY, params: [], map: toCount })
  let degradedN = 0
  const first = degraded[0]
  if (first != null) {
    degradedN = first.n
  }
  let backed = 0
  const rows: RouteRow[] = []
  for (const r of ROUTES) {
    const main = mainChannelOf(r)
    if (main === CH_ANTHROPIC) {
      backed += 1
    }
    rows.push(routeRowOf({ route: r, main, models }))
  }
  return {
    cards: [
      cardOf({ value: ROUTES.length, label: CARD.features }), cardOf({ value: backed, label: CARD.backup }),
      cardOf({ value: ROUTES.length - backed, label: CARD.noBackup }), cardOf({ value: degradedN, label: CARD.degraded }),
    ],
    tables: [tableOf({ title: TITLE.routes, cols: ROUTE_COLS, rows })],
    updatedAt: x.updatedAt,
  }
}

/**
 * 功能通道一行:只有 Claude 通道过额度闸,才有备用。
 *
 * @param x 功能、主通道与最近模型。
 * @returns 表格行。
 */
function routeRowOf(x: RouteRowIn): RouteRow {
  let channel = x.main
  const known = CHANNEL_NAME[x.main]
  if (known != null) {
    channel = known
  }
  let backup = DASH
  let giveUp = GIVE_UP_ERROR
  if (x.main === CH_ANTHROPIC) {
    backup = BACKUP_TEXT
    giveUp = GIVE_UP_DEGRADE
  }
  let model = DASH
  for (const m of x.models) {
    if (m.feature === x.route.feature) {
      model = m.model
    }
  }
  return {
    key: x.route.feature,
    cells: [
      { kind: CELL.named, main: x.route.name, sub: x.route.feature }, textCell(channel), textCell(model), textCell(backup), textCell(giveUp),
    ],
  }
}

/**
 * 原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toEval(row: EvalDbRow): EvalDbRow {
  return row
}

/**
 * 通道实测页。
 *
 * @param x 连接与取数时刻。
 * @returns 看板。
 */
export async function evalsBoard(x: BoardIn): BoardOut {
  const raw = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_EVALS, params: [ROWS_MAX], map: toEval })
  const running: EvalDbRow[] = []
  const done: EvalDbRow[] = []
  const tested = new Set<string>()
  let samples = 0
  let spent = 0
  for (const e of raw) {
    samples += e.samples
    spent += e.cost_usd
    if (e.state === EVAL_RUNNING) {
      running.push(e)
    } else {
      done.push(e)
      tested.add(e.feature)
    }
  }
  return {
    cards: [
      cardOf({ value: tested.size, label: CARD.tested }), cardOf({ value: Math.max(0, ROUTES.length - tested.size), label: CARD.untested }),
      cardOf({ value: intOf(samples), label: CARD.samples }), cardOf({ value: usdOf({ n: spent, digits: USD_DIGITS }), label: CARD.spent }),
    ],
    tables: [
      tableOf({ title: TITLE.evalRun, cols: EVAL_RUN_COLS, rows: running.map(toEvalRunRow) }),
      tableOf({ title: TITLE.evalDone, cols: EVAL_COLS, rows: done.map(toEvalRow) }),
    ],
    updatedAt: x.updatedAt,
  }
}

/**
 * 正在跑的实测 → 表格行。
 *
 * @param e 实测。
 * @returns 表格行。
 */
function toEvalRunRow(e: EvalDbRow): RouteRow {
  return { key: String(e.id), cells: [textCell(e.feature), textCell(e.model), textCell(intOf(e.samples)), textCell(e.started_text)] }
}

/**
 * 跑完的实测 → 表格行。
 *
 * @param e 实测。
 * @returns 表格行。
 */
function toEvalRow(e: EvalDbRow): RouteRow {
  let latency = DASH
  if (e.latency_ms != null) {
    latency = e.latency_ms + MS_TAIL
  }
  return {
    key: String(e.id),
    cells: [
      textCell(e.feature), textCell(e.model), textCell(scoreOf(e.accuracy)), textCell(scoreOf(e.consistency)), textCell(scoreOf(e.tone)),
      textCell(scoreOf(e.privacy)), textCell(latency), textCell(usdOf({ n: e.cost_usd, digits: USD_DIGITS })), textCell(dashOf(e.method)),
      textCell(intOf(e.samples)),
    ],
  }
}

/**
 * 分数文字。
 *
 * @param n 分数。
 * @returns 文字或横线。
 */
function scoreOf(n: MaybeNumber): string {
  if (n == null) {
    return DASH
  }
  return n.toFixed(SCORE_DIGITS)
}

/**
 * Workspace 和 Key 页:手工登记的 Console 现状,密钥本身不入库、不输出。
 *
 * @param x 连接与取数时刻。
 * @returns 看板。
 */
export async function keysBoard(x: BoardIn): BoardOut {
  let active = 0
  for (const k of API_KEYS) {
    if (k.active) {
      active += 1
    }
  }
  return {
    cards: [
      cardOf({ value: WORKSPACES.length, label: CARD.workspaces }), cardOf({ value: active, label: CARD.active }),
      cardOf({ value: API_KEYS.length - active, label: CARD.disabled }), cardOf({ value: 0, label: CARD.expiring }),
    ],
    tables: [tableOf({ title: TITLE.keys, cols: KEY_COLS, rows: API_KEYS.map(toKeyRow) })],
    updatedAt: x.updatedAt,
  }
}

/**
 * Key → 表格行。Console 上这几把都没设到期,成本列 Console 显示横线。
 *
 * @param k Key 登记。
 * @returns 表格行。
 */
function toKeyRow(k: KeyInfo): RouteRow {
  let text = KEY_DISABLED
  let variant: RouteTag['variant'] = VAR.gray
  if (k.active) {
    text = KEY_ACTIVE
    variant = VAR.ok
  }
  return {
    key: k.name,
    cells: [
      { kind: CELL.named, main: k.name, sub: k.last4 }, textCell(k.workspace), textCell(k.account), tagsCell({ text, variant, warn: TEXT_NONE }),
      textCell(DASH), textCell(k.created), textCell(DASH),
    ],
  }
}
