/**
 * queue 域(/queue 管理员队列页)的函数:整块看板的洗行(事实行 → 展示行)、四张表的列组与逐列取值、
 * 时长与计数的文字,末尾是四条查询与「此刻」的行构造器(库原始行 → 事实行)。
 * 零 hook;排版归 queue.tsx 与两枚小件,死值归 constants.ts。本文件**不 import payload**:
 * 取数由页面门把连接注进 `queryRowsOrEmpty`,这里只收洗净的事实行(同 funnel)。
 *
 * @author Frank
 * @time 2026-11-05 23:30:00
 */
import { count, text, textOrNull } from '@/lib/db'
import { cssOf } from '@/components/css'
import {
  API_REMOVE, COL_ACT_KEY, COL_ACT_TEXT, DEL_ALIAS, DEL_APPLY, DEL_NAME_SEP, DEL_SITE, DEL_UNIT, HDR_CONTENT_TYPE,
  METHOD_POST, MIME_JSON,
  AGO_TAIL, APPLY_QUEUED, COL_COMPANY_KEY, COL_COMPANY_TEXT, COL_EMPLOYER_TEXT, COL_EVERY_KEY, COL_EVERY_TEXT,
  COL_JOB_KEY, COL_JOB_TEXT, COL_LAST_KEY, COL_LAST_TEXT, COL_NAME_KEY, COL_NEXT_TEXT, COL_NOTE_KEY, COL_NOTE_TEXT,
  COL_OPENS_TEXT, COL_SEEN_TEXT, COL_STATE_KEY, COL_STATE_TEXT, COL_TIMES_KEY, COL_UNIT_TEXT, COL_USER_KEY,
  COL_USER_TEXT, COL_WAIT_TEXT, COL_WHEN_KEY, COL_WORKER_KEY, COL_WORKER_TEXT, COUNT_TAIL, DASH, DAY_S, EVERY_HEAD,
  HOUR_S, IN_TAIL, ISO_NONE, LATE_HEAD, LOST_S, MINUTE_S, RAN_HEAD, SHOWN_HEAD, SHOWN_MID, STAGE_QUEUED, STAGE_TEXT,
  STUCK_S, TAG_CURATED_TEXT, TAG_FAIL_TEXT, TAG_LLM_TEXT, TAG_LOST_TEXT, TAG_OUT_POOL_TEXT, TAG_QUEUED_TEXT,
  TAG_RUN_TEXT, TAG_SENDING_TEXT, TAG_STUCK_TEXT, TAG_WAIT_TEXT, TEXT_NONE, TIMES_TAIL, UNIT_DAY_TEXT, UNIT_HOUR_TEXT,
  UNIT_LLM, UNIT_MIN_TEXT, UNIT_RUN, UNIT_SEC_TEXT, VAR_BAD, VAR_GRAY, VAR_INFO, VAR_WARN, WORKER_FIND_TEXT,
  WORKER_VISIT_TEXT,
} from './constants'
import { TagsCell } from './tagscell'
import css from './queue.module.css'
import type {
  AliasDbRow, AliasFact, AliasRow, ApplyDbRow, ApplyFact, ApplyRow, CountTextIn, KeyedRow, NowDbRow, QueueBoard,
  ActRenderFn, DelAskFn, DelOkIn, DelOpenIn, QueueBoardIn, QueueCol, QueueVariant, SiteDbRow, SiteFact, SiteRow,
  TotalRow, UnitDbRow, UnitFact, UnitRow,
} from './types'

/**
 * 四条查询的事实行洗成整块看板。投递 / 官网 / 译名三张卡的总条数取首行带回的 total(不截断的数),
 * 调度单元不截断,条数就是行数。
 *
 * @param x 四条查询与此刻各自洗好的事实行。
 * @returns 看板展示数据。
 */
