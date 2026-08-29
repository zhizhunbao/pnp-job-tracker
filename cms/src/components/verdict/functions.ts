/**
 * verdict 域的函数:判定行的取词与配色、事实格的派生、条件格的分组与省页签数据、
 * 判定接口的加载步骤,以及各处点击手柄的工厂。零 JSX 零 hook ——
 * 排版归各件 tsx,状态归 hooks.ts,死值归 constants.ts。
 *
 * 分层不在这里:付费闸在服务端(`/api/ruling/verdict` 只给非 Pro 下发 gate/tier/key),
 * 本域拿到什么渲什么 —— locked 行天然没有 params,想漏都没得漏。
 * 文案四闸:零逗号标题 / 无解释句 / 术语 = 职业匹配·雇主资质·你这边 / 值一行放下。
 *
 * @author Frank
 * @time 2026-08-28 17:55:00
 */
import { cssOf } from '@/components/css'
import { makeT } from '@/lib/i18n'
import { reqStreamDisplay, streamDisplay } from '@/lib/jobs'
import { readAnswers, toEngineAnswers } from '@/lib/quiz'
import { track } from '@/lib/track'
import {
  API_VERDICT, CLS_SEP, CREDENTIALS_INCLUDE, EVT_CHAT_OPEN, GATE_EMPLOYER, GATE_OCCUPATION,
  HDR_CONTENT_TYPE, HTTP_POST, KEY_ENTRY_TITLE, KEY_ENTRY_TITLE_LG, KEY_GATE_HEAD, KEY_PATHWAY_HEAD,
  KEY_PROV_HEAD, KEY_SEP, LANG_KO, LANG_ZH, MIME_JSON, NOC_HEAD, ONLY_PROV, PROGRAM_AIP,
  ROW_COMPARE_HEAD, ROW_COMPARE_LISTED, ROW_COMPARE_NOT_LISTED, ROW_COMPARE_NO_TARGET,
  ROW_DESIGNAT_HEAD, ROW_EMP_DESIGNATED, ROW_EMP_DESIGNATED_MULTI, ROW_EMP_DESIGNATION_UNKNOWN,
  ROW_EMP_HEAD, ROW_EMP_PUBLIC_SECTOR, ROW_EMP_REVENUE, ROW_EMP_STAFF, ROW_EMP_STAFF_FACT,
  ROW_EMP_YEARS, ROW_NEXT_EMPLOYER, ROW_OCC_EXCLUDED, ROW_OCC_HEAD, ROW_OCC_LISTED, ROW_OCC_NOT_LISTED,
  ROW_OCC_NO_LIST, ROW_OCC_TEER, ROW_PERSON_EXPERIENCE, ROW_PERSON_HEAD, ROW_PERSON_LANGUAGE,
  ROW_ROUTE_FASTEST, ROW_SIGN_CH, ROW_STAFF_HEAD, ROW_TIME_PERMIT, ROW_YOU_GATE, ROW_YOU_HEAD,
  ROW_YOU_NOT_COLLECTED, STATE_COARSE, STATE_EXCLUDED, STATE_GAP, STATE_INFO, STATE_PASS,
  STATE_UNKNOWN, TEER_DASH, TEER_HEAD, TEER_SEP, TEXT_DASH, TEXT_NONE, TIER_FREE, TRACK_BUILD_PROFILE,
  TRACK_OPEN, URL_JOBS_Q_HEAD, URL_JOB_HEAD,
} from './constants'
import type {
  ActiveProvIn, BuildProfileIn, ClickFn, CompanyJobsHrefIn, ConditionRow, EditAnswersIn, EntryLgIn,
  FetchVerdictIn, FilledClsIn, GateRowsIn, GroupClsIn, GroupNamesIn, GroupRowsIn, HasLocalAnswersIn,
  HasProfileIn, InitialWireIn, JobHrefIn, LoadStopIn, MaybeRowText, MaybeVerdictWire, NeedsFetchIn,
  CityTextIn, MakeProvDispIn, ParamTextIn, PathwayNamesIn, ProvDispIn, ProvLabelFn, ProvRowsIn,
  RowLabelIn, RowStateIn, RowSubIn, RowTextIn,
  RowTileStateIn, RowsIn, StopFn, TFn, TabChangeIn, TabItemsIn, TeerAtIn, TeerPartIn, TeerRangeIn,
  TileClickIn, TileEditIn, TileFn, TitleTile, TitleTileIn, TOfIn, TrackClickIn, VerdictLoadIn,
  VerdictParams, VerdictTabItem, VerdictWire, VerdictWireRow, WireFactIn,
} from './types'
import css from './verdict.module.css'

/**
 * 界面语言 → 取词函数。
 *
 * @param x 界面语言。
 * @returns 取词函数。
 */
export function tOf(x: TOfIn): TFn {
  return makeT(x.lang)
}

/**
 * 省码 → 省显示名。表里没有这个省码就原样显示省码(不编一个省名出来)。
 *
 * @param x 取词函数与省码。
 * @returns 省显示名。
 */
export function provDispOf(x: ProvDispIn): string {
  const key = KEY_PROV_HEAD + x.code
  const full = x.t(key)
  if (full === key) {
    return x.code
  }
  return full
}

/**
 * 引擎给的插值 → 可拼进文案的字。缺席给空串 —— 不编一个「undefined」出来。
 *
 * @param x 引擎给的插值。
 * @returns 插值文本。
 */
function paramTextOf(x: ParamTextIn): string {
  if (x.v == null) {
    return TEXT_NONE
  }
  return String(x.v)
}

/**
 * 引擎给的插值 → 数(缺席算 0;认不出的原样交给调用方判 NaN)。
 *
 * @param x 引擎给的插值。
 * @returns 数值。
 */
function paramNumOf(x: ParamTextIn): number {
  if (x.v == null) {
    return 0
  }
  return Number(x.v)
}

