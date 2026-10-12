/**
 * streams 域的派生与工厂:进页先看哪一省、省份手柄。
 * 2026-10-04 Frank 勾「卡上加钮 + 页签带省份」:省份跟着地址走 —— 进页先认地址里的 `?prov=`(互跳钮与页签切换带过来的),
 * 切省胶囊把地址换成 `?prov=新省`(不留锚点,免得再滚回原来那张卡),页签地址带上当前省(provHrefOf)。
 * 2026-10-11 申请步骤分区筛选批 1(Frank「可以,开始做第一批」;设计 docs/design/资讯/申请步骤-分区筛选-20261011.md):
 * 多出「申请步骤」页的筛选一族(startStepsStateOf 往下)—— 省份 / 身份 / 教育经历,整份跟着地址走(可转发给别人)。
 *
 * @author Frank
 * @time 2026-09-30 21:46:44
 */
import { homeProvinceOf } from '@/lib/location'
import {
  EDU_ABROAD, EDU_CELL_SEP, EDU_I_KIND, EDU_I_LEN, EDU_I_PROV, EDU_KINDS, EDU_LENS, EDU_PROVS, EDU_ROW_SEP,
  EDU_ROWS_MAX, FIT_WHOS, K_ABROAD, P_EDU, P_PROV, P_WHO, PROV_ALL, PROV_DEFAULT, PROV_KEY_HEAD, STREAM_PROVS,
  TEXT_NONE, URL_KV_SEP, URL_QUERY_HEAD,
} from './constants'
import type {
  CellAtIn, ClickFn, EduCellsIn, EduField, EduPickOfFn, EduRemoveOfFn, EduRow, EduWithIn, LabelFn, LabelOfIn, PickFn,
  PickValidIn, ProvHrefIn, ProvPickIn, ProvPickOfFn, StepsFilter, StepsSetIn, StepsState, StepsStateIn, TFn,
  WhoPickOfFn,
} from './types'

/**
 * 进页先看哪一省:设备时区(东部时区看浏览器语言,同职位板 homeProvinceOf);落在九省之外(魁省、三个地区)或认不出,
 * 看第一枚胶囊。
 * 2026-10-04 地址里带了九省之一(`?prov=`,互跳钮与页签切换带过来的)就先认它。
 *
 * @returns 省码。
 */
export function startProvOf(): string {
  const asked = urlProvOf()
  if (asked !== TEXT_NONE) {
    return asked
  }
  const prov = homeProvinceOf()
  if (STREAM_PROVS.includes(prov)) {
    return prov
  }
  return PROV_DEFAULT
}

/**
 * 地址里带的省份(`?prov=`);没带或不在九枚胶囊里给空串。
 *
 * @returns 省码或空串。
 */
export function urlProvOf(): string {
  const v = new URLSearchParams(window.location.search).get(P_PROV)
  if (v == null || STREAM_PROVS.includes(v) === false) {
    return TEXT_NONE
  }
  return v
}

/**
 * 挂载时预选一次省份(服务端不知道时区,首帧不选)。
 *
 * @param x 省份落格。
 * @returns 无。
 */
export function applyStartProv(x: ProvPickIn): void {
  x.setProv(startProvOf())
}

/**
 * 造省份手柄的工厂:给它省码,换一只只管切到那个省的手柄。
 * 2026-10-04 切省同时把地址换成 `?prov=新省`(replaceState,不进历史、不留锚点):刷新、转发停在同一省,
 * 也不会因为地址里还挂着别省的 #通道编号 再滚回去。
 *
 * @param x 省份落格。
 * @returns 逐省的手柄工厂。
 */
export function makeProvPickOf(x: ProvPickIn): ProvPickOfFn {
  return function pickOf(code: string): ClickFn {
    return function pick(): void {
      x.setProv(code)
      window.history.replaceState(null, TEXT_NONE, provHrefOf({ base: window.location.pathname, prov: code }))
    }
  }
}

/**
 * 带省份的站内地址(「通道」「申请步骤」两个页签互切时带上当前省;还没选省就是光地址)。
 *
 * @param x 页签地址与当前省码。
 * @returns 地址。
 */
export function provHrefOf(x: ProvHrefIn): string {
  if (x.prov === TEXT_NONE) {
    return x.base
  }
  return x.base + URL_QUERY_HEAD + P_PROV + URL_KV_SEP + x.prov
}

/**
 * 进页时的筛选状态:地址里带了就认(省份不在九省里 = 全部省份;身份、教育经历不在词表里的格当没选),没带就是全部省份、什么都没选。
 * 「申请步骤」页不按时区预选省份 —— Frank「省份 可能 不需要选」「比如我是 安省毕业 我可能需要去其他省」。
 *
 * @returns 筛选状态。
 */
export function startStepsStateOf(): StepsState {
  const q = new URLSearchParams(window.location.search)
  let prov = urlProvOf()
  if (prov === TEXT_NONE) {
    prov = PROV_ALL
  }
  return { prov, who: validOf({ v: q.get(P_WHO), allowed: FIT_WHOS }), edu: eduOfUrl(q.get(P_EDU)) }
}