export function toQueueBoard(x: QueueBoardIn): QueueBoard {
  let updatedAt = ISO_NONE
  const first = x.now[0]
  if (first != null) {
    updatedAt = first
  }
  return {
    units: x.units.map(toUnitRow),
    unitsCount: countTextOf({ shown: x.units.length, total: x.units.length }),
    apply: x.apply.map(toApplyRow),
    applyCount: countTextOf({ shown: x.apply.length, total: totalOf(x.apply) }),
    sites: x.sites.map(toSiteRow),
    sitesCount: countTextOf({ shown: x.sites.length, total: totalOf(x.sites) }),
    alias: x.alias.map(toAliasRow),
    aliasCount: countTextOf({ shown: x.alias.length, total: totalOf(x.alias) }),
    updatedAt,
  }
}

/**
 * 一张卡的总条数(首行带回的 total;一行都没有 = 0)。
 *
 * @param rows 带 total 的事实行。
 * @returns 总条数。
 */
export function totalOf(rows: TotalRow[]): number {
  const first = rows[0]
  if (first == null) {
    return 0
  }
  return first.total
}

/**
 * 卡头灰字计数:没截断「12 条」,截断了「前 100 条,共 230 条」。
 *
 * @param x 列出几条与总条数。
 * @returns 计数文字。
 */
export function countTextOf(x: CountTextIn): string {
  if (x.total > x.shown) {
    return SHOWN_HEAD + x.shown + SHOWN_MID + x.total + COUNT_TAIL
  }
  return x.total + COUNT_TAIL
}

/**
 * 调度单元事实行 → 展示行。状态:正在跑(蓝)/ 等盒子(黄)/ 过点 LOST_S 还没开跑 = 失联(红)/ 其余排队(灰);
 * 上一轮失败再挂一枚红胶囊。
 *
 * @param u 事实行。
 * @returns 展示行。
 */
export function toUnitRow(u: UnitFact): UnitRow {
  let tagText = TAG_WAIT_TEXT
  let tagVariant: QueueVariant = VAR_GRAY
  if (u.state === UNIT_RUN) {
    tagText = TAG_RUN_TEXT
    tagVariant = VAR_INFO
  } else if (u.state === UNIT_LLM) {
    tagText = TAG_LLM_TEXT
    tagVariant = VAR_WARN
  } else if (u.dueS != null && u.dueS < -LOST_S) {
    tagText = TAG_LOST_TEXT
    tagVariant = VAR_BAD
  }
  let warnText = TEXT_NONE
  if (u.lastOk === false) {
    warnText = TAG_FAIL_TEXT
  }
  let lastText = DASH
  if (u.agoS != null) {
    lastText = spanTextOf(u.agoS) + AGO_TAIL
  }
  return {
    key: u.name,
    name: u.name,
    tagText,
    tagVariant,
    warnText,
    whenText: unitWhenOf(u),
    lastText,
    everyText: EVERY_HEAD + spanTextOf(u.intervalS),
    del: { kind: DEL_UNIT, key: u.name, name: u.name },
  }
}

/**
 * 调度单元的时间格:正在跑报已跑多久;其余报下一轮多久后,过了点报过点多久。
 *
 * @param u 事实行。
 * @returns 时间文字;不知道 = 横线。
 */
export function unitWhenOf(u: UnitFact): string {
  if (u.state === UNIT_RUN) {
    if (u.runS == null) {
      return DASH
    }
    return RAN_HEAD + spanTextOf(u.runS)
  }
  if (u.dueS == null) {
    return DASH
  }
  if (u.dueS < 0) {
    return LATE_HEAD + spanTextOf(-u.dueS)
  }
  return spanTextOf(u.dueS) + IN_TAIL
}

/**
 * 投递事实行 → 展示行。待投灰、正在发蓝;正在发超过 STUCK_S 再挂一枚「卡住」。
 *
 * @param a 事实行。
 * @returns 展示行。
 */
