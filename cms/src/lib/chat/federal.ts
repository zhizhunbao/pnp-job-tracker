// 联邦规则 / 计分题的路由 —— 纯函数,**不交给模型猜**。
//
// PGWP / CEC / FSW / FST 与 CRS / FSW67 分表都不依赖职业:纯问这些时不强迫用户补 NOC
// (对话铁律③的另一半 —— 该问的必问,不该问的别拦人)。
import { type CrsLookupArgs } from './tools'
import { type Lang } from '../i18n'
import type { ChatTurn } from './types'

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
 * 联邦规则追问可以省略项目名，但不能因此掉回「请先说职业」。
 *
 * 生产实录 fca7d1fe1ae8ed20：首轮明确问 PGWP，下一句只说「大家都是这么说的 两个一年能换 3 年」。
 * 旧路由只读 NOW，第二轮没有 PGWP 字样就误抛 noOcc，连 lookupPermit 都没走到。
 *
 * 继承故意很窄：NOW 必须长得像承接/质疑，且从最近的 user 轮往前找；碰到省份、职业、岗位等
 * 明确换题信号就停止。这样「那两个一年制合并呢」接得上，「那曼省呢」不会被套回 PGWP。
 */
const FEDERAL_FOLLOWUP_RE =
  /大家.{0,5}(?:都|也).{0,5}说|都这么说|不是说|你(?:刚才)?说|真的吗|真的么|确定吗|为什么|怎么会|那(?:么|这样|这个)?|所以|可是|但是|不过|两个.{0,8}(?:一\s*年|1\s*年)|(?:一\s*年|1\s*年).{0,12}(?:两个|合并|换|拿|三\s*年|3\s*年)|合并.{0,12}(?:课程|项目|学制|时长)|everyone says|is that (?:really )?true|are you sure|what about|then|but|two one[- ]year|combin.{0,12}(?:program|course)|다들.{0,8}말|정말|확실|그럼|하지만/i
export const FEDERAL_TOPIC_SHIFT_RE =
  /省提名|\bPNP\b|哪[个些]省|省份|安省|曼省|萨省|阿省|卑诗|新省|纽省|爱德华王子岛|魁省|找工作|找雇主|岗位|职位|招聘|薪资|工资|\boffer\b|\bLMIA\b|移民路径|哪条路|which province|provincial nominee|job openings?|employers?|salary|wages?|pathway to pr|주정부|일자리|고용주/i

export function federalRuleProgramsForTurn(text: string, history?: ChatTurn[]): FederalRuleProgram[] {
  const direct = federalRulePrograms(text)
  if (direct.length) return direct
  if (!FEDERAL_FOLLOWUP_RE.test(text || '') || FEDERAL_TOPIC_SHIFT_RE.test(text || '')) return []

  const users = (history ?? []).filter((h) => h.role === 'user').slice(-6).reverse()
  for (const turn of users) {
    const hit = federalRulePrograms(turn.content)
    if (hit.length) return hit
    if (FEDERAL_TOPIC_SHIFT_RE.test(turn.content)) return []
  }
  return []
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

export const LANG_NAME: Record<Lang, string> = { zh: 'Simplified Chinese', en: 'English', ko: 'Korean' }

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
