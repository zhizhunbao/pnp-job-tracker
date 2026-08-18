// 🔴 硬闸:答复出得去还是被拦下来。
//
// 出口校验三条(数字必须来自 facts / 内部状态码不许见客 / 中韩答复不许留英文单位词)
// + 闸A 归因(替用户说他没说过的话)+ 闸B 派生数单位(数字对了单位是编的)。
// 违规 → 重试一次 → 再违规就降级成事实清单:**宁可给一张能溯源的清单,也不给一句编出来的话。**
// 与 traces.ts 的分界:这边**拦下重来**,那边只**记一笔放行**。
import { type Availability } from './tools'
import { AVAIL_SENTENCE, type Lang, MONEY_WHY, PROMISE_WHY } from '../i18n'
import { ALL_PROVS, PROV_ALIAS, normProv } from './normalize'
import { CLAIM_TEXT_RE, SENT_SPLIT, claimKeys, saysState } from './traces'
import type { Fact, Slots } from './types'
import { AVAIL_MARKERS, NOT_PROPER, UNIT_WORDS, VERDICT_MARKERS, localizeUnits, stripMd } from './wording'

// ── 🔴 出口校验:答复里的数字必须来自 facts ─────────────────────────────────

export const NUM_RE = /\d+(?:[.,]\d+)*/g
/** 千分位逗号、前导零、小数尾零都是同一个数的写法差别,不是不同的数。 */
export function normNum(s: string): string {
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
const CJK_NUM_RE = /(?<![第每两])([二三四五六七八九十百千]+)\s*(个月|个|份|年|月|周|天|人|分|名|次)/g
/** 只解析这道闸会命中的常用中文整数；不碰「几」「两三个」等模糊数量。 */
function cjkInteger(raw: string): number | null {
  const digit: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
  const unit: Record<string, number> = { 十: 10, 百: 100, 千: 1000 }
  let total = 0
  let current = 0
  for (const ch of raw) {
    if (digit[ch] != null) { current = digit[ch]; continue }
    if (unit[ch] != null) {
      total += (current || 1) * unit[ch]
      current = 0
      continue
    }
    return null
  }
  return total + current
}

/** 中文数量词只有在 facts / 用户原话里有同单位证据时才放行，不能让「36 个月」替「3 个岗位」背书。 */
export function findWordNumbers(answer: string, lang: Lang, facts: Fact[] = [], echo = ''): string[] {
  if (lang === 'en') return []
  const allowed = allowedUnitPairs(facts, echo)
  const out: string[] = []
  const unitClass: Record<string, string> = { 个月: 'mo', 年: 'yr', 周: 'wk', 人: 'ppl', 名: 'ppl', 分: 'pt' }
  for (const m of answer.matchAll(CJK_NUM_RE)) {
    const value = cjkInteger(m[1])
    const cls = unitClass[m[2]]
    if (value != null && cls && allowed.has(`${value}:${cls}`)) continue
    if (!out.includes(m[0])) out.push(m[0])
  }
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
const SCRIPT_RE: Record<Lang, RegExp | null> = {
  en: /[぀-ヿ一-鿿가-힯]+/g,   // 英文答复里不该有任何汉字/假名/韩文
  zh: /[가-힯]+/g,                              // 中文答复里不该有韩文
  ko: /[一-鿿]{2,}/g,                           // 韩文答复里不该有成串汉字
}
export function findForeignScript(answer: string, lang: Lang): string[] {
  const re = SCRIPT_RE[lang]
  if (!re) return []
  const out: string[] = []
  for (const m of answer.matchAll(re)) if (!out.includes(m[0])) out.push(m[0])
  return out.slice(0, 8)
}

/** localizeUnits 之后还剩的英文速记 = 整句抄了 FACTS 的标签,得重写(en 答复不查这条)。 */
export function findEnglishUnits(answer: string, lang: Lang, facts: Fact[] = []): string[] {
  if (lang === 'en') return []
  let s = localizeUnits(answer, lang)
  for (const name of factsEnglish(facts)) s = s.split(name).join(' ')
  const out: string[] = []
  for (const m of s.matchAll(LEFTOVER_RE)) if (!out.includes(m[0])) out.push(m[0])
  return out.slice(0, 8)
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
  const allowed = allowedUnitPairs(facts, echo)
  return [...unitPairs(answer)].filter((p) => !allowed.has(p)).slice(0, 6)
}

function allowedUnitPairs(facts: Fact[], echo = ''): Set<string> {
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
  return allowed
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
export function missingClaimLines(answer: string, facts: Fact[], lang: Lang): string[] {
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
const COVERAGE_WORD: Record<Lang, RegExp> = {
  zh: /清单|列表|在需|收录|收了|列入|名单/,
  en: /\blist(?:s|ed|ing)?\b|in-demand|in demand/i,
  ko: /목록|리스트|수요\s*직업/,
}
/** 子句:比句子更细,免得同一句里的两个省互相牵连。`\.\s` 收英文句点(小数点后面没空格,不误伤 $1,590.00)。 */
const CLAUSE_SPLIT = /[。；;!?！？\n]+|[,，、]|\.\s+/
export function findUnbackedCoverage(answer: string, facts: Fact[], lang: Lang): string[] {
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

export function findMergedStates(answer: string, facts: Fact[], lang: Lang): string[] {
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
