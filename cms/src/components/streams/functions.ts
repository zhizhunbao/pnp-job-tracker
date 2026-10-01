/**
 * streams 域的派生与工厂:进页先看哪一省、省份手柄。
 *
 * @author Frank
 * @time 2026-09-30 21:46:44
 */
import { homeProvinceOf } from '@/lib/location'
import { PROV_DEFAULT, STREAM_PROVS } from './constants'
import type { ClickFn, ProvPickIn, ProvPickOfFn } from './types'

/**
 * 进页先看哪一省:设备时区(东部时区看浏览器语言,同职位板 homeProvinceOf);落在九省之外(魁省、三个地区)或认不出,
 * 看第一枚胶囊。
 *
 * @returns 省码。
 */
export function startProvOf(): string {
  const prov = homeProvinceOf()
  if (STREAM_PROVS.includes(prov)) {
    return prov
  }
  return PROV_DEFAULT
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
 *
 * @param x 省份落格。
 * @returns 逐省的手柄工厂。
 */
export function makeProvPickOf(x: ProvPickIn): ProvPickOfFn {
  return function pickOf(code: string): ClickFn {
    return function pick(): void {
      x.setProv(code)
    }
  }
}
