/**
 * 通道域的常量 = **通道数据本体**:14 条通道的策略声明 + 注册表 + 出处常量 + 展示默认值。
 *
 * 取证方式(铁律 URL→数据→SQL):全部来自 data/crawl/<slug>/html_cache 的官方页,
 * 用 etl/scan_gate_quotes.py 捞候选句后人工核定。**不猜 URL、不凭印象、不拿文档记忆当库。**
 *
 * @author Frank
 * @time 2026-08-22 01:00:16
 */


import type { GateKey, PathwayKey, StatusAsk } from './types'

import type { Lang } from '../i18n'

// 🔴 本文件是**通道数据本体**(Frank 2026-08-22 拍板:策略就是常量,并入常量抽屉;
//    08-15「一条通道一个文件」的可查性由下面的分段横幅接续 —— 一通道一段,旁注原样)。
//    形状注解是本文件唯一的一条 import 边;引用与判读的取证方式见文件头。
import type { PathwayStrategy } from './types'

// =========================================================================
// 1. 出处与默认值
// =========================================================================

/**
 * 本轮 crawl 抓取日(mb-mpnp 是 2026-08-03,见 MB 段)。
 */
export const D = '2026-08-12'

/**
 * 与 etl/pnp/build_bc_req.py:PDF_URL 同一份。
 */
export const BC_GUIDE = 'https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-si-program-guide-pdf'

/**
 * 与 etl/pnp/build_pe_req.py:GUIDE_URL 同一份。
 */
export const PE_GUIDE = 'https://www.princeedwardisland.ca/sites/default/files/publications/pei_workforce_application_guide.pdf'

/**
 * NB 技术工人通道资格页(2026 换版后的新址;从老地址 302 落到的 PNP 总览页上现取的链接)。
 */
export const NB_SW_URL = 'https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/skilled-worker-stream.html'

/**
 * 展示默认:制度归属(普通省提名通道)。
 */
export const UI_PROGRAM_DEFAULT = 'PNP'

/**
 * 展示默认:在招口径(全省在招)。
 */
export const UI_JOBS_DEFAULT = 'openJobs'

/**
 * 闸兜底:没登记的格落成「本站未收录」的 need 值。
 */
export const NEED_UNKNOWN = 'unknown'

/**
 * 闸兜底:未收录的缘由值(没有资格页可读)。
 */
export const WHY_NO_SOURCE = 'no-source'

/**
 * 试点聚合认的两种制度(身兼两制的社区计入两组)。
 */
export const PILOT_TYPES = ['RCIP', 'FCIP'] as const

/**
 * 聚合分组键的分隔符。
 */
export const GROUP_SEP = '|'

/**
 * 聚合新开一组时 asOf(数据截止日)的起点。取空串是因为紧接着那句是
 * `if (r.asOf > g.asOf)` —— 组里留的是**最新**的截止日,而空串按字典序小于任何
 * 'YYYY-MM-DD' 串,第一条真日期必然把它顶掉。
 * 🔴 不能拿今天或某个假日期当起点:那会让「一条社区行都没带日期」的组显示出一个
 * 我们编的截止日,而这一格是要告诉用户「这些数字截到哪天」的。空串在这里的含义是
 * **一条带日期的行都还没见到**。
 */
export const ASOF_INIT = ''

// =========================================================================
// 2. 联邦 快速通道(FED-EE)
// =========================================================================

const EE_URL = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html'

/**
 * 联邦 快速通道(Express Entry:CEC / FSW / FST)
 * 资格靠三套准入 + CRS 打分,offer 只加分不设闸;资格页未设境内/加拿大学历门槛。
 * 细颗粒门槛(52 行)在 pnp_requirements program='FED',本文件不重复。
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
  ui: {
    program: 'EE',
    regionLabelKey: 'dp.federal',
    jobsSource: null,
    afterOfferOkKey: null,
    offerGapKey: null,
    jobsQuery: null,
    seeJobsKey: null,
  },
  gates: {
    offer: {
      need: 'notRequired',
      basis: 'absent',
      url: EE_URL,
      fetched: D,
      note: null,
    },
    statusInCanada: {
      need: 'notRequired',
      basis: 'absent',
      url: EE_URL,
      fetched: D,
      note: null,
    },
    credentialCanada: {
      need: 'notRequired',
      basis: 'absent',
      url: EE_URL,
      fetched: D,
      note: null,
    },
    fieldMatch: null,
    french: null,
  },
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
  note: null,
}

// =========================================================================
// 3. 安省 劳动力优先(ON-workforce)
// =========================================================================

const ON_URL = 'https://www.ontario.ca/page/ontario-workforce-priority-stream'

/**
 * 安大略省 劳动力优先通道(Ontario Workforce Priority stream)
 * offer 是硬闸(自雇医生例外,见 note)。境内**不是**闸 —— 官方那句管的是「已经在境内的人得有
 * 合法身份」,不是「必须在境内」,别读反。
 */
