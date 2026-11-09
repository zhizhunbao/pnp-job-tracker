/**
 * ops 桶的子桶 write —— 调度器上报与运维页删除的写入件。依赖只许父桶 → 子桶。
 *
 * @author Frank
 * @time 2026-11-08 23:59:00
 */

export { removeItem, saveUnit, toRemoveFact, toUnitFact } from './functions'
export type { RemoveJson, UnitJson } from './types'
