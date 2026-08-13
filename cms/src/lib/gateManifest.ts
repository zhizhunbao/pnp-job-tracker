// 通道门槛清单(gate manifest)—— 设计:docs/design/通道判定口径根治-20260812.md §3.1
//
// 🔴 这张表回答的是「**这条通道有哪几类闸**」,不是「闸的数值是多少」(数值在 pnp_requirements)。
//    没有它,判定核只能发现「它有行的那些门槛里你缺哪一项」,发现不了「它压根没有行的那类门槛」——
//    于是「没有行 ⇒ 没有闸 ⇒ 没有 unknown ⇒ open」,实测五个画像 15 条结论全是「能走」,
//    含「从没来过加拿大的海外护士 → NLPNP 国际毕业生排进前三」。
//
// 取证方式(铁律 URL→数据→SQL):全部来自 `data/crawl/<slug>/html_cache` 的官方页,
// 用 `etl/scan_gate_quotes.py` 捞候选句后人工核定。**不猜 URL、不凭印象、不拿文档记忆当库。**
//
// 三态与举证责任:
//   required     —— 官方明写要(必带 quote)
//   notRequired  —— ① 官方明写不要(带 quote);或 ② **读过该通道的资格页、页上没有这一类闸**
//                   (带 url+fetched,basis='absent')。后者是可证伪的断言:我们指名读了哪一页、哪天读的。
//   unknown      —— 没有资格页可读,**或**该页自己声明「完整条件见别处」而别处没抓到 → 本站未收录。
//                   与「官方不要求」意思相反(CLAUDE.md 铁律),不许混。

export type GateKey = 'offer' | 'statusInCanada' | 'credentialCanada'

export type GateRule =
  | { need: 'required'; quote: string; url: string; fetched: string; note?: string }
  | { need: 'notRequired'; quote: string; url: string; fetched: string; note?: string }
  | { need: 'notRequired'; basis: 'absent'; url: string; fetched: string; note?: string }
  | { need: 'unknown'; why: 'no-source' | 'criteria-elsewhere'; url?: string; fetched?: string; note?: string }

/** 三类闸的人话名(题面与结论共用一份,前端不另写) */
export const GATE_LABEL: Record<GateKey, { zh: string; en: string; ko: string }> = {
  offer: { zh: 'job offer', en: 'job offer', ko: '잡 오퍼' },
  statusInCanada: { zh: '境内身份', en: 'status in Canada', ko: '캐나다 체류 신분' },
  credentialCanada: { zh: '加拿大学历', en: 'Canadian credential', ko: '캐나다 학력' },
}

const D = '2026-08-12'   // 本轮 crawl 抓取日(mb-mpnp 是 08-03,见该条)

// 两份官方指南 PDF:它们**不在 crawl 里**(BC 那页把完整条件推给指南、PE 的 HTML 页挡在 Radware 后面),
// 但我们自己的 ETL 一直在读 —— URL 逐条对齐既有脚本的常量,不另起一份,更不猜。
/** 与 etl/pnp/build_bc_req.py:PDF_URL 同一份 */
const BC_GUIDE = 'https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-si-program-guide-pdf'
/** 与 etl/pnp/build_pe_req.py:GUIDE_URL 同一份 */
const PE_GUIDE = 'https://www.princeedwardisland.ca/sites/default/files/publications/pei_workforce_application_guide.pdf'
/** NB 技术工人通道资格页(2026 换版后的新址;从老地址 302 落到的 PNP 总览页上现取的链接) */
const NB_SW = 'https://www.gnb.ca/en/topic/family-home-community/immigration/provincial-nominee-program/skilled-worker-stream.html'

