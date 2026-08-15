// 安大略省 劳动力优先通道(Ontario Workforce Priority stream)
// offer 是硬闸(自雇医生例外,见 note)。境内**不是**闸 —— 官方那句管的是「已经在境内的人得有
// 合法身份」,不是「必须在境内」,别读反。
import type { PathwayStrategy } from './types'
import { D } from './sources'

const ON_URL = 'https://www.ontario.ca/page/ontario-workforce-priority-stream'

export const ON_WORKFORCE: PathwayStrategy = {
  key: 'ON-workforce',
  province: 'ON',
  stream: 'Ontario Workforce Priority stream',
  name: { zh: '安大略省 劳动力优先通道', en: 'Ontario Workforce Priority', ko: '온타리오주 우선 직군 통로' },
  reqProvince: 'ON',
  reqStream: /workforce priority/i,
  drawStream: 'Ontario Workforce Priority stream',
  countsForeign: false,
  // ⚠️ ON 官方第三档(近 5 年同 NOC 2 年经验)本站未收录(C5b-0 留痕),这里只判已入库的两档。
  gates: {
    offer: { need: 'required', url: ON_URL, fetched: D,
      quote: 'The Ontario Workforce Priority stream offers eligible skilled foreign workers with a qualifying job offer and work experience in any National Occupational Classification ( NOC ) occupation',
      note: '例外:自雇医生无需 offer(官方同页原句「The stream is also available to eligible self-employed physicians who do not have a job offer.」)' },
    statusInCanada: { need: 'notRequired', url: ON_URL, fetched: D,
      quote: 'Applicants may not qualify for nomination if they are residing in Canada without valid legal status at the time of nomination.',
      note: '条件句:管的是「若已在境内则须有合法身份」,不构成「必须在境内」' },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: ON_URL, fetched: D },
  },
}
