// 联邦 快速通道(Express Entry:CEC / FSW / FST)
// 资格靠三套准入 + CRS 打分,offer 只加分不设闸;资格页未设境内/加拿大学历门槛。
// 细颗粒门槛(52 行)在 pnp_requirements program='FED',本文件不重复。
import type { PathwayStrategy } from './types'
import { D } from './sources'

const EE_URL = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html'

export const FED_EE: PathwayStrategy = {
  key: 'FED-EE',
  province: 'FED',
  stream: 'Express Entry(CEC / FSW / FST)',
  name: { zh: '联邦 快速通道(EE)', en: 'Federal Express Entry', ko: '연방 Express Entry' },
  reqProvince: 'FED',
  reqPrograms: ['CEC', 'FSW', 'FST'],
  drawStream: 'Canadian Experience Class',
  scorer: 'CRS',
  countsForeign: true,
  gates: {
    offer: { need: 'notRequired', basis: 'absent', url: EE_URL, fetched: D },
    statusInCanada: { need: 'notRequired', basis: 'absent', url: EE_URL, fetched: D },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: EE_URL, fetched: D },
  },
}
