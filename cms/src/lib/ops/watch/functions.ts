/**
 * ops 桶的子桶 watch 的行为:判定报警规则、记探活、洗事件与 AI 通道页。父桶 functions.ts 接近 1000 行,照 cell 的形开子桶。
 * 发信函数由路由注入,本文件不 import 邮件域。
 *
 * @author Frank
 * @time 2026-11-08 23:59:00
 */
import { queryRows, queryRowsOrEmpty, SQL } from '../../db'
import { cardOf, dashOf, intOf, pctOf, sayOf, tagsCell, textCell } from '../cell'
import {
  ACT_ACK, ACT_CLOSE, APPLY_SENDING, BUDGET_LINES, CARD, CELL, CH_ANTHROPIC, CH_OLLAMA, CHANNEL_COLS, CHANNEL_NAME, CHANNELS, COND_SEP, DASH, ESC_AMP,
  ESC_AMP_RE, ESC_GT, ESC_GT_RE, ESC_LT, ESC_LT_RE, FIRE_COLS, FRESH_COLS, FRESH_DAY_S, FRESH_JOB_S, FRESH_JOB_UNITS, FRESH_MARGIN_S, FRESH_OK,
  FRESH_SKIP_UNITS, FRESH_WARN, HOUR_S, INCIDENT_COLS, INCIDENT_DONE_COLS, LINE_HOURS_KEY, LOST_S, MAIL_COND, MAIL_HTML, MAIL_SUBJECT, MS_KEY,
  NAME_SEP, NAMES_MAX, NOT_AGREED, NOTIFY_MAIL, OUTAGE_COLS, PCT, PCT_BASE, PCT_DIGITS, PROBE_ERROR_MAX, R_APPLY_STUCK, R_CHANNEL, R_DEGRADED, R_FRESH,
  R_UNIT_FAILED, R_UNIT_LOST, ROWS_KEY, ROWS_MAX, RULE_COLS, RULE_KEY, RULE_PART, RULES, STUCK_S, TAG_FIRED, TEXT_NONE, TICK_S, TITLE, UNIT_WAIT, US_ACK,
  US_CLOSED, US_NEW, US_TEXT, USER_STATES, VAR,
} from './constants'
import type {
  AdminDbRow, AlertActJson, AlertDbRow, ApplyDbRow, BoardCards, BoardIn, BoardOut, BudgetDbRow, ChannelRowIn, ChannelSignalIn, CondIn, CountDbRow,
  CountRows, FireOneIn, FireOneOut, FreshDbRow, FreshFact, FreshRows, GoldenIn, MailNotifyIn, MaybeAlertAct, MaybeProbe, MaybeProbeStat, MaybeTraffic,
  NotifyFn, OpsText, ProbeStatDbRow, RatioIn, RuleInfo, RuleTextIn, RunRulesIn, RunRulesOut, SaveProbesIn, SetAlertIn, SetAlertOut, Signal, SignalFacts, SignalFactsOut,
  Signals, TextList, TickJson, TrafficDbRow, TrafficForIn, UnitDbRow, UnitNamesIn, WatchCell, WatchCells, WatchRow, WatchTable, WatchTableIn, WatchTag,
  WriteOut,
} from './types'

// =========================================================================
// 1. 判定规则
// =========================================================================

/**
 * 判定全部规则:新触发的落一行并发通知,条件消失的标恢复。取事实失败直接抛,不把「查不到」当成「恢复」。
 *
 * @param x 连接与通知函数。
 * @returns 新触发了几条。
 */
export async function runRules(x: RunRulesIn): RunRulesOut {
  const signals = signalsOf(await loadFacts(x))
  let fired = 0
  for (const signal of signals) {
    if (signal.firing === false) {
      await x.db.query(SQL.OPS_ALERT_RESOLVE, [signal.rule])
    } else if (await fireOne({ db: x.db, signal, notify: x.notify })) {
      fired += 1
    }
  }
  await x.db.query(SQL.OPS_ALERT_PRUNE, [])
  return fired
}

/**
 * 取判定要的全部事实。
 *
 * @param x 连接。
 * @returns 事实。
 */