/**
 * 引擎给的插值 → 字符串清单(不是数组就当空清单,不硬转)。
 *
 * @param x 引擎给的插值。
 * @returns 字符串清单。
 */
function paramListOf(x: ParamTextIn): string[] {
  if (Array.isArray(x.v)) {
    return x.v
  }
  return []
}

/**
 * 通道键清单 → 通道显示名清单。
 *
 * @param x 取词函数与通道键清单。
 * @returns 通道显示名清单。
 */
function pathwayNamesOf(x: PathwayNamesIn): string[] {
  const names: string[] = []
  for (const key of x.keys) {
    names.push(x.t(KEY_PATHWAY_HEAD + key))
  }
  return names
}

/**
 * TEER 档位的升序比较器。
 *
 * @param a 前一个档位。
 * @param b 后一个档位。
 * @returns 升序名次差。
 */
// eslint-disable-next-line local/one-parameter -- 签名由 Array.prototype.sort 定死(宪法钦定的逐行特批形态)
function byTeerAsc(a: number, b: number): number {
  return a - b
}

/**
 * 档位表里第几个的文本;取不到给空串(原样沿用旧版「取不到就不写」的口径)。
 *
 * @param x 排好序的档位表与位置。
 * @returns 档位文本。
 */
function teerTextAt(x: TeerAtIn): string {
  const v = x.list[x.at]
  if (v == null) {
    return TEXT_NONE
  }
  return String(v)
}

/**
 * 这一位的下一位是不是紧挨着的档位(连号才压成区间)。
 *
 * @param x 排好序的档位表与位置。
 * @returns 紧挨着就是 true。
 */
function isNextTeer(x: TeerAtIn): boolean {
  const cur = x.list[x.at]
  const next = x.list[x.at + 1]
  if (cur == null || next == null) {
    return false
  }
  return next === cur + 1
}

/**
 * 一段连号档位的文本(单个就写单个,多个写成区间)。
 *
 * @param x 排好序的档位表与这一段的首尾位置。
 * @returns 这一段的文本。
 */
function teerPartOf(x: TeerPartIn): string {
  const from = teerTextAt({ list: x.list, at: x.from })
  if (x.from === x.to) {
    return from
  }
  return from + TEER_DASH + teerTextAt({ list: x.list, at: x.to })
}

/**
 * TEER 档位表压成区间:[0,1,2,3] → 「0–3」;[0,1,4] → 「0–1、4」
 * (no-dot-separator:枚举用顿号)。
 *
 * @param x 引擎给的档位表。
 * @returns 压好的区间文本。
 */
function teerRangeOf(x: TeerRangeIn): string {
  const ns = x.list.map(Number).filter(Number.isInteger).sort(byTeerAsc)
  const parts: string[] = []
  let i = 0
  while (i < ns.length) {
    let j = i
    while (isNextTeer({ list: ns, at: j })) {
      j += 1
    }
    parts.push(teerPartOf({ list: ns, from: i, to: j }))
    i = j + 1
  }
  return parts.join(TEER_SEP)
}

/**
 * 这一行的插值包(锁行没有 params,给一个空包)。
 *
 * @param x 这条判定行。
 * @returns 插值包。
 */
function paramsOf(x: RowTextIn): VerdictParams {
  if (x.row.params == null) {
    return {}
  }
  return x.row.params
}

/**
 * 「职业未命中清单」行的文字。定向清单只绑它自己那条通道 → 适用范围写进主文案
 * (哪张清单、多少个职业),不再一句「未命中任何具名清单」判死。
 * **不配安慰句**:「不在清单上不等于走不了」是废话,清单名 + 职业数已经把范围说清了。
 *
 * @param x 取词函数、界面语言与这条判定行。
 * @returns 这一行的文字。
 */
function occNotListedTextOf(x: RowTextIn): MaybeRowText {
  const p = paramsOf(x)
  const prov = provDispOf({ t: x.t, code: paramTextOf({ v: p.prov }) })
  const n = paramNumOf({ v: p.listCount })
  if (n === 0 || Number.isNaN(n)) {
    return { main: x.t('tv.occ.notListedNone', { prov }) }
  }
  if (n === 1) {
    const list = streamDisplay({ t: x.t, label: paramTextOf({ v: p.list }) })
    return { main: x.t('tv.occ.notListedOne', { list, count: paramTextOf({ v: p.count }) }) }
  }
  return { main: x.t('tv.occ.notListedN', { prov, n }) }
}

/**
 * 本站 TEER 粗筛行的文字。2026-08-14 Frank「满足绿勾不满足红叉」:不再强制中性圆点,
 * 吃引擎的 pass/excluded 态。整行同日另被拍板从前端撤下(引擎照常产出供金标测试与顾问消费)。
 *
 * @param x 取词函数、界面语言与这条判定行。
 * @returns 这一行的文字。
 */
function occTeerTextOf(x: RowTextIn): MaybeRowText {
  const p = paramsOf(x)
  const prov = provDispOf({ t: x.t, code: paramTextOf({ v: p.prov }) })
  if (x.row.state === STATE_UNKNOWN) {
    return { main: x.t('tv.occ.teerNa'), icon: STATE_UNKNOWN }
  }
  let main = x.t('tv.occ.teerCoarse', { teer: paramTextOf({ v: p.teer }), prov })
  if (p.coarsePass === false) {
    main = x.t('tv.occ.teerCoarseNo', { teer: paramTextOf({ v: p.teer }), prov })
  }
  const scopeTeers = paramListOf({ v: p.scopeTeers })
  const stream = paramTextOf({ v: p.scopeStream })
  if (stream !== TEXT_NONE && scopeTeers.length > 0) {
    const label = reqStreamDisplay({ stream, lang: x.lang })
    return { main, sub: x.t('tv.occ.teerScope', { stream: label, teers: teerRangeOf({ list: scopeTeers }) }) }
  }
  if (p.scoped === false) {
    return { main, sub: x.t('tv.occ.teerNoScope', { prov }) }
  }
  return { main }
}

