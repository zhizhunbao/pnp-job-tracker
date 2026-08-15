// BC 技术工人通道(BC PNP Skilled Worker stream)
// offer 是闸(资格按 job offer 定)。原先 status/credential 标 unknown('criteria-elsewhere')——
// welcomebc 那页把完整条件推给 Skills Immigration Program Guide,而那份指南 crawl 里没有。
// 2026-08-12 直提 PDF(63 页)逐节读出来:§3.1–3.13 通用要求 + §4.1(a)-(e) 技术工人专条,两处都没有学历闸。
import type { PathwayStrategy } from './types'
import { BC_GUIDE, D } from './sources'

export const BC_SW: PathwayStrategy = {
  key: 'BC-sw',
  province: 'BC',
  stream: 'BC PNP Skilled Worker stream',
  reqProvince: 'BC',
  reqStream: /bc pnp skill/i,
  drawStream: 'BC PNP Skilled Worker stream',
  countsForeign: true,
  gates: {
    offer: { need: 'required', url: BC_GUIDE, fetched: D,
      quote: 'You must have a valid job offer in an eligible occupation.',
      note: '§4.1 (b);§3.5 另写明要全职且原则上不定期' },
    statusInCanada: { need: 'notRequired', url: BC_GUIDE, fetched: D,
      quote: 'The BC PNP will not nominate you if you: Are in Canada and are out of status',
      note: '§3.3 是条件句:管的是「若已在境内则须有合法身份」，不构成「必须在境内」—— 同 ON-workforce 那条，别读反' },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: BC_GUIDE, fetched: D,
      note: '通用要求 §3.1–3.13 与技术工人 §4.1(a)-(e) 逐条读完，没有任何学历门槛(学历只在注册打分表里算分，不是资格门槛)' },
  },
}
