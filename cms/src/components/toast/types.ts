/**
 * toast 组件桶的形状:总线上的一条提示、宿主手里的一张卡、宿主与卡的契约。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */

/**
 * 三档:成功 / 提醒 / 出错。
 */
export type ToastKind = 'ok' | 'warn' | 'err'

/**
 * 总线上的一条提示(线格式:副行可不发)。
 */
export type ToastMsg = {
  /**
   * 哪一档。
   */
  kind: ToastKind

  /**
   * 粗体那一行(调用方取好词的整句)。
   */
  title: string

  /**
   * 灰字副行(一行;不发 = 没有)。
   */
  detail?: string
}

/**
 * 宿主手里的一张卡(副行已归一:空串 = 没有)。
 */
export type ToastItem = {
  /**
   * 卡号(宿主发号,关哪张靠它)。
   */
  id: number

  /**
   * 哪一档。
   */
  kind: ToastKind

  /**
   * 粗体那一行。
   */
  title: string

  /**
   * 灰字副行;空串 = 没有。
   */
  detail: string
}

/**
 * toToastItem 的入参。
 */
export type ToastItemIn = {
  /**
   * 总线上那一条。
   */
  msg: ToastMsg

  /**
   * 发给它的卡号。
   */
  id: number
}

/**
 * toastListWith 的入参。
 */
export type ToastListIn = {
  /**
   * 现有的卡(先来的在前)。
   */
  list: ToastItem[]

  /**
   * 新来的一张。
   */
  item: ToastItem
}

/**
 * toastListWithout 的入参。
 */
export type ToastDropIn = {
  /**
   * 现有的卡。
   */
  list: ToastItem[]

  /**
   * 要关的卡号。
   */
  id: number
}

/**
 * 宿主面板:现有的卡与「关一张」。
 */
export type ToastHostPanel = {
  /**
   * 现有的卡(先来的在上)。
   */
  items: ToastItem[]

  /**
   * 关一张(按卡号)。
   */
  close: (id: number) => void
}

/**
 * ToastCard 的 props。
 */
export type ToastCardIn = {
  /**
   * 这一张。
   */
  item: ToastItem

  /**
   * 关一张(按卡号;宿主给的同一个手柄)。
   */
  close: (id: number) => void
}

/**
 * useToastCard 的入参(同 ToastCardIn)。
 */
export type ToastCardHookIn = ToastCardIn

/**
 * 本域全部的可变状态。
 */
export type ToastCache = {
  /**
   * 最后发出的卡号。
   */
  seq: number
}
