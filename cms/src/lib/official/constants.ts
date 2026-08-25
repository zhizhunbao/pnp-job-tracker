/**
 * 官方资料域的死值:官方分值表原句的三语译名表(quote-anchored)与官方资源导航。
 * 每条记录的身份就是一份官方资料本身(官方原句 / name+url)。
 *
 * @author Frank
 * @time 2026-08-22 22:00:00
 */


import type { LangCode, Res, ResGroup } from './types'

/**
 * 官方原文尾部悬空的「, or」(表格排版残留,显示时摘掉):那个 or 是官方**表格排版**
 * 留下的(下一行接着念),单拎出来放进选项就是个悬空的 or(英文界面实拍:
 * 「Post-secondary education completed in B.C., or」)。二选一改由 UI 表达,尾巴去掉。
 */
export const OR_TAIL_RE = /[,，]?\s*or\s*$/i

/**
 * 官方表的行文是**英文原文**,中/韩界面按这张表出人话(**只译不改口径**,分值仍来自官方表)。
 *
 * 🔴 `OFFICIAL_EN` 不是「忘了翻」,是**显式声明「这一条用官方英文原文」** ——
 * 2026-08-17 Frank 拍板:官方分值表的句子译错一个词就是改了口径,宁可显英文
 * (同 streamDisplay 的老规矩:表里没有的原样只显英文,不让模型现编译名)。
 * 类型是必填的 `Record<LangCode, string>`,所以「没决定」这个状态不存在了 ——
 * 先前 `{ zh?; ko? }` 两个都可选,75 条里 54 条静默缺 ko,三个月没人看见。
 *
 * 终局不在代码里:这是**移民事实**,该走 data/ → mart → DB(CLAUDE.md 铁律),
 * 先例是 noc_categories 的 mid_en/mid_ko。搬进 i18n 是过渡形态。
 */
const OFFICIAL_EN = ''

/**
 * 官方分值表原句 → 三语译名(键 = 官方英文原句,quote-anchored;表里没有的显示官方原文)。
 */
