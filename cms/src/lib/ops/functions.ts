/**
 * ops 域的行为:按页取数并洗成一页看板(四格加一到两张表)。写入在子桶 write,报警与 AI 通道在子桶 watch。
 * 新增观察维度:constants 加页面与列,这里加一段取数,浏览器端的模板不用动。
 * 连接由页面门与路由注入,本文件不 import payload。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import { queryRowsOrEmpty, SQL } from '../db'
import {
  addIntOf, cardOf, dashOf, doneTextOf, intOf, pctOf, spanOf, spanOrDashOf, stageTextOf, tagsCell, textCell, usdOf,
} from './cell'
import {
  ALIAS_COLS, ALIAS_DONE_COLS, APPLY_COLS, APPLY_DONE_COLS, APPLY_QUEUED, BUDGET_COLS, BUDGET_NOTE, CARD, CELL, CHANNEL_NAME, COST_COLS, DASH,
  DEL_ALIAS, DEL_APPLY, DEL_NAME_SEP, DEL_SITE, FEATURE_NAME, ISO_NONE, LOST_S,
  REPORT, REPORT_COLS, ROWS_MAX, RUN_COLS, SEC_ALIAS, SEC_APPLY, SEC_BUDGET, SEC_CHANNELS, SEC_COST, SEC_EVALS, SEC_FRESH, SEC_INCIDENTS,
  SEC_KEYS, SEC_ROUTES, SEC_RULES, SEC_SAVED, SEC_SCHEDULE, SEC_SITES, SEC_USAGE, SITE_COLS,
  SITE_DONE_COLS, STAGE_QUEUED, STUCK_S, TAG, TEXT, TEXT_NONE,   UNIT_COLS, UNIT_LLM, UNIT_RUN, USAGE_COLS,
  USD_DIGITS_CARD, USD_DIGITS_TABLE, VAR, WORKER,
} from './constants'
import { evalsBoard, keysBoard, routesBoard } from './route'
import { savedBoard } from './saved'
import { channelsBoard, freshBoard, incidentsBoard, rulesBoard } from './watch'
import type {
  AliasDbRow, AliasDoneDbRow, ApplyDbRow, ApplyDoneDbRow, BudgetDbRow, BudgetNoteTable, CostDbRow, CostStatsDbRow,
  LoadBoardIn, MaybeInt, MaybeQueueStats, MaybeText, NowDbRow, OpsBoardOut, OpsCards, OpsCell, OpsRow, OpsTable,
  OpsTag, QueueReportIn, QueueStatsDbRow, ReportRow, ReportRowIn, RunDbRow,
  SecIn, SiteDbRow, SiteDoneDbRow, StatsOfIn, StatsOut, TableOfIn, TotalRows, UnitDbRow, UsageDbRow, 
} from './types'

// =========================================================================
// 1. 入口
// =========================================================================

/**
 * 取一页看板。
 *
 * @param x 连接与哪一页。
 * @returns 这一页的四格和表。
 */
export async function loadOpsBoard(x: LoadBoardIn): OpsBoardOut {
  const now = await queryRowsOrEmpty({ db: x.db, sql: SQL.QUEUE_NOW, params: [], map: toNowIso })
  let updatedAt = ISO_NONE
  const first = now[0]
  if (first != null) {
    updatedAt = first
  }
  const input = { db: x.db, updatedAt }
  if (x.sec === SEC_SCHEDULE) {
    return scheduleBoard(input)
  }
  if (x.sec === SEC_APPLY) {
    return applyBoard(input)
  }
  if (x.sec === SEC_SITES) {
    return sitesBoard(input)
  }
  if (x.sec === SEC_ALIAS) {
    return aliasBoard(input)
  }
  if (x.sec === SEC_USAGE) {
    return usageBoard(input)
  }
  if (x.sec === SEC_COST) {
    return costBoard(input)
  }
  if (x.sec === SEC_BUDGET) {
    return budgetBoard(input)
  }
  if (x.sec === SEC_INCIDENTS) {
    return incidentsBoard(input)
  }
  if (x.sec === SEC_RULES) {
    return rulesBoard(input)
  }
  if (x.sec === SEC_FRESH) {
    return freshBoard(input)
  }
  if (x.sec === SEC_CHANNELS) {
    return channelsBoard(input)
  }
  if (x.sec === SEC_ROUTES) {
    return routesBoard(input)
  }
  if (x.sec === SEC_EVALS) {
    return evalsBoard(input)
  }
  if (x.sec === SEC_KEYS) {
    return keysBoard(input)
  }
  if (x.sec === SEC_SAVED) {
    return savedBoard(input)
  }
  return reportBoard(input)
}

