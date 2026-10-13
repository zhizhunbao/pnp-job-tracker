/**
 * myjobs 桶的子桶 recommend —— 「我的求职」今日推荐这一节:桶门(父桶 functions / hooks / picks.tsx 经这里取)。
 * 2026-10-12 Frank「你分的那些都不算子领域」「recommend 吧」:原先按函数长相切的 cos / why / ask / today 四个子桶撤掉 ——
 * 删除确认、公司名懒翻三张表都用,回父桶;推荐原因、通道名、显示更多 / 打码行、推荐取数与「删除」(不再推)是「今日推荐」这一节,
 * 并成本子桶(判据同 prefs / thread:页面上的一节)。依赖只许父桶 → 子桶,子桶不取父桶,常量各自抄、形状本桶自声明。
 *
 * @author Frank
 * @time 2026-10-12 22:00:00
 */

export {
  chanNameOf, hiddenPicksOf, lockTopOf, makeDismiss, makeLoadPicks, picksLockedN, picksOf, picksTotalOf, shownPicksOf,
  titledPicksOf, toPicksFact, whyTagsOf,
} from './functions'