async function loadFacts(x: RunRulesIn): SignalFactsOut {
  const db = x.db
  const budgets = await queryRows({ db, sql: SQL.OPS_BUDGETS, params: [], map: toBudget })
  const degraded = await queryRows({ db, sql: SQL.OPS_DEGRADED_SINCE, params: [TICK_S], map: toCount })
  const probes = await queryRows({ db, sql: SQL.OPS_PROBE_STATS, params: [], map: toProbeStat })
  const units = await queryRows({ db, sql: SQL.OPS_UNITS, params: [], map: toUnit })
  const applies = await queryRows({ db, sql: SQL.QUEUE_APPLY, params: [ROWS_MAX], map: toApply })
  const fresh = await queryRows({ db, sql: SQL.OPS_FRESH, params: [], map: toFresh })
  let usedUsd = 0
  for (const b of budgets) {
    if (b.live) {
      usedUsd = b.used_usd
    }
  }
  let stuck = 0
  for (const a of applies) {
    if (a.status === APPLY_SENDING && a.age_s > STUCK_S) {
      stuck += 1
    }
  }
  return { usedUsd, degraded: firstCountOf(degraded), probes, units, stuck, staleSets: staleNamesOf(fresh) }
}

/**
 * 原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toBudget(row: BudgetDbRow): BudgetDbRow {
  return row
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
function toProbeStat(row: ProbeStatDbRow): ProbeStatDbRow {
  return row
}

/**
 * 原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toUnit(row: UnitDbRow): UnitDbRow {
  return row
}

/**
 * 原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toApply(row: ApplyDbRow): ApplyDbRow {
  return row
}

/**
 * 第一行的计数。
 *
 * @param rows 计数行。
 * @returns 计数;没有行是 0。
 */
function firstCountOf(rows: CountRows): number {
  const first = rows[0]
  if (first == null) {
    return 0
  }
  return first.n
}

/**
 * 全部规则这一轮的结果。纯函数。
 *
 * @param f 事实。
 * @returns 每条规则一个结果。
 */
export function signalsOf(f: SignalFacts): Signals {
  const out: Signal[] = []
  for (const line of BUDGET_LINES) {
    out.push({ rule: line.rule, firing: f.usedUsd >= line.usd, condition: conditionOf({ rule: line.rule, names: [] }) })
  }
  out.push({ rule: R_DEGRADED, firing: f.degraded > 0, condition: conditionOf({ rule: R_DEGRADED, names: [] }) })
  for (const channel of CHANNELS) {
    out.push(channelSignalOf({ channel, stats: f.probes }))
  }
  const failed = unitNamesOf({ units: f.units, test: isUnitFailed })
  out.push({ rule: R_UNIT_FAILED, firing: failed.length > 0, condition: conditionOf({ rule: R_UNIT_FAILED, names: failed }) })
  const lost = unitNamesOf({ units: f.units, test: isUnitLost })
  out.push({ rule: R_UNIT_LOST, firing: lost.length > 0, condition: conditionOf({ rule: R_UNIT_LOST, names: lost }) })
  out.push({ rule: R_APPLY_STUCK, firing: f.stuck > 0, condition: conditionOf({ rule: R_APPLY_STUCK, names: [String(f.stuck)] }) })
  out.push({ rule: R_FRESH, firing: f.staleSets.length > 0, condition: conditionOf({ rule: R_FRESH, names: f.staleSets }) })
  return out
}

/**
 * 一个通道的结果:有探活且最近一次失败才触发,没探过不算失败。
 *
 * @param x 通道与探活汇总。
 * @returns 结果。
 */
function channelSignalOf(x: ChannelSignalIn): Signal {
  const rule = R_CHANNEL + x.channel
  const stat = probeFor(x)
  if (stat == null || stat.ok) {
    return { rule, firing: false, condition: conditionOf({ rule, names: [] }) }
  }
  let names: string[] = []
  if (stat.error != null) {
    names = [stat.error]
  }
  return { rule, firing: true, condition: conditionOf({ rule, names }) }
}

/**
 * 单元是否上轮失败。
 *
 * @param u 单元。
 * @returns 是否。
 */
function isUnitFailed(u: UnitDbRow): boolean {
  return u.last_ok === false
}

/**
 * 单元是否失联:等下一轮的单元过点超过判据还没开跑。
 *
 * @param u 单元。
 * @returns 是否。
 */
function isUnitLost(u: UnitDbRow): boolean {
  return u.state === UNIT_WAIT && u.due_s != null && u.due_s < -LOST_S
}

/**
 * 符合条件的单元名。
 *
 * @param x 单元与谓词。
 * @returns 单元名。
 */
