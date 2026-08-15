// 法语社区移民试点(FCIP)—— 联邦区域线,按省拆行展示(NB/ON/MB/BC 六个社区)
//
// 与 RCIP 是**两条路**,不是一条路的两种叫法(2026-08-15 Frank「还有法语区,都拆成不同的策略文件吧」):
//   · 社区不同:FCIP 是 Acadian Peninsula(NB)、Sudbury、Timmins、Superior East(ON)、
//     St. Pierre Jolys(MB)、Kelowna(BC);Sudbury/Timmins 两地两条 pilot 都有,别当成同一份名单
//   · **语言尺子不同**:RCIP 按 offer 的 TEER 分 CLB 6/5/4;FCIP 是 **NCLC 5 一刀切,而且是法语**。
//     这就是本站先前不敢把 FCIP 挂成通道的原因 —— 我们的语言题问的是 CLB(英语的尺子),
//     拿它当 NCLC 用,会把一个不会法语的人判成「达标」再推荐去法语社区。故新开一道 french 闸,
//     由问卷「你的法语达到 NCLC 5 了吗」直接回答,没答落判不了(同 fieldMatch 的选配闸机制)。
import type { PathwayStrategy } from './types'
import { D } from './sources'

const FCIP = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/franco-immigration/eligibility.html'
const FCIP_LANG = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/franco-immigration/eligibility/language-test.html'
const FCIP_OFFER = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/franco-immigration/job-offer.html'

export const FCIP_PATHWAY: PathwayStrategy = {
  key: 'FCIP',
  province: 'FED',
  stream: 'Francophone Community Immigration Pilot',
  name: { zh: '法语社区移民试点(FCIP)', en: 'Francophone Community Immigration Pilot', ko: '프랑스어 커뮤니티 이민 시범(FCIP)' },
  // 六个社区落在这四个省(pilot_communities 实数,2026-08-15)
  regionProvinces: ['NB', 'ON', 'MB', 'BC'],
  reqProvince: 'FED',
  reqPrograms: ['FCIP'],
  countsForeign: true,
  // ⚠️ pnp_requirements 目前**没有** program='FCIP' 的行(RCIP 有 5 行)—— 经验/语言的**数值**还没入库,
  //    所以本通道的经验档会如实落「本站未收录」。补行走 etl/build_ee_rules.py(那里已备注过
  //    「Franco 语言规则不同,不共享 RCIP 那批行」),是另一件事,不在这里抄数字。
  gates: {
    offer: { need: 'required', url: FCIP, fetched: D,
      quote: 'have a valid job offer from a designated employer in the community' },
    // 官方资格页通篇没有「必须已在境内」这类条款(与 RCIP 同):读过这一页、页上没有 → basis absent
    statusInCanada: { need: 'notRequired', basis: 'absent', url: FCIP, fetched: D },
    // 「加拿大学历**或其等价的海外学历**」→ 不是加拿大学历闸
    credentialCanada: { need: 'notRequired', url: FCIP, fetched: D,
      quote: 'have a Canadian educational credential or the foreign equivalent',
      note: '有学历门槛,但**不要求是加拿大的** —— 两件事不许混(同 PE-sw 那条)' },
    // 法语闸:整条 pilot 的定义性条件
    french: { need: 'required', url: FCIP_LANG, fetched: D,
      quote: 'You need a minimum score of NCLC 5 in all 4 abilities to apply for the Francophone Community Immigration Pilot (FCIP).',
      note: '社区名单见 ' + FCIP_OFFER },
  },
  ui: {
    program: 'FCIP',
    jobsSource: 'fcipJobs',
    regionLabelKey: 'dp.francoCommunities',
    afterOfferOkKey: 'dp.planAfterOfferOkFcip',
    offerGapKey: 'offerFCIP',
    jobsQuery: 'pilot=FCIP',
    seeJobsKey: 'dp.planSeeJobsFcip',
  },
}
