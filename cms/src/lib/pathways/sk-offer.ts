// 萨斯喀彻温省 雇主 offer 通道(SINP International Skilled Worker: Employment Offer)
// offer 就是它的定义 —— 同组还有 OID 子通道是「没有 offer」那条,两条并列,别混判。
import type { PathwayStrategy } from './types'
import { D } from './sources'

const SK_URL = 'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers'

export const SK_OFFER: PathwayStrategy = {
  key: 'SK-offer',
  province: 'SK',
  stream: 'SINP International Skilled Worker: Employment Offer',
  name: { zh: '萨斯喀彻温省 雇主 offer 通道', en: 'Saskatchewan Employment Offer', ko: '서스캐처원주 고용 오퍼 통로' },
  reqProvince: 'SK',
  reqStream: /sinp international skilled worker/i,
  countsForeign: true,
  gates: {
    offer: { need: 'required', url: SK_URL, fetched: D,
      quote: 'Employment Offer Learn what you need to apply to the SINP as an international skilled worker with an employment offer from Saskatchewan.',
      note: '同页另一条 OID 子通道明写「Don’t have a job offer in Saskatchewan but are highly skilled in an in-demand occupation.」—— 两条是并列关系,别混判' },
    statusInCanada: { need: 'notRequired', basis: 'absent', url: SK_URL, fetched: D },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: SK_URL, fetched: D },
  },
}
