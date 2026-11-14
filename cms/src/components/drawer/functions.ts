/**
 * drawer 域的行为:锁着时不关的关闭手柄(2026-11-13 Frank「这个运行时候,中间也不能点」:面板里的事还没做完时,
 * 点遮罩、点 ×、按 Esc 都不关)。
 *
 * @author Frank
 * @time 2026-11-13 19:00:00
 */
import type { LockedCloseIn } from './types'

/**
 * 造关闭手柄:没锁就照常关,锁着什么都不做。
 *
 * @param x 锁没锁与真正的关闭回调。
 * @returns 关闭手柄。
 */
export function makeLockedClose(x: LockedCloseIn): () => void {
  return function closeUnlessLocked(): void {
    if (x.locked === false) {
      x.onClose()
    }
  }
}
