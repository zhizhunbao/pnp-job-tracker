// 乡村社区移民试点(RCIP)—— 联邦区域线,按省拆行展示(BC/AB/SK/MB/ON/NS)
// offer 是硬闸(官方原句就一句话)。资格页未设境内/学历闸。
import type { PathwayStrategy } from './types'
import { D } from './sources'

const RCIP_URL = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration/job-offer.html'

export const RCIP: PathwayStrategy = {
  key: 'RCIP',
  province: 'FED',
  stream: 'Rural Community Immigration Pilot',
  reqProvince: 'FED',
  reqPrograms: ['RCIP'],
  countsForeign: true,
  gates: {
    offer: { need: 'required', url: RCIP_URL, fetched: D,
      quote: 'Before you apply for permanent residence through this pilot, you need a job offer.' },
    statusInCanada: { need: 'notRequired', basis: 'absent', url: RCIP_URL, fetched: D },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: RCIP_URL, fetched: D },
  },
}