/**
 * 职业匹配关各行的文字。
 *
 * @param x 取词函数、界面语言与这条判定行。
 * @returns 这一行的文字;本域没排版的行键给 null。
 */
function occRowTextOf(x: RowTextIn): MaybeRowText {
  const p = paramsOf(x)
  const prov = provDispOf({ t: x.t, code: paramTextOf({ v: p.prov }) })
  if (x.row.key === ROW_OCC_LISTED) {
    const list = streamDisplay({ t: x.t, label: paramTextOf({ v: p.list }) })
    return { main: x.t('tv.occ.listed', { list }) }
  }
  if (x.row.key === ROW_OCC_EXCLUDED) {
    const list = streamDisplay({ t: x.t, label: paramTextOf({ v: p.list }) })
    return { main: x.t('tv.occ.excluded', { list }) }
  }
  if (x.row.key === ROW_OCC_NOT_LISTED) {
    return occNotListedTextOf(x)
  }
  if (x.row.key === ROW_OCC_NO_LIST) {
    return { main: x.t('tv.occ.noList', { prov }), icon: STATE_COARSE }
  }
  if (x.row.key === ROW_OCC_TEER) {
    return occTeerTextOf(x)
  }
  return null
}

/**
 * 「你这边」两条免费行的文字:被卡住的那道闸,以及本站没收录门槛的通道
 * (说清是**我们的窟窿**并指路官网 —— ≠「官方不要求」,≠「你不行」)。
 *
 * @param x 取词函数、界面语言与这条判定行。
 * @returns 这一行的文字;没有通道可报时给 null。
 */
function youRowTextOf(x: RowTextIn): MaybeRowText {
  const p = paramsOf(x)
  if (x.row.key === ROW_YOU_GATE) {
    const gate = x.t(KEY_GATE_HEAD + paramTextOf({ v: p.gate }))
    return { main: x.t('tv.you.gateRow', { gate }) }
  }
  if (x.row.key === ROW_YOU_NOT_COLLECTED) {
    const routes = pathwayNamesOf({ t: x.t, keys: paramListOf({ v: p.routes }) })
    if (routes.length === 0) {
      return null
    }
    return { main: x.t('tv.you.notCollectedRow', { routes: routes.join(x.t(KEY_SEP)) }) }
  }
  return null
}

/**
 * 雇主资质关的两条名录行:在册与同名多家。多配只报家数不点名 ——
 * 点名等于替用户认了一家不可证的雇主。
 *
 * @param x 取词函数、界面语言与这条判定行。
 * @returns 这一行的文字。
 */
function empDesignatedTextOf(x: RowTextIn): MaybeRowText {
  const p = paramsOf(x)
  if (x.row.key === ROW_EMP_DESIGNATED) {
    return {
      main: x.t('tv.emp.designated', { program: paramTextOf({ v: p.program }) }),
      sub: x.t('tv.emp.listedAs', { name: paramTextOf({ v: p.name }) }),
    }
  }
  let program = paramTextOf({ v: p.program })
  if (program === TEXT_NONE) {
    program = PROGRAM_AIP
  }
  return {
    main: x.t('tv.emp.desigMulti', { program, count: paramTextOf({ v: p.count }) }),
    sub: x.t('tv.emp.desigMultiSub'),
  }
}

/**
 * 雇主资质关的门槛行(成立年限与雇员数)。未知态收成两行瓦片
 * (2026-08-13 Frank:「改成两行」):标签 + 一行内容,门槛与未收录用逗号同句,
 * 不再拆说明行、不用破折号。
 *
 * @param x 取词函数、界面语言与这条判定行。
 * @returns 这一行的文字。
 */
function empGateTextOf(x: RowTextIn): MaybeRowText {
  const p = paramsOf(x)
  const prov = provDispOf({ t: x.t, code: paramTextOf({ v: p.prov }) })
  const need = paramTextOf({ v: p.need })
  const have = paramTextOf({ v: p.have })
  if (x.row.key === ROW_EMP_YEARS) {
    if (x.row.state === STATE_UNKNOWN) {
      return { main: x.t('tv.emp.yearsNa', { need, prov }) }
    }
    return { main: x.t('tv.emp.yearsHave', { have }), sub: x.t('tv.emp.yearsNeed', { need, prov }) }
  }
  if (x.row.state === STATE_UNKNOWN) {
    return { main: x.t('tv.emp.staffNa', { need, prov }) }
  }
  return { main: x.t('tv.emp.staffHave', { have }), sub: x.t('tv.emp.staffNeed', { need, prov }) }
}

/**
 * 雇主资质关各行的文字。营业额行恒「未收录」:公司营业额无源(2026-08-10 永久结案),
 * 门槛数字按 08-14 极简令不进正文。
 *
 * @param x 取词函数、界面语言与这条判定行。
 * @returns 这一行的文字;本域没排版的行键给 null。
 */
function empRowTextOf(x: RowTextIn): MaybeRowText {
  const p = paramsOf(x)
  if (x.row.key === ROW_EMP_DESIGNATED || x.row.key === ROW_EMP_DESIGNATED_MULTI) {
    return empDesignatedTextOf(x)
  }
  if (x.row.key === ROW_EMP_DESIGNATION_UNKNOWN) {
    return { main: x.t('tv.emp.desigNa') }
  }
  if (x.row.key === ROW_EMP_YEARS || x.row.key === ROW_EMP_STAFF) {
    return empGateTextOf(x)
  }
  if (x.row.key === ROW_EMP_REVENUE) {
    return { main: x.t('tv.emp.revenueNa') }
  }
  if (x.row.key === ROW_EMP_STAFF_FACT) {
    return { main: x.t('tv.emp.staffFact', { staff: paramTextOf({ v: p.staff }) }), sub: x.t('tv.emp.estimate') }
  }
  if (x.row.key === ROW_EMP_PUBLIC_SECTOR) {
    return { main: x.t('tv.emp.public') }
  }
  return null
}

