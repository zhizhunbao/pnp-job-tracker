/**
 * me 桶子桶 jobs 的子桶 recommend —— 「今日推荐」这一页签的行为:推荐取数、换一批、推荐原因胶囊、通道两行名、显示更多与打码行量位。
 * 2026-10-12 Frank「你分的那些都不算子领域」「recommend 吧」:推荐原因、通道名、显示更多 / 打码行、推荐取数是「今日推荐」这一节,
 * 并成一个子桶。2026-11-07 随「我的求职」在新域重写(父桶 functions 过 1000 行闸,照旧切出这一族;「删除」(不再推)撤)。
 * 依赖只许父桶 → 子桶,子桶不取父桶,常量各自抄、形状本桶自声明。
 * 2026-11-07 Frank「现在都按 Azure 的来」:打码行与盖在上面的大钮撤(量位跟着撤),免费号锁住的条数改在表下一行说
 * (「还有 N 条推荐」+「解锁其余 N 条」主钮);「显示更多」只管没列出来的真行。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { pnpChannelKeyOf, pnpNameOf } from '@/components/pnp'
import { makeT } from '@/lib/i18n'
import { eeDisplay } from '@/lib/jobs'
import { homeProvinceOf } from '@/lib/location'
import {
  CRED_INCLUDE, LANG_EN, PICKS_FIRST, PICKS_SWAP_FREE, TEXT_NONE, URL_PICKS, URL_PICKS_BATCH,
  URL_PICKS_FRESH, WHY_KEYS, WHY_TAG, WHY_WAGE, WHY_WAGE_PLAIN_KEY,
} from './constants'
import type {
  ChanName, ChanNameIn, HiddenPicksIn, LoadPicksIn, PickItem, PicksFact, PicksRespJson, ShownPicksIn,
  SwapIn, TitledItem, UnlockNIn, WhyTag, WhyTextsIn,
} from './types'

/**
 * 造「拉一次推荐」:带上浏览器按时区预选的省(他没答所在省时服务端用它);失败拨「拉失败了」。
 * 2026-10-11:这一页答过档案(fresh)就让服务端不用当天缓存、按新答案现算。
 *
 * @param x 两个落格、要不要现算与第几批。
 * @returns 拉推荐的函数。
 */
