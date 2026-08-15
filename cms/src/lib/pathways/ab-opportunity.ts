// 阿尔伯塔省 机会通道(AAIP Alberta Opportunity Stream)
// 官方开篇就写明「已经在阿省全职在职的临时外劳」+ 有效工签,两个闸都是硬的。
import type { PathwayStrategy } from './types'
import { D } from './sources'

const AB_URL = 'https://www.alberta.ca/aaip-alberta-opportunity-stream'
const AB_ELIG = 'https://www.alberta.ca/aaip-alberta-opportunity-stream-eligibility'

export const AB_OPPORTUNITY: PathwayStrategy = {
  key: 'AB-opportunity',
  province: 'AB',
  stream: 'AAIP Alberta Opportunity Stream',
  reqProvince: 'AB',
  reqStream: /alberta opportunity/i,
  drawStream: 'Alberta Opportunity Stream',
  countsForeign: true,
  gates: {
    offer: { need: 'required', url: AB_URL, fetched: D,
      quote: 'The Alberta Opportunity Stream is for temporary foreign workers who are already working full-time in Alberta and have a full-time job offer from an Alberta employer in an eligible occupation.' },
    // 问的是「有没有有效工签」,不是「人在不在加拿大」(2026-08-15 拆闸:asks=workPermit ——
    // 先前学签在读的人被这道闸放行,结论写成「只差一个 offer」)
    statusInCanada: { need: 'required', asks: 'workPermit', url: AB_ELIG, fetched: D,
      quote: 'At the time your application is submitted, and at the time AAIP assesses your application, you must have a valid work permit' },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: AB_ELIG, fetched: D },
  },
}
