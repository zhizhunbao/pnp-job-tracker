// 乡村社区移民试点(RCIP)—— 联邦区域线,按省拆行展示(BC/AB/SK/MB/ON/NS)
// offer 是硬闸(官方原句就一句话)。资格页未设境内/学历闸。
import type { PathwayStrategy } from './types'
import { D } from './sources'

const RCIP_URL = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration/job-offer.html'

export const RCIP: PathwayStrategy = {
  key: 'RCIP',
  province: 'FED',
  stream: 'Rural Community Immigration Pilot',
  name: { zh: '乡村社区移民试点(RCIP)', en: 'Rural Community Immigration Pilot', ko: '농촌 지역 이민 시범(RCIP)' },
  regionProvinces: ['BC', 'AB', 'SK', 'MB', 'ON', 'NS'],
  reqProvince: 'FED',
  reqPrograms: ['RCIP'],
  countsForeign: true,
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
      quote: 'Before you apply for permanent residence through this pilot, you need a job offer.' },
    statusInCanada: { need: 'notRequired', basis: 'absent', url: RCIP_URL, fetched: D },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: RCIP_URL, fetched: D },
  },
}
