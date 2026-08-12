// 字段库 = 全站单一来源(设计:docs/design/统一题库与付费面-20260731.md §1/§3)。
// 每个字段带四件事:
//   q        题面(题干 + 选项,三语对象:加一门语言 = 加一个键)
//   unlocks  答完能算出哪几条结论 —— 写的是引擎里真实存在的 key(lib/report.ts),不是口号
//   tier     那几条结论落免费区还是锁区:free=留存题(答完立刻多一条能看的),pro=转化题
//   toAnswer 档位 → 引擎输入(换算只此一处;页面不再各存一份 CLB/EXP/PROVS 映射表)
// 铁律:挂不上任何结论的字段不入库。
// 2026-08-03:题面原先是 SurveyJS 的题 JSON(type/name/isRequired 全是给框架看的),
// 撤掉框架后收成本站自己的最小形状 —— 全部是必答单选,类型与必答不用逐题再声明一遍。
import type { Answers } from './answers'

export type Tier = 'free' | 'pro'
export type L = { default: string; 'zh-cn': string; ko: string }
export type Question = {
  title: L
  choices: { value: number | string; text: L }[]
  // 选项过滤(目前只有一处:加拿大经验不得超过总经验)。先前是框架的字符串表达式,现在是普通函数
  choiceVisible?: (a: Answers, v: number) => boolean
}
export type FieldDef = {
  engineKey?: string                                   // /api/report answers 的键名(缺省=字段名)
  q: Question
  unlocks: string[]
  tier: Tier
  toAnswer?: (v: any, all: Answers) => unknown         // 返回 undefined = 不传(缺答与「答案是 0」要分开)
}

const l = (en: string, zh: string, ko: string): L => ({ default: en, 'zh-cn': zh, ko })

// 档 → 引擎输入(原先散在 PlanPrView 顶部的五张表,收拢到字段自己身上)
// 语言:问**实测档位**,不问自评(2026-08-02 Frank「我选的是英语流利,为什么显示 CLB 9」)——
// 「初级/中级/流利 → CLB 5/7/9」那套映射是本站编的,报告却写成「你报的 CLB 9」= 替他填了个他没说过的数;
// 而且自评偏乐观(自认流利常是 CLB 7),门槛判定会因此说「达标」而实际不达标。取每档**下界**,宁可低报。
const CLB = [0, 0, 4, 6, 8, 10]        // a1「还没考」= 没有分,不传
const EXP = [0, 0, 6, 18, 30]          // a1「没有」= 0 个月,是答案不是缺答
// a4「先看哪个够得着」= 不限省。**海洋四省挂 5 不挂 4**:4 已经在生产用了,改它的含义会把
// 已存档案里的「不限省」静默变成「海洋四省」(2026-08-03 加这一档时的取舍——显示顺序看 choices 数组,与值无关)。
export const PROVS: string[][] = [[], ['BC'], ['ON'], ['AB', 'SK', 'MB'], [], ['NS', 'NB', 'PE', 'NL']]
const CRS = [0, 0, 380, 425, 480]      // a1「没算过」= 不传,引擎照旧出「没填 CRS」
const PGWP = [0, 4, 9, 18, 30]
// 官方分值表要的三样(题库扩充 20260802):学历阶梯 / 年龄取区间中点 / 同职业总经验(含海外)
const EDU = ['', 'highschool', 'diploma2y', 'bachelor', 'master', 'doctorate']
const AGE = [0, 23, 28, 33, 38, 43]
const TOTAL_EXP = [0, 0, 6, 24, 48, 60]   // a1「没有」= 0 个月,是答案不是缺答(同 EXP 口径)
// B1-4 PGWP:课程时长档下界 / 层级(引擎只对 master 有特例,其余按时长档)
const STUDY_MONTHS = [0, 4, 8, 12, 24]
const STUDY_LEVEL = ['', 'college', 'bachelor', 'master', 'doctorate']

