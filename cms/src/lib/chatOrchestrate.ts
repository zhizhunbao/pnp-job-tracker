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
 *   ③ 拿不到 5 位 NOC 就反问,**绝不猜职业码** —— 猜错一位,下面七个工具全在答另一个人的问题。
 *
 * 形状照 lib/resumeMatch.ts:纯函数 + 显式 pool 入参,路由只负责鉴权/限流/错误码。
 * ⚠️ 朋友服务(qwen3.6)prompt 上限 6000 字符(实测 400,system 不占额),所以 facts **先压平再压缩**
 * 才喂模型:工具返回的整坨 JSON 一次就能把额度撑爆(resume-match 真简历事故同一个坑)。
 */
import {
  checkClaims, lookupCoverage, lookupDraws, lookupEE, lookupJobs, lookupOps, lookupThresholds,
  PNP_PROVINCES, PRIVATE_PROMISE, type Availability, type Claim, type ClaimTopic,
} from './chatTools'
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
}
/** 'other' = 主张不属于任何工具管得着的题目(中介收费这类)—— 不硬塞给某个工具去"核",
 *  否则会出现「问的是收费、答的是清单收录」这种各说各话。这类只如实说一句"本站没有这类数据"。
 *  ⚠️ **私人承诺不在这里**:「有合作公司 / 内部渠道 / 包过」有自己的桶(C1 的 'private-promise'),
 *  答的是「没有任何一级政府公布这种名单」——比「本站尚未收录」强得多,别让它掉回 'other'。 */
export type SlotClaimTopic = ClaimTopic | 'other'
export type SlotClaim = { text: string; topic: SlotClaimTopic; province?: string }
export type Slots = {
  noc: string | null
  occText: string
  provs: string[]
  expMonths: number | null
  status: string | null
  claims: SlotClaim[]
}
export type ChatLang = 'zh' | 'en' | 'ko'
export type ChatTurn = { role: 'user' | 'assistant'; content: string }
export type ChatResult = { answer: string; slots: Slots; facts: Fact[]; followups: string[] }
export type ChatErrorCode = 'tooShort' | 'noOcc' | 'llm' | 'guard'
export class ChatError extends Error {
  code: ChatErrorCode
  slots?: Slots
  constructor(code: ChatErrorCode, msg: string, slots?: Slots) { super(msg); this.name = 'ChatError'; this.code = code; this.slots = slots }
}

export const MIN_TEXT = 4          // 少于这个字数问不出东西(「你好」不该烧一次模型调用)
export const MAX_TEXT = 1200       // 输入侧封顶(#102 账单教训)
const PROMPT_BUDGET = 4200         // 送 friend 的 user prompt 字符预算(留 1800 余量给 6000 硬上限)
const MAX_FACTS = 40               // facts 上限:再多前端也读不完,prompt 也塞不下

// ── 小工具 ──────────────────────────────────────────────────────────────────

/** 一次请求内的查询记忆:chatTools 七个工具会重复调 assembleReportFacts(同 noc 同 SQL),同参只查一次。 */
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

const LANG_NAME: Record<ChatLang, string> = { zh: 'Simplified Chinese', en: 'English', ko: 'Korean' }

// ── 第一步:抽槽位(模型只做「听懂」,不许下任何结论)────────────────────────

