/**
 * me 桶子桶 profile 的行为:取档案、档案 → 编辑弹框的起始答案、开 / 关 / 保存编辑弹框、名字折叠、「我的通道」的省份与弹框手柄。
 * 2026-11-07 自 account 桶在新域重写(Frank「全部在新域重写」):接口、编辑弹框(gate 桶 GateEdit)、「我的通道」照旧;
 * 「修改」从卡头挪到页标题右边一颗主按钮,一格多个名字先摆 3 个(效果图)。
 * 同日 Frank「按 Azure 的改」→「删了吧」:编辑弹框换成 gate 桶一页表单 GateForm,GateEdit 已删(上面「编辑弹框(gate 桶 GateEdit)」现指 GateForm)。
 *
 * @author Frank
 * @time 2026-11-07 16:05:00
 */
import { log, PROFILE_LOG } from '@/lib/log'
import {
  CRED_INCLUDE, MS_PROV_FED, MS_PROVS, PF_ERR_EMPTY, PF_FOLD_N, PF_GOAL_JOBS, PF_GOAL_JOBS_KEY, PF_GOAL_PR,
  PF_GOAL_PR_KEY, PF_LOAD_FAIL, PF_LOAD_OK, TEXT_NONE, URL_PROFILE,
  PF_BY_EDU_KEY, PF_BY_WORK_KEY, PF_MATCH_EDU, PF_MODE_DEFAULT_KEY, PF_MODE_STRICT, PF_MODE_STRICT_KEY,
} from './constants'
import type {
  MsOpenIn, MsProvPickIn, MyStreamCellRow, PfEditOpenIn, PfFlagSetIn, PfJson, PfLoadIn, PfNames, PfSavedIn, PfSeed,
  PfShownIn, PfTextSetIn, PfView,
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
    goal: v.goal,
majors,
nocs,
prov: v.prov,
abroad: v.abroad,
city: v.city.en,
name: v.name,
who: v.who,
edu: v.edu,
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
 * 匹配依据那一格的词条键(没选按工作经历)。
 *
 * @param by 匹配依据。
 * @returns 词条键。
 */
export function pfMatchByKeyOf(by: string): string {
  if (by === PF_MATCH_EDU) {
    return PF_BY_EDU_KEY
  }
  return PF_BY_WORK_KEY
}

/**
 * 匹配模式那一格的词条键(没选按默认)。
 *
 * @param mode 匹配模式。
 * @returns 词条键。
 */
export function pfMatchModeKeyOf(mode: string): string {
  if (mode === PF_MODE_STRICT) {
    return PF_MODE_STRICT_KEY
  }
  return PF_MODE_DEFAULT_KEY
}
