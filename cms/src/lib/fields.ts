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
  /** 题级显隐(2026-08-15 拆闸批新增,此前只有选项级过滤):不该问的人不见这道题,
   *  完整度计数同源过滤 —— 境外用户没有「持什么许可/人在哪个省」可答,摆着=逼他乱答。 */
  visible?: (a: Answers) => boolean
}

const l = (en: string, zh: string, ko: string): L => ({ default: en, 'zh-cn': zh, ko })

// 档 → 引擎输入(原先散在 PlanPrView 顶部的五张表,收拢到字段自己身上)
// 语言:问**实测档位**,不问自评(2026-08-02 Frank「我选的是英语流利,为什么显示 CLB 9」)——
// 「初级/中级/流利 → CLB 5/7/9」那套映射是本站编的,报告却写成「你报的 CLB 9」= 替他填了个他没说过的数;
// 而且自评偏乐观(自认流利常是 CLB 7),门槛判定会因此说「达标」而实际不达标。取每档**下界**,宁可低报。
// 「不清楚」的统一档位值(2026-08-12 Frank「每个选项都应该给一个不清楚的」)。
// 它是**答过的**(计数与 missingFields 认它),但 toAnswer 一律回 undefined —— 引擎拿 null
// 落「判不了」,而不是被折成某个他没说过的答案。三值折叠里的 unknown 就该由用户显式说得出口。
export const UNSURE_BAND = 9

// 精确档(2026-08-13 语言合一:基础卷直接问精确 CLB,官方分值表不再追问第二遍)。
// index = 选项 value;1「还没考」= 没有分,不传。**不用 CLB 数字当 value**:9 会撞 UNSURE_BAND。
// export:估分段推导双语加分(PnpScoreCard #305)按同一把梯子读英语档,不许另抄一份。
export const CLB = [0, 0, 4, 5, 6, 7, 8, 9, 10]
const EXP = [0, 0, 6, 18, 30]          // a1「没有」= 0 个月,是答案不是缺答
// a4「先看哪个够得着」= 不限省。**海洋四省挂 5 不挂 4**:4 已经在生产用了,改它的含义会把
// 已存档案里的「不限省」静默变成「海洋四省」(2026-08-03 加这一档时的取舍——显示顺序看 choices 数组,与值无关)。
export const PROVS: string[][] = [[], ['BC'], ['ON'], ['AB', 'SK', 'MB'], [], ['NS', 'NB', 'PE', 'NL']]
const CRS = [0, 0, 380, 425, 480]      // a1「没算过」= 不传,引擎照旧出「没填 CRS」
const PGWP = [0, 4, 9, 18, 30]
// 官方分值表要的三样(题库扩充 20260802):学历阶梯 / 年龄取区间中点 / 同职业总经验(含海外)
const EDU = ['', 'highschool', 'diploma2y', 'bachelor', 'master', 'doctorate']
const AGE = [0, 23, 28, 33, 38, 43]
// 精确档(2026-08-14 经验合一,与语言同批):index=选项 value;「没有」=0 个月,是答案不是缺答。
// 月数取整年 ×12(不到 1 年沿用 6):旧区间档迁移按旧月数对齐(见 answers.ts BANDS_V2)
const TOTAL_EXP = [0, 0, 6, 12, 24, 36, 48, 60]
// B1-4 PGWP:课程时长档下界 / 层级(引擎只对 master 有特例,其余按时长档)
const STUDY_MONTHS = [0, 4, 8, 12, 24]
const STUDY_LEVEL = ['', 'college', 'bachelor', 'master', 'doctorate']
// 学制年数档(2026-08-15 #316):index=选项 value → 整年数。「不到 1 年」= 0 整年,是答案不是缺答;
// 档取下界(同 CLB/经验口径)。四档而不是三档:消费端的阈值有 ≥1 / ≥2 / ≥3 三道
// (crsEstimate 学习加分 1 年与 3 年分档;pathVerdict/ mbEoiEstimate 要 ≥2、≥3),并成「1 年及以下」
// 就得在 0 和 1 之间替他挑一头 —— 拆开就不用猜。
const EDU_YEARS = [0, 0, 1, 2, 3]
// statusInCanada 拆闸(2026-08-15):许可类型档。学签在读不问(处境题已说明持学签),
// 境外不问(没有加拿大许可可答)—— 见各题 visible。
const PERMIT = ['', 'study', 'pgwp', 'work', 'none']
const inCanada = (a: Answers) => ['studying', 'working', 'jobhunting'].includes(a.status)