/**
 * 地址里的教育经历 → 段(至多 EDU_ROWS_MAX 段;一段都没有给一段空的,卡里总有一行可填)。
 *
 * @param v 地址里的原值;缺席 = null。
 * @returns 教育经历。
 */
function eduOfUrl(v: string | null): EduRow[] {
  const out: EduRow[] = []
  if (v != null && v !== TEXT_NONE) {
    for (const part of v.split(EDU_ROW_SEP)) {
      if (out.length < EDU_ROWS_MAX) {
        out.push(eduRowOf({ cells: part.split(EDU_CELL_SEP) }))
      }
    }
  }
  if (out.length === 0) {
    out.push(emptyEduRow())
  }
  return out
}

/**
 * 地址里的一段(地点.性质.时长)→ 一段;不在词表里的格当没选。
 *
 * @param x 段内三格。
 * @returns 一段。
 */
function eduRowOf(x: EduCellsIn): EduRow {
  return {
    prov: validOf({ v: cellAtOf({ cells: x.cells, i: EDU_I_PROV }), allowed: EDU_PROVS }),
    kind: validOf({ v: cellAtOf({ cells: x.cells, i: EDU_I_KIND }), allowed: EDU_KINDS }),
    len: validOf({ v: cellAtOf({ cells: x.cells, i: EDU_I_LEN }), allowed: EDU_LENS }),
  }
}

/**
 * 段内第 i 格;缺了给 null。
 *
 * @param x 段内各格与第几格。
 * @returns 那一格或 null。
 */
function cellAtOf(x: CellAtIn): string | null {
  const v = x.cells[x.i]
  if (v == null) {
    return null
  }
  return v
}

/**
 * 一格的值认进词表:在表里原样给,不在(或缺席)给空串。
 *
 * @param x 原值与词表。
 * @returns 值或空串。
 */
function validOf(x: PickValidIn): string {
  if (x.v == null || x.allowed.includes(x.v) === false) {
    return TEXT_NONE
  }
  return x.v
}

/**
 * 一段空的教育经历(三格都没选)。
 *
 * @returns 空段。
 */
function emptyEduRow(): EduRow {
  return { prov: TEXT_NONE, kind: TEXT_NONE, len: TEXT_NONE }
}

/**
 * 挂载时认一次地址里的筛选(服务端不知道地址参数,首帧省份为空、正文不渲)。
 *
 * @param x 状态落格。
 * @returns 无。
 */
export function applyStartSteps(x: StepsSetIn): void {
  x.setS(startStepsStateOf())
}

/**
 * 落一份新状态并把地址换成它(replaceState,不进历史;刷新、转发停在同一份筛选)。
 *
 * @param x 新状态与落格。
 * @returns 无。
 */
function commitSteps(x: StepsStateIn): void {
  x.setS(x.s)
  window.history.replaceState(null, TEXT_NONE, stepsHrefOf(x.s))
}

/**
 * 筛选状态 → 本页地址(全部省份不写 prov,没选的不写;一格都没选的教育经历段不写)。
 *
 * @param s 筛选状态。
 * @returns 站内地址。
 */
function stepsHrefOf(s: StepsState): string {
  const q = new URLSearchParams()
  if (s.prov !== PROV_ALL && s.prov !== TEXT_NONE) {
    q.set(P_PROV, s.prov)
  }
  if (s.who !== TEXT_NONE) {
    q.set(P_WHO, s.who)
  }
  const edu = eduUrlOf(s.edu)
  if (edu !== TEXT_NONE) {
    q.set(P_EDU, edu)
  }
  const qs = q.toString()
  if (qs === TEXT_NONE) {
    return window.location.pathname
  }
  return window.location.pathname + URL_QUERY_HEAD + qs
}

/**
 * 教育经历 → 地址里的值(一格都没选的段跳过)。
 *
 * @param edu 教育经历。
 * @returns 地址值;一段都没填给空串。
 */
function eduUrlOf(edu: EduRow[]): string {
  const parts: string[] = []
  for (const r of edu) {
    if (r.prov !== TEXT_NONE || r.kind !== TEXT_NONE || r.len !== TEXT_NONE) {
      parts.push([r.prov, r.kind, r.len].join(EDU_CELL_SEP))
    }
  }
  return parts.join(EDU_ROW_SEP)
}

/**
 * 递给步骤正文的筛选条件(省份不在里面:页面按省份挑渲哪几省)。
 *
 * @param s 筛选状态。
 * @returns 筛选条件。
 */
export function filterOf(s: StepsState): StepsFilter {
  return { who: s.who, edu: s.edu }
}

/**
 * 造省份手柄的工厂(含「全部省份」):给省码或 all,换一只切过去的手柄。
 *
 * @param x 当前状态与落格。
 * @returns 逐省的手柄工厂。
 */