/**
 * 库的此刻 → ISO。
 *
 * @param row 库原始行。
 * @returns ISO 串。
 */
function toNowIso(row: NowDbRow): string {
  return new Date(row.at).toISOString()
}

/**
 * 一张表,灰字显示总条数。
 *
 * @param x 标题、列、行与总条数。
 * @returns 表。
 */
function tableOf(x: TableOfIn): OpsTable {
  return { title: x.title, count: x.total + TEXT.rowsTail, cols: x.cols, rows: x.rows }
}

// =========================================================================
// 3. 调度
// =========================================================================

/**
 * 调度页。
 *
 * @param x 连接与取数时刻。
 * @returns 看板。
 */
async function scheduleBoard(x: SecIn): OpsBoardOut {
  const units = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_UNITS, params: [], map: toUnitRow })
  const raw = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_UNITS, params: [], map: toUnitRaw })
  const runs = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_RUNS, params: [ROWS_MAX], map: toRunRow })
  let running = 0
  let failed = 0
  let succeeded = 0
  for (const u of raw) {
    if (u.state === UNIT_RUN) {
      running += 1
    }
    if (u.last_ok === false) {
      failed += 1
    }
    if (u.last_ok === true) {
      succeeded += 1
    }
  }
  return {
    cards: [
      cardOf({ value: running, label: CARD.running }),
      cardOf({ value: raw.length - running, label: CARD.queued }),
      cardOf({ value: failed, label: CARD.failed }),
      cardOf({ value: succeeded, label: CARD.succeeded }),
    ],
    tables: [
      tableOf({ title: TEXT.unitsNow, cols: UNIT_COLS, rows: units, total: units.length }),
      tableOf({ title: TEXT.history, cols: RUN_COLS, rows: runs, total: runs.length }),
    ],
    updatedAt: x.updatedAt,
  }
}

/**
 * 原始行原样带回,给四格计数。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toUnitRaw(row: UnitDbRow): UnitDbRow {
  return row
}

/**
 * 调度单元 → 表格行。
 *
 * @param u 库原始行。
 * @returns 表格行。
 */
function toUnitRow(u: UnitDbRow): OpsRow {
  return {
    key: u.name,
    cells: [
      textCell(u.name), unitTagsOf(u), textCell(dashOf(u.started_text)), textCell(unitDurOf(u)), textCell(unitNextOf(u)),
      textCell(TEXT.every + spanOf(u.interval_s)), errorCellOf(u.error),
    ],
  }
}

/**
 * 调度单元的状态胶囊。
 *
 * @param u 库原始行。
 * @returns 单元格。
 */
function unitTagsOf(u: UnitDbRow): OpsCell {
  let text = TAG.wait
  let variant: OpsTag['variant'] = VAR.gray
  if (u.state === UNIT_RUN) {
    text = TAG.run
    variant = VAR.info
  } else if (u.state === UNIT_LLM) {
    text = TAG.llm
    variant = VAR.warn
  } else if (u.due_s != null && u.due_s < -LOST_S) {
    text = TAG.lost
    variant = VAR.bad
  }
  let warn = TEXT_NONE
  if (u.last_ok === false) {
    warn = TAG.lastFail
  }
  return tagsCell({ text, variant, warn })
}

/**
 * 调度单元的「下一轮」格。正在跑的还没有下一轮。
 *
 * @param u 库原始行。
 * @returns 文字。
 */
function unitNextOf(u: UnitDbRow): string {
  if (u.state === UNIT_RUN || u.due_s == null) {
    return DASH
  }
  if (u.due_s < 0) {
    return TEXT.late + spanOf(-u.due_s)
  }
  return spanOf(u.due_s) + TEXT.after
}

/**
 * 调度单元的「时长」格:正在跑报已跑多久,其余报上一轮时长。
 *
 * @param u 库原始行。
 * @returns 文字。
 */
function unitDurOf(u: UnitDbRow): string {
  if (u.state === UNIT_RUN) {
    return spanOrDashOf(u.run_s)
  }
  return spanOrDashOf(u.last_dur_s)
}

