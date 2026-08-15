// 纽芬兰与拉布拉多省 国际毕业生类别(NLPNP International Graduate Category)
// 三类闸全是硬的 —— PGWP 同时锁死「加拿大学历」与「人在境内」。
// 这正是现网曾把「从没来过加拿大的海外护士」排进前三的那一条。
import type { PathwayStrategy } from './types'
import { D } from './sources'

const NL_URL = 'https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/applicants/international-graduate'
const NL_CATEGORY = 'https://www.gov.nl.ca/immigration/international-graduate-category'
/** 资格政策页(比上面两页细,专业对口那条出自这里) */
const NL_POLICY = 'https://www.gov.nl.ca/immigration/4-international-graduate-category-eligibility-criteria'

export const NL_INTL_GRAD: PathwayStrategy = {
  key: 'NL-intl-grad',
  province: 'NL',
  stream: 'NLPNP International Graduate Category',
  name: { zh: '纽芬兰省 国际毕业生类别', en: 'Newfoundland International Graduate', ko: '뉴펀들랜드주 국제 졸업생 부문' },
  reqProvince: 'NL',
  reqStream: /international graduate/i,
  countsForeign: false,
  gates: {
    offer: { need: 'required', url: NL_URL, fetched: D,
      quote: 'Full-time job or job offer from an eligible Newfoundland and Labrador employer , guarantee a minimum of 30 hours per week, and be at least one year in duration with a reasonable expectation of extension.' },
    // 指名要 PGWP,不是「人在加拿大」就行(2026-08-15 拆闸:asks=pgwp ——
    // 封闭工签、学签都不是 PGWP,不许拿「人在境内」冒充)
    statusInCanada: { need: 'required', asks: 'pgwp', url: NL_URL, fetched: D,
      quote: 'Must hold a valid post-graduation work permit (PGWP).' },
    credentialCanada: { need: 'required', url: NL_CATEGORY, fetched: D,
      quote: 'Applicant’s to this category must hold a valid post-graduation work permit (PGWP) and have a job offer with a Newfoundland and Labrador employer, meeting the employer criteria.',
      note: 'PGWP 的前提就是加拿大院校毕业 —— 学历闸由 PGWP 反推,不是我们自己加的' },
  },
  // 专业对口(2026-08-15 Frank「毕业生干厨师靠谱吗?跨专业了怎么弄」):官方要求岗位与所学专业相关。
  // 例外只给 Memorial / College of the North Atlantic 毕业生(且岗位要 NOC 需专科以上、TEER 0-3
  // 或 TEER 4 紧缺);**省外院校毕业生反而更严** —— offer 要与专业直接相关,且先在 NL 工作满 1 年。
  // 本站既没问专业、也没问毕业院校 → 判不了,但不许当成没有障碍:推荐原因挂灰胶囊「需专业对口」。
  notes: [
    { kind: 'fieldMatch', url: NL_POLICY,
      quote: 'Applicants to the International Graduate category should hold a fulltime position that is related to their field of study from the post-secondary program they completed in Canada.' },
  ],
}