export const GATE_MANIFEST: Record<string, Partial<Record<GateKey, GateRule>>> = {
  // 联邦 EE:资格靠 FSW/CEC/FST 三套准入 + CRS 打分,offer 只加分不设闸;资格页未设境内/加拿大学历门槛。
  // (EE 的细颗粒门槛另有 52 行落在 pnp_requirements program='FED',本清单不重复。)
  'FED-EE': {
    offer: { need: 'notRequired', basis: 'absent', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html', fetched: D },
    statusInCanada: { need: 'notRequired', basis: 'absent', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html', fetched: D },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html', fetched: D },
  },

  // AIP:offer 是硬闸;境内与加拿大学历官方**明写不要**(海外可申、毕业生或技术工人二选一)。
  AIP: {
    offer: { need: 'required', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html', fetched: D,
      quote: 'You must receive a job offer from a designated employer in Atlantic Canada to participate in the program.' },
    statusInCanada: { need: 'notRequired', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html', fetched: D,
      quote: 'You can be living abroad or in Canada as a temporary resident.' },
    credentialCanada: { need: 'notRequired', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration.html', fetched: D,
      quote: 'You must be either a recent graduate of a recognized post-secondary institution in Atlantic Canada or a skilled worker',
      note: '「毕业生 或 技术工人」是二选一,不是学历硬闸' },
  },

  // RCIP:offer 是硬闸(官方原句就一句话)。资格页未设境内/学历闸。
  RCIP: {
    offer: { need: 'required', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration/job-offer.html', fetched: D,
      quote: 'Before you apply for permanent residence through this pilot, you need a job offer.' },
    statusInCanada: { need: 'notRequired', basis: 'absent', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration/job-offer.html', fetched: D },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/rural-franco-pilots/rural-immigration/job-offer.html', fetched: D },
  },

  // ON Workforce Priority:offer 是硬闸(自雇医生例外,见 note)。境内**不是**闸——
  // 官方那句管的是「已经在境内的人得有合法身份」,不是「必须在境内」,别读反。
  'ON-workforce': {
    offer: { need: 'required', url: 'https://www.ontario.ca/page/ontario-workforce-priority-stream', fetched: D,
      quote: 'The Ontario Workforce Priority stream offers eligible skilled foreign workers with a qualifying job offer and work experience in any National Occupational Classification ( NOC ) occupation',
      note: '例外:自雇医生无需 offer(官方同页原句「The stream is also available to eligible self-employed physicians who do not have a job offer.」)' },
    statusInCanada: { need: 'notRequired', url: 'https://www.ontario.ca/page/ontario-workforce-priority-stream', fetched: D,
      quote: 'Applicants may not qualify for nomination if they are residing in Canada without valid legal status at the time of nomination.',
      note: '条件句:管的是「若已在境内则须有合法身份」,不构成「必须在境内」' },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: 'https://www.ontario.ca/page/ontario-workforce-priority-stream', fetched: D },
  },

  // NB:原先三类闸全 unknown —— crawl 的 nb-imm 只有 1 页门户。**根因是官网换版**:
  // 老地址 www2.gnb.ca/.../nb-skilled-worker-stream.html 现在 302 到 www.gnb.ca 的新站,
  // 资格条文搬到了下面这一页(链接从重定向后的 PNP 总览页上现取,不是猜的)。
  // 🔴 同一处换版还坐实了另一件事:`etl/pnp/build_nb_req.py` 的 guide_urls() 现在返回空 —— 它照老地址
  //    去找三份指南 PDF,而重定向落在总览页上、那页没有指南链接 → **NB 的门槛行已经在冻结状态**(另账)。
  // 本站 NB-sw 对应的是 **New Brunswick Experience** 那条 pathway(注册表 drawStream 就是它)。
  'NB-sw': {
    offer: { need: 'required', url: NB_SW, fetched: D,
      quote: 'have the support of an eligible employer who has been actively operating in New Brunswick for the past 24 months, providing goods or services',
      note: 'Experience pathway 另写「be working full time in a non-seasonal position for the employer who is supporting your application」—— 雇主支持是硬闸' },
    statusInCanada: { need: 'required', url: NB_SW, fetched: D,
      quote: 'have lived in New Brunswick for the past six months',
      note: 'Experience pathway 专条;另两条 pathway(Graduates / Priority Occupations)不是本站 NB-sw 判的那条' },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: NB_SW, fetched: D,
      note: '资格清单只写「have at least a high school diploma」,**没写必须是加拿大学历**;要加拿大学历的是 Graduates 那条 pathway' },
  },

  'NS-sw': {
    offer: { need: 'required', url: 'https://liveinnovascotia.com/skilled-worker', fetched: D,
      quote: 'To submit an expression of interest (EOI) you must: have a full-time permanent job offer from a Nova Scotia employer' },
    statusInCanada: { need: 'notRequired', basis: 'absent', url: 'https://liveinnovascotia.com/skilled-worker', fetched: D },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: 'https://liveinnovascotia.com/skilled-worker', fetched: D },
  },

  // SK 国际技术工人 **Employment Offer** 子通道:offer 就是它的定义(同组还有 OID 子通道是「没有 offer」那条)。
  'SK-offer': {
    offer: { need: 'required', url: 'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers', fetched: D,
      quote: 'Employment Offer Learn what you need to apply to the SINP as an international skilled worker with an employment offer from Saskatchewan.',
      note: '同页另一条 OID 子通道明写「Don’t have a job offer in Saskatchewan but are highly skilled in an in-demand occupation.」—— 两条是并列关系,别混判' },
    statusInCanada: { need: 'notRequired', basis: 'absent', url: 'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers', fetched: D },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: 'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/live-in-saskatchewan/by-immigrating/saskatchewan-immigrant-nominee-program/browse-sinp-programs/applicants-international-skilled-workers', fetched: D },
  },

  // MB SWM:「在曼省持续在职」就是它的定义性条件 —— 境内在职 + 雇主长期全职岗两个闸都在。
  'MB-swm': {
    offer: { need: 'required', url: 'https://immigratemanitoba.com/mpnp/skilled-worker/swm/eligibility', fetched: '2026-08-03',
      quote: 'Your employer must demonstrate to the satisfaction of the MPNP that they are an established business with an ability to offer you full-time and long-term employment in Manitoba.' },
    statusInCanada: { need: 'required', url: 'https://immigratemanitoba.com/mpnp/skilled-worker/swm/eligibility', fetched: '2026-08-03',
      quote: 'To apply to the Skilled Worker in Manitoba (SWM) Pathway, you must demonstrate ongoing Manitoba employment as your established connection to Manitoba.' },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: 'https://immigratemanitoba.com/mpnp/skilled-worker/swm/eligibility', fetched: '2026-08-03' },
  },

  // AB Opportunity:官方开篇就写明「已经在阿省全职在职的临时外劳」+ 有效工签,两个闸都是硬的。
  'AB-opportunity': {
    offer: { need: 'required', url: 'https://www.alberta.ca/aaip-alberta-opportunity-stream', fetched: D,
      quote: 'The Alberta Opportunity Stream is for temporary foreign workers who are already working full-time in Alberta and have a full-time job offer from an Alberta employer in an eligible occupation.' },
    statusInCanada: { need: 'required', url: 'https://www.alberta.ca/aaip-alberta-opportunity-stream-eligibility', fetched: D,
      quote: 'At the time your application is submitted, and at the time AAIP assesses your application, you must have a valid work permit' },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: 'https://www.alberta.ca/aaip-alberta-opportunity-stream-eligibility', fetched: D },
  },

  // BC:offer 是闸(资格按 job offer 定);但该页自己写明**完整条件在 Program Guide**,而指南没抓到 →
  // 其余两类一律 unknown,不拿「页上没写」当「官方不要求」。
  // BC:原先 status/credential 标 unknown('criteria-elsewhere')—— welcomebc 那页自己把完整条件推给了
  // Skills Immigration Program Guide,而那份指南 crawl 里没有。2026-08-12 直提 PDF(63 页)逐节读出来:
  // §3.1–3.13 通用要求 + §4.1(a)-(e) 技术工人专条，两处都没有学历闸。
  'BC-sw': {
    offer: { need: 'required', url: BC_GUIDE, fetched: D,
      quote: 'You must have a valid job offer in an eligible occupation.',
      note: '§4.1 (b);§3.5 另写明要全职且原则上不定期' },
    statusInCanada: { need: 'notRequired', url: BC_GUIDE, fetched: D,
      quote: 'The BC PNP will not nominate you if you: Are in Canada and are out of status',
      note: '§3.3 是条件句:管的是「若已在境内则须有合法身份」，不构成「必须在境内」—— 同 ON-workforce 那条，别读反' },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: BC_GUIDE, fetched: D,
      note: '通用要求 §3.1–3.13 与技术工人 §4.1(a)-(e) 逐条读完，没有任何学历门槛(学历只在注册打分表里算分，不是资格门槛)' },
  },

  // BC Build 是 Skills Immigration 池里的定向抽选,资格门槛与 Skilled Worker 同一套(pathVerdict 注册表已注明)。
  'BC-build': {
    offer: { need: 'required', url: BC_GUIDE, fetched: D,
      quote: 'You must have a valid job offer in an eligible occupation.' },
    statusInCanada: { need: 'notRequired', url: BC_GUIDE, fetched: D,
      quote: 'The BC PNP will not nominate you if you: Are in Canada and are out of status',
      note: '同 BC-sw:§3.3 是条件句，不是「必须在境内」' },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: BC_GUIDE, fetched: D,
      note: '同 BC-sw:通用要求与本通道专条里都没有学历门槛' },
  },

  // NL 国际毕业生:三类闸全是硬的 —— PGWP 同时锁死「加拿大学历」与「人在境内」。
  // 这正是现网把「从没来过加拿大的海外护士」排进前三的那一条。
  'NL-intl-grad': {
    offer: { need: 'required', url: 'https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/applicants/international-graduate', fetched: D,
      quote: 'Full-time job or job offer from an eligible Newfoundland and Labrador employer , guarantee a minimum of 30 hours per week, and be at least one year in duration with a reasonable expectation of extension.' },
    statusInCanada: { need: 'required', url: 'https://www.gov.nl.ca/immigration/immigrating-to-newfoundland-and-labrador/provincial-nominee-program/applicants/international-graduate', fetched: D,
      quote: 'Must hold a valid post-graduation work permit (PGWP).' },
    credentialCanada: { need: 'required', url: 'https://www.gov.nl.ca/immigration/international-graduate-category', fetched: D,
      quote: 'Applicant’s to this category must hold a valid post-graduation work permit (PGWP) and have a job offer with a Newfoundland and Labrador employer, meeting the employer criteria.',
      note: 'PGWP 的前提就是加拿大院校毕业 —— 学历闸由 PGWP 反推,不是我们自己加的' },
  },

  // PE:crawl 只抓到办公室门户页,没有分通道资格页 → 三类闸全部本站未收录。
  // PE:三类闸原先全标 unknown —— **不是官方没写,是我们没扫到**。crawl 的 pe-imm 只有 7 页
  // (门户 + 4 条新闻 + 1 个 stream 页,HTML 页挡在 Radware 后面),而资格条文一直在这份指南 PDF 里,
  // 我们自己的 build_pe_req.py 早就在读它。2026-08-12 取证器加了 PDF 源后逐条读出来的。
  'PE-sw': {
    offer: { need: 'required', url: PE_GUIDE, fetched: D,
      quote: 'have a full-time, non-seasonal (permanent or minimum of two years) job offer from a PEI employer in a high skilled occupation defined by the Training, Education, Experience, and Responsibility classification system as TEER category 0, 1, 2, or 3' },
    statusInCanada: { need: 'required', url: PE_GUIDE, fetched: D,
      quote: 'have a valid work permit to be working in Canada',
      note: '同页 Note 留了境外招募的口子:「The Skilled Worker Stream may be utilized for talent recruitment outside of Canada, if the Prince Edward Island Employer has received authorization from the Office of Immigration prior to issuing a job offer.」—— 但那道口子要**雇主事先获授权**,不是申请人自己能满足的条件,故资格闸按 bullet 记' },
    credentialCanada: { need: 'notRequired', basis: 'absent', url: PE_GUIDE, fetched: D,
      note: '资格清单里确有学历要求(「have successfully completed a post-secondary degree or diploma (minimum two-year program)」),但**没写必须是加拿大学历** —— 学历闸有、加拿大学历闸无' },
  },
}

/** 某条通道的某一类闸(没登记 = 本站未收录,与「官方不要求」不同) */
export const gateOf = (key: string, gate: GateKey): GateRule =>
  GATE_MANIFEST[key]?.[gate] ?? { need: 'unknown', why: 'no-source' }