export function toApplyRow(a: ApplyFact): ApplyRow {
  let tagText = TAG_SENDING_TEXT
  let tagVariant: QueueVariant = VAR_INFO
  let warnText = TEXT_NONE
  if (a.status === APPLY_QUEUED) {
    tagText = TAG_QUEUED_TEXT
    tagVariant = VAR_GRAY
  } else if (a.ageS > STUCK_S) {
    warnText = TAG_STUCK_TEXT
  }
  return {
    key: String(a.id),
    email: dashIfEmpty(a.email),
    jobTitle: dashIfEmpty(a.jobTitle),
    company: dashIfEmpty(a.company),
    tagText,
    tagVariant,
    warnText,
    ageText: spanTextOf(a.ageS),
    del: { kind: DEL_APPLY, key: String(a.id), name: a.jobTitle + DEL_NAME_SEP + a.company },
  }
}

/**
 * 官网抓取事实行 → 展示行。排队中灰、在办(查找 / 抓取 / 整理)蓝;两种取不到的再挂一枚红胶囊:
 * 公司已不在雇主板(「已不在雇主板」,先判)、人工核定过(「已核定不取」)—— 两个工人取活都跳过,会一直卡在队里。工人:有官网归抓官网,没有归找官网。
 *
 * @param s 事实行。
 * @returns 展示行。
 */
export function toSiteRow(s: SiteFact): SiteRow {
  let tagVariant: QueueVariant = VAR_INFO
  if (s.stage === STAGE_QUEUED) {
    tagVariant = VAR_GRAY
  }
  let tagText = s.stage
  const label = STAGE_TEXT[s.stage]
  if (label != null) {
    tagText = label
  }
  let warnText = TEXT_NONE
  if (s.inPool === false) {
    warnText = TAG_OUT_POOL_TEXT
  } else if (s.curated) {
    warnText = TAG_CURATED_TEXT
  }
  let workerText = WORKER_FIND_TEXT
  if (s.hasSite) {
    workerText = WORKER_VISIT_TEXT
  }
  let ageText = DASH
  if (s.ageS != null) {
    ageText = spanTextOf(s.ageS)
  }
  return {
    key: s.key,
    name: s.name,
    tagText,
    tagVariant,
    warnText,
    workerText,
    timesText: s.openCount + TIMES_TAIL,
    ageText,
    noteText: dashIfEmpty(s.note),
    del: { kind: DEL_SITE, key: s.key, name: s.name },
  }
}

/**
 * 译名事实行 → 展示行。
 *
 * @param a 事实行。
 * @returns 展示行。
 */
export function toAliasRow(a: AliasFact): AliasRow {
  return {
    key: a.key,
    name: a.name,
    timesText: a.seenCount + TIMES_TAIL,
    ageText: spanTextOf(a.ageS),
    del: { kind: DEL_ALIAS, key: a.key, name: a.name },
  }
}

/**
 * 空串显示成横线(格子不留白,一眼看出是没有)。
 *
 * @param s 文字。
 * @returns 原文或横线。
 */
export function dashIfEmpty(s: string): string {
  if (s === TEXT_NONE) {
    return DASH
  }
  return s
}

/**
 * 秒数 → 人读时长(取最大的整单位,向下取整):45 秒、12 分钟、3 小时、2 天。
 *
 * @param s 秒数(非负)。
 * @returns 时长文字。
 */
export function spanTextOf(s: number): string {
  if (s >= DAY_S) {
    return Math.floor(s / DAY_S) + UNIT_DAY_TEXT
  }
  if (s >= HOUR_S) {
    return Math.floor(s / HOUR_S) + UNIT_HOUR_TEXT
  }
  if (s >= MINUTE_S) {
    return Math.floor(s / MINUTE_S) + UNIT_MIN_TEXT
  }
  return Math.max(0, Math.floor(s)) + UNIT_SEC_TEXT
}

/**
 * 调度单元表的列组。
 *
 * @param act 操作格渲染器(删除钮;由 Queue 递进来,本文件不引组件件,免得和删除钮互相 import 成环)。
 * @returns 列声明。
 */
