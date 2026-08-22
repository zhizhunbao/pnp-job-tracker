/**
 * 身份+三语一体的块与显示函数 —— 不适合按语言拆的那部分文案机器:
 * · 身份(URL/官方名/页名/键)与三语住一起的表:RES / legalDocs / officialLabels /
 *   gateLabels / askLabels / pathwayNames / nocLabels(⚠️ 各语言键数故意不对齐:en 是官方名全量);
 * · 数据层值 → 界面词的映射与显示函数(streamDisplay 一族 / dropProvPrefix)。
 * 纯语言内容在 zh.ts / en.ts / ko.ts;语言机器与装配在 index.ts。
 *
 * @author Frank
 * @time 2026-08-22 20:00:00
 */

import type { GateKey, PathwayKey, StatusAsk } from '@/lib/pathways'
import type { Dict, Lang, TFn } from './index'
// =========================================================================
// 判定与报告侧(原 report.ts 尾部)
// =========================================================================

// ── 通道名 ────────────────────────────────────────────────────────────────
// 2026-08-17 从 lib/pathways/<通道>.ts 搬来(Frank 拍板:文案只有一个家)。
// 护栏:键型是 `jpw.p.${PathwayKey}` —— 加一条通道、在 types.ts 登记完 key,
// 这里就会报缺,写完三语名才编得过。裸键 `jpw.p.XX` 不可能再上线。
type PathwayNames = Record<`jpw.p.${PathwayKey}`, string>
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
export const pathwayNames: Record<Lang, PathwayNames> = { zh: pwZh, en: pwEn, ko: pwKo }

