/**
 * 外部原料 → 本域事实行的构造器 + 字段库本体。
 * 三类映射都在这:① 档位 → 引擎输入(一题一个 *Answer 换算,值级清洗的家);
 * ② 旧档/服务端档 → 全字段对齐的 Answers/ScoreAnswers(normalize 一族);
 * ③ 全卷 → 引擎入参(toEngineAnswers)。体内只许词汇表 + 纯拼装;
 * 真会抛的 JSON.parse 与 localStorage I/O 归 functions.ts 的接缝函数。
 *
 * 字段库(FIELDS)也住这:题面是数据、换算是行映射,一题一行放一起,
 * 拆开就得靠名字对齐两张表(设计:docs/design/统一题库与付费面-20260731.md §1/§3)。
 * 铁律:挂不上任何结论的字段不入库。
 * 2026-08-03:题面原先是 SurveyJS 的题 JSON(type/name/isRequired 全是给框架看的),
 * 撤掉框架后收成本站自己的最小形状 —— 全部是必答单选,类型与必答不用逐题再声明一遍。
 *
 * @author Frank
 * @time 2026-08-18 04:36:46
 */
import {
  AGE, CLB, CLB_V2_MAP, CRS, EDU, EDU_YEARS, EXP, FRENCH_V2_MAP, IN_CANADA, NCLC, PERMIT,
  PGWP, PROVS, STUDY_LEVEL, STUDY_MONTHS, TOTAL_EXP, TOTAL_V2_MAP, UNSURE_BAND,
} from './constants'
import type {
  Answers, BandValue, EngineAnswers, EngineValue, FieldDef, L, MaybeProvList, ProvList, RawAnswersSource,
  RawCell, RawDoc, RawField, RawScoreSource, ScoreAnswers,
} from './types'

/**
 * 档里的一格 → 数字(不是有限数字给 0)。
 *
 * @param v 原料格。
 * @returns 数字。
 */
export function num(v: RawField): number {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v
  }
  return 0
}

/**
 * 档里的一格 → 字符串数组(不是数组给空;数组里只留字符串)。
 *
 * @param v 原料格。
 * @returns 字符串数组。
 */
export function arr(v: RawField): ProvList {
  if (Array.isArray(v)) {
    return v.filter(isStr)
  }
  return []
}

/**
 * 档里的一格 → 字符串(不是字符串给空串)。
 *
 * @param v 原料格。
 * @returns 字符串。
 */
export function str(v: RawField): string {
  if (typeof v === 'string') {
    return v
  }
  return ''
}

/**
 * 档里的一格 → 对象(不是对象给空对象)。
 *
 * @param v 原料格。
 * @returns 对象。
 */
export function rec(v: RawField): RawDoc {
  if (v != null && typeof v === 'object' && Array.isArray(v) === false) {
    return v as RawDoc
  }
  return {}
}

/**
 * 数组过滤用的字符串判定(filter 传具名函数)。
 *
 * @param x 数组一格。
 * @returns 是字符串 true。
 */
function isStr(x: RawCell): x is string {
  return typeof x === 'string'
}

/**
 * 三语文本的紧凑构造(题面表逐行调用,摆开写会把整张表撑到三倍)。
 *
 * @param en 英文。
 * @param zh 中文。
 * @param ko 韩文。
 * @returns 三语对象。
 */
// eslint-disable-next-line local/one-parameter -- 三语构造:题面表逐行调用,(en, zh, ko) 三参就是它的人体工学
function l(en: string, zh: string, ko: string): L {
  return { zh, en, ko }
}

/**
 * 人在不在加拿大境内(境内三种处境;permitBand/resProv 的题级显隐都用它)。
 *
 * @param a 全卷答案。
 * @returns 境内 true。
 */
export function inCanada(a: Answers): boolean {
  return IN_CANADA.includes(a.status)
}

/**
 * 档位数字收窄(BandValue 可能是省码字符串;数字题的换算先过这一格)。
 *
 * @param v 选项值。
 * @returns 数字档;不是数字给 0。
 */
function band(v: BandValue): number {
  if (typeof v === 'number') {
    return v
  }
  return 0
}