export function unitColsOf(act: ActRenderFn): QueueCol<UnitRow>[] {
  return [
    { key: COL_NAME_KEY, label: COL_UNIT_TEXT, nowrap: true, render: unitNameOf },
    { key: COL_STATE_KEY, label: COL_STATE_TEXT, nowrap: true, render: TagsCell },
    { key: COL_WHEN_KEY, label: COL_NEXT_TEXT, nowrap: true, render: unitWhenTextOf },
    { key: COL_LAST_KEY, label: COL_LAST_TEXT, nowrap: true, render: unitLastOf },
    { key: COL_EVERY_KEY, label: COL_EVERY_TEXT, nowrap: true, render: unitEveryOf },
    { key: COL_ACT_KEY, label: COL_ACT_TEXT, nowrap: true, render: act },
  ]
}

/**
 * 调度单元表「单元」列。
 *
 * @param r 展示行。
 * @returns 单元名。
 */
export function unitNameOf(r: UnitRow): string {
  return r.name
}

/**
 * 调度单元表「时间」列。
 *
 * @param r 展示行。
 * @returns 时间文字。
 */
export function unitWhenTextOf(r: UnitRow): string {
  return r.whenText
}

/**
 * 调度单元表「上一轮」列。
 *
 * @param r 展示行。
 * @returns 多久前跑完。
 */
export function unitLastOf(r: UnitRow): string {
  return r.lastText
}

/**
 * 调度单元表「节奏」列。
 *
 * @param r 展示行。
 * @returns 节奏文字。
 */
export function unitEveryOf(r: UnitRow): string {
  return r.everyText
}

/**
 * 投递待发表的列组。
 *
 * @param act 操作格渲染器(删除钮;由 Queue 递进来,本文件不引组件件,免得和删除钮互相 import 成环)。
 * @returns 列声明。
 */
export function applyColsOf(act: ActRenderFn): QueueCol<ApplyRow>[] {
  return [
    { key: COL_USER_KEY, label: COL_USER_TEXT, className: cssOf(css.wrap), render: applyEmailOf },
    { key: COL_JOB_KEY, label: COL_JOB_TEXT, className: cssOf(css.wrap), render: applyJobOf },
    { key: COL_COMPANY_KEY, label: COL_COMPANY_TEXT, className: cssOf(css.wrap), render: applyCompanyOf },
    { key: COL_STATE_KEY, label: COL_STATE_TEXT, nowrap: true, render: TagsCell },
    { key: COL_WHEN_KEY, label: COL_WAIT_TEXT, nowrap: true, render: applyAgeOf },
    { key: COL_ACT_KEY, label: COL_ACT_TEXT, nowrap: true, render: act },
  ]
}

/**
 * 投递待发表「用户」列。
 *
 * @param r 展示行。
 * @returns 邮箱。
 */
export function applyEmailOf(r: ApplyRow): string {
  return r.email
}

/**
 * 投递待发表「职位」列。
 *
 * @param r 展示行。
 * @returns 职位名。
 */
export function applyJobOf(r: ApplyRow): string {
  return r.jobTitle
}

/**
 * 投递待发表「公司」列。
 *
 * @param r 展示行。
 * @returns 公司名。
 */
export function applyCompanyOf(r: ApplyRow): string {
  return r.company
}

/**
 * 投递待发表「等了」列。
 *
 * @param r 展示行。
 * @returns 等了多久。
 */
export function applyAgeOf(r: ApplyRow): string {
  return r.ageText
}

/**
 * 官网抓取表的列组。
 *
 * @param act 操作格渲染器(删除钮;由 Queue 递进来,本文件不引组件件,免得和删除钮互相 import 成环)。
 * @returns 列声明。
 */