export const FIELDS: Record<string, FieldDef> = {
  // 处境:决定签证题算不算数(境外没有加拿大签证),并计入基本题完整度
  status: {
    engineKey: 'currentStatus',
    unlocks: ['rpt.c.window', 'rpt.g.basics'],
    tier: 'free',
    // 'unsure' → undefined:引擎拿 null 落「判不了」,不替他猜(2026-08-12 Frank「每个选项都应该给一个不清楚的」)
    toAnswer: (v: string) => (v && v !== 'unsure' ? v : undefined),
    q: {
      title: l('Where are you today?', '你现在的情况?', '현재 상황은?'),
      choices: [
        { value: 'overseas', text: l('Outside Canada, planning the move', '还在境外,想来加拿大工作', '해외에서 캐나다 취업 준비 중') },
        { value: 'studying', text: l('Studying in Canada', '在加拿大读书', '캐나다에서 유학 중') },
        { value: 'working', text: l('Working in Canada', '已经在加拿大工作', '캐나다에서 근무 중') },
        { value: 'jobhunting', text: l('In Canada, job hunting', '在加拿大找工作', '캐나다에서 구직 중') },
        { value: 'unsure', text: l('Not sure', '不清楚', '잘 모르겠음') },
      ],
    },
  },
  // 持的许可(2026-08-15 statusInCanada 拆闸):AB/PE 的闸是**有效工签**、NL 指名 **PGWP** ——
  // 「人在境内」答不了这两道闸(学签在读曾因此被 AB 放行)。学签在读不问(处境题已说明),
  // 境外不问;「在工作」的人这题分出 PGWP/其他工签,「在找工作」的人分出还有没有许可。
  permitBand: {
    engineKey: 'permit',
    unlocks: ['rpt.g.basics'],
    tier: 'free',
    visible: (a) => a.status === 'working' || a.status === 'jobhunting',
    toAnswer: (b: number, all) => (inCanada(all) && b && b !== UNSURE_BAND ? PERMIT[b] : undefined),
    q: {
      title: l('What permit are you on now?', '你现在持什么许可?', '지금 어떤 허가로 체류 중인가요?'),
      choices: [
        { value: 2, text: l('PGWP', '毕业工签 PGWP', 'PGWP(졸업 후 취업 허가)') },
        { value: 3, text: l('Other work permit', '其他工签', '기타 취업 허가') },
        { value: 1, text: l('Study permit', '学签', '학업 허가') },
        { value: 4, text: l('Visitor or no permit', '访客或没有许可', '방문자·허가 없음') },
        { value: 9, text: l('Not sure', '不清楚', '잘 모르겠음') },
      ],
    },
  },
  // 现居省(2026-08-15 statusInCanada 拆闸):NB 的闸是「在新省住满 6 个月」、MB 是「在曼省在职」——
  // 目标省答不了「你人在哪」(在安省问曼省的人不是曼省居民)。境外不问;领地并作一档。
  resProv: {
    engineKey: 'residenceProvince',
    unlocks: ['rpt.g.basics'],
    tier: 'free',
    visible: inCanada,
    toAnswer: (v: string, all) => (inCanada(all) && v ? v : undefined),
    q: {
      title: l('Which province are you in now?', '你现在人在哪个省?', '지금 어느 주에 있나요?'),
      choices: [
        { value: 'ON', text: l('Ontario', '安省 Ontario', '온타리오') },
        { value: 'BC', text: l('British Columbia', 'BC 不列颠哥伦比亚', '브리티시컬럼비아') },
        { value: 'AB', text: l('Alberta', '阿省 Alberta', '앨버타') },
        { value: 'QC', text: l('Quebec', '魁省 Quebec', '퀘벡') },
        { value: 'MB', text: l('Manitoba', '曼省 Manitoba', '매니토바') },
        { value: 'SK', text: l('Saskatchewan', '萨省 Saskatchewan', '서스캐처원') },
        { value: 'NS', text: l('Nova Scotia', '新斯科舍 Nova Scotia', '노바스코샤') },
        { value: 'NB', text: l('New Brunswick', '新不伦瑞克 New Brunswick', '뉴브런즈윅') },
        { value: 'NL', text: l('Newfoundland and Labrador', '纽芬兰 Newfoundland', '뉴펀들랜드') },
        { value: 'PE', text: l('Prince Edward Island', '爱德华王子岛 PEI', '프린스에드워드아일랜드') },
        { value: 'TERR', text: l('Territories', '三个领地 Territories', '준주 지역') },
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
    toAnswer: (b: number) => (b && b !== UNSURE_BAND ? TOTAL_EXP[b] : undefined),
    q: {
      title: l('Total experience in this occupation?', '做这个职业一共多久了?(含海外)', '이 직종 총 경력은?(해외 포함)'),
      // 2026-08-14 经验合一(与语言同批,Frank「怎么有两个」同款病):原来问区间(1-3/3-5 年),
      // 官方分值表按整年给分,分值段还得追问精确年数。改成一步问整年,追问题自动消失
      //(SK 这类按「近 5 年/6-10 年」拆段的省仍要拆段追问,那不是重复,是官方口径不同)。
      choices: [
        { value: 1, text: l('None', '没有', '없음') },
        { value: 2, text: l('Under 1 year', '不到 1 年', '1년 미만') },
        { value: 3, text: l('1 year', '1 年', '1년') },
        { value: 4, text: l('2 years', '2 年', '2년') },
        { value: 5, text: l('3 years', '3 年', '3년') },
        { value: 6, text: l('4 years', '4 年', '4년') },
        { value: 7, text: l('5+ years', '5 年以上', '5년 이상') },
        { value: 9, text: l('Not sure', '不清楚', '잘 모르겠음') },
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
      // 2026-08-13 语言合一(Frank 连点两次「怎么有两个语言」):原来这题问区间(4-5/6-7…),
      // 官方分值表按精确档给分,于是分值段还得在区间里再问一遍 —— 同一件事问两遍。
      // 改成一步问精确档,分值段的语言题因「范围只剩一个值」自动消失(PnpScoreCard 既有机制)。
      choices: [
        { value: 1, text: l('Not tested yet', '还没考', '시험 전') },
        { value: 2, text: l('CLB 4', 'CLB 4', 'CLB 4') },
        { value: 3, text: l('CLB 5', 'CLB 5', 'CLB 5') },
        { value: 4, text: l('CLB 6', 'CLB 6', 'CLB 6') },
        { value: 5, text: l('CLB 7', 'CLB 7', 'CLB 7') },
        { value: 6, text: l('CLB 8', 'CLB 8', 'CLB 8') },
        { value: 7, text: l('CLB 9', 'CLB 9', 'CLB 9') },
        { value: 8, text: l('CLB 10 or higher', 'CLB 10 以上', 'CLB 10 이상') },
      ],
    },
  },
  // 加拿大经验:够 12 个月出 rpt.c.expOk,不够出 rpt.g.expShort(缺口免费)
  expBand: {
    engineKey: 'canadianExpMonths',
    unlocks: ['rpt.c.expOk', 'rpt.g.expShort'],
    tier: 'free',
    toAnswer: (b: number) => (b && b !== UNSURE_BAND ? EXP[b] : undefined),
    q: {
      // 「其中」是真的其中:加拿大经验选不出比总经验更长的档(2026-08-02 实撞 —— 总经验答「没有」、
      // 加拿大答「2 年以上」,引擎取大的那个,句子写成「你填的 30 个月」,看着就像胡说)。
      // 2026-08-14 起总经验是精确档,两套序号不再对齐 —— 改按**月数**比(总经验「不清楚」不设限)。
      choiceVisible: (a, v) => !a.totalExpBand || a.totalExpBand === UNSURE_BAND
        || (EXP[v as number] ?? 0) <= (TOTAL_EXP[a.totalExpBand] ?? 999),
      // 紧跟在总经验那道题后面问 → 题干写「其中」,一眼看出是子集(全称在一屏里重复一遍是废话)
      title: l('Of that, how long in Canada?', '其中在加拿大多久?', '그중 캐나다에서는?'),
      choices: [
        { value: 1, text: l('None', '没有', '없음') },
        { value: 2, text: l('Under 1 year', '不到 1 年', '1년 미만') },
        { value: 3, text: l('1-2 years', '1-2 年', '1-2년') },
        { value: 4, text: l('2+ years', '2 年以上', '2년 이상') },
        { value: 9, text: l('Not sure', '不清楚', '잘 모르겠음') },
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
    toAnswer: (b: number) => (b && b !== UNSURE_BAND ? b === 1 : undefined),
    q: {
      title: l('Do you have a job offer in hand?', '手上有 offer 吗?', '받은 잡오퍼가 있나요?'),
      choices: [
        { value: 1, text: l('Yes', '有', '있음') },
        { value: 2, text: l('In interviews', '面试中', '면접 중') },
        { value: 3, text: l('No', '没有', '없음') },
        { value: 4, text: l('Self-employed', '自雇', '자영업') },
        { value: 9, text: l('Not sure', '不清楚', '잘 모르겠음') },
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
    toAnswer: (b: number) => (b && b !== UNSURE_BAND ? b === 1 : undefined),
    q: {
      title: l('Do you have a Canadian credential?', '你有加拿大的学历吗?', '캐나다 학력이 있나요?'),
      choices: [
        { value: 1, text: l('Yes', '有', '있음') },
        { value: 2, text: l('No', '没有', '없음') },
        { value: 9, text: l('Not sure', '不清楚', '잘 모르겠음') },
      ],
    },
  },
  // 专业对口(2026-08-15 Frank「毕业生干厨师靠谱吗?跨专业了怎么弄」→「加」):NL 国际毕业生
  // 官方要求岗位与所学专业相关。只问有加拿大学历的人 —— 没有加拿大学历的,这条通道早被学历闸挡住了,
  // 再问一遍专业是浪费一屏。
  fieldMatchBand: {
    engineKey: 'fieldMatch',
    unlocks: ['rpt.g.basics'],
    tier: 'free',
    visible: (a) => a.canadaEduBand === 1,
    toAnswer: (b: number, all) => (all.canadaEduBand === 1 && b && b !== UNSURE_BAND ? b === 1 : undefined),
    q: {
      title: l('Is your Canadian credential in the same field as this job?',
        '你的加拿大学历专业与这个职业对口吗?', '캐나다 학력 전공이 이 직종과 맞나요?'),
      choices: [
        { value: 1, text: l('Yes, same field', '对口', '전공과 일치') },
        { value: 2, text: l('No, different field', '不对口(跨专业)', '전공과 다름') },
        { value: 9, text: l('Not sure', '不清楚', '잘 모르겠음') },
      ],
    },
  },
  // 学历所在省(同批):NL 只给本省院校(Memorial / College of the North Atlantic)留了不对口的口子,
  // 省外院校反而更严。这道题还同时喂两条既有官方条款 —— MB「外省院校毕业要 12 个月经验」、
  // ON「近 3 年安省院校毕业只要 3 个月」,先前恒缺槽判不了。
  eduProv: {
    engineKey: 'studyProvince',
    unlocks: ['rpt.s.cur', 'rpt.g.basics'],
    tier: 'free',
    visible: (a) => a.canadaEduBand === 1,
    toAnswer: (v: string, all) => (all.canadaEduBand === 1 && v ? v : undefined),
    q: {
      title: l('Where did you study in Canada?', '你的加拿大学历在哪个省读的?', '캐나다 학력은 어느 주에서 취득했나요?'),
      choices: [
        { value: 'ON', text: l('Ontario', '安省 Ontario', '온타리오') },
        { value: 'BC', text: l('British Columbia', 'BC 不列颠哥伦比亚', '브리티시컬럼비아') },
        { value: 'AB', text: l('Alberta', '阿省 Alberta', '앨버타') },
        { value: 'QC', text: l('Quebec', '魁省 Quebec', '퀘벡') },
        { value: 'MB', text: l('Manitoba', '曼省 Manitoba', '매니토바') },
        { value: 'SK', text: l('Saskatchewan', '萨省 Saskatchewan', '서스캐처원') },
        { value: 'NS', text: l('Nova Scotia', '新斯科舍 Nova Scotia', '노바스코샤') },
        { value: 'NB', text: l('New Brunswick', '新不伦瑞克 New Brunswick', '뉴브런즈윅') },
        { value: 'NL', text: l('Newfoundland and Labrador', '纽芬兰 Newfoundland', '뉴펀들랜드') },
        { value: 'PE', text: l('Prince Edward Island', '爱德华王子岛 PEI', '프린스에드워드아일랜드') },
        { value: 'TERR', text: l('Territories', '三个领地 Territories', '준주 지역') },
      ],
    },
  },
  // 学制年数(2026-08-15 #316):全站此前从没问过,后果是三处官方条款恒判不了 ——
  // ON「近 3 年安省院校毕业只要 3 个月经验」那行要 ≥2 年学制才适用(pathVerdict conditionHolds),
  // MB 学历分按 1/2/3+ 年分档(pathVerdict mbEduOf、mbEoiEstimate mbEduYears),
  // CRS 加拿大学习加分分 1-2 年与 3 年+ 两档(crsEstimate)。消费端全按**年**收,这里给整年数。
  // 只问有加拿大学历的人(与 fieldMatchBand/eduProv 同闸):海外学历不喂这三处条款,问了挂不上结论。
  eduYearsBand: {
    engineKey: 'eduYears',
    unlocks: ['rpt.g.basics'],
    tier: 'free',
    visible: (a) => a.canadaEduBand === 1,
    toAnswer: (b: number, all) => (all.canadaEduBand === 1 && b && b !== UNSURE_BAND ? EDU_YEARS[b] : undefined),
    q: {
      title: l('How long was that program?', '这个学历的学制几年?', '그 과정은 몇 년제인가요?'),
      choices: [
        { value: 1, text: l('Under 1 year', '不到 1 年', '1년 미만') },
        { value: 2, text: l('1 year', '1 年', '1년') },
        { value: 3, text: l('2 years', '2 年', '2년') },
        { value: 4, text: l('3 years or more', '3 年及以上', '3년 이상') },
        { value: 9, text: l('Not sure', '不清楚', '잘 모르겠음') },
      ],
    },
  },
  // 法语(2026-08-15 Frank「需要加法语问题」):FCIP 要 **NCLC 5 四项**,而且是法语。
  // 站里那道语言题问的是 CLB —— 英语的尺子,拿它折算 NCLC 就是替他编一个法语成绩。
  // 所以直接问「达没达到官方那条线」:门槛数值留在官方原句里(策略文件的 quote),这里只收是/否。
  // 全员都问:「不会法语」是一秒钟就能点掉的出口,而漏问的代价是把不会法语的人推荐去法语社区。
  frenchBand: {
    engineKey: 'frenchOk',
    unlocks: ['rpt.g.basics'],
    tier: 'free',
    toAnswer: (b: number) => (b && b !== UNSURE_BAND ? b === 1 : undefined),
    q: {
      title: l('Is your French at NCLC 5 or above in all four abilities?',
        '你的法语四项都到 NCLC 5 了吗?', '프랑스어 4개 영역이 모두 NCLC 5 이상인가요?'),
      choices: [
        { value: 2, text: l('No French / below that', '不会法语或没到', '프랑스어 미보유·미달') },
        { value: 1, text: l('Yes, NCLC 5 or above', '是,四项都到了', '예, 모두 충족') },
        { value: 9, text: l('Not sure', '不清楚', '잘 모르겠음') },
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