/**
 * 「你这边」逐项条件行的文字(语言、经验,以及 income/funds 等其余 factor 的通用句 ——
 * need 与 unit 全来自官方行,不硬翻单位)。
 *
 * @param x 取词函数、界面语言与这条判定行。
 * @returns 这一行的文字。
 */
function personRowTextOf(x: RowTextIn): MaybeRowText {
  const p = paramsOf(x)
  const need = paramTextOf({ v: p.need })
  const have = paramTextOf({ v: p.have })
  if (x.row.key === ROW_PERSON_LANGUAGE) {
    if (x.row.state === STATE_UNKNOWN) {
      return { main: x.t('tv.pe.langNa', { need }) }
    }
    if (x.row.state === STATE_PASS) {
      return { main: x.t('tv.pe.langPass', { need, have }) }
    }
    return { main: x.t('tv.pe.langGap', { need, have }) }
  }
  if (x.row.key === ROW_PERSON_EXPERIENCE) {
    const short = paramTextOf({ v: p.short })
    if (x.row.state === STATE_UNKNOWN) {
      return { main: x.t('tv.pe.expNa', { need }) }
    }
    if (x.row.state === STATE_PASS) {
      return { main: x.t('tv.pe.expPass', { need, have, short }) }
    }
    return { main: x.t('tv.pe.expGap', { need, have, short }) }
  }
  const unit = paramTextOf({ v: p.unit })
  if (x.row.state === STATE_UNKNOWN) {
    return { main: x.t('tv.pe.genNa', { need, unit }) }
  }
  if (x.row.state === STATE_PASS) {
    return { main: x.t('tv.pe.genPass', { need, unit, have }) }
  }
  return { main: x.t('tv.pe.genGap', { need, unit, have }) }
}

/**
 * 工签剩余时长行的文字。
 *
 * @param x 取词函数、界面语言与这条判定行。
 * @returns 这一行的文字。
 */
function timeRowTextOf(x: RowTextIn): MaybeRowText {
  const p = paramsOf(x)
  if (x.row.state === STATE_UNKNOWN) {
    return { main: x.t('tv.time.na') }
  }
  return { main: x.t('tv.time.months', { months: paramTextOf({ v: p.months }) }) }
}

/**
 * 对省比较各行的文字。
 *
 * @param x 取词函数、界面语言与这条判定行。
 * @returns 这一行的文字;本域没排版的行键给 null。
 */
function compareRowTextOf(x: RowTextIn): MaybeRowText {
  const p = paramsOf(x)
  const prov = provDispOf({ t: x.t, code: paramTextOf({ v: p.prov }) })
  if (x.row.key === ROW_COMPARE_LISTED) {
    const list = streamDisplay({ t: x.t, label: paramTextOf({ v: p.list }) })
    const basis = provDispOf({ t: x.t, code: paramTextOf({ v: p.basisProv }) })
    return { main: x.t('tv.cmp.listed', { prov, list }), sub: x.t('tv.cmp.basis', { prov: basis }) }
  }
  if (x.row.key === ROW_COMPARE_NOT_LISTED) {
    return { main: x.t('tv.cmp.notListed', { prov }) }
  }
  if (x.row.key === ROW_COMPARE_NO_TARGET) {
    return { main: x.t('tv.cmp.noTarget') }
  }
  return null
}

/**
 * 最快通道行的文字(并列第一就把并列的都报出来,不替用户挑一条)。
 *
 * @param x 取词函数、界面语言与这条判定行。
 * @returns 这一行的文字。
 */
function routeRowTextOf(x: RowTextIn): MaybeRowText {
  const p = paramsOf(x)
  if (x.row.state === STATE_UNKNOWN) {
    return { main: x.t('tv.route.na') }
  }
  const keys = paramListOf({ v: p.keys })
  const names = pathwayNamesOf({ t: x.t, keys })
  if (keys.length > 1) {
    return { main: x.t('tv.route.tied', { routes: names.join(x.t(KEY_SEP)) }) }
  }
  const first = names[0]
  if (first == null) {
    return { main: x.t('tv.route.one', { route: TEXT_NONE }) }
  }
  return { main: x.t('tv.route.one', { route: first }) }
}

/**
 * 「下一步找雇主」行的灰字小注:同职业的 LMIA 获批数。查不到与 0 不是一回事 ——
 * 0 是真的 0 照说,查不到说查不到。
 *
 * @param x 取词函数、界面语言与这条判定行。
 * @returns 小注文本。
 */
function nextSubOf(x: RowTextIn): string {
  const p = paramsOf(x)
  if (p.lmiaKnown !== true) {
    return x.t('tv.next.lmiaNa')
  }
  const n = paramNumOf({ v: p.lmiaSameNoc })
  if (n > 0) {
    return x.t('tv.next.lmiaN', { n })
  }
  return x.t('tv.next.lmia0')
}

/**
 * 「下一步找雇主」行的文字。
 *
 * @param x 取词函数、界面语言与这条判定行。
 * @returns 这一行的文字。
 */
function nextRowTextOf(x: RowTextIn): MaybeRowText {
  const p = paramsOf(x)
  if (x.row.state === STATE_UNKNOWN) {
    return { main: x.t('tv.next.na') }
  }
  const sub = nextSubOf(x)
  const program = paramTextOf({ v: p.program })
  if (program === TEXT_NONE) {
    return { main: sub }
  }
  return { main: x.t('tv.next.viaProgram', { program }), sub }
}

/**
 * 一条判定行 → 渲出来的文字。unknown 的段落语义照组装器:判不了就说判不了,不编。
 * 与 tripleVerdict §6.1 的行清单一一对应;清单外的行键不渲染(引擎加了新行,
 * 本域先当没看见,不硬拼一句话出来)。
 *
 * @param x 取词函数、界面语言与这条判定行。
 * @returns 这一行的文字;不渲染时给 null。
 */
