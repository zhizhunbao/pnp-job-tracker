// BC Build(建筑工种定向抽选)
// Build 是 Skills Immigration 池里的定向抽选,**资格门槛与 Skilled Worker 同一套**,
// 只有抽选线是自己的 —— 所以 reqStream 与 BC-sw 相同,drawStream 不同。
import type { PathwayStrategy } from './types'
import { BC_GUIDE, D } from './sources'

export const BC_BUILD: PathwayStrategy = {
  key: 'BC-build',
  province: 'BC',
  stream: 'BC PNP Build: construction trades targeted ITA',
  name: { zh: '不列颠哥伦比亚省 建筑技工定向抽选', en: 'BC Build targeted draw', ko: '브리티시컬럼비아주 건설 기능직 지정 추첨' },
  reqProvince: 'BC',
  reqStream: /bc pnp skill/i,
  drawStream: 'BC PNP Build: construction trades targeted ITA',
  countsForeign: true,
  note: 'Build 是 Skills Immigration 池里的定向抽选,资格门槛与 Skilled Worker 同一套',
  gates: {
    offer: { need: 'required', url: BC_GUIDE, fetched: D,
      quote: 'You must have a valid job offer in an eligible occupation.' },
    statusInCanada: { need: 'notRequired', url: BC_GUIDE, fetched: D,
      quote: 'The BC PNP will not nominate you if you: Are in Canada and are out of status',
      note: '同 BC-sw:§3.3 是条件句，不是「必须在境内」' },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: BC_GUIDE, fetched: D,
      note: '同 BC-sw:通用要求与本通道专条里都没有学历门槛' },
  },
}