export function makeStepsProvPickOf(x: StepsStateIn): ProvPickOfFn {
  return function pickOf(code: string): ClickFn {
    return function pick(): void {
      commitSteps({ s: { prov: code, who: x.s.who, edu: x.s.edu }, setS: x.setS })
    }
  }
}

/**
 * 造身份手柄的工厂:点没选的选上,点已选的取消(单选)。
 *
 * @param x 当前状态与落格。
 * @returns 逐身份的手柄工厂。
 */
export function makeWhoPickOf(x: StepsStateIn): WhoPickOfFn {
  return function pickOf(who: string): ClickFn {
    return function pick(): void {
      let next = who
      if (x.s.who === who) {
        next = TEXT_NONE
      }
      commitSteps({ s: { prov: x.s.prov, who: next, edu: x.s.edu }, setS: x.setS })
    }
  }
}

/**
 * 造「清空身份」手柄。
 *
 * @param x 当前状态与落格。
 * @returns 手柄。
 */
export function makeClearWho(x: StepsStateIn): ClickFn {
  return function clear(): void {
    commitSteps({ s: { prov: x.s.prov, who: TEXT_NONE, edu: x.s.edu }, setS: x.setS })
  }
}

/**
 * 造教育经历逐段逐格的换值工厂。
 *
 * @param x 当前状态与落格。
 * @returns 工厂。
 */
export function makeEduPickOf(x: StepsStateIn): EduPickOfFn {
  return function pickOf(i: number, field: EduField): PickFn {
    return function pick(v: string): void {
      commitSteps({ s: { prov: x.s.prov, who: x.s.who, edu: eduWithOf({ edu: x.s.edu, i, field, v }) }, setS: x.setS })
    }
  }
}

/**
 * 换掉第 i 段的一格(其余段、其余格原样;不改原数组)。
 *
 * @param x 原教育经历、第几段、哪一格与新值。
 * @returns 新教育经历。
 */
function eduWithOf(x: EduWithIn): EduRow[] {
  const out: EduRow[] = []
  for (const [j, r] of x.edu.entries()) {
    const row: EduRow = { prov: r.prov, kind: r.kind, len: r.len }
    if (j === x.i) {
      row[x.field] = x.v
    }
    out.push(row)
  }
  return out
}

/**
 * 造「再加一段」手柄(满 EDU_ROWS_MAX 段不加)。
 *
 * @param x 当前状态与落格。
 * @returns 手柄。
 */
export function makeAddEdu(x: StepsStateIn): ClickFn {
  return function add(): void {
    if (x.s.edu.length >= EDU_ROWS_MAX) {
      return
    }
    const edu: EduRow[] = []
    for (const r of x.s.edu) {
      edu.push(r)
    }
    edu.push(emptyEduRow())
    commitSteps({ s: { prov: x.s.prov, who: x.s.who, edu }, setS: x.setS })
  }
}

/**
 * 造逐段删除的工厂(删到一段不剩时留一段空的)。
 *
 * @param x 当前状态与落格。
 * @returns 工厂。
 */
export function makeEduRemoveOf(x: StepsStateIn): EduRemoveOfFn {
  return function removeOf(i: number): ClickFn {
    return function remove(): void {
      const edu: EduRow[] = []
      for (const [j, r] of x.s.edu.entries()) {
        if (j !== i) {
          edu.push(r)
        }
      }
      if (edu.length === 0) {
        edu.push(emptyEduRow())
      }
      commitSteps({ s: { prov: x.s.prov, who: x.s.who, edu }, setS: x.setS })
    }
  }
}

/**
 * 造「清空教育经历」手柄(回到一段空的)。
 *
 * @param x 当前状态与落格。
 * @returns 手柄。
 */
export function makeClearEdu(x: StepsStateIn): ClickFn {
  return function clear(): void {
    commitSteps({ s: { prov: x.s.prov, who: x.s.who, edu: [emptyEduRow()] }, setS: x.setS })
  }
}

/**
 * 造下拉显示名函数:选项值拼上词条键头去取词。
 *
 * @param x 取词函数与键头。
 * @returns 显示名函数。
 */
export function makeLabelOf(x: LabelOfIn): LabelFn {
  return function labelOf(v: string): string {
    return x.t(x.head + v)
  }
}

/**
 * 造「院校所在地」下拉的显示名函数:省码取省全名,abroad 取「国外」。
 *
 * @param t 取词函数。
 * @returns 显示名函数。
 */
export function makeEduProvLabel(t: TFn): LabelFn {
  return function labelOf(v: string): string {
    if (v === EDU_ABROAD) {
      return t(K_ABROAD)
    }
    return t(PROV_KEY_HEAD + v)
  }
}

/**
 * 「通道」页签地址要带的省码:全部省份时不带(「通道」页一次看一省,进去按它自己的预选)。
 *
 * @param prov 本页当前省码或 all。
 * @returns 省码或空串。
 */
export function streamsProvOf(prov: string): string {
  if (prov === PROV_ALL) {
    return TEXT_NONE
  }
  return prov
}