export const ON_WORKFORCE: PathwayStrategy = {
  key: 'ON-workforce',
  province: 'ON',
  stream: 'Ontario Workforce Priority stream',
  reqProvince: 'ON',
  reqStream: /workforce priority/i,
  drawStream: 'Ontario Workforce Priority stream',
  countsForeign: false,
  regionProvinces: null,
  reqPrograms: null,
  scorer: null,
  listRequired: null,
  drawFallbackProvinceWide: false,
  // ⚠️ ON 官方第三档(近 5 年同 NOC 2 年经验)本站未收录(C5b-0 留痕),这里只判已入库的两档。
  gates: {
    offer: {
      need: 'required',
      url: ON_URL,
      fetched: D,
      quote: 'The Ontario Workforce Priority stream offers eligible skilled foreign workers with a qualifying job offer and work experience in any National Occupational Classification ( NOC ) occupation',
      note: '例外:自雇医生无需 offer(官方同页原句「The stream is also available to eligible self-employed physicians who do not have a job offer.」)',
      asks: null,
    },
    statusInCanada: {
      need: 'notRequired',
      url: ON_URL,
      fetched: D,
      quote: 'Applicants may not qualify for nomination if they are residing in Canada without valid legal status at the time of nomination.',
      note: '条件句:管的是「若已在境内则须有合法身份」,不构成「必须在境内」',
    },
    credentialCanada: {
      need: 'notRequired',
      basis: 'absent',
      url: ON_URL,
      fetched: D,
      note: null,
    },
    fieldMatch: null,
    french: null,
  },
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
  ui: null,
  note: null,
}

// =========================================================================
// 4. 新不伦瑞克 技术工人(NB-sw)
// =========================================================================

/**
 * 新不伦瑞克省 技术工人通道(NB Experience pathway)
 *
 * 原先三类闸全 unknown —— crawl 的 nb-imm 只有 1 页门户。**根因是官网换版**:老地址
 * www2.gnb.ca/.../nb-skilled-worker-stream.html 现在 302 到 www.gnb.ca 新站,资格条文搬到了新页
 * (链接从重定向后的 PNP 总览页上现取,不是猜的)。
 * 🔴 同一处换版还坐实了另一件事:etl/pnp/build_nb_req.py 的 guide_urls() 现在返回空 —— 它照老地址
 * 去找三份指南 PDF,而重定向落在总览页上、那页没有指南链接 → **NB 的门槛行已经在冻结状态**(另账)。
 */
export const NB_SW: PathwayStrategy = {
  key: 'NB-sw',
  province: 'NB',
  stream: 'New Brunswick Skilled Worker stream(NB Experience pathway)',
  reqProvince: 'NB',
  reqStream: /new brunswick skilled worker/i,
  drawStream: 'Skilled Worker (NB Experience)',
  countsForeign: false,
  regionProvinces: null,
  reqPrograms: null,
  scorer: null,
  listRequired: null,
  drawFallbackProvinceWide: false,
  gates: {
    offer: {
      need: 'required',
      url: NB_SW_URL,
      fetched: D,
      quote: 'have the support of an eligible employer who has been actively operating in New Brunswick for the past 24 months, providing goods or services',
      note: 'Experience pathway 另写「be working full time in a non-seasonal position for the employer who is supporting your application」—— 雇主支持是硬闸',
      asks: null,
    },
    // 问的是「住在新省满 6 个月」,不是「人在加拿大」(2026-08-15 拆闸:asks=provResidence)
    statusInCanada: {
      need: 'required',
      asks: 'provResidence',
      url: NB_SW_URL,
      fetched: D,
      quote: 'have lived in New Brunswick for the past six months',
      note: 'Experience pathway 专条;另两条 pathway(Graduates / Priority Occupations)不是本站 NB-sw 判的那条',
    },
    credentialCanada: {
      need: 'notRequired',
      basis: 'absent',
      url: NB_SW_URL,
      fetched: D,
      note: '资格清单只写「have at least a high school diploma」,**没写必须是加拿大学历**;要加拿大学历的是 Graduates 那条 pathway',
    },
    fieldMatch: null,
    french: null,
  },
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
  ui: null,
  note: null,
}

// =========================================================================
// 5. 新斯科舍 技术工人(NS-sw)
// =========================================================================

const NS_URL = 'https://liveinnovascotia.com/skilled-worker'

/**
 * 新斯科舍省 技术工人通道(Nova Scotia Nominee Program — Skilled Worker stream)
 *
 * 注:NS **不设官方分值表** —— 2025-11-28 起 NSNP 全通道 + AIP 指定改 EOI,选谁由厅里按当期
 * 优先级酌情定(原句见 Decision 的 NO_POINTS_GRID)。所以分值卡里没有 NS 页签,那是
 * 官方的做法,不是本站的窟窿 —— 两句话在用户那儿意思相反,不许混。
 */
export const NS_SW: PathwayStrategy = {
  key: 'NS-sw',
  province: 'NS',
  stream: 'Nova Scotia Nominee Program — Skilled Worker stream',
  reqProvince: 'NS',
  reqStream: /nova scotia nominee/i,
  countsForeign: true,
  regionProvinces: null,
  reqPrograms: null,
  drawStream: null,
  scorer: null,
  listRequired: null,
  drawFallbackProvinceWide: false,
  gates: {
    offer: {
      need: 'required',
      url: NS_URL,
      fetched: D,
      quote: 'To submit an expression of interest (EOI) you must: have a full-time permanent job offer from a Nova Scotia employer',
      note: null,
      asks: null,
    },
    statusInCanada: {
      need: 'notRequired',
      basis: 'absent',
      url: NS_URL,
      fetched: D,
      note: null,
    },
    credentialCanada: {
      need: 'notRequired',
      basis: 'absent',
      url: NS_URL,
      fetched: D,
      note: null,
    },
    fieldMatch: null,
    french: null,
  },
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
  ui: null,
  note: null,
}

// =========================================================================
// 6. 萨省 雇主 offer(SK-offer)
// =========================================================================

