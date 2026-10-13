/**
 * streams 域的派生与工厂:进页先看哪一省、省份手柄。
 * 2026-10-04 Frank 勾「卡上加钮 + 页签带省份」:省份跟着地址走 —— 进页先认地址里的 `?prov=`(互跳钮与页签切换带过来的),
 * 切省胶囊把地址换成 `?prov=新省`(不留锚点,免得再滚回原来那张卡),页签地址带上当前省(provHrefOf)。
 * 2026-10-11 申请步骤分区筛选批 1(Frank「可以,开始做第一批」;设计 docs/design/资讯/申请步骤-分区筛选-20261011.md):
 * 多出「申请步骤」页的筛选一族(startStepsStateOf 往下)—— 省份 / 身份 / 教育经历,整份跟着地址走(可转发给别人)。
 * 2026-10-12 Frank「要不这个只作为咨询列出所有通道」「去掉其他筛选,只保留省份切换」「之后,在 我的 模块里,开一个我的通道来做 筛选 table」:
 * 身份 / 教育经历一族撤掉(判定与身份对照数据留在 pnp 子桶 fit,「我的通道」接着用),本页只剩「全部省份 + 九省」切换。
 * 同日 Frank「全部省份 去掉吧」:「申请步骤」页回到与「通道」页同一套省份口径(地址 / 时区预选),多出省份卡的条数两件。
 *
 * @author Frank
 * @time 2026-09-30 21:46:44
 */
import {
  P_PROV, PROV_COUNT_SEP, PROV_DEFAULT, STREAM_PROVS, TEXT_NONE, URL_KV_SEP, URL_QUERY_HEAD,
} from './constants'
import type {
  ClickFn, GroupChip, GroupPickIn, GroupPickOfFn, ProvChipTextIn, ProvCountsMap, ProvHrefIn, ProvPickIn, ProvPickOfFn,
} from './types'

/**
 * 进页先看哪一省:设备时区(东部时区看浏览器语言,同职位板 homeProvinceOf);落在九省之外(魁省、三个地区)或认不出,
 * 看第一枚胶囊。
 * 2026-10-04 地址里带了九省之一(`?prov=`,互跳钮与页签切换带过来的)就先认它。
 * 2026-10-12 Frank「默认选联邦,放到第一位」:时区预选撤,地址没带省份一律先看联邦(PROV_DEFAULT)。
 *
 * @returns 省码。
 */
export function startProvOf(): string {
  const asked = urlProvOf()
  if (asked !== TEXT_NONE) {
    return asked
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
 * 2026-10-12 加分类卡:切省同时清空分类(别省的类在这省没有)。
 *
 * @param x 省份落格。
 * @returns 逐省的手柄工厂。
 */
export function makeProvPickOf(x: ProvPickIn): ProvPickOfFn {
  return function pickOf(code: string): ClickFn {
    return function pick(): void {
      x.setProv(code)
      x.setGroup(TEXT_NONE)
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
 * 省份胶囊上的字:省名 + 条数(条数还没到只出省名)。
 *
 * @param x 省名、省码与各省条数。
 * @returns 胶囊字。
 */
export function provChipTextOf(x: ProvChipTextIn): string {
  const n = x.counts[x.code]
  if (n == null) {
    return x.name
  }
  return x.name + PROV_COUNT_SEP + String(n)
}

/**
 * 九省通道总数(卡头右侧灰字)。
 *
 * @param counts 省码 → 条数。
 * @returns 总数;整表没到是 0。
 */
export function provTotalOf(counts: ProvCountsMap): number {
  let total = 0
  for (const code of STREAM_PROVS) {
    const n = counts[code]
    if (n != null) {
      total += n
    }
  }
  return total
}

/**
 * 造分类手柄的工厂(2026-10-12 Frank「省份 下面加一个 分类 section 筛选」):点一类只看这一类,再点选中的那枚回到全部。
 *
 * @param x 当前分类与分类落格。
 * @returns 逐类的手柄工厂。
 */
export function makeGroupPickOf(x: GroupPickIn): GroupPickOfFn {
  return function pickOf(key: string): ClickFn {
    return function pick(): void {
      if (x.cur === key) {
        x.setGroup(TEXT_NONE)
        return
      }
      x.setGroup(key)
    }
  }
}

/**
 * 分类胶囊上的字:类名 + 条数(同省份胶囊的写法)。
 *
 * @param chip 一枚分类胶囊。
 * @returns 胶囊字。
 */
export function groupChipTextOf(chip: GroupChip): string {
  return chip.label + PROV_COUNT_SEP + chip.n
}
