/**
 * 联邦 快速通道(Express Entry:CEC / FSW / FST)
 * 资格靠三套准入 + CRS 打分,offer 只加分不设闸;资格页未设境内/加拿大学历门槛。
 * 细颗粒门槛(52 行)在 pnp_requirements program='FED',本文件不重复。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */
import type { PathwayStrategy } from './types'
import { D } from './constants'

const EE_URL = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html'

/**
 * 本通道的完整声明(取证与判读见文件头与各字段旁注)。
 */
export const FED_EE: PathwayStrategy = {
  key: 'FED-EE',
  province: 'FED',
  stream: 'Express Entry(CEC / FSW / FST)',
  reqProvince: 'FED',
  reqPrograms: ['CEC', 'FSW', 'FST'],
  drawStream: 'Canadian Experience Class',
  scorer: 'CRS',
  countsForeign: true,
  regionProvinces: null,
  reqStream: null,
  listRequired: null,
  drawFallbackProvinceWide: false,
  ui: { program: 'EE', regionLabelKey: 'dp.federal', jobsSource: null, afterOfferOkKey: null, offerGapKey: null, jobsQuery: null, seeJobsKey: null },
  gates: {
    offer: { need: 'notRequired', basis: 'absent', url: EE_URL, fetched: D, note: null },
    statusInCanada: { need: 'notRequired', basis: 'absent', url: EE_URL, fetched: D, note: null },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: EE_URL, fetched: D, note: null },
    fieldMatch: null,
    french: null,
  },
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
  note: null,
}