export const officialLabels: Record<string, Record<LangCode, string>> = {
  // BC
  'At least 1 year of directly related experience in Canada': {
    zh: '在加拿大有 1 年以上同职业经验',
    en: OFFICIAL_EN,
    ko: '캐나다 내 동일 직종 1년 이상',
  },
  'Currently working full-time in B.C. for the employer in the occupation identified in the BC PNP registration': {
    zh: '目前在本省为该雇主全职做同一职业',
    en: OFFICIAL_EN,
    ko: '현재 해당 주에서 같은 고용주와 동일 직종 풀타임',
  },
  'Post-secondary education completed in B.C., or': {
    zh: '学历在本省读的',
    en: OFFICIAL_EN,
    ko: '해당 주에서 취득한 학력',
  },
  'Post-secondary education completed in Canada (outside of B.C.)': {
    zh: '学历在加拿大其它省读的',
    en: OFFICIAL_EN,
    ko: '캐나다 타 주에서 취득',
  },
  'Eligible professional designation in B.C.': {
    zh: '持本省认可的执业资格',
    en: OFFICIAL_EN,
    ko: '해당 주 인정 전문 자격 보유',
  },
  'Language proficiency in both English and French': {
    zh: '英法双语都达标',
    en: OFFICIAL_EN,
    ko: '영어·프랑스어 모두 충족',
  },
  'Area 1: Metro Vancouver Regional District': {
    zh: '大温地区',
    en: OFFICIAL_EN,
    ko: '메트로 밴쿠버',
  },
  'Area 2: Squamish, Abbotsford, Agassiz, Mission, and Chilliwack': {
    zh: 'Squamish、Abbotsford、Agassiz、Mission、Chilliwack',
    en: OFFICIAL_EN,
    ko: 'Squamish, Abbotsford, Agassiz, Mission, Chilliwack',
  },
  'Area 3: Areas of B.C. not included in Area 1 or 2': {
    zh: '不列颠哥伦比亚省其余地区',
    en: OFFICIAL_EN,
    ko: '브리티시컬럼비아주 기타 지역',
  },
  'Regional Experience, or': {
    zh: '有地区工作经验或地区院校毕业',
    en: OFFICIAL_EN,
    ko: '지역 근무 경력 또는 지역 졸업',
  },
  // MB(MPNP EOI 加分/扣分项 —— Risk Assessment 两条是负分,符号由 Tick 按分值出)
  'Work experience in another province': {
    zh: '有外省工作经历',
    en: OFFICIAL_EN,
    ko: '타 주 근무 경력',
  },
  'Fully recognized by provincial licensing body': {
    zh: '职业资格获省监管机构完全认证',
    en: OFFICIAL_EN,
    ko: '주 면허기관 완전 인정 자격',
  },
  'Second Official Language — CLB 5 or higher (overall)': {
    zh: '第二官方语言 CLB 5 以上',
    en: OFFICIAL_EN,
    ko: '제2공용어 CLB 5 이상',
  },
  'Studies in another province': {
    zh: '有外省就读经历',
    en: OFFICIAL_EN,
    ko: '타 주 학업 경력',
  },
  'Close relative in Manitoba': {
    zh: '在本省有近亲',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Close friend or distant relative in Manitoba': {
    zh: '在本省有远亲或密友',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Previous authorized work experience in Manitoba (six months or more)': {
    zh: '曾在本省合法工作至少 6 个月',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Completed post-secondary program in Manitoba (two years or more)': {
    zh: '在本省完成至少 2 年的高等教育项目',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Completed post-secondary program in Manitoba (one year)': {
    zh: '在本省完成 1 年高等教育项目',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Ongoing employment in Manitoba for six months or more with long-term job offer from the same employer': {
    zh: '已为同一本省雇主工作至少 6 个月并获长期 offer',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Invitation to Apply under a Strategic Initiative': {
    zh: '获本省战略项目邀请',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Immigration destination in Manitoba outside of Winnipeg': {
    zh: '计划定居温尼伯以外地区',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Close relative in another province and no close relative in Manitoba': {
    zh: '外省有近亲、本省无近亲',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Previous immigration application to another province': {
    zh: '曾向其他省申请移民',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  // ON Workforce Priority
  'Over 24 months working in job offer position': {
    zh: '已在 offer 对应岗位工作超过 24 个月',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  '13 to 24 months working in job offer position': {
    zh: '已在 offer 对应岗位工作 13-24 个月',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  '6 to 12 months working in job offer position': {
    zh: '已在 offer 对应岗位工作 6-12 个月',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Less than 6 months working in job offer position or not currently working in position': {
    zh: '不足 6 个月或目前未在该岗位工作',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  '$70k or more earnings in a year': {
    zh: '加拿大年报税收入 7 万加元以上',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  '$50k to $69,999': {
    zh: '加拿大年报税收入 5万-69,999 加元',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  '$30k to $49,999': {
    zh: '加拿大年报税收入 3万-49,999 加元',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Under $30k earnings in a year': {
    zh: '加拿大年报税收入不足 3 万加元',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'With valid work permit': {
    zh: '持有效工签',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'With valid study permit': {
    zh: '持有效学签',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Without valid work or study permit': {
    zh: '没有有效工签或学签',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'More than one Canadian credential': {
    zh: '有多个加拿大学历',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'One Canadian credential': {
    zh: '有一个加拿大学历',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'No Canadian credential': {
    zh: '没有加拿大学历',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Northern Ontario': {
    zh: '安省北部',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Eastern Ontario': {
    zh: '安省东部',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Central Ontario outside GTA': {
    zh: '安省中部（GTA 以外）',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Southwestern Ontario': {
    zh: '安省西南部',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Inside GTA (except Toronto)': {
    zh: 'GTA 内（多伦多除外）',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Toronto': {
    zh: '多伦多',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  '$40 per hour or higher': {
    zh: '时薪 40 加元以上',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  '$35 to $39.99 per hour': {
    zh: '时薪 35-39.99 加元',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  '$30 to $34.99 per hour': {
    zh: '时薪 30-34.99 加元',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  '$25 to $29.99 per hour': {
    zh: '时薪 25-29.99 加元',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  '$20 to $24.99 per hour': {
    zh: '时薪 20-24.99 加元',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Less than $20 per hour': {
    zh: '时薪不足 20 加元',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  // SK
  'High skilled employment offer from a Saskatchewan employer': {
    zh: '有本省雇主的高技能岗 offer',
    en: OFFICIAL_EN,
    ko: '해당 주 고용주의 고숙련 오퍼 보유',
  },
  'Close family relative in Saskatchewan': {
    zh: '在本省有近亲(公民或永居)',
    en: OFFICIAL_EN,
    ko: '해당 주에 가까운 친척 거주',
  },
  'Past work experience in Saskatchewan': {
    zh: '在本省工作过(近 5 年满 12 个月)',
    en: OFFICIAL_EN,
    ko: '해당 주 근무 경력(최근 5년 12개월)',
  },
  'Past student experience in Saskatchewan': {
    zh: '在本省读过书(满一学年)',
    en: OFFICIAL_EN,
    ko: '해당 주 유학 경험(1학년도 이상)',
  },
  // AB(AAIP Worker EOI 分值表;2026-08-14 接入时漏配整省 → 中文界面英文原句裸奔,当天补齐)
  'Job offer in a regulated occupation in Alberta and holds certification or licensing demonstrating meets regulatory requirements to practice the occupation in Alberta': {
    zh: '受监管职业 offer 且已持本省执业资格',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Family member (parent, child, or sibling) living in Alberta who is a Canadian Citizen or permanent resident over 18 years of age': {
    zh: '本省有父母/子女/兄弟姐妹(成年公民或永居)',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Bilingual language proficiency: CLB or NCLC score of 4 or higher in both English and French': {
    zh: '英法双语 CLB/NCLC 均 4 以上',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Job offer for permanent full-time employment in Alberta': {
    zh: '有本省长期全职 offer',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Endorsement letter from a designated community in the Rural Renewal Stream': {
    zh: '持乡村振兴通道定向社区背书信',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Job offer for the tourism and hospitality sector from an employer who is a member of a required sector association under the Tourism and Hospitality Stream': {
    zh: '旅游酒店通道行业协会成员雇主的 offer',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Job offer in a law enforcement occupation from an employer who is a member of the Alberta Association of Chiefs of Police (AACP)': {
    zh: '执法职业 offer(雇主为 AACP 成员)',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Alberta job offer location: Rural Renewal Stream designated community': {
    zh: 'offer 在乡村振兴定向社区',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Alberta job offer location: Other Alberta community (outside the Edmonton and Calgary Census Metropolitan Areas and Rural Renewal Stream designated communities)': {
    zh: 'offer 在埃德蒙顿/卡尔加里都会区外的其他社区',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Location of Highest Level of Education Completed in Canada: Completed in Alberta': {
    zh: '最高学历在本省完成',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Location of Highest Level of Education Completed in Canada: Completed in another province or territory (not Alberta)': {
    zh: '最高学历在加拿大其它省完成',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'English CLB 6 or higher': {
    zh: '英语 CLB 6 以上',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'English CLB 3 or lower': {
    zh: '英语 CLB 3 或以下',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Total Work Experience: 12 or more months': {
    zh: '总工作经验 12 个月以上',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Total Work Experience: 6-11 months': {
    zh: '总工作经验 6-11 个月',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Total Work Experience: Less than 6 months': {
    zh: '总工作经验不足 6 个月',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Trades Certificate/Diploma': {
    zh: 'Trades 技工证书',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  'Secondary School and lower': {
    zh: '高中及以下',
    en: OFFICIAL_EN,
    ko: OFFICIAL_EN,
  },
  // NL Express Entry Skilled Worker - Annex A adaptability
  'Close relative in Newfoundland and Labrador': {
    zh: '本人或配偶在本省有符合范围的近亲',
    en: OFFICIAL_EN,
    ko: '본인 또는 배우자의 해당 주 가까운 친척',
  },
  'Previous work experience in Newfoundland and Labrador': {
    zh: '近 5 年曾在本省持有效工签工作至少 12 个月',
    en: OFFICIAL_EN,
    ko: '최근 5년 내 해당 주에서 유효한 취업허가로 12개월 이상 근무',
  },
  'Previous student experience in Newfoundland and Labrador': {
    zh: '曾在本省认可院校持学签全日制就读至少 1 学年',
    en: OFFICIAL_EN,
    ko: '해당 주 인정 교육기관에서 유효한 유학허가로 1학년도 이상 수학',
  },
}

/**
 * 官方资源导航(按类分组)。红线=宁缺毋滥,失效宁可不列
 * (各省 PNP 页改版频繁,官方 URL 人工核对现行有效)。
 */
export const RES: ResGroup[] = [
  {
    cat: 'federal',
    items: [
      {
        name: 'IRCC 移民局',
        url: 'https://www.canada.ca/en/immigration-refugees-citizenship.html',
        use: {
          zh: '加拿大移民官方总入口',
          en: 'Canada immigration — official home',
          ko: '캐나다 이민 공식 포털',
        },
      },
      {
        name: 'Express Entry 快速通道',
        url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html',
        use: {
          zh: '联邦技术移民主通道:资格与流程',
          en: 'Federal skilled immigration — eligibility & steps',
          ko: '연방 기술이민 주요 경로',
        },
      },
      {
        name: 'EE 历次抽选记录',
        url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/submit-profile/rounds-invitations.html',
        use: {
          zh: '每轮邀请的分数线与人数',
          en: 'Each round: CRS cutoff & invitations',
          ko: '회차별 CRS 커트라인·초청 수',
        },
      },
      {
        name: 'CRS 分数查询',
        url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/check-score.html',
        use: {
          zh: '算一下你的 CRS 综合排名分',
          en: 'Estimate your CRS score',
          ko: 'CRS 점수 계산',
        },
      },
    ],
  },
  {
    cat: 'pnp',
    items: [
      {
        name: '省提名(PNP)总览',
        url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/provincial-nominees.html',
        use: {
          zh: '各省提名通道总入口',
          en: 'All provincial nominee programs',
          ko: '각 주 지명 프로그램 개요',
        },
      },
      {
        name: 'Ontario OINP',
        url: 'https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp',
        use: {
          zh: '安大略省提名',
          en: 'Ontario nominee program',
          ko: '온타리오 주 지명',
        },
      },
      {
        name: 'BC PNP',
        url: 'https://www.welcomebc.ca/immigrate-to-b-c/bc-provincial-nominee-program',
        use: {
          zh: 'BC 省提名',
          en: 'British Columbia nominee program',
          ko: 'BC 주 지명',
        },
      },
      {
        name: 'Alberta AAIP',
        url: 'https://www.alberta.ca/alberta-advantage-immigration-program',
        use: {
          zh: '阿尔伯塔省提名',
          en: 'Alberta nominee program',
          ko: '앨버타 주 지명',
        },
      },
      {
        name: 'Saskatchewan SINP',
        url: 'https://www.saskatchewan.ca/residents/moving-to-saskatchewan/immigrating-to-saskatchewan/saskatchewan-immigrant-nominee-program',
        use: {
          zh: '萨省提名',
          en: 'Saskatchewan nominee program',
          ko: '서스캐처원 주 지명',
        },
      },
      {
        name: 'Manitoba MPNP',
        url: 'https://immigratemanitoba.com/',
        use: {
          zh: '曼省提名',
          en: 'Manitoba nominee program',
          ko: '매니토바 주 지명',
        },
      },
    ],
  },
  {
    cat: 'study',
    items: [
      {
        name: 'DLI 指定院校名单',
        url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit/prepare/designated-learning-institutions-list.html',
        use: {
          zh: '可申 PGWP 的院校官方名单',
          en: 'Designated learning institutions (PGWP-eligible)',
          ko: 'PGWP 가능 지정 교육기관 목록',
        },
      },
      {
        name: '学习许可(Study Permit)',
        url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html',
        use: {
          zh: '留学签证的资格与申请',
          en: 'Study permit — eligibility & apply',
          ko: '학업 허가 자격·신청',
        },
      },
      {
        name: 'PGWP 毕业工签',
        url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation.html',
        use: {
          zh: '毕业后开放工签,攒经验走移民',
          en: 'Post-graduation work permit',
          ko: '졸업 후 취업 허가(PGWP)',
        },
      },
    ],
  },
  {
    cat: 'language',
    items: [
      {
        name: 'IELTS 雅思(英语)',
        url: 'https://ielts.org/',
        use: {
          zh: '移民认可的英语考试',
          en: 'English test accepted for immigration',
          ko: '이민 인정 영어 시험',
        },
      },
      {
        name: 'CELPIP 思培(英语)',
        url: 'https://www.celpip.ca/',
        use: {
          zh: '加拿大本土英语考试',
          en: 'Canadian English test',
          ko: '캐나다 영어 시험',
        },
      },
      {
        name: 'TCF Canada(法语)',
        url: 'https://www.france-education-international.fr/tcf-canada',
        use: {
          zh: '移民认可的法语考试',
          en: 'French test accepted for immigration',
          ko: '이민 인정 프랑스어 시험',
        },
      },
      {
        name: '认可考试与 CLB 对照',
        url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-requirements.html',
        use: {
          zh: '各考试分数与 CLB 等级对照',
          en: 'Accepted tests & CLB equivalency',
          ko: '시험별 CLB 등급 대조',
        },
      },
    ],
  },
  {
    cat: 'wage',
    items: [
      {
        name: 'Job Bank 工资查询',
        url: 'https://www.jobbank.gc.ca/trend-analysis/search-wages',
        use: {
          zh: '按职业和地区查中位工资(ESDC)',
          en: 'Median wages by occupation & region',
          ko: '직업·지역별 중위 임금',
        },
      },
      {
        name: 'NOC 职业分类',
        url: 'https://noc.esdc.gc.ca/',
        use: {
          zh: '查职业的 NOC 码与 TEER 档',
          en: 'Look up NOC code & TEER',
          ko: 'NOC 코드·TEER 조회',
        },
      },
    ],
  },
  {
    cat: 'lmia',
    items: [
      {
        name: '临时外劳项目(LMIA)',
        url: 'https://www.canada.ca/en/employment-social-development/services/foreign-workers.html',
        use: {
          zh: '雇主雇外劳的 LMIA 官方项目页',
          en: 'Temporary Foreign Worker Program (LMIA)',
          ko: '임시 외국인 근로자(LMIA)',
        },
      },
      {
        name: 'AIP 大西洋移民',
        url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration-program.html',
        use: {
          zh: '海洋四省雇主担保通道',
          en: 'Atlantic Immigration Program',
          ko: '대서양 이민 프로그램',
        },
      },
    ],
  },
  {
    cat: 'authority',
    items: [
      {
        name: '官方处理时间',
        url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/check-processing-times.html',
        use: {
          zh: '各类申请当前处理周期',
          en: 'Current application processing times',
          ko: '신청 처리 기간',
        },
      },
      {
        name: '官方费用',
        url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/pay-fees.html',
        use: {
          zh: '各类申请的官方收费标准',
          en: 'Official application fees',
          ko: '공식 신청 수수료',
        },
      },
      {
        name: '持牌顾问核验(CICC)',
        url: 'https://college-ic.ca/',
        use: {
          zh: '核实移民顾问是否持牌(RCIC)',
          en: 'Verify a licensed immigration consultant',
          ko: '공인 이민 컨설턴트 확인',
        },
      },
    ],
  },
]

/**
 * 「表里没查到译名」的空位。`officialLabel` 先把结果收成它,查到才覆盖 —— 于是
 * 「这条原句没登记」与「登记了但这门语言是空的(OFFICIAL_EN,显式声明用官方英文原文)」
 * 两种情况汇成同一个状态,统一回落官方原句,不会把一句空白显示出去。
 * ⚠️ 与上面的 OFFICIAL_EN 长得一样但不是同一件事:那个是**表里填的值**
 * (「这一条就用官方英文」),这个是**查表的初始值**(「还没查到」)。
 */
export const LABEL_MISS = ''

/**
 * 摘掉尾部悬空「, or」时替换成的空串 —— 换成空 = 直接删掉那截尾巴,不留任何字符。
 * 不换成空格,是因为它就在整句末尾,留个空格只会多一个看不见的尾随字符
 * (拼进选项、进比较、进 key 时都是隐患)。
 */
export const OR_TAIL_DROP = ''