/**
 * 处境:'unsure' → undefined,引擎拿 null 落「判不了」,不替他猜
 * (2026-08-12 Frank「每个选项都应该给一个不清楚的」)。
 *
 * @param v 处境码。
 * @returns 引擎处境;不清楚不传。
 */
function statusAnswer(v: BandValue): EngineValue {
  if (typeof v === 'string' && v !== '' && v !== 'unsure') {
    return v
  }
  return undefined
}

/**
 * 许可档 → 许可码(境外不传;不清楚不传)。
 *
 * @param v 档位。
 * @param all 全卷答案。
 * @returns 许可码或不传。
 */
// eslint-disable-next-line local/one-parameter -- FieldDef.toAnswer 的形状定死两参(见 types.ts 的特批)
function permitAnswer(v: BandValue, all: Answers): EngineValue {
  const b = band(v)
  if (inCanada(all) && b !== 0 && b !== UNSURE_BAND) {
    return PERMIT[b]
  }
  return undefined
}

/**
 * 现居省(境外不传)。
 *
 * @param v 省码。
 * @param all 全卷答案。
 * @returns 省码或不传。
 */
// eslint-disable-next-line local/one-parameter -- 同 permitAnswer:toAnswer 契约两参
function resProvAnswer(v: BandValue, all: Answers): EngineValue {
  if (inCanada(all) && typeof v === 'string' && v !== '') {
    return v
  }
  return undefined
}

/**
 * 学历档 → 学历码(0 档/超界不传)。
 *
 * @param v 档位。
 * @returns 学历码或不传。
 */
function eduAnswer(v: BandValue): EngineValue {
  return EDU[band(v)] || undefined
}

/**
 * 年龄档 → 区间中点(0 档不传)。
 *
 * @param v 档位。
 * @returns 年龄或不传。
 */
function ageAnswer(v: BandValue): EngineValue {
  return AGE[band(v)] || undefined
}

/**
 * 总经验档 → 月数(不清楚不传;「没有」= 0 是答案)。
 *
 * @param v 档位。
 * @returns 月数或不传。
 */
function totalExpAnswer(v: BandValue): EngineValue {
  const b = band(v)
  if (b !== 0 && b !== UNSURE_BAND) {
    return TOTAL_EXP[b]
  }
  return undefined
}

/**
 * 英语档 → CLB(「还没考」不传)。
 *
 * @param v 档位。
 * @returns CLB 或不传。
 */
function clbAnswer(v: BandValue): EngineValue {
  return CLB[band(v)] || undefined
}

/**
 * 加拿大经验档 → 月数(不清楚不传)。
 *
 * @param v 档位。
 * @returns 月数或不传。
 */
function expAnswer(v: BandValue): EngineValue {
  const b = band(v)
  if (b !== 0 && b !== UNSURE_BAND) {
    return EXP[b]
  }
  return undefined
}

/**
 * 加拿大经验的选项过滤:「其中」是真的其中 —— 加拿大经验选不出比总经验更长的档
 * (2026-08-02 实撞:总经验答「没有」、加拿大答「2 年以上」,引擎取大的那个,句子写成
 * 「你填的 30 个月」,看着就像胡说)。2026-08-14 起总经验是精确档,两套序号不再对齐 ——
 * 改按**月数**比(总经验「不清楚」不设限)。
 *
 * @param a 全卷答案。
 * @param v 候选档位。
 * @returns 该选项可见 true。
 */
// eslint-disable-next-line local/one-parameter -- FieldDef.choiceVisible 的形状定死两参(见 types.ts 的特批)
function expChoiceVisible(a: Answers, v: BandValue): boolean {
  if (a.totalExpBand === 0 || a.totalExpBand === UNSURE_BAND) {
    return true
  }
  let cand = 0
  const e = EXP[band(v)]
  if (e != null) {
    cand = e
  }
  let cap = 999
  const t = TOTAL_EXP[a.totalExpBand]
  if (t != null) {
    cap = t
  }
  return cand <= cap
}

/**
 * 目标省档 → 省码组(超界给空 = 不限省)。
 *
 * @param v 档位。
 * @returns 省码组。
 */