export function makeLoadPicks(x: LoadPicksIn): () => Promise<void> {
  return async function loadPicks(): Promise<void> {
    let url = URL_PICKS + homeProvinceOf()
    if (x.fresh) {
      url += URL_PICKS_FRESH
    }
    if (x.batch > 0) {
      url += URL_PICKS_BATCH + String(x.batch)
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
  let more = 0
  if (d.more != null) {
    more = d.more
  }
  return { picks, more }
}

/**
 * 造「换一批」手柄(2026-10-13 Frank「这个要不要加个按钮 换一批」「比如可以换 三次 然后 再点就弹付费呢」):
 * 免费号换满 PICKS_SWAP_FREE 次再点开定价框;否则批号加一(钩子跟着重拉)并收起「显示更多」。Pro 不限。
 *
 * @param x 是不是 Pro、现在的批号与三个落格。
 * @returns 点击手柄。
 */
export function makeSwap(x: SwapIn): () => void {
  return function swap(): void {
    if (x.pro === false && x.batch >= PICKS_SWAP_FREE) {
      x.setUpsell(true)
      return
    }
    x.setBatch(x.batch + 1)
    x.setExpanded(false)
  }
}

/**
 * 推荐原因胶囊(2026-10-12 Frank「bullets 都改成 简洁的胶囊呢? 最好是 别换行」):一个好处一枚,tag 桶 ok 档。
 *
 * @param x 理由码、百分比、LMIA 名额、EE 类别、试点名与取词函数。
 * @returns 胶囊。
 */
export function whyTagsOf(x: WhyTextsIn): WhyTag[] {
  const out: WhyTag[] = []
  for (const text of whyTextsOf(x)) {
    out.push({ text, variant: WHY_TAG })
  }
  return out
}

/**
 * 推荐原因一枚一条:理由码按表取词,薪资那条带高出的百分比(没有百分比换不带数的那句)、LMIA 那条带名额、EE 那条带类别名;
 * 认不得的码不出(2026-10-12 Frank「整点有吸引力的 bullets」)。
 *
 * @param x 理由码、百分比、LMIA 名额、EE 类别、试点名与取词函数。
 * @returns 一枚一条的字。
 */
export function whyTextsOf(x: WhyTextsIn): string[] {
  const out: string[] = []
  for (const code of x.reasons) {
    const key = WHY_KEYS[code]
    if (key == null) {
      continue
    }
    if (code === WHY_WAGE && x.abovePct == null) {
      out.push(x.t(WHY_WAGE_PLAIN_KEY))
      continue
    }
    out.push(x.t(key, {
      n: whyPctOf(x.abovePct),
      m: x.lmiaPositions,
      e: eeDisplay({ t: x.t, label: x.eeCategory }),
      g: x.pilot,
    }))
  }
  return out
}

/**
 * 百分比的显示数(没有给 0;只在有百分比时才会被取词用到)。
 *
 * @param n 百分比。
 * @returns 数。
 */
export function whyPctOf(n: number | null): number {
  if (n == null) {
    return 0
  }
  return n
}

/**
 * 通道两行名(2026-10-12 通道列):照职位板省提名格同一判据(pnp 桶 pnpChannelKeyOf:具名通道,否则可提名且本省有省默认通道
 * 就是那条省默认通道),英文名黑字、界面语名灰字;不走省提名两格都空。
 * 同日 Frank「明确是关闭了的吗」→ 查官网后改「改推正在抽签的省」(SQL.MYJOBS_PICKS):没在抽的省的岗不再推。
 *
 * @param x 省码、通道三格、界面语与取词函数。
 * @returns 两行名。
 */
export function chanNameOf(x: ChanNameIn): ChanName {
  let defaults: string[] = []
  if (x.provDefault) {
    defaults = [x.province]
  }
  const job = {
    province: x.province,
    noc: TEXT_NONE,
    pnpStream: x.pnpStream,
    pnpBlocks: [],
    pnpEligible: x.pnpEligible,
  }
  const key = pnpChannelKeyOf({ job, defaults })
  if (key === TEXT_NONE) {
    return { en: TEXT_NONE, sub: TEXT_NONE }
  }
  const en = pnpNameOf({ key, t: makeT(LANG_EN) })
  const local = pnpNameOf({ key, t: x.t })
  if (x.lang === LANG_EN || local === en) {
    return { en, sub: TEXT_NONE }
  }
  return { en, sub: local }
}

/**
 * 推荐页签上的数:全部推荐条数(看得见的 + 锁住的)。
 *
 * @param data 推荐整包。
 * @returns 条数。
 */
export function picksTotalOf(data: PicksFact): number {
  return data.picks.length + data.more
}

/**
 * 表里列哪几条:没点「显示更多」先列 PICKS_FIRST 条,点了全列。
 *
 * @param x 看得见的推荐与点没点过。
 * @returns 要列的推荐。
 */
export function shownPicksOf<T>(x: ShownPicksIn<T>): T[] {
  if (x.expanded) {
    return x.items
  }
  return x.items.slice(0, PICKS_FIRST)
}

/**
 * 「显示更多」后面的条数:没点过 = 表里没列的真行;点过 = 0。
 * 2026-11-07 Frank「现在都按 Azure 的来」:锁住的不再算进来(改在表下「解锁」那一行说)。
 *
 * @param x 推荐整包与点没点过。
 * @returns 条数。
 */
export function hiddenPicksOf(x: HiddenPicksIn): number {
  if (x.expanded) {
    return 0
  }
  return Math.max(0, x.data.picks.length - PICKS_FIRST)
}

/**
 * 表下「解锁」那一行的条数(2026-11-07 代替打码行):免费号锁住的全部条数(回包 more:看得见的几条以外的全部;
 * 回包 locked 只是锁住给看的头几条,不是总数);Pro 或还没拉到给 0(不出那一行)。
 *
 * @param x 是不是 Pro 与推荐整包。
 * @returns 条数。
 */
export function unlockNOf(x: UnlockNIn): number {
  if (x.pro || x.data == null) {
    return 0
  }
  return x.data.more
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
