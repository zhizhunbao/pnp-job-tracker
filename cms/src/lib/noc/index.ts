/**
 * NOC 显示域的桶(客户端也安全:登记表在进程内,取词/配色是纯读)。
 * 门里只有转发(闸 door-forward-only)。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

export { catName, colorOf, nocLocalTitle, pickName, registerCatLabels } from './functions'
export type { OccNameRow, PickNameIn } from './types'