function unitNamesOf(x: UnitNamesIn): TextList {
  const out: string[] = []
  for (const u of x.units) {
    if (x.test(u)) {
      out.push(u.name)
    }
  }
  return out
}

/**
 * 条件文字:规则的条件加明细。
 *
 * @param x 规则与明细。
 * @returns 文字。
 */
function conditionOf(x: CondIn): string {
  const base = ruleOf(x.rule).condition
  if (x.names.length === 0) {
    return base
  }
  return base + COND_SEP + x.names.slice(0, NAMES_MAX).join(NAME_SEP)
}

/**
 * 查规则;表外的按 id 显示。
 *
 * @param id 规则 id。
 * @returns 规则。
 */
function ruleOf(id: string): RuleInfo {
  for (const r of RULES) {
    if (r.id === id) {
      return r
    }
  }
  return { id, name: id, target: DASH, signal: DASH, condition: DASH, impact: DASH }
}

/**
 * 触发一条:唯一索引保证同一规则只开一行,抢到才发通知;已开着的只刷新条件。
 *
 * @param x 连接、规则与通知。
 * @returns 是否新触发。
 */
async function fireOne(x: FireOneIn): FireOneOut {
  const res = await x.db.query(SQL.OPS_ALERT_FIRE, [x.signal.rule, x.signal.condition])
  if (res.rowCount === 0) {
    await x.db.query(SQL.OPS_ALERT_TOUCH, [x.signal.rule, x.signal.condition])
    return false
  }
  await x.notify(x.signal)
  return true
}

/**
 * 造发邮件的通知函数:发给全部管理员。
 *
 * @param x 连接与发信函数。
 * @returns 通知函数。
 */
export function makeMailNotify(x: MailNotifyIn): NotifyFn {
  return async function mailNotify(signal: Signal): Promise<void> {
    const admins = await queryRows({ db: x.db, sql: SQL.OPS_ADMIN_EMAILS, params: [], map: toAdminEmail })
    const html = MAIL_HTML.split(MAIL_COND).join(escapeOf(signal.condition))
    for (const to of admins) {
      await x.send({ to, subject: MAIL_SUBJECT + ruleOf(signal.rule).name, html })
    }
  }
}

/**
 * 管理员行 → 邮箱。
 *
 * @param row 库原始行。
 * @returns 邮箱。
 */
function toAdminEmail(row: AdminDbRow): string {
  return row.email
}

/**
 * HTML 转义:条件里可能带探活报错。
 *
 * @param s 原文。
 * @returns 转义后的文字。
 */
function escapeOf(s: string): string {
  return s.replace(ESC_AMP_RE, ESC_AMP).replace(ESC_LT_RE, ESC_LT).replace(ESC_GT_RE, ESC_GT)
}

/**
 * 事件操作体 → 洗净的操作:id 是正整数,用户响应在表内且不是回到新建。
 *
 * @param body 网络来的操作体。
 * @returns 洗净的操作;不对是 null。
 */
export function toAlertAct(body: AlertActJson): MaybeAlertAct {
  if (typeof body.id !== 'number' || Number.isInteger(body.id) === false || body.id <= 0) {
    return null
  }
  if (typeof body.state !== 'string' || USER_STATES.includes(body.state) === false || body.state === US_NEW) {
    return null
  }
  return { id: body.id, state: body.state }
}

/**
 * 改事件的用户响应。
 *
 * @param x 连接与操作。
 * @returns 动了几行。
 */
export async function setAlertState(x: SetAlertIn): SetAlertOut {
  const res = await x.db.query(SQL.OPS_ALERT_STATE, [x.act.id, x.act.state])
  if (res.rowCount == null) {
    return 0
  }
  return res.rowCount
}

// =========================================================================
// 2. 探活
// =========================================================================

/**
 * 调度器报来的 Ollama 探活 → 洗净的一条。
 *
 * @param body 网络来的探活体。
 * @returns 探活;没报或形状不对是 null。
 */
export function toOllamaProbe(body: TickJson): MaybeProbe {
  const p = body.ollama
  if (p == null || typeof p.ok !== 'boolean') {
    return null
  }
  let ms: number | null = null
  if (typeof p.ms === 'number' && Number.isFinite(p.ms) && p.ms >= 0) {
    ms = Math.round(p.ms)
  }
  let error: string | null = null
  if (typeof p.error === 'string' && p.error !== TEXT_NONE) {
    error = p.error.slice(0, PROBE_ERROR_MAX)
  }
  return { channel: CH_OLLAMA, ok: p.ok, ms, error }
}

