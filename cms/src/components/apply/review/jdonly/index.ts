/**
 * review 的子桶 jdonly —— 只取职位描述(不改写、不核对的那一屏用),和不做事的两只手柄。
 * 2026-11-11 Frank「这两个能共用一个样式和弹框吗」:基础简历投递屏改用三栏外框,右栏的职位描述要自己取一次;
 * review 的 functions.ts 贴着 1000 行的线,这几件切成子桶。依赖只许 review → 本子桶(经 index.ts),本子桶不取 review 的任何东西。
 *
 * @author Frank
 * @time 2026-11-12 03:00:00
 */

export { loadJdOnly, noopFixOf, noopPick } from './functions'
