/**
 * 访客域的行为:未登录的人在这台浏览器上留下的足迹 —— 站内看过哪些职位(第 3 个不同的职位弹框起弹
 * 访客向导)、向导答到哪(注册前的草稿),以及注册那一刻把草稿交给答案档。
 * 2026-10-03 付费闭环批 A1 立(设计稿 docs/design/付费闭环-20261003.md)。边界:本域只管**登录前**、
 * 只在浏览器本地;登录后的答案以服务端 users.answers 为唯一真相,归 lib/quiz —— 交接只走它的 mergeBasics 一个口。
 * 本地存储读写抛了(无痕模式 / 站点数据被禁 / 配额满)照常往下走,但一律经 lib/log 留一行。
 * 同日审查后补:草稿只交给「在向导里发起的那次登录」—— 邮箱当场交,Google 凭交接戳(走到注册屏落戳、× 撤戳)
 * 回跳后交;答案档里已有的格不覆盖(lib/quiz 的 mergeBasics 只填空格);读回的草稿逐格验值域。
 * 2026-10-04 改判(Frank「进来就要求用户登录注册」→「照这样改」):第 3 个的门槛撤(isGateDue 随撤),未登录开职位弹框
 * 一律弹;另立进站即弹(5 段:例外表判定 + 会话存储记「本页弹过」)。浏览记录照记,只剩预选职业一个用处。
 *
 * @author Frank
 * @time 2026-10-03 20:10:00
 */
import { deviceTzOf, homeProvinceOf, isCanadaTz } from '../location'
import { GUEST_LOG, log } from '../log'
import { mergeBasics } from '../quiz'
import {
  DRAFT_KEY, ENTRY_EXEMPT_PARAMS, ENTRY_EXEMPT_ROOTS, ENTRY_EXEMPT_UNDER, ENTRY_SHOWN_KEY, GOAL_BANDS, HANDOFF_KEY,
  HANDOFF_TTL_MS, INTENT_JOB, INTENTS, MAJOR_PICK_MAX, MAJOR_RE, NOC_RE, PATH_SEP, PROV_CODES, STATUS_OVERSEAS, TEXT_NONE,
} from './constants'
import { CACHE } from './variables'
import type {
  EntryExemptIn, EntryGateIn, GateDraft, GateForIn, GateIntent, GatePatch, GateSeedIn, HandoffFreshIn, MaybeGateDraft,
  ProvSeed, ProvSeedIn, RawCell, RawDoc, RawText, SyncOut,
} from './types'

// =========================================================================
// 1. 起弹判定(2026-10-07 浏览记录整条删,本段只剩 gateDueFor)
// =========================================================================

/**
 * 这次打开职位弹框要不要先弹访客向导:读浏览记录、把这一岗算进去,再交给 isGateDue 判。
 * 只给职位弹框用(整页永远不弹,不必问)。登录态除了分层态,还认「这个页面里刚在向导里登录过」——
 * 软刷回来之前分层态还是匿名,不认它就会在那段空档里再弹一次(审查 2026-10-03)。
 * 2026-10-04 改判:门槛撤,不再读浏览记录、不再数 —— 没登录(两样登录态都不认人)就弹;进站即弹也先过它。
 *
 * @param x 登录态。
 * @returns 要弹 = true。
 */
export function gateDueFor(x: GateForIn): boolean {
  return x.loggedIn === false && isGateSignedIn() === false
}

// =========================================================================
// 2. 访客向导草稿
// =========================================================================

/**
 * 向导开屏时的各格初值:有草稿就照草稿(再次打开接着答);没有就按浏览记录预选职业、
 * 按设备时区预选所在省,其余留空。
 * 2026-10-07 Frank「为什么我选的是 AI 和 cloud,然后做的工作是上面的」→「你弄吧」:按浏览记录预选职业撤
 * (专业是必答,第 3 题照专业推荐;预选的是看过的岗,和专业对不上),浏览记录随之整条删,职业一格开屏留空。
 *
 * @param x 这次的由头(没有草稿时记进新开的那份)。
 * @returns 各格初值(形状同草稿)。
 */
export function readGateSeed(x: GateSeedIn): GateDraft {
  const d = readGateDraft()
  if (d != null) {
    return d
  }
  const where = guessProv()
  return {
    goal: 0,
    majors: [],
    nocs: [],
    prov: where.prov,
    abroad: where.abroad,
    intent: x.intent,
  }
}

/**
 * 读草稿;没存过、存的认不出都给 null,读抛了留痕。
 *
 * @returns 草稿或 null。
 */
export function readGateDraft(): MaybeGateDraft {
  try {
    return toGateDraft(localStorage.getItem(DRAFT_KEY))
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.draftRead + String(e) })
    return null
  }
}