/**
 * 写这一轮的探活,删 30 天前的。
 *
 * @param x 连接与探活。
 * @returns 无。
 */
export async function saveProbes(x: SaveProbesIn): WriteOut {
  for (const p of x.probes) {
    await x.db.query(SQL.OPS_PROBE_PUT, [p.channel, p.ok, p.ms, p.error])
  }
  await x.db.query(SQL.OPS_PROBE_PRUNE, [])
}

// =========================================================================
// 3. 事件页
// =========================================================================

/**
 * 一张表,灰字显示总条数。
 *
 * @param x 标题、列与行。
 * @returns 表。
 */
function tableOf(x: WatchTableIn): WatchTable {
  return { title: x.title, count: { key: ROWS_KEY, vars: { n: x.rows.length } }, cols: x.cols, rows: x.rows }
}

/**
 * 原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toAlert(row: AlertDbRow): AlertDbRow {
  return row
}

/**
 * 事件页:未关闭在上,已关闭在下。
 *
 * @param x 连接与取数时刻。
 * @returns 看板。
 */
export async function incidentsBoard(x: BoardIn): BoardOut {
  const raw = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_ALERTS, params: [ROWS_MAX], map: toAlert })
  const open: AlertDbRow[] = []
  const closed: AlertDbRow[] = []
  let fresh = 0
  let ack = 0
  let fired = 0
  let resolved = 0
  for (const a of raw) {
    if (a.user_state === US_CLOSED) {
      closed.push(a)
      continue
    }
    open.push(a)
    if (a.user_state === US_NEW) {
      fresh += 1
    } else {
      ack += 1
    }
    if (a.resolved_text == null) {
      fired += 1
    } else {
      resolved += 1
    }
  }
  return {
    cards: [
      cardOf({ value: fresh, label: CARD.fresh }), cardOf({ value: ack, label: CARD.ack }),
      cardOf({ value: fired, label: CARD.fired }), cardOf({ value: resolved, label: CARD.resolved }),
    ],
    tables: [
      tableOf({ title: TITLE.open, cols: INCIDENT_COLS, rows: open.map(toOpenRow) }),
      tableOf({ title: TITLE.closed, cols: INCIDENT_DONE_COLS, rows: closed.map(toClosedRow) }),
    ],
    updatedAt: x.updatedAt,
  }
}

/**
 * 一行事件的前七格。
 *
 * @param a 事件。
 * @returns 单元格。
 */
function alertCellsOf(a: AlertDbRow): WatchCells {
  return [
    { kind: CELL.named, main: ruleTextOf({ rule: a.rule, part: RULE_PART.name }), sub: a.rule }, textCell(sayOf(NOT_AGREED)),
    textCell(ruleTextOf({ rule: a.rule, part: RULE_PART.impact })), userTagsOf(a), condCellOf(a),
    textCell(a.fired_text), textCell(dashOf(a.resolved_text)),
  ]
}

/**
 * 规则的一格界面文字:表内规则给词条键(`ops.rule.<规则号>.<哪一格>`),表外规则名字给规则号、其余给横线。
 * RULES 里的中文只用于报警邮件和落库的条件原句,页面不读它。
 *
 * @param x 规则号与哪一格。
 * @returns 界面文字或原文。
 */
function ruleTextOf(x: RuleTextIn): OpsText {
  for (const r of RULES) {
    if (r.id === x.rule) {
      return sayOf(RULE_KEY + x.rule + x.part)
    }
  }
  if (x.part === RULE_PART.name) {
    return x.rule
  }
  return DASH
}

/**
 * 事件的条件格:库里存的是「条件原句:明细」(触发时写入)。条件按规则号取词,冒号后的明细(单元名、报错)是数据,
 * 放灰字原样显示;存的原句对不上现在的规则(规则改过或表外规则)就整句原样显示。
 *
 * @param a 一条事件。
 * @returns 单元格。
 */
function condCellOf(a: AlertDbRow): WatchCell {
  const base = ruleOf(a.rule).condition
  const main = ruleTextOf({ rule: a.rule, part: RULE_PART.cond })
  if (a.condition === base) {
    return textCell(main)
  }
  if (a.condition.startsWith(base + COND_SEP)) {
    return { kind: CELL.named, main, sub: a.condition.slice(base.length + COND_SEP.length) }
  }
  return textCell(a.condition)
}

