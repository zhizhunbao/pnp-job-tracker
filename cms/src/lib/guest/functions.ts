/**
 * 访客域的行为:未登录的人在这台浏览器上留下的足迹 —— 站内看过哪些职位(第 3 个不同的职位弹框起弹
 * 访客向导)、向导答到哪(注册前的草稿),以及注册那一刻把草稿交给答案档。
 * 2026-10-03 付费闭环批 A1 立(设计稿 docs/design/通用/付费闭环-20261003.md)。边界:本域只管**登录前**、
 * 只在浏览器本地;登录后的答案以服务端 users.answers 为唯一真相,归 lib/quiz —— 交接只走它的 mergeBasics 一个口。
 * 本地存储读写抛了(无痕模式 / 站点数据被禁 / 配额满)照常往下走,但一律经 lib/log 留一行。
 * 同日审查后补:草稿只交给「在向导里发起的那次登录」—— 邮箱当场交,Google 凭交接戳(走到注册屏落戳、× 撤戳)
 * 回跳后交;答案档里已有的格不覆盖(lib/quiz 的 mergeBasics 只填空格);读回的草稿逐格验值域。
 * 2026-10-04 改判(Frank「进来就要求用户登录注册」→「照这样改」):第 3 个的门槛撤(isGateDue 随撤),未登录开职位弹框
 * 一律弹;另立进站即弹(5 段:例外表判定 + 会话存储记「本页弹过」)。浏览记录照记,只剩预选职业一个用处。
 * 2026-10-11 Frank「我应该先注册 再问问题吧。不然回答的问题 存哪里去了」→「需要改」:访客不再答题(门只剩注册框),
 * 向导草稿(本地存储 o2p_gate_v2 的读写、验值、并进答案档)、Google 回跳交接戳与所在省预选整段删;
 * 留下起弹判定、「这个页面里刚登录过」一对与进站即弹。上面讲草稿 / 交接 / 预选的句子作废。
 *
 * @author Frank
 * @time 2026-10-03 20:10:00
 */
import { GUEST_LOG, log } from '../log'
import { ENTRY_EXEMPT_PARAMS, ENTRY_EXEMPT_ROOTS, ENTRY_EXEMPT_UNDER, ENTRY_SHOWN_KEY, PATH_SEP } from './constants'
import { CACHE } from './variables'
import type { EntryExemptIn, EntryGateIn, GateForIn } from './types'

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
// 3. 交接
// =========================================================================

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