/**
 * 报错格:有报错出复制钮,报错正文不铺在页面上(2026-11-08 Frank「不用直接显示出来吧,应该有复制报错的按钮吧」)。
 *
 * @param error 报错;没有是 null。
 * @returns 单元格。
 */
function errorCellOf(error: MaybeText): OpsCell {
  if (error == null || error === TEXT_NONE) {
    return textCell(DASH)
  }
  return { kind: CELL.copy, text: error }
}

/**
 * 运行历史 → 表格行。
 *
 * @param r 库原始行。
 * @returns 表格行。
 */
function toRunRow(r: RunDbRow): OpsRow {
  let text = TAG.failed
  let variant: OpsTag['variant'] = VAR.bad
  if (r.ok) {
    text = TAG.ok
    variant = VAR.ok
  }
  return {
    key: String(r.id),
    cells: [
      textCell(r.name), textCell(r.started_text), textCell(r.ended_text), textCell(spanOf(r.dur_s)),
      tagsCell({ text, variant, warn: TEXT_NONE }), errorCellOf(r.error), textCell(String(r.id)),
    ],
  }
}

// =========================================================================
// 4. 队列
// =========================================================================

/**
 * 投递待发页。
 *
 * @param x 连接与取数时刻。
 * @returns 看板。
 */
async function applyBoard(x: SecIn): OpsBoardOut {
  const params = [ROWS_MAX]
  const live = await queryRowsOrEmpty({ db: x.db, sql: SQL.QUEUE_APPLY, params, map: toApplyRaw })
  const done = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_APPLY_DONE, params, map: toApplyDoneRaw })
  const stats = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_APPLY_STATS, params: [], map: toQueueStats })
  let s: MaybeQueueStats = null
  if (stats[0] != null) {
    s = stats[0]
  }
  return {
    cards: queueCardsOf(s),
    tables: [
      tableOf({ title: TEXT.running, cols: APPLY_COLS, rows: live.map(toApplyRow), total: totalOf(live) }),
      tableOf({ title: TEXT.history, cols: APPLY_DONE_COLS, rows: done.map(toApplyDoneRow), total: totalOf(done) }),
    ],
    updatedAt: x.updatedAt,
  }
}

/**
 * 队列四格。
 *
 * @param s 汇总行;没取到是 null。
 * @returns 四格。
 */
function queueCardsOf(s: MaybeQueueStats): OpsCards {
  let waiting = 0
  let working = 0
  let done = 0
  let oldest = DASH
  if (s != null) {
    waiting = s.waiting
    working = s.working
    done = s.done_today
    oldest = spanOrDashOf(s.oldest_s)
  }
  return [
    cardOf({ value: waiting, label: CARD.waiting }),
    cardOf({ value: working, label: CARD.working }),
    cardOf({ value: done, label: CARD.doneToday }),
    cardOf({ value: oldest, label: CARD.oldest }),
  ]
}

/**
 * 汇总行原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toQueueStats(row: QueueStatsDbRow): QueueStatsDbRow {
  return row
}

/**
 * 取总条数:第一行带回的 total。
 *
 * @param rows 带 total 的库原始行。
 * @returns 总条数。
 */
function totalOf(rows: TotalRows): number {
  const first = rows[0]
  if (first == null) {
    return 0
  }
  return first.total
}

/**
 * 原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toApplyRaw(row: ApplyDbRow): ApplyDbRow {
  return row
}

/**
 * 原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toApplyDoneRaw(row: ApplyDoneDbRow): ApplyDoneDbRow {
  return row
}

/**
 * 待发投递 → 表格行。
 *
 * @param a 库原始行。
 * @returns 表格行。
 */
function toApplyRow(a: ApplyDbRow): OpsRow {
  let text = TAG.sending
  let variant: OpsTag['variant'] = VAR.info
  let warn = TEXT_NONE
  if (a.status === APPLY_QUEUED) {
    text = TAG.queued
    variant = VAR.gray
  } else if (a.age_s > STUCK_S) {
    warn = TAG.stuck
  }
  return {
    key: String(a.id),
    cells: [
      textCell(dashOf(a.email)), textCell(dashOf(a.job_title)), textCell(dashOf(a.company)), tagsCell({ text, variant, warn }),
      textCell(spanOf(a.age_s)),
      {
        kind: CELL.del,
        del: { kind: DEL_APPLY, key: String(a.id), name: dashOf(a.job_title) + DEL_NAME_SEP + dashOf(a.company) },
      },
    ],
  }
}

