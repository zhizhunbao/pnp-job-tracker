/**
 * streams 域的派生与工厂:进页先看哪一省、省份手柄。
 * 2026-10-04 Frank 勾「卡上加钮 + 页签带省份」:省份跟着地址走 —— 进页先认地址里的 `?prov=`(互跳钮与页签切换带过来的),
 * 切省胶囊把地址换成 `?prov=新省`(不留锚点,免得再滚回原来那张卡),页签地址带上当前省(provHrefOf)。
 *
 * @author Frank
 * @time 2026-09-30 21:46:44
 */
import { homeProvinceOf } from '@/lib/location'
import { P_PROV, PROV_DEFAULT, STREAM_PROVS, TEXT_NONE, URL_KV_SEP, URL_QUERY_HEAD } from './constants'
import type { ClickFn, ProvHrefIn, ProvPickIn, ProvPickOfFn } from './types'

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