export function siteColsOf(act: ActRenderFn): QueueCol<SiteRow>[] {
  return [
    { key: COL_NAME_KEY, label: COL_COMPANY_TEXT, className: cssOf(css.wrap), render: siteNameOf },
    { key: COL_STATE_KEY, label: COL_STATE_TEXT, nowrap: true, render: TagsCell },
    { key: COL_WORKER_KEY, label: COL_WORKER_TEXT, nowrap: true, render: siteWorkerOf },
    { key: COL_TIMES_KEY, label: COL_OPENS_TEXT, nowrap: true, render: siteTimesOf },
    { key: COL_WHEN_KEY, label: COL_WAIT_TEXT, nowrap: true, render: siteAgeOf },
    { key: COL_NOTE_KEY, label: COL_NOTE_TEXT, className: cssOf(css.wrap), render: siteNoteOf },
    { key: COL_ACT_KEY, label: COL_ACT_TEXT, nowrap: true, render: act },
  ]
}

/**
 * 官网抓取表「公司」列。
 *
 * @param r 展示行。
 * @returns 公司名。
 */
export function siteNameOf(r: SiteRow): string {
  return r.name
}

/**
 * 官网抓取表「工人」列。
 *
 * @param r 展示行。
 * @returns 归哪个工人。
 */
export function siteWorkerOf(r: SiteRow): string {
  return r.workerText
}

/**
 * 官网抓取表「点开」列。
 *
 * @param r 展示行。
 * @returns 点开几次。
 */
export function siteTimesOf(r: SiteRow): string {
  return r.timesText
}

/**
 * 官网抓取表「等了」列。
 *
 * @param r 展示行。
 * @returns 等了多久。
 */
export function siteAgeOf(r: SiteRow): string {
  return r.ageText
}

/**
 * 官网抓取表「由头」列。
 *
 * @param r 展示行。
 * @returns 由头。
 */
export function siteNoteOf(r: SiteRow): string {
  return r.noteText
}

/**
 * 译名翻译表的列组。
 *
 * @param act 操作格渲染器(删除钮;由 Queue 递进来,本文件不引组件件,免得和删除钮互相 import 成环)。
 * @returns 列声明。
 */
export function aliasColsOf(act: ActRenderFn): QueueCol<AliasRow>[] {
  return [
    { key: COL_NAME_KEY, label: COL_EMPLOYER_TEXT, className: cssOf(css.wrap), render: aliasNameOf },
    { key: COL_TIMES_KEY, label: COL_SEEN_TEXT, nowrap: true, render: aliasTimesOf },
    { key: COL_WHEN_KEY, label: COL_WAIT_TEXT, nowrap: true, render: aliasAgeOf },
    { key: COL_ACT_KEY, label: COL_ACT_TEXT, nowrap: true, render: act },
  ]
}

/**
 * 译名翻译表「雇主」列。
 *
 * @param r 展示行。
 * @returns 雇主名。
 */
export function aliasNameOf(r: AliasRow): string {
  return r.name
}

/**
 * 译名翻译表「被列出」列。
 *
 * @param r 展示行。
 * @returns 被列出几次。
 */
export function aliasTimesOf(r: AliasRow): string {
  return r.timesText
}

/**
 * 译名翻译表「等了」列。
 *
 * @param r 展示行。
 * @returns 等了多久。
 */
export function aliasAgeOf(r: AliasRow): string {
  return r.ageText
}

/**
 * 四张表共用的行身份取值。
 *
 * @param r 带 key 的展示行。
 * @returns 行身份。
 */
export function queueRowKeyOf(r: KeyedRow): string {
  return r.key
}

/**
 * 造行内删除钮的点击手柄:把这一条交给确认框(站规 2026-10-12:删除一律先弹框确认)。
 *
 * @param x 拨框手柄与要删的那一条。
 * @returns 点击手柄。
 */
export function makeDelOpen(x: DelOpenIn): () => void {
  return function delOpen(): void {
    if (x.setAsk != null) {
      x.setAsk(x.del)
    }
  }
}