function provAnswer(v: BandValue): EngineValue {
  const hit = PROVS[band(v)]
  if (hit != null) {
    return hit
  }
  return []
}

/**
 * 诉求档 → 目标函数码。
 *
 * @param v 档位。
 * @returns 'pr' / 'work' 或不传。
 */
function goalAnswer(v: BandValue): EngineValue {
  const b = band(v)
  if (b === 1) {
    return 'pr'
  }
  if (b === 2) {
    return 'work'
  }
  return undefined
}

/**
 * offer 档 → 有无 offer(「面试中/自雇」都按「还没有」算,不含糊;不清楚不传)。
 *
 * @param v 档位。
 * @returns 布尔或不传。
 */
function offerAnswer(v: BandValue): EngineValue {
  const b = band(v)
  if (b !== 0 && b !== UNSURE_BAND) {
    return b === 1
  }
  return undefined
}

/**
 * 有无加拿大学历(不清楚不传)。
 *
 * @param v 档位。
 * @returns 布尔或不传。
 */
function canadaEduAnswer(v: BandValue): EngineValue {
  const b = band(v)
  if (b !== 0 && b !== UNSURE_BAND) {
    return b === 1
  }
  return undefined
}

/**
 * 有加拿大学历的人才见的题(fieldMatchBand/eduProv/eduYearsBand 三题同闸)。
 *
 * @param a 全卷答案。
 * @returns 可见 true。
 */
function hasCanadaEdu(a: Answers): boolean {
  return a.canadaEduBand === 1
}

/**
 * 专业对口档 → 布尔(只对有加拿大学历的人传;不清楚不传)。
 *
 * @param v 档位。
 * @param all 全卷答案。
 * @returns 布尔或不传。
 */
// eslint-disable-next-line local/one-parameter -- 同 permitAnswer:toAnswer 契约两参
function fieldMatchAnswer(v: BandValue, all: Answers): EngineValue {
  const b = band(v)
  if (all.canadaEduBand === 1 && b !== 0 && b !== UNSURE_BAND) {
    return b === 1
  }
  return undefined
}

/**
 * 学历所在省(只对有加拿大学历的人传)。
 *
 * @param v 省码。
 * @param all 全卷答案。
 * @returns 省码或不传。
 */
// eslint-disable-next-line local/one-parameter -- 同 permitAnswer:toAnswer 契约两参
function eduProvAnswer(v: BandValue, all: Answers): EngineValue {
  if (all.canadaEduBand === 1 && typeof v === 'string' && v !== '') {
    return v
  }
  return undefined
}

/**
 * 学制年数档 → 整年数(只对有加拿大学历的人传;不清楚不传)。
 *
 * @param v 档位。
 * @param all 全卷答案。
 * @returns 整年数或不传。
 */
// eslint-disable-next-line local/one-parameter -- 同 permitAnswer:toAnswer 契约两参
function eduYearsAnswer(v: BandValue, all: Answers): EngineValue {
  const b = band(v)
  if (all.canadaEduBand === 1 && b !== 0 && b !== UNSURE_BAND) {
    return EDU_YEARS[b]
  }
  return undefined
}

/**
 * 法语档 → 「够不够 NCLC 5」:≥5 为 true;不会/NCLC 4 为 false;不清楚不传(判不了)。
 *
 * @param v 档位。
 * @returns 布尔或不传。
 */
function frenchAnswer(v: BandValue): EngineValue {
  const b = band(v)
  if (b === UNSURE_BAND) {
    return undefined
  }
  if (b >= 1) {
    return NCLC[b] >= 5
  }
  return undefined
}

/**
 * CRS 档 → 分数下界(「没算过」不传)。
 *
 * @param v 档位。
 * @returns 分数或不传。
 */
function crsAnswer(v: BandValue): EngineValue {
  return CRS[band(v)] || undefined
}

/**
 * 签证剩余档 → 月数。境外不传:没有加拿大签证,拿档位造时间窗=编数。
 *
 * @param v 档位。
 * @param all 全卷答案。
 * @returns 月数或不传。
 */
