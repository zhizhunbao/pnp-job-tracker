// 官方资源导航 curated 数据(E4-05):View 渲染 + page.tsx JSON-LD 单一来源。
// 红线=宁缺毋滥,失效宁可不列(各省 PNP 页改版频繁,官方 URL 人工核对现行有效)。
import type { Lang } from '../jobs/i18n'

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