/**
 * 造确认框「删除」:关框、调删除接口,成了重取服务端数据,没成在标题卡挂「删除失败」。
 *
 * @param x 等着确认的那一条与三个手柄。
 * @returns 点击手柄。
 */
export function makeDelOk(x: DelOkIn): () => void {
  return function delOk(): void {
    const ask = x.ask
    x.setAsk(null)
    if (ask == null) {
      return
    }
    x.setFailed(false)
    fetch(API_REMOVE, {
      method: METHOD_POST,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ kind: ask.kind, key: ask.key }),
    }).then(makeDelDone(x)).catch(makeDelFail(x))
  }
}

/**
 * 造删除接口回来后的手柄:2xx 重取,其余挂「删除失败」。
 *
 * @param x 删除确认机的手柄。
 * @returns 响应手柄。
 */
export function makeDelDone(x: DelOkIn): (r: Response) => void {
  return function delDone(r: Response): void {
    if (r.ok) {
      x.refresh()
      return
    }
    x.setFailed(true)
  }
}

/**
 * 造删除接口打不通的手柄:挂「删除失败」(出错不静默)。
 *
 * @param x 删除确认机的手柄。
 * @returns 失败手柄。
 */
export function makeDelFail(x: DelOkIn): () => void {
  return function delFail(): void {
    x.setFailed(true)
  }
}

/**
 * 造确认框「取消」:关框。
 *
 * @param setAsk 拨框手柄。
 * @returns 点击手柄。
 */
export function makeDelClose(setAsk: DelAskFn): () => void {
  return function delClose(): void {
    setAsk(null)
  }
}

/**
 * `SQL.QUEUE_UNITS` 的行构造器。秒数格空是事实(没开跑过 / 没跑完过),保 null 不折 0。
 *
 * @param row 库原始行。
 * @returns 事实行。
 */
export function toUnitFact(row: UnitDbRow): UnitFact {
  return {
    name: text(row.name),
    intervalS: count(row.interval_s),
    state: text(row.state),
    lastOk: row.last_ok,
    runS: row.run_s,
    agoS: row.ago_s,
    dueS: row.due_s,
  }
}

/**
 * `SQL.QUEUE_APPLY` 的行构造器。快照名与邮箱缺了落空串(展示行再换横线)。
 *
 * @param row 库原始行。
 * @returns 事实行。
 */
export function toApplyFact(row: ApplyDbRow): ApplyFact {
  return {
    id: count(row.id),
    status: text(row.status),
    jobTitle: text(row.job_title),
    company: text(row.company),
    email: text(row.email),
    ageS: count(row.age_s),
    total: count(row.total),
  }
}

/**
 * `SQL.QUEUE_SITES` 的行构造器。点开时刻空是事实(老数据没记),保 null。
 *
 * @param row 库原始行。
 * @returns 事实行。
 */
export function toSiteFact(row: SiteDbRow): SiteFact {
  let note = TEXT_NONE
  const n = textOrNull(row.stage_note)
  if (n != null) {
    note = n
  }
  return {
    key: text(row.key),
    name: text(row.name),
    stage: text(row.stage),
    openCount: count(row.open_count),
    note,
    hasSite: row.has_site,
    curated: row.curated,
    inPool: row.in_pool,
    ageS: row.age_s,
    total: count(row.total),
  }
}

/**
 * `SQL.QUEUE_ALIAS` 的行构造器。
 *
 * @param row 库原始行。
 * @returns 事实行。
 */
export function toAliasFact(row: AliasDbRow): AliasFact {
  return {
    key: text(row.key),
    name: text(row.name),
    seenCount: count(row.seen_count),
    ageS: count(row.age_s),
    total: count(row.total),
  }
}

/**
 * `SQL.QUEUE_NOW` 的行构造器:库的此刻 → ISO 串(右上角 Updated 吃 ISO)。
 *
 * @param row 库原始行。
 * @returns ISO 串。
 */
export function toNowIso(row: NowDbRow): string {
  return new Date(row.at).toISOString()
}
