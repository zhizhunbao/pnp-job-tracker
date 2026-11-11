/**
 * ops 组件域的函数:路径与页面的互推、表列构造、手机卡片取值、删除确认机的手柄。
 *
 * @author Frank
 * @time 2026-11-08 18:00:00
 */
import {
  SECS, SEC_ALIAS, SEC_APPLY, SEC_BUDGET, SEC_CHANNELS, SEC_COST, SEC_DEFAULT, SEC_EVALS, SEC_FRESH, SEC_INCIDENTS,
  SEC_KEYS, SEC_NAME, SEC_REPORT,
  SEC_ROUTES, SEC_RULES, SEC_SAVED, SEC_SCHEDULE, SEC_SITES, SEC_USAGE,
} from '@/lib/ops'
import { cssOf } from '@/components/css'
import { toast } from '@/components/toast'
import {
  ACT_FAIL_TEXT, API_ALERT, API_REMOVE, CAT_CHANNEL, CAT_CHANNEL_TEXT, CAT_INCIDENT, CAT_INCIDENT_TEXT,
  COPY_FAIL_TEXT, COPY_OK_TEXT, TOAST_ERR, TOAST_OK, CAT_FEE, CAT_FEE_TEXT, CAT_QUEUE,
  CAT_QUEUE_TEXT, CAT_REPORT_TEXT, CELL_NAMED, CELL_TEXT, HDR_CONTENT_TYPE,
  METHOD_POST,
  MIME_JSON,
  NAV_COUNT_NONE,
  NOTE_SEP, PATH_OPS, PATH_SEP, TEXT_NONE,
} from './constants'
import css from './ops.module.css'
import type {
  AlertActIn, CardsSayIn, CopyMakeIn,
  DelAskFn, DelOkIn, DelOpenIn, NavSayIn, OpsCardView, OpsCellMakeIn, OpsColsIn, OpsNavIcons, OpsNavItem, OpsRow,
  OpsSoloIn, OpsTableCol, PickIn, PickText, RowPartsIn, RowCardParts, SayIn, TFn,
} from './types'

/**
 * 一段要显示的文字取成当前语言:数据原文原样给,界面文字按词条键取词。
 *
 * @param x 取词与文字。
 * @returns 显示的文字。
 */
export function sayOf(x: SayIn): string {
  if (typeof x.s === 'string') {
    return x.s
  }
  return x.t(x.s.key, x.s.vars)
}

/**
 * 从路径认出当前页。
 *
 * @param path 当前路径。
 * @returns 页面 id;认不出是默认页。
 */
export function secOfPath(path: string): string {
  const parts = path.split(PATH_SEP)
  const last = parts[parts.length - 1]
  if (last != null && SECS.includes(last)) {
    return last
  }
  return SEC_DEFAULT
}

/**
 * 页面的路径。
 *
 * @param sec 页面 id。
 * @returns 路径。
 */
export function hrefOf(sec: string): string {
  if (sec === SEC_DEFAULT) {
    return PATH_OPS
  }
  return PATH_OPS + PATH_SEP + sec
}

/**
 * 页名。
 *
 * @param sec 页面 id。
 * @returns 页名。
 */
export function secNameOf(sec: string): string {
  const name = SEC_NAME[sec]
  if (name == null) {
    return TEXT_NONE
  }
  return name
}

/**
 * 手机分区条的两段字。
 *
 * @param sec 页面 id。
 * @returns 分类与子项。
 */
export function pickTextOf(x: PickIn): PickText {
  const sec = x.sec
  const name = x.t(secNameOf(sec))
  if (sec === SEC_APPLY || sec === SEC_SITES || sec === SEC_ALIAS) {
    return { head: x.t(CAT_QUEUE_TEXT), sub: name }
  }
  if (sec === SEC_USAGE || sec === SEC_COST || sec === SEC_BUDGET) {
    return { head: x.t(CAT_FEE_TEXT), sub: name }
  }
  if (sec === SEC_INCIDENTS || sec === SEC_RULES) {
    return { head: x.t(CAT_INCIDENT_TEXT), sub: name }
  }
  if (sec === SEC_CHANNELS || sec === SEC_ROUTES || sec === SEC_EVALS) {
    return { head: x.t(CAT_CHANNEL_TEXT), sub: name }
  }
  if (sec === SEC_REPORT) {
    return { head: x.t(CAT_REPORT_TEXT), sub: TEXT_NONE }
  }
  return { head: name, sub: TEXT_NONE }
}