/**
 * 用户响应胶囊,没恢复的再挂一枚红「触发中」。
 *
 * @param a 事件。
 * @returns 单元格。
 */
function userTagsOf(a: AlertDbRow): WatchCell {
  let text: OpsText = a.user_state
  const known = US_TEXT[a.user_state]
  if (known != null) {
    text = sayOf(known)
  }
  let variant: WatchTag['variant'] = VAR.gray
  if (a.user_state === US_ACK) {
    variant = VAR.info
  } else if (a.user_state === US_NEW) {
    variant = VAR.warn
  }
  let warn: OpsText = TEXT_NONE
  if (a.resolved_text == null) {
    warn = sayOf(TAG_FIRED)
  }
  return tagsCell({ text, variant, warn })
}

/**
 * 未关闭事件 → 表格行:新建的钮是确认,已确认的钮是关闭。
 *
 * @param a 事件。
 * @returns 表格行。
 */
function toOpenRow(a: AlertDbRow): WatchRow {
  let to = US_ACK
  let text = ACT_ACK
  if (a.user_state === US_ACK) {
    to = US_CLOSED
    text = ACT_CLOSE
  }
  const act: WatchCell = { kind: CELL.act, act: { id: a.id, to, text } }
  return { key: String(a.id), cells: [...alertCellsOf(a), act] }
}

/**
 * 已关闭事件 → 表格行。
 *
 * @param a 事件。
 * @returns 表格行。
 */
function toClosedRow(a: AlertDbRow): WatchRow {
  return { key: String(a.id), cells: [...alertCellsOf(a), textCell(dashOf(a.cause)), textCell(dashOf(a.action))] }
}

/**
 * 报警规则页。
 *
 * @param x 连接与取数时刻。
 * @returns 看板。
 */
export async function rulesBoard(x: BoardIn): BoardOut {
  const raw = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_ALERTS, params: [ROWS_MAX], map: toAlert })
  let fired = 0
  let unacked = 0
  let resolved = 0
  for (const a of raw) {
    if (a.resolved_text == null) {
      fired += 1
    } else {
      resolved += 1
    }
    if (a.user_state === US_NEW) {
      unacked += 1
    }
  }
  return {
    cards: [
      cardOf({ value: RULES.length, label: CARD.rules }), cardOf({ value: fired, label: CARD.fired }),
      cardOf({ value: unacked, label: CARD.unacked }), cardOf({ value: resolved, label: CARD.resolved }),
    ],
    tables: [
      tableOf({ title: TITLE.rules, cols: RULE_COLS, rows: RULES.map(toRuleRow) }),
      tableOf({ title: TITLE.fires, cols: FIRE_COLS, rows: raw.map(toFireRow) }),
    ],
    updatedAt: x.updatedAt,
  }
}

/**
 * 规则 → 表格行。
 *
 * @param r 规则。
 * @returns 表格行。
 */
function toRuleRow(r: RuleInfo): WatchRow {
  return {
    key: r.id,
    cells: [
      textCell(ruleTextOf({ rule: r.id, part: RULE_PART.name })), textCell(sayOf(NOT_AGREED)),
      textCell(ruleTextOf({ rule: r.id, part: RULE_PART.target })), textCell(ruleTextOf({ rule: r.id, part: RULE_PART.signal })),
      textCell(ruleTextOf({ rule: r.id, part: RULE_PART.cond })), textCell(sayOf(NOTIFY_MAIL)),
    ],
  }
}

/**
 * 一次触发 → 表格行。
 *
 * @param a 事件。
 * @returns 表格行。
 */
function toFireRow(a: AlertDbRow): WatchRow {
  return {
    key: String(a.id),
    cells: [textCell(ruleTextOf({ rule: a.rule, part: RULE_PART.name })), condCellOf(a), userTagsOf(a), textCell(a.fired_text)],
  }
}

// =========================================================================
// 4. 数据新鲜度
// =========================================================================

/**
 * 原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toFresh(row: FreshDbRow): FreshDbRow {
  return row
}

/**
 * 数据集行 → 洗净的事实:警告线 = Frank 的保鲜标准 + 余量;从没成功过算超线。
 *
 * @param r 库原始行。
 * @returns 事实。
 */
