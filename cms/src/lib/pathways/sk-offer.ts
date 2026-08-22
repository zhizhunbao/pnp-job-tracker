/**
 * 萨斯喀彻温省 雇主 offer 通道(SINP International Skilled Worker: Employment Offer)
 * offer 就是它的定义 —— 同组还有 OID 子通道是「没有 offer」那条,两条并列,别混判。
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */
import type { PathwayStrategy } from './types'
import { D } from './constants'

const SK_URL = 'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers'

/**
 * 本通道的完整声明(取证与判读见文件头与各字段旁注)。
 */
export const SK_OFFER: PathwayStrategy = {
  key: 'SK-offer',
  province: 'SK',
  stream: 'SINP International Skilled Worker: Employment Offer',
  reqProvince: 'SK',
  reqStream: /sinp international skilled worker/i,
  countsForeign: true,
  regionProvinces: null,
  reqPrograms: null,
  drawStream: null,
  scorer: null,
  listRequired: null,
  drawFallbackProvinceWide: false,
  gates: {
    offer: { need: 'required', url: SK_URL, fetched: D,
      quote: 'Employment Offer Learn what you need to apply to the SINP as an international skilled worker with an employment offer from Saskatchewan.',
      note: '同页另一条 OID 子通道明写「Don’t have a job offer in Saskatchewan but are highly skilled in an in-demand occupation.」—— 两条是并列关系,别混判', asks: null },
    statusInCanada: { need: 'notRequired', basis: 'absent', url: SK_URL, fetched: D, note: null },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: SK_URL, fetched: D, note: null },
    fieldMatch: null,
    french: null,
  },
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
  ui: null,
  note: null,
}
