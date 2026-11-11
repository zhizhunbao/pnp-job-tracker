/**
 * me 桶子桶 jobs 的子桶 recommend —— 「今日推荐」这一页签的桶门(父桶 functions / hooks / pickspane.tsx 经这里取)。
 * 2026-10-12 Frank「你分的那些都不算子领域」「recommend 吧」:页面上的一节一个子桶;2026-11-07 随「我的求职」在新域重写,
 * 父桶 functions 过 1000 行闸,照旧切出这一族。依赖只许父桶 → 子桶,子桶不取父桶,常量各自抄、形状本桶自声明。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
export {
  makeLoadPicks, picksOf, titledPicksOf, wageViewOf,
} from './functions'
