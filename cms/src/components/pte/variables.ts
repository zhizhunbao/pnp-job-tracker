/**
 * pte 域唯一放变量的地方:练过集的快照缓存 —— useSyncExternalStore 要求同一份外部状态给回同一个引用,
 * 否则每次渲染都当「变了」进死循环;这里按 localStorage 原串记一份,原串没变就交回上一次的 Set。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */

import type { DictEntry } from './types'

/**
 * 域内可变状态的容器。
 */
export const CACHE = {
  /**
   * 上一次读到的练过集原串;null = 还没读过。
   */
  doneRaw: null as string | null,

  /**
   * 与 doneRaw 对应的 Set(同一原串给同一引用)。
   */
  done: new Set<string>(),

  /**
   * 练过集的订阅者(useSyncExternalStore 的 subscribe 登记;saveDone 后逐个叫醒)。
   */
  listeners: new Set<() => void>(),

  /**
   * 在播的题目音频(直链形态;提交 / 重做 / 换题时停掉)。
   */
  audio: null as HTMLAudioElement | null,

  /**
   * 查过的词(词 → 结果;null = 查过没有),同一页反复选同一个词不再打接口。
   */
  dict: new Map<string, DictEntry | null>(),
}
