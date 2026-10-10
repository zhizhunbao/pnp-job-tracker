/**
 * peek 组件桶的行为:宿主收到总线消息后怎么动栈、上下文怎么记、没有上下文时分层态怎么兜。
 * 2026-10-09 N 批(Frank「一个全站宿主,并掉各页那 5 套」):职位框 / 公司框的栈从各页上收到全站骨架,各页只发消息。
 *
 * @author Frank
 * @time 2026-10-09 06:00:00
 */
import {
  LAYER_JOB, NOC_DESC_NONE, OP_CLEAR, OP_JOB_ID, OP_POP, OP_PUSH, OP_SWAP, PRO_UNTIL_NONE, URL_JOB_HEAD,
  URL_JOB_ROW_HEAD,
} from './constants'
import type {
  CtxListIn, HostCtx, HostPlanIn, PeekJob, PeekLayer, PeekMsgIn, PeekNocDescs, PeekPlan, PeekSeed,
} from './types'

/**
 * 照一条栈操作动宿主的栈。层在总线上是不透明的,形状由发消息的各页(各自的 PeekLayer,与本域同形)保证,断言只住这一处。
 *
 * @param x 一条栈操作与宿主的栈。
 * @returns 无。
 */
export function applyPeekMsg(x: PeekMsgIn): void {
  const m = x.msg
  if (m.op === OP_POP) {
    x.stack.pop()
    return
  }
  if (m.op === OP_CLEAR) {
    x.stack.clear()
    return
  }
  if (m.op === OP_JOB_ID) {
    void openJobById(x)
    return
  }
  if (m.layer == null) {
    return
  }
  if (m.op === OP_PUSH) {
    x.stack.push(m.layer as PeekLayer)
    return
  }
  if (m.op === OP_SWAP) {
    x.stack.swapTop(m.layer as PeekLayer)
  }
}

/**
 * 按职位号叠开职位框:现取一整行;取不到(下架删了、网断)就去职位页整页(同 companies 的 makeOpenJob)。
 *
 * @param x 那条消息(带职位号)与宿主的栈。
 * @returns 无。
 */
export async function openJobById(x: PeekMsgIn): Promise<void> {
  const id = x.msg.jobId
  if (id == null) {
    return
  }
  const row = await loadJobRow(id)
  if (row == null) {
    window.location.assign(URL_JOB_HEAD + String(id))
    return
  }
  x.stack.push({ kind: LAYER_JOB, job: row })
}

/**
 * 按职位号取一整行。
 *
 * @param id 职位号。
 * @returns 整行;取不到给 null。
 */
async function loadJobRow(id: number): Promise<PeekJob | null> {
  try {
    const r = await fetch(URL_JOB_ROW_HEAD + String(id))
    if (r.ok === false) {
      return null
    }
    return await r.json() as PeekJob | null
  } catch {
    return null
  }
}

/**
 * 记下一条上下文消息:同一个报件先撤掉旧的,报的是新上下文就追加到最后(最后报的算数)。
 * 上下文在总线上不透明,形状由各页报件(原样递的分层态与职业名表)保证,断言只住这一处。
 *
 * @param x 现有的上下文与新来的一条。
 * @returns 新的上下文表。
 */
export function ctxListWith(x: CtxListIn): HostCtx[] {
  const out: HostCtx[] = []
  for (const c of x.list) {
    if (c.id !== x.msg.id) {
      out.push(c)
    }
  }
  const ctx = x.msg.ctx
  if (ctx != null) {
    out.push({ id: x.msg.id, plan: ctx.plan as PeekPlan, nocDesc: ctx.nocDesc as PeekNocDescs })
  }
  return out
}

/**
 * 宿主用的分层态:最后报上来那一页的;一页都没报(把脉页、城市页上开投递框再点公司)就按会话种子兜一份。
 *
 * @param x 现有的上下文与会话种子。
 * @returns 分层态。
 */
export function hostPlanOf(x: HostPlanIn): PeekPlan {
  const last = x.list[x.list.length - 1]
  if (last != null) {
    return last.plan
  }
  return fallbackPlanOf(x.seed)
}

/**
 * 兜底分层态:只认登录没登录与身份三件,档案按没建档(null),Pro 与管理员按否 —— 职位框里只读登录、档案、管理员三格,
 * 这样兜底最多少一张匹配卡,不会把登录用户挡进注册闸。
 *
 * @param seed 会话种子(没有 = null)。
 * @returns 分层态。
 */
function fallbackPlanOf(seed: PeekSeed | null): PeekPlan {
  if (seed == null || seed.in === false) {
    return {
      isPro: false,
      loggedIn: false,
      profileOk: false,
      profile: null,
      email: null,
      displayName: null,
      avatar: null,
      proUntil: PRO_UNTIL_NONE,
      isAdmin: false,
    }
  }
  return {
    isPro: false,
    loggedIn: true,
    profileOk: false,
    profile: null,
    email: seed.email,
    displayName: seed.displayName,
    avatar: seed.avatar,
    proUntil: PRO_UNTIL_NONE,
    isAdmin: false,
  }
}

/**
 * 宿主用的职业名表:最后报上来那一页的;没有给空表。
 *
 * @param list 现有的上下文。
 * @returns 职业名表。
 */
export function hostNocOf(list: HostCtx[]): PeekNocDescs {
  const last = list[list.length - 1]
  if (last != null) {
    return last.nocDesc
  }
  return NOC_DESC_NONE
}