/**
 * 已完成投递 → 表格行。
 *
 * @param a 库原始行。
 * @returns 表格行。
 */
function toApplyDoneRow(a: ApplyDoneDbRow): OpsRow {
  return {
    key: String(a.id),
    cells: [
      textCell(dashOf(a.email)), textCell(dashOf(a.job_title)), textCell(dashOf(a.company)),
      tagsCell({ text: doneTextOf(a.status), variant: VAR.ok, warn: TEXT_NONE }), textCell(a.done_text),
    ],
  }
}

/**
 * 官网抓取页。
 *
 * @param x 连接与取数时刻。
 * @returns 看板。
 */
async function sitesBoard(x: SecIn): OpsBoardOut {
  const params = [ROWS_MAX]
  const live = await queryRowsOrEmpty({ db: x.db, sql: SQL.QUEUE_SITES, params, map: toSiteRaw })
  const done = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_SITES_DONE, params, map: toSiteDoneRaw })
  const stats = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_SITES_STATS, params: [], map: toQueueStats })
  let s: MaybeQueueStats = null
  if (stats[0] != null) {
    s = stats[0]
  }
  return {
    cards: queueCardsOf(s),
    tables: [
      tableOf({ title: TEXT.running, cols: SITE_COLS, rows: live.map(toSiteRow), total: totalOf(live) }),
      tableOf({ title: TEXT.history, cols: SITE_DONE_COLS, rows: done.map(toSiteDoneRow), total: totalOf(done) }),
    ],
    updatedAt: x.updatedAt,
  }
}

/**
 * 原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toSiteRaw(row: SiteDbRow): SiteDbRow {
  return row
}

/**
 * 原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toSiteDoneRaw(row: SiteDoneDbRow): SiteDoneDbRow {
  return row
}

/**
 * 官网抓取 → 表格行。
 *
 * @param s 库原始行。
 * @returns 表格行。
 */
function toSiteRow(s: SiteDbRow): OpsRow {
  let variant: OpsTag['variant'] = VAR.info
  if (s.stage === STAGE_QUEUED) {
    variant = VAR.gray
  }
  let warn = TEXT_NONE
  if (s.in_pool === false) {
    warn = TAG.outPool
  } else if (s.curated) {
    warn = TAG.curated
  }
  let worker = WORKER.find
  if (s.has_site) {
    worker = WORKER.visit
  }
  return {
    key: s.key,
    cells: [
      textCell(s.name), tagsCell({ text: stageTextOf(s.stage), variant, warn }), textCell(worker), textCell(String(s.open_count)),
      textCell(spanOrDashOf(s.age_s)), textCell(dashOf(s.stage_note)),
      { kind: CELL.del, del: { kind: DEL_SITE, key: s.key, name: s.name } },
    ],
  }
}

/**
 * 官网抓取历史 → 表格行。
 *
 * @param s 库原始行。
 * @returns 表格行。
 */
function toSiteDoneRow(s: SiteDoneDbRow): OpsRow {
  return {
    key: s.key,
    cells: [
      textCell(s.name), tagsCell({ text: stageTextOf(s.stage), variant: VAR.ok, warn: TEXT_NONE }), textCell(String(s.open_count)),
      textCell(dashOf(s.stage_note)), textCell(s.done_text),
    ],
  }
}

/**
 * 译名翻译页。
 *
 * @param x 连接与取数时刻。
 * @returns 看板。
 */
async function aliasBoard(x: SecIn): OpsBoardOut {
  const params = [ROWS_MAX]
  const live = await queryRowsOrEmpty({ db: x.db, sql: SQL.QUEUE_ALIAS, params, map: toAliasRaw })
  const done = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_ALIAS_DONE, params, map: toAliasDoneRaw })
  const stats = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_ALIAS_STATS, params: [], map: toQueueStats })
  let s: MaybeQueueStats = null
  if (stats[0] != null) {
    s = stats[0]
  }
  return {
    cards: queueCardsOf(s),
    tables: [
      tableOf({ title: TEXT.running, cols: ALIAS_COLS, rows: live.map(toAliasRow), total: totalOf(live) }),
      tableOf({ title: TEXT.history, cols: ALIAS_DONE_COLS, rows: done.map(toAliasDoneRow), total: totalOf(done) }),
    ],
    updatedAt: x.updatedAt,
  }
}