export function rowTextOf(x: RowTextIn): MaybeRowText {
  if (x.row.key.startsWith(ROW_OCC_HEAD)) {
    return occRowTextOf(x)
  }
  if (x.row.key.startsWith(ROW_YOU_HEAD)) {
    return youRowTextOf(x)
  }
  if (x.row.key.startsWith(ROW_EMP_HEAD)) {
    return empRowTextOf(x)
  }
  if (x.row.key.startsWith(ROW_PERSON_HEAD)) {
    return personRowTextOf(x)
  }
  if (x.row.key === ROW_TIME_PERMIT) {
    return timeRowTextOf(x)
  }
  if (x.row.key.startsWith(ROW_COMPARE_HEAD)) {
    return compareRowTextOf(x)
  }
  if (x.row.key === ROW_ROUTE_FASTEST) {
    return routeRowTextOf(x)
  }
  if (x.row.key === ROW_NEXT_EMPLOYER) {
    return nextRowTextOf(x)
  }
  return null
}

/**
 * 这条行渲不渲小注(RowText 不带 sub 就是不出)。
 *
 * @param x 这条行的文字。
 * @returns 小注文本;不出时给空串。
 */
export function rowSubOf(x: RowSubIn): string {
  if (x.text.sub == null) {
    return TEXT_NONE
  }
  return x.text.sub
}

/**
 * 这块瓦片按哪个态渲(RowText 的 icon 覆盖引擎给的 state,两个都没有落 info)。
 *
 * @param x 这条判定行与它的文字。
 * @returns 判定态。
 */
export function rowTileStateOf(x: RowTileStateIn): string {
  if (x.text.icon != null) {
    return x.text.icon
  }
  if (x.row.state != null) {
    return x.row.state
  }
  return STATE_INFO
}

/**
 * 锁行/无档案行的行名(付费行只带 key 时的关别标签)。
 *
 * @param x 取词函数与行身份键。
 * @returns 关别短名。
 */
function lockLabelOf(x: RowLabelIn): string {
  if (x.key === ROW_PERSON_LANGUAGE) {
    return x.t('tv.k.language')
  }
  if (x.key === ROW_PERSON_EXPERIENCE) {
    return x.t('tv.k.experience')
  }
  if (x.key.startsWith(ROW_PERSON_HEAD)) {
    return x.t('tv.k.person')
  }
  if (x.key === ROW_TIME_PERMIT) {
    return x.t('tv.k.permit')
  }
  if (x.key.startsWith(ROW_COMPARE_HEAD)) {
    return x.t('tv.k.compare')
  }
  if (x.key === ROW_ROUTE_FASTEST) {
    return x.t('tv.k.route')
  }
  if (x.key === ROW_NEXT_EMPLOYER) {
    return x.t('tv.k.next')
  }
  return x.t('tv.k.person')
}

/**
 * 判定瓦片的灰标签:行键 → 关别短名(个人侧沿用付费锁区那套 tv.k.*,职业/雇主侧新增)。
 *
 * @param x 取词函数与行身份键。
 * @returns 关别短名。
 */
export function rowLabelOf(x: RowLabelIn): string {
  if (x.key === ROW_OCC_TEER) {
    return x.t('tv.k.screen')
  }
  if (x.key.startsWith(ROW_OCC_HEAD)) {
    return x.t('tv.k.occList')
  }
  if (x.key.startsWith(ROW_DESIGNAT_HEAD)) {
    return x.t('tv.k.desig')
  }
  if (x.key === ROW_EMP_YEARS) {
    return x.t('tv.k.years')
  }
  if (x.key === ROW_EMP_REVENUE) {
    return x.t('tv.k.revenue')
  }
  if (x.key.startsWith(ROW_STAFF_HEAD)) {
    return x.t('tv.k.staff')
  }
  if (x.key === ROW_EMP_PUBLIC_SECTOR) {
    return x.t('tv.k.public')
  }
  if (x.key === ROW_YOU_NOT_COLLECTED) {
    return x.t('tv.k.collect')
  }
  return lockLabelOf(x)
}

/**
 * 判定态 → 扫读符号。中性点/问号/信息号不渲染(2026-08-13「前面不需要问号吧」+
 * 2026-08-16「感叹号去掉」——事实态措辞自解释,符号是再说一遍);
 * ✓/!/✗ 留着,那是判定行的扫读信号,色弱用户也靠它。
 *
 * @param x 判定态。
 * @returns 符号;不出符号时给空串。
 */
export function rowSignOf(x: RowStateIn): string {
  const ch = ROW_SIGN_CH[x.state]
  if (ch == null) {
    return TEXT_NONE
  }
  return ch
}

/**
 * 判定态 → 结论文字的配色类。
 *
 * @param x 判定态。
 * @returns 配色类名。
 */
function rowToneClsOf(x: RowStateIn): string {
  if (x.state === STATE_PASS) {
    return cssOf(css.mainPass)
  }
  if (x.state === STATE_GAP) {
    return cssOf(css.mainGap)
  }
  if (x.state === STATE_EXCLUDED) {
    return cssOf(css.mainExcluded)
  }
  if (x.state === STATE_UNKNOWN) {
    return cssOf(css.mainUnknown)
  }
  if (x.state === STATE_INFO || x.state === STATE_COARSE) {
    return cssOf(css.mainPlain)
  }
  return cssOf(css.mainFallback)
}

/**
 * 判定瓦片结论行的整串类名(解剖 + 状态配色)。
 *
 * @param x 判定态。
 * @returns 类名。
 */
export function rowMainClsOf(x: RowStateIn): string {
  return cssOf(css.tileMain) + CLS_SEP + rowToneClsOf(x)
}

/**
 * 事实瓦片与判定瓦片共用的四列栅格类名(本职位卡首个栅格另留一点上间距)。
 *
 * @returns 类名。
 */
export function answersTopClsOf(): string {
  return cssOf(css.answers) + CLS_SEP + cssOf(css.answersTop)
}

