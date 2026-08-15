// 大西洋移民计划(AIP)—— 联邦区域线,按省拆行展示(NB/NS/PE/NL)
// offer 是硬闸;境内与加拿大学历官方**明写不要**(海外可申;毕业生或技术工人二选一)。
import type { PathwayStrategy } from './types'
import { D } from './sources'

const AIP_URL = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html'

export const AIP: PathwayStrategy = {
  key: 'AIP',
  province: 'FED',
  stream: 'Atlantic Immigration Program',
  reqProvince: 'FED',
  reqPrograms: ['AIP'],
  countsForeign: true,
  note: 'AIP 门槛数字只在联邦 canada.ca 页,现有 crawl 无覆盖(C5b-0 如实留缺口)',
  gates: {
    offer: { need: 'required', url: AIP_URL, fetched: D,
      quote: 'You must receive a job offer from a designated employer in Atlantic Canada to participate in the program.' },
    statusInCanada: { need: 'notRequired', url: AIP_URL, fetched: D,
      quote: 'You can be living abroad or in Canada as a temporary resident.' },
    credentialCanada: { need: 'notRequired', url: AIP_URL, fetched: D,
      quote: 'You must be either a recent graduate of a recognized post-secondary institution in Atlantic Canada or a skilled worker',
      note: '「毕业生 或 技术工人」是二选一,不是学历硬闸' },
  },
}
