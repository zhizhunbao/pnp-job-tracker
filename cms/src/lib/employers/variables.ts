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
 * 雇主域全部的可变状态,就这九格(2026-09-04 加指定雇主在招数两格)。
 */
export const CACHE: EmployersCache = {
  /**
   * 雇主池省下拉的选项(2026-09-13 雇主板批二;原名录整表 / 指定在招数两对格随双口径退役)。开机是空的。
   */
  poolProvs: null,

  /**
   * 省选项刷新的单飞 promise。
   */
  poolProvsInflight: null,

  /**
   * 市下拉选项(2026-09-18 市筛选;按省一格)。开机是空的。
   */
  poolCities: new Map(),

  /**
   * 区下拉选项(2026-09-18 区筛选;按「省|市」一格)。开机是空的。
   */
  poolDistricts: new Map(),

  /**
   * 「全部类别」下拉的选项(2026-09-18)。开机是空的。
   */
  poolBroads: null,

  /**
   * 「全部类别」(EE)下拉的选项(2026-09-19)。开机是空的。
   */
  poolEes: null,

  /**
   * 全组页缓存(2026-09-13 默认全量出榜)。开机是空的。
   */
  poolPages: new Map(),

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

  /**
   * 简介译文缓存。
   */
  briefTransBy: new Map(),

  /**
   * 公司别名缓存:lower(name)|lang → 译名(2026-09-14 懒翻公司名)。
   */
  aliasBy: new Map(),
}
