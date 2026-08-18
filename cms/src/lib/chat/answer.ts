// 第三步「说人话」:把 facts 合成答复 —— 模型只负责措辞,不负责数字。
//
// 与 guards.ts 的分界:这边生成,那边把关;两边共用的词表与上限在 wording.ts。
import { type ChatMessage } from '../llm'
import { type Lang } from '../i18n'
import { type FederalRuleProgram, LANG_NAME } from './federal'
import { normProv } from './normalize'
import { mergeFollowupSlots, normalizeSlots, numSlot } from './slots'
import { PROMPT_BUDGET } from './steps'
import type { ChatTurn, Fact, Slots } from './types'
import { HEDGE_WORDS, LEN_CAP, SENT_CAP, unitText } from './wording'

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
export function sayFact(f: Fact, lang: Lang, opts: { brief?: boolean } = {}): string {
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
const factLine = (f: Fact, lang: Lang) => `- ${sayFact(f, lang)}`

/** facts → 紧凑文本(预算内逐条塞,塞不下就停;尾部优先级最低,砍掉不影响主线)。 */
export function factsBlock(facts: Fact[], budget = PROMPT_BUDGET, lang: Lang = 'en'): string {
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

/** PGWP 多课程时长题：按用户拿来对照的 GPT 结构——结论先行、理由、条件、唯一风险点；不倾倒整张规则表。 */
const PLAYBOOK_PGWP_COMBINE =
  'PLAYBOOK (PGWP multiple-program duration; this outranks RULE 0b, RULE 9 and the order of FACTS): '
  + 'sentence one must answer yes or no immediately. When FACTS contains both the rule that eligible program lengths may be combined '
  + 'and the rule that a total duration of 2 years or more may receive a 3-year PGWP, say plainly that the route can qualify for a '
  + 'PGWP of up to 3 years; preserve the official uncertainty by saying "may" / "up to", never guarantee issuance. '
  + 'Then explain the reason in one short paragraph. After a blank line, give only the conditions that decide this exact result as '
  + 'two or three "- " bullets: every program must be PGWP-eligible, every program must meet the minimum length, and the person must '
  + 'apply only once after completing the final program rather than taking a PGWP after the first. End with one sentence saying the '
  + 'final permit length is decided by IRCC. Do not mention language scores, application windows, master degrees, occupations, jobs, '
  + 'provinces, Express Entry or PNP unless the QUESTION explicitly asks about them. Do not open with "our records show", do not '
  + 'repeat the QUESTION, and do not turn the reply into a list of every PGWP rule.'

const PGWP_COMBINE_TEXT_RE =
  /(?:多个|两|2|两个).{0,16}(?:课程|项目|program)|合并|combine|(?:3|三)\s*年.{0,8}PGWP|PGWP.{0,8}(?:3|三)\s*年/i

export function isPgwpCombineQuestion(text: string, history?: ChatTurn[]): boolean {
  return PGWP_COMBINE_TEXT_RE.test([...(history ?? []).filter((h) => h.role === 'user').map((h) => h.content), text].join('\n'))
}

/**
 * users.profile → 对话能消费的长期记忆。只接已有同义槽；CRS/PGWP 剩余月数没有 Slots 对应项，
 * 留在档案展示层，不硬塞进别的字段。未知/空值一律不补。
 */
export function chatProfileContext(raw: unknown): Partial<Slots> {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const nocs = (Array.isArray(p.nocCodes) ? p.nocCodes : []).map(String).filter((x) => /^\d{5}$/.test(x))
  const provs = (Array.isArray(p.targetProvinces) ? p.targetProvinces : [])
    .map(normProv).filter(Boolean) as string[]
  const statusMap: Record<string, string> = { studying: 'student', working: 'working', overseas: 'abroad' }
  const status = statusMap[String(p.currentStatus ?? '')] ?? null
  const clb = numSlot(p.clb, 1, 12)
  return {
    noc: nocs[0] ?? null,
    occText: '',
    provs: [...new Set(provs)].slice(0, 5),
    expMonths: null,
    status,
    claims: [],
    clb,
  }
}

/** 优先级：这轮明确说的 > 本会话上一轮 > 登录档案。 */
export function mergeRememberedSlots(
  current: ReturnType<typeof normalizeSlots>, session: unknown, profile: unknown, text: string,
): ReturnType<typeof normalizeSlots> {
  const empty = normalizeSlots({})
  const fromProfile = mergeFollowupSlots(empty, profile, text)
  const fromSession = mergeFollowupSlots(empty, session, text)
  const remembered = mergeFollowupSlots(fromSession, fromProfile, text)
  return mergeFollowupSlots(current, remembered, text)
}

/**
 * 这类答案不需要模型发挥：四条决定性官方 facts 齐全时，直接交付「结论 → 原因 → 条件 → 风险」。
 * 好处不只是文风稳定，还省掉一轮 10–15 秒的合成调用；缺任一条事实就返回空，照常走 LLM，不拿旧规则硬答。
 */
export function buildPgwpCombineAnswer(facts: Fact[], lang: Lang, userEvidence = ''): string {
  const permit = facts.find((f) => f.tool === 'lookupPermit' && /If your program was (\d+) years? or more/i.test(f.valueText))
  const combine = facts.find((f) => f.tool === 'lookupPermit' && /combines? the length of each program/i.test(f.valueText))
  const minimum = facts.find((f) => f.tool === 'lookupPermit' && /at least (\d+) months? long/i.test(f.valueText))
  const once = facts.find((f) => f.tool === 'lookupPermit' && /already had one after completing an earlier program/i.test(f.valueText))
  const threshold = Number(/If your program was (\d+) years? or more/i.exec(permit?.valueText ?? '')?.[1])
  const months = Number(permit?.value)
  const years = months > 0 && months % 12 === 0 ? months / 12 : 0
  const minMonths = Number(minimum?.value)
  if (!permit || !combine || !minimum || !once || !threshold || !years || !minMonths) return ''
  const onePlusOne = /\b1\s*(?:年|year)/i.test(userEvidence)

  if (lang === 'zh') return [
    `对，按现行规则，这条路线可以申请最长 ${years} 年 PGWP。关键不是“拿了两个证书”，而是 IRCC 允许把多个合格项目的时长合并计算；合计达到 ${threshold} 年或以上，就进入最长 ${years} 年这一档。`,
    `- 两个项目都必须符合 PGWP 资格\n- 每个项目至少 ${minMonths} 个月\n- 第一段结束后不要先申请 PGWP；完成最后一段后只申请一次`,
    `${onePlusOne ? `所以你的结构是：1 年 + 1 年 → 合并约 ${threshold} 年 → 一次申请 → 最长 ${years} 年。` : ''}最终签发长度仍由 IRCC 决定，不能保证一定给满 ${years} 年。`,
  ].filter(Boolean).join('\n\n')
  if (lang === 'ko') return [
    `네. 현행 규정상 이 경로는 최대 ${years}년 PGWP를 신청할 수 있습니다. 핵심은 수료증이 2개라는 사실 자체가 아니라, IRCC가 자격을 갖춘 여러 과정의 기간을 합산하며 총기간이 ${threshold}년 이상이면 최대 ${years}년 구간에 들어간다는 점입니다.`,
    `- 두 과정 모두 PGWP 대상이어야 합니다\n- 각 과정은 최소 ${minMonths}개월이어야 합니다\n- 첫 과정 뒤에 먼저 PGWP를 신청하지 말고 마지막 과정까지 마친 뒤 한 번만 신청해야 합니다`,
    `최종 허가 기간은 IRCC가 결정하므로 ${years}년 전부가 보장되지는 않습니다.`,
  ].join('\n\n')
  return [
    `Yes. Under the current rules, this route can lead to a PGWP of up to ${years} years. The key is not simply having two certificates: IRCC may combine the length of eligible programs, and a combined duration of ${threshold} years or more falls into the up-to-${years}-year band.`,
    `- Both programs must be PGWP-eligible\n- Each program must be at least ${minMonths} months long\n- Do not apply after the first program; apply once after completing the final program`,
    `IRCC makes the final decision on permit length, so the full ${years} years is not guaranteed.`,
  ].join('\n\n')
}
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
function factsFingerprint(facts: Fact[]): string {
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
  facts: Fact[], userText: string, lang: Lang,
  opts: {
    zeroExp: boolean; hasClaims: boolean; hasVerdict?: boolean; occ: string
    forbid?: string[]; banned?: string[]; sameOpen?: string[]; history?: ChatTurn[]
    federalPrograms?: FederalRuleProgram[]
  },
): ChatMessage[] {
  const L = LANG_NAME[lang]
  const isOdds = isOddsQuestion(userText)
  const pgwpCombine = (opts.federalPrograms ?? []).includes('PGWP') && isPgwpCombineQuestion(userText, opts.history)
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
    pgwpCombine ? PLAYBOOK_PGWP_COMBINE : '',
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
    && !(!asksDrawOps && (f.tool === 'lookupDraws' || f.tool === 'lookupOps'))
    // 这题只给「合并、长度、每段最短、一生一次」四类材料。少给比在 prompt 里求它别讲 CLB 有效。
    && (!pgwpCombine || f.tool !== 'lookupPermit'
      || (/工签长度分档|多个课程合并规则|一生可申请次数|课程最短长度|permit length band|combining programs|lifetime application limit|minimum program length|취업 허가 기간 구간|여러 과정 합산 규정|평생 신청 가능 횟수|과정 최소 기간/i.test(f.label)
        && !/master/i.test(f.valueText))))
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