// eslint-disable-next-line local/one-parameter -- 同 permitAnswer:toAnswer 契约两参
function pgwpAnswer(v: BandValue, all: Answers): EngineValue {
  if (all.status === 'overseas') {
    return undefined
  }
  return PGWP[band(v)] || undefined
}

/**
 * 课程时长档 → 月数下界(0 档不传;「不到 8 个月」给 4 只为让引擎判「不足 8 个月无 PGWP」)。
 *
 * @param v 档位。
 * @returns 月数或不传。
 */
function studyMonthsAnswer(v: BandValue): EngineValue {
  const b = band(v)
  if (b !== 0) {
    return STUDY_MONTHS[b]
  }
  return undefined
}

/**
 * 课程层级档 → 层级码(0 档不传)。
 *
 * @param v 档位。
 * @returns 层级码或不传。
 */
function studyLevelAnswer(v: BandValue): EngineValue {
  return STUDY_LEVEL[band(v)] || undefined
}

/**
 * 字段库本体。键序即 toEngineAnswers 的遍历序,别乱动。
 * 每个字段头上的 `//` 是它的决策记录(带日期带人带理由),与三语题面同存。
 */
export const FIELDS: Record<string, FieldDef> = {
  // 处境:决定签证题算不算数(境外没有加拿大签证),并计入基本题完整度
  status: {
    engineKey: 'currentStatus',
    unlocks: ['rpt.c.window', 'rpt.g.basics'],
    tier: 'free',
    toAnswer: statusAnswer,
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
  // 「人在境内」答不了这两道闸(学签在读曾因此被 AB 放行)。境外不问。
  // 2026-08-16 Frank「这个上面的问题也没问,你是否有工签啊?」:**在读也要问** —— 先前拿「在加拿大读书」
  // 推定持学签,推出来的却是「差工签」这种结论性判定,等于没问就替他认定。境内一律问,答了才判。
  permitBand: {
    engineKey: 'permit',
    unlocks: ['rpt.g.basics'],
    tier: 'free',
    visible: inCanada,
    toAnswer: permitAnswer,
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
    toAnswer: resProvAnswer,
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
    toAnswer: eduAnswer,
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
    toAnswer: ageAnswer,
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
    toAnswer: totalExpAnswer,
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
    toAnswer: clbAnswer,
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
    toAnswer: expAnswer,
    q: {
      choiceVisible: expChoiceVisible,
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
    toAnswer: provAnswer,
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
    toAnswer: goalAnswer,
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
    toAnswer: offerAnswer,
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
    toAnswer: canadaEduAnswer,
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
    visible: hasCanadaEdu,
    toAnswer: fieldMatchAnswer,
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
    visible: hasCanadaEdu,
    toAnswer: eduProvAnswer,
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
    visible: hasCanadaEdu,
    toAnswer: eduYearsAnswer,
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
  // 法语(2026-08-15 立,2026-08-16 升级成档位)。两件事本来问了两遍:
  //   · FCIP 的定义性门槛只看「四项够不够 NCLC 5」
  //   · ON/SK 官方表的 language2 要的是**档位**(第二官方语言 CLB/NCLC 4-10 逐档给分)
  // Frank「前面那个就是英语 后面那个就是法语吧」——于是并成一道:问档位,门槛由档位自己判。
  // 量表用 NCLC(法语的尺子);官方 language2 档位按同数值可比,直接喂 clb2。
  frenchBand: {
    engineKey: 'frenchOk',
    unlocks: ['rpt.g.basics'],
    tier: 'free',
    toAnswer: frenchAnswer,
    q: {
      title: l('Your French level (NCLC, all four abilities)?',
        '法语四项到 NCLC 几?', '프랑스어 4개 영역 NCLC 등급은?'),
      choices: [
        { value: 1, text: l('No French / below NCLC 4', '不会法语或不到 NCLC 4', '프랑스어 미보유·NCLC 4 미만') },
        { value: 2, text: l('NCLC 4', 'NCLC 4', 'NCLC 4') },
        { value: 3, text: l('NCLC 5', 'NCLC 5', 'NCLC 5') },
        { value: 4, text: l('NCLC 6', 'NCLC 6', 'NCLC 6') },
        { value: 5, text: l('NCLC 7', 'NCLC 7', 'NCLC 7') },
        { value: 6, text: l('NCLC 8 or higher', 'NCLC 8 以上', 'NCLC 8 이상') },
        { value: 9, text: l('Not sure', '不清楚', '잘 모르겠음') },
      ],
    },
  },
  // 探索层:CRS → EE 分差(锁区 ee)
  crsBand: {
    engineKey: 'crs',
    unlocks: ['rpt.c.eeAbove', 'rpt.c.eeBelow'],
    tier: 'pro',
    toAnswer: crsAnswer,
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
    toAnswer: pgwpAnswer,
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
  // B1-4 PGWP(20260803,Frank 拍板只加两道;探索批 2)。
  // 「读书 vs 直接工作」的官方算术:课程时长档 + 层级 → 毕业后 PGWP 几个月(规则行 quote-anchored,
  // 见 etl/build_pgwp.py)。档取下界(同 CLB/经验口径)。
  studyMonthsBand: {
    engineKey: 'studyMonths',
    unlocks: ['rpt.c.pgwpLen', 'rpt.c.pgwpCombine'],
    tier: 'free',
    toAnswer: studyMonthsAnswer,
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
    toAnswer: studyLevelAnswer,
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

/**
 * 目标省档 → 省码组(与 bandFromProvs 互推:三问存省份数组、答题存档位,
 * 两种表示必须互推,否则「问过的不再问」是假的)。
 *
 * @param b 档位。
 * @returns 省码组。
 */
export function provsFromBand(b: number): ProvList {
  const hit = PROVS[b]
  if (hit != null) {
    return hit
  }
  return []
}

/**
 * 省码组 → 目标省档(provsFromBand 的反向)。
 *
 * @param provs 省码组;没答过是 undefined。
 * @returns 档位(空=0,单 BC=1,单 ON=2,其余=4 不限省)。
 */
export function bandFromProvs(provs: MaybeProvList): number {
  if (provs == null || provs.length === 0) {
    return 0
  }
  if (provs.length === 1 && provs[0] === 'BC') {
    return 1
  }
  if (provs.length === 1 && provs[0] === 'ON') {
    return 2
  }
  return 4
}

/**
 * 任意来源的档(内存/旧档/服务端)→ 全字段对齐的 Answers。逐字段重建的清单必须与 Answers
 * 全量对齐(2026-08-15 Frank 实拍「学历下面的内容填完一刷新就没了」:studyMonths/studyLevel
 * 写入一直正常,是**读取路径漏了字段** → 每次刷新被归零)。
 * 三处 v2 迁移都在这(值域重叠的靠标记区分,不靠值本身猜 —— 见 FRENCH_V2_MAP 的注释)。
 *
 * @param cur 原料档。
 * @returns 洗净的全卷。
 */
export function normalize(cur: RawAnswersSource): Answers {
  const raw = cur as RawDoc
  let clbBand: number
  if (raw.bandsV2 === true) {
    clbBand = num(raw.clbBand)
  } else {
    let mapped = CLB_V2_MAP[num(raw.clbBand)]
    if (mapped == null) {
      mapped = 0
    }
    clbBand = mapped
  }
  let totalExpBand: number
  if (raw.bandsV2 === true) {
    totalExpBand = num(raw.totalExpBand)
  } else {
    totalExpBand = totalV2(num(raw.totalExpBand))
  }
  let frenchBand: number
  if (raw.frenchV2 === true) {
    frenchBand = num(raw.frenchBand)
  } else {
    let mapped = FRENCH_V2_MAP[num(raw.frenchBand)]
    if (mapped == null) {
      mapped = 0
    }
    frenchBand = mapped
  }
  const out: Answers = {
    status: str(raw.status), nocs: arr(raw.nocs), provs: arr(raw.provs),
    clbBand: clbBand, bandsV2: true,
    expBand: num(raw.expBand), provBand: num(raw.provBand),
    crsBand: num(raw.crsBand), pgwpBand: num(raw.pgwpBand),
    eduBand: num(raw.eduBand), ageBand: num(raw.ageBand),
    totalExpBand: totalExpBand,
    offerBand: num(raw.offerBand), goalBand: num(raw.goalBand), canadaEduBand: num(raw.canadaEduBand),
    permitBand: num(raw.permitBand), resProv: str(raw.resProv),
    fieldMatchBand: num(raw.fieldMatchBand), eduProv: str(raw.eduProv), eduYearsBand: num(raw.eduYearsBand),
    frenchBand: frenchBand, frenchV2: true,
    studyMonthsBand: num(raw.studyMonthsBand), studyLevelBand: num(raw.studyLevelBand),
  }
  if (raw.done === true) {
    out.done = true
  }
  if (typeof raw.provsAny === 'boolean') {
    out.provsAny = raw.provsAny
  }
  return out
}

/**
 * 总经验档迁移(9=不清楚原样保留,超界落 0)。
 *
 * @param b 旧档。
 * @returns 新档。
 */
export function totalV2(b: number): number {
  if (b === 9) {
    return 9
  }
  const hit = TOTAL_V2_MAP[b]
  if (hit != null) {
    return hit
  }
  return 0
}

/**
 * 任意来源的分值卡档 → 全字段对齐的 ScoreAnswers(可选格只在原档真有时带上)。
 * 体内四个 `as` 是跨边界断言:ticks/rowAnswers/extraAnswered/profile 的值形状由写入端
 * (本门面)保证,读回来只收「是对象」这一层 —— 逐键再验类型就是把校验做两遍。
 *
 * @param cur 原料档。
 * @returns 洗净的分值卡档。
 */
export function normalizeScore(cur: RawScoreSource): ScoreAnswers {
  if (cur == null || typeof cur !== 'object') {
    return { ticks: {}, rowAnswers: {}, extraAnswered: {}, profile: {} }
  }
  const raw = cur as RawDoc
  const out: ScoreAnswers = {
    ticks: rec(raw.ticks) as Record<string, boolean>,
    rowAnswers: rec(raw.rowAnswers) as Record<string, number>,
    extraAnswered: rec(raw.extraAnswered) as Record<string, boolean>,
    profile: rec(raw.profile) as ScoreAnswers['profile'],
  }
  if (typeof raw.hasOffer === 'boolean') {
    out.hasOffer = raw.hasOffer
  }
  if (typeof raw.wage === 'number' && Number.isFinite(raw.wage)) {
    out.wage = raw.wage
  }
  if (typeof raw.areaI === 'number' && Number.isFinite(raw.areaI)) {
    out.areaI = raw.areaI
  }
  return out
}

/**
 * 档位 → /api/report 的 answers。换算全在上面的字段库里,这里只做遍历与职业。
 * `noc` 保留单值是为了老前端与 advisor 不受影响(2026-08-02),引擎按 `nocs` 一个职业一份报告 ——
 * 两个职业的清单命中/门槛/抽选线不能合起来算。
 * 新问卷直接多选具体省份;provBand 只保留给旧答案和其它页面兼容,不能反过来把精确数组覆盖掉。
 *
 * 体内的 `as` 是跨边界断言:字段名就是 Answers 的键(字段库与 Answers 同源维护),
 * 值域收窄到题的两种存值。
 *
 * @param a 全卷。
 * @returns 引擎入参对象(undefined 的键被 JSON.stringify 抹掉 = 不传)。
 */
export function toEngineAnswers(a: Answers): EngineAnswers {
  const out: EngineAnswers = { noc: a.nocs[0] || '', nocs: a.nocs }
  for (const [name, def] of Object.entries(FIELDS)) {
    const cell = a[name as keyof Answers] as string | number
    let v: EngineValue = cell
    if (def.toAnswer != null) {
      v = def.toAnswer(cell, a)
    }
    if (typeof v !== 'undefined') {
      let key = name
      if (def.engineKey != null) {
        key = def.engineKey
      }
      out[key] = v
    }
  }
  if (a.provs.length > 0) {
    out.targetProvinces = a.provs
  }
  return out
}
