/**
 * pte 域唯一放变量的地方:练过集的快照缓存 —— useSyncExternalStore 要求同一份外部状态给回同一个引用,
 * 否则每次渲染都当「变了」进死循环;这里按 localStorage 原串记一份,原串没变就交回上一次的 Set。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */

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
}