/**
 * 免费档的判定行(付费行的逐项差值仍在服务端锁着)。
 *
 * @param x 判定结果。
 * @returns 免费档判定行。
 */
function freeRowsOf(x: GateRowsIn): VerdictWireRow[] {
  if (x.wire == null) {
    return []
  }
  const rows: VerdictWireRow[] = []
  for (const row of x.wire.rows) {
    if (row.tier === TIER_FREE) {
      rows.push(row)
    }
  }
  return rows
}

/**
 * 职业匹配关的免费判定行。本站初筛行 2026-08-14 Frank 拍板整块删除(「这个删掉」;
 * 此前同日刚从中性圆点改成绿勾红叉,一并作废)—— 引擎照常产出(金标测试与顾问消费),
 * 前端不再渲染。
 *
 * @param x 判定结果。
 * @returns 职业关判定行。
 */
export function occRowsOf(x: GateRowsIn): VerdictWireRow[] {
  const rows: VerdictWireRow[] = []
  for (const row of freeRowsOf(x)) {
    if (row.gate === GATE_OCCUPATION && row.key !== ROW_OCC_TEER) {
      rows.push(row)
    }
  }
  return rows
}

/**
 * 雇主资质关的免费判定行。
 *
 * @param x 判定结果。
 * @returns 雇主关判定行。
 */
export function empRowsOf(x: GateRowsIn): VerdictWireRow[] {
  const rows: VerdictWireRow[] = []
  for (const row of freeRowsOf(x)) {
    if (row.gate === GATE_EMPLOYER) {
      rows.push(row)
    }
  }
  return rows
}

/**
 * 有没有档案:服务端落档的与页面已知的取或(匿名也判得出个人条件,所以两边都算)。
 *
 * @param x 判定结果与页面那格。
 * @returns 有档案就是 true。
 */
export function hasProfileOf(x: HasProfileIn): boolean {
  if (x.wire != null && x.wire.hasProfile === true) {
    return true
  }
  return x.profileComplete
}

/**
 * 「职业代码」事实格的值。
 *
 * @param x 判定结果。
 * @returns 「NOC 63200」这样的值;没匹配上职业时给横杠。
 */
export function nocTextOf(x: WireFactIn): string {
  if (x.wire == null || x.wire.noc == null || x.wire.noc === TEXT_NONE) {
    return TEXT_DASH
  }
  return NOC_HEAD + x.wire.noc
}

/**
 * 「职业层级」事实格的值。
 *
 * @param x 判定结果。
 * @returns 「TEER 3」这样的值;没匹配上职业时给横杠。
 */
export function teerTextOf(x: WireFactIn): string {
  if (x.wire == null || x.wire.teer == null) {
    return TEXT_DASH
  }
  return TEER_HEAD + String(x.wire.teer)
}

/**
 * 界面语的 NOC 职业名译名(#326:官方职业名库里现成的那份;英文界面不取)。
 *
 * @param x 界面语言与判定结果。
 * @returns 译名;没有就给空串。
 */
function nocAliasOf(x: TitleTileIn): string {
  if (x.wire == null) {
    return TEXT_NONE
  }
  if (x.lang === LANG_ZH && x.wire.nocTitleZh != null) {
    return x.wire.nocTitleZh
  }
  if (x.lang === LANG_KO && x.wire.nocTitleKo != null) {
    return x.wire.nocTitleKo
  }
  return TEXT_NONE
}

/**
 * 「职位名」事实格的两行。#326:zh/ko 界面主文案 = NOC 职业名对应语言(帖面标题无逐帖译文,
 * 官方职业名库里现成),帖面英文原名降灰注;en 界面与无译名照旧原名做主文案。
 * 译名与原名只差大小写时不摆两行 —— 同一句话说两遍。
 *
 * @param x 界面语言、判定结果与帖面职位名。
 * @returns 主文案与灰注。
 */
export function titleTileOf(x: TitleTileIn): TitleTile {
  const alias = nocAliasOf(x)
  if (alias === TEXT_NONE) {
    return { value: x.title, sub: TEXT_NONE }
  }
  if (alias.toLowerCase() === x.title.toLowerCase()) {
    return { value: x.title, sub: TEXT_NONE }
  }
  return { value: alias, sub: x.title }
}

/**
 * 「城市」事实格的值。
 *
 * @param x 城市名。
 * @returns 城市名;库里没记时给横杠。
 */
export function cityTextOf(x: CityTextIn): string {
  if (x.city === TEXT_NONE) {
    return TEXT_DASH
  }
  return x.city
}

/**
 * 条件格用的省显示名函数(条件格自己不认识 i18n,由调用方把取词函数绑进来)。
 *
 * @param x 取词函数。
 * @returns 省码 → 省显示名。
 */
export function makeProvDisp(x: MakeProvDispIn): ProvLabelFn {
  return function provDisp(code: string): string {
    return provDispOf({ t: x.t, code })
  }
}

/**
 * 职位详情页的地址。
 *
 * @param x 岗位 id。
 * @returns 详情页地址。
 */
export function jobHrefOf(x: JobHrefIn): string {
  return URL_JOB_HEAD + String(x.id)
}

/**
 * 职位板按这家雇主搜索的地址。
 *
 * @param x 雇主名。
 * @returns 职位板地址。
 */
export function companyJobsHrefOf(x: CompanyJobsHrefIn): string {
  return URL_JOBS_Q_HEAD + encodeURIComponent(x.company)
}

/**
 * 只打一个埋点的点击手柄(卡头两条链接各用一个)。
 *
 * @param x 埋点事件名。
 * @returns 点击手柄。
 */
export function makeTrackClick(x: TrackClickIn): ClickFn {
  return function trackClick(): void {
    track(x.event)
  }
}

/**
 * 「去建档」的点击手柄:页面给了建档动线就走它,没给就退回顾问弹窗预填问句。
 *
 * @param x 页面的建档手柄与退回时的预填问句。
 * @returns 点击手柄。
 */