const SK_URL = 'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers'

/**
 * 萨斯喀彻温省 雇主 offer 通道(SINP International Skilled Worker: Employment Offer)
 * offer 就是它的定义 —— 同组还有 OID 子通道是「没有 offer」那条,两条并列,别混判。
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
    offer: {
      need: 'required',
      url: SK_URL,
      fetched: D,
      quote: 'Employment Offer Learn what you need to apply to the SINP as an international skilled worker with an employment offer from Saskatchewan.',
      note: '同页另一条 OID 子通道明写「Don’t have a job offer in Saskatchewan but are highly skilled in an in-demand occupation.」—— 两条是并列关系,别混判',
      asks: null,
    },
    statusInCanada: {
      need: 'notRequired',
      basis: 'absent',
      url: SK_URL,
      fetched: D,
      note: null,
    },
    credentialCanada: {
      need: 'notRequired',
      basis: 'absent',
      url: SK_URL,
      fetched: D,
      note: null,
    },
    fieldMatch: null,
    french: null,
  },
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
  ui: null,
  note: null,
}

// =========================================================================
// 7. 大西洋移民计划(AIP)
// =========================================================================

const AIP_URL = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html'

/**
 * 大西洋移民计划(AIP)—— 联邦区域线,按省拆行展示(NB/NS/PE/NL)
 * offer 是硬闸;境内与加拿大学历官方**明写不要**(海外可申;毕业生或技术工人二选一)。
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
    offer: {
      need: 'required',
      url: AIP_URL,
      fetched: D,
      quote: 'You must receive a job offer from a designated employer in Atlantic Canada to participate in the program.',
      note: null,
      asks: null,
    },
    statusInCanada: {
      need: 'notRequired',
      url: AIP_URL,
      fetched: D,
      quote: 'You can be living abroad or in Canada as a temporary resident.',
      note: null,
    },
    credentialCanada: {
      need: 'notRequired',
      url: AIP_URL,
      fetched: D,
      quote: 'You must be either a recent graduate of a recognized post-secondary institution in Atlantic Canada or a skilled worker',
      note: '「毕业生 或 技术工人」是二选一,不是学历硬闸',
    },
    fieldMatch: null,
    french: null,
  },
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
}

// =========================================================================
// 8. 乡村社区试点(RCIP)
// =========================================================================

const RCIP_URL = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration/job-offer.html'

/**
 * 乡村社区移民试点(RCIP)—— 联邦区域线,按省拆行展示(BC/AB/SK/MB/ON/NS)
 * offer 是硬闸(官方原句就一句话)。资格页未设境内/学历闸。
 */
export const RCIP: PathwayStrategy = {
  key: 'RCIP',
  province: 'FED',
  stream: 'Rural Community Immigration Pilot',
  regionProvinces: ['BC', 'AB', 'SK', 'MB', 'ON', 'NS'],
  reqProvince: 'FED',
  reqPrograms: ['RCIP'],
  countsForeign: true,
  reqStream: null,
  drawStream: null,
  scorer: null,
  listRequired: null,
  drawFallbackProvinceWide: false,
  ui: {
    program: 'RCIP',
    jobsSource: 'rcipJobs',             // 试点社区 ∩ 本职业
    regionLabelKey: 'dp.ruralCommunities',
    afterOfferOkKey: 'dp.planAfterOfferOkRcip',
    offerGapKey: 'offerRCIP',           // 要的是**社区雇主**的 offer
    jobsQuery: 'pilot=RCIP',
    seeJobsKey: 'dp.planSeeJobsPilot',
  },
  gates: {
    offer: {
      need: 'required',
      url: RCIP_URL,
      fetched: D,
      quote: 'Before you apply for permanent residence through this pilot, you need a job offer.',
      note: null,
      asks: null,
    },
    statusInCanada: {
      need: 'notRequired',
      basis: 'absent',
      url: RCIP_URL,
      fetched: D,
      note: null,
    },
    credentialCanada: {
      need: 'notRequired',
      basis: 'absent',
      url: RCIP_URL,
      fetched: D,
      note: null,
    },
    fieldMatch: null,
    french: null,
  },
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
  note: null,
}

// =========================================================================
// 9. 法语社区试点(FCIP)
// =========================================================================

const FCIP = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/franco-immigration/eligibility.html'
const FCIP_LANG = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/franco-immigration/eligibility/language-test.html'
const FCIP_OFFER = 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/franco-immigration/job-offer.html'

/**
 * 法语社区移民试点(FCIP)—— 联邦区域线,按省拆行展示(NB/ON/MB/BC 六个社区)
 *
 * 与 RCIP 是**两条路**,不是一条路的两种叫法(2026-08-15 Frank「还有法语区,都拆成不同的策略文件吧」):
 * · 社区不同:FCIP 是 Acadian Peninsula(NB)、Sudbury、Timmins、Superior East(ON)、
 * St. Pierre Jolys(MB)、Kelowna(BC);Sudbury/Timmins 两地两条 pilot 都有,别当成同一份名单
 * · **语言尺子不同**:RCIP 按 offer 的 TEER 分 CLB 6/5/4;FCIP 是 **NCLC 5 一刀切,而且是法语**。
 * 这就是本站先前不敢把 FCIP 挂成通道的原因 —— 我们的语言题问的是 CLB(英语的尺子),
 * 拿它当 NCLC 用,会把一个不会法语的人判成「达标」再推荐去法语社区。故新开一道 french 闸,
 * 由问卷「你的法语达到 NCLC 5 了吗」直接回答,没答落判不了(同 fieldMatch 的选配闸机制)。
 */