/**
 * 表的列声明。
 *
 * @param x 这张表与单元格渲染件。
 * @returns 通用 Table 的列。
 */
export function opsColsOf(x: OpsColsIn): OpsTableCol[] {
  const cols: OpsTableCol[] = []
  for (const [index, c] of x.table.cols.entries()) {
    const render = makeOpsCell({ index, Cell: x.Cell, t: x.t })
    if (c.wrap) {
      cols.push({ key: String(index), label: x.t(c.label), className: cssOf(css.wrap), render })
    } else {
      cols.push({ key: String(index), label: x.t(c.label), nowrap: true, render })
    }
  }
  return cols
}

/**
 * 造第 i 列的取值函数。
 *
 * @param x 列序号与单元格渲染件。
 * @returns 通用 Table 的 render。
 */
function makeOpsCell(x: OpsCellMakeIn): OpsTableCol['render'] {
  return function opsCell(r: OpsRow) {
    const cell = r.cells[x.index]
    if (cell == null) {
      return null
    }
    return x.Cell({ cell, t: x.t })
  }
}

/**
 * 侧栏的全部项。
 *
 * @param icons 三个分类的图标。
 * @returns 导航项。
 */
export function opsNavItemsOf(icons: OpsNavIcons): OpsNavItem[] {
  return [
    {
      key: SEC_REPORT,
      label: CAT_REPORT_TEXT,
      icon: icons.report,
      count: NAV_COUNT_NONE,
      href: hrefOf(SEC_REPORT),
      subs: [],
    },
    {
      key: CAT_INCIDENT,
      label: CAT_INCIDENT_TEXT,
      icon: icons.incident,
      count: NAV_COUNT_NONE,
      href: null,
      subs: [subOf(SEC_INCIDENTS), subOf(SEC_RULES)],
    },
    {
      key: SEC_SCHEDULE,
      label: secNameOf(SEC_SCHEDULE),
      icon: icons.schedule,
      count: NAV_COUNT_NONE,
      href: hrefOf(SEC_SCHEDULE),
      subs: [],
    },
    {
      key: CAT_QUEUE,
      label: CAT_QUEUE_TEXT,
      icon: icons.queue,
      count: NAV_COUNT_NONE,
      href: null,
      subs: [subOf(SEC_APPLY), subOf(SEC_SITES), subOf(SEC_ALIAS)],
    },
    {
      key: SEC_FRESH,
      label: secNameOf(SEC_FRESH),
      icon: icons.fresh,
      count: NAV_COUNT_NONE,
      href: hrefOf(SEC_FRESH),
      subs: [],
    },
    {
      key: CAT_CHANNEL,
      label: CAT_CHANNEL_TEXT,
      icon: icons.channel,
      count: NAV_COUNT_NONE,
      href: null,
      subs: [subOf(SEC_CHANNELS), subOf(SEC_ROUTES), subOf(SEC_EVALS)],
    },
    {
      key: CAT_FEE,
      label: CAT_FEE_TEXT,
      icon: icons.fee,
      count: NAV_COUNT_NONE,
      href: null,
      subs: [subOf(SEC_USAGE), subOf(SEC_COST), subOf(SEC_BUDGET)],
    },
    {
      key: SEC_KEYS,
      label: secNameOf(SEC_KEYS),
      icon: icons.access,
      count: NAV_COUNT_NONE,
      href: hrefOf(SEC_KEYS),
      subs: [],
    },
    soloOf({ sec: SEC_SAVED, icon: icons.saved }),
  ]
}

/**
 * 一个不带子项的顶层项。
 *
 * @param x 页面 id 与图标。
 * @returns 导航项。
 */
function soloOf(x: OpsSoloIn): OpsNavItem {
  return { key: x.sec, label: secNameOf(x.sec), icon: x.icon, count: NAV_COUNT_NONE, href: hrefOf(x.sec), subs: [] }
}

/**
 * 一个子项。
 *
 * @param sec 页面 id。
 * @returns 导航项。
 */
function subOf(sec: string): OpsNavItem {
  return { key: sec, label: secNameOf(sec), icon: null, count: NAV_COUNT_NONE, href: hrefOf(sec), subs: [] }
}

/**
 * 行身份。
 *
 * @param r 行。
 * @returns 行身份。
 */
export function opsRowKeyOf(r: OpsRow): string {
  return r.key
}

/**
 * 手机卡片的标题与正文:第一个文字格当标题,其余文字用逗号接成一行。
 *
 * @param r 行。
 * @returns 标题与正文。
 */