/**
 * 原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toAliasRaw(row: AliasDbRow): AliasDbRow {
  return row
}

/**
 * 原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toAliasDoneRaw(row: AliasDoneDbRow): AliasDoneDbRow {
  return row
}

/**
 * 译名翻译 → 表格行。
 *
 * @param a 库原始行。
 * @returns 表格行。
 */
function toAliasRow(a: AliasDbRow): OpsRow {
  return {
    key: a.key,
    cells: [
      textCell(a.name), textCell(String(a.seen_count)), textCell(spanOf(a.age_s)),
      { kind: CELL.del, del: { kind: DEL_ALIAS, key: a.key, name: a.name } },
    ],
  }
}

/**
 * 译名翻译历史 → 表格行。
 *
 * @param a 库原始行。
 * @returns 表格行。
 */
function toAliasDoneRow(a: AliasDoneDbRow): OpsRow {
  return {
    key: a.key,
    cells: [
      textCell(a.name), tagsCell({ text: doneTextOf(a.status), variant: VAR.ok, warn: TEXT_NONE }), textCell(String(a.seen_count)),
      textCell(a.done_text),
    ],
  }
}

// =========================================================================
// 5. 费用
// =========================================================================

/**
 * 用量页。
 *
 * @param x 连接与取数时刻。
 * @returns 看板。
 */
async function usageBoard(x: SecIn): OpsBoardOut {
  const raw = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_USAGE, params: [], map: toUsageRaw })
  let tokensIn: MaybeInt = null
  let tokensOut: MaybeInt = null
  let cacheRead: MaybeInt = null
  let requests = 0
  for (const u of raw) {
    tokensIn = addIntOf({ a: tokensIn, b: u.input_tokens })
    tokensOut = addIntOf({ a: tokensOut, b: u.output_tokens })
    cacheRead = addIntOf({ a: cacheRead, b: u.cache_read })
    requests += u.requests
  }
  return {
    cards: [
      cardOf({ value: intOf(tokensIn), label: CARD.tokensIn }),
      cardOf({ value: intOf(tokensOut), label: CARD.tokensOut }),
      cardOf({ value: intOf(requests), label: CARD.requests }),
      cardOf({ value: intOf(cacheRead), label: CARD.cacheRead }),
    ],
    tables: [tableOf({ title: TEXT.usageTitle, cols: USAGE_COLS, rows: raw.map(toUsageRow), total: raw.length })],
    updatedAt: x.updatedAt,
  }
}

/**
 * 原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toUsageRaw(row: UsageDbRow): UsageDbRow {
  return row
}

/**
 * 用量 → 表格行。
 *
 * @param u 库原始行。
 * @returns 表格行。
 */
function toUsageRow(u: UsageDbRow): OpsRow {
  return {
    key: u.feature + u.model + u.channel,
    cells: [
      featureCellOf(u.feature), textCell(u.model), textCell(channelNameOf(u.channel)), textCell(intOf(u.input_tokens)),
      textCell(intOf(u.output_tokens)),
      textCell(intOf(u.cache_read)), textCell(intOf(u.requests)),
    ],
  }
}

/**
 * 功能格:人话主名,代码灰字。
 *
 * @param code 功能代码。
 * @returns 单元格。
 */
function featureCellOf(code: string): OpsCell {
  const name = FEATURE_NAME[code]
  if (name == null) {
    return textCell(code)
  }
  return { kind: CELL.named, main: name, sub: code }
}

/**
 * 通道名。
 *
 * @param code 通道代码。
 * @returns 人话名;表外的原样。
 */
function channelNameOf(code: string): string {
  const name = CHANNEL_NAME[code]
  if (name == null) {
    return code
  }
  return name
}

/**
 * 成本页。联网搜索现在没有接,这一项如实显示 0。
 *
 * @param x 连接与取数时刻。
 * @returns 看板。
 */
