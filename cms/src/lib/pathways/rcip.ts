/**
 * 乡村社区移民试点(RCIP)—— 联邦区域线,按省拆行展示(BC/AB/SK/MB/ON/NS)
 * offer 是硬闸(官方原句就一句话)。资格页未设境内/学历闸。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */
import type { PathwayStrategy } from './types'
import { D } from './constants'

const RCIP_URL = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration/job-offer.html'

/**
 * 本通道的完整声明(取证与判读见文件头与各字段旁注)。
 */
export const RCIP: PathwayStrategy = {
  key: 'RCIP',
  province: 'FED',
  stream: 'Rural Community Immigration Pilot',
  regionProvinces: ['BC', 'AB', 'SK', 'MB', 'ON', 'NS'],
  reqProvince: 'FED',
  reqPrograms: ['RCIP'],
  countsForeign: true,
  reqStream: null,
  drawStream: null,
  scorer: null,
  listRequired: null,
  drawFallbackProvinceWide: false,
  ui: {
    program: 'RCIP',
    jobsSource: 'rcipJobs',             // 试点社区 ∩ 本职业
    regionLabelKey: 'dp.ruralCommunities',
    afterOfferOkKey: 'dp.planAfterOfferOkRcip',
    offerGapKey: 'offerRCIP',           // 要的是**社区雇主**的 offer
    jobsQuery: 'pilot=RCIP',
    seeJobsKey: 'dp.planSeeJobsPilot',
  },
  gates: {
    offer: { need: 'required', url: RCIP_URL, fetched: D,
      quote: 'Before you apply for permanent residence through this pilot, you need a job offer.', note: null, asks: null },
    statusInCanada: { need: 'notRequired', basis: 'absent', url: RCIP_URL, fetched: D, note: null },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: RCIP_URL, fetched: D, note: null },
    fieldMatch: null,
    french: null,
  },
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
  note: null,
}