// ── 官方分值表原文的译名 ────────────────────────────────────────────────────
// 官方表的行文是**英文原文**,中/韩界面按这张表出人话(**只译不改口径**,分值仍来自官方表)。
//
// 🔴 `OFFICIAL_EN` 不是「忘了翻」,是**显式声明「这一条用官方英文原文」** ——
//    2026-08-17 Frank 拍板:官方分值表的句子译错一个词就是改了口径,宁可显英文
//    (同 streamDisplay 的老规矩:表里没有的原样只显英文,不让模型现编译名)。
//    类型是必填的 `Record<Lang, string>`,所以「没决定」这个状态不存在了 ——
//    先前 `{ zh?; ko? }` 两个都可选,75 条里 54 条静默缺 ko,三个月没人看见。
//
// 终局不在代码里:这是**移民事实**,该走 data/ → mart → DB(CLAUDE.md 铁律),
// 先例是 noc_categories 的 mid_en/mid_ko。搬进 i18n 是过渡形态。
const OFFICIAL_EN = ''
export const officialLabels: Record<string, Record<Lang, string>> = {
  // BC
  'At least 1 year of directly related experience in Canada': { zh: '在加拿大有 1 年以上同职业经验', en: OFFICIAL_EN, ko: '캐나다 내 동일 직종 1년 이상' },
  'Currently working full-time in B.C. for the employer in the occupation identified in the BC PNP registration': { zh: '目前在本省为该雇主全职做同一职业', en: OFFICIAL_EN, ko: '현재 해당 주에서 같은 고용주와 동일 직종 풀타임' },
  'Post-secondary education completed in B.C., or': { zh: '学历在本省读的', en: OFFICIAL_EN, ko: '해당 주에서 취득한 학력' },
  'Post-secondary education completed in Canada (outside of B.C.)': { zh: '学历在加拿大其它省读的', en: OFFICIAL_EN, ko: '캐나다 타 주에서 취득' },
  'Eligible professional designation in B.C.': { zh: '持本省认可的执业资格', en: OFFICIAL_EN, ko: '해당 주 인정 전문 자격 보유' },
  'Language proficiency in both English and French': { zh: '英法双语都达标', en: OFFICIAL_EN, ko: '영어·프랑스어 모두 충족' },
  'Area 1: Metro Vancouver Regional District': { zh: '大温地区', en: OFFICIAL_EN, ko: '메트로 밴쿠버' },
  'Area 2: Squamish, Abbotsford, Agassiz, Mission, and Chilliwack': { zh: 'Squamish、Abbotsford、Agassiz、Mission、Chilliwack', en: OFFICIAL_EN, ko: 'Squamish, Abbotsford, Agassiz, Mission, Chilliwack' },
  'Area 3: Areas of B.C. not included in Area 1 or 2': { zh: '不列颠哥伦比亚省其余地区', en: OFFICIAL_EN, ko: '브리티시컬럼비아주 기타 지역' },
  'Regional Experience, or': { zh: '有地区工作经验或地区院校毕业', en: OFFICIAL_EN, ko: '지역 근무 경력 또는 지역 졸업' },
  // MB(MPNP EOI 加分/扣分项 —— Risk Assessment 两条是负分,符号由 Tick 按分值出)
  'Work experience in another province': { zh: '有外省工作经历', en: OFFICIAL_EN, ko: '타 주 근무 경력' },
  'Fully recognized by provincial licensing body': { zh: '职业资格获省监管机构完全认证', en: OFFICIAL_EN, ko: '주 면허기관 완전 인정 자격' },
  'Second Official Language — CLB 5 or higher (overall)': { zh: '第二官方语言 CLB 5 以上', en: OFFICIAL_EN, ko: '제2공용어 CLB 5 이상' },
  'Studies in another province': { zh: '有外省就读经历', en: OFFICIAL_EN, ko: '타 주 학업 경력' },
  'Close relative in Manitoba': { zh: '在本省有近亲', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Close friend or distant relative in Manitoba': { zh: '在本省有远亲或密友', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Previous authorized work experience in Manitoba (six months or more)': { zh: '曾在本省合法工作至少 6 个月', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Completed post-secondary program in Manitoba (two years or more)': { zh: '在本省完成至少 2 年的高等教育项目', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Completed post-secondary program in Manitoba (one year)': { zh: '在本省完成 1 年高等教育项目', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Ongoing employment in Manitoba for six months or more with long-term job offer from the same employer': { zh: '已为同一本省雇主工作至少 6 个月并获长期 offer', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Invitation to Apply under a Strategic Initiative': { zh: '获本省战略项目邀请', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Immigration destination in Manitoba outside of Winnipeg': { zh: '计划定居温尼伯以外地区', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Close relative in another province and no close relative in Manitoba': { zh: '外省有近亲、本省无近亲', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Previous immigration application to another province': { zh: '曾向其他省申请移民', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  // ON Workforce Priority
  'Over 24 months working in job offer position': { zh: '已在 offer 对应岗位工作超过 24 个月', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  '13 to 24 months working in job offer position': { zh: '已在 offer 对应岗位工作 13-24 个月', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  '6 to 12 months working in job offer position': { zh: '已在 offer 对应岗位工作 6-12 个月', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Less than 6 months working in job offer position or not currently working in position': { zh: '不足 6 个月或目前未在该岗位工作', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  '$70k or more earnings in a year': { zh: '加拿大年报税收入 7 万加元以上', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  '$50k to $69,999': { zh: '加拿大年报税收入 5万-69,999 加元', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  '$30k to $49,999': { zh: '加拿大年报税收入 3万-49,999 加元', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Under $30k earnings in a year': { zh: '加拿大年报税收入不足 3 万加元', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'With valid work permit': { zh: '持有效工签', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'With valid study permit': { zh: '持有效学签', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Without valid work or study permit': { zh: '没有有效工签或学签', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'More than one Canadian credential': { zh: '有多个加拿大学历', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'One Canadian credential': { zh: '有一个加拿大学历', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'No Canadian credential': { zh: '没有加拿大学历', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Northern Ontario': { zh: '安省北部', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Eastern Ontario': { zh: '安省东部', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Central Ontario outside GTA': { zh: '安省中部（GTA 以外）', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Southwestern Ontario': { zh: '安省西南部', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Inside GTA (except Toronto)': { zh: 'GTA 内（多伦多除外）', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Toronto': { zh: '多伦多', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  '$40 per hour or higher': { zh: '时薪 40 加元以上', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  '$35 to $39.99 per hour': { zh: '时薪 35-39.99 加元', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  '$30 to $34.99 per hour': { zh: '时薪 30-34.99 加元', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  '$25 to $29.99 per hour': { zh: '时薪 25-29.99 加元', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  '$20 to $24.99 per hour': { zh: '时薪 20-24.99 加元', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Less than $20 per hour': { zh: '时薪不足 20 加元', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  // SK
  'High skilled employment offer from a Saskatchewan employer': { zh: '有本省雇主的高技能岗 offer', en: OFFICIAL_EN, ko: '해당 주 고용주의 고숙련 오퍼 보유' },
  'Close family relative in Saskatchewan': { zh: '在本省有近亲(公民或永居)', en: OFFICIAL_EN, ko: '해당 주에 가까운 친척 거주' },
  'Past work experience in Saskatchewan': { zh: '在本省工作过(近 5 年满 12 个月)', en: OFFICIAL_EN, ko: '해당 주 근무 경력(최근 5년 12개월)' },
  'Past student experience in Saskatchewan': { zh: '在本省读过书(满一学年)', en: OFFICIAL_EN, ko: '해당 주 유학 경험(1학년도 이상)' },
  // AB(AAIP Worker EOI 分值表;2026-08-14 接入时漏配整省 → 中文界面英文原句裸奔,当天补齐)
  'Job offer in a regulated occupation in Alberta and holds certification or licensing demonstrating meets regulatory requirements to practice the occupation in Alberta': { zh: '受监管职业 offer 且已持本省执业资格', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Family member (parent, child, or sibling) living in Alberta who is a Canadian Citizen or permanent resident over 18 years of age': { zh: '本省有父母/子女/兄弟姐妹(成年公民或永居)', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Bilingual language proficiency: CLB or NCLC score of 4 or higher in both English and French': { zh: '英法双语 CLB/NCLC 均 4 以上', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Job offer for permanent full-time employment in Alberta': { zh: '有本省长期全职 offer', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Endorsement letter from a designated community in the Rural Renewal Stream': { zh: '持乡村振兴通道定向社区背书信', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Job offer for the tourism and hospitality sector from an employer who is a member of a required sector association under the Tourism and Hospitality Stream': { zh: '旅游酒店通道行业协会成员雇主的 offer', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Job offer in a law enforcement occupation from an employer who is a member of the Alberta Association of Chiefs of Police (AACP)': { zh: '执法职业 offer(雇主为 AACP 成员)', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Alberta job offer location: Rural Renewal Stream designated community': { zh: 'offer 在乡村振兴定向社区', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Alberta job offer location: Other Alberta community (outside the Edmonton and Calgary Census Metropolitan Areas and Rural Renewal Stream designated communities)': { zh: 'offer 在埃德蒙顿/卡尔加里都会区外的其他社区', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Location of Highest Level of Education Completed in Canada: Completed in Alberta': { zh: '最高学历在本省完成', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Location of Highest Level of Education Completed in Canada: Completed in another province or territory (not Alberta)': { zh: '最高学历在加拿大其它省完成', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'English CLB 6 or higher': { zh: '英语 CLB 6 以上', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'English CLB 3 or lower': { zh: '英语 CLB 3 或以下', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Total Work Experience: 12 or more months': { zh: '总工作经验 12 个月以上', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Total Work Experience: 6-11 months': { zh: '总工作经验 6-11 个月', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Total Work Experience: Less than 6 months': { zh: '总工作经验不足 6 个月', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Trades Certificate/Diploma': { zh: 'Trades 技工证书', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  'Secondary School and lower': { zh: '高中及以下', en: OFFICIAL_EN, ko: OFFICIAL_EN },
  // NL Express Entry Skilled Worker - Annex A adaptability
  'Close relative in Newfoundland and Labrador': { zh: '本人或配偶在本省有符合范围的近亲', en: OFFICIAL_EN, ko: '본인 또는 배우자의 해당 주 가까운 친척' },
  'Previous work experience in Newfoundland and Labrador': { zh: '近 5 年曾在本省持有效工签工作至少 12 个月', en: OFFICIAL_EN, ko: '최근 5년 내 해당 주에서 유효한 취업허가로 12개월 이상 근무' },
  'Previous student experience in Newfoundland and Labrador': { zh: '曾在本省认可院校持学签全日制就读至少 1 学年', en: OFFICIAL_EN, ko: '해당 주 인정 교육기관에서 유효한 유학허가로 1학년도 이상 수학' },
}
// 官方原文里「…, or」的那个 or 是**表格排版**留下的(下一行接着念),单拎出来放进选项就是个悬空的 or
// (英文界面实拍:「Post-secondary education completed in B.C., or」)。二选一改由 UI 表达,尾巴去掉。
export const officialLabel = (raw: string, lang: string): string =>
  ((officialLabels[raw]?.[lang as Lang] || '') || raw).replace(/[,，]?\s*or\s*$/i, '')

// ── 门槛闸的人话名 ──────────────────────────────────────────────────────────
// 2026-08-17 从 lib/gateManifest.ts 搬来(Frank:文案只有一个家)。
// 分界:闸**有哪几类、每类怎么记**仍在 gateManifest(那是词汇表与举证规则),
// 这里只是它们在界面上的**说法**。GateKey / StatusAsk 两个键型仍从那边取。
/** 三类闸的人话名(题面与结论共用一份,前端不另写) */
export const gateLabels: Record<GateKey, Record<Lang, string>> = {
  offer: { zh: 'job offer', en: 'job offer', ko: '잡 오퍼' },
  statusInCanada: { zh: '境内身份', en: 'status in Canada', ko: '캐나다 체류 신분' },
  credentialCanada: { zh: '加拿大学历', en: 'Canadian credential', ko: '캐나다 학력' },
  // 2026-08-15 第四类闸(Frank「毕业生干厨师靠谱吗?跨专业了怎么弄」):NL 国际毕业生官方要求
  // 岗位与所学专业相关。先前只是一枚灰提醒胶囊,答不上就当没有障碍 —— 与工签闸同一种病,收成真闸。
  fieldMatch: { zh: '专业对口', en: 'field of study match', ko: '전공 일치' },
  // 2026-08-15 第五类闸:FCIP 要 NCLC 5 **法语**四项。站里那道语言题问的是 CLB(英语的尺子),
  // 拿它当 NCLC 用 = 把不会法语的人判成达标再推去法语社区,故单开一闸、单问一题。
  french: { zh: '法语(NCLC 5)', en: 'French NCLC 5', ko: '프랑스어 NCLC 5' },
}

/** statusInCanada 按 asks 拆开后的人话名(结论文案用它,不再统称「境内身份」) */
export const askLabels: Record<StatusAsk, Record<Lang, string>> = {
  workPermit: { zh: '有效工签', en: 'work permit', ko: '유효한 취업 허가' },
  // 拉丁缩写**括起来**(同 french 的「法语(NCLC 5)」):闸名会与「判不了」直接连写,
  // 裸的 `毕业工签 PGWP` 拼出来是「毕业工签 PGWP判不了」,措辞层那份带空格,两边逐字对不上
  // ——2026-08-15 夜判定矩阵测试实撞,与「NCLC 5判不了」同一个病
  pgwp: { zh: '毕业工签(PGWP)', en: 'PGWP', ko: 'PGWP' },
  provResidence: { zh: '在该省居住', en: 'residence in the province', ko: '해당 주 거주' },
  provEmployment: { zh: '在该省在职', en: 'employment in the province', ko: '해당 주 재직' },
}
// =========================================================================
// 职位板侧(原 jobs.ts 尾部)
// =========================================================================
// 省抽选的**官方通道名**译名(2026-08-01 Frank 队列⑤:「中文界面官方英文名 + 中文译名,英文界面只显英文」)。
// 有限集人工定表(现 17 条,取自 pnp_draws 实际出现过的通道名),照「宁可留空也不瞎猜」——
// 表里没有的原样只显英文,不让模型现编译名。官方英文名永远是主文案,译名只是灰字小注。
const DRAW_STREAM_L10N: Record<string, { zh: string; ko: string }> = {
  // AB(AAIP)
  'Rural Renewal Stream': { zh: '乡镇振兴通道', ko: '농촌 재생 스트림' },
  'Alberta Opportunity Stream': { zh: '阿尔伯塔机会通道', ko: '앨버타 기회 스트림' },
  'Dedicated Health Care Pathway – Express Entry': { zh: '医护专项(EE 通道)', ko: '의료 전용 경로(EE)' },
  'Dedicated Health Care Pathway – non-Express Entry': { zh: '医护专项(非 EE)', ko: '의료 전용 경로(비 EE)' },
  'Alberta Express Entry Stream – Law Enforcement Pathway': { zh: 'EE 定向:执法', ko: 'EE 지정: 법 집행' },
  'Alberta Express Entry Stream – Accelerated Tech Pathway': { zh: 'EE 定向:科技加速', ko: 'EE 지정: 기술 가속' },
  'Alberta Express Entry Stream – Priority Sectors (Agriculture)': { zh: 'EE 定向:农业', ko: 'EE 지정: 농업' },
  'Alberta Express Entry Stream – Priority Sectors (Construction)': { zh: 'EE 定向:建筑', ko: 'EE 지정: 건설' },
  // BC(2026 新政三大类)
  'Innovate: High Economic Impact': { zh: 'Innovate:高经济贡献', ko: 'Innovate: 높은 경제 기여' },
  'Care: Health': { zh: 'Care:医疗', ko: 'Care: 의료' },
  'Care: Childcare': { zh: 'Care:幼教', ko: 'Care: 보육' },
  'Care: Veterinary Care': { zh: 'Care:兽医', ko: 'Care: 수의' },
  'Build: Construction Trades': { zh: 'Build:建筑技工', ko: 'Build: 건설 기능직' },
  'Temporary Rural/Remote Health Support Initiative': { zh: '乡镇偏远医疗支援(临时)', ko: '농촌·오지 의료 지원(임시)' },
  // MB / ON
  'Skilled Worker Stream': { zh: '技术工人通道', ko: '숙련 인력 스트림' },
  'Employer Job Offer: Foreign Worker stream': { zh: '雇主 offer:海外工人(已关停)', ko: '고용주 오퍼: 해외 근로자(폐지)' },
  'Employer Job Offer: International Student stream': { zh: '雇主 offer:国际学生(已关停)', ko: '고용주 오퍼: 유학생(폐지)' },
}
/** 官方通道名 → 界面语言的译名;英文界面与表里没有的一律返回空(只显官方英文名) */
export const drawStreamNote = (stream: string, lang: Lang): string => {
  if (lang === 'en') return ''
  const hit = DRAW_STREAM_L10N[(stream || '').trim()]
  return hit ? (lang === 'ko' ? hit.ko : hit.zh) : ''
}

// 具名通道 chip 的 label 存在数据层且是中文(有限小集合)——显示层三语映射,未知值原样回退
// (第 9 轮 #24,照大类 cat.* 先例;数据层不动,ETL 新增 label 时这里补一行即可)
const STREAM_L10N: Record<string, string> = {
  'AB 科技': 'stream.abTech', 'SK 医疗': 'stream.skHealth', 'SK 科技': 'stream.skTech',
  'SK 农业': 'stream.skAgri', 'NS 紧缺空缺': 'stream.nsCritical', 'NS 毕业生': 'stream.nsGrad',
  'AAIP 不符合清单': 'stream.aaipExcl',
  'BC 医疗': 'stream.bcHealth', 'BC 幼教': 'stream.bcChildcare', 'BC 法语教师': 'stream.bcEdu',
  'BC 兽医': 'stream.bcVet', 'BC 建筑技工': 'stream.bcConstr',
  'MB 在需职业': 'stream.mbIndemand', 'MB 乡镇在需': 'stream.mbRural', 'PE 在需职业': 'stream.peIndemand',
  'NB 不符合清单': 'stream.nbExcl', 'NB 餐饮住宿不符合': 'stream.nbExclFood',
  'NB AIP 不受理': 'stream.nbAipExcl', 'NB AIP 餐饮住宿不受理': 'stream.nbAipExclFood',
}
export const streamDisplay = (t: TFn, label: string): string => (STREAM_L10N[label] ? t(STREAM_L10N[label]) : label)

// pnp_requirements.stream(官方通道名,含 em dash)→ 显示短名。
// 表里没有的**原样返回官方英文名**(照 DRAW_STREAM_L10N 的老规矩:宁可显英文,不让模型现编译名)。
// 英文短名只做前缀缩写(NSNP / PEI …),不改通道本名 —— 判定卡那行灰字要在 375 一行放得下。
// 键按 normReqStream 归一后比:mart 里的破折号是 em dash,写死全串等于把编码问题埋进代码(pathVerdict 同款告诫)。
const normReqStream = (s: string): string => (s || '').toLowerCase().replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim()
const REQ_STREAM_L10N: Record<string, { zh: string; ko: string; en: string }> = {
  'bc pnp skills immigration (all streams)': { zh: 'BC 技术移民全通道', ko: 'BC 기술이민 전 통로', en: 'BC Skills Immigration' },
  'aaip alberta opportunity stream': { zh: '阿尔伯塔机会通道', ko: '앨버타 기회 스트림', en: 'Alberta Opportunity Stream' },
  'mpnp in-demand occupations list': { zh: 'MB 在需职业清单', ko: 'MB 수요 직업 목록', en: 'MPNP In-Demand list' },
  'mpnp skilled worker overseas': { zh: 'MB 海外技术工人通道', ko: 'MB 해외 기술인력 통로', en: 'MPNP Overseas' },
  'nlpnp skilled worker category': { zh: 'NL 技术工人类别', ko: 'NL 기술인력 부문', en: 'NLPNP Skilled Worker' },
  'nlpnp international graduate category': { zh: 'NL 国际毕业生类别', ko: 'NL 국제 졸업생 부문', en: 'NLPNP International Graduate' },
  'nova scotia nominee program - skilled worker stream': { zh: 'NS 技术工人通道', ko: 'NS 기술인력 통로', en: 'NSNP Skilled Worker' },
  'ontario workforce priority stream': { zh: 'ON 劳动力优先通道', ko: 'ON 우선 직군 통로', en: 'Ontario Workforce Priority' },
  'pei pnp workforce - skilled worker stream': { zh: 'PEI 技术工人通道', ko: 'PEI 기술인력 통로', en: 'PEI Skilled Worker' },
}
export const reqStreamDisplay = (stream: string, lang?: Lang): string => {
  const hit = REQ_STREAM_L10N[normReqStream(stream)]
  if (!hit) return stream
  return lang === 'en' ? hit.en : lang === 'ko' ? hit.ko : hit.zh   // 语言缺省回落 zh,与 makeT 同
}

// EE 类别 label 三语映射(第 11 轮 #28,同 #24 性质;数据层 label 是有限集,federal-categories.json 9 类)。
// 职位可命中多类别,数据层用「/」拼接(如「医疗社服/医生」)——逐段映射再拼回。
const EE_L10N: Record<string, string> = {
  '医疗社服': 'ee.healthcare', 'STEM': 'ee.stem', '技工': 'ee.trade', '教育': 'ee.education',
  '运输': 'ee.transport', '医生': 'ee.physicians', '高管': 'ee.seniorMgr', '研究': 'ee.researchers', '军职': 'ee.military',
}
// #209(第 26 轮体检):数据层用「/」拼接,显示层改顿号枚举(no-dot-separator 硬规矩:禁「·」「/」杂糅多信息)
export const eeDisplay = (t: TFn, label: string): string =>
  label.split('/').map((s) => (EE_L10N[s.trim()] ? t(EE_L10N[s.trim()]) : s.trim())).join(t('sep'))

// E6-10:联邦轮次(pnp_draws 的 province=FED 行)的 label 是数据层 **英文 cat_key**(build_ee_draws.CAT_MAP),
// 与上面 ee_categories 的中文 label 不同源 —— 两张表各管一头,别合并。
const EE_KEY_L10N: Record<string, string> = {
  healthcare: 'ee.healthcare', stem: 'ee.stem', trade: 'ee.trade', education: 'ee.education', transport: 'ee.transport',
  physicians: 'ee.physicians', 'senior-managers': 'ee.seniorMgr', researchers: 'ee.researchers', military: 'ee.military',
  agriculture: 'ee.agriculture', cec: 'ee.cec', french: 'ee.french', pnp: 'ee.pnpLinked', general: 'ee.general',
  fsw: 'ee.fsw', fst: 'ee.fst',
}
export const eeKeyDisplay = (t: TFn, key: string): string => (EE_KEY_L10N[key] ? t(EE_KEY_L10N[key]) : key)

// NOC 中/小分类名**不是 UI 文案,是数据值的译名** —— 值本身是 etl/noc.py 产的中文,
// 所以 zh 天然没有条目(catName 查不到就回退原值,见 lib/noc)。三语键集本来就不该相同,
// 塞进上面受键强制的域字典只会逼出一堆假的 zh 条目。
// 终局不在代码里:noc_categories 维度表已带 mid_en/mid_ko,registerCatLabels 登记后优先于这张表;
// 这里是维度表查不到时的回退路径(CLAUDE.md:移民事实的去处是 data/ → mart → DB)。
export const nocLabels: Record<Lang, Dict> = {
  zh: {},
  en: {
    'cat.IT': 'IT',
  'cat.科技管理': 'Science & tech management', 'cat.自然科学': 'Natural sciences', 'cat.建筑与规划': 'Architecture & planning',
  'cat.数据与统计': 'Data & statistics', 'cat.科学技术员': 'Science technologists', 'cat.设计与制图': 'Design & drafting',
  'cat.IT 支持': 'IT support', 'cat.检验与安全': 'Inspection & safety', 'cat.工程技术员': 'Engineering technologists',
  'cat.自然与应用科学': 'Natural and applied sciences', 'cat.工程管理': 'Engineering management', 'cat.建筑与科学管理': 'Architecture & science management',
  'cat.IT 管理': 'IT management', 'cat.物理与天文': 'Physics & astronomy', 'cat.化学': 'Chemistry',
  'cat.地球与海洋': 'Earth & ocean sciences', 'cat.生物': 'Biology', 'cat.林业': 'Forestry',
  'cat.景观设计': 'Landscape architecture', 'cat.城市规划': 'Urban planning', 'cat.测绘': 'Land surveying',
  'cat.统计与精算': 'Statistics & actuarial', 'cat.数据科学': 'Data science',
  'cat.电气与电子工程': 'Electrical & electronics engineering', 'cat.计算机与硬件工程': 'Computer & hardware engineering', 'cat.化学工程': 'Chemical engineering',
  'cat.工业与制造工程': 'Industrial & manufacturing engineering', 'cat.冶金与材料工程': 'Metallurgical & materials engineering', 'cat.采矿工程': 'Mining engineering',
  'cat.地质工程': 'Geological engineering', 'cat.石油工程': 'Petroleum engineering', 'cat.航空航天工程': 'Aerospace engineering',
  'cat.其他工程': 'Other engineering', 'cat.农渔产品检验': 'Agricultural & fish product inspection', 'cat.保育与渔业': 'Conservation & fishery',
  'cat.园艺与景观': 'Horticulture & landscaping', 'cat.建筑技术': 'Architectural technology', 'cat.工业设计': 'Industrial design',
  'cat.制图': 'Drafting', 'cat.测绘技术': 'Survey technology', 'cat.地理信息与气象': 'Geomatics & meteorology',
  'cat.网络与网站': 'Network & web technicians', 'cat.用户支持': 'User support', 'cat.无损检测': 'Non-destructive testing',
  'cat.工程检查': 'Engineering inspection', 'cat.职业健康与安全': 'Occupational health & safety', 'cat.建筑检查': 'Construction inspection',
  'cat.土木': 'Civil', 'cat.机械': 'Mechanical', 'cat.工业与制造': 'Industrial & manufacturing',
  'cat.建筑估价': 'Construction estimating', 'cat.电气与电子': 'Electrical & electronics', 'cat.电子设备维修': 'Electronic equipment repair',
  'cat.工业仪表': 'Industrial instrumentation', 'cat.航空电子': 'Avionics',
  'cat.高级管理': 'Senior management', 'cat.金融': 'Finance', 'cat.人力资源': 'Human resources',
  'cat.市场营销': 'Marketing', 'cat.客户成功': 'Customer success', 'cat.财务支持': 'Finance support', 'cat.行政': 'Administration',
  'cat.办公支持': 'Office support', 'cat.工程': 'Engineering', 'cat.医疗专业': 'Health professionals', 'cat.护理': 'Nursing',
  'cat.医疗技术': 'Medical technology', 'cat.社会服务': 'Social services', 'cat.教育辅助': 'Education support', 'cat.照护': 'Care work',
  'cat.设计': 'Design', 'cat.销售管理': 'Sales management', 'cat.餐饮': 'Food service', 'cat.服务主管': 'Service supervisors',
  'cat.零售': 'Retail', 'cat.客服': 'Customer service', 'cat.服务支持': 'Service support', 'cat.清洁': 'Cleaning',
  'cat.运输': 'Transportation', 'cat.物流': 'Logistics', 'cat.建筑': 'Construction', 'cat.农业': 'Agriculture',
  'cat.金融商务': 'Finance & business', 'cat.行政支持': 'Admin support', 'cat.教育/社会': 'Education & social services',
  'cat.文化艺术': 'Arts & culture', 'cat.销售/客服': 'Sales & customer service', 'cat.劳工/物流': 'Labour & logistics',
  'cat.高层管理': 'Senior executives', 'cat.IT/信息系统管理': 'IT & IS management', 'cat.会计/财务分析': 'Accounting & financial analysis',
  'cat.市场/品牌/传播': 'Marketing / brand / comms', 'cat.客户成功/实施': 'Customer success & implementation', 'cat.记账/薪酬': 'Bookkeeping & payroll',
  'cat.行政助理': 'Administrative assistants', 'cat.文员/数据录入': 'Clerks & data entry', 'cat.数据科学/机器学习': 'Data science & ML',
  'cat.网络安全': 'Cybersecurity', 'cat.系统/业务分析': 'Systems & business analysis', 'cat.数据库': 'Databases',
  'cat.软件工程': 'Software engineering', 'cat.软件开发': 'Software development', 'cat.Web 开发': 'Web development',
  'cat.计算机/硬件工程': 'Computer & hardware engineering', 'cat.IT 支持/网络': 'IT support & networking', 'cat.测试/QA': 'Testing & QA',
  'cat.医生/全科': 'Physicians & GPs', 'cat.牙科': 'Dental', 'cat.药剂师': 'Pharmacists', 'cat.理疗/康复': 'Physio & rehab',
  'cat.注册护士': 'Registered nurses', 'cat.实用护士': 'Practical nurses', 'cat.医学影像/化验': 'Medical imaging & lab',
  'cat.教师/讲师': 'Teachers & instructors', 'cat.社工/社区': 'Social & community work', 'cat.幼教/托育': 'Early childhood & childcare',
  'cat.护理员/PSW': 'Care aides & PSW', 'cat.UI/UX/平面设计': 'UI/UX & graphic design', 'cat.销售/业务管理': 'Sales & business management',
  'cat.厨师/主厨': 'Chefs', 'cat.厨工': 'Cooks', 'cat.零售/餐饮主管': 'Retail & food service supervisors', 'cat.零售销售': 'Retail sales',
  'cat.客服/安保': 'Customer service & security', 'cat.餐饮服务': 'Food & beverage service', 'cat.服务员/接待': 'Servers & reception',
  'cat.清洁/保洁': 'Cleaning & janitorial', 'cat.机械师/CNC': 'Machinists & CNC', 'cat.焊工': 'Welders', 'cat.电工': 'Electricians',
  'cat.管道工': 'Plumbers', 'cat.木工': 'Carpenters', 'cat.暖通/制冷': 'HVAC & refrigeration', 'cat.安装技工': 'Installers',
  'cat.汽修/钳工': 'Auto mechanics & millwrights', 'cat.油漆/装修': 'Painting & finishing', 'cat.货车司机': 'Truck drivers',
  'cat.物料搬运/仓储': 'Material handling & warehousing', 'cat.建筑劳工': 'Construction labourers', 'cat.农场工': 'Farm workers',
  'cat.农林劳工': 'Agriculture & forestry labourers', 'cat.园林劳工': 'Landscaping labourers', 'cat.生产劳工': 'Production labourers',
  },
  ko: {
    'cat.IT': 'IT',
  'cat.科技管理': '과학기술 관리', 'cat.自然科学': '자연과학', 'cat.建筑与规划': '건축 및 도시계획',
  'cat.数据与统计': '데이터 및 통계', 'cat.科学技术员': '과학 기술직', 'cat.设计与制图': '설계 및 제도',
  'cat.IT 支持': 'IT 지원', 'cat.检验与安全': '검사 및 안전', 'cat.工程技术员': '엔지니어링 기술직',
  'cat.自然与应用科学': '자연 및 응용과학', 'cat.工程管理': '엔지니어링 관리', 'cat.建筑与科学管理': '건축·과학 관리',
  'cat.IT 管理': 'IT 관리', 'cat.物理与天文': '물리학 및 천문학', 'cat.化学': '화학',
  'cat.地球与海洋': '지구·해양과학', 'cat.生物': '생물학', 'cat.林业': '임업',
  'cat.景观设计': '조경 설계', 'cat.城市规划': '도시계획', 'cat.测绘': '측량',
  'cat.统计与精算': '통계 및 보험계리', 'cat.数据科学': '데이터 사이언스',
  'cat.电气与电子工程': '전기·전자공학', 'cat.计算机与硬件工程': '컴퓨터·하드웨어 공학', 'cat.化学工程': '화학공학',
  'cat.工业与制造工程': '산업·제조공학', 'cat.冶金与材料工程': '금속·재료공학', 'cat.采矿工程': '광산공학',
  'cat.地质工程': '지질공학', 'cat.石油工程': '석유공학', 'cat.航空航天工程': '항공우주공학',
  'cat.其他工程': '기타 공학', 'cat.农渔产品检验': '농수산물 검사', 'cat.保育与渔业': '자연보호 및 수산',
  'cat.园艺与景观': '원예 및 조경', 'cat.建筑技术': '건축 기술', 'cat.工业设计': '산업 디자인',
  'cat.制图': '제도', 'cat.测绘技术': '측량 기술', 'cat.地理信息与气象': '지리정보 및 기상',
  'cat.网络与网站': '네트워크 및 웹 기술', 'cat.用户支持': '사용자 지원', 'cat.无损检测': '비파괴 검사',
  'cat.工程检查': '엔지니어링 검사', 'cat.职业健康与安全': '산업보건 및 안전', 'cat.建筑检查': '건축 검사',
  'cat.土木': '토목', 'cat.机械': '기계', 'cat.工业与制造': '산업·제조',
  'cat.建筑估价': '건축 적산', 'cat.电气与电子': '전기·전자', 'cat.电子设备维修': '전자기기 수리',
  'cat.工业仪表': '산업 계측', 'cat.航空电子': '항공전자',
  'cat.高级管理': '고위 경영', 'cat.金融': '금융', 'cat.人力资源': '인사(HR)',
  'cat.市场营销': '마케팅', 'cat.客户成功': '고객 성공', 'cat.财务支持': '재무 지원', 'cat.行政': '행정',
  'cat.办公支持': '사무 지원', 'cat.工程': '엔지니어링', 'cat.医疗专业': '의료 전문직', 'cat.护理': '간호',
  'cat.医疗技术': '의료 기술', 'cat.社会服务': '사회 서비스', 'cat.教育辅助': '교육 보조', 'cat.照护': '돌봄',
  'cat.设计': '디자인', 'cat.销售管理': '영업 관리', 'cat.餐饮': '요식업', 'cat.服务主管': '서비스 관리자',
  'cat.零售': '소매', 'cat.客服': '고객 서비스', 'cat.服务支持': '서비스 지원', 'cat.清洁': '청소',
  'cat.运输': '운송', 'cat.物流': '물류', 'cat.建筑': '건설', 'cat.农业': '농업',
  'cat.金融商务': '금융·비즈니스', 'cat.行政支持': '행정 지원', 'cat.教育/社会': '교육·사회 서비스',
  'cat.文化艺术': '문화·예술', 'cat.销售/客服': '영업·고객 서비스', 'cat.劳工/物流': '노무·물류',
  'cat.高层管理': '최고 경영진', 'cat.IT/信息系统管理': 'IT·정보시스템 관리', 'cat.会计/财务分析': '회계·재무 분석',
  'cat.市场/品牌/传播': '마케팅·브랜드·홍보', 'cat.客户成功/实施': '고객 성공·구축', 'cat.记账/薪酬': '부기·급여',
  'cat.行政助理': '행정 보조', 'cat.文员/数据录入': '사무원·데이터 입력', 'cat.数据科学/机器学习': '데이터 과학·머신러닝',
  'cat.网络安全': '사이버 보안', 'cat.系统/业务分析': '시스템·업무 분석', 'cat.数据库': '데이터베이스',
  'cat.软件工程': '소프트웨어 엔지니어링', 'cat.软件开发': '소프트웨어 개발', 'cat.Web 开发': '웹 개발',
  'cat.计算机/硬件工程': '컴퓨터·하드웨어 엔지니어링', 'cat.IT 支持/网络': 'IT 지원·네트워크', 'cat.测试/QA': '테스트 및 QA',
  'cat.医生/全科': '의사 및 일반의', 'cat.牙科': '치과', 'cat.药剂师': '약사', 'cat.理疗/康复': '물리치료 및 재활',
  'cat.注册护士': '등록 간호사(RN)', 'cat.实用护士': '실무 간호사(LPN)', 'cat.医学影像/化验': '의료 영상 및 검사',
  'cat.教师/讲师': '교사 및 강사', 'cat.社工/社区': '사회복지 및 지역사회', 'cat.幼教/托育': '유아교육 및 보육',
  'cat.护理员/PSW': '요양보호사(PSW)', 'cat.UI/UX/平面设计': 'UI/UX 및 그래픽 디자인', 'cat.销售/业务管理': '영업 및 사업 관리',
  'cat.厨师/主厨': '셰프 및 주방장', 'cat.厨工': '조리원', 'cat.零售/餐饮主管': '소매 및 요식업 관리자', 'cat.零售销售': '소매 판매',
  'cat.客服/安保': '고객 서비스 및 보안', 'cat.餐饮服务': '푸드 앤 드링크 서비스', 'cat.服务员/接待': '서빙 및 접수',
  'cat.清洁/保洁': '청소 및 미화', 'cat.机械师/CNC': '기계공 및 CNC', 'cat.焊工': '용접공', 'cat.电工': '전기공',
  'cat.管道工': '배관공', 'cat.木工': '목수', 'cat.暖通/制冷': 'HVAC·냉동', 'cat.安装技工': '설치 기사',
  'cat.汽修/钳工': '자동차 정비·기계 정비', 'cat.油漆/装修': '도장·마감', 'cat.货车司机': '트럭 운전기사',
  'cat.物料搬运/仓储': '자재 운반·창고', 'cat.建筑劳工': '건설 노무', 'cat.农场工': '농장 노동자',
  'cat.农林劳工': '농림 노무', 'cat.园林劳工': '조경 노무', 'cat.生产劳工': '생산 노무',
  },
}
// =========================================================================
// 站壳侧(原 site.ts 尾部)
// =========================================================================

/** 通道名以省名开头时把省名摘掉 —— 旁边那行灰字已经写着省名了(走查 #293)。
 *  「Saskatchewan Employment Offer」+ 灰字「Saskatchewan」→ 主文案只留「Employment Offer」。
 *  摘完为空(整条名字就是个省名)则原样返回:宁可重复一次,不给一个空标题。 */
export const dropProvPrefix = (name: string, prov: string): string => {
  const p = (prov || '').trim()
  const n = (name || '').trim()
  if (!p || !n.startsWith(p)) return n
  const rest = n.slice(p.length).replace(/^[\s:：—–-]+/, '').trim()
  return rest || n
}

// ── 官方资源导航(E4-05)─────────────────────────────────────────────────────
// 2026-08-17 从 app/(frontend)/resources/data.ts 整体搬来:一条资源的 `use` 是三语文案,
// `name`/`url` 是它的身份 —— 拆开会让「这条资源说什么」跨两个文件。
// 红线=宁缺毋滥,失效宁可不列(各省 PNP 页改版频繁,官方 URL 人工核对现行有效)。
export type Res = { name: string; use: Record<Lang, string>; url: string }
export const RES: { cat: string; items: Res[] }[] = [
  { cat: 'federal', items: [
    { name: 'IRCC 移民局', url: 'https://www.canada.ca/en/immigration-refugees-citizenship.html',
      use: { zh: '加拿大移民官方总入口', en: 'Canada immigration — official home', ko: '캐나다 이민 공식 포털' } },
    { name: 'Express Entry 快速通道', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html',
      use: { zh: '联邦技术移民主通道:资格与流程', en: 'Federal skilled immigration — eligibility & steps', ko: '연방 기술이민 주요 경로' } },
    { name: 'EE 历次抽选记录', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations.html',
      use: { zh: '每轮邀请的分数线与人数', en: 'Each round: CRS cutoff & invitations', ko: '회차별 CRS 커트라인·초청 수' } },
    { name: 'CRS 分数查询', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/check-score.html',
      use: { zh: '算一下你的 CRS 综合排名分', en: 'Estimate your CRS score', ko: 'CRS 점수 계산' } },
  ] },
  { cat: 'pnp', items: [
    { name: '省提名(PNP)总览', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html',
      use: { zh: '各省提名通道总入口', en: 'All provincial nominee programs', ko: '각 주 지명 프로그램 개요' } },
    { name: 'Ontario OINP', url: 'https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp',
      use: { zh: '安大略省提名', en: 'Ontario nominee program', ko: '온타리오 주 지명' } },
    { name: 'BC PNP', url: 'https://www.welcomebc.ca/immigrate-to-b-c/bc-provincial-nominee-program',
      use: { zh: 'BC 省提名', en: 'British Columbia nominee program', ko: 'BC 주 지명' } },
    { name: 'Alberta AAIP', url: 'https://www.alberta.ca/alberta-advantage-immigration-program',
      use: { zh: '阿尔伯塔省提名', en: 'Alberta nominee program', ko: '앨버타 주 지명' } },
    { name: 'Saskatchewan SINP', url: 'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/immigrating-to-saskatchewan/saskatchewan-immigrant-nominee-program',
      use: { zh: '萨省提名', en: 'Saskatchewan nominee program', ko: '서스캐처원 주 지명' } },
    { name: 'Manitoba MPNP', url: 'https://immigratemanitoba.com/',
      use: { zh: '曼省提名', en: 'Manitoba nominee program', ko: '매니토바 주 지명' } },
  ] },
  { cat: 'study', items: [
    { name: 'DLI 指定院校名单', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/designated-learning-institutions-list.html',
      use: { zh: '可申 PGWP 的院校官方名单', en: 'Designated learning institutions (PGWP-eligible)', ko: 'PGWP 가능 지정 교육기관 목록' } },
    { name: '学习许可(Study Permit)', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html',
      use: { zh: '留学签证的资格与申请', en: 'Study permit — eligibility & apply', ko: '학업 허가 자격·신청' } },
    { name: 'PGWP 毕业工签', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation.html',
      use: { zh: '毕业后开放工签,攒经验走移民', en: 'Post-graduation work permit', ko: '졸업 후 취업 허가(PGWP)' } },
  ] },
  { cat: 'language', items: [
    { name: 'IELTS 雅思(英语)', url: 'https://ielts.org/',
      use: { zh: '移民认可的英语考试', en: 'English test accepted for immigration', ko: '이민 인정 영어 시험' } },
    { name: 'CELPIP 思培(英语)', url: 'https://www.celpip.ca/',
      use: { zh: '加拿大本土英语考试', en: 'Canadian English test', ko: '캐나다 영어 시험' } },
    { name: 'TCF Canada(法语)', url: 'https://www.france-education-international.fr/tcf-canada',
      use: { zh: '移民认可的法语考试', en: 'French test accepted for immigration', ko: '이민 인정 프랑스어 시험' } },
    { name: '认可考试与 CLB 对照', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-requirements.html',
      use: { zh: '各考试分数与 CLB 等级对照', en: 'Accepted tests & CLB equivalency', ko: '시험별 CLB 등급 대조' } },
  ] },
  { cat: 'wage', items: [
    { name: 'Job Bank 工资查询', url: 'https://www.jobbank.gc.ca/trend-analysis/search-wages',
      use: { zh: '按职业和地区查中位工资(ESDC)', en: 'Median wages by occupation & region', ko: '직업·지역별 중위 임금' } },
    { name: 'NOC 职业分类', url: 'https://noc.esdc.gc.ca/',
      use: { zh: '查职业的 NOC 码与 TEER 档', en: 'Look up NOC code & TEER', ko: 'NOC 코드·TEER 조회' } },
  ] },
  { cat: 'lmia', items: [
    { name: '临时外劳项目(LMIA)', url: 'https://www.canada.ca/en/employment-social-development/services/foreign-workers.html',
      use: { zh: '雇主雇外劳的 LMIA 官方项目页', en: 'Temporary Foreign Worker Program (LMIA)', ko: '임시 외국인 근로자(LMIA)' } },
    { name: 'AIP 大西洋移民', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration-program.html',
      use: { zh: '海洋四省雇主担保通道', en: 'Atlantic Immigration Program', ko: '대서양 이민 프로그램' } },
  ] },
  { cat: 'authority', items: [
    { name: '官方处理时间', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html',
      use: { zh: '各类申请当前处理周期', en: 'Current application processing times', ko: '신청 처리 기간' } },
    { name: '官方费用', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/pay-fees.html',
      use: { zh: '各类申请的官方收费标准', en: 'Official application fees', ko: '공식 신청 수수료' } },
    { name: '持牌顾问核验(CICC)', url: 'https://college-ic.ca/',
      use: { zh: '核实移民顾问是否持牌(RCIC)', en: 'Verify a licensed immigration consultant', ko: '공인 이민 컨설턴트 확인' } },
  ] },
]
// =========================================================================
// 对话轨迹(原 consult.ts 尾部)
// =========================================================================
// ── 对话与顾问的见客文案 ────────────────────────────────────────────────────
// 2026-08-17 从对话编排层搬来(那边 08-18 拆成了 lib/chat/)。那边留下的是**编排逻辑**与
// **模型输出的检测器**(HEDGE_WORDS / SCRIPT_RE / COVERAGE_WORD / AVAIL_MARKERS / VERDICT_MARKERS)——
// 那几样按语言分叉但不是文案,是校验规则,搬进来会让这个文件变成什么都能塞的抽屉。
// 提示词(SLOT_SYSTEM 等)同理:给模型看的,归 prompts.ts。

/**
 * consult 新链(pi 工具循环)的轨迹一行 —— 键 = consult 的工具名(`TOOL_NAME` 的值)。
 *
 * 轨迹在**取数开始前**发(「这一步真的开始打了才发」),那时还没有条数/省名可带,
 * 所以全部无参;采信出职业那一拍例外 —— 用下面的 `CONSULT_STEP_OCC`,那一刻职业名已在手。
 * (旧链的带参 STEP 表 2026-08-21 随 lib/chat 一起删了。)
 */
export const CONSULT_STEP: Record<Lang, Record<string, string>> = {
  zh: {
    search_occupations: '检索职业库',
    lookup_jobs: '查在招岗位',
    lookup_coverage: '查职业清单',
    lookup_thresholds: '查官方门槛',
    lookup_draws: '查抽选记录',
    lookup_ops: '查运营统计',
    lookup_ee: '查联邦 EE 类别',
    lookup_permit: '查联邦规则',
    lookup_points: '查联邦计分表',
    assess_pathways: '逐条比对官方门槛',
    check_claims: '核对别人跟你说的',
  },
  en: {
    search_occupations: 'Searching occupations',
    lookup_jobs: 'Checking open postings',
    lookup_coverage: 'Checking occupation lists',
    lookup_thresholds: 'Checking official requirements',
    lookup_draws: 'Checking draw history',
    lookup_ops: 'Checking operational stats',
    lookup_ee: 'Checking Express Entry categories',
    lookup_permit: 'Checking federal rules',
    lookup_points: 'Checking the federal points grid',
    assess_pathways: 'Comparing official requirements',
    check_claims: 'Checking what you were told',
  },
  ko: {
    search_occupations: '직업 검색',
    lookup_jobs: '채용 공고 조회',
    lookup_coverage: '직업 목록 조회',
    lookup_thresholds: '공식 요건 조회',
    lookup_draws: '추첨 기록 조회',
    lookup_ops: '운영 통계 조회',
    lookup_ee: '연방 EE 카테고리 조회',
    lookup_permit: '연방 규정 조회',
    lookup_points: '연방 점수표 조회',
    assess_pathways: '공식 요건 대조',
    check_claims: '들으신 내용 대조',
  },
}

/**
 * 采信出职业那一拍的轨迹一行 —— 唯一带参的:那一刻职业名已经在手,这是全程信息量最大的一条。
 */
export const CONSULT_STEP_OCC: Record<Lang, (occ: string) => string> = {
  zh: (o) => `认出职业:${o}`,
  en: (o) => `Occupation identified: ${o}`,
  ko: (o) => `직업 확인: ${o}`,
}
// =========================================================================
// 法务四页长文(原 legal.ts 尾部)
// =========================================================================
// ── 法务四页正文 ────────────────────────────────────────────────────────────
// 一页正文是一个整体,不摊进上面的扁平 key 空间:拆成几十个键只会让「这一段在哪」
// 变成一次全站 grep。四篇同型,`Record<Lang, LegalDoc>` 保证加一门语言时四篇一起报红。
// 文案为模板级自拟,不构成法律意见(收入后请专业审阅,backlog)。
export type LegalDoc = { title: string; updated: string; sections: { h: string; body: string[] }[] }

export const legalDocs: Record<'privacy' | 'terms' | 'disclaimer' | 'about', Record<Lang, LegalDoc>> = {
  privacy: {
    zh: {
      title: '隐私政策',
      updated: '生效日期:2026-08-05',
      sections: [
        { h: '1. 我们收集什么', body: [
          '账户信息:邮箱地址与密码(密码以加密哈希存储,我们无法看到原文)。',
          '移民档案(可选、全部自报):NOC 码、语言 CLB、CRS 分、目标省、PGWP 剩余月数。仅用于计算「与我的匹配」等个人化功能,只存在你的账户里,可随时修改或清空。',
          'Pro 状态:到期日与 Stripe 客户标识(用于对账)。',
          '简历(默认不存):上传的 PDF、DOCX 原件只在内存里解析,解析完即弃,不落盘也不入库。只有你在简历对照弹框里勾选存档,简历文本才会存进你的账户(上限 20,000 字符),账户页可随时查看与清除。',
          '技术数据:为防滥用,API 按 IP 与账户做进程内当日计数(不落库、每日清零);简历对照的当日次数存在你的账户档案里(只有日期与次数),跨日归零。浏览器 localStorage/Cookie 存语言、列偏好与登录会话。',
          '访问统计:使用 umami(无 Cookie 的匿名统计)记录页面浏览与转化漏斗事件(注册、打开升级/定价弹窗、发起购买),不含个人身份,不跨站追踪。'
          + '同样的漏斗事件我们也在自己的数据库里按天计数(只有「哪天、哪个事件、多少次」,不含 IP、设备信息、账户或会话标识)。',
          '对话记录:为改进问答质量,我们保存 AI 顾问的提问与回答内容(含你在提问里自己写下的信息)、以及本站为这次回答查到的数据与耗时。'
          + '不含 IP、账户标识或邮箱,无法关联到具体的人。',
        ] },
        { h: '2. 支付', body: [
          '支付全程由 Stripe 处理,银行卡号、支付宝/微信账户等支付凭据不经过也不存储在本站服务器。详见 Stripe 的隐私政策(stripe.com/privacy)。',
        ] },
        { h: '3. 我们如何使用', body: [
          '仅用于提供服务本身:登录鉴权、个人化匹配、AI 顾问的档案感知、配额管理与付费权益。我们不出售你的个人数据,不用于广告投放,不与第三方共享;为提供本服务所必需的服务提供方(托管、支付、大模型服务)与法律要求除外。',
        ] },
        { h: '4. AI 处理说明', body: [
          'Pro 用户使用 AI 顾问时,你的自报档案与所查职位的数据会发送给大模型服务商(Anthropic)以生成回答;对方按其商业条款不使用这些数据训练模型。',
          '使用简历对照时,你的简历文本与该职位的描述文本会发送给本站使用的大模型服务做比对,不用于训练模型。服务端日志只记文本长度与耗时,不记内容。',
        ] },
        { h: '5. 存储位置与保留', body: [
          '数据库托管在 Render(美国弗吉尼亚)。账户数据在账户存续期间保留。',
        ] },
        { h: '6. 你的权利与删号', body: [
          '你可随时在账户页修改档案。要删除账户及全部关联数据,发邮件至 {email}(用注册邮箱发送即可),我们会在合理时间内处理并确认。',
        ] },
        { h: '7. 变更', body: [
          '本政策更新时会修改页首生效日期;重大变更会在站内提示。',
        ] },
      ],
    },
    en: {
      title: 'Privacy Policy',
      updated: 'Effective date: 2026-08-05',
      sections: [
        { h: '1. What we collect', body: [
          'Account: email address and password (stored as a cryptographic hash — we cannot see the original).',
          'Immigration profile (optional, entirely self-reported): NOC codes, language CLB, CRS score, target provinces, PGWP months left. Used only for personalised features such as "Match for me"; stored only on your account; editable or clearable anytime.',
          'Pro status: expiry date and Stripe customer identifier (for reconciliation).',
          'Resume (not stored by default): uploaded PDF and DOCX files are parsed in memory and discarded immediately — never written to disk or to our database. Your resume text is stored on your account (up to 20,000 characters) only if you tick the save box in the resume match dialog; you can view or clear it anytime on the account page.',
          'Technical data: to prevent abuse, APIs keep in-process daily counters per IP and per account (not persisted, reset daily); the resume match daily count is stored on your account profile (date and count only) and resets each day. Browser localStorage/cookies store language, column preferences and the login session.',
          'Analytics: we use umami (cookie-less, anonymous) to record page views and conversion-funnel events (sign-up, opening the upgrade/pricing dialogs, checkout initiation); no personal identity, no cross-site tracking.'
          + ' The same funnel events are also counted per day in our own database — only "which day, which event, how many times", with no IP, device, account or session identifier.',
          'Conversations: to improve answer quality we store the questions and answers from the AI advisor (including whatever you write in your own question), along with the data this site looked up for that answer and how long it took.'
          + ' No IP, account identifier or email address is stored, so it cannot be linked back to a person.',
        ] },
        { h: '2. Payments', body: [
          'Payments are handled entirely by Stripe. Card numbers and Alipay/WeChat credentials never pass through or get stored on our servers. See Stripe’s privacy policy (stripe.com/privacy).',
        ] },
        { h: '3. How we use it', body: [
          'Only to provide the service itself: authentication, personalised matching, profile-aware AI advisor, quota management and paid entitlements. We do not sell your personal data, do not use it for advertising, and do not share it with third parties, apart from the providers needed to run the service (hosting, payments, LLM services) and where required by law.',
        ] },
        { h: '4. AI processing', body: [
          'When a Pro user uses the AI advisor, the self-reported profile and the queried job’s data are sent to our LLM provider (Anthropic) to generate the answer; under their commercial terms this data is not used to train models.',
          'When you run a resume match, your resume text and that job’s description are sent to the LLM service we use for the comparison, and are not used to train models. Server logs record only text length and duration, never the content.',
        ] },
        { h: '5. Storage and retention', body: [
          'The database is hosted on Render (Virginia, USA). Account data is retained for the life of the account.',
        ] },
        { h: '6. Your rights and account deletion', body: [
          'You can edit your profile anytime on the account page. To delete your account and all associated data, email {email} from your registered address; we will process and confirm within a reasonable time.',
        ] },
        { h: '7. Changes', body: [
          'When this policy changes we update the effective date above; material changes will be announced on the site.',
        ] },
      ],
    },
    ko: {
      title: '개인정보 처리방침',
      updated: '시행일: 2026-08-05',
      sections: [
        { h: '1. 수집 항목', body: [
          '계정: 이메일 주소와 비밀번호(암호화 해시로 저장되며 원문은 볼 수 없습니다).',
          '이민 프로필(선택, 전부 자가 보고): NOC 코드, 언어 CLB, CRS 점수, 목표 주, PGWP 잔여 개월. "나와의 매칭" 등 개인화 기능에만 사용되며 내 계정에만 저장, 언제든 수정·삭제 가능합니다.',
          'Pro 상태: 만료일과 Stripe 고객 식별자(대사용).',
          '이력서(기본값은 저장 안 함): 업로드한 PDF·DOCX 원본은 메모리에서만 분석한 뒤 즉시 폐기하며 디스크나 데이터베이스에 저장하지 않습니다. 이력서 대조 창에서 저장 항목을 선택한 경우에만 이력서 텍스트가 계정에 저장되며(최대 20,000자), 계정 페이지에서 언제든 확인·삭제할 수 있습니다.',
          '기술 데이터: 남용 방지를 위해 API는 IP·계정별 당일 카운터를 프로세스 내에서만 유지(저장 안 함, 매일 초기화)하며, 이력서 대조의 당일 횟수는 계정 프로필에 저장합니다(날짜와 횟수만, 매일 초기화). 브라우저 localStorage/쿠키에 언어·열 설정·로그인 세션을 저장합니다.',
          '방문 통계: umami(쿠키 없는 익명 통계)로 페이지 조회와 전환 퍼널 이벤트(가입, 업그레이드/요금제 창 열기, 결제 시작)를 기록합니다. 개인 식별 정보 없음, 사이트 간 추적 없음.'
          + ' 동일한 퍼널 이벤트는 자체 데이터베이스에도 일자별 횟수로만 집계합니다(날짜·이벤트·횟수만, IP·기기·계정·세션 식별자 없음).',
          '대화 기록: 답변 품질 개선을 위해 AI 어드바이저의 질문과 답변 내용(질문에 직접 적으신 정보 포함), 그리고 그 답변을 위해 본 사이트가 조회한 데이터와 처리 시간을 저장합니다.'
          + ' IP·계정 식별자·이메일은 저장하지 않으므로 특정 개인과 연결할 수 없습니다.',
        ] },
        { h: '2. 결제', body: [
          '결제는 전적으로 Stripe가 처리합니다. 카드번호, Alipay/WeChat 자격 증명은 당사 서버를 거치거나 저장되지 않습니다. Stripe 개인정보 처리방침(stripe.com/privacy)을 참조하세요.',
        ] },
        { h: '3. 이용 목적', body: [
          '서비스 제공 자체에만 사용합니다: 로그인 인증, 개인화 매칭, 프로필 인지 AI 어드바이저, 할당량 관리와 유료 권한. 개인정보를 판매하지 않고 광고에 쓰지 않으며 제3자와 공유하지 않습니다. 서비스 제공에 필요한 공급업체(호스팅·결제·LLM 서비스)와 법적 요구는 예외입니다.',
        ] },
        { h: '4. AI 처리', body: [
          'Pro 사용자가 AI 어드바이저를 사용할 때 자가 보고 프로필과 조회한 공고 데이터가 LLM 제공사(Anthropic)로 전송되어 답변을 생성합니다. 상업 약관에 따라 이 데이터는 모델 학습에 사용되지 않습니다.',
          '이력서 대조를 실행하면 이력서 텍스트와 해당 공고의 설명 텍스트가 당사가 사용하는 LLM 서비스로 전송되어 비교되며, 모델 학습에는 사용되지 않습니다. 서버 로그에는 텍스트 길이와 처리 시간만 기록하고 내용은 기록하지 않습니다.',
        ] },
        { h: '5. 저장 위치와 보존', body: [
          '데이터베이스는 Render(미국 버지니아)에 호스팅됩니다. 계정 데이터는 계정 존속 기간 동안 보존됩니다.',
        ] },
        { h: '6. 권리와 계정 삭제', body: [
          '계정 페이지에서 언제든 프로필을 수정할 수 있습니다. 계정과 모든 관련 데이터를 삭제하려면 가입 이메일로 {email}에 메일을 보내주세요. 합리적인 기간 내 처리 후 확인해 드립니다.',
        ] },
        { h: '7. 변경', body: [
          '본 방침이 변경되면 상단 시행일을 갱신하며, 중대한 변경은 사이트 내에 공지합니다.',
        ] },
      ],
    },
    },
  terms: {
    zh: {
      title: '服务条款',
      updated: '生效日期:2026-07-04',
      sections: [
        { h: '1. 服务内容', body: [
          'Offer2PR 提供加拿大公开职位信息的聚合浏览,以及面向注册用户的增值功能(移民档案匹配、AI 顾问、工资对比等,统称 Pro 功能)。使用本站即表示你接受本条款、隐私政策与免责声明。',
        ] },
        { h: '2. 账户', body: [
          '注册需提供有效邮箱。你对账户下的活动负责,请妥善保管密码。我们可对滥用行为(如爬取、共享账户、绕过配额)限制或终止服务。',
        ] },
        { h: '3. 付费:一次性时长包', body: [
          'Pro 以一次性时长包出售:30 天 CA$19、90 天 CA$39(价格可能调整,以购买页显示为准)。购买即时生效;未到期续买时长顺延。到期后自动回到免费版——没有订阅,没有自动扣款。',
          '支付由 Stripe 安全处理;具体可用的支付方式以结账页实际显示为准。',
        ] },
        { h: '4. 退款', body: [
          '购买后 7 天内且未大量使用付费功能(以 AI 顾问等用量显著低于日常上限为准),可用注册邮箱发邮件至 {email} 申请全额退款,我们核实后原路退回,Pro 权益同时终止。',
          '超过 7 天、或存在明显滥用/套利行为的,不适用无理由退款;个案争议可邮件沟通。',
        ] },
        { h: '5. 数据来源与知识产权', body: [
          '职位数据来自 Job Bank 等公开来源的自动聚合;职位描述仅做结构化摘录并显著链接官方原帖,原始内容的权利归雇主或原发布平台所有。本站自建的清洗、评分、匹配逻辑与界面归本站所有。',
          '禁止对本站进行系统性抓取、复制或转售数据。',
        ] },
        { h: '6. 雇主 / 平台异议下架', body: [
          '如你是相关职位的雇主或原发布平台,认为本站对某条信息的聚合展示不妥,请邮件 {email} 并附职位链接与身份说明。我们核实后会在合理时间内下架相应内容并回复确认。',
        ] },
        { h: '7. 免责与责任限制', body: [
          '服务按「现状」提供,数据与 AI 输出的准确性详见免责声明。在法律允许的最大范围内,本站对使用或无法使用本服务导致的任何间接损失不承担责任;直接责任以你实际支付的费用为限。',
        ] },
        { h: '8. 条款变更与适用法', body: [
          '条款更新时修改页首生效日期,重大变更站内提示;继续使用即视为接受。本条款适用加拿大安大略省法律。',
        ] },
      ],
    },
    en: {
      title: 'Terms of Service',
      updated: 'Effective date: 2026-07-04',
      sections: [
        { h: '1. The service', body: [
          'Offer2PR provides aggregated browsing of publicly posted Canadian jobs, plus paid features for registered users (immigration profile matching, AI advisor, wage comparison, etc. — collectively "Pro"). By using the site you accept these terms, the privacy policy and the disclaimer.',
        ] },
        { h: '2. Accounts', body: [
          'Registration requires a valid email. You are responsible for activity under your account; keep your password safe. We may restrict or terminate service for abuse (scraping, account sharing, quota circumvention).',
        ] },
        { h: '3. Payment: one-time passes', body: [
          'Pro is sold as one-time passes: 30 days CA$19, 90 days CA$39 (prices may change; the checkout page governs). Passes take effect immediately; buying again before expiry extends the date. When a pass expires you simply return to the free plan — there is no subscription and no automatic charge.',
          'Payments are processed securely by Stripe; available payment methods are as shown at checkout.',
        ] },
        { h: '4. Refunds', body: [
          'Within 7 days of purchase, if you have not made heavy use of paid features (e.g. AI-advisor usage well below the daily cap), you may request a full refund by emailing {email} from your registered address. After verification we refund to the original method and the Pro entitlement ends.',
          'Requests beyond 7 days, or cases of clear abuse/arbitrage, are not covered by this no-questions refund; individual disputes can be raised by email.',
        ] },
        { h: '5. Data sources and intellectual property', body: [
          'Job data is automatically aggregated from public sources such as Job Bank; job descriptions are shown as structured excerpts with a prominent link to the official posting, and rights in the original content remain with the employer or the original platform. Our own cleaning, scoring and matching logic and the interface belong to this site.',
          'Systematic scraping, copying or resale of the site’s data is prohibited.',
        ] },
        { h: '6. Employer / platform takedown', body: [
          'If you are the employer or the original platform of a listed posting and object to how it is aggregated here, email {email} with the job link and proof of identity. After verification we will remove the content within a reasonable time and confirm.',
        ] },
        { h: '7. Disclaimer and limitation of liability', body: [
          'The service is provided "as is"; see the disclaimer regarding data and AI accuracy. To the maximum extent permitted by law, we are not liable for indirect losses arising from use of or inability to use the service; direct liability is capped at the amount you actually paid.',
        ] },
        { h: '8. Changes and governing law', body: [
          'When these terms change we update the effective date above and announce material changes on the site; continued use constitutes acceptance. These terms are governed by the laws of Ontario, Canada.',
        ] },
      ],
    },
    ko: {
      title: '이용약관',
      updated: '시행일: 2026-07-04',
      sections: [
        { h: '1. 서비스', body: [
          'Offer2PR는 캐나다 공개 채용 정보의 통합 열람과 가입자 대상 유료 기능(이민 프로필 매칭, AI 어드바이저, 임금 비교 등, 통칭 "Pro")을 제공합니다. 본 사이트를 이용하면 본 약관, 개인정보 처리방침, 면책 조항에 동의한 것으로 봅니다.',
        ] },
        { h: '2. 계정', body: [
          '가입에는 유효한 이메일이 필요합니다. 계정 활동에 대한 책임은 본인에게 있으며 비밀번호를 안전하게 관리하세요. 남용(크롤링, 계정 공유, 할당량 우회)에 대해 서비스 제한·종료가 있을 수 있습니다.',
        ] },
        { h: '3. 결제: 일회성 기간권', body: [
          'Pro는 일회성 기간권으로 판매합니다: 30일 CA$19, 90일 CA$39(가격은 변경될 수 있으며 결제 페이지 기준). 구매 즉시 적용되며 만료 전 재구매 시 기간이 연장됩니다. 만료 후에는 무료 플랜으로 돌아갑니다 — 구독도 자동 결제도 없습니다.',
          '결제는 Stripe가 안전하게 처리하며, 사용 가능한 결제 수단은 결제 페이지에 표시된 것을 기준으로 합니다.',
        ] },
        { h: '4. 환불', body: [
          '구매 후 7일 이내이고 유료 기능을 과도하게 사용하지 않은 경우(예: AI 어드바이저 사용량이 일일 한도보다 훨씬 낮음), 가입 이메일로 {email}에 전액 환불을 신청할 수 있습니다. 확인 후 원결제 수단으로 환불되며 Pro 권한은 종료됩니다.',
          '7일 초과 또는 명백한 남용·차익 행위에는 무조건 환불이 적용되지 않으며, 개별 분쟁은 이메일로 논의할 수 있습니다.',
        ] },
        { h: '5. 데이터 출처와 지식재산', body: [
          '채용 데이터는 Job Bank 등 공개 출처에서 자동 수집됩니다. 직무 설명은 구조화 발췌로만 표시하고 공식 공고 링크를 눈에 띄게 제공하며, 원본 콘텐츠의 권리는 고용주 또는 원 플랫폼에 있습니다. 당사의 정제·평가·매칭 로직과 인터페이스는 본 사이트에 귀속됩니다.',
          '본 사이트 데이터의 체계적 크롤링·복제·재판매를 금지합니다.',
        ] },
        { h: '6. 고용주/플랫폼 이의 및 게시 중단', body: [
          '게시된 공고의 고용주 또는 원 플랫폼으로서 본 사이트의 표시 방식에 이의가 있으면 공고 링크와 신원 증빙을 첨부해 {email}로 연락하세요. 확인 후 합리적인 기간 내 해당 콘텐츠를 내리고 회신합니다.',
        ] },
        { h: '7. 면책과 책임 제한', body: [
          '서비스는 "있는 그대로" 제공됩니다. 데이터·AI 정확성은 면책 조항을 참조하세요. 법이 허용하는 최대 범위에서 서비스 이용 또는 이용 불능으로 인한 간접 손해에 책임지지 않으며, 직접 책임은 실제 지불 금액을 한도로 합니다.',
        ] },
        { h: '8. 약관 변경과 준거법', body: [
          '약관 변경 시 상단 시행일을 갱신하고 중대한 변경은 사이트 내 공지합니다. 계속 이용하면 동의한 것으로 봅니다. 본 약관은 캐나다 온타리오주 법률을 따릅니다.',
        ] },
      ],
    },
    },
  disclaimer: {
    zh: {
      title: '免责声明',
      updated: '生效日期:2026-07-04',
      sections: [
        { h: '1. 本站性质', body: [
          'Offer2PR 是一个职位信息聚合工具:数据来自 Job Bank、各省政府官网、IRCC、ESDC、加拿大统计局等公开来源的自动抓取、清洗与评分,每日更新。本站不是招聘中介,不代表任何雇主,也不参与任何招聘或移民申请流程。',
        ] },
        { h: '2. 非移民建议、非法律建议', body: [
          '本站全部内容——包括职位标记(PNP / EE 类别 / AIP)、评分、「与我的匹配」、AI 顾问输出——均不构成移民建议或法律建议。我们不是加拿大持牌移民顾问(RCIC),也不是律师,与 IRCC 及任何政府机构无隶属关系。',
          '任何移民决定请以 IRCC 与各省政府的官方发布为准,必要时咨询持牌专业人士。',
        ] },
        { h: '3. 标记与匹配是机械比对,非资格认定', body: [
          'PNP「可提名」等标记是按职业分类(NOC/TEER)与各省公开清单做的粗筛信号;「与我的匹配」是你自报档案与公开清单、抽选数据的机械比对。它们都不是任何形式的资格认定——各省项目另有语言、工资、学历、雇主资质等要求,且政策随时变化。',
        ] },
        { h: '4. 数据准确性', body: [
          '自动抓取的数据可能有误、缺失或滞后:职位可能已下架、薪资可能变动、清单与抽选线以官方页面实时为准。每条清单类数据我们尽量标注来源链接与抓取日期,便于你核对原始出处。',
        ] },
        { h: '5. AI 生成内容', body: [
          'AI 顾问的判断与对话由大语言模型生成,虽然我们要求它只基于本站核验过的数据回答,它仍可能出错或表述不准。AI 输出仅供参考,不构成任何建议。',
        ] },
        { h: '6. 外部链接', body: [
          '本站链接的官方原帖、政府页面等外部网站由第三方运营,其内容与可用性不在我们控制范围内。',
        ] },
      ],
    },
    en: {
      title: 'Disclaimer',
      updated: 'Effective date: 2026-07-04',
      sections: [
        { h: '1. What this site is', body: [
          'Offer2PR is a job-information aggregator: data is automatically scraped, cleaned and scored from public sources such as Job Bank, provincial government websites, IRCC, ESDC and Statistics Canada, updated daily. We are not a recruitment agency, do not represent any employer, and are not involved in any hiring or immigration application process.',
        ] },
        { h: '2. Not immigration or legal advice', body: [
          'Nothing on this site — including job flags (PNP / EE category / AIP), scores, "Match for me", or AI advisor output — constitutes immigration or legal advice. We are not licensed Canadian immigration consultants (RCIC) or lawyers, and are not affiliated with IRCC or any government body.',
          'For any immigration decision, rely on official IRCC and provincial publications, and consult a licensed professional where needed.',
        ] },
        { h: '3. Flags and matches are mechanical comparisons, not eligibility rulings', body: [
          'PNP flags are rough screens based on occupation classification (NOC/TEER) against published provincial lists; "Match for me" mechanically compares your self-reported profile against published lists and draw data. None of these are eligibility determinations — provincial programs have additional language, wage, education and employer requirements, and policies change frequently.',
        ] },
        { h: '4. Data accuracy', body: [
          'Auto-scraped data may be wrong, incomplete or out of date: postings may have closed, wages may have changed, and lists / draw cutoffs are governed by the live official pages. Where possible we label list-type data with its source link and fetch date so you can verify the original.',
        ] },
        { h: '5. AI-generated content', body: [
          'AI advisor assessments and chat replies are generated by a large language model. Although we require it to answer only from data verified on this site, it can still be wrong or imprecise. AI output is for reference only.',
        ] },
        { h: '6. External links', body: [
          'Official postings, government pages and other external sites we link to are operated by third parties; their content and availability are outside our control.',
        ] },
      ],
    },
    ko: {
      title: '면책 조항',
      updated: '시행일: 2026-07-04',
      sections: [
        { h: '1. 본 사이트의 성격', body: [
          'Offer2PR는 채용 정보 수집 도구입니다. Job Bank, 주정부 웹사이트, IRCC, ESDC, 캐나다 통계청 등 공개 출처에서 자동 수집·정제·평가한 데이터를 매일 갱신합니다. 당사는 채용 중개사가 아니며, 어떤 고용주도 대리하지 않고, 채용·이민 신청 절차에 관여하지 않습니다.',
        ] },
        { h: '2. 이민·법률 자문이 아님', body: [
          '본 사이트의 모든 콘텐츠(PNP / EE 카테고리 / AIP 표시, 점수, "나와의 매칭", AI 어드바이저 출력 포함)는 이민 또는 법률 자문이 아닙니다. 당사는 캐나다 공인 이민 컨설턴트(RCIC)나 변호사가 아니며 IRCC 및 정부 기관과 무관합니다.',
          '이민 관련 결정은 IRCC 및 주정부 공식 발표를 기준으로 하고, 필요 시 공인 전문가와 상담하세요.',
        ] },
        { h: '3. 표시와 매칭은 기계적 비교이며 자격 판정이 아님', body: [
          'PNP 표시는 직업 분류(NOC/TEER)와 주정부 공개 목록의 대략적 비교 신호이며, "나와의 매칭"은 자가 보고 프로필과 공개 목록·추첨 데이터의 기계적 비교입니다. 어느 것도 자격 판정이 아닙니다. 주정부 프로그램에는 언어·임금·학력·고용주 요건이 추가로 있으며 정책은 수시로 변합니다.',
        ] },
        { h: '4. 데이터 정확성', body: [
          '자동 수집 데이터는 오류·누락·지연이 있을 수 있습니다. 공고가 마감되었거나 급여가 변경되었을 수 있으며, 목록과 추첨 커트라인은 공식 페이지 기준입니다. 목록형 데이터에는 가능한 한 출처 링크와 수집일을 표기합니다.',
        ] },
        { h: '5. AI 생성 콘텐츠', body: [
          'AI 어드바이저의 판단과 대화는 대규모 언어 모델이 생성합니다. 본 사이트에서 검증된 데이터만 사용하도록 요구하지만 여전히 오류나 부정확한 표현이 있을 수 있습니다. AI 출력은 참고용입니다.',
        ] },
        { h: '6. 외부 링크', body: [
          '본 사이트가 연결하는 공식 공고·정부 페이지 등 외부 사이트는 제3자가 운영하며 그 내용과 가용성은 당사의 통제 밖에 있습니다.',
        ] },
      ],
    },
    },
  about: {
    zh: {
      title: '🍁 关于 Offer2PR',
      updated: '',
      sections: [
        { h: '这是什么', body: [
          '一个每日更新的全加拿大职位板,带移民价值视角。普通招聘站告诉你「哪里有工作」,我们还告诉你:这份工作对你的移民路径意味着什么——能不能走「雇主 offer → 省提名」、在不在联邦 EE 类别清单、薪资和当地中位差多少、和你的档案匹配度如何。',
        ] },
        { h: '为谁而做', body: [
          '为在加拿大的留学生、PGWP 持有人和考虑技术移民的人:找工作时最该优先投哪些岗,不该只看薪资,还要看它们通向身份的概率。',
        ] },
        { h: '数据从哪来', body: [
          '全部来自公开来源的自动抓取与清洗:Job Bank(全 10 省全职业,每日增量)、各省提名计划官网(OINP/AAIP/SINP/NSNP 等清单,定期实时抓取)、IRCC(EE 类别抽选与分数线)、ESDC(工资中位数)、加拿大统计局(NOC 2021 职业描述)。清单类数据都标注来源链接与抓取日期。',
        ] },
        { h: '谁在做', body: [
          '这是一个独立开发者项目,由 Frank 一个人构建与维护。有问题、建议或数据勘误,欢迎邮件 {email}。',
        ] },
      ],
    },
    en: {
      title: '🍁 About Offer2PR',
      updated: '',
      sections: [
        { h: 'What this is', body: [
          'A daily-updated, Canada-wide job board with an immigration-value lens. Ordinary job sites tell you where the jobs are; we also tell you what a job means for your immigration path — whether it can support the employer-offer → PNP route, whether it sits on a federal EE category list, how the pay compares to the local median, and how it matches your own profile.',
        ] },
        { h: 'Who it is for', body: [
          'International students, PGWP holders and prospective skilled-worker immigrants in Canada: when job-hunting, prioritise not just by salary but by the probability a job leads to status.',
        ] },
        { h: 'Where the data comes from', body: [
          'Everything is auto-scraped and cleaned from public sources: Job Bank (all 10 provinces, all occupations, daily), provincial nominee program websites (OINP/AAIP/SINP/NSNP lists, refreshed on schedule), IRCC (EE category draws and cutoffs), ESDC (median wages) and Statistics Canada (NOC 2021 occupation descriptions). List-type data carries its source link and fetch date.',
        ] },
        { h: 'Who builds it', body: [
          'This is an independent developer project, built and maintained by Frank. Questions, suggestions or data corrections: {email}.',
        ] },
      ],
    },
    ko: {
      title: '🍁 Offer2PR 소개',
      updated: '',
      sections: [
        { h: '무엇인가', body: [
          '매일 갱신되는 캐나다 전역 채용 보드에 이민 가치 관점을 더했습니다. 일반 채용 사이트는 "어디에 일자리가 있는지"를 알려주지만, 우리는 그 일자리가 이민 경로에 무엇을 의미하는지도 알려줍니다 — 고용주 오퍼 → 주정부 지명(PNP) 경로 가능성, 연방 EE 카테고리 목록 포함 여부, 지역 중위 임금 대비 급여, 내 프로필과의 매칭도.',
        ] },
        { h: '누구를 위한 것인가', body: [
          '캐나다의 유학생, PGWP 소지자, 기술이민 준비자: 구직 시 급여만이 아니라 신분으로 이어질 확률로 우선순위를 정하세요.',
        ] },
        { h: '데이터 출처', body: [
          '전부 공개 출처의 자동 수집·정제입니다: Job Bank(10개 주 전 직종, 매일), 주정부 지명 프로그램 웹사이트(OINP/AAIP/SINP/NSNP 목록, 주기적 갱신), IRCC(EE 카테고리 추첨·커트라인), ESDC(중위 임금), 캐나다 통계청(NOC 2021 직업 설명). 목록형 데이터에는 출처 링크와 수집일을 표기합니다.',
        ] },
        { h: '만드는 사람', body: [
          '독립 개발자 프로젝트로 Frank가 혼자 만들고 운영합니다. 질문·제안·데이터 정정: {email}.',
        ] },
      ],
    },
    },
}
