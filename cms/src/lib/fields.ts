// 字段库 = 全站单一来源(设计:docs/design/统一题库与付费面-20260731.md §1/§3)。
// 每个字段带四件事:
//   q        SurveyJS 题 JSON(原生多语对象,加语言=加键)
//   unlocks  答完能算出哪几条结论 —— 写的是引擎里真实存在的 key(lib/report.ts),不是口号
//   tier     那几条结论落免费区还是锁区:free=留存题(答完立刻多一条能看的),pro=转化题
//   toAnswer 档位 → 引擎输入(换算只此一处;页面不再各存一份 CLB/EXP/PROVS 映射表)
// 铁律:挂不上任何结论的字段不入库。
import type { Answers } from './answers'

export type Tier = 'free' | 'pro'
export type FieldDef = {
  engineKey?: string                                   // /api/report answers 的键名(缺省=字段名)
  q: Record<string, unknown>
  unlocks: string[]
  tier: Tier
  toAnswer?: (v: any, all: Answers) => unknown         // 返回 undefined = 不传(缺答与「答案是 0」要分开)
}

type L = { default: string; 'zh-cn': string; ko: string }
const l = (en: string, zh: string, ko: string): L => ({ default: en, 'zh-cn': zh, ko })

// 档 → 引擎输入(原先散在 PlanPrView 顶部的五张表,收拢到字段自己身上)
const CLB = [0, 5, 7, 9, 0]            // a4「还没考」= 没有分,走 0 哨兵
const EXP = [0, 0, 6, 18, 30]          // a1「没有」= 0 个月,是答案不是缺答
export const PROVS: string[][] = [[], ['BC'], ['ON'], ['AB', 'SK', 'MB'], []]   // a4「先看哪个够得着」= 不限省
const CRS = [0, 0, 380, 425, 480]      // a1「没算过」= 不传,引擎照旧出「没填 CRS」
const PGWP = [0, 4, 9, 18, 30]