export function toFreshFact(r: FreshDbRow): FreshFact {
  let base = FRESH_DAY_S
  if (FRESH_JOB_UNITS.includes(r.name)) {
    base = FRESH_JOB_S
  }
  const lineS = base + FRESH_MARGIN_S
  return { name: r.name, lastText: dashOf(r.last_text), lineS, stale: r.age_s == null || r.age_s > lineS }
}

/**
 * 算不算数据集。
 *
 * @param r 库原始行。
 * @returns 是否。
 */
function isDataset(r: FreshDbRow): boolean {
  return FRESH_SKIP_UNITS.includes(r.name) === false
}

/**
 * 超线的数据集名。
 *
 * @param rows 库原始行。
 * @returns 数据集名。
 */
function staleNamesOf(rows: FreshRows): TextList {
  const out: string[] = []
  for (const r of rows.filter(isDataset)) {
    const f = toFreshFact(r)
    if (f.stale) {
      out.push(f.name)
    }
  }
  return out
}

/**
 * 数据新鲜度页。Frank 只定了一条标准,对应警告线;错误线没有来源,显示「未约定」。
 *
 * @param x 连接与取数时刻。
 * @returns 看板。
 */
export async function freshBoard(x: BoardIn): BoardOut {
  const raw = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_FRESH, params: [], map: toFresh })
  const facts = raw.filter(isDataset).map(toFreshFact)
  let warn = 0
  for (const f of facts) {
    if (f.stale) {
      warn += 1
    }
  }
  return {
    cards: [
      cardOf({ value: facts.length, label: CARD.sets }), cardOf({ value: facts.length - warn, label: CARD.ok }),
      cardOf({ value: warn, label: CARD.warn }), cardOf({ value: sayOf(NOT_AGREED), label: CARD.error }),
    ],
    tables: [tableOf({ title: TITLE.fresh, cols: FRESH_COLS, rows: facts.map(toFreshRow) })],
    updatedAt: x.updatedAt,
  }
}

/**
 * 数据集 → 表格行。
 *
 * @param f 事实。
 * @returns 表格行。
 */
function toFreshRow(f: FreshFact): WatchRow {
  let text = FRESH_OK
  let variant: WatchTag['variant'] = VAR.ok
  if (f.stale) {
    text = FRESH_WARN
    variant = VAR.warn
  }
  return {
    key: f.name,
    cells: [
      textCell(f.name), textCell(f.lastText), textCell({ key: LINE_HOURS_KEY, vars: { d: f.lineS / HOUR_S } }), textCell(sayOf(NOT_AGREED)),
      tagsCell({ text: sayOf(text), variant, warn: TEXT_NONE }),
    ],
  }
}

// =========================================================================
// 5. AI 通道
// =========================================================================

/**
 * 原样带回。
 *
 * @param row 库原始行。
 * @returns 库原始行。
 */
function toTraffic(row: TrafficDbRow): TrafficDbRow {
  return row
}

/**
 * 百分比文字。
 *
 * @param x 分子与分母。
 * @returns 文字;分母是 0 显示横线。
 */
function ratioOf(x: RatioIn): string {
  if (x.whole === 0) {
    return DASH
  }
  return (x.part / x.whole * PCT_BASE).toFixed(PCT_DIGITS) + PCT
}

/**
 * 通道状态页:四个黄金信号。延迟取各通道最近一次探活的平均,饱和度只有 Claude 额度有来源。
 *
 * @param x 连接与取数时刻。
 * @returns 看板。
 */
export async function channelsBoard(x: BoardIn): BoardOut {
  const probes = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_PROBE_STATS, params: [], map: toProbeStat })
  const traffic = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_CHANNEL_TRAFFIC, params: [], map: toTraffic })
  const budgets = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_BUDGETS, params: [], map: toBudget })
  const alerts = await queryRowsOrEmpty({ db: x.db, sql: SQL.OPS_ALERTS, params: [ROWS_MAX], map: toAlert })
  let saturation = DASH
  for (const b of budgets) {
    if (b.live) {
      saturation = pctOf({ used: b.used_usd, limit: b.limit_usd })
    }
  }
  const rows: WatchRow[] = []
  for (const channel of CHANNELS) {
    let sat = DASH
    if (channel === CH_ANTHROPIC) {
      sat = saturation
    }
    rows.push(channelRowOf({
      channel,
      probe: probeFor({ channel, stats: probes }),
      traffic: trafficFor({ channel, rows: traffic }),
      saturation: sat,
    }))
  }
  const outages = alerts.filter(isChannelAlert).map(toOutageRow)
  return {
    cards: goldenCardsOf({ probes, traffic, saturation }),
    tables: [
      tableOf({ title: TITLE.channels, cols: CHANNEL_COLS, rows }),
      tableOf({ title: TITLE.outages, cols: OUTAGE_COLS, rows: outages }),
    ],
    updatedAt: x.updatedAt,
  }
}