export const SLOT_SYSTEM = [
  'You turn one message from a would-be immigrant into slots. Reply with ONLY one JSON object, no prose, no markdown fence.',
  'SHAPE: {"occ_en":"","noc":null,"provs":[],"exp_months":null,"status":null,"claims":[{"text":"","topic":"","province":null}]}',
  'EXAMPLE IN: 我是厨师,在BC读完书还没工作,朋友说萨省两个月就下来了,找他办要收 5 万',
  'EXAMPLE OUT: {"occ_en":"cook","noc":null,"provs":["BC","SK"],"exp_months":0,"status":"graduated",'
    + '"claims":[{"text":"朋友说萨省两个月就下来了","topic":"ops","province":"SK"},'
    + '{"text":"找他办要收 5 万","topic":"other","province":"SK"}]}',
  'RULES:',
  '- claims = EVERY sentence the user attributes to someone else (中介/agent, 朋友/friend, school, consultant). Copy their wording verbatim.'
    + ' This is the field people get wrong: if the message contains 中介说 / 朋友说 / they told me / I was told, claims MUST NOT be empty.',
  // 🔴 一条主张一项:合并了,下游就只能给它一个状态 —— 而「要收 2 万」(本站没收录)和「有合作公司」
  //    (官方不公布)状态不同,揉在一起必然吞掉一个,那正是这套系统最不能出的错。
  '- ONE assertion per claim item. If one sentence carries a promise about a company AND a fee AND a timeline, that is THREE claim'
    + ' items, each with its own text and topic. Never put two assertions into one text — they get different answers.',
  '- topic: coverage = "province X wants my occupation"; thresholds = "you need N years / this score"; jobs = "there are jobs there";'
    + ' draws = "you will be picked"; ops = "it takes N months / N spots left"; ee = "go federal Express Entry";'
    + ' private-promise = a promise about private relationships (有合作公司 / 内部渠道 / 走关系 / 包过 / a partner company / inside track),'
    + ' which no government publishes;'
    + ' other = money and fees (中介要收 X 万 / they charge me), which no official source covers.',
  '- noc: fill ONLY if the user literally typed 5 digits. NEVER guess it — null is the right answer.',
  '- occ_en: the occupation alone, generic English, strip school/seniority/company ("亚岗昆木匠毕业" -> "carpenter").',
  '- provs: 2-letter codes only (ON BC AB SK MB NS NB NL PE QC), including provinces that only appear inside a claim.',
  '- exp_months: 0 if they say they have no work experience yet; null if not stated.',
  '- status: student | graduated | working | visitor | abroad | null.',
  'You only listen. Never judge, never advise, never add facts of your own.',
].join('\n')

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
    .map((c: any): SlotClaim => {
      const p = normProv(c.province)
      const text = c.text.trim().slice(0, 160)
      // 🔴 私人承诺按**原话**改判,不信模型给的 topic(chatTools 的 PRIVATE_PROMISE,**复用不重写**:
      //    两份词表迟早分叉)。为什么在这儿判:topic 是模型猜的,「中介说曼省有合作公司」它给过 ops,
      //    也给过 other —— 给 other 就绕开了 checkClaims,被编排层硬写成「本站尚未收录」,
      //    而正确的话是「政府根本不公布这种名单,所以谁承诺都没依据」。对用户来说这两句天差地别。
      //    放在 normalizeSlots 是因为这是 topic 归一的唯一入口:slots 一改,前端与下游全都一致。
      const topic = PRIVATE_PROMISE.test(text) ? 'private-promise' : normTopic(c.topic)
      return { text, topic, ...(p ? { province: p } : {}) }
    })
    .slice(0, 5)
  return { noc: /^\d{5}$/.test(nocRaw) ? nocRaw : null, occText, provs, expMonths, status, claims }
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
const CLAIM_LEAD: Record<ChatLang, [string, string, string]> = {   // [开头, 收尾, 接四态的破折号]
  zh: ['有人跟你说「', '」', '——'],
  en: ['You were told "', '"', ' — '],
  ko: ['「', '」라고 들으셨습니다', ' — '],
}
/**
 * 私人承诺的解释句 —— **见客文案的单一来源在这一层**,不在工具层。
 *
 * C1 的 `PRIVATE_PROMISE_WHY` 是中文硬编码(它那层的 `checkClaims` 签名里根本没有 lang,
 * 硬塞进去等于把语言关注点下沉到不该管它的层)。工具层给的**稳定标识**是 `topic === 'private-promise'`,
 * 见客的话由这里按用户语言出 —— 和 AVAIL_SENTENCE / LBL 一个道理。88% 是英文流量,这条尤其不能凑合。
 *
 * 这句是这个产品对中介的杀手锏:不评价对方,只说清「谁也核不了」和「为什么谁也核不了」。
 */
export const PROMISE_WHY: Record<ChatLang, string> = {
  zh: '这类主张谁也核不了:没有任何一级政府公布中介与雇主的合作名单或内部渠道,省提名只认官方条款,不认私下承诺',
  en: 'Nobody can check this: no government publishes agent-employer partner lists or inside channels, and a nomination follows the published rules, not a private promise',
  ko: '이런 주장은 누구도 확인할 수 없습니다: 중개인과 고용주의 제휴 명단이나 내부 경로를 공개하는 정부는 없으며, 주정부 지명은 공식 조항만 인정합니다',
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
    'not-collected': ['not indexed', 'has not indexed', 'not collected', 'no data on', 'not in our index'],
    'not-applicable': ['not applicable', 'outside the provincial nominee'],
  },
  ko: {
    'not-published': ['공개하지 않', '공표하지 않', '발표하지 않', '공개하는 정부는 없', '확인할 수 없'],
    'not-collected': ['수집하지 않', '수집되지 않', '색인되지 않'],
    'not-applicable': ['해당 없음', '대상이 아닙'],
  },
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
 */
