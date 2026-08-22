/**
 * 阿尔伯塔省 机会通道(AAIP Alberta Opportunity Stream)
 * 官方开篇就写明「已经在阿省全职在职的临时外劳」+ 有效工签,两个闸都是硬的。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */
import type { PathwayStrategy } from './types'
import { D } from './constants'

const AB_URL = 'https://www.alberta.ca/aaip-alberta-opportunity-stream'
const AB_ELIG = 'https://www.alberta.ca/aaip-alberta-opportunity-stream-eligibility'

/**
 * 本通道的完整声明(取证与判读见文件头与各字段旁注)。
 */
export const AB_OPPORTUNITY: PathwayStrategy = {
  key: 'AB-opportunity',
  province: 'AB',
  stream: 'AAIP Alberta Opportunity Stream',
  reqProvince: 'AB',
  reqStream: /alberta opportunity/i,
  drawStream: 'Alberta Opportunity Stream',
  countsForeign: true,
  regionProvinces: null,
  reqPrograms: null,
  scorer: null,
  listRequired: null,
  drawFallbackProvinceWide: false,
  // 官方原句要求「already working full-time in Alberta」+ 有效工签 —— 拿到 offer 也不是 Day0 就能申请,
  // 话术如实降级(2026-08-15 Frank「失实的话术修掉,按如实的改」)
  ui: { afterOfferOkKey: 'dp.planAfterOfferOkAb', program: null, jobsSource: null, regionLabelKey: null, offerGapKey: null, jobsQuery: null, seeJobsKey: null },
  gates: {
    offer: { need: 'required', url: AB_URL, fetched: D,
      quote: 'The Alberta Opportunity Stream is for temporary foreign workers who are already working full-time in Alberta and have a full-time job offer from an Alberta employer in an eligible occupation.', note: null, asks: null },
    // 问的是「有没有有效工签」,不是「人在不在加拿大」(2026-08-15 拆闸:asks=workPermit ——
    // 先前学签在读的人被这道闸放行,结论写成「只差一个 offer」)
    statusInCanada: { need: 'required', asks: 'workPermit', url: AB_ELIG, fetched: D,
      quote: 'At the time your application is submitted, and at the time AAIP assesses your application, you must have a valid work permit', note: null },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: AB_ELIG, fetched: D, note: null },
    fieldMatch: null,
    french: null,
  },
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
  note: null,
}