export const FIELDS: Record<string, FieldDef> = {
  // 处境:决定签证题算不算数(境外没有加拿大签证),并计入基本题完整度
  status: {
    engineKey: 'currentStatus',
    unlocks: ['rpt.c.window', 'rpt.g.basics'],
    tier: 'free',
    toAnswer: (v: string) => v || undefined,
    q: {
      type: 'radiogroup', name: 'status', isRequired: true,
      title: l('Where are you today?', '你现在的情况?', '현재 상황은?'),
      choices: [
        { value: 'overseas', text: l('Outside Canada, planning the move', '还在境外,想来加拿大工作', '해외에서 캐나다 취업 준비 중') },
        { value: 'studying', text: l('Studying in Canada', '在加拿大读书', '캐나다에서 유학 중') },
        { value: 'working', text: l('Working in Canada', '已经在加拿大工作', '캐나다에서 근무 중') },
        { value: 'jobhunting', text: l('In Canada, job hunting', '在加拿大找工作', '캐나다에서 구직 중') },
      ],
    },
  },
  // 英语:**当前只驱动完整度**(各省语言门槛尚未建模,见矩阵「数据缺口」列)。
  // 严格按铁律它现在不配单独入库,留在基本题里是因为 confidence 要它、且门槛一建模它立刻挂上结论。
  // 建模后把真结论 key 补进 unlocks —— 别让这行注释烂在这。
  clbBand: {
    engineKey: 'clb',
    unlocks: ['rpt.g.basics'],
    tier: 'free',
    toAnswer: (b: number) => CLB[b] || undefined,
    q: {
      type: 'radiogroup', name: 'clbBand', isRequired: true,
      title: l('Where is your English?', '英语到哪一档?', '영어 수준은?'),
      choices: [
        { value: 1, text: l('Basic', '初级', '초급') },
        { value: 2, text: l('Intermediate', '中级', '중급') },
        { value: 3, text: l('Fluent', '流利', '유창') },
        { value: 4, text: l('Not tested yet', '还没考', '시험 전') },
      ],
    },
  },
  // 加拿大经验:够 12 个月出 rpt.c.expOk,不够出 rpt.g.expShort(缺口免费)
  expBand: {
    engineKey: 'canadianExpMonths',
    unlocks: ['rpt.c.expOk', 'rpt.g.expShort'],
    tier: 'free',
    toAnswer: (b: number) => (b ? EXP[b] : undefined),
    q: {
      type: 'radiogroup', name: 'expBand', isRequired: true,
      title: l('Canadian experience in this occupation?', '在加拿大做过这行多久?', '캐나다에서 이 직종 경력은?'),
      choices: [
        { value: 1, text: l('None', '没有', '없음') },
        { value: 2, text: l('Under 1 year', '不到 1 年', '1년 미만') },
        { value: 3, text: l('1-2 years', '1-2 年', '1-2년') },
        { value: 4, text: l('2+ years', '2 年以上', '2년 이상') },
      ],
    },
  },
  // 目标省:决定报告逐省算哪几个省(不选就按具名命中取前 3)
  provBand: {
    engineKey: 'targetProvinces',
    unlocks: ['rpt.c.listedHit', 'rpt.c.listedMiss', 'rpt.c.drawBand', 'rpt.a.prov'],
    tier: 'free',
    toAnswer: (b: number) => PROVS[b] ?? [],
    q: {
      type: 'radiogroup', name: 'provBand', isRequired: true,
      title: l('Target province?', '目标省?', '희망 주?'),
      choices: [
        { value: 1, text: l('BC', 'BC', 'BC') },
        { value: 2, text: l('Ontario', '安省', '온타리오') },
        { value: 3, text: l('Prairies', '草原三省', '프레리 3주') },
        { value: 4, text: l('Show me what is reachable', '先看哪个够得着', '가능한 곳부터 보기') },
      ],
    },
  },
  // 卡③「选省份」唯一的专属题:雇主担保类通道按定义要先有 offer —— 有/没有各改一条真结论
  // (有 → 下一步换成对照该省雇主通道;没有 → 出缺口)。「面试中/自雇」都按「还没有」算,不含糊。
  offerBand: {
    engineKey: 'hasJobOffer',
    unlocks: ['rpt.n.employer', 'rpt.g.noOffer'],
    tier: 'free',
    toAnswer: (b: number) => (b ? b === 1 : undefined),
    q: {
      type: 'radiogroup', name: 'offerBand', isRequired: true,
      title: l('Do you have a job offer in hand?', '手上有 offer 吗?', '받은 잡오퍼가 있나요?'),
      choices: [
        { value: 1, text: l('Yes', '有', '있음') },
        { value: 2, text: l('In interviews', '面试中', '면접 중') },
        { value: 3, text: l('No', '没有', '없음') },
        { value: 4, text: l('Self-employed', '自雇', '자영업') },
      ],
    },
  },
  // 探索层:CRS → EE 分差(锁区 ee)
  crsBand: {
    engineKey: 'crs',
    unlocks: ['rpt.c.eeAbove', 'rpt.c.eeBelow'],
    tier: 'pro',
    toAnswer: (b: number) => CRS[b] || undefined,
    q: {
      type: 'radiogroup', name: 'crsBand', isRequired: true,
      title: l('Your Express Entry CRS score?', '你的 EE 综合排名分(CRS)?', 'Express Entry CRS 점수는?'),
      choices: [
        { value: 1, text: l('Never calculated it', '没算过', '계산해 본 적 없음') },
        { value: 2, text: l('Under 400', '400 以下', '400 미만') },
        { value: 3, text: l('400-450', '400-450', '400-450') },
        { value: 4, text: l('450+', '450 以上', '450 이상') },
      ],
    },
  },
  // 探索层:签证剩余 → 时间窗(锁区 window)。境外不传:没有加拿大签证,拿档位造时间窗=编数
  pgwpBand: {
    engineKey: 'pgwpMonthsLeft',
    unlocks: ['rpt.c.window'],
    tier: 'pro',
    toAnswer: (b: number, all: Answers) => (all.status === 'overseas' ? undefined : PGWP[b] || undefined),
    q: {
      type: 'radiogroup', name: 'pgwpBand', isRequired: true,
      title: l('How long is left on your permit?', '你的签证还剩多久?', '비자 잔여 기간은?'),
      choices: [
        { value: 1, text: l('Under 6 months', '不到 6 个月', '6개월 미만') },
        { value: 2, text: l('6-12 months', '6-12 个月', '6-12개월') },
        { value: 3, text: l('1-2 years', '1-2 年', '1-2년') },
        { value: 4, text: l('2+ years', '2 年以上', '2년 이상') },
      ],
    },
  },
}

// 目标省的两种表示(三问存省份数组、答题存档位)必须互推,否则「问过的不再问」是假的
export const provsFromBand = (b: number): string[] => PROVS[b] ?? []
export const bandFromProvs = (provs: string[] | undefined): number =>
  !provs?.length ? 0 : provs.length === 1 && provs[0] === 'BC' ? 1 : provs.length === 1 && provs[0] === 'ON' ? 2 : 4