export const FCIP_PATHWAY: PathwayStrategy = {
  key: 'FCIP',
  province: 'FED',
  stream: 'Francophone Community Immigration Pilot',
  // 六个社区落在这四个省(pilot_communities 实数,2026-08-15)
  regionProvinces: ['NB', 'ON', 'MB', 'BC'],
  reqProvince: 'FED',
  reqPrograms: ['FCIP'],
  countsForeign: true,
  reqStream: null,
  drawStream: null,
  scorer: null,
  listRequired: null,
  drawFallbackProvinceWide: false,
  // ⚠️ pnp_requirements 目前**没有** program='FCIP' 的行(RCIP 有 5 行)—— 经验/语言的**数值**还没入库,
  //    所以本通道的经验档会如实落「本站未收录」。补行走 etl/build_ee_rules.py(那里已备注过
  //    「Franco 语言规则不同,不共享 RCIP 那批行」),是另一件事,不在这里抄数字。
  gates: {
    offer: {
      need: 'required',
      url: FCIP,
      fetched: D,
      quote: 'have a valid job offer from a designated employer in the community',
      note: null,
      asks: null,
    },
    // 官方资格页通篇没有「必须已在境内」这类条款(与 RCIP 同):读过这一页、页上没有 → basis absent
    statusInCanada: {
      need: 'notRequired',
      basis: 'absent',
      url: FCIP,
      fetched: D,
      note: null,
    },
    // 「加拿大学历**或其等价的海外学历**」→ 不是加拿大学历闸
    credentialCanada: {
      need: 'notRequired',
      url: FCIP,
      fetched: D,
      quote: 'have a Canadian educational credential or the foreign equivalent',
      note: '有学历门槛,但**不要求是加拿大的** —— 两件事不许混(同 PE-sw 那条)',
    },
    // 法语闸:整条 pilot 的定义性条件
    french: {
      need: 'required',
      url: FCIP_LANG,
      fetched: D,
      quote: 'You need a minimum score of NCLC 5 in all 4 abilities to apply for the Francophone Community Immigration Pilot (FCIP).',
      note: '社区名单见 ' + FCIP_OFFER,
      asks: null,
    },
    fieldMatch: null,
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
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
  note: null,
}

// =========================================================================
// 10. 曼省 SWM(MB-swm)
// =========================================================================

const MB_URL = 'https://immigratemanitoba.com/mpnp/skilled-worker/swm/eligibility'
const MB_FETCHED = '2026-08-03'   // mb-mpnp 那轮 crawl 的抓取日,与其余省不同批

/**
 * 曼尼托巴省 技术工人通道(MPNP Skilled Worker Stream — Skilled Worker in Manitoba, SWM)
 * 「在曼省持续在职」就是它的定义性条件 —— 在省在职 + 雇主长期全职岗两个闸都在。
 * drawFallbackProvinceWide 只对 MB 开:MPNP 是**单池单分制**(所有 selection 抽同一个 EOI 池、
 * 同一把尺子);BC 是逐通道设线,对 BC 退回全省线就是拿医疗线量木匠(pnpSelfScore 里为此立过红线)。
 */
export const MB_SWM: PathwayStrategy = {
  key: 'MB-swm',
  province: 'MB',
  stream: 'MPNP Skilled Worker Stream — Skilled Worker in Manitoba (SWM)',
  reqProvince: 'MB',
  reqStream: /skilled worker in manitoba/i,
  drawStream: 'MPNP Skilled Worker Stream',
  drawFallbackProvinceWide: true,
  scorer: 'MB',
  countsForeign: false,
  regionProvinces: null,
  reqPrograms: null,
  listRequired: null,
  gates: {
    offer: {
      need: 'required',
      url: MB_URL,
      fetched: MB_FETCHED,
      quote: 'Your employer must demonstrate to the satisfaction of the MPNP that they are an established business with an ability to offer you full-time and long-term employment in Manitoba.',
      note: null,
      asks: null,
    },
    // 问的是「在曼省在职」,不是「人在加拿大」(2026-08-15 拆闸:asks=provEmployment ——
    // 先前拿 inCanada 过闸,一个在安省上班的人照样被放行)
    statusInCanada: {
      need: 'required',
      asks: 'provEmployment',
      url: MB_URL,
      fetched: MB_FETCHED,
      quote: 'To apply to the Skilled Worker in Manitoba (SWM) Pathway, you must demonstrate ongoing Manitoba employment as your established connection to Manitoba.',
      note: null,
    },
    credentialCanada: {
      need: 'notRequired',
      basis: 'absent',
      url: MB_URL,
      fetched: MB_FETCHED,
      note: null,
    },
    fieldMatch: null,
    french: null,
  },
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
  ui: null,
  note: null,
}

// =========================================================================
// 11. 阿省 机会通道(AB-opportunity)
// =========================================================================

const AB_URL = 'https://www.alberta.ca/aaip-alberta-opportunity-stream'
const AB_ELIG = 'https://www.alberta.ca/aaip-alberta-opportunity-stream-eligibility'

/**
 * 阿尔伯塔省 机会通道(AAIP Alberta Opportunity Stream)
 * 官方开篇就写明「已经在阿省全职在职的临时外劳」+ 有效工签,两个闸都是硬的。
 */
export const AB_OPPORTUNITY: PathwayStrategy = {
  key: 'AB-opportunity',
  province: 'AB',
  stream: 'AAIP Alberta Opportunity Stream',
  reqProvince: 'AB',
  reqStream: /alberta opportunity/i,
  drawStream: 'Alberta Opportunity Stream',
  countsForeign: true,
  regionProvinces: null,
  reqPrograms: null,
  scorer: null,
  listRequired: null,
  drawFallbackProvinceWide: false,
  // 官方原句要求「already working full-time in Alberta」+ 有效工签 —— 拿到 offer 也不是 Day0 就能申请,
  // 话术如实降级(2026-08-15 Frank「失实的话术修掉,按如实的改」)
  ui: {
    afterOfferOkKey: 'dp.planAfterOfferOkAb',
    program: null,
    jobsSource: null,
    regionLabelKey: null,
    offerGapKey: null,
    jobsQuery: null,
    seeJobsKey: null,
  },
  gates: {
    offer: {
      need: 'required',
      url: AB_URL,
      fetched: D,
      quote: 'The Alberta Opportunity Stream is for temporary foreign workers who are already working full-time in Alberta and have a full-time job offer from an Alberta employer in an eligible occupation.',
      note: null,
      asks: null,
    },
    // 问的是「有没有有效工签」,不是「人在不在加拿大」(2026-08-15 拆闸:asks=workPermit ——
    // 先前学签在读的人被这道闸放行,结论写成「只差一个 offer」)
    statusInCanada: {
      need: 'required',
      asks: 'workPermit',
      url: AB_ELIG,
      fetched: D,
      quote: 'At the time your application is submitted, and at the time AAIP assesses your application, you must have a valid work permit',
      note: null,
    },
    credentialCanada: {
      need: 'notRequired',
      basis: 'absent',
      url: AB_ELIG,
      fetched: D,
      note: null,
    },
    fieldMatch: null,
    french: null,
  },
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
  note: null,
}

// =========================================================================
// 12. BC 技术工人(BC-sw)
// =========================================================================

/**
 * BC 技术工人通道(BC PNP Skilled Worker stream)
 * offer 是闸(资格按 job offer 定)。原先 status/credential 标 unknown('criteria-elsewhere')——
 * welcomebc 那页把完整条件推给 Skills Immigration Program Guide,而那份指南 crawl 里没有。
 * 2026-08-12 直提 PDF(63 页)逐节读出来:§3.1–3.13 通用要求 + §4.1(a)-(e) 技术工人专条,两处都没有学历闸。
 */
export const BC_SW: PathwayStrategy = {
  key: 'BC-sw',
  province: 'BC',
  stream: 'BC PNP Skilled Worker stream',
  reqProvince: 'BC',
  reqStream: /bc pnp skill/i,
  drawStream: 'BC PNP Skilled Worker stream',
  countsForeign: true,
  regionProvinces: null,
  reqPrograms: null,
  scorer: null,
  listRequired: null,
  drawFallbackProvinceWide: false,
  gates: {
    offer: {
      need: 'required',
      url: BC_GUIDE,
      fetched: D,
      quote: 'You must have a valid job offer in an eligible occupation.',
      note: '§4.1 (b);§3.5 另写明要全职且原则上不定期',
      asks: null,
    },
    statusInCanada: {
      need: 'notRequired',
      url: BC_GUIDE,
      fetched: D,
      quote: 'The BC PNP will not nominate you if you: Are in Canada and are out of status',
      note: '§3.3 是条件句:管的是「若已在境内则须有合法身份」，不构成「必须在境内」—— 同 ON-workforce 那条，别读反',
    },
    credentialCanada: {
      need: 'notRequired',
      basis: 'absent',
      url: BC_GUIDE,
      fetched: D,
      note: '通用要求 §3.1–3.13 与技术工人 §4.1(a)-(e) 逐条读完，没有任何学历门槛(学历只在注册打分表里算分，不是资格门槛)',
    },
    fieldMatch: null,
    french: null,
  },
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
  ui: null,
  note: null,
}

// =========================================================================
// 13. BC Build(BC-build)
// =========================================================================

/**
 * BC Build(建筑工种定向抽选)
 * Build 是 Skills Immigration 池里的定向抽选,**资格门槛与 Skilled Worker 同一套**,
 * 只有抽选线是自己的 —— 所以 reqStream 与 BC-sw 相同,drawStream 不同。
 */
export const BC_BUILD: PathwayStrategy = {
  key: 'BC-build',
  province: 'BC',
  stream: 'BC PNP Build: construction trades targeted ITA',
  reqProvince: 'BC',
  reqStream: /bc pnp skill/i,
  drawStream: 'BC PNP Build: construction trades targeted ITA',
  countsForeign: true,
  regionProvinces: null,
  reqPrograms: null,
  scorer: null,
  listRequired: null,
  drawFallbackProvinceWide: false,
  note: 'Build 是 Skills Immigration 池里的定向抽选,资格门槛与 Skilled Worker 同一套',
  gates: {
    offer: {
      need: 'required',
      url: BC_GUIDE,
      fetched: D,
      quote: 'You must have a valid job offer in an eligible occupation.',
      note: null,
      asks: null,
    },
    statusInCanada: {
      need: 'notRequired',
      url: BC_GUIDE,
      fetched: D,
      quote: 'The BC PNP will not nominate you if you: Are in Canada and are out of status',
      note: '同 BC-sw:§3.3 是条件句，不是「必须在境内」',
    },
    credentialCanada: {
      need: 'notRequired',
      basis: 'absent',
      url: BC_GUIDE,
      fetched: D,
      note: '同 BC-sw:通用要求与本通道专条里都没有学历门槛',
    },
    fieldMatch: null,
    french: null,
  },
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
  ui: null,
}

// =========================================================================
// 14. NL 国际毕业生(NL-intl-grad)
// =========================================================================

const NL_URL = 'https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/applicants/international-graduate'
const NL_CATEGORY = 'https://www.gov.nl.ca/immigration/international-graduate-category'
/**
 * 资格政策页(比上面两页细,专业对口那条出自这里)。
 */
const NL_POLICY = 'https://www.gov.nl.ca/immigration/4-international-graduate-category-eligibility-criteria'
/**
 * 省外来路的额外在职门槛出自这一页(2026-08-15 从 data/crawl/nl-imm 的 html_cache 里现取,不是凭印象)。
 */
const NL_PREV_PT = 'https://www.gov.nl.ca/immigration/processing-applications-from-individuals-who-previously-resided-in-another-canadian-province-or-territory'
/**
 * nl-imm 那轮 crawl 的抓取日(manifest.crawled_at)。
 */
const NL_FETCHED = '2026-08-15'

/**
 * 纽芬兰与拉布拉多省 国际毕业生类别(NLPNP International Graduate Category)
 * 三类闸全是硬的 —— PGWP 同时锁死「加拿大学历」与「人在境内」。
 * 这正是现网曾把「从没来过加拿大的海外护士」排进前三的那一条。
 */
export const NL_INTL_GRAD: PathwayStrategy = {
  key: 'NL-intl-grad',
  province: 'NL',
  stream: 'NLPNP International Graduate Category',
  reqProvince: 'NL',
  reqStream: /international graduate/i,
  countsForeign: false,
  regionProvinces: null,
  reqPrograms: null,
  drawStream: null,
  scorer: null,
  listRequired: null,
  drawFallbackProvinceWide: false,
  gates: {
    offer: {
      need: 'required',
      url: NL_URL,
      fetched: D,
      quote: 'Full-time job or job offer from an eligible Newfoundland and Labrador employer , guarantee a minimum of 30 hours per week, and be at least one year in duration with a reasonable expectation of extension.',
      note: null,
      asks: null,
    },
    // 指名要 PGWP,不是「人在加拿大」就行(2026-08-15 拆闸:asks=pgwp ——
    // 封闭工签、学签都不是 PGWP,不许拿「人在境内」冒充)
    statusInCanada: {
      need: 'required',
      asks: 'pgwp',
      url: NL_URL,
      fetched: D,
      quote: 'Must hold a valid post-graduation work permit (PGWP).',
      note: null,
    },
    credentialCanada: {
      need: 'required',
      url: NL_CATEGORY,
      fetched: D,
      quote: 'Applicant’s to this category must hold a valid post-graduation work permit (PGWP) and have a job offer with a Newfoundland and Labrador employer, meeting the employer criteria.',
      note: 'PGWP 的前提就是加拿大院校毕业 —— 学历闸由 PGWP 反推,不是我们自己加的',
      asks: null,
    },
    // 专业对口(2026-08-15 Frank「毕业生干厨师靠谱吗?跨专业了怎么弄」→「加」):官方要求岗位与
    // 所学专业相关。先前只是一枚灰提醒胶囊(答不上就当没有障碍),收成真闸后由问卷两道题喂答案。
    fieldMatch: {
      need: 'required',
      url: NL_POLICY,
      fetched: D,
      quote: 'Applicants to the International Graduate category should hold a fulltime position that is related to their field of study from the post-secondary program they completed in Canada.',
      note: '省外院校毕业生更严:官方另写 offer 要与专业**直接**相关,且先在 NL 工作满 1 年',
      asks: null,
    },
    french: null,
  },
  // 例外:NL 本省院校(Memorial / College of the North Atlantic,该省公立高等院校就这两所)毕业生
  // 可以不直接对口,但岗位要「NOC 需专科以上 + TEER 0/1/2/3(或 TEER 4 紧缺)」。
  // TEER 4/5 那档要对紧缺清单,本站判不了 → 落判不了,不放行。
  fieldMatchExemption: {
    studyProvince: 'NL',
    teers: [0, 1, 2, 3],
    url: NL_POLICY,
    quote: 'Memorial University or College of the North Atlantic graduates are permitted to hold a position that is not directly related to their field of study provided the applicant’s position meets all of the following criteria: NOC code requires a post-secondary degree or diploma; Corresponds to NOC TEER 0, 1, 2 or 3 occupation or TEER 4 (in-demand) occupation;',
  },
  // 省外院校毕业生:先在 NL 全职干满 12 个月才可能被邀(2026-08-15 #317)。
  // 官方这条写的是「先前住在别的省/地区」,不是「在别的省读的书」—— 但在别省念完书的人**必然**
  // 先住过那个省,所以「加拿大学历 + 学习省≠NL」是这条政策的充分条件,判定层据此判(不反推:
  // 学习省=NL 的人这条不适用,学习省没答就判不了,不猜)。
  // 库里 NL 只有一行 `experience op='none'`(官方确实不设工作经验门槛),这条是并列的另一件事。
  outOfProvinceGrad: {
    months: 12,
    url: NL_PREV_PT,
    fetched: NL_FETCHED,
    effective: '2025-07-16',
    quote: 'NLPNP and AIP applicants who have resided in another PT prior to arriving in Newfoundland and Labrador must demonstrate a minimum 12 consecutive months of full-time employment in Newfoundland and Labrador before they may be considered for nomination under the NLPNP or endorsement under the AIP.',
  },
  ui: null,
  note: null,
}

// =========================================================================
// 15. PEI Workforce(PE-sw)
// =========================================================================

/**
 * 爱德华王子岛省 技术工人 / 紧缺职业(PEI PNP Workforce)
 *
 * 三类闸原先全标 unknown —— **不是官方没写,是我们没扫到**:crawl 的 pe-imm 只有 7 页
 * (门户 + 4 条新闻 + 1 个 stream 页,HTML 页挡在 Radware 后面),而资格条文一直在这份指南 PDF 里,
 * 我们自己的 build_pe_req.py 早就在读它。2026-08-12 取证器加了 PDF 源后逐条读出来。
 */
export const PE_SW: PathwayStrategy = {
  key: 'PE-sw',
  province: 'PE',
  stream: 'PEI PNP Workforce — Skilled Worker / Occupations in Demand',
  reqProvince: 'PE',
  reqStream: /pei pnp workforce/i,
  countsForeign: true,
  regionProvinces: null,
  reqPrograms: null,
  drawStream: null,
  scorer: null,
  drawFallbackProvinceWide: false,
  listRequired: {
    province: 'PE',
    streamRe: /occupations in demand/i,
  },
  gates: {
    offer: {
      need: 'required',
      url: PE_GUIDE,
      fetched: D,
      quote: 'have a full-time, non-seasonal (permanent or minimum of two years) job offer from a PEI employer in a high skilled occupation defined by the Training, Education, Experience, and Responsibility classification system as TEER category 0, 1, 2, or 3',
      note: null,
      asks: null,
    },
    // 问的是「有没有有效工签」(2026-08-15 拆闸:asks=workPermit,同 AB)
    statusInCanada: {
      need: 'required',
      asks: 'workPermit',
      url: PE_GUIDE,
      fetched: D,
      quote: 'have a valid work permit to be working in Canada',
      note: '同页 Note 留了境外招募的口子:「The Skilled Worker Stream may be utilized for talent recruitment outside of Canada, if the Prince Edward Island Employer has received authorization from the Office of Immigration prior to issuing a job offer.」—— 但那道口子要**雇主事先获授权**,不是申请人自己能满足的条件,故资格闸按 bullet 记',
    },
    credentialCanada: {
      need: 'notRequired',
      basis: 'absent',
      url: PE_GUIDE,
      fetched: D,
      note: '资格清单里确有学历要求(「have successfully completed a post-secondary degree or diploma (minimum two-year program)」),但**没写必须是加拿大学历** —— 学历闸有、加拿大学历闸无',
    },
    fieldMatch: null,
    french: null,
  },
  fieldMatchExemption: null,
  outOfProvinceGrad: null,
  ui: null,
  note: null,
}

// =========================================================================
// 16. 注册表(顺序即判定层稳定次序 —— 「编个次序出来等于替用户拿主意」,挪动即改行为)
// =========================================================================

/**
 * 14 条通道,顺序 = 判定层的注册表原序(见文件头注释,别随手改)。
 */
export const PATHWAYS: PathwayStrategy[] = [
  FED_EE,
  ON_WORKFORCE,
  NB_SW,
  NS_SW,
  SK_OFFER,
  AIP,
  RCIP,
  FCIP_PATHWAY,
  MB_SWM,
  AB_OPPORTUNITY,
  BC_SW,
  BC_BUILD,
  NL_INTL_GRAD,
  PE_SW,
]

// =========================================================================
// 15. 界面说法(通道名与门槛闸人话名;2026-08-22 Frank「所有都按域来管理」自 i18n 迁回)
// =========================================================================

/**
 * 通道名键型:`jpw.p.${PathwayKey}` —— 加一条通道、在 types.ts 登记完 key,
 * 下面三张表就会报缺,写完三语名才编得过。裸键 `jpw.p.XX` 不可能再上线
 * (2026-08-17 从 lib/pathways/<通道>.ts 搬去 i18n「文案只有一个家」,2026-08-22 按域迁回)。
 */
type PathwayNames = Record<`jpw.p.${PathwayKey}`, string>

/**
 * 通道名·中文。
 */
const pwZh: PathwayNames = {
  'jpw.p.AB-opportunity': '阿尔伯塔省 机会通道',
  'jpw.p.AIP': '大西洋移民计划(AIP)',
  'jpw.p.BC-build': '不列颠哥伦比亚省 建筑技工定向抽选',
  'jpw.p.BC-sw': '不列颠哥伦比亚省 技术工人通道',
  'jpw.p.FCIP': '法语社区移民试点(FCIP)',
  'jpw.p.FED-EE': '联邦 快速通道(EE)',
  'jpw.p.MB-swm': '曼尼托巴省 技术工人通道',
  'jpw.p.NB-sw': '新不伦瑞克省 技术工人通道',
  'jpw.p.NL-intl-grad': '纽芬兰省 国际毕业生类别',
  'jpw.p.NS-sw': '新斯科舍省 技术工人通道',
  'jpw.p.ON-workforce': '安大略省 劳动力优先通道',
  'jpw.p.PE-sw': '爱德华王子岛省 在需职业通道',
  'jpw.p.RCIP': '乡村社区移民试点(RCIP)',
  'jpw.p.SK-offer': '萨斯喀彻温省 雇主 offer 通道',
}
/**
 * 通道名·英文。
 */
const pwEn: PathwayNames = {
  'jpw.p.AB-opportunity': 'Alberta Opportunity Stream',
  'jpw.p.AIP': 'Atlantic Immigration Program',
  'jpw.p.BC-build': 'BC Build targeted draw',
  'jpw.p.BC-sw': 'British Columbia Skilled Worker',
  'jpw.p.FCIP': 'Francophone Community Immigration Pilot',
  'jpw.p.FED-EE': 'Federal Express Entry',
  'jpw.p.MB-swm': 'Manitoba Skilled Worker',
  'jpw.p.NB-sw': 'New Brunswick Skilled Worker',
  'jpw.p.NL-intl-grad': 'Newfoundland International Graduate',
  'jpw.p.NS-sw': 'Nova Scotia Skilled Worker',
  'jpw.p.ON-workforce': 'Ontario Workforce Priority',
  'jpw.p.PE-sw': 'PEI Occupations in Demand',
  'jpw.p.RCIP': 'Rural Community Immigration Pilot',
  'jpw.p.SK-offer': 'Saskatchewan Employment Offer',
}
/**
 * 通道名·韩文。
 */
const pwKo: PathwayNames = {
  'jpw.p.AB-opportunity': '앨버타주 기회 통로',
  'jpw.p.AIP': '대서양 이민 프로그램(AIP)',
  'jpw.p.BC-build': '브리티시컬럼비아주 건설 기능직 지정 추첨',
  'jpw.p.BC-sw': '브리티시컬럼비아주 기술인력 통로',
  'jpw.p.FCIP': '프랑스어 커뮤니티 이민 시범(FCIP)',
  'jpw.p.FED-EE': '연방 Express Entry',
  'jpw.p.MB-swm': '매니토바주 기술인력 통로',
  'jpw.p.NB-sw': '뉴브런즈윅주 기술인력 통로',
  'jpw.p.NL-intl-grad': '뉴펀들랜드주 국제 졸업생 부문',
  'jpw.p.NS-sw': '노바스코샤주 기술인력 통로',
  'jpw.p.ON-workforce': '온타리오주 우선 직군 통로',
  'jpw.p.PE-sw': '프린스에드워드아일랜드주 수요 직업 통로',
  'jpw.p.RCIP': '농촌 지역 이민 시범(RCIP)',
  'jpw.p.SK-offer': '서스캐처원주 고용 오퍼 통로',
}
/**
 * 通道名三语表(消费方:i18n 装配进 t() 的扁平表)。
 */
export const pathwayNames: Record<Lang, PathwayNames> = {
  zh: pwZh,
  en: pwEn,
  ko: pwKo,
}

/**
 * 三类闸的人话名(题面与结论共用一份,前端不另写)。分界:闸**有哪几类、每类怎么记**在
 * types/constants(那是词汇表与举证规则),这里只是它们在界面上的**说法**
 * (2026-08-17 从 lib/gateManifest.ts 搬去 i18n「文案只有一个家」,2026-08-22 按域迁回)。
 */
export const gateLabels: Record<GateKey, Record<Lang, string>> = {
  offer: {
    zh: 'job offer',
    en: 'job offer',
    ko: '잡 오퍼',
  },
  statusInCanada: {
    zh: '境内身份',
    en: 'status in Canada',
    ko: '캐나다 체류 신분',
  },
  credentialCanada: {
    zh: '加拿大学历',
    en: 'Canadian credential',
    ko: '캐나다 학력',
  },
  // 2026-08-15 第四类闸(Frank「毕业生干厨师靠谱吗?跨专业了怎么弄」):NL 国际毕业生官方要求
  // 岗位与所学专业相关。先前只是一枚灰提醒胶囊,答不上就当没有障碍 —— 与工签闸同一种病,收成真闸。
  fieldMatch: {
    zh: '专业对口',
    en: 'field of study match',
    ko: '전공 일치',
  },
  // 2026-08-15 第五类闸:FCIP 要 NCLC 5 **法语**四项。站里那道语言题问的是 CLB(英语的尺子),
  // 拿它当 NCLC 用 = 把不会法语的人判成达标再推去法语社区,故单开一闸、单问一题。
  french: {
    zh: '法语(NCLC 5)',
    en: 'French NCLC 5',
    ko: '프랑스어 NCLC 5',
  },
}

/**
 * statusInCanada 按 asks 拆开后的人话名(结论文案用它,不再统称「境内身份」)。
 */
export const askLabels: Record<StatusAsk, Record<Lang, string>> = {
  workPermit: {
    zh: '有效工签',
    en: 'work permit',
    ko: '유효한 취업 허가',
  },
  // 拉丁缩写**括起来**(同 french 的「法语(NCLC 5)」):闸名会与「判不了」直接连写,
  // 裸的 `毕业工签 PGWP` 拼出来是「毕业工签 PGWP判不了」,措辞层那份带空格,两边逐字对不上
  // ——2026-08-15 夜判定矩阵测试实撞,与「NCLC 5判不了」同一个病
  pgwp: {
    zh: '毕业工签(PGWP)',
    en: 'PGWP',
    ko: 'PGWP',
  },
  provResidence: {
    zh: '在该省居住',
    en: 'residence in the province',
    ko: '해당 주 거주',
  },
  provEmployment: {
    zh: '在该省在职',
    en: 'employment in the province',
    ko: '해당 주 재직',
  },
}