export function makeBuildProfile(x: BuildProfileIn): ClickFn {
  return function buildProfile(): void {
    if (x.onBuildProfile != null) {
      x.onBuildProfile()
      return
    }
    track(TRACK_BUILD_PROFILE)
    window.dispatchEvent(new CustomEvent(EVT_CHAT_OPEN, { detail: { prefill: x.prefill } }))
  }
}

/**
 * 「改答案」的点击手柄:不带 key,落第一道没答的题。
 *
 * @param x 打开问卷与去建档两只手柄。
 * @returns 点击手柄。
 */
export function makeEditAnswers(x: EditAnswersIn): ClickFn {
  return function editAnswers(): void {
    if (x.onEditAnswers != null) {
      x.onEditAnswers(TEXT_NONE)
      return
    }
    if (x.onBuildProfile != null) {
      x.onBuildProfile()
    }
  }
}

/**
 * 点某一格条件的手柄:带 key 直达那道题,没有问卷动线就退回建档。
 *
 * @param x 打开问卷与去建档两只手柄。
 * @returns 逐格手柄。
 */
export function makeTileEdit(x: TileEditIn): TileFn {
  return function tileEdit(key: string): void {
    if (x.onEditAnswers != null) {
      x.onEditAnswers(key)
      return
    }
    if (x.onBuildProfile != null) {
      x.onBuildProfile()
    }
  }
}

/**
 * 一格条件的点击手柄工厂(把这格对应的题 key 绑上去)。
 *
 * @param x 点格手柄与这格的题 key。
 * @returns 点击手柄。
 */
export function makeTileClick(x: TileClickIn): ClickFn {
  return function tileClick(): void {
    x.onTile(x.tileKey)
  }
}

/**
 * 切省页签的手柄工厂。
 *
 * @param x 落选中省码的 setter。
 * @returns 切页签手柄。
 */
export function makeTabChange(x: TabChangeIn): TileFn {
  return function tabChange(key: string): void {
    x.setTab(key)
  }
}

/**
 * 入口卡的外壳类名(大档 = 职位详情页版式)。
 *
 * @param x 大一号档。
 * @returns 类名。
 */
export function entryCardClsOf(x: EntryLgIn): string {
  if (x.lg) {
    return cssOf(css.entryCardLg)
  }
  return cssOf(css.entryCard)
}

/**
 * 入口卡标题的类名。
 *
 * @param x 大一号档。
 * @returns 类名。
 */
export function entryTitleClsOf(x: EntryLgIn): string {
  if (x.lg) {
    return cssOf(css.entryTitleLg)
  }
  return cssOf(css.entryTitle)
}

/**
 * 入口卡主按钮的类名。
 *
 * @param x 大一号档。
 * @returns 类名。
 */
export function entryBtnClsOf(x: EntryLgIn): string {
  if (x.lg) {
    return cssOf(css.entryBtnLg)
  }
  return cssOf(css.entryBtn)
}

/**
 * 入口卡标题的文案键(大档是详情页标题,小档是弹框卡头)。
 *
 * @param x 大一号档。
 * @returns 文案键。
 */
export function entryTitleKeyOf(x: EntryLgIn): string {
  if (x.lg) {
    return KEY_ENTRY_TITLE_LG
  }
  return KEY_ENTRY_TITLE
}

/**
 * 共用题(全省通用的那些)。
 *
 * @param x 全部条件行。
 * @returns 共用题。
 */
export function sharedRowsOf(x: RowsIn): ConditionRow[] {
  const rows: ConditionRow[] = []
  for (const row of x.rows) {
    if (row.prov === TEXT_NONE) {
      rows.push(row)
    }
  }
  return rows
}

/**
 * 出现过的省码(按题序首次出现的顺序,不排序 —— 页签次序不许随答案变动而跳)。
 *
 * @param x 全部条件行。
 * @returns 省码清单。
 */
export function provCodesOf(x: RowsIn): string[] {
  const codes: string[] = []
  for (const row of x.rows) {
    if (row.prov !== TEXT_NONE && codes.includes(row.prov) === false) {
      codes.push(row.prov)
    }
  }
  return codes
}

/**
 * 出现过的小类别(组序 = 调用方给的题序;只渲省专属题那半时不分组)。
 *
 * @param x 共用题与「只渲哪半张」。
 * @returns 组名清单。
 */
export function groupNamesOf(x: GroupNamesIn): string[] {
  const names: string[] = []
  if (x.only === ONLY_PROV) {
    return names
  }
  for (const row of x.rows) {
    if (row.group != null && row.group !== TEXT_NONE && names.includes(row.group) === false) {
      names.push(row.group)
    }
  }
  return names
}

/**
 * 某一组里的格子(组内保持题序)。
 *
 * @param x 共用题与组名。
 * @returns 这一组的格子。
 */
export function groupRowsOf(x: GroupRowsIn): ConditionRow[] {
  const rows: ConditionRow[] = []
  for (const row of x.rows) {
    if (row.group === x.group) {
      rows.push(row)
    }
  }
  return rows
}

/**
 * 某个省的格子。
 *
 * @param x 全部条件行与省码。
 * @returns 这个省的格子。
 */
export function provRowsOf(x: ProvRowsIn): ConditionRow[] {
  const rows: ConditionRow[] = []
  for (const row of x.rows) {
    if (row.prov === x.prov) {
      rows.push(row)
    }
  }
  return rows
}

/**
 * 某个省还没答几题(省页签的角标)。
 *
 * @param x 全部条件行与省码。
 * @returns 没答的题数。
 */
function unfilledCountOf(x: ProvRowsIn): number {
  let n = 0
  for (const row of x.rows) {
    if (row.prov === x.prov && row.filled === false) {
      n += 1
    }
  }
  return n
}

