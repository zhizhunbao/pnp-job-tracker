/**
 * 大西洋移民计划(AIP)—— 联邦区域线,按省拆行展示(NB/NS/PE/NL)
 * offer 是硬闸;境内与加拿大学历官方**明写不要**(海外可申;毕业生或技术工人二选一)。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */
import type { PathwayStrategy } from './types'
import { D } from './constants'

const AIP_URL = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html'

/**
 * 本通道的完整声明(取证与判读见文件头与各字段旁注)。
 */
export const AIP: PathwayStrategy = {
  key: 'AIP',
  province: 'FED',
  stream: 'Atlantic Immigration Program',
  regionProvinces: ['NB', 'NS', 'PE', 'NL'],
  reqProvince: 'FED',
  reqPrograms: ['AIP'],
  countsForeign: true,
  reqStream: null,
  drawStream: null,
  scorer: null,
  listRequired: null,
  drawFallbackProvinceWide: false,
  note: 'AIP 门槛数字只在联邦 canada.ca 页,现有 crawl 无覆盖(C5b-0 如实留缺口)',
  ui: {
    program: 'AIP',
    jobsSource: 'aipJobs',              // 该省指定雇主 ∩ 本职业,不是全省在招
    regionLabelKey: 'dp.atlantic',
    afterOfferOkKey: 'dp.planAfterOfferOkAip',
    offerGapKey: 'offerAIP',            // 要的是**指定雇主**的 offer
    jobsQuery: 'aip=yes',
    seeJobsKey: 'dp.planSeeJobsAip',
  },
  gates: {
    offer: { need: 'required', url: AIP_URL, fetched: D,
      quote: 'You must receive a job offer from a designated employer in Atlantic Canada to participate in the program.', note: null, asks: null },
    statusInCanada: { need: 'notRequired', url: AIP_URL, fetched: D,
      quote: 'You can be living abroad or in Canada as a temporary resident.', note: null },
    credentialCanada: { need: 'notRequired', url: AIP_URL, fetched: D,
      quote: 'You must be either a recent graduate of a recognized post-secondary institution in Atlantic Canada or a skilled worker',
      note: '「毕业生 或 技术工人」是二选一,不是学历硬闸' },
    fieldMatch: null,
    french: null,
  },
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
}