/**
 * 草稿原文 → 草稿(行构造器):每格验类型与值域(本地存储是信任边界,谁都能改),不对的按没答 ——
 * 目标档只认 GOAL_BANDS、专业只认 CIP class 码形 MAJOR_RE(2026-10-04 A2 前只认大类码表)、省只认 PROV_CODES、职业码只认五位数字(去重);
 * 答了境外就不留省;由头认不出按「点开职位」。原文不是 json 时 JSON.parse 会抛,由调用方的 catch 收。
 * 2026-10-05 专业改多选:读 majors 数组 —— 逐个验码形、去重、超过 MAJOR_PICK_MAX 个的丢掉;单值那版留下的 major 串不认。
 *
 * @param raw 本地存储原文;null = 没存过。
 * @returns 草稿;原文不是对象 = null。
 */
export function toGateDraft(raw: RawText): MaybeGateDraft {
  if (raw == null || raw === '') {
    return null
  }
  const doc: RawCell = JSON.parse(raw)
  if (doc == null || typeof doc !== 'object' || Array.isArray(doc)) {
    return null
  }
  const row = doc as RawDoc
  const out: GateDraft = {
    goal: 0, majors: [], nocs: [], prov: TEXT_NONE, abroad: row.abroad === true, intent: INTENT_JOB,
  }
  if (typeof row.goal === 'number' && GOAL_BANDS.includes(row.goal)) {
    out.goal = row.goal
  }
  if (Array.isArray(row.majors)) {
    for (const c of row.majors) {
      if (typeof c === 'string' && MAJOR_RE.test(c) && out.majors.includes(c) === false
        && out.majors.length < MAJOR_PICK_MAX) {
        out.majors.push(c)
      }
    }
  }
  if (Array.isArray(row.nocs)) {
    for (const c of row.nocs) {
      if (typeof c === 'string' && NOC_RE.test(c) && out.nocs.includes(c) === false) {
        out.nocs.push(c)
      }
    }
  }
  if (out.abroad === false && typeof row.prov === 'string' && PROV_CODES.includes(row.prov)) {
    out.prov = row.prov
  }
  if (typeof row.intent === 'string' && isGateIntent(row.intent)) {
    out.intent = row.intent
  }
  return out
}

/**
 * 这个串是不是认得的向导由头。
 *
 * @param v 草稿里读出的由头原文。
 * @returns 认得 = true(并把它收窄成由头)。
 */
export function isGateIntent(v: string): v is GateIntent {
  return INTENTS.includes(v)
}

/**
 * 写草稿(每步改动即写);写抛了留痕,向导照常往下走。
 *
 * @param d 草稿。
 * @returns 无。
 */
export function writeGateDraft(d: GateDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.draftWrite + String(e) })
  }
}

/**
 * 清草稿;清抛了留痕。
 *
 * @returns 无。
 */
export function clearGateDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.draftWrite + String(e) })
  }
}

/**
 * 草稿 → 并进答案档的那几格:没答的格缺席(不动旧答案);答了境外写处境 overseas、现居省清空;
 * 答了省只写现居省(处境不动 —— 人在境内是什么处境,这四道题没问)。
 * 2026-10-05 专业改多选:选了专业写码清单 majors(没选缺席)。
 *
 * @param d 草稿。
 * @returns 要改的那几格。
 */
export function gatePatchOf(d: GateDraft): GatePatch {
  const out: GatePatch = {}
  if (d.goal > 0) {
    out.goalBand = d.goal
  }
  if (d.majors.length > 0) {
    out.majors = d.majors
  }
  if (d.nocs.length > 0) {
    out.nocs = d.nocs
  }
  if (d.abroad) {
    out.status = STATUS_OVERSEAS
    out.resProv = TEXT_NONE
    return out
  }
  if (d.prov !== '') {
    out.resProv = d.prov
  }
  return out
}

// =========================================================================
// 3. 交接
// =========================================================================

/**
 * 在向导里登录 / 注册成功后把草稿交给答案档:先撤本地草稿与交接戳(同一页里全站骨架的补交钩子不会再并一次),
 * 再经 lib/quiz 的 mergeBasics 读回服务端档、只填还空着的格、整份推上去;没成就把草稿与戳都放回去,
 * 这个标签页 10 分钟内再进站时由补交钩子再交一次。
 * 2026-10-04 收口审查:交回成没成(补交钩子凭它决定记不记「首访引导弹过了」、回不回职位板筛)。
 *
 * @param d 草稿。
 * @returns 并进去且推上去了 = true(结果另落在本地存储与答案档上)。
 */
export async function syncGateDraft(d: GateDraft): SyncOut {
  clearGateDraft()
  clearGateHandoff()
  const ok = await mergeBasics(gatePatchOf(d))
  if (ok === false) {
    writeGateDraft(d)
    markGateHandoff()
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.draftSync + d.intent })
  }
  return ok
}

/**
 * 记下「这个页面里刚在访客向导里登录 / 注册成功」(软刷回来之前起弹判定靠它认人)。
 *
 * @returns 无。
 */
export function markGateSignedIn(): void {
  CACHE.signedIn = true
}

/**
 * 这个页面里刚在访客向导里登录 / 注册过没有。
 *
 * @returns 登录过 = true。
 */
export function isGateSignedIn(): boolean {
  return CACHE.signedIn
}

