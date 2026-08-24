/**
 * i18n 域的全部可变状态 —— 只有这一个容器:合并词表的进程内单件
 * (首次取词时由 functions 的装配函数填,之后全站共读)。
 *
 * @author Frank
 * @time 2026-08-24 03:30:00
 */
import type { Messages } from './types'

/**
 * 域内唯一的状态容器。
 */
export const CACHE: {
  /**
   * 每语言一张合并后的扁平表;null = 还没装配(首调 makeT 时构建一次)。
   */
  messages: Messages | null
} = {
  /**
   * 初始为空,首调装配。
   */
  messages: null,
}
