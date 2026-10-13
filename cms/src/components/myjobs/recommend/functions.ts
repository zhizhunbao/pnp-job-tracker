/**
 * myjobs 桶的子桶 recommend —— 「我的求职」今日推荐这一节:行为:推荐取数、「删除」(不再推)、推荐原因胶囊、通道两行名、显示更多与打码行。
 * 2026-10-12 Frank「你分的那些都不算子领域」「recommend 吧」:原先按函数长相切的 cos / why / ask / today 四个子桶撤掉 ——
 * 删除确认、公司名懒翻三张表都用,回父桶;推荐原因、通道名、显示更多 / 打码行、推荐取数与「删除」(不再推)是「今日推荐」这一节,
 * 并成本子桶(判据同 prefs / thread:页面上的一节)。依赖只许父桶 → 子桶,子桶不取父桶,常量各自抄、形状本桶自声明。
 *
 * @author Frank
 * @time 2026-10-12 22:00:00
 */
import { pnpChannelKeyOf, pnpNameOf } from '@/components/pnp'
import { makeT } from '@/lib/i18n'
import { eeDisplay } from '@/lib/jobs'
import { homeProvinceOf } from '@/lib/location'
import {
  CRED_INCLUDE, LANG_EN, LOCK_SEL, METHOD_DELETE, PICKS_FIRST, ROW_SEL, TEXT_NONE, URL_PICKS, URL_PICKS_DEL,
  URL_PICKS_FRESH, WHY_KEYS, WHY_TAG, WHY_WAGE, WHY_WAGE_PLAIN_KEY,
} from './constants'
import type {
  ChanName, ChanNameIn, DismissIn, HiddenPicksIn, LoadPicksIn, LockedItem, PickItem, PicksFact, PicksPack,
  PicksRespJson, ShownPicksIn, TitledItem, WhyTag, WhyTextsIn,
} from './types'

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
 * 推荐原因一行一条(2026-10-12 Frank「还是需要一个 推荐原因的列 然后 bullets 显示 好处」):理由码按表取词,省提名那条带项目简称、薪资那条带高出的百分比
 * (没有百分比换不带数的那句);认不得的码不出。
 * 同日「整点有吸引力的 bullets」:省提名那条再带本省最近抽选日(月-日;没收录换不带日子的那句)、LMIA 那条带名额、EE 那条带类别名。
 *
 * @param x 理由码、百分比、LMIA 名额、EE 类别、试点名与取词函数。
 * @returns 一行一条的字。
 */
function whyTextsOf(x: WhyTextsIn): string[] {
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
function whyPctOf(n: number | null): number {
  if (n == null) {
    return 0
  }
  return n
}

/**
 * 卡头数字:全部推荐条数(看得见的 + 锁住的;2026-10-12 两张卡合成一张)。
 *
 * @param data 推荐整包。
 * @returns 条数。
 */
export function picksTotalOf(data: PicksPack): number {
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
 * 「显示更多」后面的条数:没点过 = 表里没列的真行 + 锁住的;点过 = 0(「显示更多」不再出)。
 *
 * @param x 推荐整包与点没点过。
 * @returns 条数。
 */
export function hiddenPicksOf(x: HiddenPicksIn): number {
  if (x.expanded) {
    return 0
  }
  return Math.max(0, x.data.picks.length - PICKS_FIRST) + x.data.more
}

/**
 * 通道两行名(2026-10-12 通道列):照职位板省提名格同一判据(pnp 桶 pnpChannelKeyOf:具名通道,否则可提名且本省有省默认通道
 * 就是那条省默认通道),英文名黑字、界面语名灰字;不走省提名两格都空。
 * 同日 Frank「明确是关闭了的吗」→ 查官网:安省 6 月 25 日起旧 8 条通道撤、新 Ontario Workforce Priority 8 月 4 日开 EOI、至今没发过邀请 ——
 * 先选「写通道名 + 未抽签胶囊」,看了实拍又改「改推正在抽签的省」(SQL.MYJOBS_PICKS):没在抽的省的岗不再推,胶囊随之撤。
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
 * 第一条打码行相对表格外框的上沿(「升级 Pro」大钮从这里往下盖住打码行)。
 *
 * @param box 表格外框。
 * @returns 像素;没有打码行给 null。
 */
export function lockTopOf(box: HTMLDivElement | null): number | null {
  if (box == null) {
    return null
  }
  const mark = box.querySelector(LOCK_SEL)
  if (mark == null) {
    return null
  }
  const row = mark.closest(ROW_SEL)
  if (row == null) {
    return null
  }
  return row.getBoundingClientRect().top - box.getBoundingClientRect().top
}

/**
 * 锁住几条(还没拉到给 0)。
 *
 * @param data 推荐整包。
 * @returns 条数。
 */
export function picksLockedN(data: PicksPack | null): number {
  if (data == null) {
    return 0
  }
  return data.locked.length
}

/**
 * 懒翻职位名要看的行:看得见的推荐 + 锁住的(打码行职位名也出灰字;还没拉到给 null)。
 *
 * @param data 推荐整包。
 * @returns 带职位名的行。
 */
export function titledPicksOf(data: PicksPack | null): TitledItem[] | null {
  if (data == null) {
    return null
  }
  const out: TitledItem[] = []
  for (const p of data.picks) {
    out.push({ title: p.title, titleZh: p.titleZh, titleKo: p.titleKo })
  }
  for (const l of data.locked) {
    out.push({ title: l.title, titleZh: l.titleZh, titleKo: l.titleKo })
  }
  return out
}

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
      x.setData(toPicksFact(await r.json() as PicksRespJson))
    } catch {
      x.setFailed(true)
    }
  }
}

/**
 * 推荐回包 → 推荐(行构造器:缺席按空读)。
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
  let locked: LockedItem[] = []
  if (d.locked != null) {
    locked = d.locked
  }
  return { picks, more, locked }
}

/**
 * 推荐清单里看得见的那几条(还没拉到给 null;懒翻表的入参)。
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

/**
 * 造今日推荐「删除」的手柄:先本地删掉这一行,再 DELETE(这一岗以后不再推);服务端没记成就退回原样。
 *
 * @param x 职位 id、原推荐与落格。
 * @returns 点击手柄。
 */
export function makeDismiss(x: DismissIn): () => Promise<void> {
  return async function dismiss(): Promise<void> {
    const picks: PickItem[] = []
    for (const p of x.data.picks) {
      if (p.id !== x.id) {
        picks.push(p)
      }
    }
    x.setData({ picks, more: x.data.more, locked: x.data.locked })
    try {
      const r = await fetch(URL_PICKS_DEL + x.id, { method: METHOD_DELETE, credentials: CRED_INCLUDE })
      if (r.ok === false) {
        x.setData(x.data)
      }
    } catch {
      x.setData(x.data)
    }
  }
}