/**
 * 省页签的数据(角标 = 该省还没答几题;全答完了不挂角标)。
 *
 * @param x 省码清单、全部条件行与省显示名函数。
 * @returns 页签清单。
 */
export function tabItemsOf(x: TabItemsIn): VerdictTabItem[] {
  const items: VerdictTabItem[] = []
  for (const prov of x.provs) {
    const badge = unfilledCountOf({ rows: x.rows, prov })
    if (badge === 0) {
      items.push({ key: prov, label: x.provLabel(prov) })
      continue
    }
    items.push({ key: prov, label: x.provLabel(prov), badge })
  }
  return items
}

/**
 * 当前该亮哪个省页签:选过的那个还在就用它,否则落第一个。
 *
 * @param x 省码清单与选过的省码。
 * @returns 当前省码;一个省都没有时给空串。
 */
export function activeProvOf(x: ActiveProvIn): string {
  if (x.provs.includes(x.tab)) {
    return x.tab
  }
  const first = x.provs[0]
  if (first == null) {
    return TEXT_NONE
  }
  return first
}

/**
 * 小类别分块的类名(第一组紧贴上文,其余与上一组拉开)。
 *
 * @param x 第几组。
 * @returns 类名。
 */
export function groupClsOf(x: GroupClsIn): string {
  if (x.index === 0) {
    return cssOf(css.cgGroup)
  }
  return cssOf(css.cgGroupGap)
}

/**
 * 一格条件的整串类名(解剖 + 答没答那一档)。
 *
 * @param x 答过没有。
 * @returns 类名。
 */
export function tileClsOf(x: FilledClsIn): string {
  if (x.filled) {
    return cssOf(css.cgTile) + CLS_SEP + cssOf(css.cgTileFilled)
  }
  return cssOf(css.cgTile) + CLS_SEP + cssOf(css.cgTileEmpty)
}

/**
 * 一格答案的整串类名(解剖 + 答没答那一档)。
 *
 * @param x 答过没有。
 * @returns 类名。
 */
export function tileValClsOf(x: FilledClsIn): string {
  if (x.filled) {
    return cssOf(css.cgVal) + CLS_SEP + cssOf(css.cgValFilled)
  }
  return cssOf(css.cgVal) + CLS_SEP + cssOf(css.cgValEmpty)
}

/**
 * SSR 带下来的那份判定 → 本域形状。这是本域**唯一**的收窄点:
 * `initial` 的 `unknown` 由消费者 plan 桶的契约定死,再往下一律是收窄过的形状。
 *
 * @param x SSR 那份。
 * @returns 判定结果;没有就给 null。
 */
export function initialWireOf(x: InitialWireIn): MaybeVerdictWire {
  if (x.initial == null) {
    return null
  }
  return x.initial as VerdictWire
}

/**
 * 本地答案里有没有真填过东西。
 *
 * @param x 本地读到的答案。
 * @returns 填过就是 true。
 */
function hasLocalAnswers(x: HasLocalAnswersIn): boolean {
  for (const v of Object.values(x.answers)) {
    if (Array.isArray(v)) {
      if (v.length > 0) {
        return true
      }
      continue
    }
    if (v == null || v === TEXT_NONE || v === 0) {
      continue
    }
    return true
  }
  return false
}

/**
 * 这次还要不要再问一遍服务端。服务端已经算过一版(无本地答案那版),
 * **本地一条答案都没有时就别再问一遍** —— 同样的入参问两次,
 * 只会让首屏白闪一下再渲成一样的东西。
 *
 * @param x SSR 那份在不在、重算计数与本地答案。
 * @returns 要问就是 true。
 */
function needsVerdictFetch(x: NeedsFetchIn): boolean {
  if (x.hasInitial === false) {
    return true
  }
  if (x.refreshKey !== 0) {
    return true
  }
  return hasLocalAnswers({ answers: x.answers })
}

/**
 * 问服务端要一份判定并落进 state。出错不静默:任何一步没走通都落错误旗标,
 * 面板渲一行错误留痕,不拿空判定冒充「没问题」。
 *
 * @param x 岗位 id、本地答案、作废旗标与两只 setter。
 * @returns 请求走完。
 */
async function fetchVerdict(x: FetchVerdictIn): Promise<void> {
  let wire: MaybeVerdictWire = null
  try {
    const res = await fetch(API_VERDICT, {
      method: HTTP_POST,
      credentials: CREDENTIALS_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ job: x.jobId, answers: x.answers }),
    })
    if (res.ok) {
      wire = await res.json()
    }
  } catch {
    wire = null
  }
  if (x.box.dead) {
    return
  }
  if (wire != null && wire.ok === true) {
    x.setWire(wire)
    return
  }
  x.setErr(true)
}

/**
 * effect 的收尾:标记本次加载作废,回来的响应不再落 state。
 *
 * @param x 这次加载的作废旗标。
 * @returns 收尾函数。
 */
function makeLoadStop(x: LoadStopIn): StopFn {
  return function stopLoad(): void {
    x.box.dead = true
  }
}

/**
 * 判定面板挂载时跑的一趟:打埋点、读本地答案、按需问服务端。
 * POST 带上本地答案(2026-08-12 Frank「匿名也可以访问」):没登录也判得出个人条件。
 * 服务端逐槽以落档的档案优先,本地答案只补它缺的那几样;付费闸与此无关(锁不锁看是不是 Pro)。
 *
 * @param x 岗位 id、重算计数、SSR 那份在不在与两只 setter。
 * @returns effect 的收尾函数。
 */
export function startVerdictLoad(x: VerdictLoadIn): StopFn {
  track(TRACK_OPEN)
  const answers = toEngineAnswers(readAnswers())
  const box = { dead: false }
  if (needsVerdictFetch({ hasInitial: x.hasInitial, refreshKey: x.refreshKey, answers })) {
    void fetchVerdict({ jobId: x.jobId, answers, box, setWire: x.setWire, setErr: x.setErr })
  }
  return makeLoadStop({ box })
}