/**
 * 落交接戳(访客向导走到注册屏那一刻;Google 整页登录跳走前戳就在了);落不上留痕。
 *
 * @returns 无。
 */
export function markGateHandoff(): void {
  try {
    sessionStorage.setItem(HANDOFF_KEY, String(Date.now()))
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.handoff + String(e) })
  }
}

/**
 * 取交接戳(全站骨架的补交钩子在登录态下调):读完即撤,交回它还在不在有效期内。
 * 读抛了留痕并按没有戳算(宁可不交,不替别的登录改答案档)。
 *
 * @returns 有戳且没过期 = true。
 */
export function takeGateHandoff(): boolean {
  let raw: RawText = null
  try {
    raw = sessionStorage.getItem(HANDOFF_KEY)
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.handoff + String(e) })
    return false
  }
  clearGateHandoff()
  return isHandoffFresh({ raw, now: Date.now() })
}

/**
 * 交接戳在不在有效期内:没落过、不是数、落在将来、超过 HANDOFF_TTL_MS 都算不在。
 *
 * @param x 戳原文与此刻。
 * @returns 在 = true。
 */
export function isHandoffFresh(x: HandoffFreshIn): boolean {
  if (x.raw == null || x.raw === '') {
    return false
  }
  const at = Number(x.raw)
  if (Number.isFinite(at) === false || at > x.now) {
    return false
  }
  return x.now - at <= HANDOFF_TTL_MS
}

/**
 * 撤交接戳(× 关掉向导、开始交接时);撤不掉留痕。
 *
 * @returns 无。
 */
export function clearGateHandoff(): void {
  try {
    sessionStorage.removeItem(HANDOFF_KEY)
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.handoff + String(e) })
  }
}

// =========================================================================
// 4. 所在省预选
// =========================================================================

/**
 * 读这台设备该预选什么(设备时区与浏览器语言交给 lib/location 判,本函数只拼两样)。
 *
 * @returns 所在省的预选。
 */
export function guessProv(): ProvSeed {
  return gateProvSeedOf({ home: homeProvinceOf(), tz: deviceTzOf() })
}

/**
 * 所在省预选的判定:时区对得上省就选那个省;对不上、时区又不在加拿大境内,预选「加拿大境外」;
 * 其余(浏览器没报时区、大西洋时区这类分不出省的)不预选 —— 宁可留空,不瞎猜。
 *
 * @param x 时区判出的省码与时区名。
 * @returns 所在省的预选。
 */
export function gateProvSeedOf(x: ProvSeedIn): ProvSeed {
  if (x.home !== '') {
    return { prov: x.home, abroad: false }
  }
  if (x.tz === '' || isCanadaTz(x.tz)) {
    return { prov: TEXT_NONE, abroad: false }
  }
  return { prov: TEXT_NONE, abroad: true }
}

// =========================================================================
// 5. 进站
// =========================================================================

/**
 * 这一页要不要弹进站向导;要弹就当场记下「本页弹过」(判与记一步完成,同 takeGateHandoff 的取即撤)——
 * 同一页刷新、筛选改地址栏不再弹,换到别的页再判。没登录(gateDueFor)且不在例外表里才弹。
 * 会话存储读写抛了留痕并照弹(宁可多弹一次,不让进站闸无声失效)。2026-10-04 进站即弹立。
 *
 * @param x 登录态与这一页的地址。
 * @returns 要弹 = true。
 */
export function takeEntryGate(x: EntryGateIn): boolean {
  if (gateDueFor({ loggedIn: x.loggedIn }) === false || isEntryGateExempt({ path: x.path, search: x.search })) {
    return false
  }
  try {
    if (sessionStorage.getItem(ENTRY_SHOWN_KEY) === x.path) {
      return false
    }
    sessionStorage.setItem(ENTRY_SHOWN_KEY, x.path)
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.entry + String(e) })
  }
  return true
}

/**
 * 进站即弹的例外判定(纯函数):路径是 ENTRY_EXEMPT_ROOTS 之一或在其下、在 ENTRY_EXEMPT_UNDER 之一的下面
 * (它自己不算)、或查询串带 ENTRY_EXEMPT_PARAMS 里的参数,都不弹。
 * 2026-10-04 收口审查:参数只在表里配对的那一页上算(路径全等),别的页带上照弹。
 *
 * @param x 路径与查询串。
 * @returns 不弹 = true。
 */
export function isEntryGateExempt(x: EntryExemptIn): boolean {
  for (const root of ENTRY_EXEMPT_ROOTS) {
    if (x.path === root || x.path.startsWith(root + PATH_SEP)) {
      return true
    }
  }
  for (const head of ENTRY_EXEMPT_UNDER) {
    if (x.path.startsWith(head + PATH_SEP) && x.path.length > head.length + PATH_SEP.length) {
      return true
    }
  }
  const sp = new URLSearchParams(x.search)
  for (const one of ENTRY_EXEMPT_PARAMS) {
    if (one.path === x.path && sp.has(one.key)) {
      return true
    }
  }
  return false
}
