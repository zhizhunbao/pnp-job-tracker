// 第一步「听懂」:把用户一句话抽成槽位;以及「说了专业但没说职位名」的消歧。
//
// 模型在这一层只做听懂,**不许下任何结论**(结论归 facts/guards)。
// 消歧那半边的理由:专业名(如「计算机」)不是能直接查的职业,但它**不许是死路** ——
// 给候选让用户点,比让他重说一遍强。
import { PRIVATE_PROMISE } from './tools'
import { EDU_KEYS, type EduKey } from '../pnpSelfScore'
import { ASK_OCC, type Lang, META_ANSWER, OCC_PICK, USAGE_ASK, USAGE_WHAT } from '../i18n'
import * as SQL from '../db/sql'
import { isSelfStatement } from './federal'
import { normProv, normTopic } from './normalize'
import { MAX_TEXT } from './steps'
import type { ChatResult, SlotClaim, Slots } from './types'

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
export const numSlot = (raw: unknown, lo: number, hi: number, round = true): number | null => {
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
      // 🔴 私人承诺按**原话**改判,不信模型给的 topic(tools.ts 的 PRIVATE_PROMISE,**复用不重写**:
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
    SQL.NOC_BY_TITLE_SIMILARITY, [q]).catch(() => ({ rows: [] }))
  let noc = String(rows[0]?.noc ?? '')
  if (!/^\d{5}$/.test(noc)) {
    // 兜底:官方 NOC 类名(在招岗位里没这个工种时仍能认出来,如冷门职业)
    const { rows: d } = await pool.query(
      SQL.NOC_BY_DESC_SIMILARITY, [q],
    ).catch(() => ({ rows: [] }))
    noc = String(d[0]?.noc ?? '')
  }
  if (!/^\d{5}$/.test(noc)) return null
  const { rows: t } = await pool.query(SQL.NOC_TITLE_BY_CODE, [noc]).catch(() => ({ rows: [] }))
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
export async function suggestOccupations(pool: any, field: string, lang: Lang, limit = 3): Promise<OccOption[]> {
  const term = fieldSearchTerm(field)
  if (term.length < 3) return []
  const run = async (q: string) => {
    const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`
    const { rows } = await pool.query(
      SQL.NOC_LIST_WITH_TITLES, [like, limit + 2]).catch(() => ({ rows: [] }))
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
export const askOccupation = (field: string, opts: OccOption[], lang: Lang): ChatResult => ({
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

export type UsageTopic = 'lmia' | 'aip' | 'employer'
const usageTopicOf = (text: string): UsageTopic =>
  (/LMIA/i.test(text) ? 'lmia' : /\bAIP\b/i.test(text) ? 'aip' : 'employer')
/**
 * 用法类问句的 guide 型答复:形态照 askOccupation(自己写死的话 + 空 facts + 不进模型),
 * **不是**一条新的答复形态。slots 原样带出去(省份/身份这些他已经说过的,下一轮 context 还接得住),
 * 但 noc 一定是 null —— 这一轮确实没认出职业,不许在这儿假装认出来了。
 */
export const answerUsage = (text: string, lang: Lang, slots: Omit<Slots, 'noc'> & { noc: string | null }): ChatResult => ({
  answer: `${USAGE_WHAT[lang][usageTopicOf(text)]}${lang === 'en' ? ' ' : ''}${USAGE_ASK[lang]}`,
  slots: { ...slots, noc: null },
  facts: [],
  followups: [],
})

/**
 * 🔴 **问本站自己的话也不该被 noOcc 怼回去**(2026-08-10;chat_logs #160 实录:
 * 「为什么没有选项给我」回了「说说你做的是什么工作,才查得到」—— 他问的是界面,答的是职业)。
 * 和 isUsageQuestion 是同一类东西、不同主语:那条问的是**我们的表**,这条问的是**我们这个对话**。
 *
 * 口子只开三格,一格一条写死的话,不放开自由闲聊:
 *   ① options    没给我选项 / 选项呢
 *   ② capability 你能做什么 / 你能帮我什么
 *   ③ howto      怎么用 / 该怎么问 / 怎么开始
 * 全库 157 轮留痕里**一条真闲聊都没有**(你好/谢谢/你是谁一次没出现,`???` 这类由 tooShort 接住),
 * 所以不为它建分支 —— 真来了照旧走 noOcc 反问,那句反问对闲聊本来就是对的。
 *
 * 判据同样是主语 + 意图两半都要中,且位置在 isUsageQuestion **之后**:
 * 「LMIA 这张表怎么用」主语是表,该走 usage 那份带数据口径的文案,不该落到这儿来。
 */
export type MetaTopic = 'options' | 'capability' | 'howto'
const META_RE: Record<MetaTopic, RegExp> = {
  // 「没有/不给…选项」与「选项…呢/去哪了」两种语序都算;英文 no/where + options/buttons/suggestions
  options: /(?:没有|沒有|没给|沒給|不给|不出|看不到).{0,8}(?:选项|選項|按钮|按鈕|可点的|推荐问题)|(?:选项|選項|按钮|按鈕).{0,6}(?:呢|哪去了|去哪了|不见了|没了)|\b(?:no|where are|where'?s)\b.{0,16}\b(?:options?|buttons?|suggestions?|choices?)\b|선택지.{0,8}(?:없|안 )/i,
  capability: /(?:你|你们|你們|本站|这里|這裡|这个网站|這個網站|这个工具|這個工具).{0,10}(?:能|可以|会|會).{0,6}(?:做什么|做啥|干什么|幹什麼|干嘛|幫我什么|帮我什么|查什么|查啥|回答什么|提供什么)|你(?:是谁|是誰|能干嘛|会什么|會什麼)|\bwhat can (?:you|this|it)\b|\bwhat do you do\b|\bhow can you help\b|\bwhat are you\b|무엇을 (?:할|해)|뭘 할 수|어떤 도움(?:을|이)/i,
  howto: /怎么用|怎麼用|如何使用|怎么问|怎麼問|该问什么|該問什麼|怎么开始|怎麼開始|从哪开始|從哪開始|\bhow (?:do|should) i (?:use|start|ask|begin)\b|\bhow does this work\b|\bwhere do i start\b|어떻게 (?:쓰|사용|시작|물어|질문)/i,
}
/** 这句话在问「你这个对话本身怎么回事」吗(纯函数,不问模型;命中返回哪一格,没中返回 null)。 */
export const metaTopicOf = (text: string): MetaTopic | null => {
  const s = (text || '').trim()
  if (!s) return null
  return (Object.keys(META_RE) as MetaTopic[]).find((k) => META_RE[k].test(s)) ?? null
}

/** 形态照 answerUsage 一字不差:写死的话 + 空 facts + 不进模型 + noc 一定是 null。 */
export const answerMeta = (topic: MetaTopic, lang: Lang, slots: Omit<Slots, 'noc'> & { noc: string | null }): ChatResult => ({
  answer: META_ANSWER[lang][topic],
  slots: { ...slots, noc: null },
  facts: [],
  followups: [],
})