type LabelDict = {
  apprOpenings: string; openPostings: string; qcOutside: string; indexNote: string; checked: string
  listIn: string; listEx: string; occList: string; officialReq: string; requires: string; claimOk: string
  pass: string; fail: string; unknown: string; short: string
  drawCut: string; drawInv: string; draws: string; opsStats: string
  eeCat: string; eeAll: string; unsaid: string
  opsKeys: Record<string, string>
  factor: Record<string, string>
}
export const LBL: Record<ChatLang, LabelDict> = {
  zh: {
    apprOpenings: '可带学徒的在招岗位', openPostings: '在招岗位', qcOutside: '(魁省不走省提名)',
    indexNote: '索引口径说明:0 表示本站当前索引里没有,不代表该省没有空缺', checked: '查询时间',
    listIn: '职业清单收录了', listEx: '职业清单排除了', occList: '职业清单', officialReq: '官方门槛', requires: '要求',
    claimOk: '这条可以拿下面的官方数字对照',
    pass: '已达标', fail: '未达标', unknown: '未判定(没拿到你的情况)', short: '还差',
    drawCut: '最近一轮抽选的最低分数线', drawInv: '最近一轮抽选发出的邀请数', draws: '抽选记录', opsStats: '运营统计',
    eeCat: '联邦 EE 通道', eeAll: '联邦 EE 通道', unsaid: '官方清单收了这个职业、但对方没提过的省',
    opsKeys: { eoi_pool_total: 'EOI 池子总人数', eoi_pool: 'EOI 池内人数', allocation: '年度提名名额', remaining: '剩余名额', nominations_ytd: '年内已提名', processing_weeks: '处理周期(周)' },
    factor: {
      language: '申请人要达到的语言等级(CLB)', languageExempt: '可豁免语言的等级(申请人)',
      experience: '申请人要有的工作经验', income: '申请人家庭要有的收入', wage: '这份工作至少要给到的工资',
      empYears: '雇主(不是申请人)已经营的年限', empRevenue: '雇主(不是申请人)的年营业额', empStaff: '雇主(不是申请人)的员工数',
    },
  },
  en: {
    apprOpenings: 'apprentice-friendly openings', openPostings: 'open postings', qcOutside: '(QC is outside PNP)',
    indexNote: 'index note: 0 means nothing in our index right now, not that the province has none', checked: 'checked',
    listIn: 'occupation list includes', listEx: 'occupation list EXCLUDES', occList: 'occupation list', officialReq: 'official requirements', requires: 'requires',
    claimOk: 'we do have official numbers to check this against, see the figures below',
    pass: 'met', fail: 'not met', unknown: 'not judged (your situation not given)', short: 'short by',
    drawCut: 'latest draw cutoff', drawInv: 'invitations in the latest draw', draws: 'draw history', opsStats: 'operational stats',
    eeCat: 'federal EE category', eeAll: 'federal EE categories',
    // 这句会被整句抄进答复,写成能直接当句子用的形状(旧版「provinces whose … but nobody mentioned」抄出来不成句)
    unsaid: 'other provinces whose official lists also cover this occupation, which nobody mentioned',
    opsKeys: { eoi_pool_total: 'people in the EOI pool (total)', eoi_pool: 'people in the EOI pool', allocation: 'yearly nomination allocation', remaining: 'allocation left', nominations_ytd: 'nominations so far this year', processing_weeks: 'processing time (weeks)' },
    factor: {
      language: 'the applicant to reach this language level (CLB)', languageExempt: 'this language level for the applicant to be exempt',
      experience: 'the applicant to have this much work experience', income: 'the applicant to have this household income',
      wage: 'the job to pay at least this wage', empYears: 'the employer (not the applicant) to have been in business this long',
      empRevenue: 'the employer (not the applicant) to have at least this annual revenue', empStaff: 'the employer (not the applicant) to have at least this many staff',
    },
  },
  ko: {
    apprOpenings: '견습 가능 채용 공고', openPostings: '채용 공고', qcOutside: '(퀘벡은 주정부 이민 대상 아님)',
    indexNote: '색인 안내: 0은 현재 본 사이트 색인에 없다는 뜻이며 해당 주에 공석이 없다는 뜻이 아닙니다', checked: '조회 시각',
    listIn: '직업 목록에 포함됨', listEx: '직업 목록에서 제외됨', occList: '직업 목록', officialReq: '공식 요건', requires: '요건',
    claimOk: '이 건은 아래 공식 수치와 대조할 수 있습니다',
    pass: '충족', fail: '미충족', unknown: '판정 불가(본인 상황 미제공)', short: '부족분',
    drawCut: '최근 추첨 커트라인', drawInv: '최근 추첨 초청 건수', draws: '추첨 기록', opsStats: '운영 통계',
    eeCat: '연방 EE 카테고리', eeAll: '연방 EE 카테고리', unsaid: '공식 목록에 이 직업이 있으나 상대가 말하지 않은 주',
    opsKeys: { eoi_pool_total: 'EOI 풀 전체 인원', eoi_pool: 'EOI 풀 인원', allocation: '연간 지명 배정', remaining: '남은 배정', nominations_ytd: '올해 누적 지명', processing_weeks: '처리 기간(주)' },
    factor: {
      language: '신청인이 도달해야 할 언어 등급(CLB)', languageExempt: '언어 면제 기준 등급(신청인)',
      experience: '신청인에게 필요한 경력', income: '신청인 가구 소득', wage: '이 일자리가 지급해야 할 최저 임금',
      empYears: '고용주(신청인 아님)의 사업 운영 기간', empRevenue: '고용주(신청인 아님)의 연 매출', empStaff: '고용주(신청인 아님)의 직원 수',
    },
  },
}

const fact = (tool: string, label: string, value: number | null, valueText: string, unit: string, ev: { url: string; fetched: string }): Fact => ({
  tool, label: label.slice(0, 320), value, valueText: valueText.slice(0, 110), unit, evidence: { url: ev.url, fetched: ev.fetched },
})
/** 四态成句 + 官方原文摘要一起带走:摘要跟着 valueText 截到 110 字,够模型分清「不公布」和「没收录」,又不吃光 prompt 预算。 */
const statusFact = (tool: string, label: string, av: Availability, note: string, url: string, lang: ChatLang) =>
  fact(tool, label, null, `${AVAIL_SENTENCE[lang][av]}${note ? ` — ${note}` : ''}`, 'status', { url, fetched: '' })

/**
 * 剧本(设计 §四):`expMonths === 0` 必加学徒岗计数;有 claims 必调 checkClaims。
 * 顺序即优先级 —— 超预算时从尾巴砍,砍掉的是补充信号不是主线。
 * `lang`:四态在这一层就写成用户语言的成句(AVAIL_SENTENCE),模型只照抄不翻译。
 */