async function costBoard(x: SecIn): OpsBoardOut {
  const raw = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_COST, params: [ROWS_MAX], map: toCostRaw })
  const stats = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_COST_STATS, params: [], map: toCostStats })
  let total = 0
  let today = 0
  const s = stats[0]
  if (s != null) {
    total = s.total
    today = s.today
  }
  return {
    cards: [
      cardOf({ value: usdOf({ n: total, digits: USD_DIGITS_CARD }), label: CARD.totalCost }),
      cardOf({ value: usdOf({ n: total, digits: USD_DIGITS_CARD }), label: CARD.tokenCost }),
      cardOf({ value: usdOf({ n: 0, digits: USD_DIGITS_CARD }), label: CARD.webCost }),
      cardOf({ value: usdOf({ n: today, digits: USD_DIGITS_CARD }), label: CARD.todayCost }),
    ],
    tables: [tableOf({ title: TEXT.usageTitle, cols: COST_COLS, rows: raw.map(toCostRow), total: raw.length })],
    updatedAt: x.updatedAt,
  }
}

/**
 * 原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toCostRaw(row: CostDbRow): CostDbRow {
  return row
}

/**
 * 原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toCostStats(row: CostStatsDbRow): CostStatsDbRow {
  return row
}

/**
 * 成本 → 表格行。
 *
 * @param c 库原始行。
 * @returns 表格行。
 */
function toCostRow(c: CostDbRow): OpsRow {
  const cost = usdOf({ n: c.cost, digits: USD_DIGITS_TABLE })
  return {
    key: c.day + c.feature + c.model,
    cells: [
      textCell(c.day), featureCellOf(c.feature), textCell(c.model), textCell(cost),
      textCell(usdOf({ n: 0, digits: USD_DIGITS_TABLE })), textCell(intOf(c.requests)), textCell(cost),
    ],
  }
}

/**
 * 额度页。四格取正在生效的那一笔。
 *
 * @param x 连接与取数时刻。
 * @returns 看板。
 */
async function budgetBoard(x: SecIn): OpsBoardOut {
  const raw = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_BUDGETS, params: [], map: toBudgetRaw })
  const live: BudgetDbRow[] = []
  const done: BudgetDbRow[] = []
  for (const b of raw) {
    if (b.live) {
      live.push(b)
    } else {
      done.push(b)
    }
  }
  let used = 0
  let limit = 0
  let daysText = DASH
  const cur = live[0]
  if (cur != null) {
    used = cur.used_usd
    limit = cur.limit_usd
    daysText = cur.days_left + TEXT.daysTail
  }
  return {
    cards: [
      cardOf({ value: usdOf({ n: used, digits: USD_DIGITS_CARD }), label: CARD.used }),
      cardOf({ value: pctOf({ used, limit }), label: CARD.usedPct }),
      cardOf({ value: usdOf({ n: limit - used, digits: USD_DIGITS_CARD }), label: CARD.remaining }),
      cardOf({ value: daysText, label: CARD.daysLeft }),
    ],
    tables: [
      tableOf({ title: TEXT.budgetLive, cols: BUDGET_COLS, rows: live.map(toBudgetRow), total: live.length }),
      tableOf({ title: TEXT.budgetDone, cols: BUDGET_COLS, rows: done.map(toBudgetRow), total: done.length }),
    ],
    updatedAt: x.updatedAt,
  }
}

/**
 * 原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toBudgetRaw(row: BudgetDbRow): BudgetDbRow {
  return row
}

/**
 * 额度 → 表格行。
 *
 * @param b 库原始行。
 * @returns 表格行。
 */
function toBudgetRow(b: BudgetDbRow): OpsRow {
  let alerts = DASH
  let scope = DASH
  const notes: BudgetNoteTable = BUDGET_NOTE
  const note = notes[b.name]
  if (note != null) {
    alerts = note.alerts
    scope = note.scope
  }
  return {
    key: b.name,
    cells: [
      textCell(b.name), textCell(usdOf({ n: b.limit_usd, digits: USD_DIGITS_CARD })),
      textCell(usdOf({ n: b.used_usd, digits: USD_DIGITS_CARD })),
      textCell(pctOf({ used: b.used_usd, limit: b.limit_usd })), textCell(alerts), textCell(scope), textCell(b.starts_text),
      textCell(b.expires_text),
    ],
  }
}

// =========================================================================
// 6. 总览
// =========================================================================

/**
 * 服务报告页:每个领域一行,对比约定的目标;没有约定目标的显示「未约定」,不判达标。趋势要历史数据,接好前显示横线。
 *
 * @param x 连接与取数时刻。
 * @returns 看板。
 */