/**
 * 这个通道的探活汇总。
 *
 * @param x 通道与全部汇总。
 * @returns 汇总;没探过是 null。
 */
function probeFor(x: ChannelSignalIn): MaybeProbeStat {
  for (const p of x.stats) {
    if (p.channel === x.channel) {
      return p
    }
  }
  return null
}

/**
 * 这个通道的流量。
 *
 * @param x 通道与全部流量。
 * @returns 流量;没有是 null。
 */
function trafficFor(x: TrafficForIn): MaybeTraffic {
  for (const t of x.rows) {
    if (t.channel === x.channel) {
      return t
    }
  }
  return null
}

/**
 * 通道一行。
 *
 * @param x 通道、探活、流量与饱和度。
 * @returns 表格行。
 */
function channelRowOf(x: ChannelRowIn): WatchRow {
  let name = x.channel
  const known = CHANNEL_NAME[x.channel]
  if (known != null) {
    name = known
  }
  let requests = 0
  let errors = 0
  if (x.traffic != null) {
    requests = x.traffic.requests
    errors = x.traffic.errors
  }
  return {
    key: x.channel,
    cells: [
      textCell(name), availabilityOf(x.probe), textCell(latencyOf(x.probe)), textCell(intOf(requests)),
      textCell(ratioOf({ part: errors, whole: requests })), textCell(x.saturation),
    ],
  }
}

/**
 * 可用性格:24 小时成功率,颜色看最近一次。
 *
 * @param p 探活汇总。
 * @returns 单元格。
 */
function availabilityOf(p: MaybeProbeStat): WatchCell {
  if (p == null) {
    return textCell(DASH)
  }
  let variant: WatchTag['variant'] = VAR.bad
  if (p.ok) {
    variant = VAR.ok
  }
  return tagsCell({ text: ratioOf({ part: p.n_ok, whole: p.n }), variant, warn: TEXT_NONE })
}

/**
 * 延迟文字。
 *
 * @param p 探活汇总。
 * @returns 文字。
 */
function latencyOf(p: MaybeProbeStat): OpsText {
  if (p == null || p.ms == null) {
    return DASH
  }
  return { key: MS_KEY, vars: { n: p.ms } }
}

/**
 * 四个黄金信号的卡。
 *
 * @param x 探活、流量与饱和度。
 * @returns 四格。
 */
function goldenCardsOf(x: GoldenIn): BoardCards {
  let sumMs = 0
  let countMs = 0
  for (const p of x.probes) {
    if (p.ms != null) {
      sumMs += p.ms
      countMs += 1
    }
  }
  let latency: OpsText = DASH
  if (countMs > 0) {
    latency = { key: MS_KEY, vars: { n: Math.round(sumMs / countMs) } }
  }
  let requests = 0
  let errors = 0
  for (const t of x.traffic) {
    requests += t.requests
    errors += t.errors
  }
  return [
    cardOf({ value: latency, label: CARD.latency }), cardOf({ value: intOf(requests), label: CARD.traffic }),
    cardOf({ value: ratioOf({ part: errors, whole: requests }), label: CARD.errors }), cardOf({ value: x.saturation, label: CARD.saturation }),
  ]
}

/**
 * 是不是通道规则触发的。
 *
 * @param a 事件。
 * @returns 是否。
 */
function isChannelAlert(a: AlertDbRow): boolean {
  return a.rule.startsWith(R_CHANNEL)
}

/**
 * 不可用记录 → 表格行。
 *
 * @param a 事件。
 * @returns 表格行。
 */
function toOutageRow(a: AlertDbRow): WatchRow {
  let end: OpsText = sayOf(TAG_FIRED)
  if (a.resolved_text != null) {
    end = a.resolved_text
  }
  return {
    key: String(a.id),
    cells: [textCell(ruleTextOf({ rule: a.rule, part: RULE_PART.target })), textCell(a.fired_text), textCell(end), condCellOf(a)],
  }
}
