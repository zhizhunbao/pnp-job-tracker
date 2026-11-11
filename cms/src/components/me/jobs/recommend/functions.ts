/**
 * me 桶子桶 jobs 的子桶 recommend —— 「今日推荐」这一页签的行为:推荐取数、换一批、推荐原因胶囊、通道两行名、显示更多与打码行量位。
 * 2026-10-12 Frank「你分的那些都不算子领域」「recommend 吧」:推荐原因、通道名、显示更多 / 打码行、推荐取数是「今日推荐」这一节,
 * 并成一个子桶。2026-11-07 随「我的求职」在新域重写(父桶 functions 过 1000 行闸,照旧切出这一族;「删除」(不再推)撤)。
 * 依赖只许父桶 → 子桶,子桶不取父桶,常量各自抄、形状本桶自声明。
 * 2026-11-07 Frank「现在都按 Azure 的来」:打码行与盖在上面的大钮撤(量位跟着撤),免费号锁住的条数改在表下一行说
 * (「还有 N 条推荐」+「解锁其余 N 条」主钮);「显示更多」只管没列出来的真行。
 * 2026-11-09 Frank「推荐原因删掉」:推荐原因胶囊那一族撤(表格改出中位时薪、vs 中位两列,显示串在本桶 wageViewOf)。
 * 2026-11-11 Frank「别一次性推荐 50 个」「不需要解锁其余」(任务书第 47 条):每天 10 条全给,换一批、显示更多、解锁那一行撤;
 * 加表下「看全部同类职位」的去处 boardHrefOf。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { homeProvinceOf } from '@/lib/location'
import {
  CRED_INCLUDE, NOC_SEP, PARAM_NOC, TEXT_NONE, URL_BOARD_PROV, URL_PICKS,
  URL_PICKS_FRESH, MED_HEAD, MED_TAIL, VS_PCT, VS_PLUS,
} from './constants'
import type {
  LoadPicksIn, PickItem, PicksFact, PicksRespJson,
  TitledItem, WageView, WageViewIn,
} from './types'

/**
 * 造「拉一次推荐」:带上浏览器按时区预选的省(他没答所在省时服务端用它);失败拨「拉失败了」。
 * 2026-10-11:这一页答过档案(fresh)就让服务端不用当天缓存、按新答案现算。
 *
 * @param x 两个落格与要不要现算。
 * @returns 拉推荐的函数。
 */
export function makeLoadPicks(x: LoadPicksIn): () => Promise<void> {
  return async function loadPicks(): Promise<void> {
    let url = URL_PICKS + homeProvinceOf()
    if (x.fresh) {
      url += URL_PICKS_FRESH
    }
    try {
      const r = await fetch(url, { credentials: CRED_INCLUDE })
      if (r.ok === false) {
        x.setFailed(true)
        return
      }
      x.setFailed(false)
      x.setData(toPicksFact(await r.json() as PicksRespJson))
    } catch {
      x.setFailed(true)
    }
  }
}

/**
 * 推荐回包 → 推荐(行构造器:缺席按空读)。2026-11-07 回包里锁住给看的那几条(locked)不再读 —— 打码行撤了。
 *
 * @param d 回包。
 * @returns 推荐。
 */
export function toPicksFact(d: PicksRespJson): PicksFact {
  let picks: PickItem[] = []
  if (d.picks != null) {
    picks = d.picks
  }
  return { picks }
}

/**
 * 表下「看全部同类职位」的去处(2026-11-11 任务书第 47 条):职位板带上头一条推荐的省与这批推荐的全部职业码;
 * 没有推荐或都没有职业码给空串(不出那一行)。
 *
 * @param data 推荐整包(还没拉到给 null)。
 * @returns 职位板地址;没有给空串。
 */
export function boardHrefOf(data: PicksFact | null): string {
  if (data == null || data.picks.length === 0) {
    return TEXT_NONE
  }
  const nocs: string[] = []
  let prov = TEXT_NONE
  for (const p of data.picks) {
    if (prov === TEXT_NONE) {
      prov = p.province
    }
    if (p.noc !== TEXT_NONE && nocs.includes(p.noc) === false) {
      nocs.push(p.noc)
    }
  }
  if (nocs.length === 0) {
    return TEXT_NONE
  }
  return URL_BOARD_PROV + prov + PARAM_NOC + nocs.join(NOC_SEP)
}

/**
 * 中位时薪与 vs 中位两格的显示(2026-11-09 Frank「这部分加进 table 吧」「这个地方都显示 时薪吧」;同职位板那两列的形)。
 *
 * @param x 时薪中位与高出中位的百分比。
 * @returns 两格显示串与是不是低于中位。
 */
export function wageViewOf(x: WageViewIn): WageView {
  return { med: medTextOf(x.hourly), vs: vsTextOf(x.pct), down: x.pct != null && x.pct < 0 }
}

/**
 * 中位时薪显示串(「$N/hr」);没有中位给空串。
 *
 * @param n 本省同职业时薪中位。
 * @returns 显示串。
 */
export function medTextOf(n: number | null): string {
  if (n == null || n <= 0) {
    return TEXT_NONE
  }
  return MED_HEAD + String(n) + MED_TAIL
}

/**
 * vs 中位显示串(高于或持平带加号,低于自带减号);没有百分比给空串。
 *
 * @param n 薪资高出中位的百分比。
 * @returns 显示串。
 */
export function vsTextOf(n: number | null): string {
  if (n == null) {
    return TEXT_NONE
  }
  if (n >= 0) {
    return VS_PLUS + String(n) + VS_PCT
  }
  return String(n) + VS_PCT
}

/**
 * 懒翻职位名要看的行:看得见的推荐(还没拉到给 null)。2026-11-07 打码行撤,锁住的不再翻。
 *
 * @param data 推荐整包。
 * @returns 带职位名的行。
 */
export function titledPicksOf(data: PicksFact | null): TitledItem[] | null {
  if (data == null) {
    return null
  }
  const out: TitledItem[] = []
  for (const p of data.picks) {
    out.push({ title: p.title, titleZh: p.titleZh, titleKo: p.titleKo })
  }
  return out
}

/**
 * 推荐清单里看得见的那几条(还没拉到给 null;公司名懒翻表的入参)。
 *
 * @param data 推荐整包。
 * @returns 看得见的推荐;没拉到给 null。
 */
export function picksOf(data: PicksFact | null): PickItem[] | null {
  if (data == null) {
    return null
  }
  return data.picks
}