export function rowCardPartsOf(x: RowPartsIn): RowCardParts {
  const texts: string[] = []
  for (const c of x.row.cells) {
    if (c.kind === CELL_TEXT) {
      texts.push(sayOf({ t: x.t, s: c.text }))
    }
    if (c.kind === CELL_NAMED) {
      texts.push(sayOf({ t: x.t, s: c.main }))
    }
  }
  let title = TEXT_NONE
  const first = texts[0]
  if (first != null) {
    title = first
  }
  return { title, note: texts.slice(1).join(NOTE_SEP) }
}

/**
 * 造复制报错钮的点击手柄:写进剪贴板,成败都给提示。
 *
 * @param text 报错全文。
 * @returns 点击手柄。
 */
export function makeCopyError(x: CopyMakeIn): () => void {
  return function copyError(): void {
    navigator.clipboard.writeText(x.text).then(makeCopyDone(x.t)).catch(makeCopyFail(x.t))
  }
}

/**
 * 复制成功的提示。
 */
function makeCopyDone(t: TFn): () => void {
  return function copyDone(): void {
    toast({ kind: TOAST_OK, title: t(COPY_OK_TEXT) })
  }
}

/**
 * 复制失败的提示(出错不静默)。
 */
function makeCopyFail(t: TFn): () => void {
  return function copyFail(): void {
    toast({ kind: TOAST_ERR, title: t(COPY_FAIL_TEXT) })
  }
}

/**
 * 造行内删除钮的点击手柄。
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
 * 造确认框「删除」:关框、调接口,成了重取,没成挂「删除失败」。
 *
 * @param x 删除确认机的手柄。
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
 * 造删除接口回来后的手柄。
 *
 * @param x 删除确认机的手柄。
 * @returns 响应手柄。
 */
function makeDelDone(x: DelOkIn): (r: Response) => void {
  return function delDone(r: Response): void {
    if (r.ok) {
      x.refresh()
      return
    }
    x.setFailed(true)
  }
}

/**
 * 造删除接口打不通的手柄。
 *
 * @param x 删除确认机的手柄。
 * @returns 失败手柄。
 */
function makeDelFail(x: DelOkIn): () => void {
  return function delFail(): void {
    x.setFailed(true)
  }
}

/**
 * 造确认框「取消」。
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
 * 造事件操作钮的点击手柄:调接口,成了重取,没成给提示。
 *
 * @param x 操作与重取手柄。
 * @returns 点击手柄。
 */
export function makeAlertAct(x: AlertActIn): () => void {
  return function alertAct(): void {
    fetch(API_ALERT, {
      method: METHOD_POST,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ id: x.act.id, state: x.act.to }),
    }).then(makeAlertDone(x)).catch(makeAlertFail(x.t))
  }
}

/**
 * 造事件接口回来后的手柄。
 *
 * @param x 操作与重取手柄。
 * @returns 响应手柄。
 */
function makeAlertDone(x: AlertActIn): (r: Response) => void {
  return function alertDone(r: Response): void {
    if (r.ok) {
      x.refresh()
      return
    }
    makeAlertFail(x.t)()
  }
}

/**
 * 事件操作失败的提示(出错不静默)。
 */
function makeAlertFail(t: TFn): () => void {
  return function alertFail(): void {
    toast({ kind: TOAST_ERR, title: t(ACT_FAIL_TEXT) })
  }
}

/**
 * 导航项的文字取成当前语言(opsNavItemsOf 给的 label 是词条键)。
 *
 * @param x 导航项与取词。
 * @returns 文字已取好的导航项。
 */
export function navSayOf(x: NavSayIn): OpsNavItem[] {
  const out: OpsNavItem[] = []
  for (const it of x.items) {
    const subs: OpsNavItem[] = []
    for (const s of it.subs) {
      subs.push({ key: s.key, label: x.t(s.label), icon: s.icon, count: s.count, href: s.href, subs: [] })
    }
    out.push({ key: it.key, label: x.t(it.label), icon: it.icon, count: it.count, href: it.href, subs })
  }
  return out
}

/**
 * 四格的文字取成当前语言。
 *
 * @param x 四格与取词。
 * @returns 取词后的四格。
 */
export function cardsSayOf(x: CardsSayIn): OpsCardView[] {
  const out: OpsCardView[] = []
  for (const c of x.cards) {
    out.push({ value: sayOf({ t: x.t, s: c.value }), label: x.t(c.label) })
  }
  return out
}
