/**
 * me 桶子桶 profile 的行为:取档案、档案 → 编辑弹框的起始答案、开 / 关 / 保存编辑弹框、名字折叠、「我的通道」的省份与弹框手柄。
 * 2026-11-07 自 account 桶在新域重写(Frank「全部在新域重写」):接口、编辑弹框(gate 桶 GateEdit)、「我的通道」照旧;
 * 「修改」从卡头挪到页标题右边一颗主按钮,一格多个名字先摆 3 个(效果图)。
 * 同日 Frank「按 Azure 的改」→「删了吧」:编辑弹框换成 gate 桶一页表单 GateForm,GateEdit 已删(上面「编辑弹框(gate 桶 GateEdit)」现指 GateForm)。
 * 2026-11-12 Frank「这两个不能合并成一个吗?比如匹配规则 是 按专业,还是按什么其他的一个下拉选」:匹配依据、匹配模式两行的词条键
 * (pfMatchByKeyOf / pfMatchModeKeyOf)并成一行「匹配规则」的 pfRuleKeyOf。
 * 同日 Frank「这部分不能直接显示具体的年份和学历 证书吗?」:教育经历每条两行(年份 + 名称;学校与原先三个词),pfEduLinesOf 出。
 *
 * @author Frank
 * @time 2026-11-07 16:05:00
 */
import { eduPicksOf, makeEduLabel } from '@/components/gate'
import { log, PROFILE_LOG } from '@/lib/log'
import {
  CRED_INCLUDE, MS_PROV_FED, MS_PROVS, PF_ERR_EMPTY, PF_FOLD_N, PF_GOAL_JOBS, PF_GOAL_JOBS_KEY, PF_GOAL_PR,
  PF_GOAL_PR_KEY, PF_LOAD_FAIL, PF_LOAD_OK, TEXT_NONE, URL_PROFILE,
  EDU_F_KIND, EDU_F_LEN, EDU_F_PROV, PF_LIST_SEP, PF_MATCH_EDU, PF_MODE_STRICT, PF_RULE_EDU_KEY, PF_RULE_EDU_STRICT_KEY,
  PF_RULE_WORK_KEY, PF_RULE_WORK_STRICT_KEY, PF_YEAR_OPEN, PF_YEAR_SEP,
} from './constants'
import type {
  MsOpenIn, MsProvPickIn, MyStreamCellRow, PfEditOpenIn, PfFlagSetIn, PfJson, PfLoadIn, PfNames, PfSavedIn, PfSeed,
  PfShownIn, PfTextSetIn, PfView,
  PfEduItem, PfEduLine, PfEduLineIn, PfEduLinesIn, PfRuleIn,
} from './types'

/**
 * 取档案(quiz 域;答案档五格 + 三语名字 + 投递署名)。取挂了留痕、落「取不到」。
 *
 * @param x 两个落格。
 * @returns 无。
 */
export async function loadProfile(x: PfLoadIn): Promise<void> {
  try {
    const r = await fetch(URL_PROFILE, { credentials: CRED_INCLUDE })
    if (r.ok === false) {
      throw new Error(String(r.status))
    }
    const body = await r.json() as PfJson
    if (body.profile == null) {
      throw new Error(PF_ERR_EMPTY)
    }
    x.setView(body.profile)
    x.setLoad(PF_LOAD_OK)
  } catch (e) {
    log({ tag: PROFILE_LOG.tag, text: PROFILE_LOG.viewLoad + String(e) })
    x.setLoad(PF_LOAD_FAIL)
  }
}

/**
 * 造「开编辑弹框」:落起始题、开框(「修改」从第一题起;「我的通道」的「去回答」直接到身份题)。
 *
 * @param x 两个落格与起始题。
 * @returns 手柄。
 */
export function makeEditOpen(x: PfEditOpenIn): () => void {
  return function editOpen(): void {
    x.setStart(x.start)
    x.setEditing(true)
  }
}

/**
 * 造「落一个开关」。
 *
 * @param x 落格与值。
 * @returns 手柄。
 */
export function makeFlagSet(x: PfFlagSetIn): () => void {
  return function flagSet(): void {
    x.set(x.v)
  }
}