async function reportBoard(x: SecIn): OpsBoardOut {
  const units = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_UNITS, params: [], map: toUnitRaw })
  const budgets = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_BUDGETS, params: [], map: toBudgetRaw })
  let failed = 0
  for (const u of units) {
    if (u.last_ok === false) {
      failed += 1
    }
  }
  let used = 0
  let limit = 0
  for (const b of budgets) {
    if (b.live) {
      used = b.used_usd
      limit = b.limit_usd
    }
  }
  const items: ReportRow[] = [
    reportRowOf({
      name: REPORT.schedule,
      actual: units.length + REPORT.unitsTail + failed + REPORT.failedTail,
      target: REPORT.noTarget,
      met: null,
      incidents: failed,
      usage: units.length - failed + REPORT.okTail,
    }),
    queueReportRowOf({
      name: REPORT.apply,
      stats: await statsOf({ db: x.db, sql: SQL.OPS_APPLY_STATS }),
    }),
    queueReportRowOf({
      name: REPORT.sites,
      stats: await statsOf({ db: x.db, sql: SQL.OPS_SITES_STATS }),
    }),
    queueReportRowOf({
      name: REPORT.alias,
      stats: await statsOf({ db: x.db, sql: SQL.OPS_ALIAS_STATS }),
    }),
    reportRowOf({
      name: REPORT.fee,
      actual: REPORT.used + usdOf({ n: used, digits: USD_DIGITS_CARD }),
      target: REPORT.targetFee + usdOf({ n: limit, digits: USD_DIGITS_CARD }),
      met: used <= limit,
      incidents: 0,
      usage: pctOf({ used, limit }),
    }),
  ]
  const rows: OpsRow[] = []
  let met = 0
  let missed = 0
  let incidents = 0
  for (const it of items) {
    rows.push(it.row)
    incidents += it.incidents
    if (it.met === true) {
      met += 1
    }
    if (it.met === false) {
      missed += 1
    }
  }
  return {
    cards: [
      cardOf({ value: met, label: CARD.met }),
      cardOf({ value: missed, label: CARD.missed }),
      cardOf({ value: incidents, label: CARD.incidents }),
      cardOf({ value: usdOf({ n: used, digits: USD_DIGITS_CARD }), label: CARD.claudeUsed }),
    ],
    tables: [tableOf({ title: TEXT.reportTitle, cols: REPORT_COLS, rows, total: rows.length })],
    updatedAt: x.updatedAt,
  }
}

/**
 * 取一条队列汇总。
 *
 * @param x 连接与汇总语句。
 * @returns 汇总行;没取到是 null。
 */
async function statsOf(x: StatsOfIn): StatsOut {
  const rows = await queryRowsOrEmpty({ db: x.db, sql: x.sql, params: [], map: toQueueStats })
  const first = rows[0]
  if (first == null) {
    return null
  }
  return first
}

/**
 * 队列类领域的一行。
 *
 * @param x 领域与汇总行。
 * @returns 表格行与是否达标。
 */
function queueReportRowOf(x: QueueReportIn): ReportRow {
  let waiting = 0
  let done = 0
  let oldest: MaybeInt = null
  if (x.stats != null) {
    waiting = x.stats.waiting
    done = x.stats.done_today
    oldest = x.stats.oldest_s
  }
  let actual = REPORT.waiting + waiting + REPORT.waitingTail
  if (oldest != null) {
    actual = actual + REPORT.oldest + spanOf(oldest)
  }
  return reportRowOf({
    name: x.name,
    actual,
    target: REPORT.noTarget,
    met: null,
    incidents: 0,
    usage: REPORT.doneToday + done,
  })
}

/**
 * 服务报告的一行。
 *
 * @param x 领域、实际、目标、是否达标、事件数与用量。
 * @returns 表格行与是否达标。
 */
function reportRowOf(x: ReportRowIn): ReportRow {
  let text = TAG.noTarget
  let variant: OpsTag['variant'] = VAR.gray
  if (x.met === true) {
    text = TAG.met
    variant = VAR.ok
  } else if (x.met === false) {
    text = TAG.missed
    variant = VAR.bad
  }
  return {
    row: {
      key: x.name,
      cells: [
        textCell(x.name), textCell(x.actual), textCell(x.target), tagsCell({ text, variant, warn: TEXT_NONE }),
        textCell(String(x.incidents)), textCell(x.usage), textCell(DASH),
      ],
    },
    met: x.met,
    incidents: x.incidents,
  }
}
