/**
 * 对话编排层 v1(设计《对话即产品-20260803》§二/§三/§四,C2 批)。
 *
 * 三步流水线:抽槽位(LLM 只"听懂") → 调 C1 工具层(数字与判定的唯一来源) → 合成人话(LLM 只"说人话")。
 *
 * 本层自己的三条铁律:
 *   ① **出口校验硬拦**(guardAnswer):答复里的每一个数字必须能在 facts 里找到出处,
 *      靠的是回读比对,不是"在 prompt 里求模型别编"。违规 → 重试一次 → 再违规就降级成事实清单。
 *      宁可给一张能溯源的清单,也不给一句编出来的话。
 *   ② 工具层的四态(ok / not-published / not-collected / not-applicable)一路带到 prompt,
 *      **"官方不公布"和"本站没收录"不许在答复里合并成"没有"**;但**枚举值本身不许见客**
 *      (findLeaks:意思照说,代码照拦)。同一道出口还拦中/韩答复里的英文速记(findEnglishUnits)、
 *      按句截断长度(clampAnswer:朋友服务不收 max_tokens),并给没有 fact 撑腰的推断性措辞留痕(findHedges)。
 *   ③ 依赖职业的问题拿不到 5 位 NOC 就反问,**绝不猜职业码** —— 猜错一位,下面所有职业工具都在答另一个人的问题；
 *      PGWP / CEC / FSW / FST 规则与 CRS / FSW67 分表不依赖职业,纯问这些时不强迫用户补 NOC。
 *
 * 形状照 lib/resumeMatch.ts:纯函数 + 显式 pool 入参,路由只负责鉴权/限流/错误码。
 * ⚠️ 朋友服务(qwen3.6)prompt 上限 6000 字符(实测 400,system 不占额),所以 facts **先压平再压缩**
 * 才喂模型:工具返回的整坨 JSON 一次就能把额度撑爆(resume-match 真简历事故同一个坑)。
 */
import {
  checkClaims, lookupCoverage, lookupCrs, lookupDraws, lookupEE, lookupJobs, lookupOps, lookupPermit, lookupPlan, lookupThresholds,
  lookupVerdict,
  PNP_PROVINCES, PRIVATE_PROMISE, type Availability, type Claim, type ClaimTopic, type CrsLookupArgs, type CrsResult,
  type PermitResult, type PlanResult, type VerdictResult,
} from './chatTools'
import type { PathwayVerdict, VerdictProfile, VerdictReason } from './pathVerdict'
import { EDU_KEYS, systemShort, type EduKey } from './pnpSelfScore'
import type { PlanStep } from './planTimeline'
import { completeText, LlmError, type ChatMessage } from './llm'
import { parseLlmJson } from './resumeMatch'

// ── 契约(前端按这个写,别改)────────────────────────────────────────────────

export type Fact = {
  tool: string
  label: string
  value: number | null
  valueText: string
  unit: string
  evidence: { url: string; fetched: string }
  /** 答复真的用到了这条吗(citeFacts 在答复落地后回读打的标)。前端出处区只列 true 的。 */
  cited?: boolean
}
/** 'other' = 主张不属于任何官方数据工具管得着的题目(中介收费这类)—— 不硬塞给某张表去“核”。
 *  收费是交易条件,私人承诺有自己的 'private-promise' 桶;两者在见客层合成一条“不能证明结果”的判断。 */
export type SlotClaimTopic = ClaimTopic | 'other'
export type SlotClaim = { text: string; topic: SlotClaimTopic; province?: string }
/**
 * C5c 起多了**档案槽**(age / married / clb / edu + 两个附带项 eduYears / studyProvince / canadaStudy):
 * 判定层 `pathVerdict` 要的就是这几样。全部**可选**且默认 null —— 两条理由,都不是图省事:
 *   ① 缺一个槽 ≠ 有一个默认值:`married: false`「按单身算」会直接换一张 CRS 分表,
 *      算出来的分是另一个人的(编排层缺槽就反问,见 verdictFollowups);
 *   ② 类型上可选,是为了不逼既有调用方(路由、测试里的 emptySlots)全部改造 —— 加槽不该是一次破坏性变更。
 */
export type Slots = {
  noc: string | null
  occText: string
  provs: string[]
  expMonths: number | null
  status: string | null
  claims: SlotClaim[]
  /** 年龄(CRS/MPNP 年龄档;不猜) */
  age?: number | null
  /** **配偶是否随行申请**(不是「有没有结婚」):CRS 单身/已婚是两张表,随行与否才是分表的判据 */
  married?: boolean | null
  /** CLB 四项最低。**只认用户自己说的 CLB/NCLC 档** —— 雅思分数换算 CLB 是官方一张表,本站没收录,不许模型心算 */
  clb?: number | null
  edu?: EduKey | null
  /** 学制年数(两年制 → 2);说不清就 null */
  eduYears?: number | null
  /** 有没有加拿大学历 */
  canadaStudy?: boolean | null
  /** 在哪个省读的(两位省码) */
  studyProvince?: string | null
}
export type ChatLang = 'zh' | 'en' | 'ko'
export type ChatTurn = { role: 'user' | 'assistant'; content: string }
/** `degraded` = 这段「答复」其实是**原始事实清单**(出口校验两次都没过 → factSheet)。
 *  前端据此换一种排版(ChatAnswer.cbSheet):清单要排成清单,不能跟正常答复长一个样。
 *  路由是纯透传(Response.json(result) / sse(result)),加字段不用动它。 */
/**
 * C6 选项卡(设计 docs/design/对话选项卡与图片上传-20260806.md §一):
 * 需要决定才弹;点选=以用户身份把 sendText 发出去(气泡进对话流,引擎照常抽槽+继承 context);
 * 推荐位带理由。label/consequence 是 UI 文案(零逗号铁律),sendText 是用户口吻的一句话。
 */
export type ChatOption = { label: string; consequence?: string; sendText: string; recommended?: boolean }
export type ChatResult = {
  answer: string; slots: Slots; facts: Fact[]; followups: string[]
  /** 弹选项卡时才有:reason 是推荐理由行,options ≤3(第 4 张「自己说」由前端固定给)。
   *  slotKey = 这张卡在收集哪个档案槽(2026-08-09 Frank「能让用户手点就别用手输入」),
   *  裁决路径的工签卡不带它(那是判定前置,不是建档)。 */
  options?: { reason: string; items: ChatOption[]; slotKey?: 'status' | 'prov' | 'clb' | 'edu' | 'expMonths' | 'married' | 'canadaStudy' }
  degraded?: boolean
}
/** 档案里已有值的槽(route 从 users.profile 算好传进来)——已有的不再点选追问,手填优先。 */
export type ProfileKnown = { status?: boolean; provs?: boolean; clb?: boolean; edu?: boolean; expMonths?: boolean; married?: boolean; canadaStudy?: boolean }
export type ChatErrorCode = 'tooShort' | 'noOcc' | 'llm' | 'guard'
export class ChatError extends Error {
  code: ChatErrorCode
  slots?: Slots
  constructor(code: ChatErrorCode, msg: string, slots?: Slots) { super(msg); this.name = 'ChatError'; this.code = code; this.slots = slots }
}

// ── 🔴 工具轨迹(流的是「我在查什么」)────────────────────────────────────
//
// 🔵 2026-08-08 起**答复正文也流**,但靠的是「按句门控」不是把校验关了:一句过了逐句门才发给前端
//    (见下方 makeSentenceGate)。旧口径「答案一个字都不流」的理由是「出口校验整段才跑」——
//    那个前提被拆掉了:五道里有四道本来就一句一句就能判。**红线一个字没松**,
//    跨句才判得了的那两道(逐行抄 ⓑ、同开头)整段跑完只留痕。
//
// 因此轨迹事件有三条铁律,改这里之前先读完:
//   ① 事件文字**永远是我们自己构造的字符串**(下面 STEP 字典),**绝不允许**掺任何模型生成的内容 ——
//      正因为如此它不必过 guard;哪天有人把 LLM 的话塞进 step,这条豁免立刻失效。
//   ② 可以带**工具返回的数字**(条数、省码):它们按构造就带 evidence,是已核过的事实。
//   ③ **必须诚实**:只在真的开始/完成那一步时才发,不许为了好看编造进度、不许加假延时、不许预告没做的事。
export type ChatStepPhase = 'read' | 'occ' | 'tool' | 'write'
export type ChatStep = { phase: ChatStepPhase; text: string }
export type OnStep = (s: ChatStep) => void

type StepDict = {
  read: string
  occ: (occ: string) => string
  jobs: (n: number) => string
  coverage: (n: number) => string
  thresholds: (provs: string) => string
  draws: (prov: string) => string
  ops: (prov: string) => string
  ee: string
  permit: (program: string) => string
  crs: (grid: string) => string
  plan: (provs: string) => string
  verdict: (n: number) => string
  claims: (n: number) => string
  write: string
}
/** 轨迹文案的**单一来源**(三语,和 LBL/AVAIL_SENTENCE 同一层)。前端只渲染,不再自己拼字。 */
export const STEP: Record<ChatLang, StepDict> = {
  zh: {
    read: '读懂你的问题',
    occ: (o) => `认出职业:${o}`,
    jobs: (n) => `查在招岗位:${n} 条`,
    coverage: (n) => `查职业清单:${n} 个省`,
    thresholds: (p) => `查官方门槛:${p}`,
    draws: (p) => `查抽选记录:${p}`,
    ops: (p) => `查运营统计:${p}`,
    ee: '查联邦 EE 通道',
    permit: (p) => `查联邦规则:${p}`,
    crs: (g) => `查联邦计分表:${g}`,
    plan: (p) => `算时间线:${p}`,
    verdict: (n) => `逐条比对官方门槛:${n} 条通道`,
    claims: (n) => `核对别人跟你说的:${n} 条`,
    write: '正在组织答复',
  },
  en: {
    read: 'Reading your question',
    occ: (o) => `Occupation identified: ${o}`,
    jobs: (n) => `Open postings checked: ${n} rows`,
    coverage: (n) => `Occupation lists checked: ${n} provinces`,
    thresholds: (p) => `Official requirements checked: ${p}`,
    draws: (p) => `Draw history checked: ${p}`,
    ops: (p) => `Operational stats checked: ${p}`,
    ee: 'Federal Express Entry categories checked',
    permit: (p) => `Federal rules checked: ${p}`,
    crs: (g) => `Federal points grid checked: ${g}`,
    plan: (p) => `Timeline worked out: ${p}`,
    verdict: (n) => `Official requirements compared: ${n} streams`,
    claims: (n) => `What you were told: ${n} claims checked`,
    write: 'Writing the reply',
  },
  ko: {
    read: '질문 파악 중',
    occ: (o) => `직업 확인: ${o}`,
    jobs: (n) => `채용 공고 조회: ${n}건`,
    coverage: (n) => `직업 목록 조회: ${n}개 주`,
    thresholds: (p) => `공식 요건 조회: ${p}`,
    draws: (p) => `추첨 기록 조회: ${p}`,
    ops: (p) => `운영 통계 조회: ${p}`,
    ee: '연방 EE 카테고리 조회',
    permit: (p) => `연방 규정 조회: ${p}`,
    crs: (g) => `연방 점수표 조회: ${g}`,
    plan: (p) => `소요 기간 산출: ${p}`,
    verdict: (n) => `공식 요건 대조: ${n}개 통로`,
    claims: (n) => `들으신 내용 대조: ${n}건`,
    write: '답변 작성 중',
  },
}

export const MIN_TEXT = 4          // 少于这个字数问不出东西(「你好」不该烧一次模型调用)
export const MAX_TEXT = 1200       // 输入侧封顶(#102 账单教训)
const PROMPT_BUDGET = 4200         // 送 friend 的 user prompt 字符预算(留 1800 余量给 6000 硬上限)
const MAX_FACTS = 40               // facts 上限:再多前端也读不完,prompt 也塞不下
/**
 * 🔴 **追问轮的短答是合法答案**(D2;2026-08-09 生产实录 chat_logs #52:「没工作」撞 tooShort)。
 * 首轮四字门的理由是「一句问候问不出东西」——那个理由在**我们刚问完一句**之后就不成立了:
 * 「没工作」「BC」「CLB 6」都是对上一句反问的完整回答,把它们顶回去等于自己问完自己不听。
 * 判据取「历史里有过 assistant 轮」(= 上一句是我们说的),不看长度、不猜内容;空串仍旧拦。
 * 首轮闸一个字没动:history 为空时行为与今天完全一致。
 */
export const isFollowupTurn = (history?: ChatTurn[]): boolean =>
  (history ?? []).some((h) => h.role === 'assistant' && h.content.trim().length > 0)

// ── 小工具 ──────────────────────────────────────────────────────────────────

/** 一次请求内的查询记忆:多个职业工具会重复调 assembleReportFacts(同 noc 同 SQL),同参只查一次。 */
function memoPool(pool: any) {
  const cache = new Map<string, Promise<any>>()
  return {
    query(sql: string, params?: unknown[]) {
      const k = `${sql}||${JSON.stringify(params ?? [])}`
      const hit = cache.get(k)
      if (hit) return hit
      const p: Promise<any> = pool.query(sql, params)
      cache.set(k, p)
      return p
    },
  }
}

const PROV_ALIAS: Record<string, string> = {
  ONTARIO: 'ON', 安省: 'ON', 安大略: 'ON', 안타리오: 'ON',
  'BRITISH COLUMBIA': 'BC', 卑诗: 'BC', 卑詩: 'BC', 不列颠哥伦比亚: 'BC', BC省: 'BC',
  ALBERTA: 'AB', 阿省: 'AB', 阿尔伯塔: 'AB', 亚伯达: 'AB',
  SASKATCHEWAN: 'SK', 萨省: 'SK', 薩省: 'SK', 萨斯喀彻温: 'SK',
  MANITOBA: 'MB', 曼省: 'MB', 曼尼托巴: 'MB',
  'NOVA SCOTIA': 'NS', 新斯科舍: 'NS', 诺省: 'NS',
  'NEW BRUNSWICK': 'NB', 新不伦瑞克: 'NB',
  'NEWFOUNDLAND AND LABRADOR': 'NL', NEWFOUNDLAND: 'NL', 纽芬兰: 'NL',
  'PRINCE EDWARD ISLAND': 'PE', PEI: 'PE', 爱德华王子岛: 'PE',
  QUEBEC: 'QC', 魁省: 'QC', 魁北克: 'QC',
}
const ALL_PROVS = new Set([...PNP_PROVINCES, 'QC'])
/** 模型输出不可信:两位码直接用,省名/中文别名查表,认不出就丢(宁可少一个省,不许把 NB 当 NS)。 */
function normProv(raw: unknown): string | null {
  const s = String(raw ?? '').trim().toUpperCase()
  if (!s) return null
  if (ALL_PROVS.has(s)) return s
  return PROV_ALIAS[s] ?? PROV_ALIAS[s.replace(/[省州]$/, '')] ?? null
}

const TOPICS: ClaimTopic[] = ['coverage', 'thresholds', 'jobs', 'draws', 'ops', 'ee', 'private-promise']
const normTopic = (raw: unknown): SlotClaimTopic => (TOPICS.includes(String(raw ?? '') as ClaimTopic) ? (String(raw) as ClaimTopic) : 'other')

// ── 联邦规则 / 计分题路由(纯函数,不交给模型猜)───────────────────────────────

export type FederalRuleProgram = 'PGWP' | 'CEC' | 'FSW' | 'FST'
const FEDERAL_PROGRAM_RE: Record<FederalRuleProgram, RegExp> = {
  PGWP: /\bPGWP\b|post[- ]graduation work permit|毕业后工签|毕业工签|졸업 후 취업 허가/i,
  CEC: /\bCEC\b|Canadian Experience Class|加拿大经验类|加拿大经验类别|캐나다 경험 이민/i,
  FSW: /\bFSW(?:P|67)?\b|Federal Skilled Worker|联邦技术移民|联邦技术工人|연방 전문인력/i,
  FST: /\bFST(?:P)?\b|Federal Skilled Trades?|联邦技工|联邦技术工种|연방 숙련 기능직/i,
}
/** 一句话可以同时问 CEC / FSW / FST 对比,所以返回全部命中的 program,不擅自只留第一个。 */
export function federalRulePrograms(text: string): FederalRuleProgram[] {
  return (Object.keys(FEDERAL_PROGRAM_RE) as FederalRuleProgram[]).filter((p) => FEDERAL_PROGRAM_RE[p].test(text || ''))
}

/**
 * 🔴 「哪个省…」这类问题**必须全省查**,不能只查槽位里那几个省。
 *
 * 2026-08-05 实录(chat_logs id=17):用户问「哪个省的省提名不要求工作经验?」——一个省名都没提,
 * 抽槽却把 BC 塞进了 provs(模型编的)。于是 lookupThresholds 只查了 BC 一个省,
 * 「不设经验门槛的省排前面」那条排序根本没机会生效(NL 压根没进候选集),
 * 模型最后写出「各省省提名均要求工作经验」—— 一个它只看了一个省就下的全称判断,而且是错的。
 *
 * 判据只读**用户原话**,不看模型猜的槽位 —— 同 federalRulePrograms / crsLookups 那条既定原则:
 * 路由开关不许交给模型。他问「哪个省」,候选集就是全部省,由后面的排序决定摆哪几个。
 */
const PICK_PROV_RE =
  /哪[一几]?[个些]?省|省份.{0,4}选|选.{0,4}省份|which provinces?|what provinces?|어느 주|어떤 주/i
export const asksWhichProvince = (text: string): boolean => PICK_PROV_RE.test(text || '')

/**
 * 🔴 **「我走哪条路」才触发路径裁决**(C5c)。判据同 federalRulePrograms / asksWhichProvince 那条既定原则:
 * 路由开关只读**用户原话**,不看模型猜的槽位。
 *
 * 为什么要窄:裁决会往 facts 里铺十几条通道判定,它们**挤掉的是主线**(在招岗位、清单命中、门槛)。
 * 一个问「曼省木匠岗位多吗」的人拿到十三条通道裁决,得到的是一张表而不是答案 ——
 * 这正是这一层最贵的那条教训(「材料不是提纲」)。所以词表只收**明确在问「哪条路 / 怎么走 / 我能不能走」**的说法。
 *
 * 「我能不能」故意收得住:后面必须跟移民/申请/PR/留下这类词,否则「我能不能找到工作」也会命中。
 */
const PATH_RE =
  /走哪条|哪条路|哪条通道|哪条线|该走哪|走什么路|怎么(?:才能)?移民|如何移民|移民路径|移民路线|路径规划|我的路径|哪条最快下来/i
const CAN_I_RE =
  /能不能.{0,8}(?:移民|申请\s*(?:PR|省提名)|拿到?\s*(?:PR|枫叶卡|身份)|留(?:下|在加拿大))|有(?:没有|多大)机会.{0,8}(?:移民|拿|留)|能不能走.{0,6}(?:省提名|联邦|这条)/i
const PATH_EN_RE =
  /which (?:path|route|stream|program|programme|pathway)|what (?:path|route|pathway)s? (?:should|can|do)|my (?:best )?(?:options?|pathways?|routes?)\b|how (?:do|can|should) i immigrate|best way to immigrate|road ?map to pr|can i (?:immigrate|qualify|get pr|apply for pr)/i
const PATH_KO_RE = /어느 경로|어떤 경로|이민 (?:방법|경로)|어떻게 이민|영주권.{0,6}(?:경로|방법)/i
/** 用户原话在问「我该走哪条路」吗(纯函数,不问模型)。 */
export const isPathQuestion = (text: string): boolean => {
  const s = text || ''
  return PATH_RE.test(s) || CAN_I_RE.test(s) || PATH_EN_RE.test(s) || PATH_KO_RE.test(s)
}
/** 触发裁决还要**档案槽够用**:少于这么多有值的槽,判出来的十三条几乎全是 needs-info,不如反问一句。 */
export const MIN_PROFILE_SLOTS = 3

const CRS_RE = /\bCRS\b|Comprehensive Ranking System|综合排名(?:系统)?|EE\s*(?:score|points?)|EE\s*分(?:数)?|종합 순위 점수/i
const SCORE_RE = /\b67\s*(?:points?|점)?\b|分数|打分|计分|多少分|得分|scor(?:e|ing)|points?|점수/i
const AGE_RE = /\bage\b|years? old|岁|年(?:龄|齡)|나이|살\b/i
const EDUCATION_RE = /education|degree|diploma|master|bachelor|phd|学历|學歷|教育|学位|學位|硕士|碩士|本科|博士|학력|학위|석사|학사|박사/i
const LANGUAGE_RE = /language|CLB|NCLC|IELTS|CELPIP|TEF|TCF|语言|語言|雅思|法语|法語|영어|불어|언어/i
const WORK_RE = /work experience|工作经验|工作經驗|경력|근무 경력/i

/** 用户原话 → 官方表里的结构化筛选。只映射高置信词；判不了就不加筛选,绝不猜档位。 */
function crsDimension(text: string, grid: 'CRS' | 'FSW67'): Pick<CrsLookupArgs, 'factor' | 'criterion' | 'kind'> {
  const s = text || ''
  if (AGE_RE.test(s)) {
    const a = /(?:age|aged|years? old|岁|年(?:龄|齡)|나이|살)\D{0,5}(\d{1,2})|(\d{1,2})\s*(?:years? old|岁|살)/i.exec(s)
    const age = a ? (a[1] || a[2]) : ''
    return { factor: 'Age', ...(grid === 'CRS' && age ? { criterion: `${age} years` } : {}), kind: 'detail' }
  }
  if (EDUCATION_RE.test(s)) return { factor: 'Education', kind: 'detail' }
  if (LANGUAGE_RE.test(s)) return { factor: grid === 'CRS' ? 'Language' : 'official language', kind: 'detail' }
  if (/foreign.{0,12}(?:work|experience)|海外.{0,6}(?:工作|经验)|境外.{0,6}(?:工作|经验)/i.test(s)) return { factor: 'Foreign work experience', kind: 'detail' }
  if (WORK_RE.test(s)) return { factor: grid === 'CRS' ? 'Canadian work experience' : 'Experience', kind: 'detail' }
  if (/spouse|partner|配偶|伴侣|伴侶|배우자/i.test(s)) return { factor: 'Spouse', kind: 'detail' }
  if (/adaptability|适应(?:能力)?|適應(?:能力)?|적응력/i.test(s)) return { factor: 'Adaptability', kind: 'detail' }
  if (/job offer|arranged employment|雇主 offer|工作邀请|工作邀請|잡 오퍼/i.test(s)) return { criterion: 'Arranged employment', kind: 'detail' }
  if (/provincial nomination|省提名|주정부 지명/i.test(s)) return { criterion: 'Provincial nomination', kind: 'detail' }
  if (/sibling|brother|sister|兄弟|姐妹|姊妹|형제|자매/i.test(s)) return { criterion: 'Brother or sister', kind: 'detail' }
  if (/french|法语|法語|프랑스어|불어/i.test(s)) return { criterion: 'French', kind: 'detail' }
  return {}
}

/**
 * 只有真问到 CRS / FSW 67 分才查表；提到 FSW 资格但没问分数时只走联邦资格规则,不把 43 行分值污染进去。
 * 同一句拿 CRS 与 FSW67 对比时两套分别查询,各自 SQL 都先按 grid 过滤。
 */
export function crsLookups(text: string): CrsLookupArgs[] {
  const out: CrsLookupArgs[] = []
  if (CRS_RE.test(text || '')) out.push({ grid: 'CRS', ...crsDimension(text, 'CRS') })
  if (FEDERAL_PROGRAM_RE.FSW.test(text || '') && SCORE_RE.test(text || '')) {
    out.push({ grid: 'FSW67', ...crsDimension(text, 'FSW67') })
  }
  return out
}

const LANG_NAME: Record<ChatLang, string> = { zh: 'Simplified Chinese', en: 'English', ko: 'Korean' }

/**
 * 🔴 **主张 = 转述别人说的话;自述家庭/自身状况不是主张**(2026-08-06 实测中文:
 * 「老婆和两个孩子一起过来」被抽成一条 claim,还接上了「这条金额谁也核不了」——
 * 用户压根没提钱,我们却把「你被人告知过某个价钱」这件事**强加**给了他。这比说错数字更糟)。
 *
 * 病根不在 prompt(SLOT_SYSTEM 早就写着「claims = 用户转述别人的话」)—— topic 与「算不算主张」
 * 都是模型猜的,今天已经证明靠不住。所以在**纯函数**这一层机械判掉:句子里说的是自己家里人、
 * 又没有任何转述标记 → 它是这个人的处境陈述,不是别人跟他说的话。
 * 判据故意窄(只收家庭/自身),模型把「曼省有合作公司」这种去掉了「中介说」的主张照旧留着。
 */
const ATTRIBUTION_RE =
  /说|讲|告诉|承诺|保证|听说|据说|中介|顾问|老板|雇主|学校|朋友|told|said|says|say that|promis|claim|according to|heard|agent|consultant|recruiter|들었|말했|약속|에이전트|중개|사장/i
const SELF_FAMILY_RE =
  /老婆|妻子|太太|老公|丈夫|配偶|孩子|儿子|女儿|家人|一家|父母|my wife|my husband|my spouse|my kids?\b|my child|my children|my family|my parents|wife and|husband and|아내|남편|배우자|아이|자녀|가족|부모/i
/**
 * 🔴 K05(2026-08-09 基线批跑 R11 实录):「我持有有效的 PGWP 工签」——**建档点选卡自家的 sendText**
 * 也被抽成一条 claim,见客层回头把他自己的处境陈述当第三方主张对账。同家庭自述一个病根:
 * 自述身份/证件不是「别人跟他说的话」。判据同款收窄:第一人称/持有语境 × 证件词,或证件词 ×
 * 有效期语境;转述标记豁免照旧——「中介说我的工签没问题」仍是主张,一条不误伤。
 */
const SELF_STATUS_RE =
  /(?:我|本人|手里|手上|自己|I\b|I'm\b|I've\b|my\b|제|저는)[^,。;!?]{0,16}(?:工签|学签|签证|身份|PGWP|permit|visa|status|비자)|(?:PGWP|工签|学签|签证|permit|visa|비자)[^,。;!?]{0,12}(?:有效|还在|没过期|未过期|快过期|剩|valid|expir|남았)/i
/** 这句话是「别人跟你说的」吗(不是 → 不进 claims)。 */
export const isSelfStatement = (text: string): boolean =>
  (SELF_FAMILY_RE.test(text) || SELF_STATUS_RE.test(text)) && !ATTRIBUTION_RE.test(text)

/**
 * 🔴 **这条主张真的提到钱了吗** —— 报价判断只许挂在真提到金额/收费的主张上。挂错一次,读者就被告知了
 * 一个他从没听说过的价钱。判据只认**写在原话里的**金额与收费词,不看模型给的 topic。
 */
const MONEY_RE =
  /\d[\d,.]*\s*(?:万|千|块|元|刀|加币|加元|k\b|dollars?|usd|cad)|[$￥¥€£]\s*\d|收费|要收|收我|收你|报价|中介费|服务费|手续费|押金|保证金|费用|多少钱|charges?\b|\bfees?\b|\bcosts?\b|\bprice|\bpays? me|만원|수수료|비용|얼마/i
export const isMoneyTalk = (text: string): boolean => MONEY_RE.test(text)

// ── 第一步:抽槽位(模型只做「听懂」,不许下任何结论)────────────────────────

export const SLOT_SYSTEM = [
  'You turn one message from a would-be immigrant into slots. Reply with ONLY one JSON object, no prose, no markdown fence.',
  'SHAPE: {"occ_en":"","noc":null,"provs":[],"exp_months":null,"status":null,"age":null,"married":null,"clb":null,'
    + '"edu":null,"edu_years":null,"canada_study":null,"study_prov":null,"claims":[{"text":"","topic":"","province":null}]}',
  'EXAMPLE IN: 我是厨师,在BC读完书还没工作,朋友说萨省两个月就下来了,找他办要收 5 万',
  'EXAMPLE OUT: {"occ_en":"cook","noc":null,"provs":["BC","SK"],"exp_months":0,"status":"graduated",'
    + '"age":null,"married":null,"clb":null,"edu":null,"edu_years":null,"canada_study":true,"study_prov":"BC",'
    + '"claims":[{"text":"朋友说萨省两个月就下来了","topic":"ops","province":"SK"},'
    + '{"text":"找他办要收 5 万","topic":"other","province":"SK"}]}',
  'EXAMPLE IN: 我 40 岁,已婚但太太不随行,CLB6,在安省读的两年制大专,零经验想学木工,走哪条路?',
  'EXAMPLE OUT: {"occ_en":"carpenter","noc":null,"provs":["ON"],"exp_months":0,"status":null,"age":40,"married":false,'
    + '"clb":6,"edu":"diploma2y","edu_years":2,"canada_study":true,"study_prov":"ON","claims":[]}',
  'RULES:',
  '- claims = EVERY sentence the user attributes to someone else (中介/agent, 朋友/friend, school, consultant). Copy their wording verbatim.'
    + ' This is the field people get wrong: if the message contains 中介说 / 朋友说 / they told me / I was told, claims MUST NOT be empty.',
  // 🔴 2026-08-06 生产实录 #36/#37:抽槽把 EARLIER 里 assistant 的句子(我们自己上一轮的答复)抽成
  //    「你听到的」主张,见客层回头把自家门槛行当中介报价对账。prompt 这条是软约束,硬闸在 orchestrate。
  '- claims come ONLY from the user\'s own words (NOW, or user lines in EARLIER). Lines under "assistant:" are OUR OWN'
    + ' previous answers — they are NEVER a claim, no matter what they say.',
  // 一条主张一项:官方事实仍要逐条对账;收费与包办在见客层会有意识地合成一条交易判断。
  '- ONE assertion per claim item. If one sentence carries a promise about a company AND a fee AND a timeline, that is THREE claim'
    + ' items, each with its own text and topic. Never put two assertions into one text — they get different answers.',
  '- topic: coverage = "province X wants my occupation"; thresholds = "you need N years / this score"; jobs = "there are jobs there";'
    + ' draws = "you will be picked"; ops = "it takes N months / N spots left"; ee = "go federal Express Entry";'
    + ' private-promise = a promise about private relationships (有合作公司 / 内部渠道 / 走关系 / 包过 / a partner company / inside track),'
    + ' which no government publishes;'
    + ' other = money and fees (中介要收 X 万 / they charge me), which no official source covers.',
  // 🔴 追问轮(「What are my odds of being picked?」)本身不提职业 → occ_en 空 → resolveNoc 拿不到 5 位码
  //    → 整轮以 noOcc 反问告终。2026-08-04 实测撞上:用户点自己的追问 chip,回来的是「说说你做什么工作」。
  //    追问问的是**同一个人同一份工作**,职业从 EARLIER 里接着用,这不是猜,是上下文。
  '- If NOW does not name an occupation but EARLIER does, copy the occupation from EARLIER into occ_en (and its 5-digit noc if'
    + ' EARLIER shows one). A follow-up is about the SAME person and the SAME occupation — never leave occ_en empty in that case.',
  '- noc: fill ONLY if the user literally typed 5 digits. NEVER guess it — null is the right answer.',
  '- occ_en: the occupation alone, generic English, strip school/seniority/company ("亚岗昆木匠毕业" -> "carpenter").',
  '- provs: 2-letter codes only (ON BC AB SK MB NS NB NL PE QC), including provinces that only appear inside a claim.',
  '- exp_months: 0 if they say they have no work experience yet; null if not stated.',
  '- status: student | graduated | working | visitor | abroad | null.',
  // ── C5c 档案槽:路径判定要的那几样。**每一条的默认答案都是 null** ──────────────
  // 猜错一个槽 = 换一张官方分表 / 换一条门槛档,算出来的是另一个人的结果。
  '- age: their age in years as a number, only if they state it (40 / 40 岁 / 마흔). Otherwise null.',
  // 「已婚」不等于「配偶随行」—— CRS 单身/已婚是两张官方分表,分表的判据是**随不随行**
  '- married: this field means "will a spouse or partner come along on the application", not "are you married".'
    + ' true = married/partnered and the spouse comes too. false = single, OR married but the spouse stays behind'
    + ' (配偶不随行 / 太太在国内 / spouse is not coming). null if they never mention a spouse.',
  // 雅思/CELPIP 换算 CLB 是官方一张对照表,本站没收录 → 不许模型心算(算错一档就换一条门槛)
  '- clb: the CLB (or NCLC) level as a number, only when they give a CLB/NCLC level (CLB6 / CLB 六 / 四项都 6 / NCLC 7).'
    + ' An IELTS, CELPIP, TEF or TCF band is NOT a CLB level — leave clb null for those, we will ask.',
  '- edu: highest completed education, one of doctorate | master | bachelor | tradeCert | diploma2y | cert1y | highschool.'
    + ' 博士=doctorate, 硕士/研究生=master, 本科/学士=bachelor, 技工证/学徒证=tradeCert, 大专/两年制文凭/college diploma=diploma2y,'
    + ' 一年证书=cert1y, 高中=highschool. If they are still studying, use the programme they are enrolled in. null if not stated.',
  '- edu_years: how many years that programme lasts, only if they say so (两年制 -> 2, three-year -> 3). Otherwise null.',
  '- canada_study: true if they studied (or are studying) in Canada — a Canadian college/university by name counts;'
    + ' false only if they say all their study was outside Canada; null if unknown.',
  '- study_prov: the 2-letter province where they studied in Canada (在安省读的 -> "ON"). null if unknown.',
  'You only listen. Never judge, never advise, never add facts of your own.',
].join('\n')

/**
 * 用户原话里 **literally 打出来的 5 位 NOC**。纯函数,不过模型。
 *
 * 🔴 2026-08-05 实测:候选 chip 是我们自己摆出去的(OCC_PICK,三语都带「NOC 21222」),
 * 用户点回来那一轮,SLOT_SYSTEM 那条「用户 literally 打出了 5 位数字才填 noc」**模型并不总是照做** ——
 * 它把 noc 留成 null,于是回落 resolveNoc 走 pg_trgm 相似度,Information systems specialists(21222)
 * 落到了隔壁的 Business systems specialists(21221)。**摆出去的和查回来的不是同一个职业**,
 * 而后面所有职业工具都在按错的那条答 —— 错的不是一个数字,是整份回答的前提。
 *
 * 病根不在模型不听话,在于**我们把一件机器能判死的事押给了模型**:码是我们自己写进那句话的,
 * 回读它是正则的活。同 studyFieldOf 的理由(见上面那段:「模型今天已经证明靠不住,这里不再多押它一次」)。
 * 模型那条规则不删:用户自己敲 5 位码进来时它照旧管用,这里只是把我们自己摆的那份改成不依赖它。
 */
