/**
 * pnp 桶的子桶 fit —— 资讯页「申请步骤」按身份与教育经历筛通道的判定(父桶的步骤正文经这里取)。
 * 2026-10-11 申请步骤分区筛选批 1(Frank「可以,开始做第一批」;设计 docs/design/资讯/申请步骤-分区筛选-20261011.md):
 * 父桶 functions.ts 早已超 1000 行(基线存量),新关注点照 apply/letter 的形开子桶;依赖只许父桶 → 子桶,子桶不取父桶,形状本桶自声明。
 * 2026-10-13 整个子桶自 components/pnp/fit 原样搬到 lib/pathways/fit(Frank「做推荐匹配吧」:今日推荐在服务端按档案的身份与教育经历筛,
 * 判定一份 —— 浏览器端的「我的通道」与服务端的推荐同用它,不复制);父桶改成 lib/pathways。
 *
 * @author Frank
 * @time 2026-10-11 23:30:00
 */

export { eduRowsOf, keepStreamOf } from './functions'
export type { EduRow, EduRows, FitsJson, StepsFilter } from './types'
