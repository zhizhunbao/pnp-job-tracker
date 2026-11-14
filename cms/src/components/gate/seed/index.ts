/**
 * gate 桶的子桶 seed —— 修改面板的外壳自己取档案当起始答案(父桶 hooks 经这里取)。
 * 2026-11-12:依赖只许父桶 → 子桶,子桶不取父桶任何东西。
 * 2026-11-13 Frank「别等一周啊 都做完」:多转出 pullSeed(只取不落格),父桶把它注给子桶 fill 的两条无界面的路。
 *
 * @author Frank
 * @time 2026-11-12 20:00:00
 */

export { loadSeed, pullSeed } from './functions'