const NOC_IN_TEXT = /(?:^|[^0-9])NOC\s*[:：#]?\s*(\d{5})(?![0-9])/i
export const literalNoc = (text: string): string | null => NOC_IN_TEXT.exec(text || '')?.[1] ?? null

/**
 * 🔴 K08(chat_logs #94 / 基线批跑 R18 两跑同错):「33102 (PSW)」**裸码开头**没有 NOC 字样,
 * literalNoc 不认 → 押给模型,模型抄成 31102,答复整段在按错码答。病根同 literalNoc 那段:
 * 码是用户 literally 打出来的,回读它是正则的活。但裸五位数也可能是工资/数量,所以这里只出
 * **候选**,由调用方拿 noc_descriptions 验真——库里实存才算码,31264 这类工资数不是合法 NOC,
 * 验真就是防误伤的那道闸(「literalNoc 裸码扩围要带库验证」记账即此)。
 * 词面排除:金额前缀($31264)、金额/年薪/时薪后缀(31264 加元 / 31264 a year)、更长数字串的一段。
 */
const BARE_NOC_RE = /(?<![\d.,$￥¥€£])(\d{5})(?![\d.,%])/g
const MONEY_AFTER_RE = /^\s*(?:元|块|万|加币|加元|刀|dollars?\b|CAD\b|USD\b|(?:a|per)\s+year\b|每年|年薪|\/\s*(?:yr|year|h|hr|hour)\b)/i
export const bareNocCandidates = (text: string): string[] => {
  const s = text || ''
  const out: string[] = []
  for (const m of s.matchAll(BARE_NOC_RE)) {
    if (MONEY_AFTER_RE.test(s.slice((m.index ?? 0) + 5))) continue
    out.push(m[1])
  }
  return [...new Set(out)].slice(0, 3)
}

/**
 * 数值槽归一:超出**官方表存在的范围**就当没说(不是夹到边界值)。
 * 夹边界 = 替用户编一个他没说的数;判不了就 null,后面反问一句,代价是他的一次点击。
 */
const numSlot = (raw: unknown, lo: number, hi: number, round = true): number | null => {
  const n = Number(raw)
  if (raw == null || raw === '' || !Number.isFinite(n) || n < lo || n > hi) return null
  return round ? Math.round(n) : n
}
/** 三态布尔:模型给 null/缺字段/说不清 → null(**不折成 false**:false 是一个判定,null 是「还不知道」)。 */
const boolSlot = (raw: unknown): boolean | null => (raw === true ? true : raw === false ? false : null)

/** 自由文本 → Slots(未解析 NOC)。模型输出形状不可信,逐字段归一。 */
export function normalizeSlots(raw: any): Omit<Slots, 'noc'> & { noc: string | null } {
  const occText = String(raw?.occ_en ?? '').trim().slice(0, 80)
  const nocRaw = String(raw?.noc ?? '').trim()
  const provs = Array.from(new Set((Array.isArray(raw?.provs) ? raw.provs : []).map(normProv).filter(Boolean) as string[])).slice(0, 5)
  const expRaw = raw?.exp_months
  const expMonths = typeof expRaw === 'number' && Number.isFinite(expRaw) && expRaw >= 0 && expRaw <= 600 ? Math.round(expRaw) : null
  const statusRaw = String(raw?.status ?? '').trim().toLowerCase()
  const status = ['student', 'graduated', 'working', 'visitor', 'abroad'].includes(statusRaw) ? statusRaw : null
  const claims: SlotClaim[] = (Array.isArray(raw?.claims) ? raw.claims : [])
    .filter((c: any) => typeof c?.text === 'string' && c.text.trim())
    // 🔴 **问句不是主张**(2026-08-05 实测 C06:抽槽位把用户自己那句「毕业后能留下来吗」当成了一条 claim
    //    → checkClaims 给它一个「本站尚未收录」→ 答复第一句变成一句没主语的「本站尚未收录这项数据」,
    //    正对着 Frank 那句「第一句在不在回答问题」)。别人跟你说的话不会是个问句,机械判得掉就别留给模型。
    .filter((c: any) => !/[?？]\s*$|(?:吗|呢)\s*[?？]?\s*$|까요\s*[?？]?\s*$/.test(String(c.text).trim()))
    // 🔴 **自述家庭状况不是主张**(见 isSelfStatement 上面那段:2026-08-06 实测「老婆和两个孩子一起过来」
    //    被当成主张,还被安上了一句「这条金额谁也核不了」)。机械判掉,不留给模型。
    .filter((c: any) => !isSelfStatement(String(c.text)))
    .map((c: any): SlotClaim => {
      const p = normProv(c.province)
      const text = c.text.trim().slice(0, 160)
      // 🔴 私人承诺按**原话**改判,不信模型给的 topic(chatTools 的 PRIVATE_PROMISE,**复用不重写**:
      //    两份词表迟早分叉)。为什么在这儿判:topic 是模型猜的,「中介说曼省有合作公司」它给过 ops,
      //    也给过 other。归进专桶后不查不相干的官方表,见客层直接说明私人承诺不能当作官方保证。
      //    放在 normalizeSlots 是因为这是 topic 归一的唯一入口:slots 一改,前端与下游全都一致。
      const topic = PRIVATE_PROMISE.test(text) ? 'private-promise' : normTopic(c.topic)
      return { text, topic, ...(p ? { province: p } : {}) }
    })
    .slice(0, 5)
  const eduRaw = String(raw?.edu ?? '').trim()
  return {
    noc: /^\d{5}$/.test(nocRaw) ? nocRaw : null, occText, provs, expMonths, status, claims,
    // 年龄下限取官方 CRS 年龄表的最低档(17 岁以下同一档),上限给个人活得到的岁数;越界一律当没说
    age: numSlot(raw?.age, 14, 99),
    married: boolSlot(raw?.married),
    // CLB 官方档位到 10 为止(10 以上仍按 10 计分),12 只是留个余量;0 不是一个档
    clb: numSlot(raw?.clb, 1, 12),
    edu: (EDU_KEYS as string[]).includes(eduRaw) ? (eduRaw as EduKey) : null,
    eduYears: numSlot(raw?.eduYears ?? raw?.edu_years, 0.5, 12, false),
    canadaStudy: boolSlot(raw?.canadaStudy ?? raw?.canada_study),
    studyProvince: normProv(raw?.studyProvince ?? raw?.study_prov),
  }
}

/** 判定层要的**档案槽**(不含职业/省份:那两样另有各自的红线)。缺槽计数与反问都只数这几个。 */
export const PROFILE_SLOTS = ['age', 'clb', 'edu', 'married', 'canadaStudy', 'expMonths', 'eduYears', 'studyProvince'] as const
export type ProfileSlot = (typeof PROFILE_SLOTS)[number]
/** 有值的档案槽(`married: false`、`expMonths: 0` 都算**有值** —— 它们是判定,不是缺失)。 */
export const filledProfileSlots = (s: Partial<Slots>): ProfileSlot[] =>
  PROFILE_SLOTS.filter((k) => s[k] != null)

const OTHER_PROVINCES_RE = /(?:其他|别的|其它|其余).{0,4}省|other provinces?|elsewhere|다른.{0,4}(?:주|지역)/i

/**
 * 多轮的结构化接线。历史正文只负责让模型理解“那这个呢”这类指代；已经确认过的职业、身份和经验
 * 由上一轮服务端 slots 滚动带回，不能每轮重新赌模型会不会从截断文本里猜出来。
 *
 * 当前轮明确说了新职业时，旧 NOC 必须清掉再解析；明确问“其他省”时也不能把旧省硬塞回来。
 * claims 不继承：上一轮别人说过的话不能在每个后续问题里重复对账。
 */
export function mergeFollowupSlots(
  current: Omit<Slots, 'noc'> & { noc: string | null }, rawPrevious: unknown, text: string,
): Omit<Slots, 'noc'> & { noc: string | null } {
  if (!rawPrevious || typeof rawPrevious !== 'object') return current
  const p = rawPrevious as Record<string, unknown>
  const previous = normalizeSlots({
    occ_en: p.occText, noc: p.noc, provs: p.provs, exp_months: p.expMonths, status: p.status,
    // 档案槽同样滚动带回:「我 40 岁 CLB6…」说过一次之后,追问「那安省呢」不该把年龄和语言丢了
    // (丢了 = 下一轮缺槽 → 又反问一遍已经答过的问题)。职业那条「说了新职业就清掉旧 NOC」的
    // 覆盖逻辑在这里用不上:一个人的年龄/学历不会因为换个问法就变成另一个值,当轮说了新值自然覆盖。
    age: p.age, married: p.married, clb: p.clb, edu: p.edu,
    edu_years: p.eduYears, canada_study: p.canadaStudy, study_prov: p.studyProvince,
  })
  const changedOccupation = Boolean(current.occText || current.noc)
  return {
    noc: current.noc ?? (changedOccupation ? null : previous.noc),
    occText: current.occText || previous.occText,
    provs: current.provs.length ? current.provs : (OTHER_PROVINCES_RE.test(text) ? [] : previous.provs),
    expMonths: current.expMonths ?? previous.expMonths,
    status: current.status ?? previous.status,
    claims: current.claims,
    age: current.age ?? previous.age,
    married: current.married ?? previous.married,
    clb: current.clb ?? previous.clb,
    edu: current.edu ?? previous.edu,
    eduYears: current.eduYears ?? previous.eduYears,
    canadaStudy: current.canadaStudy ?? previous.canadaStudy,
    studyProvince: current.studyProvince ?? previous.studyProvince,
  }
}

/**
 * 职名 → 5 位 NOC(照 api/resume/route.ts 的 pg_trgm 做法:在库在招职位标题比官方类名更贴用户用语)。
 * 命中不了就返回 null —— **工具层硬门槛是 5 位码,猜一个等于给别人算命**。
 */
export async function resolveNoc(pool: any, occEn: string): Promise<{ noc: string; title: string } | null> {
  const q = occEn.trim().slice(0, 80)
  if (q.length < 3) return null
  const { rows } = await pool.query(
    `SELECT j.noc, max(similarity(j.title, $1)) AS sim, count(*) AS n
     FROM jobs j WHERE j.noc IS NOT NULL AND j.noc <> '' AND similarity(j.title, $1) > 0.4
     GROUP BY j.noc ORDER BY sim DESC, n DESC LIMIT 1`, [q]).catch(() => ({ rows: [] }))
  let noc = String(rows[0]?.noc ?? '')
  if (!/^\d{5}$/.test(noc)) {
    // 兜底:官方 NOC 类名(在招岗位里没这个工种时仍能认出来,如冷门职业)
    const { rows: d } = await pool.query(
      `SELECT noc FROM noc_descriptions WHERE similarity(title, $1) > 0.4 ORDER BY similarity(title, $1) DESC LIMIT 1`, [q],
    ).catch(() => ({ rows: [] }))
    noc = String(d[0]?.noc ?? '')
  }
  if (!/^\d{5}$/.test(noc)) return null
  const { rows: t } = await pool.query(`SELECT title FROM noc_descriptions WHERE noc = $1 LIMIT 1`, [noc]).catch(() => ({ rows: [] }))
  return { noc, title: String(t[0]?.title ?? '') }
}

// ── 🔴 「说了专业但没说职位名」不许是死路 ───────────────────────────────────────
//
// 2026-08-06 实测:`studying IT at a Toronto college, can I stay?` → noOcc 反问「说说你做什么工作」。
// 用户说的是**在读专业**,不是职业,而 resolveNoc 只认职位名 —— 而这正是挂件第一条示例问题的形状
// (「Ontario college grad, software dev…」说职业能答,「读 IT」就答不了)。他明明说清楚了自己的情况,
// 回来一句「说说你做什么工作」,读起来就是这个产品坏了。
//
// 红线不动:**5 位 NOC 拿不准就不许填**(猜错一位,下面所有职业工具都在答另一个人的问题)。所以修的不是
// 「猜得更狠」,而是**反问得更有用**:把专业引到几个候选职业上,让他点一下就走回正轨。
// 三条实现约束:
//   ① 候选**从库里查**(noc_descriptions.requirements 里点名了这个专业、且现在真有在招岗位的职业),
//      按在招量排序 —— 不现编、不写死清单,库变它就变;
//   ② 专业词识别是**纯函数**(studyFieldOf):模型今天已经证明靠不住(claims 那条),这里不再多押它一次;
//   ③ 一个候选都查不到 → 照旧 noOcc(「随便打了句问候」仍然走原路,不能因为这条改动变成瞎猜)。
// 认出来了也不算数的词:学校/地名/学历本身不是专业(「college grad」抽出 college 毫无用处)
const STUDY_STOP =
  // ⚠️ 「it」不许进这张表:用户说的 IT 就是我们要认的那个专业(实测那句英文原话的病根)
  /^(?:a|an|the|my|at|in|here|now|this|that|and|college|university|school|canada|ontario|toronto|vancouver|montreal|calgary|ottawa|abroad|大学|大专|学院|学校|书|专业|课程|研究生|硕士|本科|留学|移民|工作|毕业|加拿大|多伦多|温哥华)$/i
const STUDY_PATTERNS: RegExp[] = [
  // 英文:studying X / majoring in X
  /\b(?:studying|studied|study|majoring in|majored in|major in|enrolled in|taking|doing)\s+(?:a|an|the|my)?\s*([A-Za-z][A-Za-z&+.'-]*(?:\s+[A-Za-z][A-Za-z&+.'-]*){0,2}?)(?=\s+(?:at|in|program|programme|diploma|degree|course|major|student|now)\b|[,.;!?]|$)/gi,
  // 英文:degree/diploma/program in X
  /\b(?:degree|diploma|programme|program|major|certificate)\s+in\s+([A-Za-z][A-Za-z&+.'-]*(?:\s+[A-Za-z][A-Za-z&+.'-]*){0,2}?)(?=[,.;!?]|\s+(?:at|from)\b|$)/gi,
  // 英文:X student / X major / X grad
  /\b([A-Za-z][A-Za-z&+.'-]*(?:\s+[A-Za-z][A-Za-z&+.'-]*){0,2}?)\s+(?:student|major|graduate|grad)\b/gi,
  // 中文:X 专业 / X 系
  /([A-Za-z]{2,20}|[一-鿿]{2,8})\s*(?:专业|系|方向)/g,
  // 中文:读 X / 念 X / 修 X(「学院」「学校」不是「学 X」——学 后面跟 院校生历位术 一律不算)
  /(?:读|念|修)(?:的是)?\s*([A-Za-z]{2,20}|[一-鿿]{2,8})/g,
  /学(?![院校生历位术])(?:的是)?\s*([A-Za-z]{2,20}|[一-鿿]{2,8})/g,
  // 韩文:X 전공 / X 학과
  /([A-Za-z]{2,20}|[가-힣]{2,10})\s*(?:전공|학과)/g,
]
/**
 * 自由文本 → 在读专业(纯函数;认不出返回空串)。**只在 resolveNoc 已经失败之后才用**,
 * 所以宁可宽一点:误判的代价是多问一句(候选查不到就回落 noOcc),漏判的代价是用户撞死路。
 */
export function studyFieldOf(text: string): string {
  const s = text.trim().slice(0, MAX_TEXT)
  for (const re of STUDY_PATTERNS) {
    for (const m of s.matchAll(re)) {
      const raw = (m[1] ?? '').trim().replace(/[.,;:!?、,。]+$/, '')
      // 逐词过滤,不整串比:「Ontario college grad」抽出来的是「Ontario college」,整串不在词表里,
      // 拆开看就露馅了(地名 + 学校,一个专业词都没有)。
      if (raw && raw.length <= 40 && !raw.split(/\s+/).some((w) => STUDY_STOP.test(w))) return raw
    }
  }
  return ''
}
/**
 * 专业词 → **noc_descriptions 用的那种说法**(那张表的 requirements 是官方英文)。
 * 只翻译**检索词**,不翻译答案:候选职业仍然一条条来自库。收得很窄 —— 短到没法直接检索的缩写
 * (IT 拿去 ILIKE 会匹配上所有带 it 的字)与中/韩文说法,其余原样拿去查。
 */