/**
 * 造「保存成功」:关框、换一代重取档案(正文当场换新)。
 *
 * @param x 关框落格与代数。
 * @returns 回调。
 */
export function makeProfileSaved(x: PfSavedIn): () => void {
  return function profileSaved(): void {
    x.setEditing(false)
    x.setGen(x.gen + 1)
    x.onChanged()
  }
}

/**
 * 档案 → 修改弹框的起始答案(码清单取名字里的码)。
 *
 * @param v 档案。
 * @returns 起始答案。
 */
export function profileSeedOf(v: PfView): PfSeed {
  const majors: string[] = []
  for (const m of v.majors) {
    majors.push(m.code)
  }
  const nocs: string[] = []
  for (const n of v.nocs) {
    nocs.push(n.code)
  }
  const workNocs: string[] = []
  for (const n of v.works) {
    workNocs.push(n.code)
  }
  return {
    workNocs,
    matchBy: v.matchBy,
    matchMode: v.matchMode,
    fromResume: v.fromResume,
    goal: v.goal,
majors,
nocs,
prov: v.prov,
abroad: v.abroad,
city: v.city.en,
name: v.name,
who: v.who,
edu: v.edu,
eduList: v.eduList,
  }
}

/**
 * 目标那一格的词条键;没答给空串。
 *
 * @param goal 目标档。
 * @returns 词条键。
 */
export function pfGoalKeyOf(goal: number): string {
  if (goal === PF_GOAL_PR) {
    return PF_GOAL_PR_KEY
  }
  if (goal === PF_GOAL_JOBS) {
    return PF_GOAL_JOBS_KEY
  }
  return TEXT_NONE
}

/**
 * 一格名字折起来的个数(多于 PF_FOLD_N 的部分)。
 *
 * @param names 全部名字。
 * @returns 折起来几个。
 */
export function pfHiddenOf(names: PfNames): number {
  return Math.max(0, names.length - PF_FOLD_N)
}

/**
 * 一格名字这一刻摆哪些(2026-10-12 Frank「还有 11 个 改成 展开 / 收起,和其他地方一致」:折叠走 pager 桶 FoldLine + useFold):
 * 摆前 PF_FOLD_N 个再加已展开的个数(收起归零)。
 *
 * @param x 全部名字与已展开个数。
 * @returns 要摆的名字。
 */
export function pfShownOf(x: PfShownIn): PfNames {
  return x.names.slice(0, PF_FOLD_N + x.extra)
}

/**
 * 「我的通道」起始看哪个省:档案的所在省在省份胶囊那排里就看它,不在(没答、境外、没有通道的省)看联邦。
 *
 * @param prov 档案的所在省码。
 * @returns 省码。
 */
export function msInitProvOf(prov: string): string {
  for (const code of MS_PROVS) {
    if (code === prov) {
      return code
    }
  }
  return MS_PROV_FED
}

/**
 * 造「点省份胶囊」的工厂:换省、关掉开着的通道弹框。
 *
 * @param x 省份与开着的通道两个落格。
 * @returns 省码 → 手柄。
 */
export function makeProvPickOf(x: MsProvPickIn): (code: string) => () => void {
  return function provPickOf(code: string): () => void {
    return function pickProv(): void {
      x.setProv(code)
      x.setOpen(TEXT_NONE)
    }
  }
}

/**
 * 造「点通道名」的工厂:开那条通道的弹框。
 *
 * @param x 开着的通道落格。
 * @returns 通道编号 → 手柄。
 */
export function makeStreamOpenOf(x: MsOpenIn): (key: string) => () => void {
  return function openOf(key: string): () => void {
    return function openStream(): void {
      x.setOpen(key)
    }
  }
}

/**
 * 造「落一个字串」(关通道弹框 = 落空串)。
 *
 * @param x 落格与值。
 * @returns 手柄。
 */
export function makeTextSet(x: PfTextSetIn): () => void {
  return function textSet(): void {
    x.set(x.v)
  }
}

/**
 * 「我的通道」表的行键(table 桶定死签名:表行 → 键)。
 *
 * @param r 表行。
 * @returns 通道编号。
 */
export function msRowKeyOf(r: MyStreamCellRow): string {
  return r.key
}

