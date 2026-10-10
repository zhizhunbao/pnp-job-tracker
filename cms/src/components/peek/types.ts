/**
 * peek 组件桶的形状:全站宿主持的那一个弹框栈与它收的两种消息。
 * 🔴 跨域 `import type` 是**原样透传**的外域形状:整份职位行、分层态、职业名表由页面报上来、原样喂给 advisor 的 PeekStack,
 * 本域一格不读(先例 myjobs/types.ts、advisor/types.ts)。
 *
 * @author Frank
 * @time 2026-10-09 06:00:00
 */
// eslint-disable-next-line local/no-import-in-leaf -- 只 import type,理由见文件头(原样透传的外域整份行与分层态)
import type { JobRow, NocDesc, Plan } from '@/lib/jobs'

/**
 * 界面语三字面量(各域自抄)。
 */
export type PeekLang = 'zh' | 'en' | 'ko'

/**
 * 职位行(外域形状,原样透传)。
 */
export type PeekJob = JobRow

/**
 * 分层态(外域形状,原样透传)。
 */
export type PeekPlan = Plan

/**
 * 职业名表(外域形状,原样透传)。
 */
export type PeekNocDescs = NocDesc[]

/**
 * 公司框是哪一家(与 advisor 的 CompanyPeek 同形)。
 */
export type CompanyPeek = {
  /**
   * 公司页 slug。
   */
  slug: string

  /**
   * 公司名。
   */
  name: string
}

/**
 * 栈的职位层。
 */
export type PeekJobLayer = {
  /**
   * 层的种类。
   */
  kind: 'job'

  /**
   * 这一岗(整行)。
   */
  job: PeekJob
}

/**
 * 栈的公司层。
 */
export type PeekCoLayer = {
  /**
   * 层的种类。
   */
  kind: 'company'

  /**
   * 这一家。
   */
  co: CompanyPeek
}

/**
 * 栈的一层。
 */
export type PeekLayer = PeekJobLayer | PeekCoLayer

/**
 * 宿主持的栈(modal 桶 useLayerStack 的出参;形状本域自抄)。
 */
export type HostStack = {
  /**
   * 从下到上的各层。
   */
  layers: PeekLayer[]

  /**
   * 叠上一层。
   */
  push: (layer: PeekLayer) => void

  /**
   * 换掉最上面一层。
   */
  swapTop: (layer: PeekLayer) => void

  /**
   * 关掉最上面一层。
   */
  pop: () => void

  /**
   * 全关。
   */
  clear: () => void
}

/**
 * 总线上的一条栈操作(与 modal 的 PeekMsg 同形;层由总线不透明透传)。
 */
export type BusMsg = {
  /**
   * 栈操作(push / swap / pop / jobId / clear)。
   */
  op: string

  /**
   * 叠上 / 换上的那一层(其余操作 = null)。
   */
  layer: object | null

  /**
   * 按职位号开职位框时的职位号(其余 = null)。
   */
  jobId: number | null
}

/**
 * 总线上的一份上下文消息(与 modal 的 PeekCtxMsg 同形)。
 */
export type BusCtxMsg = {
  /**
   * 报件编号。
   */
  id: string

  /**
   * 报的上下文;撤回 = null。
   */
  ctx: BusCtx | null
}

/**
 * 一页报上来的上下文(总线上不透明)。
 */
export type BusCtx = {
  /**
   * 本页的分层态。
   */
  plan: object

  /**
   * 本页的职业名表。
   */
  nocDesc: object
}

/**
 * 宿主记下的一份上下文(按报件编号,最后报的那份算数)。
 */
export type HostCtx = {
  /**
   * 报件编号。
   */
  id: string

  /**
   * 分层态。
   */
  plan: PeekPlan

  /**
   * 职业名表。
   */
  nocDesc: PeekNocDescs
}

/**
 * 服务端给的会话种子(auth 桶 SessionSeed 同形;没有哪一页报分层态时按它兜一份)。
 */
export type PeekSeed = {
  /**
   * 有没有登录。
   */
  in: boolean

  /**
   * 邮箱。
   */
  email: string

  /**
   * 昵称。
   */
  displayName: string | null

  /**
   * 头像。
   */
  avatar: string | null
}

/**
 * `ctxListWith` 的入参。
 */
export type CtxListIn = {
  /**
   * 现有的上下文(先报的在前)。
   */
  list: HostCtx[]

  /**
   * 新来的一条(报或撤)。
   */
  msg: BusCtxMsg
}

/**
 * `hostPlanOf` 的入参。
 */
export type HostPlanIn = {
  /**
   * 现有的上下文。
   */
  list: HostCtx[]

  /**
   * 会话种子(没有 = null)。
   */
  seed: PeekSeed | null
}

/**
 * `applyPeekMsg` 与 `openJobById` 的入参。
 */
export type PeekMsgIn = {
  /**
   * 一条栈操作。
   */
  msg: BusMsg

  /**
   * 宿主的栈。
   */
  stack: HostStack
}

/**
 * 宿主面板(`usePeekHost` 交出,原样喂给 PeekStack)。
 */
export type PeekHostPanel = {
  /**
   * 宿主的栈。
   */
  stack: HostStack

  /**
   * 界面语。
   */
  lang: PeekLang

  /**
   * 分层态(最后报上来那一页的;没有按会话兜)。
   */
  plan: PeekPlan

  /**
   * 职业名表(最后报上来那一页的;没有给空表)。
   */
  nocDesc: PeekNocDescs
}
