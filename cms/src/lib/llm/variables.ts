/**
 * 模型域的全部可变状态：三个懒翻译的进程内缓存。
 * 摆成一个容器对象 —— 这个域一共多少可变状态，一眼数得清。
 *
 * @author Frank
 * @time 2026-08-23 09:00:00
 */

import type { LlmCache } from './types'

/**
 * 模型域全部的可变状态，就这三格。
 */
export const CACHE: LlmCache = {
  /**
   * 公司简介译文。
   */
  coBy: new Map(),

  /**
   * JD 整理版译文。
   */
  jdBy: new Map(),

  /**
   * NOC 职责/要求译文。
   */
  nocBy: new Map(),
}