const FIELD_TERM: [RegExp, string][] = [
  [/^(?:it|i\.t\.|ict)$|信息技术|資訊|정보기술|아이티/i, 'information technology'],
  [/^cs$|computer science|computing|计算机|電腦|电脑|컴퓨터/i, 'computer science'],
  [/software|软件|軟體|소프트웨어/i, 'computer science'],
  [/nurs|护理|護理|간호/i, 'nursing'],
  [/culinar|cook|chef|烹饪|烹飪|厨师|厨艺|요리|조리/i, 'culinary'],
  [/auto\s?mechanic|automotive|汽修|汽车维修|汽車維修|자동차 정비/i, 'automotive'],
  [/weld|焊/i, 'welding'],
  [/carpent|木工|木匠|목공/i, 'carpentry'],
  [/account|会计|會計|회계/i, 'accounting'],
  [/early childhood|幼教|幼儿教育|유아교육/i, 'early childhood'],
  [/hospitality|hotel|酒店管理|호텔/i, 'hospitality'],
  [/electric|电工|電工|전기/i, 'electrical'],
  [/business admin|商科|工商管理|경영/i, 'business administration'],
]
export const fieldSearchTerm = (field: string): string => {
  const f = field.trim()
  for (const [re, term] of FIELD_TERM) if (re.test(f)) return term
  return /^[A-Za-z][A-Za-z &+.'-]{2,}$/.test(f) ? f : ''      // 拉丁文长词原样查;认不出的中/韩文放弃
}

export type OccOption = { noc: string; title: string; label: string }
/**
 * 专业 → **库里真有数据的候选职业**(≤3 条)。判据两条,都只认可证的:
 *   ① 官方 NOC 说明的入职要求(或职业名本身)点名了这个专业;② 这个职业现在真有在招岗位。
 * 管理类(NOC 0xxxx)排除:一个刚毕业的人问「读 IT 能做什么」,答「高级商务经理」是噪音不是答案。
 */
export async function suggestOccupations(pool: any, field: string, lang: ChatLang, limit = 3): Promise<OccOption[]> {
  const term = fieldSearchTerm(field)
  if (term.length < 3) return []
  const run = async (q: string) => {
    const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`
    const { rows } = await pool.query(
      `SELECT d.noc, COALESCE(d.title, '') title, COALESCE(d.title_zh_short, '') zh,
              COALESCE(d.title_ko_short, '') ko, COALESCE(d.title_en_short, '') en, count(*)::int n
       FROM noc_descriptions d JOIN jobs j ON j.noc = d.noc AND j.status = 'open'
       WHERE d.noc NOT LIKE '0%' AND (d.requirements ILIKE $1 OR d.title ILIKE $1)
       GROUP BY d.noc, d.title, d.title_zh_short, d.title_ko_short, d.title_en_short
       HAVING count(*) >= 5
       ORDER BY count(*) DESC LIMIT $2`, [like, limit + 2]).catch(() => ({ rows: [] }))
    // 垫底那条不是候选,是噪音:「读 IT」的官方要求文本会连带命中「图书档案技术员」(8 个岗,榜首 112)。
    // 判据用**相对量**不用绝对量 —— 冷门专业整行都小,写死一个门槛会把它的真候选一起砍掉。
    const top = Number(rows[0]?.n ?? 0)
    return (rows as any[]).filter((r) => Number(r.n) >= top * 0.1).slice(0, limit)
  }
  let rows = await run(term)
  // 「culinary arts」这种整词查不到 → 退一步用里面最长的那个词(还是同一句话里的词,不是我们另编的)
  if (!rows.length) {
    const w = term.split(/\s+/).filter((x) => x.length >= 4).sort((a, b) => b.length - a.length)[0]
    if (w && w !== term) rows = await run(w)
  }
  return rows
    .map((r) => ({
      noc: String(r.noc),
      title: String(r.title || ''),
      label: String((lang === 'zh' ? r.zh : lang === 'ko' ? r.ko : r.en) || r.title || ''),
    }))
    .filter((o) => o.title && o.label)
}
/** 反问文案(三语,和 LBL/AVAIL_SENTENCE 同一层:见客的话在数据层写死,不过模型)。 */
// 中文里拉丁词两侧留空格(全站排版惯例),中文专业名后面不留 —— 「IT 是专业」对,「护理 是专业」不对
const latinTail = (f: string) => (/[A-Za-z0-9]$/.test(f) ? `${f} ` : f)
const ASK_OCC: Record<ChatLang, (field: string, opts: string[]) => string> = {
  zh: (f, o) => `${latinTail(f)}是专业,不是能直接查的职业。本站数据里对得上的职业有:${o.join('、')}。你想按哪一个查?`,
  en: (f, o) => `${f} is a field of study, not an occupation we can look up. In our data it points to these occupations: ${o.join(', ')}. Which one should we use?`,
  // 「는/은」的选择跟专业名末字的收音走,而专业名是用户给的 —— 用破折号绕开,省得写出一句韩语病句
  ko: (f, o) => `${f} — 전공이지 바로 조회할 수 있는 직업이 아닙니다. 본 사이트 데이터에서 연결되는 직업은 ${o.join(', ')}입니다. 어느 쪽으로 조회할까요?`,
}
/**
 * 追问 chip:点一下就把职业说清楚。**5 位码写在 chip 里**(站规的「人话名 + 代码小注」)——
 * 下一轮 SLOT_SYSTEM 那条「用户literally 打出了 5 位数字才填 noc」于是成立,职业**一字不差**地落回
 * 我们查出来的那一条。不写码的话下一轮走 pg_trgm 相似度:2026-08-06 实测,给的是
 * Information systems specialists(21222),回来落到了隔壁的 Business systems specialists(21221)——
 * 摆出去的和查回来的不是同一个职业,那是我们自己制造的一次错位。
 */
const OCC_PICK: Record<ChatLang, (o: OccOption) => string> = {
  zh: (o) => `按${o.label}(NOC ${o.noc})查`,
  en: (o) => `Look it up for ${o.title} (NOC ${o.noc})`,
  ko: (o) => `${o.label}(NOC ${o.noc}) 기준으로 조회해 주세요`,
}
export const askOccupation = (field: string, opts: OccOption[], lang: ChatLang): ChatResult => ({
  answer: ASK_OCC[lang](field, opts.map((o) => o.label)),
  slots: { noc: null, occText: field, provs: [], expMonths: null, status: null, claims: [] },
  facts: [],
  followups: opts.map((o) => OCC_PICK[lang](o)),
})

/**
 * 🔴 **用法类问句不该被 noOcc 怼回去**(D1;2026-08-09 生产实录 chat_logs #51/#53/#55/#54:
 * /start 三张表的「问一句」CTA 预填句 `se.ask.lmia|named|aip` 全部撞 noOcc —— 自家导流句撞自家闸)。
 * 他问的是**这张表是什么、对我有什么用**,还没到说职业那一步;反问「说说你做什么工作」等于答非所问。
 *
 * 判据两半**都要命中**才算(误判代价不对称:少认一句 = 照旧反问,多认一句 = 该反问的被糊弄过去):
 *   ① 主语是本站这几张雇主表里的东西(LMIA / AIP / 雇主 / 清单 / 表);
 *   ② 问的是「是什么 / 有什么用 / 意味着什么」这类用法与定义。
 * 「什么工作好移民」「怎么找愿意担保的雇主」这类只中一半,照旧走原路。
 * 还有一道**位置上的**保险:这个分支只长在 resolveNoc 失败之后(见 orchestrate ②),
 * 说得出职业的一律走正常查询,连判都不判。
 */
const USAGE_SUBJ_RE =
  /LMIA|\bAIP\b|雇主|僱主|清单|清單|名单|名單|这[张个]表|這[張個]表|employer|shortage list|\btable\b|\blist\b|고용주|목록|명단|\b표\b/i
const USAGE_INTENT_RE =
  /有(?:什么|什麼|啥)用|有用吗|有用嗎|意味着什么|意味著什麼|是什么|是什麼|什么意思|什麼意思|怎么用|怎麼用|怎么看|怎麼看/i
const USAGE_INTENT_EN_RE =
  /\bwhat (?:is|are|does|do)\b|\bhow (?:does|do|can)\b.{0,40}\b(?:help|use|work)|\buseful\b|\bwhat\b.{0,20}\bmean\b/i
const USAGE_INTENT_KO_RE = /어떤 (?:도움|의미)|무엇인가요|무엇입니까|뭔가요|도움이 되나요|어떻게 (?:쓰|사용|활용)/
/** 这句话在问「本站这张表是什么、对我有什么用」吗(纯函数,不问模型)。 */
export const isUsageQuestion = (text: string): boolean => {
  const s = (text || '').trim()
  if (!s) return false
  return USAGE_SUBJ_RE.test(s)
    && (USAGE_INTENT_RE.test(s) || USAGE_INTENT_EN_RE.test(s) || USAGE_INTENT_KO_RE.test(s))
}

type UsageTopic = 'lmia' | 'aip' | 'employer'
const usageTopicOf = (text: string): UsageTopic =>
  (/LMIA/i.test(text) ? 'lmia' : /\bAIP\b/i.test(text) ? 'aip' : 'employer')
/** 用法答复的文案(三语,和 ASK_OCC / AVAIL_SENTENCE 同一层:见客的话在数据层写死,不过模型)。
 *  只说这张表**是什么**,不说任何数字 —— 这一轮一个工具都没查,没有 facts 就没有数可说。 */
const USAGE_WHAT: Record<ChatLang, Record<UsageTopic, string>> = {
  zh: {
    lmia: 'LMIA 获批雇主指这家雇主为外籍雇员申请过劳动力市场影响评估并获批,也就是它办过这套手续。',
    aip: 'AIP 指定雇主指经省政府指定、可按大西洋移民试点雇用外籍雇员的雇主。',
    employer: '本站的雇主表按职业排:同一个职业下有哪些雇主在招、雇主在哪个省、该省清单收没收这个职业。',
  },
  en: {
    lmia: 'An LMIA-approved employer is one that has applied for and received a Labour Market Impact Assessment for a foreign worker, so it has been through that process before.',
    aip: 'An AIP designated employer is one designated by a provincial government to hire foreign workers under the Atlantic Immigration Program.',
    employer: 'Our employer tables are organised by occupation: which employers are hiring for it, which province they are in, and whether that province lists the occupation.',
  },
  ko: {
    lmia: 'LMIA 승인 고용주는 외국인 근로자를 위해 노동시장영향평가를 신청해 승인받은 고용주, 즉 그 절차를 거쳐 본 고용주입니다.',
    aip: 'AIP 지정 고용주는 대서양 이민 프로그램으로 외국인 근로자를 채용하도록 주정부가 지정한 고용주입니다.',
    employer: '본 사이트의 고용주 표는 직업 기준입니다: 어떤 고용주가 그 직업을 채용 중인지, 어느 주에 있는지, 그 주 목록에 해당 직업이 있는지.',
  },
}
/** 答完用法就把话头递回职业:这一步不做,用户下一句照样撞 noOcc。 */
const USAGE_ASK: Record<ChatLang, string> = {
  zh: '告诉我你的职业或 NOC 码,我按这个职业查哪些雇主在招、哪些省的清单收了它。',
  en: 'Tell us your occupation or NOC code, and we will check which employers are hiring for it and which provinces list it.',
  ko: '직업이나 NOC 코드를 알려 주시면 해당 직업을 채용 중인 고용주와 그 직업을 목록에 올린 주를 조회해 드립니다.',
}
/**
 * 用法类问句的 guide 型答复:形态照 askOccupation(自己写死的话 + 空 facts + 不进模型),
 * **不是**一条新的答复形态。slots 原样带出去(省份/身份这些他已经说过的,下一轮 context 还接得住),
 * 但 noc 一定是 null —— 这一轮确实没认出职业,不许在这儿假装认出来了。
 */
export const answerUsage = (text: string, lang: ChatLang, slots: Omit<Slots, 'noc'> & { noc: string | null }): ChatResult => ({
  answer: `${USAGE_WHAT[lang][usageTopicOf(text)]}${lang === 'en' ? ' ' : ''}${USAGE_ASK[lang]}`,
  slots: { ...slots, noc: null },
  facts: [],
  followups: [],
})

// ── 第二步:调工具 → 压平成 Fact[] ─────────────────────────────────────────

/**
 * 🔴 四态 → **用户语言的成句说法**,在数据层就写死(清洗下沉,CLAUDE.md 那条铁律的同一个道理)。
 *
 * 为什么不让模型自己转述:2026-08-04 实测,把英文枚举丢给它翻译,它会把两条**状态不同**的主张
 * 揉成一句 ——「关于中介收 2 万及所谓合作公司的说法,本站未收集此类数据」:
 * 「收 2 万」确实是本站没收录,但「曼省有合作公司」是**官方根本不公布**这类名单。
 * 合并 = 撒谎,而且撒的正是中介最爱钻的那个空子(用户以为「你们没查到」,实际是「谁承诺都没有官方依据」)。
 * 所以句子由我们写好,模型只负责照抄 —— 括号里那半句是防合并的锚点,别删。
 */
const AVAIL_SENTENCE: Record<ChatLang, Record<Availability, string>> = {
  zh: {
    ok: 'ok',
    'not-published': '官方不公布这项数据(不是本站没查到)',
    'not-collected': '本站尚未收录这项数据(不是官方没有)',
    'not-applicable': '不适用:该省不走省提名这套制度',
  },
  en: {
    ok: 'ok',
    'not-published': 'the government does not publish this (not that we failed to find it)',
    'not-collected': 'our site has not indexed this yet (not that the government has none)',
    'not-applicable': 'not applicable: this province is outside the provincial nominee system',
  },
  ko: {
    ok: 'ok',
    'not-published': '정부가 공개하지 않는 항목입니다(본 사이트가 못 찾은 것이 아닙니다)',
    'not-collected': '본 사이트가 아직 수집하지 않았습니다(정부에 자료가 없다는 뜻이 아닙니다)',
    'not-applicable': '해당 없음: 이 주는 주정부 이민 제도 밖입니다',
  },
}
/**
 * 主张行 = [前缀, 连接词]:拼出来是**一句能整句照抄的第二人称话**
 * (「有人跟你说「中介说曼省有合作公司」——官方不公布这项数据(不是本站没查到)」)。
 * 第一版把四态只塞进 valueText、label 留英文速记,模型照样把两条揉成一句;
 * 做成成品句之后它才肯一条一句地抄。findMergedStates 靠 unit==='claim' 认行,不靠这两个字。
 */
// ⚠️ 英文那条 2026-08-04 生产实录断在这儿:`You were told "…" our site has not indexed this yet` ——
// 破折号被模型抄丢了,两个分句直接怼一起,读起来是病句。改成**冒号收口**:即使模型只抄了词,
// 「On what you were told ("X"): the government does not publish this」本身就是一句完整的话,不靠标点续命。
const CLAIM_LEAD: Record<ChatLang, [string, string, string]> = {   // [开头, 收尾, 接四态的连接]
  // 「有人跟你说「X」」是记录口吻,不是说话口吻;照抄出去就是一句公文。改成「你听到的「X」这句话——…」,
  // 整句抄下来读起来就是 Frank 要的那个调子(「老板口头说帮你办,这句话本身没法核实——…」)。
  // 连接词保持中性:availability='ok' 的主张接的是「这条可以拿下面的官方数字对照」,不能预设「核不了」。
  zh: ['你听到的「', '」这句话', '——'],
  en: ['On what you were told ("', '")', ': '],
  ko: ['「', '」라고 들으신 건', ' — '],
}
/** 私人报价是交易条件,不是一项政府数据。见客时直接回答它能不能证明结果,不套 Availability。 */
export const MONEY_WHY: Record<ChatLang, string> = {
  zh: '报价本身不能证明对方承诺的结果能办成;真正可核的是下面的官方清单和门槛',
  en: 'A quoted fee does not prove that the promised outcome will happen; check the published lists and requirements below instead',
  ko: '제시된 수수료만으로 약속한 결과가 이루어진다는 뜻은 아닙니다. 아래의 공식 목록과 요건을 확인해야 합니다',
}
/**
 * 私人承诺的解释句 —— **见客文案的单一来源在这一层**,不在工具层。
 *
 * C1 的 `PRIVATE_PROMISE_WHY` 是中文硬编码(它那层的 `checkClaims` 签名里根本没有 lang,
 * 硬塞进去等于把语言关注点下沉到不该管它的层)。工具层给的**稳定标识**是 `topic === 'private-promise'`,
 * 见客的话由这里按用户语言出 —— 和 AVAIL_SENTENCE / LBL 一个道理。88% 是英文流量,这条尤其不能凑合。
 *
 * 私人销售承诺不是一项待查的政府数据。这里直接回答「能不能当保证」,再把读者带回真正可核的门槛。
 */
export const PROMISE_WHY: Record<ChatLang, string> = {
  zh: '这类私人承诺不能当作官方保证;真正可核的是下面的官方清单和门槛',
  en: 'A private promise is not an official guarantee; check the published lists and requirements below instead',
  ko: '이런 사적인 약속은 공식 보장이 아닙니다. 아래의 공식 목록과 요건을 확인해야 합니다',
}

/** fact.label 的硬帽(见 fact():prompt 预算、降级清单、前端出处表共用同一个上限)。 */
export const LABEL_CAP = 320
const QUOTE_CAP = 60      // 原话的常规上限;真给多少由 claimLabel 现算(解释句先留够)
const MIN_QUOTE = 24      // 截到比这还短就不叫「引他的原话」了 —— 三语今天都够不着这条底线,claimLabel 那组断言盯着
/**
 * 🔴 **该截的是原话,不是尾巴**。
 *
 * 2026-08-07 实测 C14 英文:主张行撞 320 帽,结尾断成 `…, not a private promi.` ——
 * 被砍掉的正是这个产品对中介最有力的半句(「省提名只认官方条款,不认私下承诺」),一刀把它变成了错别字。
 * 病根是 `slice(0, 320)` 只会从尾巴上砍,而尾巴恰恰是**我们自己写的见客文案**。
 *
 * 所以按来源分工:原话长度由用户决定(不可控,可截,截了必留省略号 —— 别让他以为我们改了他的话);
 * 引导词 / 四态成句 / 解释句是我们写的,**一个字都不许少**。先把固定部分占掉的额度扣干净,剩下多少才给原话。
 * **不把帽调大**:调大只是把同一刀推到更长的下一句上;帽也不必按行类型分档 —— 扣完固定部分,
 * 三语最紧的一档(en + PROMISE_WHY)还剩 59 字给原话,320 够用,分档只是多一个会分叉的旋钮。
 */
export function claimLabel(lead: string, text: string, close: string, rest: string, cap = LABEL_CAP): string {
  const room = Math.max(MIN_QUOTE, Math.min(QUOTE_CAP, cap - (lead.length + close.length + rest.length)))
  return `${lead}${text.length > room ? `${text.slice(0, room - 1)}…` : text}${close}${rest}`
}
const sepOf = (l: ChatLang) => (l === 'en' ? '. ' : '。')
/** 报价走交易判断;真正未收录的普通主张才走 Availability。 */
export function otherClaimLabel(text: string, lang: ChatLang): string {
  const [lead, close, dash] = CLAIM_LEAD[lang]
  const money = isMoneyTalk(text)
  return claimLabel(lead, text, close, `${dash}${money ? MONEY_WHY[lang] : AVAIL_SENTENCE[lang]['not-collected']}`)
}

/** 收费与包办话术合成一条结论,避免同一问答连续念两遍“无法核实”。 */
export function commercialClaimLabel(texts: string[], lang: ChatLang): string {
  const [lead, close, dash] = CLAIM_LEAD[lang]
  const unique = [...new Set(texts.map((x) => x.trim()).filter(Boolean))]
  const joiner = lang === 'en' ? '; ' : lang === 'ko' ? '; ' : ';'
  const quoted = unique.join(joiner)
  const promise = unique.some((x) => PRIVATE_PROMISE.test(x))
  return claimLabel(lead, quoted, close, `${dash}${promise ? PROMISE_WHY[lang] : MONEY_WHY[lang]}`)
}

/**
 * C1 的 note/why **全是中文硬编码**(DRAWS_POLICY / OPS_POLICY / OK_WHY / 各 lookup 的 note,
 * 2026-08-04 逐条核过),它们经 valueText 进 prompt,英文用户就会在英文答复里读到半句中文。
 * 工具层语言中立是对的 —— 所以这里定规矩:**C1 的中文注只给中文用户看**,en/ko 一律不带。
 * 代价是英文答复少一句取证注(四态成句已经把「不公布 vs 没收录」说清了);收益是不出中英夹生。
 */
const zhOnly = (s: string | undefined, lang: ChatLang) => (lang === 'zh' ? (s ?? '') : '')

/** 出口回读用:模型会换个说法(「未收集」不是「未收录」),所以按**语义标记**认,不按原句认。 */
export const AVAIL_MARKERS: Record<ChatLang, Record<Exclude<Availability, 'ok'>, string[]>> = {
  zh: {
    // 私人承诺那句(PROMISE_WHY)不含「不公布」三个字,但它就是 not-published 的意思,而且说得更透
    'not-published': ['不公布', '不发布', '未公布', '未发布', '不对外公布', '不披露', '没有任何一级政府公布', '谁也核不了'],
    'not-collected': ['未收录', '尚未收录', '未收集', '没有收录', '未索引', '暂未收录', '未收集此类'],
    'not-applicable': ['不适用', '不走这套', '不属于省提名'],
  },
  en: {
    'not-published': ['does not publish', 'is not published', 'not published', 'do not publish', 'no government publishes', 'nobody can check'],
    'not-collected': ['not indexed', 'has not indexed', 'unindexed', 'not collected', 'no data on', 'not in our index'],
    'not-applicable': ['not applicable', 'outside the provincial nominee'],
  },
  ko: {
    'not-published': ['공개하지 않', '공표하지 않', '발표하지 않', '공개하는 정부는 없', '확인할 수 없'],
    'not-collected': ['수집하지 않', '수집되지 않', '색인되지 않'],
    'not-applicable': ['해당 없음', '대상이 아닙'],
  },
}
/**
 * 商业话术那条主张的**判断**有没有被说出口 —— 同 AVAIL_MARKERS 一个道理:按语义认,不按原句认。
 *
 * 🔴 2026-08-05 实测这个洞:facts 里给的是「这类私人承诺不能当作官方保证」(PROMISE_WHY),
 * 模型写出来的是「中介收取的 2 万费用及所谓合作公司承诺并非官方要求,**本站无此记录**」——
 * 把交易判断换成了四态口吻。而 collectFacts ⑦ 之所以**不**给商业话术套四态,防的正是这一句:
 * 「本站未收录」= 我们的问题,他该去官网看;「私人承诺不能当官方保证」= **对方的问题**,他该警惕。
 * 两句在用户那里意思相反,说反等于拿假前提教他防中介(CLAUDE.md 那条铁律的同一个坑)。
 *
 * 为什么 missingClaimLines 原来放行:它只在主张带四态时才要求答复复述状态,而商业话术那行没有四态,
 * 于是「提到了这条主张」就算过 —— 判断说成什么样都行。这里给它补上该有的那把尺。
 */
export const VERDICT_MARKERS: Record<ChatLang, string[]> = {
  zh: ['不能当作', '不能证明', '不是官方保证', '不等于官方', '不构成官方', '并不保证', '没有官方效力'],
  en: ['not an official guarantee', 'does not prove', 'do not prove', 'does not guarantee', 'no official standing', 'is not official'],
  ko: ['공식 보장이 아', '증명하지 않', '보장하지 않', '공식적인 효력이 없'],
}
/**
 * 🔴 fact 的 label 也按用户语言成句(和 AVAIL_SENTENCE 同一个做法)。
 *
 * 为什么必须在**数据层**做:label 有两个下游 —— 喂模型的 FACTS 块,和 guard 失败时的**降级清单**。
 * 降级清单是我们自己写的字,英文 label 直接就是见客事故(2026-08-04 实测红过一次:
 * 用户看到「apprentice-friendly openings for NOC 72310」「index scope note」)。
 * 把英文 label 丢给下游各自想办法 = 每个下游都得自己翻一遍,漏一个就露一次。
 *
 * factor 那几条尤其要连主语一起写死:实测模型把 empYears「雇主经营年限」读成「申请人要 3 年经验」,
 * 一句话把结论说反 —— 主语必须长在标签里。
 *
 * 🔴 2026-08-05 改形状(Frank:「现在这回答不像人话」):门槛类 label 从**字段名**改成**半句话**。
 * 病根不在 RULE 而在喂进去的形状 —— `X 要求申请人要达到的语言等级(CLB) = 5 CLB` 是一行表格,
 * **给它表格它就还你表格**(生产实录整段答复就是逐行念字段名)。现在 label 写成一句话的前半截,
 * 值接上去就是完整的一句(`NS 要求申请人的语言达到` + `5 CLB`),模型抄到的已经是人话。
 * 同一个字典还要撑住**出处表**(前端左列 label、右列数值)—— 半句话在表里读作「名目」,
 * 在 prompt 里读作「句子」,一份文案两处都成立,不必养两套词表(养了必分叉)。
 * 计数类(岗位数/池子/抽选)保持「名目」形态,由 factLine 用冒号接值 —— `=` 一律不进 prompt。
 */
type LabelDict = {
  apprOpenings: string; apprSub: string; openPostings: string; qcOutside: string; indexNote: string; checked: string
  listIn: string; listEx: string; occList: string; officialReq: string; claimOk: string
  /** 查过了但一条都没命中(availability='ok' 却没有行):不是「不公布」也不是「没收录」 */
  noneFound: string
  pass: string; fail: string; unknown: string; short: string
  drawCut: string; drawInv: string; draws: string; opsStats: string
  eeCat: string; eeAll: string; unsaid: string
  federalRule: string; federalGap: string; crsPoint: string; fswPoint: string
  opsKeys: Record<string, string>
  /** 半句话:`${省码} ${factor}` + 值 = 一句完整的话。主语(申请人 / 雇主)必须长在里面。 */
  factor: Record<string, string>
  /** op='none' = 官方明说这条通道**不设**这项门槛。与 factor 分开:两句话意思相反,共用模板就会说反。 */
  factorNone: Record<string, string>
  /** languageExempt 且 unit=years:值是**毕业年限**不是语言等级(ON 那行 value=3 unit=years)——
   *  套 factor 模板会拼出「豁免语言的等级是 3 years」,年限被读成等级。整句在这儿拼好,值嵌句中。 */
  exemptYears: (n: number) => string
  /**
   * 时间线(lookupPlan)。全是**名目**形态(sayFact 用冒号接值),不是半句话 ——
   * 一条路上可能有两段同类,名目里必须写清是哪一段,不然读者对不上号。
   *  planGap:门槛缺口按因素分(key='' 是认不出因素时的兜底);
   *  planTotal / planLower:**两个不同的东西**,措辞必须让人一眼看出区别 ——
   *    total=全段都有官方数据的合计;lower=还有段算不出,这只是下界(红线:下界不许冒充总数)。
   *  faster:三语语序不同,拼接交给各自的函数(同 STEP 的做法),别拿一个模板硬套。
   */
  planGap: Record<string, string>
  planDraw: string
  /** 🔴 抽选段的 0 有两种意思,见 planStepLabel:这一条是「官方明示不进池」的那种 0 */
  planNoDraw: string
  planProc: string
  planTotal: string
  planLower: string
  planNone: string
  /** 口径注(同 indexNote 的位置):**这条线不算什么** —— 不写清楚,12.5 个月会被读成「12.5 个月拿 PR」 */
  planScope: string
  faster: (fast: string, slow: string, atLeast: boolean) => string
  /**
   * 路径裁决(C5c lookupVerdict)。全是**半句话或名目**,值/官方原句由 sayFact 接上去。
   * 🔴 `vTier` 那四句**一个数字都不许有**:tier 是「gap 落在哪个区间」的分档
   * (0=没有缺口 / ≤6 月 / ≤12 月 / >12 月),写成「还要 12 个月」是给一个区间编了一个精度。
   * 真实的月数在通道自己的 gap 理由里(带官方原句与出处),那才是能报的数。
   */
  vScope: string
  vPaths: string
  vExcluded: string
  vNeedsInfo: string
  vTier: [string, string, string, string]
  vWhy: string
  vScore: string
  vCeiling: string
  vRefLine: string
  vLeverClb: (target: number) => string
  vLeverTeer: string
  /** 缺槽反问(三语;followups 是见客文案,同 FOLLOWUPS 一层)。status 不在 PROFILE_SLOTS 里:
   *  它不参与触发计数,只在裁决已出、身份还不明时点名问(NL 这类通道的前提是有效工签,§4.5)。 */
  vAsk: Record<ProfileSlot | 'status', string>
}
export const LBL: Record<ChatLang, LabelDict> = {
  zh: {
    apprOpenings: '现在可带学徒的在招岗位', apprSub: '其中雇主写明不要经验的在招岗位', openPostings: '现在的在招岗位', qcOutside: '(魁省不走省提名)',
    indexNote: '索引口径说明:0 表示本站当前索引里没有,不代表该省没有空缺', checked: '查询时间',
    listIn: '的官方职业清单收了', listEx: '的官方职业清单排除了', occList: '的官方职业清单', officialReq: '的官方门槛',
    claimOk: '这条可以拿下面的官方数字对照', noneFound: '本站查过了,这一项没有命中的记录',
    pass: '已达标', fail: '未达标', unknown: '未判定(没拿到你的情况)', short: '还差',
    drawCut: '最近一轮抽选的最低分数线', drawInv: '最近一轮抽选发出的邀请数', draws: '的抽选记录', opsStats: '的运营统计',
    eeCat: '联邦 EE 通道', eeAll: '联邦 EE 通道', unsaid: '官方清单也收了这个职业、但对方没提过的省',
    federalRule: '官方规则', federalGap: '官方原文没有接上的一步', crsPoint: 'CRS 官方计分档', fswPoint: 'FSW 67 分官方计分档',
    opsKeys: { eoi_pool_total: '的 EOI 池子现有人数', eoi_pool: '的 EOI 池内人数', allocation: '今年的提名名额', remaining: '今年剩余的提名名额', nominations_ytd: '今年已经发出的提名数', processing_weeks: '官方公布的处理周期' },
    factor: {
      language: '要求申请人的语言达到', languageExempt: '规定申请人可以豁免语言的等级是',
      experience: '要求申请人的工作经验满', income: '要求申请人家庭的收入达到', wage: '要求这份工作至少给到',
      empYears: '要求雇主(不是申请人)已经营满', empRevenue: '要求雇主(不是申请人)的年营业额至少', empStaff: '要求雇主(不是申请人)至少有员工',
    },
    factorNone: { experience: '这条通道不设工作经验门槛', language: '这条通道不要求先交语言成绩' },
    // 「免」只免这条通道的**入池门槛**(2026-08-09 Frank「OINP 新系统也有语言打分啊」):EOI 排位仍计
    // 语言分(pnp_score_factors ON language CLB6=4…CLB9+=15 在库,判定/规划场景各自出行),措辞不许扩大成「语言无用」
    exemptYears: (n) => `省内认可院校毕业 ${n} 年内免交语言成绩也可入池`,
    planGap: {
      '': '补齐官方门槛要多久', experience: '补齐经验门槛要多久', language: '补齐语言门槛要多久',
      income: '补齐收入门槛要多久', wage: '补齐工资门槛要多久',
    },
    planDraw: '官方开一轮抽选的平均间隔', planNoDraw: '这条通道不用等抽选(官方明示不进池)', planProc: '官方公布的处理时长(折成月)',
    planTotal: '这条路各段合计', planLower: '这条路只把算得出的几段相加(还有段算不出,这是下界不是总数)',
    planNone: '这条路要多久',
    planScope: '时间线口径:只算门槛缺口、官方开一轮的间隔、官方公布的处理时长;签证、体检、找到雇主要多久都不在里面',
    faster: (f, s, at) => `${f} 比 ${s} ${at ? '至少快多少' : '快多少'}`,
    vScope: '路径判定的口径:逐条通道拿官方门槛与你的情况对照,这是粗筛,不是资格认定;各省还有自己的清单与细则',
    vPaths: '路径判定',
    vExcluded: '这条通道现在走不通',
    vNeedsInfo: '这条通道判不了',
    vTier: [
      '拿到 offer 当天就能递,没有还要攒的门槛',
      '拿到 offer 之后还要再攒不到半年',
      '拿到 offer 之后还要再攒不到一年',
      '拿到 offer 之后还要再攒一年以上',
    ],
    vWhy: '判定依据',
    vScore: '你在这条通道的估分',
    vCeiling: '把语言拉到官方最高档之后的上界',
    vRefLine: '最近一轮抽选的最低分',
    vLeverClb: (t) => `语言提到 CLB ${t} 之后,官方分值表上能多拿的分`,
    vLeverTeer: '改接 TEER 5 的岗之后会掉档的通道数',
    // 反问文案是**问句**(和 ASK_OCC 一样:缺了判定必需的东西就当面问,不拿默认值顶上)
    vAsk: {
      age: '你今年多少岁?',
      married: '配偶会不会跟你一起申请?',
      clb: '你的语言考到 CLB 几?',
      edu: '你的最高学历是什么?',
      canadaStudy: '你在加拿大读过书吗?',
      eduYears: '你读的课程是几年制?',
      studyProvince: '你在哪个省读的书?',
      expMonths: '你有多少个月的工作经验?',
      status: '你现在有有效的工签吗(比如 PGWP)?',
    },
  },
  en: {
    apprOpenings: 'apprentice-friendly openings right now', apprSub: 'of those postings, the ones where the employer states no experience is needed', openPostings: 'open postings right now', qcOutside: '(QC is outside PNP)',
    indexNote: 'index note: 0 means nothing in our index right now, not that the province has none', checked: 'checked',
    // ⚠️ 「officially excludes」曾经写作 EXCLUDES —— **我们自己的 label 里用大写做强调,模型照抄进答复**
    // (2026-08-06 实测同一个病:RULE 0 里的 WE 原样进了英文首句)。见客文案里一律不用大写强调。
    listIn: 'officially lists', listEx: 'officially excludes', occList: 'official occupation list', officialReq: 'official requirements',
    claimOk: 'we do have official numbers to check this against, see the figures below',
    noneFound: 'we did check this record — this occupation simply does not appear in it',
    pass: 'met', fail: 'not met', unknown: 'not judged (your situation not given)', short: 'short by',
    drawCut: 'latest draw cutoff', drawInv: 'invitations in the latest draw', draws: 'draw history', opsStats: 'operational stats',
    eeCat: 'federal EE category', eeAll: 'federal EE categories',
    federalRule: 'official rule', federalGap: 'step the official wording does not connect',
    crsPoint: 'official CRS points row', fswPoint: 'official FSW 67-point row',
    // 这句会被整句抄进答复,写成能直接当句子用的形状(旧版「provinces whose … but nobody mentioned」抄出来不成句)
    unsaid: 'other provinces whose official lists also cover this occupation, which nobody mentioned',
    opsKeys: { eoi_pool_total: 'EOI pool size right now', eoi_pool: 'EOI pool size right now', allocation: 'nomination allocation for the year', remaining: 'nomination allocation still left', nominations_ytd: 'nominations issued so far this year', processing_weeks: 'processing time the province publishes' },
    factor: {
      language: 'requires the applicant to reach a language level of', languageExempt: 'lets the applicant skip the language test at a level of',
      experience: 'requires the applicant to have work experience of', income: 'requires the applicant household income of at least',
      wage: 'requires this job to pay at least', empYears: 'requires the employer, not the applicant, to have been in business for',
      empRevenue: 'requires the employer, not the applicant, to have annual revenue of at least', empStaff: 'requires the employer, not the applicant, to have staff of at least',
    },
    factorNone: { experience: 'sets no minimum work-experience requirement', language: 'requires no language test up front' },
    exemptYears: (n) => `accepts registration without a language test if the applicant graduated from an eligible institution in the province within the last ${n} years`,
    planGap: {
      '': 'how long it takes to close the gap to the official requirement', experience: 'how long it takes to close the work experience gap',
      language: 'how long it takes to close the language gap', income: 'how long it takes to close the household income gap',
      wage: 'how long it takes to close the pay gap',
    },
    planDraw: 'average gap between one official draw round and the next',
    planNoDraw: 'no draw to wait for on this stream, the official page says so', planProc: 'processing time the province publishes, put into months',
    planTotal: 'the whole path added up', planLower: 'only the segments that can be worked out, added up (a floor, not a total)',
    planNone: 'how long this path takes',
    planScope: 'what this timeline counts: the gap to the official requirement, how often the province opens a round, and the '
      + 'processing time it publishes — a visa, a medical or the time it takes to find an employer are not in it',
    faster: (f, s, at) => `how much faster ${f} is than ${s}${at ? ', at the very least' : ''}`,
    vScope: 'what this path ruling is: every stream checked line by line against the official requirements on file — '
      + 'a first-pass sort, not an eligibility decision; each province still has its own lists and fine print',
    vPaths: 'path ruling',
    vExcluded: 'is closed on the official requirements',
    vNeedsInfo: 'cannot be ruled on',
    vTier: [
      'can be filed the day a job offer is in hand, with nothing left to build up',
      'still needs under half a year of building up after a job offer',
      'still needs under a year of building up after a job offer',
      'still needs over a year of building up after a job offer',
    ],
    vWhy: 'the official wording behind that ruling',
    vScore: 'the estimated score on this stream',
    vCeiling: 'the ceiling once language is taken to the top official band',
    vRefLine: 'the cutoff in the latest draw',
    vLeverClb: (t) => `points gained on the official grid by taking language to CLB ${t}`,
    vLeverTeer: 'streams that drop out if the job taken is a TEER 5 one',
    vAsk: {
      age: 'How old are you?',
      married: 'Would a spouse or partner come along on the application?',
      clb: 'What CLB level did you reach?',
      edu: 'What is your highest completed education?',
      canadaStudy: 'Did you study in Canada?',
      eduYears: 'How many years does your programme run?',
      studyProvince: 'Which province did you study in?',
      expMonths: 'How many months of work experience do you have?',
      status: 'Do you hold a valid work permit right now (a PGWP, for example)?',
    },
  },
  ko: {
    apprOpenings: '현재 견습 가능 채용 공고', apprSub: '그중 고용주가 경력 무관이라고 밝힌 공고', openPostings: '현재 채용 공고', qcOutside: '(퀘벡은 주정부 이민 대상 아님)',
    indexNote: '색인 안내: 0은 현재 본 사이트 색인에 없다는 뜻이며 해당 주에 공석이 없다는 뜻이 아닙니다', checked: '조회 시각',
    listIn: '공식 직업 목록에 들어 있는 직업', listEx: '공식 직업 목록에서 제외된 직업', occList: '공식 직업 목록', officialReq: '공식 요건',
    claimOk: '이 건은 아래 공식 수치와 대조할 수 있습니다', noneFound: '조회했으나 이 직업에 해당하는 기록이 없습니다',
    pass: '충족', fail: '미충족', unknown: '판정 불가(본인 상황 미제공)', short: '부족분',
    drawCut: '최근 추첨 커트라인', drawInv: '최근 추첨 초청 건수', draws: '추첨 기록', opsStats: '운영 통계',
    eeCat: '연방 EE 카테고리', eeAll: '연방 EE 카테고리', unsaid: '공식 목록에 이 직업이 있으나 상대가 말하지 않은 주',
    federalRule: '공식 규정', federalGap: '공식 문구가 연결하지 않은 단계',
    crsPoint: 'CRS 공식 점수 항목', fswPoint: 'FSW 67점 공식 항목',
    opsKeys: { eoi_pool_total: 'EOI 풀 전체 인원', eoi_pool: 'EOI 풀 인원', allocation: '올해 지명 배정', remaining: '남은 지명 배정', nominations_ytd: '올해 누적 지명', processing_weeks: '주정부가 공개한 처리 기간' },
    factor: {
      language: '요건 — 신청인의 언어 등급은', languageExempt: '요건 — 언어 면제 기준 등급(신청인)은',
      experience: '요건 — 신청인의 경력은', income: '요건 — 신청인 가구 소득은', wage: '요건 — 이 일자리의 최저 임금은',
      empYears: '요건 — 고용주(신청인 아님)의 사업 운영 기간은', empRevenue: '요건 — 고용주(신청인 아님)의 연 매출은', empStaff: '요건 — 고용주(신청인 아님)의 직원 수는',
    },
    factorNone: { experience: '이 통로는 경력 요건이 없습니다', language: '이 통로는 사전 어학 성적을 요구하지 않습니다' },
    exemptYears: (n) => `주 내 인정 교육기관 졸업 후 ${n}년 이내면 어학 성적 없이 등록할 수 있습니다`,
    planGap: {
      '': '공식 요건을 채우는 데 걸리는 기간', experience: '경력 요건을 채우는 데 걸리는 기간', language: '언어 요건을 채우는 데 걸리는 기간',
      income: '소득 요건을 채우는 데 걸리는 기간', wage: '임금 요건을 채우는 데 걸리는 기간',
    },
    planDraw: '공식 추첨 한 회차 사이의 평균 간격', planNoDraw: '이 통로는 추첨 대기가 없음(공식 명시)', planProc: '주정부가 공개한 처리 기간(개월 환산)',
    planTotal: '이 경로 전체 구간 합계', planLower: '산출 가능한 구간만 합한 값(총계가 아니라 하한)',
    planNone: '이 경로에 걸리는 기간',
    planScope: '이 기간에 포함되는 것: 요건까지의 부족분, 주정부가 추첨을 여는 주기, 공개된 처리 기간 — 비자·건강검진·고용주를 찾는 기간은 빠져 있습니다',
    faster: (f, s, at) => `${f}가 ${s}보다 빠른 기간${at ? '(최소치)' : ''}`,
    vScope: '경로 판정 기준: 각 통로를 수집된 공식 요건과 한 줄씩 대조한 결과입니다. 1차 선별일 뿐 자격 판정이 아니며, 주마다 별도의 목록과 세부 규정이 있습니다',
    vPaths: '경로 판정',
    vExcluded: '이 상황에서는 막혀 있습니다',
    vNeedsInfo: '판정할 수 없습니다',
    vTier: [
      '오퍼를 받은 당일에 신청 가능(더 쌓을 요건 없음)',
      '오퍼 이후 반년 미만을 더 쌓아야 함',
      '오퍼 이후 한 해 미만을 더 쌓아야 함',
      '오퍼 이후 한 해 넘게 더 쌓아야 함',
    ],
    vWhy: '판정 근거가 된 공식 문구',
    vScore: '이 통로에서의 예상 점수',
    vCeiling: '언어를 공식 최고 등급까지 올렸을 때의 상한',
    vRefLine: '최근 추첨의 커트라인',
    vLeverClb: (t) => `언어를 CLB ${t}까지 올릴 때 공식 점수표에서 더 받는 점수`,
    vLeverTeer: 'TEER 5 일자리로 바꾸면 빠지는 통로 수',
    vAsk: {
      age: '연세가 어떻게 되시나요?',
      married: '배우자도 함께 신청하나요?',
      clb: '언어 점수는 CLB 몇 등급인가요?',
      edu: '최종 학력은 무엇인가요?',
      canadaStudy: '캐나다에서 공부한 적이 있나요?',
      eduYears: '과정 기간은 몇 년인가요?',
      studyProvince: '어느 주에서 공부하셨나요?',
      expMonths: '경력은 몇 개월인가요?',
      status: '지금 유효한 취업 허가(예: PGWP)가 있나요?',
    },
  },
}

/**
 * 🔴 **markdown 记号一律剥掉,不渲染**(2026-08-05 生产实录:答复里出现 `ON 官方**不公布**职业清单`)。
 *
 * 病根在数据层:C1 的 note 是给人读的中文,里面带着 markdown 强调
 * (chatTools.ts `${prov} 官方**不公布**职业清单…`),它经 valueText 进三个下游 —— 喂模型的 FACTS 块、
 * 降级清单、前端出处表。**降级清单和出处表是我们自己写的字**,没有 tidy 这道回来剥的工序,于是原样见客。
 *
 * 为什么剥不渲:我们的答复按设计是**一句一事实的短纯文本**(前端 white-space:pre-wrap),
 * 没有一处需要富文本;引入 markdown 渲染 = 一个新依赖 + 一个 XSS 面(答复正文里混着模型生成的内容),
 * 换来的只是几个星号变成加粗。剥掉是 Ponytail 第 5 格的一行解法,而且**三个下游一次全治**。
 *
 * 收口在 `fact()` 这一个入口:label/valueText 是 markdown 唯一的入境口,在这儿剥干净,
 * prompt / 降级清单 / 出处表都不必再各自处理(各自处理迟早漏一处)。
 *
 * 🔴 2026-08-06 起**两样不剥**:行首 `- ` 与空行。它们是前端 ChatText(3ebe64c)真渲染得出来的
 * 两样(项目符号组 + 空行分段),剥掉就等于把渲染器废了 —— 「格式乱」的病根正是这里曾经全剥。
 * 剥的判据从此只有一条:**渲染不出来的记号才剥**(`**` `#` 反引号 → 剥;`*`/`+`/`•` → 归一成 `- `;
 * 编号列表 → 也归一成 `- `,理由见下)。
 */
export const stripMd = (s: string): string => s
  .replace(/\*\*/g, '')                       // 加粗记号:去记号留字
  .replace(/`/g, '')                          // 等宽记号
  .replace(/^[ \t]*#{1,6}[ \t]*/gm, '')       // 小标题
  .replace(/^[ \t]*[*+•][ \t]+/gm, '- ')      // 别家的项目符号 → 我们这一种(渲染器只认 `- `)
  // 🔴 编号列表 → 项目符号。两个理由,都不是审美:① 渲染器不认 `1.`,它会原样留在正文里;
  //    ② 行首编号撞 guard 的**行首序号白名单**(那道白名单按位置放行 1-2 位数,不查 facts)——
  //    归一掉序号,这个盲区就不存在了。提示词那头照旧明令禁止,这里是回来自己收的那一道。
  .replace(/^[ \t]*\d{1,2}[.)][ \t]+/gm, '- ')

const fact = (tool: string, label: string, value: number | null, valueText: string, unit: string, ev: { url: string; fetched: string }): Fact => ({
  // 🔴 这一刀只会从尾巴上砍,所以主张行**不能靠它收口**(见 claimLabel:被砍的正是我们自己的解释句)。
  //    主张行进来之前已按 LABEL_CAP 把原话截过,这里对它是个恒等式 —— 帽照旧存在,只是不再由它决定截谁。
  tool, label: stripMd(label).slice(0, LABEL_CAP), value, valueText: stripMd(valueText).slice(0, 110), unit,
  evidence: { url: ev.url, fetched: ev.fetched },
})
/**
 * 四态成句 + 官方原文摘要一起带走:摘要跟着 valueText 截到 110 字,够模型分清「不公布」和「没收录」,又不吃光 prompt 预算。
 *
 * 🔴 `availability === 'ok'` 却走到这条路 = **查过了但没有命中**(EE 全表查完这个职业一个类别都不在、
 * 某省清单查过但没这个职业)。旧版把 AVAIL_SENTENCE.ok 那个内部占位符 `ok` 原样喂了出去,
 * 于是英文答复里出现「Federal Express Entry categories are open for this occupation」——
 * 把「一个类别都不在」说成了「都能走」,**意思正好说反**(2026-08-05 实测 C06 英文)。
 * 中文侥幸没错是因为 C1 的中文 note 补了后半句,en/ko 没有 note → 只剩一个 `ok`。所以在这里就换成人话。
 */
const statusFact = (tool: string, label: string, av: Availability, note: string, url: string, lang: ChatLang) =>
  fact(tool, label, null, `${av === 'ok' ? LBL[lang].noneFound : AVAIL_SENTENCE[lang][av]}${note ? ` — ${note}` : ''}`, 'status', { url, fetched: '' })

// ── 时间线 → Fact[](C3 buildPlan 的答案怎么摆给模型)────────────────────────
//
// 🔴 **合计与分段的出处不是一回事**,这一段的全部难点就在这儿:
//   · 分段(缺口 / 抽选间隔 / 处理时长)是**库里的数**,各自挂着自己的 evidence.url —— 出处区点得开;
//   · 合计与快慢差是**这几段的算术**,它自己没有一页官网可指。所以它们的 evidence 留空:
//     guard 照旧认这个数(它在 facts 里),但 citeFacts 不会把它列进出处 —— 出处列的是被加的那几段。
//     **不许**随手拿某一段的 url 冒充合计的出处:那是拿一段的官方页去给另一个数字背书。
// 段数封顶是为了不把答复变成清单:一条路最多 3 段有数 + 2 段算不出,最多 3 条路。
const PLAN_PATHS_SHOWN = 3
const PLAN_STEPS_SHOWN = 3
const DERIVED = { url: '', fetched: '' }      // 见上:算术没有自己的出处,留空而不是借一个

/**
 * 段 → 名目(缺口段带上是哪个门槛;认不出的因素落 planGap[''])。
 *
 * 🔴 抽选段的 **0 个月有两种意思**,名目必须分开:通常的 0 不存在,而 `not-applicable` 的 0 是
 * 「这条通道官方明示不进池,压根没有『等抽选』这一步」。挂着「平均间隔」的名目报 0,
 * 中文还有 basis 兜着,英文就只剩一句「平均每 0 个月开一轮」—— 那是我们自己造的一句假话。
 */
const planStepLabel = (s: PlanStep, T: LabelDict): string =>
  s.kind === 'gap' ? (T.planGap[s.factor] ?? T.planGap[''])
    : s.kind === 'draw' ? (s.availability === 'not-applicable' ? T.planNoDraw : T.planDraw)
      : T.planProc

/**
 * 算术原文 → 见客文本。两处归一,都不是审美:
 *  ① 单位跟着用户语言(库里的 unit 是英文原样,见下面 planFacts 里那段);
 *  ② `A = B` 换成 `A:B` —— RULE 5b 明令答复里不许出现 `=`,而 basis 里那个等号会被模型照抄,
 *     出口的 findFactDump 当场判违规,白烧一次重试(降级清单更是直接把它印给用户看)。
 */
const plainly = (s: string, lang: ChatLang) => localizeUnits(s, lang).replace(/\s=\s/g, ':')

/**
 * 时间线 → facts。**一个数都不在这里算**:月数、下界、快慢差全是 buildPlan 已经定好的字段,
 * 本函数只负责给它们套上用户语言的名目(同 collectFacts 里其余六段的做法)。
 * 算不出的段照样出一行(statusFact:官方不公布 / 本站未收录)—— 那正是「多久」这个问题最该说清的一半:
 * 少说一段,读者就会把下界当成总数。
 */
export function planFacts(r: PlanResult, lang: ChatLang): Fact[] {
  const T = LBL[lang]
  const out: Fact[] = []
  if (r.availability !== 'ok') {
    out.push(statusFact('lookupPlan', T.planNone, r.availability, zhOnly(r.note, lang), '', lang))
    return out
  }
  // 口径注排在最前(同 lookupJobs 的 indexNote):没有它,「12.5 个月」会被读成「12.5 个月拿 PR」
  out.push(fact('lookupPlan', T.planScope, null, '', 'note', DERIVED))
  const shown = [...r.plan.ranked, ...r.plan.partial].slice(0, PLAN_PATHS_SHOWN)
  for (const p of shown) {
    // 全段确定才给总数;含未知段只给下界,且名目里就写着「这是下界不是总数」(红线:下界不冒充总数)
    if (p.totalMonths != null) out.push(fact('lookupPlan', `${p.province} ${T.planTotal}`, p.totalMonths, '', 'months', DERIVED))
    else if (p.determinedMonths > 0) out.push(fact('lookupPlan', `${p.province} ${T.planLower}`, p.determinedMonths, '', 'months', DERIVED))
    for (const s of p.steps.filter((x) => x.months != null).slice(0, PLAN_STEPS_SHOWN)) {
      // basis 是算术原文(中文硬编码,同 C1 的 note)→ 只给中文用户;英文/韩文只剩数字与名目。
      // ⚠️ 里面嵌着**库里的英文单位**(「官方要 12 months」——那是 pnp_requirements 的 unit 原样),
      //    不过 plainly 那道就两头出事:进 prompt 让模型抄出中英夹生,进 factsEnglish 的白名单
      //    还会把 months/weeks 整个放行,把 findEnglishUnits 那道检查一起废掉。
      out.push(fact('lookupPlan', `${p.province} ${planStepLabel(s, T)}`, s.months, zhOnly(plainly(s.basis, lang), lang), 'months',
        s.evidence ?? DERIVED))
    }
    for (const s of p.unknownSteps.slice(0, 2)) {
      out.push(statusFact('lookupPlan', `${p.province} ${planStepLabel(s, T)}`, s.availability,
        zhOnly(plainly(s.why, lang), lang), s.evidence?.url ?? '', lang))
    }
  }
  // 快慢差只说**两条路都摆出来了**的那对:读者看不见的省,一句「至少快 12.4 个月」没有着落
  const on = new Set(shown.map((p) => p.province))
  for (const c of r.plan.comparisons.filter((c) => on.has(c.fasterProvince) && on.has(c.slowerProvince)).slice(0, 2)) {
    out.push(fact('lookupPlan', T.faster(c.fasterProvince, c.slowerProvince, c.kind === 'atLeast'),
      c.monthsDelta, zhOnly(plainly(c.basis, lang), lang), 'months', DERIVED))
  }
  return out
}

// ── 路径裁决 → Fact[](C5c:pathVerdict 的十三条判定怎么摆给模型)────────────────
//
// 🔴 三条约束,都不是风格问题:
//   ① **中文的判定理由只给中文用户**(zhOnly,同 C1 的 note 那条规矩):pathVerdict 的 reason.text
//      是中文硬编码,漏进英文答复会被 findForeignScript 当场硬拦,而 88% 的流量是英文。
//      en/ko 拿到的是「我们自己的三语名目 + 官方英文原句 + 数字」—— 事实一条不少,只是不夹生。
//   ② **tier 不写成月数**(见 LBL.vTier):tier 是「差距落在哪个区间」的分档,写成「还要 12 个月」
//      等于给一个区间编了一个精度。真实月数在该通道自己的理由里(带官方原句与出处),那才是能报的数。
//   ③ **条数封顶**:13 条通道全铺 = 又一次「材料变提纲」。排除的全给(那是他最该知道的),
//      open 给最前几条**外加有估分的那几条**(估分是他自己算不出来的东西),needs-info 一句话带过。
const VERDICT_EXCLUDED_SHOWN = 3
const VERDICT_OPEN_SHOWN = 3
const VERDICT_NEEDS_SHOWN = 2
/** 语言杠杆问的是「提到哪一档」。这个数同时喂给 pathLevers 与见客标签 —— 两处各写一个迟早对不上。 */
export const VERDICT_CLB_TARGET = 8

/**
 * 抽选线那个数的出处是**抽选页**,不是分值表。pathVerdict 没把它单列出来,但它留了一个
 * **结构判据**:只有 `evOfDraw` 造的 evidence.label 里带 `(YYYY-MM-DD`(门槛行是官方原文、
 * 清单行是「stream — noc name」、分值表行是 system 名,都不长这样)。认不出就返回 undefined,
 * 那时这条线整个不给 —— 宁可少一个数,也不拿分值表的 url 去给抽选线背书。
 */
const drawEvidenceOf = (v: PathwayVerdict) =>
  v.reasons.find((r) => /\(\d{4}-\d{2}-\d{2}/.test(r.evidence?.label ?? ''))?.evidence

export function verdictFacts(r: VerdictResult, lang: ChatLang): Fact[] {
  const T = LBL[lang]
  if (r.availability !== 'ok') {
    return [statusFact('lookupVerdict', T.vPaths, r.availability, zhOnly(r.note, lang), '', lang)]
  }
  const out: Fact[] = []
  // 口径注排最前(同 planFacts 的 planScope):没有它,「这条走不通」会被读成一句资格认定
  out.push(fact('lookupVerdict', T.vScope, null, '', 'note', DERIVED))

  const name = (v: PathwayVerdict) => `${v.province} ${v.stream}`
  /**
   * 一条通道 + 一条理由 → 一句话:名目(三语)+ 中文用户额外拿到的判定理由,官方原句接在冒号后面。
   *
   * 🔴 **截断的官方原句要看得出被截过**(valueText 的硬帽是 110 字):`fact()` 那一刀只会齐字砍,
   *    砍完读者拿到的是一句完整模样、其实少了半截的「官方原话」—— 那比不引用更糟。这里按词边界先截、
   *    并留省略号(同 claimLabel 对用户原话的做法:别人的话可以截,但必须让人看出来截过)。
   */
  const clip = (t: string, cap: number): string => {
    const x = (t || '').trim()
    if (x.length <= cap) return x
    const cut = x.slice(0, cap - 1)
    const sp = cut.lastIndexOf(' ')
    return `${sp > cap * 0.6 ? cut.slice(0, sp) : cut}…`
  }
  /** `null` = 这一行一个字的信息都没有(en/ko 拿不到中文理由、这条理由又没有官方原句)—— 不摆空名目。 */
  const line = (v: PathwayVerdict, head: string, x?: VerdictReason): Fact | null => {
    const why = zhOnly(x?.text ? `——${x.text}` : '', lang)
    // 76 而不是 110 帽满打:整段 FACTS 的预算是 4200 字,十几条通道判定再各挂一句百来字的英文原文,
    // 就会把在招岗位那几行从 prompt 里挤出去(facts 数组一条不少,挤掉的只是这次的稿子)。
    // 原句在这里的作用是**锚**(让模型看得见判定有出处),不是给人读全文 —— 全文点出处链接去看。
    const quote = clip(x?.quote ?? '', 76)
    if (head === T.vWhy && !why && !quote) return null
    return fact('lookupVerdict', `${name(v)} ${head}${why}`, null, quote, 'path', x?.evidence ?? DERIVED)
  }
  const push = (f: Fact | null) => { if (f) out.push(f) }
  const scoreOf = (v: PathwayVerdict): Fact[] => {
    const s = v.score
    if (!s) return []
    const rows = [fact('lookupVerdict', `${name(v)} ${T.vScore}(${s.system})`, s.value, '', 'points', s.evidence)]
    if (s.ceiling != null) rows.push(fact('lookupVerdict', `${name(v)} ${T.vCeiling}(${s.system})`, s.ceiling, '', 'points', s.evidence))
    const dev = drawEvidenceOf(v)
    if (s.refLine != null && dev) {
      rows.push(fact('lookupVerdict', `${name(v)} ${T.vRefLine}(${s.system})`, s.refLine, clip(zhOnly(s.refLabel, lang), 104), 'points', dev))
    }
    return rows
  }
  /**
   * 该通道最该说的那几条理由:有差距就说差距,没差距(tier0)就说「官方明说没有这道门槛」那种带原句的。
   * 同一句话不摆两遍 —— 联邦三个子通道的经验差距文案逐字相同(只有官方原句不同),
   * 两行并排读起来就是在念表格(RULE 5b 那条老病)。
   */
  const pick = (v: PathwayVerdict, n: number): VerdictReason[] => {
    const gaps = v.reasons.filter((x) => x.kind === 'gap')
    const pool = gaps.length ? gaps : v.reasons.filter((x) => x.kind === 'met' && x.quote)
    return pool.filter((x, i, a) => a.findIndex((y) => y.text === x.text) === i).slice(0, n)
  }

  const excluded = r.pathways.filter((v) => v.verdict === 'excluded')
  const open = r.pathways.filter((v) => v.verdict === 'open')
  const needs = r.pathways.filter((v) => v.verdict === 'needs-info')

  for (const v of excluded.slice(0, VERDICT_EXCLUDED_SHOWN)) {
    const hard = v.reasons.filter((x) => x.kind === 'excluded')
      .filter((x, i, a) => a.findIndex((y) => y.text === x.text) === i)
    // 排除的理由**必须能溯源**:头一句就带官方原句(pathVerdict 保证 excluded 的 reason 有 quote)
    push(line(v, T.vExcluded, hard[0]))
    for (const x of hard.slice(1, 2)) push(line(v, T.vWhy, x))
    out.push(...scoreOf(v))
  }
  // 有估分的通道即使排在后面也要进来:估分与抽选线是他自己算不出的东西,
  // 而按 tier 排序时它们常常压在第四第五位(金标 C01 的 MB 就是第七条)。
  const openShown = open.filter((v, i) => i < VERDICT_OPEN_SHOWN || !!v.score).slice(0, VERDICT_OPEN_SHOWN + 2)
  for (const v of openShown) {
    const reasons = pick(v, v.score ? 3 : 2)
    // 🔴 头一句只跟**差距**并排:差距就是 tier 的来由,并在一起读得通。一条差距都没有(tier0)时
    //    并进来的会是一条 met —— 「当天就能递」后面接一句「官方明说不要求语言成绩」,读者会以为
    //    tier0 是语言判出来的。那时头一句单独站着,理由另起一行。
    const paired = reasons[0]?.kind === 'gap' ? reasons[0] : undefined
    push(line(v, T.vTier[(v.tier ?? 0) as 0 | 1 | 2 | 3], paired))
    for (const x of reasons.slice(paired ? 1 : 0)) push(line(v, T.vWhy, x))
    out.push(...scoreOf(v))
  }
  for (const v of needs.slice(0, VERDICT_NEEDS_SHOWN)) {
    const why = v.reasons.find((x) => x.kind === 'needs-info')
    // 🔴 「本站没收录这条通道的门槛」和「你还没告诉我年龄」是两件事:前者带 availability(四态成句),
    //    后者只是缺槽。合并成一句「判不了」等于把我们的窟窿说成他的问题。
    if (v.availability !== 'ok') {
      // 注跟着 valueText 的 110 字帽走,四态成句要先占够 —— 截到一半的解释比不给解释还难读
      out.push(statusFact('lookupVerdict', `${name(v)} ${T.vNeedsInfo}`, v.availability,
        clip(zhOnly(why?.text ?? '', lang), 68), why?.evidence?.url ?? '', lang))
    } else {
      push(line(v, T.vNeedsInfo, why))
    }
  }
  for (const l of r.levers.slice(0, 2)) {
    if (l.key === 'clb-boost') {
      for (const g of (l.gains ?? []).slice(0, 2)) {
        // systemShort:分制名尾巴上那个「(Ontario Workforce Priority stream)」是它自报的通道名,
        // 套进我们自己的括号里就成了套娃(「…能多拿的分(OINP EOI points (Ontario …))」)
        out.push(fact('lookupVerdict', `${g.province} ${T.vLeverClb(VERDICT_CLB_TARGET)}(${systemShort(g.system)})`, g.delta, '', 'points', g.evidence))
      }
    } else if (l.key === 'teer-downgrade') {
      out.push(fact('lookupVerdict', `${T.vLeverTeer}${zhOnly(`——${l.text}`, lang)}`,
        (l.affected ?? []).length, '', 'paths', l.reasons?.[0]?.evidence ?? DERIVED))
    }
  }
  return out
}

/**
 * Slots → VerdictProfile。**一个槽都不补默认值**:缺的原样传 null,pathVerdict 会把该通道判成
 * needs-info,编排层据此反问(verdictFollowups)。默认一个「一般人」的年龄或语言 = 算另一个人的分。
 */
export function verdictProfileOf(slots: Slots, teer: number | null): VerdictProfile {
  // 🔴 「一共几个月经验」拆不出「在哪儿攒的」—— 只有 0 是无歧义的(哪儿都没干过)。
  //    >0 时两边都留 null:相关通道落 needs-info,那正是实话。**不许**默认算加拿大经验
  //    (多数通道只认加拿大的,会把一个海外申请人的路凭空判开),也不许默认算海外经验(反过来一样错)。
  const zeroExp = slots.expMonths === 0
  return {
    age: slots.age ?? null,
    married: slots.married ?? null,
    clb: slots.clb ?? null,
    edu: slots.edu ?? null,
    eduYears: slots.eduYears ?? null,
    canadaStudy: slots.canadaStudy ?? null,
    studyProvince: slots.studyProvince ?? null,
    noc: slots.noc,
    teer,
    expCanadaMonths: zeroExp ? 0 : null,
    expForeignMonths: zeroExp ? 0 : null,
    foreignExpSelfEmployed: null,
    status: slots.status,
    // 现居省本站还没有这个槽(slots.provs 是他**问的**省,不是他**住的**省 —— 拿它当现居地,
    // 一个在安省问「曼省怎么样」的人会被当成曼省居民)。留 null → 带居住门槛的通道落 needs-info。
    province: null,
  }
}

/** 缺槽反问:按 PROFILE_SLOTS 的顺序问最要紧的几个(问句是本层写死的三语文案,不过模型)。 */
export function verdictFollowups(slots: Slots, lang: ChatLang, limit = 3): string[] {
  return PROFILE_SLOTS.filter((k) => slots[k] == null).slice(0, limit).map((k) => LBL[lang].vAsk[k])
}

/**
 * C6 选项卡的第一个真实场景:裁决已出但**身份不明**(与 vAsk.status 那条追问同一触发)。
 * 三张选项写死三语 —— label/consequence 是 UI 文案(零逗号);sendText 是用户口吻整句,
 * 发出去走既有抽槽(status 词表:student/graduated/working…),**不塞任何用户没说过的事实**。
 */
export function permitOptions(lang: ChatLang): NonNullable<ChatResult['options']> {
  const O: Record<ChatLang, NonNullable<ChatResult['options']>> = {
    zh: {
      reason: '先确认工签——它决定最快的通道对你开不开',
      items: [
        { label: '我有有效的 PGWP', consequence: '相关通道立刻可判', sendText: '我持有有效的 PGWP 工签', recommended: true },
        { label: '工签已过期或没有工签', consequence: '先看不吃身份的通道', sendText: '我没有有效的工签' },
        { label: '学签在读', consequence: '按毕业后的时间线算', sendText: '我还在读书(持学签)' },
      ],
    },
    en: {
      reason: 'Confirm the work permit first — it decides whether the fastest pathway is open to you',
      items: [
        { label: 'I hold a valid PGWP', consequence: 'those pathways can be ruled on right away', sendText: 'I hold a valid PGWP work permit.', recommended: true },
        { label: 'My permit expired or I have none', consequence: 'look first at pathways that need none', sendText: 'I do not hold a valid work permit.' },
        { label: 'Still on a study permit', consequence: 'plan on the post-graduation timeline', sendText: 'I am still studying on a study permit.' },
      ],
    },
    ko: {
      reason: '취업 허가부터 확인하세요 · 가장 빠른 통로의 가능 여부가 여기서 갈립니다',
      items: [
        { label: '유효한 PGWP 보유', consequence: '해당 통로 즉시 판정 가능', sendText: '유효한 PGWP 취업 허가를 갖고 있습니다.', recommended: true },
        { label: '허가 만료 또는 없음', consequence: '신분 요건 없는 통로부터 확인', sendText: '유효한 취업 허가가 없습니다.' },
        { label: '학생 비자로 재학 중', consequence: '졸업 후 일정으로 계산', sendText: '아직 학생 비자로 재학 중입니다.' },
      ],
    },
  }
  return O[lang]
}

// ── 建档点选卡(2026-08-09 Frank:「做,能让用户手点就别用手输入」)──────────────
// 普通轮答完,档案还缺槽 → 垫一张点选卡:点选=以用户身份发话=当轮抽槽=D3 只补空回写。
// 一轮只垫一张(优先级 status→prov→clb→edu→expMonths→married→canadaStudy,08-09 Frank
// 「每次都要显示四选一的问题」卡链延长);档案里已有的槽(ProfileKnown)不追问,手填优先。
// 省卡是数据驱动的:只摆**这轮真查到在招数据**的省(答得上的保证,同 followups 一条底线),
// 凑不满两个省就不出省卡;QC 不进卡(QC 走自己的体系不属 PNP,摆进目标省是误导)。
const PROV_ZH: Record<string, [zh: string, en: string, ko: string]> = {
  BC: ['不列颠哥伦比亚', 'British Columbia', '브리티시컬럼비아'], ON: ['安大略', 'Ontario', '온타리오'],
  AB: ['阿尔伯塔', 'Alberta', '앨버타'], SK: ['萨斯喀彻温', 'Saskatchewan', '서스캐처원'],
  MB: ['曼尼托巴', 'Manitoba', '매니토바'], NS: ['新斯科舍', 'Nova Scotia', '노바스코샤'],
  NB: ['新不伦瑞克', 'New Brunswick', '뉴브런즈윅'], NL: ['纽芬兰', 'Newfoundland and Labrador', '뉴펀들랜드'],
  PE: ['爱德华王子岛', 'Prince Edward Island', '프린스에드워드아일랜드'],
}
const provWord = (code: string, lang: ChatLang): string | null => {
  const row = PROV_ZH[code]
  return row ? row[lang === 'zh' ? 0 : lang === 'en' ? 1 : 2] : null
}
export function slotAskOptions(
  slots: Slots, facts: Fact[], lang: ChatLang, known: ProfileKnown = {},
): ChatResult['options'] | undefined {
  if (slots.status == null && !known.status) {
    const O: Record<ChatLang, NonNullable<ChatResult['options']>> = {
      zh: { slotKey: 'status', reason: '记下你现在的身份——通道按它挑', items: [
        { label: '学签在读', consequence: '按毕业后时间线算', sendText: '我还在读书(持学签)' },
        { label: '持工签在工作或找工', consequence: '按在加经验通道算', sendText: '我持工签在加拿大' },
        { label: '人还在境外', consequence: '按境外申请路线算', sendText: '我人还在境外' },
      ] },
      en: { slotKey: 'status', reason: 'Note your status first — pathways are picked by it', items: [
        { label: 'Studying on a study permit', consequence: 'plan on the post-graduation timeline', sendText: 'I am studying in Canada on a study permit.' },
        { label: 'Working on a work permit', consequence: 'Canadian-experience pathways apply', sendText: 'I am working in Canada on a work permit.' },
        { label: 'Still outside Canada', consequence: 'overseas routes apply', sendText: 'I am still outside Canada.' },
      ] },
      ko: { slotKey: 'status', reason: '현재 신분부터 기록하세요 · 통로가 여기서 갈립니다', items: [
        { label: '학생 비자로 재학 중', consequence: '졸업 후 일정으로 계산', sendText: '캐나다에서 학생 비자로 재학 중입니다.' },
        { label: '취업 허가로 근무 또는 구직 중', consequence: '캐나다 경력 통로로 계산', sendText: '취업 허가로 캐나다에 있습니다.' },
        { label: '아직 해외에 있음', consequence: '해외 신청 경로로 계산', sendText: '아직 캐나다 밖에 있습니다.' },
      ] },
    }
    return O[lang]
  }
  if (!slots.provs.length && !known.provs) {
    const top = facts
      .map((f) => ({ f, m: f.tool === 'lookupJobs' && f.value != null ? /^([A-Z]{2}) open postings/.exec(f.label) : null }))
      .filter((x): x is { f: Fact; m: RegExpExecArray } => !!x.m && !!provWord(x.m[1], lang))
      .sort((a, b) => (b.f.value ?? 0) - (a.f.value ?? 0))
      .slice(0, 3)
    if (top.length >= 2) {
      const REASON: Record<ChatLang, string> = {
        zh: '目标省定一个——门槛和清单按省答', en: 'Pick a target province — requirements and lists are answered per province',
        ko: '목표 주를 하나 정하세요 · 요건과 목록은 주별로 답합니다',
      }
      const item = (code: string, n: number): ChatOption => {
        const w = provWord(code, lang)!
        return lang === 'zh'
          ? { label: `${w}(在招 ${n} 岗)`, consequence: '按这个省接着判', sendText: `我的目标省是${w}` }
          : lang === 'en'
            ? { label: `${w} (${n} open postings)`, consequence: 'continue against this province', sendText: `My target province is ${w}.` }
            : { label: `${w}(공고 ${n}건)`, consequence: '이 주 기준으로 계속 판정', sendText: `제 목표 주는 ${w}입니다.` }
      }
      return { slotKey: 'prov', reason: REASON[lang], items: top.map((x) => item(x.m[1], x.f.value as number)) }
    }
  }
  if (slots.clb == null && !known.clb) {
    const REASON: Record<ChatLang, string> = {
      zh: '语言到哪档了——各省线按它比对', en: 'Note your language level — provincial lines are compared against it',
      ko: '언어 등급을 기록하세요 · 주별 기준선과 비교합니다',
    }
    const item = (n: number): ChatOption => lang === 'zh'
      ? { label: `CLB ${n}`, sendText: `我的语言成绩是 CLB ${n}` }
      : lang === 'en'
        ? { label: `CLB ${n}`, sendText: `My language level is CLB ${n}.` }
        : { label: `CLB ${n}`, sendText: `제 언어 성적은 CLB ${n}입니다.` }
    return { slotKey: 'clb', reason: REASON[lang], items: [item(5), item(6), item(7)] }
  }
  // ── 卡链延长(2026-08-09 Frank「每次都要显示四选一的问题」):三张收齐后接着收其余能点选的档案槽,
  // 每一轮答完都有下一张建档卡。sendText 全部落在 SLOT_SYSTEM 词表的档位上(edu 七档取最常见三档,
  // 其余走卡自带的自行输入;年龄/几年制/读书省是数字与省名,没法三选,不硬造档位——归反问/自行输入)
  if (slots.edu == null && !known.edu) {
    const O: Record<ChatLang, NonNullable<ChatResult['options']>> = {
      zh: { slotKey: 'edu', reason: '记下最高学历——联邦和多数省按它给分', items: [
        { label: '两年制大专', consequence: '按大专档计分', sendText: '我的最高学历是两年制大专' },
        { label: '本科', consequence: '按本科档计分', sendText: '我的最高学历是本科' },
        { label: '硕士或以上', consequence: '按硕博档计分', sendText: '我的最高学历是硕士' },
      ] },
      en: { slotKey: 'edu', reason: 'Note your highest education — federal and most provincial grids score it', items: [
        { label: 'Two-year college diploma', consequence: 'scored at the diploma band', sendText: 'My highest education is a two-year college diploma.' },
        { label: "Bachelor's degree", consequence: 'scored at the bachelor band', sendText: "My highest education is a bachelor's degree." },
        { label: "Master's or above", consequence: 'scored at the graduate band', sendText: "My highest education is a master's degree." },
      ] },
      ko: { slotKey: 'edu', reason: '최종 학력을 기록하세요 · 연방과 대부분 주가 점수로 반영합니다', items: [
        { label: '2년제 칼리지 디플로마', consequence: '디플로마 구간으로 계산', sendText: '최종 학력은 2년제 칼리지 디플로마입니다.' },
        { label: '학사', consequence: '학사 구간으로 계산', sendText: '최종 학력은 학사입니다.' },
        { label: '석사 이상', consequence: '석박사 구간으로 계산', sendText: '최종 학력은 석사입니다.' },
      ] },
    }
    return O[lang]
  }
  if (slots.expMonths == null && !known.expMonths) {
    const O: Record<ChatLang, NonNullable<ChatResult['options']>> = {
      zh: { slotKey: 'expMonths', reason: '记下工作经验——通道门槛按月数比对', items: [
        { label: '还没有工作经验', consequence: '按零经验通道算', sendText: '我还没有工作经验' },
        { label: '满一年', consequence: '按 12 个月比对门槛', sendText: '我有 12 个月工作经验' },
        { label: '满两年', consequence: '按 24 个月比对门槛', sendText: '我有 24 个月工作经验' },
      ] },
      en: { slotKey: 'expMonths', reason: 'Note your work experience — pathway thresholds compare months', items: [
        { label: 'No work experience yet', consequence: 'zero-experience pathways apply', sendText: 'I have no work experience yet.' },
        { label: 'One year', consequence: 'compared against thresholds at 12 months', sendText: 'I have 12 months of work experience.' },
        { label: 'Two years', consequence: 'compared against thresholds at 24 months', sendText: 'I have 24 months of work experience.' },
      ] },
      ko: { slotKey: 'expMonths', reason: '경력을 기록하세요 · 통로 요건은 개월 수로 비교합니다', items: [
        { label: '아직 경력 없음', consequence: '무경력 통로로 계산', sendText: '아직 경력이 없습니다.' },
        { label: '1년', consequence: '12개월 기준으로 비교', sendText: '경력이 12개월 있습니다.' },
        { label: '2년', consequence: '24개월 기준으로 비교', sendText: '경력이 24개월 있습니다.' },
      ] },
    }
    return O[lang]
  }
  if (slots.married == null && !known.married) {
    const O: Record<ChatLang, NonNullable<ChatResult['options']>> = {
      zh: { slotKey: 'married', reason: '记下配偶随行与否——联邦计分表按它分单双', items: [
        { label: '单身', consequence: '按单人分表算', sendText: '我单身' },
        { label: '配偶随行', consequence: '按随行分表算', sendText: '我已婚,配偶会一起申请' },
        { label: '已婚但配偶不随行', consequence: '按单人分表算', sendText: '我已婚,但配偶不随行' },
      ] },
      en: { slotKey: 'married', reason: 'Note whether a spouse comes along — federal grids split on it', items: [
        { label: 'Single', consequence: 'single grid applies', sendText: 'I am single.' },
        { label: 'Spouse coming along', consequence: 'accompanied grid applies', sendText: 'I am married and my spouse will come along on the application.' },
        { label: 'Married but spouse stays', consequence: 'single grid applies', sendText: 'I am married but my spouse is not coming along.' },
      ] },
      ko: { slotKey: 'married', reason: '배우자 동반 여부를 기록하세요 · 연방 점수표가 여기서 갈립니다', items: [
        { label: '미혼', consequence: '단독 점수표로 계산', sendText: '미혼입니다.' },
        { label: '배우자 동반', consequence: '동반 점수표로 계산', sendText: '기혼이고 배우자도 함께 신청합니다.' },
        { label: '기혼이지만 동반 안 함', consequence: '단독 점수표로 계산', sendText: '기혼이지만 배우자는 동반하지 않습니다.' },
      ] },
    }
    return O[lang]
  }
  if (slots.canadaStudy == null && !known.canadaStudy) {
    const O: Record<ChatLang, NonNullable<ChatResult['options']>> = {
      zh: { slotKey: 'canadaStudy', reason: '记下是否在加拿大读过书——毕业生通道按它开关', items: [
        { label: '在加拿大读过书', consequence: '毕业生通道可判', sendText: '我在加拿大读过书' },
        { label: '学历都在境外', consequence: '按境外学历通道算', sendText: '我的学历都是在境外读的' },
      ] },
      en: { slotKey: 'canadaStudy', reason: 'Note whether you studied in Canada — graduate pathways switch on it', items: [
        { label: 'Studied in Canada', consequence: 'graduate pathways can be assessed', sendText: 'I studied in Canada.' },
        { label: 'All study outside Canada', consequence: 'overseas-education pathways apply', sendText: 'All my study was outside Canada.' },
      ] },
      ko: { slotKey: 'canadaStudy', reason: '캐나다 학업 여부를 기록하세요 · 졸업생 통로가 여기서 갈립니다', items: [
        { label: '캐나다에서 공부함', consequence: '졸업생 통로 판정 가능', sendText: '캐나다에서 공부한 적이 있습니다.' },
        { label: '모두 해외에서 공부함', consequence: '해외 학력 통로로 계산', sendText: '학업은 모두 캐나다 밖에서 했습니다.' },
      ] },
    }
    return O[lang]
  }
  return undefined
}

const FED_FACTOR: Record<ChatLang, Record<string, string>> = {
  zh: {
    pgwpLength: '工签长度分档', pgwpCombine: '多个课程合并规则', pgwpOnce: '一生可申请次数',
    pgwpWindow: '毕业后申请窗口', pgwpMinProgram: '课程最短长度', pgwpLanguage: '语言门槛',
    workTeer: '合资格工作所属 TEER', workHours: '工作经验时数', workLocation: '工作经验地点',
    workSelfEmployed: '自雇及全日制学生期间工作是否计入', workRecency: '工作经验有效期',
    workNocGroups: '合资格 NOC 组别', passMark: '入池资格分数线', proofOfFunds: '资金证明规则',
    jobOfferOrCertificate: '工作邀请或技工资格证规则', residence: '计划居住地', language: '语言门槛', education: '教育要求',
  },
  en: {
    pgwpLength: 'permit length band', pgwpCombine: 'combining programs', pgwpOnce: 'lifetime application limit',
    pgwpWindow: 'application window after graduation', pgwpMinProgram: 'minimum program length', pgwpLanguage: 'language requirement',
    workTeer: 'eligible work TEER', workHours: 'work-experience hours', workLocation: 'location of work experience',
    workSelfEmployed: 'whether self-employment and full-time-student work count', workRecency: 'work-experience recency',
    workNocGroups: 'eligible NOC groups', passMark: 'eligibility pass mark', proofOfFunds: 'proof-of-funds rule',
    jobOfferOrCertificate: 'job-offer or trade-certificate rule', residence: 'intended residence', language: 'language requirement', education: 'education requirement',
  },
  ko: {
    pgwpLength: '취업 허가 기간 구간', pgwpCombine: '여러 과정 합산 규정', pgwpOnce: '평생 신청 가능 횟수',
    pgwpWindow: '졸업 후 신청 기간', pgwpMinProgram: '최소 과정 기간', pgwpLanguage: '언어 요건',
    workTeer: '인정 경력의 TEER', workHours: '경력 시간', workLocation: '경력 취득 장소',
    workSelfEmployed: '자영업·전일제 학생 경력 인정 여부', workRecency: '경력 인정 기간',
    workNocGroups: '해당 NOC 그룹', passMark: '자격 통과 점수', proofOfFunds: '정착 자금 증빙 규정',
    jobOfferOrCertificate: '잡오퍼 또는 기능 자격증 규정', residence: '거주 예정지', language: '언어 요건', education: '학력 요건',
  },
}

/** lookupPermit 的真返回 → 对话 facts。rule 的数字与原句共用同一条 evidence；null 只摆原文,不补 0。 */
export function federalRuleFacts(results: PermitResult[], lang: ChatLang): Fact[] {
  const T = LBL[lang]
  const out: Fact[] = []
  for (const r of results) {
    if (r.availability !== 'ok') {
      out.push(statusFact('lookupPermit', `${r.program} ${T.federalRule}`, r.availability, zhOnly(r.note, lang), '', lang))
      continue
    }
    for (const rule of r.rules) {
      const name = FED_FACTOR[lang][rule.factor] ?? T.federalRule
      out.push(fact('lookupPermit', `${rule.program} ${name}`, rule.value,
        rule.valueText, rule.unit, rule.evidence))
    }
    for (const gap of r.gaps) {
      const note = lang === 'zh' ? gap.note
        : lang === 'en'
          ? 'IRCC states the program-combination rule and the 3-year permit band separately, but does not connect the combined length to that band.'
          : 'IRCC는 과정 합산 규정과 3년 허가 구간을 따로 제시하지만, 합산한 기간을 그 구간에 연결하지 않습니다.'
      out.push(fact('lookupPermit', `${r.program} ${T.federalGap}`, null, note, 'rule', gap.evidence[0] ?? DERIVED))
    }
  }
  return out
}

/** lookupCrs 的真返回 → 对话 facts。两套 grid 的名字长在每一行里,不让模型把分值混加。 */
export function crsFacts(results: CrsResult[], lang: ChatLang): Fact[] {
  const T = LBL[lang]
  const out: Fact[] = []
  for (const r of results) {
    const title = r.grid === 'FSW67' ? T.fswPoint : T.crsPoint
    if (r.availability !== 'ok') {
      out.push(statusFact('lookupCrs', title, r.availability, zhOnly(r.note, lang), '', lang))
      continue
    }
    // 口径注不带数字,但必须进 prompt:CRS 与 FSW67 绝不能相加。出处仍逐行挂在实际分值上。
    out.push(fact('lookupCrs', title, null, zhOnly(r.note, lang), 'note', DERIVED))
    for (const row of r.rows.slice(0, 16)) {
      const band = [row.factor, row.criterion, row.columnLabel].filter(Boolean).join(' — ')
      out.push(fact('lookupCrs', `${title}: ${band}`, row.points,
        row.points == null ? row.pointsText : '', 'points', row.evidence))
    }
  }
  return out
}

/**
 * 剧本(设计 §四):`expMonths === 0` 必加学徒岗计数;有 claims 必调 checkClaims。
 * 顺序即优先级 —— 超预算时从尾巴砍,砍掉的是补充信号不是主线。
 * `lang`:四态在这一层就写成用户语言的成句(AVAIL_SENTENCE),模型只照抄不翻译。
 */
export async function collectFacts(
  pool: any, slots: Slots, teerHint?: number | null, lang: ChatLang = 'en', onStep?: OnStep,
  opts: {
    plan?: boolean; federalPrograms?: FederalRuleProgram[]; crs?: CrsLookupArgs[]; allProvs?: boolean
    /** 路径裁决(C5c)。触发判据在 orchestrate:问的是「走哪条路」且档案槽够用 —— 纯函数判,不问模型。 */
    verdict?: boolean
  } = {},
): Promise<{ facts: Fact[]; teer: number | null; title: string }> {
  const noc = slots.noc ?? ''
  const zeroExp = slots.expMonths === 0
  const provs = slots.provs.filter((p) => p !== 'QC')
  const checkable = slots.claims.filter((c) => c.topic !== 'other')
  const S = STEP[lang]
  // 轨迹只在**这一步真的返回了**才发(挂在各自的 promise 上,不是先发再查)——铁律③。
  const tap = <T>(p: Promise<T>, text: (r: T) => string): Promise<T> =>
    (onStep ? p.then((r) => { onStep({ phase: 'tool', text: text(r) }); return r }) : p)
  const federalPs = opts.federalPrograms ?? []
  const crsQs = opts.crs ?? []
  const federalQuery = Promise.all(federalPs.map((program) => tap(lookupPermit(pool, { program }), () => S.permit(program))))
  const crsQuery = Promise.all(crsQs.map((q) => tap(lookupCrs(pool, q), () => S.crs(String(q.grid)))))

  // PGWP / CEC / FSW / FST 规则与两套联邦分表都不依赖职业。纯问这些题时没有 NOC 是正常输入,
  // 不许为了沿用省提名工具而编一个职业码,也不该把用户赶去回答无关的职业问题。
  if (!/^\d{5}$/.test(noc)) {
    const [federal, grids] = await Promise.all([federalQuery, crsQuery])
    return { facts: [...federalRuleFacts(federal, lang), ...crsFacts(grids, lang)].slice(0, MAX_FACTS), teer: null, title: '' }
  }

  const [jobs, coverage, thresholds, ee, claims, federal, grids] = await Promise.all([
    tap(lookupJobs(pool, { noc }), (r) => S.jobs(r.rows.length)),
    tap(lookupCoverage(pool, { noc }), (r) => S.coverage(r.provinces.length)),
    tap(lookupThresholds(pool, {
      // allProvs:他问的是「哪个省」→ 候选集必须是全部省(见 asksWhichProvince 上面那段实录),
      // 摆哪几个由下面的排序决定,不由抽槽那几个省决定 —— 尤其它还可能是模型编的。
      noc, teer: teerHint, provs: provs.length && !opts.allProvs ? provs : undefined,
      profile: slots.expMonths == null ? undefined : { totalExpMonths: slots.expMonths, ...(zeroExp ? { canadianExpMonths: 0 } : {}) },
    }), (r) => S.thresholds(r.provinces.map((p) => p.province).join(' ') || String(noc))),
    tap(lookupEE(pool, { noc }), () => S.ee),
    // 只要有人跟他说过话就调:**第三格「他没提的省」不依赖主张能不能核**(它算的是全九省覆盖)。
    // 原来按 checkable.length 开关 —— 一旦主张全落 'other'(收费类),第三格整个消失,
    // 而那格恰恰是这个产品的杀手锏(中介只会说他有渠道的那个省)。
    slots.claims.length
      ? tap(checkClaims(pool, { noc, teer: teerHint, claims: checkable as Claim[] }),
        (r) => S.claims(r.checked.length + r.uncheckable.length))
      : Promise.resolve(null),
    federalQuery,
    crsQuery,
  ])
  // 🔴 时间线只在**他真的问了「要多久 / 哪条快」**时才算(orchestrate 用 isPlanQuestion 判,纯函数)。
  //    没问就不算:多铺三条时间线只会把答复挤成一张表,而这一层最贵的教训就是「材料不是提纲」。
  //    哪几个省:他点过名的优先;一个省都没点时退到**官方清单收了这个职业**的省 —— 那是可证的信号,
  //    不是我们随手挑三个(PNP_PROVINCES 的前三个只是声明顺序,拿它当默认等于替他选省)。
  const planProvs = !opts.plan ? [] : (provs.length
    ? provs
    : coverage.provinces.filter((c) => c.availability === 'ok' && c.hits.some((h) => h.type !== 'ineligible')).map((c) => c.province)
  ).slice(0, 3)
  const [draws, ops, named, plan, verdict] = await Promise.all([
    Promise.all(provs.slice(0, 3).map((p) => tap(lookupDraws(pool, { prov: p, limit: 1 }), () => S.draws(p)))),
    Promise.all(provs.slice(0, 3).map((p) => tap(lookupOps(pool, { prov: p }), () => S.ops(p)))),
    // 点名过的省即使一个岗都没有也必须出现在 facts 里(C1 契约:「0 也得让他看见」)——
    // apprentice=true 会把 0 的省过滤掉,金标里「曼省 3 个,全国垫底」恰恰要的就是那个小数字。
    Promise.all(slots.provs.slice(0, 3).map((p) => lookupJobs(pool, { noc, prov: p }))),
    // 它内部会把上面那几个 lookup 再调一遍(同参 SQL 走 memoPool 的缓存,不多打一次库),
    // 换来的是**装配入参这件事只有一处**:哪张表喂给 buildPlan 的哪一段,只在 C1 里说一遍。
    planProvs.length
      ? tap(lookupPlan(pool, {
        noc, teer: teerHint, provs: planProvs,
        profile: slots.expMonths == null ? undefined : { totalExpMonths: slots.expMonths, ...(zeroExp ? { canadianExpMonths: 0 } : {}) },
      }), () => S.plan(planProvs.join(' ')))
      : Promise.resolve(null),
    // 🔴 只在他真的问了「走哪条路」时才判(orchestrate 用 isPathQuestion + 档案槽计数判,纯函数)。
    //    teer 用 lookupThresholds 查出来的那一个:通道门槛按 TEER 挑行,自己再算一次迟早两处不一致。
    opts.verdict
      ? tap(lookupVerdict(pool, verdictProfileOf(slots, thresholds.teer), { clbTarget: VERDICT_CLB_TARGET }),
        (r) => S.verdict(r.pathways.length))
      : Promise.resolve(null),
  ])

  const out: Fact[] = []
  const T = LBL[lang]
  // ①0 路径裁决。排在**最前面**是因为他问「走哪条路」时,这几条就是答案本身;
  //     facts 塞不下时是从尾巴上砍的,排在后面等于最该答的那句反而被省级清单挤掉(同 planFacts 的理由)。
  if (verdict) out.push(...verdictFacts(verdict, lang))
  // ① 在招岗位。这是零经验剧本里的第一句话「缺的不是选省,是第一份算数的岗」——
  //    所以给的必须是**这个职业真实的在招盘子**,不是它的某个子集。
  // 🔴 **材料不是提纲**:同一种数字给八个省,模型必然一省写一句(2026-08-04 生产实录:问「中介收 2 万值不值」,
  //    答复里八行省份岗位数)。零经验剧本要的是全国盘子,那时给全 10 省;其余情形
  //    只给点名省 + 前几名(追问「哪个省岗位最多」照样答得了),把「省份点名册」这条诱惑掐掉。
  //    零经验给 6 个(点名省已在最前,去重后仍在):原来是 8,配的是按学徒岗排序;排序键换成真实在招后
  //    一度改成全给 10,实测立刻撞回这条老教训 —— 模型把十个省摆成一句话,还顺手加了一句
  //    「这些省份的清单也收录了该职业」(SK 里 72310 一行都没有)。给多少材料就会被摊成多长的提纲。
  //    小省(NL 18 个岗)进不来是对的:它的价值不在岗位数,在于它有 Day 0 通道 —— 那是 pnp_requirements
  //    该说的话,不该靠把岗位榜拉长来夹带。
  const jobRows = [...named.flatMap((j) => j.rows), ...jobs.rows]
    .filter((r, i, a) => a.findIndex((x) => x.province === r.province) === i)   // 点名省在前,去重
    .slice(0, zeroExp ? 6 : 4)
  for (const r of jobRows) {
    // QC 不属 PNP:数字照给(职位板真有这些岗),但标签自带这句,免得答复把它当成一条省提名路
    const qc = r.province === 'QC' ? ` ${T.qcOutside}` : ''
    // 🔴 主数永远是**总在招**(2026-08-05 改;旧版零经验时只给 apprentice,把安省 129 说成 4):
    //    「雇主明说不要经验」是更好上手的一档,但它是子集 —— 未声明经验要求 ≠ 要经验,
    //    替雇主写一条他没写的门槛,等于把用户的机会面砍掉九成。
    out.push(fact('lookupJobs', `${r.province} ${T.openPostings} (NOC ${noc})${qc}`, r.open, '', 'jobs', r.evidence))
    // 🔴 **一行一个数**。第一版把子集写进同一条 label(`…(NOC 72310;其中不要经验的 4)` = 24),
    //    实测模型立刻串省:facts 是 MB 总 24/子集 4、BC 总 234/子集 15,它写成
    //    「曼省无经验岗位 24 个,BC 省 15 个」—— 拿 MB 的总数配 BC 的子集,两个数都在 facts 里,guard 全放行。
    //    所以子集单独成行,而且**只给他点名的省**:那几个省才是他会照着行动的,其余省多给一个数
    //    只是又一次「材料变提纲」的机会。
    if (zeroExp && r.apprentice > 0 && slots.provs.includes(r.province)) {
      out.push(fact('lookupJobs', `${r.province} ${T.apprSub} (NOC ${noc})`, r.apprentice, '', 'jobs', r.evidence))
    }
  }
  if (jobs.rows.length) out.push(fact('lookupJobs', T.indexNote, null, `${T.checked} ${jobs.checkedAt.slice(0, 10)}`, 'note', { url: '/', fetched: jobs.checkedAt }))
  // ①b 时间线(只在他问了「要多久 / 哪条快」时才有)。排在这么前面是因为**那时它就是答案**:
  //     facts 塞不下时是从尾巴上砍的,排在后面等于问一句最该答的话反而被清单挤掉。
  if (plan) out.push(...planFacts(plan, lang))
  // ①c 用户点名才查的联邦规则 / 计分档。排在主线前部,避免真问题被省级补充事实挤出 40 条上限。
  out.push(...federalRuleFacts(federal, lang), ...crsFacts(grids, lang))
  // ② 省清单命中/四态
  for (const c of coverage.provinces) {
    if (c.hits.length) {
      for (const h of c.hits.slice(0, 2)) {
        // h.label 是库里的中文显示名(「MB 在需职业」);官方原名 h.stream 本身就是英文,en/ko 有它就够了
        out.push(fact('lookupCoverage', `${c.province} ${h.type === 'ineligible' ? T.listEx : T.listIn} NOC ${noc}: ${h.stream}`, null, zhOnly(h.label, lang), 'list', h.evidence))
      }
    // exclusion = 主线按 offer/TEER 或排除清单判断,没有“这份职业清单收不收”这一问。
    // lookupCoverage 的策略说明没有逐 NOC evidence,不把它包装成一条“官方不公布”见客事实；
    // 真正可核的 offer/TEER/雇主门槛由紧接着的 lookupThresholds 提供并逐行挂官方出处。
    } else if (slots.provs.includes(c.province) && c.coverage !== 'exclusion') {
      out.push(statusFact('lookupCoverage', `${c.province} ${T.occList}`, c.availability, zhOnly(c.note, lang), c.hits[0]?.evidence.url ?? '', lang))
    }
  }
  // ③ 官方门槛(只摆被点名省的;need 是官方数,verdict 出自 rules.ts,本层不改)
  // 🔴 **材料不是提纲**(和上面岗位数同一条教训):没点名省时 lookupThresholds 会把九个省全给回来,
  //    九省 × 四行 = 三十多条门槛,模型必然一省一句地念(2026-08-05 实测 C14 英文,一句话点了九个省)。
  //    点过名的省排前,最多三个 —— 追问「别的省什么要求」照样答得了,「省份点名册」这条诱惑掐掉。
  // 🔴 `need == null` 不等于没话说:`verdict==='pass'` 且没有数字 = **官方明说这条通道不设这项门槛**
  //    (rules.ts 里 op='none' 那支)。旧的 `need != null` 把这一整类信号滤掉了,于是
  //    「0 经验去哪个省」永远得到「各省都要求经验」—— 而 NL International Graduate 的官方清单里
  //    根本没有经验这一项。**「没有门槛」和「没查到门槛」在用户那里意思相反**,不能一起丢。
  const speaks = (x: { need: number | null; verdict: string }) => x.need != null || x.verdict === 'pass'
  // 不设经验门槛的省,对 0 经验的人就是答案本身 —— 让它跟点名省一起排在前面,别被 slice(0,3) 切掉
  const waivesExp = (p: { rows: { factor: string; need: number | null; verdict: string }[] }) =>
    zeroExp && p.rows.some((x) => x.factor === 'experience' && x.need == null && x.verdict === 'pass')
  const rank = (p: (typeof thresholds.provinces)[number]) =>
    Number(slots.provs.includes(p.province)) * 2 + Number(waivesExp(p))
  const thrProvs = [...thresholds.provinces].sort((a, b) => rank(b) - rank(a)).slice(0, 3)
  for (const p of thrProvs) {
    if (p.availability !== 'ok') { out.push(statusFact('lookupThresholds', `${p.province} ${T.officialReq}`, p.availability, zhOnly(p.note, lang), '', lang)); continue }
    const streams = new Set(p.rows.filter(speaks).map((x) => x.stream).filter(Boolean))
    for (const r of p.rows.filter(speaks).slice(0, 4)) {
      // verdict/short 也是内部速记(verdict= 在泄露词表里),同样在这一层就换成人话。
      // 🔴 「未判定」且没差额 = 一个字的信息都没有,却会被模型抄成「具体未判定」这种废话
      //    (2026-08-05 实录 C13 中文答复最后半句)。没话说就别给材料 —— 少给比多写一条 RULE 管用。
      const v = r.verdict === 'unknown' && r.short == null ? '' : (T[r.verdict as 'pass' | 'fail' | 'unknown'] ?? '')
      // 同省规则若来自多条官方通道，必须把通道名写进事实。否则模型会把 EDI 雇主门槛、SWM 在职时长
      // 和职业清单语言档硬拼成一条“同时满足”的路线；每个数字虽有出处，组合起来仍是假话。
      const streamName = streams.size > 1 ? r.stream ?? '' : ''
      // 官方流名有的自带省码(「BC PNP Skills Immigration…」),再前置省码就渲成「BC BC PNP…」的结巴;
      // 词边界匹配,「BCIT」这类以省码开头的普通词不受影响。
      const head = streamName
        ? (new RegExp(`^${p.province}\\b`).test(streamName) ? streamName : `${p.province} ${streamName}`)
        : p.province
      // 🔴 「不设这项门槛」和「要求满 N」是**意思相反**的两句话,不能共用 factor 那套模板 ——
      //    套上去会写出「NL 要求申请人的工作经验满」后面跟一个空值,把这条通道最值钱的性质说反。
      //    没有对应译法的因素退回原模板(宁可少说一句,不许说反)。
      const none = r.need == null && r.verdict === 'pass' && T.factorNone[r.factor]
      if (none) { out.push(fact('lookupThresholds', `${head} ${none}`, null, '', 'rule', r.evidence)); continue }
      // 🔴 languageExempt 的值不一定是等级:ON 那行 value=3 unit=years(官方原句「毕业 3 年内免语言考试」),
      //    套 factor 模板会拼出「规定申请人可以豁免语言的等级是 3 years」—— 年限被读成 CLB 等级,意思全错。
      //    年限型整句在这儿拼好(值嵌句中,guard 收 label 里的数,账不变);等级型豁免行照旧走 factor 模板。
      if (r.factor === 'languageExempt' && /^years?$/i.test(r.unit ?? '') && r.need != null) {
        out.push(fact('lookupThresholds', `${head} ${T.exemptYears(r.need)}`, null, '', 'rule', r.evidence)); continue
      }
      // 差额跟着单位走:CAD 类差额也要 $ + 千分位(值那头 sayFact 管,这条注文只能在这儿管)
      const short = r.short == null ? '' : `,${T.short} ${/^CAD\b/i.test(r.unit ?? '') ? `$${r.short.toLocaleString('en-US')}` : r.short}`
      out.push(fact('lookupThresholds', `${head} ${T.factor[r.factor] ?? r.factor}`, r.need,
        `${v}${short}`, r.unit, r.evidence))
    }
  }
  // ④ 抽选史(最近一轮)
  for (const d of draws) {
    if (d.availability !== 'ok' || !d.rows.length) { out.push(statusFact('lookupDraws', `${d.province} ${T.draws}`, d.availability, zhOnly(d.note, lang), '', lang)); continue }
    const r = d.rows[0]
    if (r.score != null) out.push(fact('lookupDraws', `${d.province} ${T.drawCut} ${r.stream} (${r.scale}) ${r.drawDate}`, r.score, r.scale, 'points', r.evidence))
    if (r.invitations != null) out.push(fact('lookupDraws', `${d.province} ${T.drawInv} ${r.drawDate}`, r.invitations, '', 'invitations', r.evidence))
  }
  // ⑤ 运营统计(等多久 / 名额 / 池子);value=null 的抑制值原样带走,绝不折成 0
  const OPS_KEYS = ['eoi_pool_total', 'eoi_pool', 'allocation', 'remaining', 'nominations_ytd', 'processing_weeks']
  for (const o of ops) {
    if (o.availability !== 'ok') { out.push(statusFact('lookupOps', `${o.province} ${T.opsStats}`, o.availability, zhOnly(o.note, lang), o.officialUrl, lang)); continue }
    const picked = o.metrics.filter((m) => OPS_KEYS.includes(m.key)).sort((a, b) => OPS_KEYS.indexOf(a.key) - OPS_KEYS.indexOf(b.key)).slice(0, 6)
    for (const m of picked) {
      // m.key 是库里的内部指标码(eoi_pool_total…),照抄出去就是见客事故;scope 是官方原文,保留
      out.push(fact('lookupOps', `${o.province} ${T.opsKeys[m.key] ?? m.key}${m.scope ? ` — ${m.scope}` : ''}`, m.value, m.value == null ? zhOnly(m.valueText, lang) : `${m.asOf || m.period}`, m.unit, m.evidence))
    }
  }
  // ⑥ 联邦 EE(独立信号,不是省提名的一条路)
  if (ee.availability === 'ok' && ee.matched) {
    for (const r of ee.rows.slice(0, 2)) out.push(fact('lookupEE', `${T.eeCat} ${r.category} ${T.drawCut} ${r.drawDate}`, r.drawCrs, zhOnly(r.label, lang), 'CRS', r.evidence))
  } else {
    out.push(statusFact('lookupEE', T.eeAll, ee.availability, zhOnly(ee.note, lang), '', lang))
  }
  // ⑦ 第三方说法对账。私人报价/包办不是一项政府数据:所有商业话术只给一条判断,
  //    不套「官方不公布」,也不让收费与承诺各重复一遍同义空话。
  const [lead, close, dash] = CLAIM_LEAD[lang]
  const commercial = slots.claims.filter((c) => c.topic === 'private-promise' || isMoneyTalk(c.text))
  if (commercial.length) {
    out.push(fact('checkClaims', commercialClaimLabel(commercial.map((c) => c.text), lang), null, '', 'claim', { url: '/', fetched: '' }))
  }
  for (const c of slots.claims.filter((x) => x.topic === 'other' && !isMoneyTalk(x.text))) {
    out.push(fact('checkClaims', otherClaimLabel(c.text, lang), null, '', 'claim', { url: '/', fetched: '' }))
  }
  if (claims) {
    for (const c of [...claims.checked, ...claims.uncheckable]) {
      // availability='ok' 时**不往 label 里塞 why**:why 是工具层的长取证注(实测 200+ 字),
      // 塞进来会被 fact() 的 120 字截断,给用户一句断在半截的话。why 留在 valueText 给前端出处用。
      // ok = 工具层有数据可对照。why 是 C1 的长取证注(200+ 字),塞进 label 会被 120 字截成半句话,
      // 所以这里给一句自己的短话,把用户引到答复里已经摆出的官方数字上;why 照旧留在 valueText 给前端出处。
      const state = `${dash}${c.availability === 'ok' ? T.claimOk : AVAIL_SENTENCE[lang][c.availability]}`
      // 私人承诺的解释句取**本层三语字典**,不取 C1 的 why(那是中文硬编码)。判据用 C1 同一个正则,
      // 不新写词表;topic 已在 normalizeSlots 改判过,这里再核一次原话纯属保险。
      // 其余主张:C1 的 why 是中文取证注,只给中文用户,且长的(个别 note 200+ 字)不进见客文案 —— 会被截成半句话。
      // 四态成句照旧放最前 —— 它是出口校验认状态的锚点,不能被解释句顶掉。
      const sep = sepOf(lang)
      const isPromise = c.claim.topic === 'private-promise' || PRIVATE_PROMISE.test(c.claim.text || '')
      if (isPromise) continue
      const why = zhOnly(c.why, lang).trim()
      // availability='ok' 时连 why 都不要:T.claimOk 已经把「这条能拿下面的官方数字对照」说完了,
      // 再接一句 C1 的「这条能对照:上面是本站职位板索引里的在招数」就是同一句话说两遍(2026-08-05 实测)。
      const tail = isPromise ? `${sep}${PROMISE_WHY[lang]}`
        : (c.availability !== 'ok' && why && why.length <= 80 ? `${sep}${why}` : '')
      // 🔴 原话按剩余额度截(claimLabel):四态成句与解释句是我们自己的见客文案,一个字都不许被 320 帽砍掉
      out.push(fact('checkClaims', claimLabel(lead, c.claim.text, close, `${state}${tail}`), null, zhOnly(c.why, lang), 'claim',
        { url: c.claim.province ? `/?prov=${c.claim.province}` : '/', fetched: '' }))
    }
    // 他点过名的省不许进第三格:checkClaims 只认它收到的那几条主张的省份,
    // 落 'other' 的主张(「曼省有合作公司」若被判成收费类)带的省它看不见 —— 这里补齐。
    const named = new Set([...slots.provs, ...slots.claims.map((c) => c.province).filter(Boolean) as string[]])
    const unsaid = claims.unsaid.filter((u) => !named.has(u.province))
    if (unsaid.length) {
      out.push(fact('checkClaims', T.unsaid, null,
        unsaid.map((u) => u.province).join(' '), 'list', { url: '/', fetched: '' }))
    }
  }
  return { facts: out.slice(0, MAX_FACTS), teer: thresholds.teer, title: thresholds.title }
}

// ── 第三步:合成(模型只把 facts 说成人话)───────────────────────────────────

// 不给 facts 编号、不带工具名:实测模型会去引用「第 11 条事实」,那个 11 就是一个凭空的数字,
// 自己给自己制造 guard 违规。无编号的破折号行没有这个副作用。
// 单位也按用户语言给:prompt 里留着 `= 3 jobs`,模型就会抄出「3 jobs 个带学徒岗位」这种叠词
// (2026-08-04 实测)。喂进去就是干净的,比回来再修便宜。
//
// 🔴 2026-08-05:`=` 从这里彻底消失。旧形状 `- 标签 = 值 | 备注` 是**一行表格**,模型最省力的路
// 就是照抄一行表格 —— 生产实录整段答复就是这么来的(韩文那轮甚至把 `=` 原样抄了出去,撞 findFactDump
// 连撞两次,一段本来能用的答复被降级成清单)。现在一条 fact 渲染出来就是**一句话**:
//   门槛类(lookupThresholds)label 是半句话,值直接续上 → 「NS 要求申请人的语言达到 5 CLB」;
//   计数类 label 是名目,冒号接值 → 「MB 现在的在招岗位 (NOC 72310): 3 个岗位」;
//   四态/主张行 label 本身已经是成品句。
/**
 * 一条 fact → 一句话(prompt 与降级清单共用同一份口径,不许两处各写各的)。
 *
 * `brief`(只有降级清单用):把**取证注**那截砍掉 —— 四态行的 valueText 是
 * `官方不公布这项数据(不是本站没查到) — <C1 的 200 字取证注,注里还套着括号>`,
 * 摆进 prompt 是对的(模型要靠它分清「不公布」和「没收录」),摆进见客清单就是 Frank 说的
 * 「一坨 - 标签: 值 — 一长串 note,note 里还夹着括号里的括号」。状态那半句一个字不动,砍的是后面的注。
 */
export function sayFact(f: Fact, lang: ChatLang, opts: { brief?: boolean } = {}): string {
  if (f.unit === 'status') {
    const v = opts.brief ? f.valueText.split(' — ')[0] : f.valueText
    return `${f.label}: ${v}`
  }
  // 英文单复数:喂进去的是 `1 jobs`,抄出来的就是「1 jobs in ON」(2026-08-05 实测)。
  // 88% 是英文流量,这种小语法错读者一眼看得见 —— 在喂之前就改对,比回来再修便宜。
  const u0 = f.value != null ? unitText(f.unit, lang) : ''
  const u = lang === 'en' && f.value === 1 ? u0.replace(/s$/, '') : u0
  // 钱和分制在喂之前就写成人话(2026-08-06 生产实录「薪资至少 100006」「6 CLB」):
  //   · CAD 类 → `$100,006/年`($ + 千分位;guard 的 normNum 会剥逗号,账还是同一个数);
  //   · CLB → 分制名在前(「CLB 6」),数字在前是病句。模型照抄 FACTS,喂对了才抄得对。
  const v = f.value == null ? f.valueText
    : /^CAD\b/i.test(f.unit) ? `$${f.value.toLocaleString('en-US')}${/\/yr$/i.test(f.unit) ? ({ zh: '/年', en: '/yr', ko: '/년' } as const)[lang] : ''}`
      : f.unit === 'CLB' ? `CLB ${f.value}`
        : `${f.value}${u ? ` ${u}` : ''}`
  if (!v) return f.label                                   // 主张行:label 就是整句话,别再甩个「: -」
  // 门槛行的 label 是半句话(值是这句话的宾语);其余是「名目 + 数值」,冒号连
  const head = f.tool === 'lookupThresholds' ? `${f.label} ${v}` : `${f.label}: ${v}`
  const note = f.value != null && f.valueText ? f.valueText : ''
  return note ? `${head}(${note})` : head
}
const factLine = (f: Fact, lang: ChatLang) => `- ${sayFact(f, lang)}`

/** facts → 紧凑文本(预算内逐条塞,塞不下就停;尾部优先级最低,砍掉不影响主线)。 */
export function factsBlock(facts: Fact[], budget = PROMPT_BUDGET, lang: ChatLang = 'en'): string {
  const lines: string[] = []
  let used = 0
  for (let i = 0; i < facts.length; i++) {
    const l = factLine(facts[i], lang)
    if (used + l.length + 1 > budget) break
    lines.push(l); used += l.length + 1
  }
  return lines.join('\n')
}

// 🔴 **提示词里不用大写做强调**(2026-08-06 实测:英文首句回来是 `**WE** do not have a record…` ——
//    RULE 0 里用来加重语气的 WE 被原样搬进了答复)。模型分不清「这个词很重要」和「这个词要照抄」,
//    加重语气只能靠结构(编号规则 / (hard) 标记 / 独立成句),不靠字形。出口另有 findShoutedWords 复查。
//    段名(FACTS / QUESTION / EARLIER / CLAIM LINES / RULE n)照旧大写:它们是**结构锚点**不是强调,
//    而且 findLeaks 早就逐个盯着,漏出去当场拦。
// 🔴 2026-08-06 Frank 实测发飙整改:旧版这里让模型说「缺的不是省份,是第一份工作」——那是判定层
//    出现**之前**的剧本(当年只有岗位计数工具)。现在各省差异(NL 不要经验/MB 倒扣外省/ON 毕业生减免)
//    正是答案本身,再说「不缺省份」= 一开口就把用户要买的东西说成不重要。省份与第一份工作是**同一个决策**。
const PLAYBOOK_ZERO_EXP =
  'PLAYBOOK: this person has zero work experience. Right after the sentence that answers their question, '
  + 'quote the open-posting counts from FACTS — both the province they asked about and the provinces with the most — '
  + 'and say that where they take their first job decides which pathways open later. Never say or imply that the '
  + 'province does not matter. '
  // 🔴 「其中雇主写明不要经验的 N」是**子集**,不是他的全部机会(2026-08-05:旧剧本让模型只报这个子集,
  //    于是安省 129 个在招被说成 4 个)。没写经验要求的岗不等于要经验 —— 不许替雇主加一条他没写的门槛。
  + 'Where a FACTS line also shows how many of those postings state that no experience is needed, treat that as an easier subset '
  + 'of the same total, never as the whole opportunity, and never imply the other postings require experience. '
  + 'Only after that discuss lists, draws or programs. '
  + 'An experience requirement is a matter of timing, not of eligibility: say how many months short they are and where the work counts. '
  + 'Never phrase it as "you do not qualify" or "you fail".'
// 裁决剧本(2026-08-06,Frank「前几条能给用户价值,用户才有欲望继续问,能继续问才有付费的可能性」):
// facts 里有逐通道裁决时,开头几句必须先交付最值钱的发现,价值排序压过工具顺序。
const PLAYBOOK_VERDICT =
  'PLAYBOOK (when FACTS contains pathway verdicts, this outranks the zero-experience playbook): the reader asked '
  + 'which route works, so the opening sentences must hand over the most decision-changing findings first. '
  + '(1) If any pathway line in FACTS has no experience requirement or is open right now, name it — with its province — '
  + 'in the first two sentences. '
  + '(2) The differences between provinces are the answer itself: never say or imply that the province does not matter. '
  + 'If FACTS shows a province that penalises or excludes this person, or one with a shorter requirement for them, '
  + 'give each such province one sentence with the reason. '
  + '(3) Treat the first job and the choice of province as one decision: where the months are worked decides which '
  + 'pathways open — when FACTS has lines about in-province or same-employer requirements, use them here. '
  + '(4) Where FACTS shows posting counts with a "no experience stated" subset, treat that subset as an easier slice '
  + 'of the same total, never as the whole opportunity. '
  + '(5) An experience requirement is a matter of timing, not eligibility: say how many months short they are and '
  + 'where the work counts. Never phrase it as "you do not qualify".'
const PLAYBOOK_CLAIMS =
  'PLAYBOOK: a third party told them something, so what they really want to know is whether it holds up and what they should go '
  + 'and check. Sentence one must answer the trust or worth question. If CLAIM LINES contains a decision-oriented caveat about a '
  + 'sales pitch, use it once and do not replace it with "cannot verify" or "the government does not publish this". Then give the '
  + 'things they can actually check as one short bullet list. A genuine data-availability claim may get one separate sentence. Never '
  + 'summarise the whole question as "everything cannot be verified". If they ask whether it is worth it or whether to trust '
  + 'someone, the answer is which published requirements the pitch does or does not establish.'
/**
 * 🔴 概率类问题走自己的路(2026-08-04 生产实录:追问「What are my odds of being picked?」
 * 回来的是上一轮那批清单与门槛,一个字没答概率)。本站红线是**不算胜率**,所以正确答复不是绕开话题,
 * 而是**当面说清为什么算不了**,再把最接近的两个官方数字原样摆出来 —— 说不了就说不了,不许拿别的事实顶上。
 */
const PLAYBOOK_ODDS =
  'PLAYBOOK (this outranks the order of FACTS): the question asks for odds, a chance, a probability or how likely something is. '
  + 'Nobody can compute that and you must not try. Sentence one: say plainly that this cannot be answered, because no government '
  + 'publishes who is in the pool, where any one person stands in it, or what the next cutoff will be. Sentence two onwards: give at most '
  + 'two raw numbers from FACTS that are the closest thing on record (pool size, invitations in the latest draw, the latest cutoff), '
  + 'say what each number is, and stop. Never divide one by another, never turn them into a rate or a ranking, and never call anything '
  + 'high, low, good, bad or competitive. Job-posting counts are not an answer to a question about odds — do not list them here, and '
  + 'if FACTS has no pool, draw or cutoff line, say that and write nothing further.'
/**
 * 🔴 「要多久 / 哪条更快」走时间线剧本(C3 buildPlan 的落点)。
 *
 * 为什么要单独一条剧本:这两个问题模型最爱**自己加加减减**(把门槛的 12 个月和处理时长的 3 个月
 * 加成 15,或者把「两周一轮」说成「两周就能下来」)。加出来的数每一位都溯得回 facts,
 * guard 一个字都拦不住 —— 所以算术必须在 FACTS 里就是现成的(buildPlan 已经算好并挂了出处),
 * 剧本的活是让它**只念不算**,并且在有未知段时说清「总数给不了」而不是把下界当总数报出去。
 */
const PLAYBOOK_PLAN =
  'PLAYBOOK (this outranks the order of FACTS): the question asks how long a path takes, or which path is faster. '
  + 'The timeline in FACTS is already worked out segment by segment — each segment, each floor and each difference is its own '
  + 'line. Quote those lines as they stand and never add, subtract, average or convert anything yourself: a total you worked out '
  + 'is a lie here even when every part of it came from FACTS. Where a line gives only a floor, or says a segment cannot be worked '
  + 'out, say plainly that the full length cannot be given, name that segment and say who is missing it (the government does not '
  + 'publish it / our site has not indexed it) — never let a floor stand in for a total. Say one path is faster only if a FACTS line '
  + 'says so, in the same words that line uses (at the very least / added up). Never turn any of this into a date, a deadline or a '
  + 'promise, and never say how long the reader will wait to be picked in a draw — the draw line is how often the province opens a '
  + 'round, nothing more.'
/** 三语的「要多久 / 哪条更快」问法。只收明确在问**时长或快慢**的说法(「多久没开过」也在内:同一批材料能答)。 */
const PLAN_RE =
  /how long|how many (?:months|years|weeks)|how soon|how fast|faster|quicker|sooner|time ?line|end to end|多久|多长时间|多少个月|几个月|多快|更快|快多少|哪条快|哪个快|时间线|排期|얼마나 걸리|얼마나 오래|더 빠른|더 빨리|기간이/i
export const isPlanQuestion = (text: string) => PLAN_RE.test(text)
/** 三语的「概率/机会/胜算」问法。宁可漏判(照常答)也不错判 —— 词表只收明确在问可能性的说法。 */
const ODDS_RE = /\bodds\b|\bchances?\b|probabilit|likelihood|how likely|概率|几率|機率|胜算|勝算|被抽中的可能|多大机会|확률|가능성이 (?:얼마|어느)|뽑힐/i
/** 「找到工作的机会」问的是岗位不是抽选池:带这些词就不走概率剧本(否则会把一句抽选池的话答给找工作的人)。 */
const JOBWORD_RE = /\bjobs?\b|\bposting|\bwork\b|\bhir(?:e|ing)|\bemploy|岗位|職位|工作|就业|就業|일자리|취업/i
export const isOddsQuestion = (text: string) => ODDS_RE.test(text) && !JOBWORD_RE.test(text)
/** 「他问的是抽选/名额/等多久吗」:只有问到了,那两个工具的四态行才是答案而不是管道内情。 */
const DRAW_TOPIC_RE =
  // ⚠️ 「提名 / nomination」不收:满大街的问题都带这两个字(「中介说包省提名」),收了等于没过滤
  /\bdraws?\b|cutoff|invitation|quota|allocation|processing time|how long|\bwait\b|抽选|抽籤|分数线|名额|邀请|处理周期|等多久|多久|추첨|커트라인|초청|배정|처리 기간|얼마나 걸리/i

/**
 * facts 指纹(FNV-1a → 7 个字母)。**这不是装饰,是正确性**:
 * 朋友服务按 prompt 前 ~2000 字符缓存,而 FACTS 排在窗口外 —— 同一句问话、同一个职业,
 * 库里数字变了(本站日更!)或换了个省,缓存照样把**上一次那段答复**还给你。
 * 头上放一个只由 facts 决定的标记,数据一变缓存键就变。**纯字母**:掺不进 guard 的数字账。
 */
export function factsFingerprint(facts: Fact[]): string {
  let h = 2166136261
  for (const f of facts) {
    const s = `${f.label}|${f.value}|${f.valueText}`
    for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0 }
  }
  let out = ''
  for (let i = 0; i < 7; i++) { out += String.fromCharCode(97 + (h % 26)); h = Math.floor(h / 26) }
  return out
}

export function synthMessages(
  facts: Fact[], userText: string, lang: ChatLang,
  opts: {
    zeroExp: boolean; hasClaims: boolean; hasVerdict?: boolean; occ: string
    forbid?: string[]; banned?: string[]; sameOpen?: string[]; history?: ChatTurn[]
  },
): ChatMessage[] {
  const L = LANG_NAME[lang]
  const isOdds = isOddsQuestion(userText)
  const system = [
    'You write the reply for an immigration job board. You never decide, rank, score or compute.',
    // 🔴 病根就在这条(2026-08-04 生产实录):这一步的目标曾经是「把 facts 组织成人话」,于是模型
    //    按 FACTS 的顺序背材料 —— 问「值不值」答的是清单与门槛,追问「概率多大」回来的还是那批清单,
    //    两轮几乎一字不差。目标必须是**回答这一个问题**,facts 是材料不是提纲。
    'RULE 0 (this outranks every other rule): you are answering one single person, not filling in a form. Read QUESTION first and work '
      + 'out what they are actually worried about or trying to decide, then make your first sentence speak to that worry. FACTS are raw '
      + 'material, not an outline — their order is our storage order and it must never become the order of your reply; leave out every '
      + 'line that does not bear on the worry. If FACTS has nothing on it, say in the first sentence that our site has no record of it — '
      + 'and never say that a government does not publish something unless a FACTS line says so about that exact thing (blaming the '
      + 'government for a gap that is ours is a lie in the other direction). Never answer a different question instead, and never pad '
      + 'the reply with facts nobody asked about.',
    // 🔴 组织方式(2026-08-05,Frank:「按自己的字段顺序倾倒」):读者要的是「这事靠不靠谱、我该去核什么」,
    //    所以第二句起按**他能拿去做什么**分两拨,能核的排前 —— 不是按我们的表分。
    'RULE 0b: after that first sentence, sort what is left by what the reader can do with it, never by what kind of record it came '
      + 'from. First the things he can check or settle himself — put them in one short bullet list, one item per line beginning with '
      + '"- " ("- the province asks the employer to have been in business N years"), two to four lines, never one line per province. '
      + 'Then, only if it still matters, the things nobody can check, each as an ordinary sentence with its own '
      + 'state sentence. You may end with one short sentence saying what single question or document settles one of those checkable '
      + 'items (for example that how long the company has been running is settled by asking the employer) — state it as a fact about '
      + 'what settles it, never as advice, never with the words recommend / should / make sure / hurry.',
    `RULE 1 (hard): every number you write has to appear verbatim in FACTS or in the QUESTION. Do not add up, average, convert or `
      + 'estimate anything — a number you computed yourself is a lie here. That includes re-notating a number the reader wrote: if they '
      + 'typed 2 万, write 2 万, never 20,000.',
    // ⚠️ 这条只管序数。别让它蔓延到数量:模型会写「曼省有三份」,而 guard 只认阿拉伯数字 —— 中文数字
    //    是它的盲区,写成「八份」照样放行(2026-08-04 实测)。数量一律阿拉伯数字,guard 才管得着。
    'RULE 2: write ordinals and step words as words (first, second) — but every quantity taken from FACTS goes in '
      + 'Arabic digits exactly as FACTS has it (3, 15, 477), never spelled out in words.',
    // ② 语义要留、代码要走:四态是我们的内部枚举,读者看不懂 NOT-PUBLISHED,但「不公布」和「没收录」的区别一步都不能少
    // ② + 状态合并回归:句子已经在数据层写好了,模型只许照抄,一句只能盖一条主张
    `RULE 3 (hard): each FACTS line that has no number already carries its state as a finished sentence in ${L}. Use that wording for `
      + 'that line: you may fold it into one natural sentence of your own about that one claim, but the sentence still has to say who does '
      + 'not have the information (the government does not publish it / our site has not indexed it) and what it is about. Two different '
      + 'state sentences may never be covered by one sentence of yours: "the government does not publish this" and "our site has not '
      + 'indexed this yet" are different facts, and merging them — or softening either one into "there is no data" — is a lie. Give each '
      + 'claim its own sentence with its own state. Never print an internal code '
      + '(NOT-PUBLISHED, NOT-COLLECTED, N-A, INDEX SCOPE) or a field name (availability, evidence, verdict, scope, tool names), and '
      + 'never merge any state into "there is none". Always name what the sentence is about (the label on that line): a state sentence '
      + 'floating with no subject ("our site has not indexed this yet", about nothing) tells the reader nothing.',
    'RULE 4: do not name programs, provinces, requirements, fees or dates that are not in FACTS, and do not give legal '
      + 'or regulatory statements ("the law forbids X") — if FACTS does not say it, you do not say it.',
    // 🔴 2026-08-06 松绑(Open WebUI 取样得出的因果):我们**渲染不了 markdown** → 这条曾经明令
    //    「不许标题/加粗/列表」→ 于是答复只能是一坨无结构长文。「格式乱」不是乱,是被我们自己禁掉的。
    //    前端 ChatText(3ebe64c)现在**只认两样**:空行分段、行首 `- `(连续多条合成一组、真悬挂缩进),
    //    不认标题/加粗/表格/代码块。所以这条改成**允许那两样、其余仍禁** —— 允许的正好等于渲染得出来的,
    //    多允许一样就是又一个见客的裸记号。编号列表(`1.`)也仍然禁:它撞 guard 的行首序号白名单
    //    (那道白名单会把行首的 1-2 位数当排版放行),而且渲染器不认它,`1.` 会原样留在正文里。
    // 🔴 **什么时候该用列表**(不说清,模型会把整篇变成列表 —— 那和一坨长文一样难读):
    //    只有 bucket A(「你可以自己去核的这几件」)这类**并列同质项**才配列表 —— 它们本来就被
    //    RULE 0b 压成一句长句,那正是最难读的一句。答问题的交易判断与数据可得性句**保持成句**,
    //    拆成项目符号会把主语和判断的连接掐断,还会连出三条句式雷同的项。
    'RULE 5: exactly two pieces of formatting are allowed, and nothing else. (a) a blank line between paragraphs; '
      + '(b) a line that begins with "- " for one item of a short list. Everything else is still forbidden: no "#" headings, '
      + 'no "**" bold, no tables and no "|" columns, no code blocks, no numbered list ("1." "2."), no URLs. '
      + 'Use the list for one thing only: the two to four parallel items this reader can go and check for himself. '
      + 'The sentence that answers the question, and every sentence about data availability, stay ordinary sentences and '
      + 'are never bullets — a reply that is all bullets is exactly as unreadable as one with none. '
      + 'FACTS lines are unnumbered — never refer to "fact number N" and never repeat the two-letter tags as codes the reader must '
      + 'decode; the "- " in FACTS is our own formatting, not a shape to copy back.',
    // 🔴 实测的失败形态就是这个:把 FACTS 当稿子逐行抄(「ON requires … = 5 CLB」「AB open postings … equal 162 jobs」)。
    //    数字全溯得回 facts,所以 guard 放行 —— 只能在这条规则 + 出口的 findFactDump 两头堵。
    // ⚠️ 2026-08-06 实测又见一种抄法:`该职业在 MPNP In-Demand Occupations List: MB 在需职业清单中` ——
    //    连我们 label 里那个冒号一起抄了过去(findFactDump 只认 `=` 和整条 label,这种漏得掉)。
    'RULE 5b (hard): never transcribe a FACTS line. No "=" anywhere in the reply, no "label: value" or "label = value" shapes, '
      + 'and never copy a FACTS label together with the colon that follows it — the words after that colon are an official name, so '
      + 'write them inside a sentence of your own. Also, '
      + 'never one sentence and never one bullet per province: if several provinces carry the same kind of number, they go in one single '
      + 'sentence or one single bullet, and if they do not help answer the question they do not go in at all. A reply that walks down the '
      + 'FACTS list is a failed reply, and turning that walk into bullets does not make it a different reply.',
    // 🔴 句式雷同 = 在念表格(2026-08-05 实录:"NS requires the applicant to reach…" / "NS requires the applicant to have…"
    //    / "NS requires the employer to…" 连着三句)。出口有 findSameOpening 机械复查这条。
    'RULE 5c (hard): no two sentences in a row may begin with the same words, and three sentences with the same opening is a failed '
      + 'reply — that shape means you are reading a table out loud. Requirements that share an opening belong in one single sentence.',
    // ① 语言纯度(手法照 api/advisor 的建议行那条:专名保留 + 其余一律目标语,不重造)
    `RULE 6 (hard): write every single word in ${L}. FACTS are English shorthand — never paste a FACTS line, a FACTS label or a FACTS `
      + 'unit word (jobs, openings, postings, years, months, weeks, days, points, people, invitations, spots, cutoff, latest, requires) '
      + `into the reply; say each of those in ${L}. Only two things may stay in English: the official name of a programme or list `
      + `(e.g. MPNP In-Demand Occupations List), which must be followed at once by a short gloss in ${L}; and the abbreviations `
      + 'PNP, EE, CRS, CLB, NOC, TEER, LMIA plus two-letter province codes. No other word may be written in capital letters, not even '
      + 'for emphasis. Keep the subject straight: a requirement on the employer is not a requirement on the applicant.',
    // ③ 上游忽略 max_tokens(friendLlm 顶部实测记录)→ 长度只能靠这条 + 出口截断
    `RULE 7 (hard): at most ${LEN_CAP[lang]} characters and at most ${SENT_CAP} lines, where every bullet counts as one line — but the `
      + 'target is three or four sentences plus a two-to-four-line list, plus one more sentence '
      + 'for each separate thing this person was told. Stop the moment '
      + 'the question is answered; an extra fact nobody asked for makes the reply worse, not fuller. Everything past the cap is cut off '
      + 'before the reader sees it. Never restate a number you already gave, and never write a closing summary sentence.',
    // ④ 没有 fact 撑腰的政策断言:数字 guard 拦不住,但错了一样赔信任
    'RULE 8 (hard): you may say only four kinds of thing — (a) restate a FACTS line in your own words, (b) state plainly that FACTS '
      + 'does not cover something, (c) state that a claim cannot be checked and why, (d) for one requirement that is already in FACTS, '
      + 'say what single question the reader could ask to settle whether it is met — naming no document, programme, authority or '
      + 'process that is not already in FACTS. You may not generalise ("usually", "in general", '
      + '"most provinces"), rate competition or difficulty, estimate a chance, a wait or a probability, predict any outcome, describe '
      + 'what governments, agents, schools or employers normally do, or tell the reader to hurry, pay, refuse, move or study more. '
      + 'If a sentence would come from your own knowledge rather than a FACTS line, delete it.',
    // ⑤ 多轮:上一轮说过的不再说一遍(实录里第二轮把第一轮整段又背了一次)
    (opts.history ?? []).some((h) => h.role === 'assistant')
      ? 'RULE 9 (hard): EARLIER is what this reader has already read. Do not repeat a number, a list name or a sentence that '
        + 'EARLIER already gave — answer only what the new question adds. If nothing new can be said from FACTS, say that in one '
        + 'sentence and stop; a reply that repeats the previous one is a failed reply.'
      : '',
    isOdds ? PLAYBOOK_ODDS : '',
    // 两条剧本不同时上:「被抽中的概率要多久」两边都命中,而概率那条是更硬的拒答 —— 让它说了算,
    // 免得同一段提示里既说「不许算」又说「照着时间线念」,模型只会挑一句听。
    !isOdds && isPlanQuestion(userText) ? PLAYBOOK_PLAN : '',
    opts.hasVerdict ? PLAYBOOK_VERDICT : '',
    // 裁决剧本在场时零经验剧本让位(两条同上会打架:一条说先报岗位数,一条说先报通道 —— 模型只会挑一句听)
    opts.zeroExp && !opts.hasVerdict ? PLAYBOOK_ZERO_EXP : '',
    opts.hasClaims ? PLAYBOOK_CLAIMS : '',
    opts.forbid?.length
      ? `You already broke RULE 1 once. These numbers are not in FACTS and are banned from your reply: ${opts.forbid.join(', ')}. Rewrite without them.`
      : '',
    opts.banned?.length
      ? `You already broke RULE 3, RULE 5b or RULE 6 once. These exact strings may not appear anywhere in your reply: ${opts.banned.join(', ')}. `
        + `They are internal codes, English shorthand, or FACTS lines you transcribed — say what they mean, in ${L}, in your own sentence.`
      : '',
  ].filter(Boolean).join('\n')
  // 上一轮答复要留够字数才看得出「哪些已经说过」(200 字只够看个开头,模型照样重复整段)
  const hist = (opts.history ?? []).slice(-2).map((h) => `${h.role}: ${h.content.slice(0, h.role === 'assistant' ? 420 : 200)}`).join('\n')
  // 主张行单独拎出来放头部,FACTS 里就不再重复(省 prompt 预算,也免得模型两处各抄一遍)
  // 只给成品句,不带 valueText 的 why:why 是工具层的取证注(常常在讲另一个指标,如「MB 不发处理时长统计」),
  // 抄进答复既长又答非所问。它照旧留在 Fact 里给前端出处用。
  const claimLines = facts.filter((f) => f.unit === 'claim').map((f) => `- ${f.label}`)
  // 概率类问题**不给岗位数当材料**:在招岗位与「会不会被抽中」无关,而只要摆在 FACTS 里,
  // 模型就会拿它顶上(2026-08-04 实录:一句拒答之后跟着 BC 229、AB 162、ON 121、QC 55)。
  // 少给材料比多写一条规则管用 —— 数字照旧在 facts 里(出处区和 guard 的账一分不少),只是不进这次的稿子。
  // 🔴 抽选/运营那两条**四态行**是我们的管道内情,不是他的答案(2026-08-05 实测英文 C13 末尾两句:
  //    "Our site has not indexed Nova Scotia draw history yet. Our site has not indexed Nova Scotia operational stats yet." ——
  //    人家问的是「老板的承诺能不能信」)。RULE 里写了「别提没人问的记录」照样被抄,所以**不给材料**:
  //    只有问到抽选/名额/等多久时才摆出来(那时它是正经答案:「这个省的抽选记录本站还没收」)。
  //    facts 一条不少(出处区与 guard 的账不动),只是不进这次的稿子 —— 和概率题不给岗位数同一个手法。
  //    没问抽选/名额的人,连那两个工具的**数字**也不给:2026-08-05 实测 C01(问的是中介收 2 万),
  //    模型把 632 分和 74 个邀请写了一句,反倒把「曼省官方清单收没收这个职业」——中介那句话站不站得住的
  //    唯一依据 —— 挤了出去。概率题例外:那时抽选池就是最接近的官方数(PLAYBOOK_ODDS 点名要它)。
  const asksDrawOps = DRAW_TOPIC_RE.test(userText) || isOdds
  const rest = facts.filter((f) => f.unit !== 'claim' && !(isOdds && f.unit === 'jobs')
    && !(!asksDrawOps && (f.tool === 'lookupDraws' || f.tool === 'lookupOps')))
  const budget = PROMPT_BUDGET - userText.length - hist.length - claimLines.join('').length - 900
  // ⚠️⚠️ **头 2000 字符定生死**(2026-08-04 实测,见 friendLlm.ts 顶部):朋友服务按 prompt 的**前 ~2000 字符**
  // 做缓存键。所以凡是「必须让这次调用区别于上次」的东西 —— 用户原话、重试黑名单、语言与长度 ——
  // 一律钉在最前面;写在尾巴上的指令只要前缀没变,回来的就是上一次那段答复(三条尾部规则实测**零效果**,
  // 语言那条写在头上立刻生效)。FACTS 与收尾提醒才放后面。
  const user = [
    // 句数目标随主张条数走:定死「三到四句」会逼它把两条主张压成一句(实测「这两条承诺都核不了」),
    // 而每条主张必须各说各的 —— 长度目标不能和这条硬要求打架。
    // 段名(QUESTION / FACTS / EARLIER / CLAIM LINES)保持大写:它们是结构锚点,而且 findLeaks 逐个盯着。
    // 其余一律不用大写做强调 —— 强调词会被原样抄进答复(2026-08-06 实测 `**WE** do not have a record…`)。
    `Reply language: ${L}. Length: at most ${LEN_CAP[lang]} characters, about ${3 + claimLines.length} sentences plus a short bullet `
      + `list, ${SENT_CAP} lines at the very most (a bullet is a line).`,
    `QUESTION: ${userText}`,                       // 用户原话必须进缓存键,否则两个人可能拿到同一段答复
    // 目标钉在最前面(头 2000 字符定生死):这一步是**答这个人的担心**,不是把 FACTS 组织成人话
    'Task: work out what this person is worried about or trying to decide, and answer that one thing. Sentence one speaks to the worry. '
      + 'Then use only the FACTS lines that bear on it and leave the rest out. If nothing in FACTS covers what he asked about (a '
      + 'permit, a school, a fee), sentence one says that we have no record of it — never borrow a "the government does not publish it" '
      + 'line from some other subject to explain a gap that is ours. Do not answer some other question instead.',
    // 主张条数钉在头部(缓存键区,权重最高):实测模型爱把两条主张并成一句「中介的收费与合作名单都核不了」,
    // 一并就把读者自己说的那个数(2 万)吞了 —— 而那个数正是他来问的东西。
    claimLines.length > 1
      ? `He was told ${claimLines.length} different things (see CLAIM LINES) and each one gets a sentence of its own naming that one thing. `
        + 'Never bundle them into "both claims" / "these promises", and never summarise them again in a sentence of your own: '
        + 'a reader who was told two things needs to see exactly two answers, each naming what it is about.'
      : '',
    `Data tag: ${factsFingerprint(facts)} — internal, never write it in the reply.`,
    // 重试黑名单同理:写在尾巴上等于没写(会原样拿回上一次那段违规答复)
    opts.forbid?.length ? `Banned numbers (not in FACTS, rewrite without them): ${opts.forbid.join(', ')}` : '',
    opts.banned?.length ? `Banned strings (internal codes, English shorthand, or FACTS lines you copied — say what they mean in ${L} instead): ${opts.banned.join(', ')}` : '',
    opts.sameOpen?.length
      ? `Rewrite — your last draft had this shape problem: ${opts.sameOpen.join(' / ')}. `
        + 'If three sentences in a row start the same way (or each starts with a province), that is a table read out loud: merge them '
        + 'into one single sentence and start every sentence differently. If one sentence carried two different states ("mixed:"), split '
        + 'it: one sentence may say only one of "the government does not publish it" / "our site has not indexed it", and it must name '
        + 'which record it is about.'
      : '',
    // 🔴 旧版这里是一张编号提纲((1)…(2)…(3)…),而提纲就是**我们的字段顺序** —— 于是问「值不值」
    //    回来的是清单+门槛+EE 一条不落(2026-08-04/05 实录)。改成**两拨**:他能拿去做什么排在前,
    //    交易判断排在前、可核事实随后。哪条进答复由「这句话答不答他的担心」定,不由我们的表定。
    'After sentence one, group whatever still matters into two buckets and write bucket (A) first:\n'
      + '  (A) what he can check or settle himself — official requirement lines and counts from FACTS. Write bucket A as a short bullet '
      + 'list: leave a blank line, then two to four lines, each starting with "- " and holding one item, never one line per requirement '
      + 'of the same kind and never one line per province. Prefer the items '
      + 'about the province in the question: whether its official list covers this occupation, what the applicant must reach, how '
      + 'much experience, and what is asked of the employer. '
      // 🔴 联邦通道那条也是「他自己去核得了的官方数字」,只是它不姓省 —— 不点名它就会被挤掉
      //    (2026-08-06 实测:bucket A 改成列表后,金标 C01 把联邦技工通道的分数线整条丢了)。
      + 'If FACTS has a federal Express Entry line for this occupation, it is one of these checkable items too — it goes on its own '
      + 'line in the same list, never dropped for lack of room.\n'
      + '  (B) the decision-oriented caveat about a sales pitch — at most one ordinary sentence, never a bullet. A genuinely '
      + 'different data-availability claim may follow once with its own state.\n'
      + (opts.zeroExp
        ? '  This person has no work experience yet: that is a matter of timing, never of eligibility. Never write that he cannot '
          + 'stay, cannot apply or does not qualify, and never say he has missed anything. The apprentice-friendly counts belong in '
          + 'bucket A, all provinces on one single bullet line.\n'
        : '')
      + 'Skip a bucket entirely if it adds nothing. Nothing else goes in: no index-scope plumbing, no closing note, no closing advice, '
      + 'no fact the question did not call for. In particular, never spend a sentence saying we have not indexed a record the reader '
      + 'never asked about (draw history, operational stats) — that is our plumbing, not his answer.',
    `Never write any of these words: ${HEDGE_WORDS[lang].join(' / ')}.`,
    // 主张行提到头部:商业话术已经在 collectFacts 合成一条可直接见客的判断;真正的数据缺口仍保留四态。
    claimLines.length
      ? 'CLAIM LINES — use each line at most once. A line may be a decision-oriented caveat or a genuine data-availability statement. '
        + 'Do not turn a decision caveat into "cannot verify", "official data is not published", or a summary about all claims. '
        + 'When a line does carry an availability state, keep its subject and state together.\n'
        + claimLines.join('\n')
      : '',
    `Occupation: ${opts.occ}`,
    // EARLIER 要摆在 FACTS **前面**:模型得先知道「哪些已经说过」,再去挑材料 —— 摆在后面等于没摆
    // (2026-08-04 实录:追问那轮把上一轮整段又背了一遍)。
    hist ? `EARLIER (already read by this person — do not say any of it again):\n${hist}` : '',
    `FACTS (the only numbers you may use):\n${factsBlock(rest, Math.max(600, budget), lang)}`,
    `Write the reply now, entirely in ${L}, at most ${LEN_CAP[lang]} characters, starting with the sentence that answers the QUESTION. `
      + 'Ordinary sentences plus at most one short "- " list, no headings, no bold, no tables, no numbered list, no internal codes, '
      + 'no English words other than an official programme name plus its gloss, and no number that is not in FACTS or the QUESTION.',
  ].filter(Boolean).join('\n\n')
  return [{ role: 'system', content: system }, { role: 'user', content: user }]
}

// ── 🔴 出口校验:答复里的数字必须来自 facts ─────────────────────────────────

const NUM_RE = /\d+(?:[.,]\d+)*/g
/** 千分位逗号、前导零、小数尾零都是同一个数的写法差别,不是不同的数。 */
function normNum(s: string): string {
  let t = s.replace(/,/g, '')
  if (t.includes('.')) t = t.replace(/0+$/, '').replace(/\.$/, '')
  return t.replace(/^0+(?=\d)/, '')
}

/**
 * 抽出答复里所有数字 token,逐个比对是否在 facts(或用户自己说的话)里出现过。
 *
 * 白名单只有两项,都**不是**「小数字放行」这种模糊规矩:
 *   ① **行首**列表序号 —— 只认从行首起、前面除了空白/markdown 装饰(`- * # > **`)再无别的字符、
 *      且紧跟 `.` `)` `、` 的 1-2 位数。位置可判定,是排版不是主张;同一个数字写在句子中间照抓。
 *   ② 用户自己写进问题里的数字(echo)—— 复述用户的话不是编造事实(「中介要收 2 万」)。
 * 没有「1-2 位数一律放行」这条:金标里「曼省 3 个岗」正是一位数,放行它等于把最要命的谎话放走。
 * 单位换算只认「月 ↔ 年整除」这一种(12 months = 1 year 是同一个 fact 换个说法,不是新数字)。
 */
export function guardAnswer(answer: string, facts: Fact[], echo = ''): { ok: boolean; bad: string[] } {
  const allowed = new Set<string>()
  const add = (s: unknown) => { for (const m of String(s ?? '').matchAll(NUM_RE)) allowed.add(normNum(m[0])) }
  for (const f of facts) {
    add(f.label); add(f.valueText); add(f.unit); add(f.evidence.url); add(f.evidence.fetched)
    if (f.value != null) {
      allowed.add(normNum(String(f.value)))
      if (/month|月/i.test(f.unit) && f.value !== 0 && f.value % 12 === 0) allowed.add(normNum(String(f.value / 12)))
    }
  }
  add(echo)
  const stripped = answer.replace(/^[ \t]*(?:[-*+#>]\s*)*(?:\*\*)?\d{1,2}[.)、](?!\d)/gm, '')
  const bad: string[] = []
  for (const m of stripped.matchAll(NUM_RE)) {
    if (!allowed.has(normNum(m[0])) && !bad.includes(m[0])) bad.push(m[0])
  }
  return { ok: bad.length === 0, bad: bad.slice(0, 8) }
}

/**
 * 🔴 中文/韩文数字是 guardAnswer 的盲区:它按阿拉伯数字比对,「曼省有三份」它一个数都看不到 ——
 * 换成「八份」照样放行。2026-08-04 实测撞上过:RULE 2 让模型把序数写成词,它顺手把**数量**也写成了词。
 * 两头堵:prompt 要求数量一律阿拉伯数字(RULE 2),出口把「中文数字 + 量词」当违规回灌重写。
 * 序数(第一份 / 每三个月)排除;「万」不收 —— 那是用户自己说的钱数(「要收 2 万」),不是我们的事实。
 */
// 「一」和「两」不收:中文里「一份算数的工作」「两三个省」压倒性地是冠词/约数而不是数量,
// 收了就是天天误杀(实测第一版就把剧本那句「一份算数的第一份工作」判违规,白烧一次重试)。
// 代价是模型把 3 写成「一个」抓不到 —— 换来的是不误杀,而 1 也是最不致命的那个数。
// 前置的 第/每/两 一律排除:序数(第三个)、频率(每三个月)、约数(两三个)都不是从 facts 抄来的数量
const CJK_NUM_RE = /(?<![第每两])[二三四五六七八九十百千]+\s*(?:个|份|年|月|周|天|人|分|名|次)/g
export function findWordNumbers(answer: string, lang: ChatLang): string[] {
  if (lang === 'en') return []
  const out: string[] = []
  for (const m of answer.matchAll(CJK_NUM_RE)) if (!out.includes(m[0])) out.push(m[0])
  return out.slice(0, 8)
}

/** 模型总爱加粗和小标题(RULE 5 求不动)——回来自己剥掉,比在 prompt 里反复求它便宜。只删记号不动数字。
 *  记号词表与数据层同一份(stripMd):两处各写各的,迟早一处漏一种记号。
 *  🔴 **允许的两样必须活着出去**:行首 `- ` 与空行分段(`\n{3,}` 只是把多余空行压成一个,不是吃掉分段)——
 *  前端 ChatText 只认这两样,在这儿剥掉一样,渲染器就白装了。
 *
 *  🔴 **第一条项目常常没换行**(2026-08-06 实测中文 C01:`…而非省份选择。- MB、SK、NS 均有带学徒岗位…`)——
 *  提示词写着「另起一行」也压不住,而渲染器只认**行首** `- `,于是那一条被读成正文的一部分,
 *  后两条却成了列表:同一份清单被劈成两半,比不排版还难看。句末标点后面紧跟 `- ` 是**位置可判定的**,
 *  回来自己补那个换行(和 dropTrailingHedge 同一个手法:求不动的东西,出口自己动手)。 */
export const tidy = (s: string) => stripMd(s)
  .replace(/([。！？；：!?;:])[ \t]*-[ \t]+(?=\S)/g, '$1\n- ')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

// ── 🔴 出口校验②:内部状态码 / 字段名不许见客 ────────────────────────────────
//
// 四态(ok / not-published / not-collected / not-applicable)是**我们的**枚举,不是人话:
// 用户读到「NOT-COLLECTED」只会当成报错。但语义一步都不能省 —— 「官方不公布」和「本站没收录」
// 合并成「没有」就是撒谎。所以:意思照说,代码照拦(照数字 guard 那套:回灌重试一次 → 再犯降级)。
const LEAK_PATTERNS: RegExp[] = [
  /NOT[-\s]?(?:PUBLISHED|COLLECTED|APPLICABLE)/gi,
  /\bN-A\b/g,
  /index\s+scope/gi,
  /\b(?:availability|scopeKind|valueText|evidence|fetched|verdict|checkedAt)\b/gi,
  /\b(?:short|need)\s*=/gi,
  /\blookup[A-Z]\w*/g,
  /\bcheckClaims\b/g,
  /\bdata tag\b/gi,          // 缓存指纹是内部标记,漏进答复照样是见客事故
  // prompt 里的段名(2026-08-05 实测韩文答复写出「…는 FACTS에 없으므로」):读者不知道 FACTS 是什么,
  // 「我们的材料里没有」要说成人话,不是甩一个我们自己的段落名
  /\b(?:FACTS|QUESTION|CLAIM LINES|EARLIER|PLAYBOOK|RULE \d)\b/g,
]
/** 返回答复里出现过的内部 token(去重,原样带回给模型当黑名单)。 */
export function findLeaks(answer: string): string[] {
  const out: string[] = []
  for (const re of LEAK_PATTERNS) {
    for (const m of answer.matchAll(re)) if (!out.includes(m[0])) out.push(m[0])
  }
  return out.slice(0, 8)
}

// ── 🔴 出口校验①:中/韩答复里不许留英文单位词 ──────────────────────────────
//
// 根因是 facts 的 label/unit 用官方英文措辞,模型顺手抄进中文句子(实录「BC: 15 jobs」「满 3 years」)。
// 两段处理:**能机械修的就地修**(数字后面跟的单位词,纯显示,换掉不丢任何事实),
// **修不掉的报出来**(裸着的 cutoff/requires 这类 FACTS 速记 → 说明整句是抄的,要重写)。
// 专有名词(MPNP In-Demand Occupations List)不在词表里 —— 那是引用依据,准许保留英文原名。
const UNIT_WORDS = 'jobs?|openings?|postings?|years?|months?|weeks?|days?|points?|people|persons?|invitations?|spots?|nominations?'
// 专名护栏:「Job Bank」是来源名(RULE 6 准许保留英文原名),不是单位词 —— 别把它译成「岗位 Bank」
const NOT_PROPER = '(?!\\s*Bank)'
// num = 直接跟在数字后面(自带量词);bare = 跟在中文/韩文量词后面(量词已经写过了,不能再带一个)
const UNIT_TEXT: Record<Exclude<ChatLang, 'en'>, { num: Record<string, string>; bare: Record<string, string> }> = {
  zh: {
    num: { job: '个岗位', opening: '个岗位', posting: '个岗位', year: '年', month: '个月', week: '周', day: '天', point: '分', people: '人', person: '人', invitation: '个邀请', spot: '个名额', nomination: '个提名' },
    bare: { job: '岗位', opening: '岗位', posting: '岗位', year: '年', month: '月', week: '周', day: '天', point: '分', people: '人', person: '人', invitation: '邀请', spot: '名额', nomination: '提名' },
  },
  ko: {
    num: { job: '개 일자리', opening: '개 일자리', posting: '개 일자리', year: '년', month: '개월', week: '주', day: '일', point: '점', people: '명', person: '명', invitation: '건 초청', spot: '개 정원', nomination: '건 지명' },
    bare: { job: '일자리', opening: '일자리', posting: '일자리', year: '년', month: '월', week: '주', day: '일', point: '점', people: '명', person: '명', invitation: '초청', spot: '지명' },
  },
}
/**
 * 「3 jobs」→「3 个岗位」、「3个Job」→「3个岗位」。只动单位词,不碰数字(guard 的账一分不变)。
 * 第二条规则是实测出来的:模型会自己补中文量词再抄英文单位(「15个Job」),只认「数字+单位」会漏。
 */
export function localizeUnits(answer: string, lang: ChatLang): string {
  if (lang === 'en') return answer
  const { num, bare } = UNIT_TEXT[lang]
  const key = (w: string) => w.toLowerCase().replace(/s$/, '')
  return answer
    .replace(new RegExp(`(\\d)\\s*(${UNIT_WORDS})\\b${NOT_PROPER}`, 'gi'), (m, n, w: string) => (num[key(w)] ? `${n} ${num[key(w)]}` : m))
    .replace(new RegExp(`([\\u4e00-\\u9fff\\uac00-\\ud7af])\\s*(${UNIT_WORDS})\\b${NOT_PROPER}`, 'gi'), (m, c, w: string) => (bare[key(w)] ? `${c}${bare[key(w)]}` : m))
}
// 内部码归 findLeaks 管,这里只收「FACTS 的英文速记词」:剩下它们说明整句是抄的
// 含我们自己 label 里用过的词组(apprentice-friendly / occupation list …):中韩答复里出现 = 抄了英文标签。
// **en 答复不查这条** —— 那几个词在英文里就是正常说法,不是内部码(内部码归 findLeaks,与语言无关)。
// `index scope` 不收在这:那是内部码,归 findLeaks,一件事只归一个人管。
const LEFTOVER_RE = new RegExp(
  `\\b(?:${UNIT_WORDS}|cutoff|requires?|latest|apprentice-friendly|occupation list|operational stats|draw history)\\b${NOT_PROPER}`, 'gi')

/**
 * 官方专名白名单**不靠词表猜,靠「它在 FACTS 里出现过」**(与 guardAnswer 判数字同一个思路)。
 * label 已经在数据层本地化之后,fact 里剩下的英文按定义就是官方原名(清单名 / 通道名 / 省码 / NOC),
 * RULE 6 本来就准许保留。**这不是可有可无的宽容**:2026-08-04 实测,官方清单名
 * 「Nova Scotia Critical Vacancies」里的 Vacancies 撞上单位词表 → 连撞两次重试 → 一段好答复被降级成清单。
 */
function factsEnglish(facts: Fact[]): string[] {
  const out = new Set<string>()
  for (const f of facts) {
    for (const m of `${f.label} ${f.valueText}`.matchAll(/[A-Za-z][A-Za-z-]{2,}(?:\s+[A-Za-z][A-Za-z-]*)*/g)) out.add(m[0])
  }
  return [...out].sort((a, b) => b.length - a.length)      // 长的先遮,免得短词先把长名拆了
}
/**
 * 反向的中英夹生:**中文漏进英文答复**。findEnglishUnits 只管「英文漏进中文」,
 * 而 88% 的流量是英文 —— C1 的 note/why 全是中文硬编码,漏一句用户就当页面坏了。
 * 判据不用词表:英文答复里出现**任何** CJK/韩文字符即违规(官方专名都是拉丁字母,没有例外)。
 */
const SCRIPT_RE: Record<ChatLang, RegExp | null> = {
  en: /[぀-ヿ一-鿿가-힯]+/g,   // 英文答复里不该有任何汉字/假名/韩文
  zh: /[가-힯]+/g,                              // 中文答复里不该有韩文
  ko: /[一-鿿]{2,}/g,                           // 韩文答复里不该有成串汉字
}
export function findForeignScript(answer: string, lang: ChatLang): string[] {
  const re = SCRIPT_RE[lang]
  if (!re) return []
  const out: string[] = []
  for (const m of answer.matchAll(re)) if (!out.includes(m[0])) out.push(m[0])
  return out.slice(0, 8)
}

/** localizeUnits 之后还剩的英文速记 = 整句抄了 FACTS 的标签,得重写(en 答复不查这条)。 */
export function findEnglishUnits(answer: string, lang: ChatLang, facts: Fact[] = []): string[] {
  if (lang === 'en') return []
  let s = localizeUnits(answer, lang)
  for (const name of factsEnglish(facts)) s = s.split(name).join(' ')
  const out: string[] = []
  for (const m of s.matchAll(LEFTOVER_RE)) if (!out.includes(m[0])) out.push(m[0])
  return out.slice(0, 8)
}

// ── 🟡 出口留痕:两条状态不同的主张被揉成一句 ───────────────────────────────
//
// 「官方不公布」≠「本站还没收录」是这套系统的立身之本(pnp_ops_stats 那张表、C1 的四态都是为了这个区分)。
// 合并 = 撒谎,而且撒的正是中介最爱钻的空子:用户以为「你们没查到」,实际是「官方根本不发,谁承诺都没依据」。
// 两道查法,都只留痕(硬拦风险大于收益;真正的闸门是金标测试那两条断言):
//   ⓐ 吞掉:facts 里两种状态都有,答复里只出现一种说法;
//   ⓑ 揉句:同一句里同时提到了两条**状态不同**的主张,却只给了一种说法。
const CLAIM_TEXT_RE = /[「"](.+?)[」"]/
/** 主张 → 用来判「这句话提到它了吗」的碎片:数字 + 中/韩文 2-4 连字;要**两个**碎片同时命中才算提到(压噪)。 */
function claimKeys(text: string): string[] {
  const keys = new Set<string>()
  for (const m of text.matchAll(/\d+/g)) keys.add(m[0])
  for (const run of text.match(/[一-鿿가-힯]+/g) ?? []) {
    if (run.length <= 2) { keys.add(run); continue }
    for (let i = 0; i + 2 <= run.length; i++) {
      keys.add(run.slice(i, i + 2))
      if (i + 4 <= run.length) keys.add(run.slice(i, i + 4))
    }
  }
  return [...keys]
}
const saysState = (s: string, lang: ChatLang, av: Exclude<Availability, 'ok'>) =>
  AVAIL_MARKERS[lang][av].some((m) => s.toLowerCase().includes(m.toLowerCase()))

/**
 * 断句的**单一来源**(clampAnswer / findSameOpening 一直用的就是这一条,现在写成一份)。
 * 全角句末标点直接断;ASCII 的 `.` 必须后跟空白才算句末,否则「3.6」会被劈开。
 *
 * 🔴 findMixedStates 原来漏了 ASCII `.` —— 于是**两句各说各态的英文**(`… does not publish this.
 * Our site has not indexed …`)被当成一句,判成「一句焊了两态」,白烧一次软重写(2026-08-07 实测 C07)。
 * 补的是断句,不是判据:一句里真焊两态照旧抓 —— 英文句末那个 `.` 后面没有空白,整句仍然是一句。
 */
const SENT_SPLIT = /(?<=[。！？；!?;\n])|(?<=\.)(?=\s)/

/**
 * ⓒ **一句话里同时挂着两种状态**,不管说的是哪两条记录 ——
 * 2026-08-05 实测中文 C13 末句:「至于该省是否有…职业清单或抽选记录,官方不公布这项数据且本站尚未收录。」
 * 一个「且」把两件事的两种状态焊在一起,读者根本分不清哪件是官方不发、哪件是我们没收。
 * ⓐⓑ 只盯主张行(claim),这句里两条都是四态行(status),整个漏了过去 —— 所以这条判据**不看是哪条 fact**,
 * 只看一句话里出现了几种状态说法。这是那条红线最后一道机械网。
 */
export function findMixedStates(answer: string, lang: ChatLang): string[] {
  const AVS = ['not-published', 'not-collected', 'not-applicable'] as const
  const out: string[] = []
  for (const sent of answer.split(SENT_SPLIT)) {
    if (!sent.trim()) continue
    const hit = AVS.filter((av) => saysState(sent, lang, av))
    if (hit.length > 1) out.push(`mixed:${sent.trim().slice(0, 40)}`)
  }
  return out.slice(0, 4)
}

// ── 🔴 闸A 归因闸:**替用户说他没说过的话** ─────────────────────────────────
//
// 2026-08-09 生产实测(33102 锚号三轮),三句原话,一句比一句危险:
//   ① 「…which your previous message indicates you do not」—— 用户从没提过经验,expMonths 槽 = null,
//      组稿把**缺槽**编成了**「你说过没有」**:凭空替他做了一句自述,再拿这句自述判他不合格;
//   ② 「You are currently short by 6 months on this requirement」—— 6 = 24 − 18,把 PGWP 剩 18 个月
//      当成 18 个月工作经验做减法(见闸B:6 这个数还骗过了数字闸);
//   ③ 「cutoff scores up to 475 CRS, which is higher than your current score」—— 槽里根本没有 CRS。
//
// 三句的共同形状是**第二人称 + 陈述态 + 属性**,而那个属性我们手上一个值都没有。数字闸对它们全盲:
// ①③一个数字都不用编,②的数字还从用户原话里借到了合法性。所以这道闸判的不是数字,是**归因**。
//
// 判定三步(全是确定性正则,不问模型;宁可漏拦不可误杀):
//   ⓐ 先看**要求态豁免**:`you need` / `requires you` / `if you` / 问句 / 你需要 / 如果你 ——
//      门槛转述与条件句是这个产品的正业(「BC SW 要求你有 24 个月经验」必须答得出口),整句放过;
//   ⓑ 再看**陈述/报告态**:you are / you have / you do not / your CRS / you said / 你没有 / 你说过…;
//   ⓒ 再看句里提到的**属性**有没有底:槽里有值(0 与 false 都算有值)或**用户自己这轮提过**这个属性,
//      两者都没有 = 这句话是替他编的 → 整句拦。
// 判据只认这一句里的词,不跨句推理 —— 跨句推理正是模型犯错的那一步,闸门不跟着犯。
type AttrKey = 'exp' | 'crs' | 'clb' | 'age' | 'edu' | 'status'
const ATTR_KEYS: AttrKey[] = ['exp', 'crs', 'clb', 'age', 'edu', 'status']
/** 属性词:句子里提到它,才轮得到查这个属性有没有底。收窄不收宽(`points` 不算 CRS —— 抽选分数线天天出现)。 */
const ATTR_RE: Record<AttrKey, RegExp> = {
  // 英文的 months 也算经验面(「short by 6 months」病灶 ② 就没写 experience 这个词);
  // 中文不收「月」——「个月」在中文答复里同时是 PGWP 剩余、处理周期、门槛期,收了必误杀。
  exp: /\bexperience\b|\bmonths?\b|经验|經驗|경력/i,
  crs: /\bCRS\b|\bscores?\b|分数|分數|得分|점수/i,
  clb: /\bCLB\b|\bNCLC\b|\blanguage (?:level|band|score|ability|result)\b|语言(?:水平|成绩)?|語言|언어 (?:점수|능력)/i,
  age: /\bage\b|\byears old\b|年龄|年齡|나이/i,
  edu: /\beducation\b|\bdegree\b|\bdiploma\b|\bcredential\b|学历|學歷|학력/i,
  status: /\bPGWP\b|\b(?:work|study) permit\b|\bstatus\b|工签|工簽|学签|學簽|签证|簽證|身份|신분|비자/i,
}
/** 槽里有没有这个属性的值。**0 与 false 都算有值**(它们是判定,不是缺失,同 filledProfileSlots 的口径)。 */
const attrFilled = (k: AttrKey, s: Partial<Slots>): boolean => {
  switch (k) {
    case 'exp': return s.expMonths != null
    case 'clb': return s.clb != null
    case 'age': return s.age != null
    case 'edu': return s.edu != null || s.eduYears != null || s.canadaStudy != null
    case 'status': return s.status != null
    // 🔴 槽里**根本没有 CRS 这一格**(见 Slots):所以关于「你的分数」的任何陈述,
    //    只有他自己这轮说过 CRS/分数才算有底,否则一律是编的。
    case 'crs': return false
  }
}
/** ⓐ 要求态 / 条件 / 疑问 —— 门槛转述是正业,一个都不许拦。 */
const ASSERT_EXEMPT_RE = new RegExp([
  String.raw`\byou (?:need|must|should|shall|have to|had to|will need|would need|may need|might need|are required|can|could|will|would|may|might)\b`,
  String.raw`\brequires? you\b|\brequired of you\b|\bfor you to\b`,
  String.raw`\b(?:if|once|when|whenever|unless|until|whether|provided|assuming) you\b`,
  String.raw`\b(?:do|did|does|have|has|are|were|was|will|would|can|could|should) you\b`,
  '你需要|需要你|要求你|你必须|你必須|你得先|你可以|你能|你应|你應|如果你|若你|你要是|你是否|你有没有|你有沒有|当你|當你|等你|你想|你打算',
  '필요합니다|해야 합니다|하셔야|요구|하신다면|하시면|하실 수|하려면',
].join('|'), 'i')
/** ⓑ 第二人称陈述态 / 报告态(「你说过」也在内:替他复述他没说过的话是本病灶 ①)。 */
const ASSERT_RE = new RegExp([
  String.raw`\byou(?:'re| are| were| have| had| hold| lack| only have| currently have| already have| still have)\b`,
  String.raw`\byou (?:do|did|does) not\b|\byou don'?t\b|\byou haven'?t\b|\byou'?ve\b|\byou aren'?t\b`,
  String.raw`\byou (?:said|told|mentioned|indicated|stated|reported)\b|\byour (?:previous|last|earlier) message\b`,
  String.raw`\byour (?:current |own |existing |present )?(?:score|CRS|CLB|experience|age|education|degree|diploma|status|permit|level|band)\b`,
  '你\\s*(?:已经|已經|已|现在|現在|目前|还|還|尚)?\\s*(?:有|没有|沒有|是|不是|还差|還差|缺|不足|不满足|不滿足|不符合|达到|達到|过了|過了|属于|屬於)',
  '你的\\s*(?:CRS|CLB|分数|分數|得分|经验|經驗|年龄|年齡|学历|學歷|语言|語言|身份|工签|工簽|签证|簽證)',
  '你说过|你說過|你提到|你之前说|你之前說|你上一条|你上一條|据你所说|據你所說',
  '(?:귀하|당신)(?:의|은|는|께서)|말씀하신|하셨다고|하신 것으로',
].join('|'), 'i')
/**
 * 第二人称陈述态属性断言,而那个属性我们一个值都没有 → 整句拦。
 * `slots` 缺省 = 调用方没告诉我们他给过什么(旧调用点/单测),这道闸**整个不生效** ——
 * 没有输入就不判,绝不拿「什么都不知道」当「他什么都没说」。
 */
export function findUngroundedClaims(answer: string, slots?: Partial<Slots> | null, echo = ''): string[] {
  if (!slots) return []
  const out: string[] = []
  for (const sent of answer.split(SENT_SPLIT)) {
    const s = sent.trim()
    if (!s || ASSERT_EXEMPT_RE.test(s) || !ASSERT_RE.test(s)) continue
    for (const k of ATTR_KEYS) {
      if (!ATTR_RE[k].test(s)) continue
      if (attrFilled(k, slots) || ATTR_RE[k].test(echo)) continue   // 槽里有值 / 他自己这轮提过
      out.push(`${k}:${s.slice(0, 40)}`)
      break                                                          // 一句只报一条:报的是这句话,不是词表
    }
  }
  return [...new Set(out)].slice(0, 4)
}

// ── 🔴 闸B 派生数单位闸:**数字对了,单位是编的** ───────────────────────────
//
// 病灶 ②「short by 6 months」:6 = 24 − 18 是**现算出来的**,facts 里没有这个数;它之所以过了数字闸,
// 是因为用户原话里有「CLB 6」—— guardAnswer 只比数字不看语境,于是一个语言等级替一个月份数背了书。
// 所以这道闸比的是**(数字, 单位类)这一对**:同一个 6,`clb` 类出现过不等于 `mo` 类可以出现。
//
// 窄口径(误杀比漏拦贵):
//   · 只对**带单位词**的数字生效,裸数一概不管(年份、编号、序号、TEER、NOC 一律与它无关);
//   · 四位数年份(≥1900)与日期串先剥掉 —— 「2026 年 7 月 30 日」不是 7 个月;
//   · 中文/韩文只认**时长写法**:「N 个月 / N개월」才算月份数,「7 月 / 7월」是日历月,不判;
//   · 只覆盖下面这几类单位;不认识的单位(invitations / spots …)两边都不产出对,自然不判。
const UNIT_AFTER: [RegExp, string][] = [
  [/(\d[\d,.]*)\s*(?:months?|个月|個月|개월)/gi, 'mo'],
  [/(\d[\d,.]*)\s*(?:years?|yrs?|年|년)(?![\d월月])/gi, 'yr'],
  [/(\d[\d,.]*)\s*(?:weeks?|周|週|주)/gi, 'wk'],
  [/(\d[\d,.]*)\s*(?:hours?|hrs?|小时|小時|시간)/gi, 'hr'],
  [/(\d[\d,.]*)\s*(?:points?|分(?![钟鐘之])|점)/gi, 'pt'],
  [/(\d[\d,.]*)\s*CRS\b/gi, 'pt'],
  [/(\d[\d,.]*)\s*(?:CLB|NCLC)\b/gi, 'clb'],
  [/(\d[\d,.]*)\s*(?:jobs?|openings?|postings?|个岗位|個崗位|岗位|崗位|개\s*일자리|일자리)/gi, 'job'],
  [/(\d[\d,.]*)\s*(?:people|persons?|applicants?|人(?!民)|명)/gi, 'ppl'],
  [/(\d[\d,.]*)\s*(?:CAD|加元|加币|加幣)/gi, 'money'],
]
const UNIT_BEFORE: [RegExp, string][] = [
  [/\b(?:CLB|NCLC)\s*(\d[\d,.]*)/gi, 'clb'],
  [/\bCRS\s*(?:score\s*)?(\d[\d,.]*)/gi, 'pt'],
  [/[$￥]\s*(\d[\d,.]*)/g, 'money'],
]
/** 日期串不是「数字 + 单位」,先剥掉再抽(剥的是两边同一份文本,不偏袒答复也不偏袒 facts)。 */
const stripDates = (s: string) => s
  .replace(/\d{4}\s*[-/]\s*\d{1,2}(?:\s*[-/]\s*\d{1,2})?/g, ' ')
  .replace(/\d{4}\s*年\s*\d{1,2}\s*月(?:\s*\d{1,2}\s*日)?/g, ' ')
  .replace(/\d{4}\s*년\s*\d{1,2}\s*월(?:\s*\d{1,2}\s*일)?/g, ' ')
/** 文本 → 「数字:单位类」对。四位年份(≥1900)一律不产出对。 */
function unitPairs(text: string): Set<string> {
  const out = new Set<string>()
  const s = stripDates(String(text ?? ''))
  for (const [re, cls] of [...UNIT_AFTER, ...UNIT_BEFORE]) {
    for (const m of s.matchAll(re)) {
      const n = normNum(m[1])
      if (/^\d{4}$/.test(n) && Number(n) >= 1900) continue
      out.add(`${n}:${cls}`)
    }
  }
  return out
}
/**
 * 答复里的「数字 + 单位」必须在 facts 或用户原话里**带着相容的单位**出现过。
 * 数字只在别的单位类里出现过(echo 的「CLB 6」≠ 答复的「6 months」)= 现算出来的派生数 → 拦。
 * 月 ↔ 年整除互认(12 months = 1 year 是同一条 fact 换个说法,与 guardAnswer 同一口径,双向都认)。
 */
export function findUnitMismatch(answer: string, facts: Fact[], echo = ''): string[] {
  const allowed = new Set<string>()
  const take = (t: string) => { for (const p of unitPairs(t)) allowed.add(p) }
  for (const f of facts) {
    take(`${f.label}\n${f.valueText}`)
    if (f.value != null) take(`${f.value} ${f.unit}`)
  }
  take(echo)
  for (const p of [...allowed]) {
    const [n, cls] = p.split(':')
    const v = Number(n)
    if (!Number.isFinite(v)) continue
    if (cls === 'mo' && v % 12 === 0) allowed.add(`${v / 12}:yr`)
    if (cls === 'yr') allowed.add(`${v * 12}:mo`)
  }
  return [...unitPairs(answer)].filter((p) => !allowed.has(p)).slice(0, 6)
}

/**
 * 🔴 **主张一条都不许静默丢掉** —— 这条不再交给模型的自觉。
 *
 * 2026-08-05 实测:同一道题连跑五次,模型在「一条一句照抄」和「这两条承诺都核不了」之间来回跳
 * (后者把读者自己说的「2 万」整个吞掉,而那正是他来问的东西)。prompt 加到第三条也压不住,
 * 那就回来自己收:答复里没交代到的主张,把我们写好的那句**原样补上**(和 dropTrailingHedge 同一个手法:
 * 求不动的东西,出口自己动手)。补的是本层写死的见客文案,数字全部出自 facts,guard 的账一分不差。
 *
 * 判「交代过了吗」两条任一成立即可:① 答复里出现了这句原话本身(CLAIM LINES 要求照抄,这是常态);
 * ② 原话碎片命中 ≥2(模型改了措辞时的兜底;**英文也要认**,claimKeys 只切中韩文,英文主张会全判成没说)。
 * 再加一条:这条主张的状态说法得出现过。宁可漏补(读起来重复)也不错补。
 */
const coverKeys = (text: string): string[] => {
  const keys = new Set(claimKeys(text))
  for (const w of text.toLowerCase().match(/[a-z][a-z']{3,}/g) ?? []) keys.add(w)
  return [...keys]
}
export function missingClaimLines(answer: string, facts: Fact[], lang: ChatLang): string[] {
  const out: string[] = []
  const low = answer.toLowerCase()
  for (const f of facts.filter((x) => x.unit === 'claim')) {
    const m = CLAIM_TEXT_RE.exec(f.label)
    if (!m) continue
    const quote = m[1].trim().replace(/…$/, '')
    const said = (quote.length >= 6 && low.includes(quote.toLowerCase()))
      || coverKeys(m[1]).filter((k) => low.includes(k.toLowerCase())).length >= 2
    const state = (['not-published', 'not-collected', 'not-applicable'] as const)
      .find((av) => f.label.includes(AVAIL_SENTENCE[lang][av]))
    // 商业话术那行没有四态,带的是交易判断(PROMISE_WHY / MONEY_WHY)。判断也必须被说出口 ——
    // 见 VERDICT_MARKERS 上面那段:说漏了,模型就用「本站无此记录」把它填上,而那句意思正好相反。
    const verdict = f.label.includes(PROMISE_WHY[lang]) || f.label.includes(MONEY_WHY[lang])
    const kept = state ? saysState(answer, lang, state)
      : (!verdict || VERDICT_MARKERS[lang].some((m) => low.includes(m.toLowerCase())))
    if (said && kept) continue
    out.push(f.label)
  }
  return out.slice(0, 2)
}

/**
 * 🔴 出口校验:**说某个省的清单收了这个职业,必须有那个省的 coverage fact 撑腰**。
 *
 * 2026-08-05 生产实录(chat_logs id=9)两次撞上,数字 guard 一次都拦不住:
 *   ·「萨省清单收录该职业,要求 12 个月工作经验」—— 12 有 fact(SK 门槛),但 facts 里
 *     **SK 一条 coverage 都没有**(72310 在 pnp_occupations 的 SK 里一行都不存在)。
 *     模型拿门槛事实自己配了一句清单结论。
 *   ·「这些省份的清单也收录了该职业」—— 一句话给八个省发了通行证。
 * 为什么危险:清单收没收是**资格前提**,说错了后面每个数字都在答另一个人的问题;
 * 而它是纯文字断言,`guardAnswer` 只查数字,`findMergedStates` 只查四态,两道都不管。
 *
 * 判据只认机械可判的:一个**子句**里同时出现「某个省」和「清单类词」→ 该省必须有一条
 * `lookupCoverage` 的 list 行。按子句判(不是整句)是为了不让「BC 有 234 个岗位,比曼省多」
 * 这种句子里的 MB 被邻居的清单词牵连。
 *
 * ⚠️ 已知盲区(不装作能管):指代式的「这些省份 / these provinces」没点名,判不了 ——
 * 那条要么靠 prompt 压,要么等 DecisionPlan 把结论权收走,不在这一层硬凑。
 */
const PROV_IN_TEXT = new RegExp(
  `(?:\\b(?:${[...ALL_PROVS].join('|')})\\b|${Object.keys(PROV_ALIAS).filter((k) => /[^\x20-\x7f]/.test(k)).join('|')})`, 'g')
const COVERAGE_WORD: Record<ChatLang, RegExp> = {
  zh: /清单|列表|在需|收录|收了|列入|名单/,
  en: /\blist(?:s|ed|ing)?\b|in-demand|in demand/i,
  ko: /목록|리스트|수요\s*직업/,
}
/** 子句:比句子更细,免得同一句里的两个省互相牵连。`\.\s` 收英文句点(小数点后面没空格,不误伤 $1,590.00)。 */
const CLAUSE_SPLIT = /[。；;!?！？\n]+|[,，、]|\.\s+/
export function findUnbackedCoverage(answer: string, facts: Fact[], lang: ChatLang): string[] {
  const backed = new Set(facts
    .filter((f) => f.tool === 'lookupCoverage' && f.unit === 'list')
    .map((f) => f.label.slice(0, 2)))
  // 🔴 **否定句不是主张**(拿 6 条真实答复量出来的:第一版 1 真 3 假,两条假的都是这个形态)。
  //    「本站未收录新斯科舍省是否发布额外官方清单的信息」是我们自己写的诚实话,它带着「清单」和省名,
  //    但它在说「查不到」,不是在说「收了」。四态标记就是现成的判据(AVAIL_MARKERS),不另写词表。
  const denies = (s: string) => Object.values(AVAIL_MARKERS[lang]).flat().some((m) => s.includes(m))
  const out: string[] = []
  for (const clause of answer.split(CLAUSE_SPLIT)) {
    if (!COVERAGE_WORD[lang].test(clause) || denies(clause)) continue
    for (const m of clause.matchAll(PROV_IN_TEXT)) {
      const prov = normProv(m[0])
      if (!prov || backed.has(prov)) continue
      out.push(`${prov}:${clause.trim().slice(0, 40)}`)
    }
  }
  return [...new Set(out)].slice(0, 3)
}

/**
 * 🔴 出口校验:**答复里点名的省,必须是 facts 或他自己的话里出现过的省**(K03 省名串台)。
 *
 * 实测两形:「新不伦瑞克省 NL NLPNP International Graduate」把 NB 的名字焊在 NL 的项目上;
 * 基线批跑 R08 的答复凭空冒出 facts 里根本没有的 NB。省名指错是**资格前提级**的错——那句话之后
 * 全在给另一个省背书,而它是纯文字断言,数字 guard/四态/coverage 三道都不管。
 * 判据只认机械可判的:子句里出现的省码/省名,normProv 归一后必须落在 allowed 集合
 * (facts 的 label+valueText ∪ 用户原话 ∪ slots.provs)。一句就能判 → 进逐句门。
 *
 * ⚠️ 已知盲区(不装作能管):两个省都真在 facts 里、只是方向说反(AB+BC「下一步」指向 BC)——
 * 那是语义不是词面;指代式「这些省份」同 findUnbackedCoverage 的盲区口径。
 */
const PROV_NAME_RE = new RegExp(
  `\\b(?:${Object.keys(PROV_ALIAS).filter((k) => /^[\x20-\x7f]+$/.test(k)).sort((a, b) => b.length - a.length).join('|').replace(/ /g, '\\s+')})\\b`, 'gi')
const provsMentioned = (s: string): Set<string> => {
  const out = new Set<string>()
  for (const m of s.matchAll(PROV_IN_TEXT)) { const p = normProv(m[0]); if (p) out.add(p) }
  for (const m of s.matchAll(PROV_NAME_RE)) { const p = normProv(m[0]); if (p) out.add(p) }
  return out
}
export function findAlienProvinces(answer: string, facts: Fact[], echo = '', slots?: Partial<Slots> | null): string[] {
  const allowed = provsMentioned(echo)
  for (const p of slots?.provs ?? []) allowed.add(p)
  for (const f of facts) for (const p of provsMentioned(`${f.label} ${f.valueText}`)) allowed.add(p)
  const out: string[] = []
  for (const clause of answer.split(CLAUSE_SPLIT)) {
    for (const p of provsMentioned(clause)) {
      if (!allowed.has(p)) out.push(`${p}:${clause.trim().slice(0, 40)}`)
    }
  }
  return [...new Set(out)].slice(0, 3)
}

export function findMergedStates(answer: string, facts: Fact[], lang: ChatLang): string[] {
  const claims = facts
    .map((f) => ({ f, m: CLAIM_TEXT_RE.exec(f.label) }))
    .filter((x) => x.f.unit === 'claim' && x.m)
    .map((x) => ({
      text: x.m![1],
      state: (['not-published', 'not-collected', 'not-applicable'] as const)
        .find((av) => `${x.f.label} ${x.f.valueText}`.includes(AVAIL_SENTENCE[lang][av])) ?? null,
    }))
    .filter((c): c is { text: string; state: Exclude<Availability, 'ok'> } => c.state != null)
  const states = [...new Set(claims.map((c) => c.state))]
  if (states.length < 2) return []
  const warn: string[] = []
  // ⓐ 有状态在 facts 里,答复里一个说法都没有 = 被别的状态吞了
  for (const av of states) if (!saysState(answer, lang, av)) warn.push(`swallowed:${av}`)
  // ⓑ 一句盖两条状态不同的主张
  for (const sent of answer.split(/(?<=[。！？；!?;\n])/)) {
    if (!sent.trim()) continue
    const hit = [...new Set(claims.filter((c) => claimKeys(c.text).filter((k) => sent.includes(k)).length >= 2).map((c) => c.state))]
    if (hit.length > 1 && hit.filter((av) => saysState(sent, lang, av)).length < hit.length) warn.push(`merged:${sent.trim().slice(0, 40)}`)
  }
  return warn.slice(0, 4)
}

// ── 🔴 出口校验③:把 FACTS 当稿子逐行抄 ─────────────────────────────────────
//
// 这是 2026-08-04 生产实录里最难看的失败形态,而且**前面每一道都放行**:
// 数字全来自 facts(guard 过)、没有内部码(findLeaks 过)、英文答复不查速记(findEnglishUnits 过) ——
// 于是「ON requires the applicant to reach this language level (CLB) = 5 CLB」原样见客。
// 判据两条,都只认**机械可证的**东西,不猜文风:
//   ⓐ 答复里出现 `=`(FACTS 行的形状 `- 标签 = 值`;正常人话里不会出现);
//   ⓑ 三条及以上 fact 的 label(≥20 字符的那部分)被逐字抄进答复 = 在背清单,不是在答题。
// 命中 → 进重试黑名单(和内部码同一条路);再犯才降级成事实清单(那张清单**自带说明**,不冒充答复)。
// 🔴 2026-08-06 收窄 ⓑ:**门槛行的 label 不算「抄」**。2026-08-05 起它们被特意写成**半句话**
// (`BC requires the applicant to have work experience of` + 值 = 一句完整的话),就是为了让模型照着说;
// RULE 5 松绑后 bucket A 成了项目符号,四条门槛逐条落进列表 —— 每条都「逐字命中 label」,一判三中。
// 实测撞上(C07 英文护士,attempt 2:三条 BC 门槛全在列表里,factDump(3) 判违规,一稿好答复被顶回上一稿)。
// 那不是在背清单,那正是我们要求的形状。其余 label(计数/清单/四态)照旧算 —— 那些是**名目**不是话,
// 三条名目被原样搬进答复仍然是「在念表格」,红线一个字没松。
/** ⓐ `=` 的形状 —— **一句就能判**,所以它进得了逐句门(见 sentenceBlockers)。 */
export function findFactEq(answer: string): string[] {
  for (const m of answer.matchAll(/[^\s=]{0,24}\s=\s[^\s=]{0,12}/g)) return [m[0].trim()]
  return []
}
/** ⓑ 三条 label 被逐字抄 —— **跨句才判得了**(要数够三条),逐句门收不了它,只能整段那一关。 */
export function findFactCopied(answer: string, facts: Fact[]): string[] {
  const copied = facts
    .filter((x) => x.tool !== 'lookupThresholds')
    .map((f) => f.label)
    .filter((l) => l.length >= 20 && answer.includes(l))
  return copied.length >= 3 ? copied.slice(0, 3) : []
}
export function findFactDump(answer: string, facts: Fact[]): string[] {
  return [...findFactEq(answer), ...findFactCopied(answer, facts)].slice(0, 4)
}

// ── 🟡 出口留痕⑤:同一个句式连着来三遍 = 在念表格 ───────────────────────────
//
// 2026-08-05 实录(英文 C13):"NS requires the applicant to reach 5 CLB…" / "NS requires the applicant to have 12 months…"
// / "NS requires the employer to have been in business 2 years." —— 数字全溯得回 facts、没有内部码、没有 `=`,
// 前面每一道都放行,可它读起来就是一张表。判据只认**机械可证**的:相邻句子的开头一模一样,连着 ≥3 句。
//
// 🔴 **只重试一次,绝不因此降级**:降级成事实清单比句式雷同难看得多(那才是真的念表格)。
// 判开头:英文取前两个词,中/韩取前 4 个字 —— 再长会把「MB 要求…」和「MB 现在…」误判成同一句式。
//
// 一省一句(RULE 5b 早就禁了)是同一个病的另一张脸:2026-08-05 实测英文 C14 连着五句
// "Ontario requires… / British Columbia requires… / Alberta requires… / Saskatchewan requires…",
// 每句开头不同,按前两个词判一条都抓不到。所以**开头是省名的句子一律归成同一个 key**:
// 连着三句都以省份起头 = 在按省念表,不管念的是哪个省。
const PROV_OPEN = new RegExp(
  `^(?:${[...ALL_PROVS, ...Object.keys(PROV_ALIAS)].map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![A-Za-z])`, 'i')
const openKey = (s: string, lang: ChatLang): string => {
  const t = s.trim().replace(/^[^\p{L}\p{N}]+/u, '')
  if (PROV_OPEN.test(t)) return 'PROV'
  return lang === 'en' ? t.toLowerCase().split(/\s+/).slice(0, 2).join(' ') : t.slice(0, 4)
}
/** 行首 `- `(答复里唯一允许的列表记号,与前端 ChatText 同一个判据)。 */
export const BULLET_LINE = /^\s*-\s+/
/**
 * 🔴 **列表项不进这道检查**(2026-08-06,RULE 5 松绑同批):项目符号里句式相近**正是列表的用处** ——
 * 「- 这个省要求雇主经营满 3 年 / - 要求你语言到 CLB 5」读起来是一份对齐的清单,不是在念表格。
 * 而且 bucket A 按 RULE 0b 就该**围着问题里那个省**写,一判 PROV 三条全中,等于把我们自己
 * 要求的形状判成违规(那会白烧一次重写,重写完还是同一个形状)。
 * 收窄而不是放弃:散文句之间照旧连着三句同开头就抓 —— 「在念表格」这道红线一个字没松,
 * 只是**列表形态不算它的射程**;列表还顺带把前后两句的连号打断(隔着一份清单的两句不叫「连着」)。
 */
export function findSameOpening(answer: string, lang: ChatLang): string[] {
  const sents = answer.split(SENT_SPLIT).map((s) => s.trim()).filter(Boolean)
  const out: string[] = []
  let run = 1
  for (let i = 1; i < sents.length; i++) {
    if (BULLET_LINE.test(sents[i]) || BULLET_LINE.test(sents[i - 1])) { run = 1; continue }
    const k = openKey(sents[i], lang)
    if (k && k === openKey(sents[i - 1], lang)) {
      if (++run >= 3 && !out.includes(k)) out.push(k)
    } else run = 1
  }
  return out.slice(0, 4)
}

// ── 🟡 出口留痕④:没有 fact 撑腰的推断性措辞 ────────────────────────────────
//
// 数字 guard 只管数字,拦不住「QC 通常要求法语能力」「竞争激烈」「政府不介入商业安排」这类**非数字主张** ——
// 而它们错了一样赔信任。词表只收三类**必然越过 facts** 的措辞,不收正常表述(避免误杀,先只报警不拦):
//   ① 频率概化(通常/往往/一般来说):facts 只给单个官方数,任何「一般怎样」都是模型自己的经验;
//   ② 概率与竞争评价(竞争激烈/可能较低/大概率):本站从不算胜率,出现即凭空;
//   ③ 行动劝告(建议尽快/最好尽早):红线里写死了不给建议,劝一句就变成了顾问。
const HEDGE_WORDS: Record<ChatLang, string[]> = {
  zh: ['通常', '一般来说', '一般而言', '往往', '大多数情况', '普遍', '众所周知', '按惯例',
    '竞争激烈', '竞争很激烈', '难度较大', '相对容易', '大概率', '可能性较大', '可能较低', '可能较高', '概率较低', '概率较高',
    '建议您尽快', '建议尽快', '最好尽早', '应尽快', '建议', '务必', '轻信'],
  en: ['usually', 'typically', 'generally', 'in general', 'tend to', 'tends to', 'as a rule',
    'highly competitive', 'very competitive', 'most likely', 'chances are', 'unlikely to', 'likely to be lower',
    'we recommend', 'you should hurry', 'as soon as possible', 'make sure to', 'be careful'],
  ko: ['보통', '일반적으로', '대체로', '흔히', '경쟁이 치열', '가능성이 높', '가능성이 낮', '가급적 빨리', '권장합니다', '주의하'],
}
// ── 🟡 出口留痕⑥:提示词里的大写强调被抄进了答复 ──────────────────────────────
//
// 2026-08-06 生产实测,英文首句原样回来一句 `**WE** do not have a record…` —— 那个 WE 是 RULE 0 里
// 用来加重语气的大写,模型分不清「这个词重要」和「这个词照抄」。治本在**提示词不再用大写做强调**
// (见 synthMessages 顶部那段);这里是复查的那一道:答复里出现全大写英文词 = 病还在,留痕给读日志的人。
//
// ⚠️ 只报警不拦 —— 误杀比漏一句贵。三类**必须**放行:
//   ① 站内通用缩写(CRS/CLB/NOC/TEER/EE/PNP/PGWP/LMIA/ITA/CEC/FSW/AIP/DLI/SIRS/WEOI + 各省提名项目缩写);
//   ② 省份两位码(ON/BC/AB/…);
//   ③ **在 facts 里出现过的**大写词(官方清单名与通道名里的缩写,如 MPNP EOI)—— 判据照 factsEnglish
//      那套「它在 facts 里出现过就是官方原名」,不靠再养一份词表(养了必分叉)。
// 专有名词(Nova Scotia)不是全大写,天然不在射程内。
const OK_CAPS = new Set([
  'CRS', 'CLB', 'NOC', 'TEER', 'EE', 'PNP', 'PGWP', 'LMIA', 'ITA', 'CEC', 'FSW', 'AIP', 'DLI', 'SIRS', 'WEOI',
  'MPNP', 'OINP', 'SINP', 'AAIP', 'BCPNP', 'NBPNP', 'NSNP', 'PEIPNP', 'NLPNP', 'EOI', 'IRCC', 'CRA', 'GST', 'SIN',
  // 用户自己会说的通用缩写(「读 IT」那条路上,IT 就是他说的专业名 —— 报它等于报用户的原话)
  'IT', 'ICT', 'PR', 'AI', 'HR', 'CV', 'RN', 'PSW', 'ECE', 'CPA', 'IELTS', 'CELPIP', 'TEF', 'TCF', 'ESL', 'MBA',
  ...ALL_PROVS,
])
export function findShoutedWords(answer: string, facts: Fact[] = []): string[] {
  const fromFacts = new Set<string>()
  for (const f of facts) for (const m of `${f.label} ${f.valueText}`.matchAll(/\b[A-Z][A-Z0-9]+\b/g)) fromFacts.add(m[0])
  const out: string[] = []
  for (const m of answer.matchAll(/\b[A-Z]{2,}(?:[-'][A-Z]+)*\b/g)) {
    const w = m[0]
    if (OK_CAPS.has(w) || fromFacts.has(w) || out.includes(w)) continue
    out.push(w)
  }
  return out.slice(0, 8)
}

/** 留痕用,不拦(误杀正常表述比漏一句推断更贵)。 */
export function findHedges(answer: string, lang: ChatLang): string[] {
  const low = answer.toLowerCase()
  return HEDGE_WORDS[lang].filter((w) => low.includes(w.toLowerCase())).slice(0, 8)
}

/**
 * 只砍**结尾那一两句劝告**。实测(2026-08-04)qwen3.6 对三种写法都照写不误 ——
 * RULE 8、结尾「End on a fact」、把词表原词贴进 prompt,三次回来一字不差都是
 * 「…建议直接通过 Job Bank 核实最新空缺,勿轻信中介承诺。」求不动就回来自己收。
 *
 * 三个条件同时满足才砍,**结构上砍不掉有出处的事实**:
 *   ① 是最后一句;② 句里带劝告/推断词;③ **句里一个数字都没有**(facts 的值全是数字,没数字就没事实)。
 * 句子中间的推断照旧只留痕不动 —— 那种得靠 prompt 治,删了会把整句话删残。
 */
export function dropTrailingHedge(s: string, lang: ChatLang): { text: string; dropped: string[] } {
  // 🔴 **空白段不能 filter 掉再 join** —— 那正是 2026-08-06 实测中文 C01 的病根:
  //    模型交回来的排版是对的(`…而非省份选择。\n\n- MB、SK、NS…`),按 `\n` 切完,那两个只含换行的
  //    part 被 `.filter(p => p.trim())` 丢掉,`join('')` 一拼,**空行就没了** —— 第一条项目粘回上一句,
  //    渲染器只认得剩下两条,同一份清单被劈成两半。这一道本来只该砍尾巴,却顺手改了全篇排版。
  //    改法:一个 part 都不丢,只在**找最后一句**时跳过空白段(要砍就连它后面的空白一起砍)。
  const parts = s.split(/(?<=[。！？；!?;\n])/)
  const dropped: string[] = []
  const lastIdx = () => { let i = parts.length - 1; while (i >= 0 && !parts[i].trim()) i--; return i }
  while (dropped.length < 2) {
    const i = lastIdx()
    if (i <= 0) break                                                // 只剩一句(或全是空白)就停
    const last = parts[i]
    if (/\d/.test(last) || !findHedges(last, lang).length) break
    if (parts.slice(0, i).join('').trim().length < 40) break         // 砍到只剩个开头就停(宁可留着)
    dropped.push(last.trim())
    parts.splice(i)                                                  // 连同它后面的空白一起去掉
  }
  return { text: parts.join('').trim() || s.trim(), dropped }
}

// ── ✂️ 出口截断:长度与句数都得回来自己收 ──
const LEN_CAP: Record<ChatLang, number> = { zh: 600, ko: 700, en: 1400 }
/**
 * RULE 7 写着「至多 N 句」,模型该写十六句照写十六句(2026-08-04 实录:一省一句摞了八行岗位数)。
 * 句数上限做成**机械的**:多出来的句子按定义是清单尾巴 —— 剧本要求的内容全在前 N 行里。
 *
 * 🔴 2026-08-06 由 8 提到 11:RULE 5 松绑后 bucket A 从**一句长句**摊成**二到四行项目符号**,
 * 而这里按 `\n` 断行 —— 每条项目就是一行。内容预算一个字没加,只是同样的内容多占了 3 行:
 * 1 句答题 + 4 行清单 + 最多 5 条主张各一句 + 1 句收口 = 11(旧口径 1+1+5+1 = 8,同一笔账)。
 * 不改成「一组项目符号算一句」是因为那会给「一省一行」开后门 —— 每一行都得记账,超了照样截。
 * 字数上限不动:项目符号只多了几个 `- ` 与换行,LEN_CAP 那头一点没紧张。
 */
const SENT_CAP = 11
/** 按句截断:宁可少说一句,不许留半句。字数与句数**两条都收**;整句都塞不下才硬切(极端情况)。 */
export function clampAnswer(s: string, lang: ChatLang, cap = LEN_CAP[lang], sentCap = SENT_CAP): string {
  const t = s.trim()
  const parts = t.split(SENT_SPLIT)      // 断句口径见 SENT_SPLIT(全站一份,别在这儿另写一条)
  if (t.length <= cap && parts.filter((p) => p.trim()).length <= sentCap) return t
  let out = ''
  let n = 0
  for (const p of parts) {
    if (out.length + p.length > cap) break
    if (p.trim() && ++n > sentCap) break
    out += p
  }
  return out.trim() || t.slice(0, cap).trim()
}

// ── 🔵 逐句门控:一句过了才发给前端 ─────────────────────────────────────────
//
// 2026-08-08 拍板(Frank),判据一句话:**永不让用户看见编出来的数字,偶尔容忍啰嗦。**
// 出口校验按「判得了几句」分成两类,不是按重要性分:
//   ① **一句就能判的**(数字回查 facts / 内部码 / 语言混用 / 两态揉一句)→ 逐句门,一句过了才放行;
//   ② **跨句才能判的**(逐行抄 ⓑ 要数够三条、连着三句同开头)→ 属**质量**不属真假,整段跑完只留痕。
//
// 🔴 **一道判据都没有放宽**:①里用的就是原来那几个函数,一个字没改,只是喂给它的是「到此为止的前缀」
//    而不是整段。**故意喂前缀而不是喂单独一句** —— 行首序号白名单、官方专名遮罩这些判据都要看上下文,
//    拆散了喂就成了另一套判定(两套迟早不一致)。前面的句子已经验过是干净的,新报出来的必然出在新那截。
const HEDGE_SPLIT = /(?<=[。！？；!?;\n])/    // dropTrailingHedge 砍的粒度(它自己那把刀,英文里 `.` 不断段)
// 一句写完了没有:全角句末标点 / `\n` 直接算;ASCII `.` 前面是数字时**不算**(在写的可能是 `3.6`)——
// 这正是 2579202 那条红线的同款判据:**宁可晚一拍,不许断在词中间(或数字中间)**。
const SENT_END = /(?:[。！？；!?;\n]|(?<!\d)\.)$/

/**
 * 尾巴留手:两样**得等到后面还有字**才判得了的东西,不许先发出去。
 *   ① 在途的半句 —— 断句用全站那一份 SENT_SPLIT(clampAnswer / findSameOpening / findMixedStates 用的同一条,
 *      2579202 抽出来的),**这里不另写一套**;
 *   ② dropTrailingHedge 会砍掉结尾那一两「段」劝告 —— 先发再删 = 用户读到了我们打算删掉的建议。
 * ② 只对**真可能被砍的**留手(判据照抄 dropTrailingHedge:带劝告词且一个数字都没有),
 * 而**还在写的那一段**只认「已经带着数字」就放行 —— 数字只会越加越多不会消失,带数字的段它砍不动;
 * 一个数字都还没有的在写段一律压着,免得后面冒出一句「建议尽快…」时已经发出去了。
 */
function holdTail(s: string, lang: ChatLang): string {
  const parts = s.split(SENT_SPLIT)
  let n = parts.length
  if (n && !SENT_END.test(parts[n - 1].trimEnd())) n--                 // ① 在途的半句
  const head = parts.slice(0, n).join('')
  const units = head.split(HEDGE_SPLIT)
  const openEnd = !/[。！？；!?;\n]$/.test(head)                        // 最后那一段还没写完
  let m = units.length
  let held = 0
  while (m > 0 && held < 2) {                                          // ② 它最多砍两段
    const p = units[m - 1]
    if (!p.trim()) { m--; continue }                                   // 空白段跟着走(它找最后一句时也跳过空白)
    if (/\d/.test(p) || (!(m === units.length && openEnd) && !findHedges(p, lang).length)) break
    m--; held++
  }
  return units.slice(0, m).join('')
}

/**
 * 逐句门的硬拦集合 = 既有六道里**一句就能判的那五道**(第六道 findFactCopied 见上面 ⓑ),
 * 外加 2026-08-09 新增的两道确定性硬拦(闸A 归因 / 闸B 派生数单位),它们也都是一句就能判的。
 * `slots` = 用户真给过的槽,闸A 的输入;不给 = 闸A 不生效(见 findUngroundedClaims)。
 */
export function sentenceBlockers(text: string, facts: Fact[], lang: ChatLang, echo = '', slots?: Partial<Slots> | null): string[] {
  return [
    ...guardAnswer(text, facts, echo).bad,
    ...findLeaks(text),
    ...findFactEq(text),
    ...findEnglishUnits(text, lang, facts),
    ...findWordNumbers(text, lang),
    ...findForeignScript(text, lang),
    ...findMixedStates(text, lang),
    ...findUngroundedClaims(text, slots, echo),
    ...findUnitMismatch(text, facts, echo),
    // K03 省名串台(2026-08-09 治病批):点名了 facts/原话里都没有的省,一句就能判
    ...findAlienProvinces(text, facts, echo, slots),
  ].slice(0, 8)
}

export type SentenceGate = {
  /** 已经放行出去的那截(处理后的文本 —— 前端收到的就是它,一字不差)。 */
  readonly released: string
  /** 又收到一段模型原文(累计) → 这次能放行的增量('' = 还不能)。blocked 非空 = 撞了门,调用方必须停流。 */
  push(raw: string): { text: string; blocked: string[] }
  /** 整段落地后收尾:final = 最终见客文案。返回还没发的那截;`null` = 对不上前缀,调用方得撤回重画。 */
  tail(final: string): string | null
}
/**
 * 流的那一稿走的是**和整段完全同一条流水线**(tidy → localizeUnits → clampAnswer),
 * 只是每次喂进去的是「到目前为止」的原文 —— 所以流出去的字与最终答复逐字相同,不是另做一份。
 */
export function makeSentenceGate(facts: Fact[], lang: ChatLang, echo = '', slots?: Partial<Slots> | null): SentenceGate {
  let out = ''
  return {
    get released() { return out },
    push(raw) {
      const cand = clampAnswer(holdTail(localizeUnits(tidy(raw), lang), lang), lang)
      if (cand.length <= out.length || !cand.startsWith(out)) return { text: '', blocked: [] }
      const blocked = sentenceBlockers(cand, facts, lang, echo, slots)
      if (blocked.length) return { text: '', blocked }
      const add = cand.slice(out.length)
      out = cand
      return { text: add, blocked: [] }
    },
    tail(final) {
      if (!final.startsWith(out)) return null
      const add = final.slice(out.length)
      out = final
      return add
    },
  }
}

/**
 * 降级清单的开场白。**诚实和可读同时做到**(2026-08-05 Frank 实测:
 * 原话是「模型这次没能守住『只用查到的数字』这条线,所以…」—— 用户不关心我们的 guard 叫什么,
 * 那是在跟他讲我们的内部工程)。改法不是把它藏起来假装成正常答复,而是**只说与他有关的那一半**:
 * 这一次给的是原始事实、不是组织好的答复,而且每条带出处。他据此知道该怎么读下面这张清单,
 * 至于为什么只有事实,那是我们的事。
 */
const SHEET_HEAD: Record<ChatLang, string> = {
  zh: '这次我只给你查到的官方事实,每条都带出处:',
  en: 'This time I am giving you only the official facts we looked up, each with its source:',
  ko: '이번에는 조회한 공식 자료만 그대로 드립니다. 각 항목에 출처가 있습니다:',
}
// 降级清单也是见客文案:四态码换人话(四态句子只有 AVAIL_SENTENCE 一个来源)、单位换用户语言。
// label 仍是英文速记 —— 那是原料不是话术,降级本来就是「给你看我查到了什么」。
const dropCodes = (s: string, lang: ChatLang) => s
  .replace(/NOT-(PUBLISHED|COLLECTED|APPLICABLE)(\s*\([^)]*\))?/gi, (_m, k: string) => AVAIL_SENTENCE[lang][`not-${k.toLowerCase()}` as Availability])
  .replace(/\bN-A(\s*\([^)]*\))?/g, AVAIL_SENTENCE[lang]['not-applicable'])

/**
 * 单位来自库(pnp_ops_stats.unit),**我们枚举不全**:实测漏过一个 `nominations`。
 * 兜底原则 —— 中/韩界面里,**认不出的英文单位一律不印**(标签已经把意思说清了:
 * 「MB 年内已提名: 2673」不比「2673 nominations」少一个字的信息)。缩写(CRS/CLB)照留。
 */
function unitText(unit: string, lang: ChatLang): string {
  if (!unit || lang === 'en') return unit
  if (!/[a-z]/i.test(unit)) return unit                       // 本来就不是英文
  if (/^[A-Z]{2,5}$/.test(unit)) return unit                  // CRS / CLB 这类站内通用缩写
  const mapped = localizeUnits(`1 ${unit}`, lang).replace(/^1\s*/, '')
  return /[a-z]/i.test(mapped) ? '' : mapped                  // 认不出 → 不印,绝不把英文丢给用户
}
/**
 * 降级:宁可给一张能溯源的事实清单,也不给一句编出来的话。
 *
 * 🔴 但**清单本身要排得能读**(2026-08-05 Frank 实测:「一坨 - 标签: 值 — 一长串 note」)。
 * 三条排法,都只做减法,一个事实不新增、不改写:
 *   ① **别人跟他说的话排最前** —— 他就是为这个来的,而它偏偏在 collectFacts 的存储序里排最后(第⑦格);
 *   ② 带数字的事实排中间,四态行(「这项官方不公布」)排最后 —— 有数的先看,没数的后看;
 *   ③ 索引口径注(unit='note')整条不进:那是管道内情,不是他的事实。
 * 再加 brief:砍掉四态行后面的取证注(见 sayFact)。条数从 20 收到 14 —— 再多没人读得完。
 */
const SHEET_ORDER: Record<string, number> = { claim: 0, status: 3 }
export function factSheet(facts: Fact[], lang: ChatLang): string {
  // 与 prompt 用同一个 sayFact:降级清单和喂模型的材料是同一批话,两处各写各的迟早分叉
  const lines = facts
    .filter((f) => f.unit !== 'note')
    .map((f, i) => ({ f, i, rank: SHEET_ORDER[f.unit] ?? (f.value != null ? 1 : 2) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .slice(0, 14)
    .map(({ f }) => `- ${sayFact(f, lang, { brief: true })}`)
    .filter((l, i, a) => a.indexOf(l) === i)          // 同一句重复摆两遍只会显得没查清楚
  return localizeUnits(dropCodes([SHEET_HEAD[lang], ...lines].join('\n'), lang), lang)
}

// ── 追问建议(不过模型:一个数字都不带,不需要 guard)──────────────────────────
//
// 🔴 **只推荐我们真答得上来的**(2026-08-04 生产实录:第一条推荐问题是「What are my odds of being
//    picked?」—— 本站红线是不算概率,等于亲手把用户领到我们不答的地方去)。所以不再用固定三句,
//    而是**按这次真查到了什么**生成:某个工具这轮拿回了带数字的 fact,才推它对应的那句。
//    证书、时长、胜算这类库里没有的,一律不推。
type FollowKey = 'unsaid' | 'jobs' | 'thresholds' | 'coverage' | 'draws' | 'ops' | 'ee'
// 🔵 2026-08-09 Frank:「接着问怎么也是固定的?不应该根据对话生成吗」。改法=**确定性个性化**,
//    不是 LLM 现编(自由生成的追问会造出「本站未收录」的死路 chip——递出去的话头必须保证答得上,
//    这条底线不动)。模板织入**用户自己的职业叫法**(slots.occText:护士/PSW,不用英文长官名):
//    有槽=「护士还有哪些省的官方清单收?」,无槽=原通用句。chip 点出去自带职业词,追问轮更接得稳。
const FOLLOWUPS: Record<ChatLang, Record<FollowKey, (occ?: string) => string>> = {
  zh: {
    unsaid: (o) => o ? `还有哪些省的官方清单收了${o}?` : '还有哪些省的官方清单收了我这个职业?',
    jobs: (o) => o ? `现在哪个省${o}的在招岗位最多?` : '现在哪个省这个职业的在招岗位最多?',
    thresholds: () => '这些省的官方门槛具体要求什么?',
    coverage: (o) => o ? `${o}被哪些官方清单排除了?` : '我这个职业被哪些官方清单排除了?',
    draws: () => '最近一轮抽选的分数线是多少?',
    ops: () => '这个省今年的提名名额还剩多少?',
    ee: (o) => o ? `联邦 EE 通道收了${o}吗?` : '联邦 EE 通道收了我这个职业吗?',
  },
  en: {
    unsaid: (o) => o ? `Which other provinces list ${o} officially?` : 'Which other provinces list my occupation officially?',
    jobs: (o) => o ? `Which province has the most open postings for ${o}?` : 'Which province has the most open postings for this occupation?',
    thresholds: () => 'What exactly do these provinces require on paper?',
    coverage: (o) => o ? `Which official lists exclude ${o}?` : 'Which official lists exclude my occupation?',
    draws: () => 'What was the cutoff in the latest draw?',
    ops: () => 'How much of this year’s nomination allocation is left?',
    ee: (o) => o ? `Do the federal Express Entry categories cover ${o}?` : 'Do the federal Express Entry categories cover my occupation?',
  },
  ko: {
    unsaid: (o) => o ? `다른 어느 주가 ${o}을(를) 공식 목록에 올려두었나요?` : '다른 어느 주가 제 직업을 공식 목록에 올려두었나요?',
    jobs: (o) => o ? `지금 어느 주에 ${o} 공고가 가장 많나요?` : '지금 어느 주에 이 직업 공고가 가장 많나요?',
    thresholds: () => '이 주들의 공식 요건은 구체적으로 무엇인가요?',
    coverage: (o) => o ? `어느 공식 목록이 ${o}을(를) 제외했나요?` : '어느 공식 목록이 제 직업을 제외했나요?',
    draws: () => '최근 추첨의 커트라인은 얼마였나요?',
    ops: () => '이 주의 올해 지명 배정은 얼마나 남았나요?',
    ee: (o) => o ? `연방 EE 카테고리에 ${o}이(가) 포함되나요?` : '연방 EE 카테고리에 제 직업이 포함되나요?',
  },
}
/** 这次真拿到了数据的工具 → 对应的追问;顺序即优先级,最多三条。拿不到数据的一条都不推。
 *  `asked` = 用户刚问的那句:同一句不再推给他(点了 chip 又看见同一个 chip,像没反应)。
 *  `occ` = 用户自己的职业叫法(slots.occText),织进模板;超长或空 → 回落通用句。 */
export function buildFollowups(facts: Fact[], lang: ChatLang, asked = '', occ = ''): string[] {
  const o = occ.trim().length >= 2 && occ.trim().length <= 20 ? occ.trim() : undefined
  const has = (tool: string, ok: (f: Fact) => boolean) => facts.some((f) => f.tool === tool && ok(f))
  const num = (f: Fact) => f.value != null
  const avail: [FollowKey, boolean][] = [
    ['unsaid', facts.some((f) => f.tool === 'checkClaims' && f.label === LBL[lang].unsaid)],
    ['jobs', has('lookupJobs', num)],
    ['thresholds', has('lookupThresholds', num)],
    ['coverage', has('lookupCoverage', (f) => f.unit === 'list')],
    ['draws', has('lookupDraws', num)],
    ['ops', has('lookupOps', num)],
    ['ee', has('lookupEE', num)],
  ]
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
  return avail.filter(([, ok]) => ok).map(([k]) => FOLLOWUPS[lang][k](o))
    .filter((q) => norm(q) !== norm(asked))
    .slice(0, 3)
}

/**
 * 🔴 出处区只列**答复真的用到的**(2026-08-04 生产实录:24 条全量倾倒,用户问中介收费,
 * 出处里摆着 AB 162 岗、ON 121 岗、QC 55 岗 —— 没一条与那句话有关)。
 * 判据只认两样**可证的**命中,不猜:① 这条的数值在答复里出现过(照 guardAnswer 那套归一);
 * ② label 里的官方专名(清单名/通道名)在答复里出现过。
 * 三类永不进出处:`note`(索引口径是**注意事项**不是来源)、`claim`(那是别人说的话,不是官方出处)、
 * 没有 URL 的(点不开的东西列出来只是噪音)。
 */
export function citeFacts(answer: string, facts: Fact[]): Fact[] {
  const nums = new Set<string>()
  for (const m of answer.matchAll(NUM_RE)) nums.add(normNum(m[0]))
  const low = answer.toLowerCase()
  return facts.map((f) => {
    if (f.unit === 'note' || f.unit === 'claim' || !f.evidence.url) return { ...f, cited: false }
    let cited = f.value != null && nums.has(normNum(String(f.value)))
    // 专名只认 label **冒号之后**那截(官方清单名/通道名就长在那儿)。整条 label 拿去匹配会误伤:
    // 「MB nominations so far this year — Skilled Worker」里的 Skilled Worker 撞上答复里的
    // 「Skilled Worker Stream draw cutoff」,一条没被用到的提名数就混进出处(2026-08-04 实测)。
    if (!cited) {
      const name = f.label.includes(': ') ? f.label.slice(f.label.lastIndexOf(': ') + 2) : ''
      cited = name.length >= 10 && low.includes(name.toLowerCase())
    }
    return { ...f, cited }
  })
}

// ── 对话槽 → 档案(D3:只补空)────────────────────────────────────────────────

/**
 * 🔴 **对话是最自然的建档场景,却是唯一不建档的入口**(D3;2026-08-09 实查:抽到的槽只进 chat_logs,
 * users.profile 零写点)。这里把一轮对话抽出来的**高置信槽**映射成 `users.profile` 的补丁。
 *
 * 三条红线,一条都不许松:
 *   ① **只补空**:目标字段现值为 null/空数组才写。手填优先 —— 用户在账户页/向导里亲手填的值,
 *      永远压过我们从一句话里抽出来的(抽槽是模型的活,手填是他自己的话)。
 *   ② **只写高置信的**:`status` 只认三种一一对得上的身份(graduated/visitor 落哪个分型都是猜,不写);
 *      `provs` 只在**这轮没有第三方主张**时才当目标省 —— 主张里的省份是「中介说曼省有合作公司」那种,
 *      是别人提的地方,不是他的目标;`crs`/`pgwpMonthsLeft` 对话里根本没有对应槽,不写。
 *   ③ **匿名不存**:登录判定在路由层(这里拿不到 user,也不该拿到)。
 * 返回 null = 这轮没有可补的,调用方一个字都不必说(尾行只在真写了的时候出现)。
 */
export type ChatProfilePatch = {
  currentStatus?: string
  nocCodes?: string[]
  clb?: number
  targetProvinces?: string[]
}
/** 抽槽 status → 档案分型 slug(lib/match.ts 的 CurrentStatus)。**对不上的一律不映射**。 */
const STATUS_SLUG: Record<string, string> = { student: 'studying', working: 'working', abroad: 'overseas' }
/** 尾行里那几个字段的人话名(三语;数字/省码原样跟在后面)。 */
const SAVED_LBL: Record<ChatLang, { occ: string; clb: string; prov: string; status: Record<string, string> }> = {
  zh: {
    occ: '职业 NOC', clb: 'CLB', prov: '目标省',
    status: { studying: '身份 在读', working: '身份 在职', overseas: '身份 在境外' },
  },
  en: {
    occ: 'occupation NOC', clb: 'CLB', prov: 'target province',
    status: { studying: 'status studying', working: 'status working', overseas: 'status outside Canada' },
  },
  ko: {
    occ: '직업 NOC', clb: 'CLB', prov: '희망 주',
    status: { studying: '신분 재학', working: '신분 재직', overseas: '신분 해외' },
  },
}
/** 尾行:一行、不解释、不口语(文案四闸)。枚举用顿号(全站禁「·」)。 */
const SAVED_TAIL: Record<ChatLang, (items: string[]) => string> = {
  zh: (i) => `已存入档案:${i.join('、')}(账户页可改)`,
  en: (i) => `Saved to your profile: ${i.join(', ')} (editable in your account).`,
  ko: (i) => `프로필에 저장했습니다: ${i.join(', ')} (계정 페이지에서 수정 가능)`,
}
/** 现值算不算「空」:null/undefined/空串/空数组算空,其余一律当用户已有值,绝不覆盖。 */
const emptyField = (v: unknown): boolean =>
  v == null || v === '' || (Array.isArray(v) && v.length === 0)

export function profileFill(
  slots: Slots, current: unknown, lang: ChatLang,
): { patch: ChatProfilePatch; tail: string } | null {
  const cur = (current && typeof current === 'object' ? current : {}) as Record<string, unknown>
  const patch: ChatProfilePatch = {}
  const items: string[] = []
  const T = SAVED_LBL[lang]
  if (/^\d{5}$/.test(slots.noc ?? '') && emptyField(cur.nocCodes)) {
    patch.nocCodes = [slots.noc as string]
    items.push(`${T.occ} ${slots.noc}`)
  }
  if (typeof slots.clb === 'number' && emptyField(cur.clb)) {
    patch.clb = slots.clb
    items.push(`${T.clb} ${slots.clb}`)
  }
  if (!slots.claims.length && slots.provs.length && emptyField(cur.targetProvinces)) {
    patch.targetProvinces = slots.provs
    items.push(`${T.prov} ${slots.provs.join(lang === 'zh' ? '、' : ', ')}`)
  }
  const slug = STATUS_SLUG[slots.status ?? '']
  if (slug && emptyField(cur.currentStatus)) {
    patch.currentStatus = slug
    items.push(T.status[slug])
  }
  return items.length ? { patch, tail: SAVED_TAIL[lang](items) } : null
}

// ── 主流程 ──────────────────────────────────────────────────────────────────

/**
 * opts.onStep  = 工具轨迹(见文件上方 STEP 那段的三条铁律)。不传 = 今天的行为,一步不变。
 *                事件按**真实阶段边界**发:读懂问题 → 认出职业 → 每个工具返回 → 开始组织答复。
 * opts.onDelta = 答复正文的**逐句**增量(见 makeSentenceGate:一句过了逐句门才发)。不传 = 整段落地才给。
 * opts.onReset = 已经发出去的正文作废,前端清屏(撞了门要重试 / 降级 / 补位把前面重截了)。
 *                它是**撤回**不是进度,只在真要重画时发。
 */
export async function orchestrate(
  rawPool: any, input: { text: string; lang: ChatLang; history?: ChatTurn[]; context?: unknown; profileKnown?: ProfileKnown },
  opts?: { onStep?: OnStep; onDelta?: (s: string) => void; onReset?: () => void },
): Promise<ChatResult> {
  const text = (input.text || '').trim().slice(0, MAX_TEXT)
  const lang: ChatLang = (['zh', 'en', 'ko'] as const).includes(input.lang) ? input.lang : 'en'
  // 🔵 D2:首轮仍是四字门;我们刚问完一句(history 里有 assistant 轮)时短答放行 —— 见 isFollowupTurn。
  //    空串永远拦:那不是短答,是没答。
  // 🔵 四字门是按英文字符数定的 —— 中/韩双字就是一个完整职业(「护士」「厨师」「목수」),
  //    2026-08-09 Frank 实撞:冷启动发「护士」被回「你做什么工作」,用户刚说完职业就被装没听见。
  //    CJK 文本 ≥2 字即放行进抽槽:真是「你好」这类寒暄,后面 noOcc/候选路照旧接得住。
  const cjkOk = text.length >= 2 && /[㐀-鿿가-힣]/.test(text)
  if (!text || (text.length < MIN_TEXT && !cjkOk && !isFollowupTurn(input.history))) {
    throw new ChatError('tooShort', 'input too short')
  }
  const pool = memoPool(rawPool)
  const onStep = opts?.onStep
  const S = STEP[lang]

  // ① 抽槽位
  onStep?.({ phase: 'read', text: S.read })
  let raw: string
  try {
    const hist = (input.history ?? []).slice(-6).map((h) => `${h.role}: ${h.content.slice(0, h.role === 'assistant' ? 320 : 240)}`).join('\n')
    raw = await completeText([
      { role: 'system', content: SLOT_SYSTEM },
      { role: 'user', content: (hist ? `EARLIER:\n${hist}\n\nNOW: ` : '') + text },
    ], { maxTokens: 400, provider: 'friend' })
  } catch (e) {
    throw new ChatError('llm', e instanceof LlmError ? e.message : String(e))
  }
  const parsed = parseLlmJson(raw)
  if (!parsed) throw new ChatError('llm', `slot parse failed: ${raw.slice(0, 160)}`)
  let merged = mergeFollowupSlots(normalizeSlots(parsed), input.history?.length ? input.context : null, text)
  // 🔴 claims 只能来自用户自己的话(2026-08-06 生产实录 #36/#37):抽槽模型会把 EARLIER 里
  //    assistant 的句子 —— 我们自己上一轮的答复 —— 抽成「你听到的」主张,见客层回头把自家门槛行
  //    当中介报价对账(「报价本身不能证明…」)。SLOT_SYSTEM 里那条规则是软的,这道闸是硬的:
  //    主张文本(掐头 60 字、去空白)出现在任何一条 assistant 历史里就整条丢弃。
  //    误伤面算过:用户真把我们的话复述回来问「真的吗」,那也不是第三方主张,丢了正确。
  if (merged.claims.length && input.history?.length) {
    const squash = (s: string) => s.replace(/\s+/g, '')
    const ours = input.history.filter((h) => h.role === 'assistant').map((h) => squash(h.content))
    const own = merged.claims.filter((c) => {
      const t = squash(c.text).slice(0, 60)
      return t.length < 6 || !ours.some((a) => a.includes(t))
    })
    if (own.length !== merged.claims.length) merged = { ...merged, claims: own }
  }
  // 他原话里打出来的 5 位码压过模型和上下文:那是**他自己指定的那一条**(多半是点了我们摆的候选 chip),
  // 再去 pg_trgm 猜一次就是拿相似度覆盖一个确定值(见 literalNoc 上面那段实测)。
  let typed = literalNoc(text)
  // 🔴 K08:裸码(没写 NOC 字样)同权,但先过 noc_descriptions 验真——裸五位数可能是工资,
  //    库里实存才算码(见 bareNocCandidates 那段)。fixture 池不认这条 SQL → catch 折空行 → 行为与旧链一致。
  if (!typed) {
    const bare = bareNocCandidates(text)
    if (bare.length) {
      const { rows } = await pool.query(`SELECT noc FROM noc_descriptions WHERE noc = ANY($1)`, [bare])
        .catch(() => ({ rows: [] as { noc: string }[] }))
      const real = new Set(rows.map((r: { noc: string }) => String(r.noc)))
      typed = bare.find((n) => real.has(n)) ?? null
      if (typed) console.log(`[chat] bare noc ${typed} confirmed in noc_descriptions (candidates=${bare.join(',')})`)
    }
  }
  const draft = typed && typed !== merged.noc ? { ...merged, noc: typed } : merged
  // 联邦规则/分表不依赖职业。路由判据只读用户原话,不拿模型猜的 topic 当开关。
  const federalPrograms = federalRulePrograms(text)
  const crs = crsLookups(text)
  const federalOnlyOk = federalPrograms.length > 0 || crs.length > 0

  // ② 职名 → 5 位 NOC(拿不到就反问,绝不猜)
  const hit = draft.noc ? { noc: draft.noc, title: '' } : await resolveNoc(pool, draft.occText)
  if (!hit && !federalOnlyOk) {
    // 🔴 说了专业没说职位名 → **反问得有用**,别让他撞死路(见 studyFieldOf 上面那段)。
    //    候选一条都查不到才回落 noOcc:「随便打了句问候」照旧走原路。
    const field = studyFieldOf(text) || draft.occText
    const opts = field ? await suggestOccupations(pool, field, lang) : []
    if (opts.length) {
      console.log(`[chat] study field "${field}" → ${opts.map((o) => o.noc).join(',')} (asked which occupation)`)
      return askOccupation(field, opts, lang)
    }
    // 🔴 问的是「这张表是什么、对我有什么用」→ 答用法再把话头递回职业(D1;见 isUsageQuestion 上面那段)。
    //    放在候选反问**之后**:说得出专业的人,给他真候选比给他一段说明有用。
    if (isUsageQuestion(text)) {
      console.log(`[chat] usage question answered without occupation lang=${lang}`)
      return answerUsage(text, lang, draft)
    }
    throw new ChatError('noOcc', 'occupation not resolved', { ...draft, noc: null })
  }
  const slots: Slots = {
    ...draft,
    noc: hit?.noc ?? null,
    occText: draft.occText || hit?.title || '',
  }

  // ③ 调工具 → Fact[]
  // 职业名先算出来:轨迹第二格要报「认出的是谁」,而 NOC 一确定这一格就是既成事实(工具还没跑)。
  if (hit) {
    const occHint = `${hit.title || slots.occText} (NOC ${slots.noc})`
    onStep?.({ phase: 'occ', text: S.occ(occHint) })
  }
  // 🔴 路径裁决的触发判据(C5c),两条同时成立才算,缺一不可:
  //   ① 他问的就是「我走哪条路」(isPathQuestion 只读原话,不看模型猜的槽 —— 同 federalRulePrograms 那条原则);
  //   ② 档案槽有值的够 MIN_PROFILE_SLOTS 个 —— 不够就不硬算:判出来的十三条几乎全是 needs-info,
  //      与其把「判不了」说十三遍,不如反问一句该补的槽(followups 见下面 askSlots)。
  //   另外还要 hit:通道判定处处依赖 NOC/TEER,拿不到 5 位码就反问,这条铁律在这儿一样管用。
  const verdictOn = !!hit && isPathQuestion(text) && filledProfileSlots(slots).length >= MIN_PROFILE_SLOTS
  // 问的是「要多久 / 哪条更快」才算时间线(判据是纯函数,不问模型:topic 归模型猜的那些坑已经踩够了)
  const { facts, title } = await collectFacts(pool, slots, null, lang, onStep, {
    plan: !!hit && isPlanQuestion(text) && !isOddsQuestion(text), federalPrograms, crs,
    allProvs: asksWhichProvince(text), verdict: verdictOn,
  })
  const occ = hit ? `${title || hit.title || slots.occText} (NOC ${slots.noc})` : ''

  // ④ 合成 + 出口校验(违规重试一次,再违规降级成事实清单)
  //    三道硬拦:数字溯源(guard) / 内部码泄露(findLeaks) / 中韩答复里的英文速记(findEnglishUnits);
  //    一道留痕:推断性措辞(findHedges)—— 只报警不拦,误杀正常表述比漏一句更贵。
  const synOpts = { zeroExp: slots.expMonths === 0, hasClaims: slots.claims.length > 0, hasVerdict: verdictOn, occ, history: input.history }
  let answer = ''
  let bad: string[] = []
  let banned: string[] = []
  let sameOpen: string[] = []          // 句式雷同:重试一次就认命(降级比它难看得多),不进降级判据
  let passed = ''                      // 最近一次**过了硬拦**的答复(句式重试的退路)
  let firedLast: string[] = []         // 最后一次撞到的检查名(降级日志要报「因为哪一道」,不是只报「降级了」)
  // 🔵 逐句门(见 makeSentenceGate):只有**第一稿**流 —— 重试稿要么是撞了门的补救、要么是软重写,
  //    两种都是「把刚才那段推翻重写」,流出去只会让用户读到两遍不一样的话。
  //    slots 一并交给它:闸A(归因)判的是「这句话替他说了他没说过的属性」,没有槽就判不了。
  const gate = opts?.onDelta ? makeSentenceGate(facts, lang, text, slots) : null
  let gateBad: string[] = []           // 流到一半撞了门:这一稿作废,照旧走重试/降级
  let streamed = false                 // 真往前端发过字(撤回时要通知前端清屏)
  let streamOk = false                 // 这一稿是「逐句门全过」的那一稿:收尾只补尾巴,不重画
  onStep?.({ phase: 'write', text: S.write })
  for (let attempt = 0; attempt < 2; attempt++) {
    const live = Boolean(gate) && attempt === 0
    try {
      const t0 = Date.now()
      let ttft = 0
      let acc = ''
      const raw2 = await completeText(
        synthMessages(facts, text, lang, { ...synOpts, ...(attempt ? { forbid: bad, banned, sameOpen } : {}) }),
        { maxTokens: 900, provider: 'friend', onDelta: (chunk) => {
          if (!ttft) ttft = Date.now() - t0
          if (!live || gateBad.length) return
          acc += chunk
          if (!/[。！？；!?;.\n]/.test(chunk)) return      // 这一块里连一个断句记号都没有,不必回读整段
          const r = gate!.push(acc)
          if (r.blocked.length) {
            gateBad = r.blocked
            console.log(`[chat] sentence gate blocked noc=${slots.noc} lang=${lang} hits=${r.blocked.join(',')}`)
            if (streamed) { opts?.onReset?.(); streamed = false }   // 已经发出去的那截作废:让前端清屏,别读半段
          } else if (r.text) { streamed = true; opts!.onDelta!(r.text) }
        } },
      )
      console.log(`[chat] synth attempt=${attempt + 1} noc=${slots.noc} ttft=${ttft}ms total=${Date.now() - t0}ms out=${raw2.length}ch`)
      const cleaned = dropTrailingHedge(clampAnswer(localizeUnits(tidy(raw2), lang), lang), lang)
      if (cleaned.dropped.length) console.log(`[chat] dropped trailing advice noc=${slots.noc} sentences=${JSON.stringify(cleaned.dropped)}`)
      answer = cleaned.text
    } catch (e) {
      if (attempt === 0 && facts.length) { answer = ''; bad = []; break }   // 合成掉线:facts 还在,直接降级
      throw new ChatError('llm', e instanceof LlmError ? e.message : String(e))
    }
    // 🔴 **哪一道检查、第几次** —— 逐道具名(2026-08-05 Frank:降级率是根因指标,修呈现只是化妆)。
    //    原来六道检查被并成 leaks/units 两坨,日志里看得见「撞了」看不见「撞的是谁」,
    //    于是没人知道该松哪一道、该改哪条 RULE。名字就是这几个函数名,别再另起别名。
    const g = guardAnswer(answer, facts, text)
    const fired: [string, string[]][] = ([
      ['guard', g.bad],
      ['leak', findLeaks(answer)],
      ['factEq', findFactEq(answer)],
      ['factCopy', findFactCopied(answer, facts)],       // ← 六道里唯一**跨句才判得了的**(要数够三条)
      // 「某省清单收了这个职业」但 facts 里没有那个省的 coverage —— 数字 guard 一个字都拦不住,
      // 而它错的是**资格前提**(2026-08-05 实录:SK 一条 coverage 都没有,答复照样说「萨省清单收录该职业」)。
      // 归进硬拦(leaks 那一组):重试一次,再犯就降级成事实清单 —— 宁可朴素,不发一句凭空的资格结论。
      ['coverage', findUnbackedCoverage(answer, facts, lang)],
      // 🔴 2026-08-09 两道新硬拦(33102 三轮实测,非数字断言此前无闸门):
      //   attrib = 第二人称陈述态说了一个我们手上没有值的属性(「你说过没有经验」/「你现在的分数」);
      //   unitNum = 数字对上了但**单位是编的**(「short by 6 months」借用户那句「CLB 6」的 6 过了数字闸)。
      //   都归硬拦:重试一次,再犯就降级成事实清单 —— 宁可朴素,不发一句替他编的自述。
      ['attrib', findUngroundedClaims(answer, slots, text)],
      ['unitNum', findUnitMismatch(answer, facts, text)],
      // K03 省名串台(2026-08-09 治病批,基线 R08 实录冒 NB):省名凭空出现=资格前提级错,归硬拦
      ['provDrift', findAlienProvinces(answer, facts, text, slots)],
      ['enUnits', findEnglishUnits(answer, lang, facts)],
      ['cjkNum', findWordNumbers(answer, lang)],
      ['script', findForeignScript(answer, lang)],
    ] as [string, string[]][]).filter(([, v]) => v.length)
    const leaks = fired.filter(([k]) => k === 'leak' || k === 'factEq' || k === 'factCopy' || k === 'coverage'
      || k === 'attrib' || k === 'unitNum' || k === 'provDrift').flatMap(([, v]) => v)
    const units = fired.filter(([k]) => k === 'enUnits' || k === 'cjkNum' || k === 'script').flatMap(([, v]) => v)
    const hedges = findHedges(answer, lang)
    if (hedges.length) console.log(`[chat] hedge warn noc=${slots.noc} words=${hedges.join(',')}`)
    // 提示词的大写强调漏进答复(`**WE** do not have a record…`):只留痕 —— 治本在提示词那头,
    // 这里是复查。硬拦它会为了一个 OK/AND 把一段好答复顶成事实清单,不划算。
    const shouted = findShoutedWords(answer, facts)
    if (shouted.length) console.log(`[chat] shouted-caps warn noc=${slots.noc} words=${shouted.join(',')}`)
    const merged = [...findMergedStates(answer, facts, lang), ...findMixedStates(answer, lang)]
    if (merged.length) console.log(`[chat] state-merge warn noc=${slots.noc} ${merged.join(' | ')}`)
    // 🔵 流出去的那一稿:除了 factCopy,每一道都在流的过程中逐句判过了,这里是整段复查
    //    (留手的那一两句也得过这一关)。**factCopy 不参与放行** —— 它跨句才判得了,而拦它就得把
    //    用户已经读到的字全撤回;Frank 拍板的取舍正是这条:偶尔容忍啰嗦,绝不容忍编造的数字。
    if (live && !gateBad.length && !fired.some(([k]) => k !== 'factCopy')) {
      bad = []; banned = []
      streamOk = true
      const warn = [...fired.map(([k, v]) => `${k}(${v.length})`), ...findSameOpening(answer, lang).map((k) => `sameOpening(${k})`)]
      if (warn.length) console.log(`[chat] streamed draft kept, cross-sentence warn noc=${slots.noc} lang=${lang} ${warn.join(',')}`)
      break
    }
    // 流过一半却没能原样留下(尾巴撞了检查 / 中途撞了门)→ 立刻通知前端清屏,别让他盯着一段马上要被替换的字
    if (streamed) { console.log(`[chat] stream retracted noc=${slots.noc}`); opts?.onReset?.(); streamed = false }
    if (g.ok && !leaks.length && !units.length) {
      bad = []; banned = []
      passed = answer                       // 过了硬拦的稿子先存着:重写万一崩了,退回它比降级强
      // 硬拦全过 → 只剩「说得顺不顺」:连着三句同一个开头、或一句话焊了两种状态,重写一次
      // (**不进降级判据**:降级成事实清单比这两样难看得多;第二稿还这样就发出去,留痕给读日志的人)
      const soft = attempt ? [] : [...findSameOpening(answer, lang), ...findMixedStates(answer, lang)]
      if (!soft.length) { sameOpen = []; break }
      sameOpen = soft
      console.log(`[chat] soft rewrite noc=${slots.noc} hits=${soft.join(' | ')}`)
      continue
    }
    bad = g.bad
    banned = [...leaks, ...units].slice(0, 10)
    firedLast = fired.map(([k, v]) => `${k}(${v.length})`)
    console.log(`[chat] exit-check hit attempt=${attempt + 1} noc=${slots.noc} lang=${lang} `
      + `fired=${firedLast.join(',')} nums=${g.bad.join(',')} strings=${banned.join(',')} answer=${answer.slice(0, 200)}`)
  }
  // 🔴 模型漏掉的主张,出口自己补(见 missingClaimLines 上面那段:prompt 压不住,就别再指望 prompt)。
  //    先把模型那段按「留出补位长度」重新截一次 —— 见客字数上限不能因为补位被顶破。
  if (answer && !bad.length && !banned.length) {
    const miss = missingClaimLines(answer, facts, lang)
    if (miss.length) {
      const sep = lang === 'en' ? ' ' : ''
      const end = lang === 'en' ? '. ' : '。'
      const tail = miss.map((l) => `${l}${end}`).join(sep).trim()
      const head = clampAnswer(answer, lang, Math.max(120, LEN_CAP[lang] - tail.length - 2))
      // 🔴 补位落在项目符号后面要另起一段:直接续在 `- …` 那行后面,补回来的主张会被渲染**进那一条项目里**
      //    (前端只按行首 `- ` 认项),读者看到的就是一条又臭又长的清单项,而不是一句独立的话。
      answer = `${head}${BULLET_LINE.test(head.split('\n').pop() ?? '') ? '\n\n' : sep}${tail}`
      console.log(`[chat] claim lines re-attached noc=${slots.noc} n=${miss.length}`)
    }
  }
  let degraded = false
  // 句式重写这一轮翻了车(第一稿本来是干净的)→ 退回第一稿,不许因为「不够好看」把能用的答复扔了降级
  if ((bad.length || banned.length || !answer) && passed) {
    console.log(`[chat] same-opening rewrite failed, keeping the first clean draft noc=${slots.noc}`)
    answer = passed; bad = []; banned = []
  }
  if (bad.length || banned.length || !answer) {
    if (!facts.length) throw new ChatError('guard', 'no facts to fall back on', slots)
    degraded = true
    console.log(`[chat] degraded to fact sheet noc=${slots.noc} lang=${lang} facts=${facts.length} `
      + `reason=${firedLast.join(',') || (answer ? 'unknown' : 'no-answer')} bad=${bad.join(',')}`)
    answer = factSheet(facts, lang)
    // 🔴 降级分支**必须过同一道出口检查**,否则它就是所有红线的后门(2026-08-04:兜底把英文内部标签
    //    `apprentice-friendly openings…` / `index scope note` 直接吐给了用户)。
    //    这里是我们自己写的字,查出问题 = 代码 bug,不是模型违规 —— 所以不重试、不再降级,响亮报错留痕。
    const sheetBad = [
      ...findLeaks(answer), ...findEnglishUnits(answer, lang, facts), ...findWordNumbers(answer, lang),
      ...findForeignScript(answer, lang), ...findMergedStates(answer, facts, lang), ...findHedges(answer, lang),
      // 我们自己的 label 里用大写做强调,模型照抄(en 的 listEx 曾经写作 EXCLUDES)—— 降级清单没有模型
      // 兜底那一层,写错就是原样见客,所以这道在这儿也要跑一遍
      ...findShoutedWords(answer, facts),
    ]
    if (sheetBad.length) console.error(`[chat] 🔴 FACT SHEET LEAKS (数据层 label 没本地化) noc=${slots.noc} lang=${lang} bad=${sheetBad.join(',')}`)
  }
  // 🔵 逐句门收尾:补发「留手的那一两句」+ missingClaimLines 补回来的主张。
  //    对不上前缀(补位把前面重截了)→ 撤回让最终事件整段重画:宁可闪一下,不许前后两截对不上。
  if (streamOk && gate) {
    const add = gate.tail(answer)
    if (add) opts?.onDelta?.(add)
    else if (add === null) { console.log(`[chat] stream tail mismatch, repainting noc=${slots.noc}`); opts?.onReset?.() }
  } else if (streamed) opts?.onReset?.()
  // 出处标注在最后一步(要拿最终答复回读);追问只从「这次真查到了数据」的工具里出。
  // 降级成事实清单时**整张清单就是答复**,所以有出处的全标上 —— 那种时候出处正是唯一能点的东西。
  const out = degraded ? facts.map((f) => ({ ...f, cited: Boolean(f.evidence.url) })) : citeFacts(answer, facts)
  console.log(`[chat] cited ${out.filter((f) => f.cited).length}/${out.length} facts noc=${slots.noc} degraded=${degraded}`)
  // 🔴 裁决已出但**身份不明**时点名问工签(§4.5 → C6 选项卡):NL 国际毕业生这类通道的前提是
  //    有效工签,而库里没有这条门槛行 —— 判定层说不出口的前提,由选项卡替它问(需要决定才弹,
  //    宁缺勿滥)。**不再同时塞进 followups**:那些 chip 点击=以用户身份发这句话,而这句是
  //    助手问用户的,语义拧着;选项卡的三张选项才是它的正确形态(2026-08-06 dev 实测两处重复)。
  // 裁决前置的工签卡优先;普通轮垫建档点选卡(能点选就不让打字,一轮一张,档案已有的槽不问)
  const options = verdictOn && slots.status == null
    ? permitOptions(lang)
    : slotAskOptions(slots, facts, lang, input.profileKnown)
  // 🔴 问了「走哪条路」却没判 = 档案槽不够。这时**反问缺的那几个槽**排在追问最前面:
  //    不补槽就不会有裁决,推别的追问等于把他领去一个答不了他这个问题的地方。
  //    点选卡这轮在收的那个槽除外(2026-08-09 Frank 截图:CLB 卡和「你的语言考到 CLB 几?」
  //    同屏两问)——卡是它的正确形态,同槽的文字反问不再重复出。
  const dupAsk = options?.slotKey ? (LBL[lang].vAsk as Record<string, string>)[options.slotKey] : undefined
  const askSlots = (isPathQuestion(text) && !verdictOn ? verdictFollowups(slots, lang) : []).filter((q) => q !== dupAsk)
  const followups = [...askSlots, ...buildFollowups(facts, lang, text, slots.occText)].slice(0, 3)
  return { answer, slots, facts: out, followups, ...(options ? { options } : {}), ...(degraded ? { degraded: true } : {}) }
}