/**
 * 「我的通道」表的全程格(table 桶定死签名:表行 → 格里的字)。
 *
 * @param r 表行。
 * @returns 全程。
 */
export function msTotalOf(r: MyStreamCellRow): string {
  return r.total
}

/**
 * 「匹配规则」那一行的词条键(2026-11-12 匹配依据、匹配模式并成一行;没选按做过的工作、默认)。
 *
 * @param x 匹配依据与匹配模式。
 * @returns 词条键。
 */
export function pfRuleKeyOf(x: PfRuleIn): string {
  const strict = x.matchMode === PF_MODE_STRICT
  if (x.matchBy === PF_MATCH_EDU && strict) {
    return PF_RULE_EDU_STRICT_KEY
  }
  if (x.matchBy === PF_MATCH_EDU) {
    return PF_RULE_EDU_KEY
  }
  if (strict) {
    return PF_RULE_WORK_STRICT_KEY
  }
  return PF_RULE_WORK_KEY
}

/**
 * 教育经历明细 → 档案卡上的几条(2026-11-12),一条两行。
 *
 * @param x 教育经历明细与取词函数。
 * @returns 几条。
 */
export function pfEduLinesOf(x: PfEduLinesIn): PfEduLine[] {
  const out: PfEduLine[] = []
  for (const e of x.list) {
    out.push(pfEduLineOf({ e, t: x.t }))
  }
  return out
}

/**
 * 一条明细 → 两行:第一行年份在前、证书或学历名称在后;两样都没有就退回原先那一句(所在地、公立私立、时长,逗号连)。
 * 第二行灰字:学校,再接 key 的三个词(第一行已经用了那一句就不再重复);没有就不出。只有学校时学校上第一行。
 *
 * @param x 一条明细与取词函数。
 * @returns 两行。
 */
function pfEduLineOf(x: PfEduLineIn): PfEduLine {
  const parts = pfEduPartsOf(x)
  const main: string[] = []
  const years = pfEduYearsOf(x.e)
  if (years !== TEXT_NONE) {
    main.push(years)
  }
  if (x.e.cred !== TEXT_NONE) {
    main.push(x.e.cred)
  }
  const sub: string[] = []
  if (x.e.school !== TEXT_NONE) {
    sub.push(x.e.school)
  }
  if (main.length === 0 && parts.length > 0) {
    main.push(parts.join(PF_LIST_SEP))
  } else {
    for (const p of parts) {
      sub.push(p)
    }
  }
  if (main.length === 0) {
    return { main: sub, sub: TEXT_NONE }
  }
  return { main, sub: sub.join(PF_LIST_SEP) }
}

/**
 * 一条明细的 key → 三个词(院校所在地、公立私立、课程时长,字与修改面板的下拉同一套);key 空给空列。
 * 2026-11-12 Frank「有年份 还需要时长吗」「简历里能抽出来吧」:这一条有年份(开始或结束有一个)就不出课程时长那个词,
 * 只剩所在地、公立私立两个;没有年份照旧三个词。
 *
 * @param x 一条明细与取词函数。
 * @returns 三个词(有年份两个)或空列。
 */
function pfEduPartsOf(x: PfEduLineIn): string[] {
  const out: string[] = []
  for (const p of eduPicksOf([x.e.key])) {
    if (p.prov !== TEXT_NONE) {
      out.push(makeEduLabel({ t: x.t, f: EDU_F_PROV })(p.prov))
      out.push(makeEduLabel({ t: x.t, f: EDU_F_KIND })(p.kind))
      if (x.e.from === TEXT_NONE && x.e.to === TEXT_NONE) {
        out.push(makeEduLabel({ t: x.t, f: EDU_F_LEN })(p.len))
      }
    }
  }
  return out
}

/**
 * 一条明细的年份那一段:起止都有「2025 – 2026」;只有开始「2025 –」;只有结束就那一个;都没有空串。
 *
 * @param e 一条明细。
 * @returns 年份那一段。
 */
function pfEduYearsOf(e: PfEduItem): string {
  if (e.from !== TEXT_NONE && e.to !== TEXT_NONE) {
    return e.from + PF_YEAR_SEP + e.to
  }
  if (e.from !== TEXT_NONE) {
    return e.from + PF_YEAR_OPEN
  }
  return e.to
}
