/**
 * 答题域的**服务端**门 —— 热门职业清单缓存,要连库,只能在服务端跑。
 * 门里只有转发(闸 door-forward-only)。
 *
 * 🔴 为什么单独一扇门:三条路由芯要连库;getTopNocsCached 批②注入化后本身已纯,
 * 但它的两个调用方(route/instrumentation)都在服务端,留在这扇门里。原先它
 * 依赖链上挂着 `../jobs/server`,
 * 而题库的字段/答案/判定那三支是纯数据,`'use client'` 组件也在用 ——
 * 混一个桶就会把服务端链整条拉进浏览器包(tsc 全绿,build 才炸,lib/jobs 08-18 实撞)。
 *
 * @author Frank
 * @time 2026-08-19 02:12:57
 */

export { getTopNocsCached } from './functions'
export { quizAnswersGetRoute, quizAnswersPutRoute, quizRoute } from './routes'