export async function collectFacts(
  pool: any, slots: Slots & { noc: string }, teerHint?: number | null, lang: ChatLang = 'en',
): Promise<{ facts: Fact[]; teer: number | null; title: string }> {
  const { noc } = slots
  const zeroExp = slots.expMonths === 0
  const provs = slots.provs.filter((p) => p !== 'QC')
  const checkable = slots.claims.filter((c) => c.topic !== 'other')
  const [jobs, coverage, thresholds, ee, claims] = await Promise.all([
    lookupJobs(pool, { noc, apprentice: zeroExp }),
    lookupCoverage(pool, { noc }),
    lookupThresholds(pool, {
      noc, teer: teerHint, provs: provs.length ? provs : undefined,
      profile: slots.expMonths == null ? undefined : { totalExpMonths: slots.expMonths, ...(zeroExp ? { canadianExpMonths: 0 } : {}) },
    }),
    lookupEE(pool, { noc }),
    // 只要有人跟他说过话就调:**第三格「他没提的省」不依赖主张能不能核**(它算的是全九省覆盖)。
    // 原来按 checkable.length 开关 —— 一旦主张全落 'other'(收费类),第三格整个消失,
    // 而那格恰恰是这个产品的杀手锏(中介只会说他有渠道的那个省)。
    slots.claims.length ? checkClaims(pool, { noc, teer: teerHint, claims: checkable as Claim[] }) : Promise.resolve(null),
  ])
  const [draws, ops, named] = await Promise.all([
    Promise.all(provs.slice(0, 3).map((p) => lookupDraws(pool, { prov: p, limit: 1 }))),
    Promise.all(provs.slice(0, 3).map((p) => lookupOps(pool, { prov: p }))),
    // 点名过的省即使一个岗都没有也必须出现在 facts 里(C1 契约:「0 也得让他看见」)——
    // apprentice=true 会把 0 的省过滤掉,金标里「曼省 3 个,全国垫底」恰恰要的就是那个小数字。
    Promise.all(slots.provs.slice(0, 3).map((p) => lookupJobs(pool, { noc, prov: p }))),
  ])

  const out: Fact[] = []
  // ① 在招岗位(0 经验时按学徒岗排;这是剧本里的第一句话「缺的不是选省,是第一份算数的岗」)
  const T = LBL[lang]
  const jobKind = zeroExp ? T.apprOpenings : T.openPostings
  const jobRows = [...named.flatMap((j) => j.rows), ...jobs.rows]
    .filter((r, i, a) => a.findIndex((x) => x.province === r.province) === i)   // 点名省在前,去重
    .slice(0, 8)
  for (const r of jobRows) {
    // QC 不属 PNP:数字照给(职位板真有这些岗),但标签自带这句,免得答复把它当成一条省提名路
    const qc = r.province === 'QC' ? ` ${T.qcOutside}` : ''
    out.push(fact('lookupJobs', `${r.province} ${jobKind} (NOC ${noc})${qc}`, zeroExp ? r.apprentice : r.open, '', 'jobs', r.evidence))
  }
  if (jobs.rows.length) out.push(fact('lookupJobs', T.indexNote, null, `${T.checked} ${jobs.checkedAt.slice(0, 10)}`, 'note', { url: '/', fetched: jobs.checkedAt }))
  // ② 省清单命中/四态
  for (const c of coverage.provinces) {
    if (c.hits.length) {
      for (const h of c.hits.slice(0, 2)) {
        // h.label 是库里的中文显示名(「MB 在需职业」);官方原名 h.stream 本身就是英文,en/ko 有它就够了
        out.push(fact('lookupCoverage', `${c.province} ${h.type === 'ineligible' ? T.listEx : T.listIn} NOC ${noc}: ${h.stream}`, null, zhOnly(h.label, lang), 'list', h.evidence))
      }
    } else if (slots.provs.includes(c.province)) {
      out.push(statusFact('lookupCoverage', `${c.province} ${T.occList}`, c.availability, zhOnly(c.note, lang), c.hits[0]?.evidence.url ?? '', lang))
    }
  }
  // ③ 官方门槛(只摆被点名省的;need 是官方数,verdict 出自 rules.ts,本层不改)
  for (const p of thresholds.provinces) {
    if (p.availability !== 'ok') { out.push(statusFact('lookupThresholds', `${p.province} ${T.officialReq}`, p.availability, zhOnly(p.note, lang), '', lang)); continue }
    for (const r of p.rows.filter((x) => x.need != null).slice(0, 4)) {
      // verdict/short 也是内部速记(verdict= 在泄露词表里),同样在这一层就换成人话
      const v = T[r.verdict as 'pass' | 'fail' | 'unknown'] ?? ''
      out.push(fact('lookupThresholds', `${p.province} ${T.requires}: ${T.factor[r.factor] ?? r.factor}`, r.need,
        `${v}${r.short != null ? `,${T.short} ${r.short}` : ''}`, r.unit, r.evidence))
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
  // ⑦ 中介对账三分法(他说的 / 核不了的 / 他没提的)
  //    label 直接写成**一句能照抄的话**:「别人跟他说的:「原话」→ 官方不公布这项数据(不是本站没查到)」。
  //    只把四态塞进 valueText 是不够的 —— 实测模型会把两条状态不同的主张并成一句(「关于收 2 万及所谓
  //    合作公司的说法,本站未收集此类数据」),把「官方不公布」整个吞掉。一条主张一句成品,它才照抄不合并。
  const [lead, close, dash] = CLAIM_LEAD[lang]
  // 引原话最多 60 字:后面还要接四态成句 + 解释句(英文那句 160 字),原话不封顶会把解释句挤出 label 上限
  const quote = (t: string) => (t.length > 60 ? `${t.slice(0, 60)}…` : t)
  // 只剩「本站真没有这类数据」的(中介收费这种)。私人承诺已在 normalizeSlots 按原话改判进 C1 的
  // private-promise 桶,答的是「政府根本不公布这种名单」——别让它掉回这条「尚未收录」的路。
  for (const c of slots.claims.filter((x) => x.topic === 'other')) {
    out.push(fact('checkClaims', `${lead}${quote(c.text)}${close}${dash}${AVAIL_SENTENCE[lang]['not-collected']}`, null,
      '', 'claim', { url: '/', fetched: '' }))
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
      const sep = lang === 'en' ? '. ' : '。'
      const isPromise = c.claim.topic === 'private-promise' || PRIVATE_PROMISE.test(c.claim.text || '')
      const why = zhOnly(c.why, lang).trim()
      const tail = isPromise ? `${sep}${PROMISE_WHY[lang]}` : (why && why.length <= 80 ? `${sep}${why}` : '')
      out.push(fact('checkClaims', `${lead}${quote(c.claim.text)}${close}${state}${tail}`, null, zhOnly(c.why, lang), 'claim',
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
const factLine = (f: Fact, lang: ChatLang) => {
  const u = f.value != null ? unitText(f.unit, lang) : ''
  return `- ${f.label} = ${f.value != null ? f.value : '-'}${u ? ` ${u}` : ''}${f.valueText ? ` | ${f.valueText}` : ''}`
}

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

const PLAYBOOK_ZERO_EXP =
  'PLAYBOOK (this outranks the order of FACTS): this person has zero work experience. Your FIRST two sentences must say that '
  + 'what they are missing is not a province but a first job that counts, and must quote the apprentice-friendly opening counts '
  + 'from FACTS — the province they asked about AND the provinces with the most. Only after that discuss lists, draws or programs. '
  + 'An experience requirement is a matter of TIMING, not eligibility: say how many months short they are and where the work counts. '
  + 'NEVER phrase it as "you do not qualify" or "you fail".'
const PLAYBOOK_CLAIMS =
  'PLAYBOOK: a third party told them something. Answer in three buckets: what the official data confirms or contradicts, '
  + 'what cannot be checked and WHY (not published vs not indexed), and which provinces that person never mentioned. '
  + 'Each claim gets its own sentence carrying its own state sentence from FACTS — never one sentence for two claims.'

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
  opts: { zeroExp: boolean; hasClaims: boolean; occ: string; forbid?: string[]; banned?: string[]; history?: ChatTurn[] },
): ChatMessage[] {
  const L = LANG_NAME[lang]
  const system = [
    'You write the reply for an immigration job board. You never decide, rank, score or compute.',
    `RULE 1 (hard): every number you write MUST appear verbatim in FACTS or in the QUESTION. Do not add up, average, convert or `
      + 'estimate anything — a number you computed yourself is a lie here. That includes re-notating a number the reader wrote: if they '
      + 'typed 2 万, write 2 万, never 20,000.',
    // ⚠️ 这条只管序数。别让它蔓延到数量:模型会写「曼省有三份」,而 guard 只认阿拉伯数字 —— 中文数字
    //    是它的盲区,写成「八份」照样放行(2026-08-04 实测)。数量一律阿拉伯数字,guard 才管得着。
    'RULE 2: write ordinals and step words as words (first, second) — but every QUANTITY taken from FACTS must be '
      + 'written in Arabic digits exactly as FACTS has it (3, 15, 477), never spelled out in words.',
    // ② 语义要留、代码要走:四态是我们的内部枚举,读者看不懂 NOT-PUBLISHED,但「不公布」和「没收录」的区别一步都不能少
    // ② + 状态合并回归:句子已经在数据层写好了,模型只许照抄,一句只能盖一条主张
    `RULE 3 (hard): each FACTS line that has no number already carries its state as a finished sentence in ${L}. Copy that sentence `
      + 'for that line — do not translate it, do not shorten it, do not drop the part in brackets. Two different state sentences may '
      + 'NEVER be covered by one sentence of yours: "the government does not publish this" and "our site has not indexed this yet" are '
      + 'different facts, and merging them is a lie. Give each claim its own sentence with its own state. Never print an internal code '
      + '(NOT-PUBLISHED, NOT-COLLECTED, N-A, INDEX SCOPE) or a field name (availability, evidence, verdict, scope, tool names), and '
      + 'never merge any state into "there is none".',
    'RULE 4: do not name programs, provinces, requirements, fees or dates that are not in FACTS, and do not give legal '
      + 'or regulatory statements ("the law forbids X") — if FACTS does not say it, you do not say it.',
    'RULE 5: plain sentences only. No markdown, no headings, no bold, no bullet list, no tables, no URLs. '
      + 'FACTS lines are unnumbered — never refer to "fact number N" and never repeat the two-letter tags as codes the reader must decode.',
    // ① 语言纯度(手法照 api/advisor 的建议行那条:专名保留 + 其余一律目标语,不重造)
    `RULE 6 (hard): write EVERY word in ${L}. FACTS are English shorthand — never paste a FACTS line, a FACTS label or a FACTS `
      + 'unit word (jobs, openings, postings, years, months, weeks, days, points, people, invitations, spots, cutoff, latest, requires) '
      + `into the reply; say each of those in ${L}. Only two things may stay in English: the official name of a programme or list `
      + `(e.g. MPNP In-Demand Occupations List), which must be followed at once by a short gloss in ${L}; and the abbreviations `
      + 'PNP, EE, CRS, CLB, NOC, TEER, LMIA plus two-letter province codes. Keep the subject straight: a requirement on THE EMPLOYER '
      + 'is not a requirement on the applicant.',
    // ③ 上游忽略 max_tokens(friendLlm 顶部实测记录)→ 长度只能靠这条 + 出口截断
    `RULE 7 (hard): at most ${LEN_CAP[lang]} characters and at most eight sentences. Everything past that is cut off before the reader `
      + 'sees it, so lead with the facts that matter and drop the rest. Never restate a number you already gave, and never write a '
      + 'closing summary sentence.',
    // ④ 没有 fact 撑腰的政策断言:数字 guard 拦不住,但错了一样赔信任
    'RULE 8 (hard): you may say only three kinds of thing — (a) restate a FACTS line in your own words, (b) state plainly that FACTS '
      + 'does not cover something, (c) state that a claim cannot be checked and why. You may NOT generalise ("usually", "in general", '
      + '"most provinces"), rate competition or difficulty, estimate a chance, a wait or a probability, predict any outcome, describe '
      + 'what governments, agents, schools or employers normally do, or tell the reader to hurry, pay, refuse, move or study more. '
      + 'If a sentence would come from your own knowledge rather than a FACTS line, delete it.',
    opts.zeroExp ? PLAYBOOK_ZERO_EXP : '',
    opts.hasClaims ? PLAYBOOK_CLAIMS : '',
    opts.forbid?.length
      ? `You already broke RULE 1 once. These numbers are NOT in FACTS and are BANNED from your reply: ${opts.forbid.join(', ')}. Rewrite without them.`
      : '',
    opts.banned?.length
      ? `You already broke RULE 3 or RULE 6 once. These exact strings must NOT appear anywhere in your reply: ${opts.banned.join(', ')}. `
        + `They are internal codes or English shorthand — write what they mean in ${L}.`
      : '',
  ].filter(Boolean).join('\n')
  const hist = (opts.history ?? []).slice(-2).map((h) => `${h.role}: ${h.content.slice(0, 200)}`).join('\n')
  // 主张行单独拎出来放头部,FACTS 里就不再重复(省 prompt 预算,也免得模型两处各抄一遍)
  // 只给成品句,不带 valueText 的 why:why 是工具层的取证注(常常在讲另一个指标,如「MB 不发处理时长统计」),
  // 抄进答复既长又答非所问。它照旧留在 Fact 里给前端出处用。
  const claimLines = facts.filter((f) => f.unit === 'claim').map((f) => `- ${f.label}`)
  const rest = facts.filter((f) => f.unit !== 'claim')
  const budget = PROMPT_BUDGET - userText.length - hist.length - claimLines.join('').length - 900
  // ⚠️⚠️ **头 2000 字符定生死**(2026-08-04 实测,见 friendLlm.ts 顶部):朋友服务按 prompt 的**前 ~2000 字符**
  // 做缓存键。所以凡是「必须让这次调用区别于上次」的东西 —— 用户原话、重试黑名单、语言与长度 ——
  // 一律钉在最前面;写在尾巴上的指令只要前缀没变,回来的就是上一次那段答复(三条尾部规则实测**零效果**,
  // 语言那条写在头上立刻生效)。FACTS 与收尾提醒才放后面。
  const user = [
    `REPLY LANGUAGE: ${L}. LENGTH: at most ${LEN_CAP[lang]} characters, at most eight sentences.`,
    `QUESTION: ${userText}`,                       // 用户原话必须进缓存键,否则两个人可能拿到同一段答复
    `DATA TAG: ${factsFingerprint(facts)} — internal, never write it in the reply.`,
    // 重试黑名单同理:写在尾巴上等于没写(会原样拿回上一次那段违规答复)
    opts.forbid?.length ? `BANNED NUMBERS (not in FACTS, rewrite without them): ${opts.forbid.join(', ')}` : '',
    opts.banned?.length ? `BANNED STRINGS (internal codes / English shorthand, say them in ${L} instead): ${opts.banned.join(', ')}` : '',
    // 「说什么、按什么顺序」是数据层的决定,不是模型的:600 字放不下全部 facts,谁先谁后由剧本定死,
    // 否则模型会把八个省各写一句、把清单命中挤掉(2026-08-04 实测过一次)
    `COVER, in this order, one sentence each: ${[
      opts.zeroExp ? 'the apprentice-friendly count for the province they asked about plus at most two other provinces, all in ONE sentence (never one sentence per province)' : '',
      `every occupation-list hit in FACTS for the provinces they named, giving the official list name in English followed by its short gloss from FACTS in ${L}`,
      'the official requirement lines, saying who each one is about',
      opts.hasClaims ? 'each claim separately, each carrying its own state sentence from FACTS' : '',
      'the federal category line',
    ].filter(Boolean).map((x, i) => `(${i + 1}) ${x}`).join('; ')}. Nothing else — no index-scope plumbing, no closing note, no closing advice.`,
    `Never write any of these words: ${HEDGE_WORDS[lang].join(' / ')}.`,
    // 主张行提到**头部**:① 它是这个产品的差异点,不能被 600 字挤掉;② 前 ~2000 字符才进缓存键;
    // ③ 每行本身已经是一句成品话,放在这里模型才会一条一句地抄,不再把两条状态不同的揉成一句。
    claimLines.length
      ? `CLAIM LINES — copy each one as its OWN separate sentence, word for word. Never merge two of them into one `
        + 'sentence and never swap their wording: they carry different states and merging them is a lie.\n'
        + claimLines.join('\n')
      : '',
    `OCCUPATION: ${opts.occ}`,
    hist ? `EARLIER:\n${hist}` : '',
    `FACTS (the only numbers you may use):\n${factsBlock(rest, Math.max(600, budget), lang)}`,
    `Write the reply now, entirely in ${L}, at most ${LEN_CAP[lang]} characters. Plain sentences, no headings, no internal codes, `
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

/** 模型总爱加粗和小标题(RULE 5 求不动)——回来自己剥掉,比在 prompt 里反复求它便宜。只删记号不动数字。 */
export const tidy = (s: string) => s.replace(/\*\*/g, '').replace(/^[ \t]*#{1,6}[ \t]*/gm, '').replace(/\n{3,}/g, '\n\n').trim()

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
  const parts = s.split(/(?<=[。！？；!?;\n])/).filter((p) => p.trim())
  const dropped: string[] = []
  while (parts.length > 1 && dropped.length < 2) {
    const last = parts[parts.length - 1]
    if (/\d/.test(last) || !findHedges(last, lang).length) break
    if (parts.slice(0, -1).join('').trim().length < 40) break        // 砍到只剩个开头就停(宁可留着)
    dropped.push(parts.pop()!.trim())
  }
  return { text: parts.join('').trim() || s.trim(), dropped }
}

// ── ✂️ 出口截断:朋友服务不收长度参数(friendLlm 顶部实测),长度只能回来自己收 ──
const LEN_CAP: Record<ChatLang, number> = { zh: 600, ko: 700, en: 1400 }
/** 按句截断:宁可少说一句,不许留半句。整句都塞不下才硬切(极端情况)。 */
export function clampAnswer(s: string, lang: ChatLang, cap = LEN_CAP[lang]): string {
  const t = s.trim()
  if (t.length <= cap) return t
  // 句末标点(中/日全角 。!?; + ASCII .!?; + 换行);ASCII 的 `.` 必须后跟空白才算句末,否则「3.6」会被劈开
  const parts = t.split(/(?<=[。！？；!?;\n])|(?<=\.)(?=\s)/)
  let out = ''
  for (const p of parts) {
    if (out.length + p.length > cap) break
    out += p
  }
  return out.trim() || t.slice(0, cap).trim()
}

const SHEET_HEAD: Record<ChatLang, string> = {
  zh: '模型这次没能守住「只用查到的数字」这条线,所以直接给你查到的原始事实(每条都带官方出处):',
  en: 'The writer could not stay inside the retrieved numbers this time, so here are the raw facts we looked up, each with its official source:',
  ko: '이번에는 조회된 숫자만 사용하지 못했기에, 확인된 원자료를 출처와 함께 그대로 드립니다:',
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
/** 降级:宁可给一张能溯源的事实清单,也不给一句编出来的话。 */
export function factSheet(facts: Fact[], lang: ChatLang): string {
  const lines = facts.slice(0, 20).map((f) => {
    const u = f.value != null ? unitText(f.unit, lang) : ''
    const v = f.value != null ? `${f.value}${u ? ` ${u}` : ''}` : f.valueText
    return v ? `- ${f.label}: ${v}` : `- ${f.label}`     // 主张行本身已是一句完整的话,别再甩个「: -」
  })
  return localizeUnits(dropCodes([SHEET_HEAD[lang], ...lines].join('\n'), lang), lang)
}

// ── 追问建议(不过模型:一个数字都不带,不需要 guard)──────────────────────────
const FOLLOWUPS: Record<ChatLang, string[]> = {
  zh: ['被抽中的概率大概是多少?', '这些岗位要求什么证书?', '别的省对我这个职业怎么算?'],
  en: ['What are my odds of being picked?', 'What certification do these jobs ask for?', 'How do the other provinces treat my occupation?'],
  ko: ['선발될 확률은 얼마나 되나요?', '이 일자리들은 어떤 자격증을 요구하나요?', '다른 주는 제 직업을 어떻게 보나요?'],
}

// ── 主流程 ──────────────────────────────────────────────────────────────────

export async function orchestrate(
  rawPool: any, input: { text: string; lang: ChatLang; history?: ChatTurn[] },
): Promise<ChatResult> {
  const text = (input.text || '').trim().slice(0, MAX_TEXT)
  const lang: ChatLang = (['zh', 'en', 'ko'] as const).includes(input.lang) ? input.lang : 'en'
  if (text.length < MIN_TEXT) throw new ChatError('tooShort', 'input too short')
  const pool = memoPool(rawPool)

  // ① 抽槽位
  let raw: string
  try {
    const hist = (input.history ?? []).slice(-2).map((h) => `${h.role}: ${h.content.slice(0, 200)}`).join('\n')
    raw = await completeText([
      { role: 'system', content: SLOT_SYSTEM },
      { role: 'user', content: (hist ? `EARLIER:\n${hist}\n\nNOW: ` : '') + text },
    ], { maxTokens: 400, provider: 'friend' })
  } catch (e) {
    throw new ChatError('llm', e instanceof LlmError ? e.message : String(e))
  }
  const parsed = parseLlmJson(raw)
  if (!parsed) throw new ChatError('llm', `slot parse failed: ${raw.slice(0, 160)}`)
  const draft = normalizeSlots(parsed)

  // ② 职名 → 5 位 NOC(拿不到就反问,绝不猜)
  const hit = draft.noc ? { noc: draft.noc, title: '' } : await resolveNoc(pool, draft.occText)
  if (!hit) throw new ChatError('noOcc', 'occupation not resolved', { ...draft, noc: null })
  const slots: Slots & { noc: string } = { ...draft, noc: hit.noc, occText: draft.occText || hit.title }

  // ③ 调工具 → Fact[]
  const { facts, title } = await collectFacts(pool, slots, null, lang)
  const occ = `${title || hit.title || slots.occText} (NOC ${slots.noc})`

  // ④ 合成 + 出口校验(违规重试一次,再违规降级成事实清单)
  //    三道硬拦:数字溯源(guard) / 内部码泄露(findLeaks) / 中韩答复里的英文速记(findEnglishUnits);
  //    一道留痕:推断性措辞(findHedges)—— 只报警不拦,误杀正常表述比漏一句更贵。
  const opts = { zeroExp: slots.expMonths === 0, hasClaims: slots.claims.length > 0, occ, history: input.history }
  let answer = ''
  let bad: string[] = []
  let banned: string[] = []
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw2 = await completeText(
        synthMessages(facts, text, lang, { ...opts, ...(attempt ? { forbid: bad, banned } : {}) }),
        { maxTokens: 900, provider: 'friend' },   // ⚠️ friend 上游忽略长度参数(friendLlm 顶部实测)→ 真正管长度的是 RULE 7 + clampAnswer
      )
      const cleaned = dropTrailingHedge(clampAnswer(localizeUnits(tidy(raw2), lang), lang), lang)
      if (cleaned.dropped.length) console.log(`[chat] dropped trailing advice noc=${slots.noc} sentences=${JSON.stringify(cleaned.dropped)}`)
      answer = cleaned.text
    } catch (e) {
      if (attempt === 0 && facts.length) { answer = ''; bad = []; break }   // 合成掉线:facts 还在,直接降级
      throw new ChatError('llm', e instanceof LlmError ? e.message : String(e))
    }
    const g = guardAnswer(answer, facts, text)
    const leaks = findLeaks(answer)
    const units = [...findEnglishUnits(answer, lang, facts), ...findWordNumbers(answer, lang), ...findForeignScript(answer, lang)]
    const hedges = findHedges(answer, lang)
    if (hedges.length) console.log(`[chat] hedge warn noc=${slots.noc} words=${hedges.join(',')}`)
    const merged = findMergedStates(answer, facts, lang)
    if (merged.length) console.log(`[chat] state-merge warn noc=${slots.noc} ${merged.join(' | ')}`)
    if (g.ok && !leaks.length && !units.length) { bad = []; banned = []; break }
    bad = g.bad
    banned = [...leaks, ...units].slice(0, 10)
    console.log(`[chat] exit-check hit attempt=${attempt + 1} noc=${slots.noc} nums=${g.bad.join(',')} strings=${banned.join(',')} answer=${answer.slice(0, 200)}`)
  }
  if (bad.length || banned.length || !answer) {
    if (!facts.length) throw new ChatError('guard', 'no facts to fall back on', slots)
    console.log(`[chat] degraded to fact sheet noc=${slots.noc} facts=${facts.length} bad=${bad.join(',')}`)
    answer = factSheet(facts, lang)
    // 🔴 降级分支**必须过同一道出口检查**,否则它就是所有红线的后门(2026-08-04:兜底把英文内部标签
    //    `apprentice-friendly openings…` / `index scope note` 直接吐给了用户)。
    //    这里是我们自己写的字,查出问题 = 代码 bug,不是模型违规 —— 所以不重试、不再降级,响亮报错留痕。
    const sheetBad = [
      ...findLeaks(answer), ...findEnglishUnits(answer, lang, facts), ...findWordNumbers(answer, lang),
      ...findForeignScript(answer, lang), ...findMergedStates(answer, facts, lang), ...findHedges(answer, lang),
    ]
    if (sheetBad.length) console.error(`[chat] 🔴 FACT SHEET LEAKS (数据层 label 没本地化) noc=${slots.noc} lang=${lang} bad=${sheetBad.join(',')}`)
  }
  return { answer, slots, facts, followups: FOLLOWUPS[lang] }
}
