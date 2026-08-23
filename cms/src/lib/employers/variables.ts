/**
 * 雇主域的全部可变状态:三条线的进程内缓存(Render 单实例 = 进程缓存即全局)。
 * 摆成一个容器对象 —— 这个域一共多少可变状态,一眼数得清;改属性的每一处都写明改哪一格。
 * 取数策略(08-08 生产两次池楔死后的保险):过期先回旧值、后台单飞刷新,聚合永不站在请求路径上排队。
 *
 * @author Frank
 * @time 2026-08-21 23:20:43
 */

import type { EmployersCache } from './types'

/**
 * 雇主域全部的可变状态,就这六格。
 */
export const CACHE: EmployersCache = {
  /**
   * 指定雇主名录整表(6,680 行 × 7 短字段)。开机是空的,第一次取的人负责灌。
   */
  designated: null,

  /**
   * 名录刷新的单飞 promise。
   */
  designatedInflight: null,

  /**
   * 在招担保雇主聚合整表。开机是空的。
   */
  sponsors: null,

  /**
   * 担保聚合刷新的单飞 promise。
   */
  sponsorsInflight: null,

  /**
   * 背调同名并发合流表。
   */
  research: new Map(),

  /**
   * 橱窗三分表。开机是空的,第一次取的人负责灌。
   */
  boards: null,
}