export const FIELDS: Record<string, FieldDef> = {
  // 处境:决定签证题算不算数(境外没有加拿大签证),并计入基本题完整度
  status: {
    engineKey: 'currentStatus',
    unlocks: ['rpt.c.window', 'rpt.g.basics'],
    tier: 'free',
    toAnswer: (v: string) => v || undefined,
    q: {
      title: l('Where are you today?', '你现在的情况?', '현재 상황은?'),
      choices: [
        { value: 'overseas', text: l('Outside Canada, planning the move', '还在境外,想来加拿大工作', '해외에서 캐나다 취업 준비 중') },
        { value: 'studying', text: l('Studying in Canada', '在加拿大读书', '캐나다에서 유학 중') },
        { value: 'working', text: l('Working in Canada', '已经在加拿大工作', '캐나다에서 근무 중') },
        { value: 'jobhunting', text: l('In Canada, job hunting', '在加拿大找工作', '캐나다에서 구직 중') },
      ],
    },
  },
  // 学历:官方分值表里分最重的一项(BC SIRS 0-26、SK SINP 0-23)。
  // 先前引擎写死 highschool —— 每个省都少算十几分,「至少 N 分」低得没意义(题库扩充 20260802 §1)
  eduBand: {
    engineKey: 'edu',
    unlocks: ['rpt.s.cur', 'rpt.s.alt.mark'],
    tier: 'free',
    toAnswer: (b: number) => EDU[b] || undefined,
    q: {
      title: l('Your highest education?', '最高学历?', '최종 학력은?'),
      choices: [
        { value: 1, text: l('High school or less', '高中或以下', '고졸 이하') },
        { value: 2, text: l('College diploma', '大专或证书', '전문대·수료증') },
        { value: 3, text: l('Bachelor', '本科', '학사') },
        { value: 4, text: l('Master', '硕士', '석사') },
        { value: 5, text: l('Doctorate', '博士', '박사') },
      ],
    },
  },
  // 年龄:SK 年龄分 0-12(18-35 满分、≥50 归零),BC 不算年龄 —— 引擎按区间中点匹官方档
  ageBand: {
    engineKey: 'age',
    unlocks: ['rpt.s.cur', 'rpt.s.alt.mark'],
    tier: 'free',
    toAnswer: (b: number) => AGE[b] || undefined,
    q: {
      title: l('Your age?', '年龄段?', '연령대는?'),
      choices: [
        { value: 1, text: l('24 or under', '24 岁及以下', '24세 이하') },
        { value: 2, text: l('25-30', '25-30 岁', '25-30세') },
        { value: 3, text: l('31-35', '31-35 岁', '31-35세') },
        { value: 4, text: l('36-40', '36-40 岁', '36-40세') },
        { value: 5, text: l('41 or over', '41 岁以上', '41세 이상') },
      ],
    },
  },
  // 同职业总经验(含海外):省级分值表的 work 因素按**总年数**给分,不限加拿大。
  // 与 expBand(加拿大经验)分工:那道题管 CEC 的 12 个月,这道题管省级 work 档位。
  totalExpBand: {
    engineKey: 'totalExpMonths',
    unlocks: ['rpt.s.cur', 'rpt.s.alt.mark', 'rpt.g.zeroExp', 'rpt.n.firstJob'],
    tier: 'free',
    toAnswer: (b: number) => (b ? TOTAL_EXP[b] : undefined),
    q: {
      title: l('Total experience in this occupation?', '做这个职业一共多久了?(含海外)', '이 직종 총 경력은?(해외 포함)'),
      choices: [
        { value: 1, text: l('None', '没有', '없음') },
        { value: 2, text: l('Under 1 year', '不到 1 年', '1년 미만') },
        { value: 3, text: l('1-3 years', '1-3 年', '1-3년') },
        { value: 4, text: l('3-5 years', '3-5 年', '3-5년') },
        { value: 5, text: l('5+ years', '5 年以上', '5년 이상') },
      ],
    },
  },
  // 英语:门槛建模(L2-04/05 的 BC 20 条 + ON 11 条)与换省对照(L2-08)落地后,
  // 它已经真的驱动结论 —— 原先「只驱动完整度」那行注释同批销账。
  clbBand: {
    engineKey: 'clb',
    unlocks: ['rpt.g.basics', 'rpt.s.cur'],
    tier: 'free',
    toAnswer: (b: number) => CLB[b] || undefined,
    q: {
      title: l('Your official language level (CLB)?', '你的语言成绩到 CLB 几?', '공인 언어 점수(CLB)는?'),
      choices: [
        { value: 1, text: l('Not tested yet', '还没考', '시험 전') },
        { value: 2, text: l('CLB 4-5', 'CLB 4-5', 'CLB 4-5') },
        { value: 3, text: l('CLB 6-7', 'CLB 6-7', 'CLB 6-7') },
        { value: 4, text: l('CLB 8-9', 'CLB 8-9', 'CLB 8-9') },
        { value: 5, text: l('CLB 10 or higher', 'CLB 10 以上', 'CLB 10 이상') },
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
      // 「其中」是真的其中:加拿大经验选不出比总经验更长的档(2026-08-02 实撞 —— 总经验答「没有」、
      // 加拿大答「2 年以上」,引擎取大的那个,句子写成「你填的 30 个月」,看着就像胡说)。
      // 两套档位序号天然对齐(0/6/18/30 对 0/6/24/48/60),所以比一下序号就够,不写换算表。
      choiceVisible: (a, v) => !a.totalExpBand || v <= a.totalExpBand,
      // 紧跟在总经验那道题后面问 → 题干写「其中」,一眼看出是子集(全称在一屏里重复一遍是废话)
      title: l('Of that, how long in Canada?', '其中在加拿大多久?', '그중 캐나다에서는?'),
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
      title: l('Target province?', '目标省?', '희망 주?'),
      choices: [
        { value: 1, text: l('BC', 'BC', 'BC') },
        { value: 2, text: l('Ontario', '安省', '온타리오') },
        { value: 3, text: l('Prairies', '草原三省', '프레리 3주') },
        { value: 5, text: l('Atlantic', '海洋四省', '애틀랜틱 4주') },
        { value: 4, text: l('Show me what is reachable', '先看哪个够得着', '가능한 곳부터 보기') },
      ],
    },
  },
  // 诉求(2026-08-03 Frank:「肯定是容易拿 PR 啊」→「如果不拿 PR 肯定去岗位多的啊」→「每个人诉求不一样」)。
  // 选省份的排序目标本来被助手写死过两版(先按岗位量、后按难度),两版都错 —— 排序该由用户的诉求定。
  // 一道题定一个目标函数:拿 PR = 按「容易拿提名」排;先找工作 = 按在招量排。两者都给对方那条当提示。
  goalBand: {
    engineKey: 'goal',
    unlocks: ['rpt.p.best', 'rpt.p.mostJobs'],
    tier: 'free',
    toAnswer: (b: number) => (b === 1 ? 'pr' : b === 2 ? 'work' : undefined),
    q: {
      title: l('What matters more right now?', '你现在更看重哪个?', '지금 무엇이 더 중요한가요?'),
      choices: [
        { value: 1, text: l('Getting nominated (PR)', '容易拿身份(省提名)', '영주권(주정부 지명)') },
        { value: 2, text: l('Finding a job first', '先找到工作', '우선 취업') },
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
      title: l('Do you have a job offer in hand?', '手上有 offer 吗?', '받은 잡오퍼가 있나요?'),
      choices: [
        { value: 1, text: l('Yes', '有', '있음') },
        { value: 2, text: l('In interviews', '面试中', '면접 중') },
        { value: 3, text: l('No', '没有', '없음') },
        { value: 4, text: l('Self-employed', '自雇', '자영업') },
      ],
    },
  },
  // 门槛清单三类闸之一(2026-08-12,设计 docs/design/通道判定口径根治-20260812.md §3.3):
  // 「有没有加拿大学历」是好几条通道的硬闸(NL 国际毕业生要 PGWP、PGWP 的前提就是加拿大院校毕业)。
  // 不问就只能落「判不了」—— 而不问却当成「没有障碍」,正是把从没来过加拿大的人推荐去走
  // 「国际毕业生」通道的那个病。第三类闸「人在不在境内」不另开题:既有的「你现在的情况」已经分开了。
  canadaEduBand: {
    engineKey: 'canadaStudy',
    unlocks: ['rpt.g.basics'],
    tier: 'free',
    toAnswer: (b: number) => (b ? b === 1 : undefined),
    q: {
      title: l('Do you have a Canadian credential?', '你有加拿大的学历吗?', '캐나다 학력이 있나요?'),
      choices: [
        { value: 1, text: l('Yes', '有', '있음') },
        { value: 2, text: l('No', '没有', '없음') },
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
      title: l('How long is left on your permit?', '你的签证还剩多久?', '비자 잔여 기간은?'),
      choices: [
        { value: 1, text: l('Under 6 months', '不到 6 个月', '6개월 미만') },
        { value: 2, text: l('6-12 months', '6-12 个月', '6-12개월') },
        { value: 3, text: l('1-2 years', '1-2 年', '1-2년') },
        { value: 4, text: l('2+ years', '2 年以上', '2년 이상') },
      ],
    },
  },
  // ── B1-4 PGWP(20260803,Frank 拍板只加两道;探索批 2)──────────────────────
  // 「读书 vs 直接工作」的官方算术:课程时长档 + 层级 → 毕业后 PGWP 几个月(规则行 quote-anchored,
  // 见 etl/build_pgwp.py)。档取下界(同 CLB/经验口径);「不到 8 个月」给 4 只为让引擎判「不足 8 个月无 PGWP」。
  studyMonthsBand: {
    engineKey: 'studyMonths',
    unlocks: ['rpt.c.pgwpLen', 'rpt.c.pgwpCombine'],
    tier: 'free',
    toAnswer: (b: number) => (b ? STUDY_MONTHS[b] : undefined),
    q: {
      title: l('How long is the program you plan to take (or are in)?', '计划读(或在读)的课程有多长?', '계획 중(재학 중)인 과정 길이는?'),
      choices: [
        { value: 1, text: l('Under 8 months', '不到 8 个月', '8개월 미만') },
        { value: 2, text: l('8 months - 1 year', '8 个月-1 年', '8개월-1년') },
        { value: 3, text: l('1-2 years', '1-2 年', '1-2년') },
        { value: 4, text: l('2 years or more', '2 年及以上', '2년 이상') },
      ],
    },
  },
  studyLevelBand: {
    engineKey: 'studyLevel',
    unlocks: ['rpt.c.pgwpLen', 'rpt.c.pgwpLang'],
    tier: 'free',
    toAnswer: (b: number) => STUDY_LEVEL[b] || undefined,
    q: {
      title: l('What level is that program?', '这个课程是什么层级?', '그 과정의 학위 수준은?'),
      choices: [
        { value: 1, text: l('College cert / diploma / post-grad cert', '大专文凭、证书或研文', '컬리지 수료증·디플로마') },
        { value: 2, text: l('Bachelor', '本科', '학사') },
        { value: 3, text: l('Master', '硕士', '석사') },
        { value: 4, text: l('Doctorate', '博士', '박사') },
      ],
    },
  },
}

// 目标省的两种表示(三问存省份数组、答题存档位)必须互推,否则「问过的不再问」是假的
export const provsFromBand = (b: number): string[] => PROVS[b] ?? []
export const bandFromProvs = (provs: string[] | undefined): number =>
  !provs?.length ? 0 : provs.length === 1 && provs[0] === 'BC' ? 1 : provs.length === 1 && provs[0] === 'ON' ? 2 : 4
