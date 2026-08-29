'use client'
/**
 * quiz 域的结构:答题壳的全局样式注入件。
 * 答题壳 = 全站答题页共用的外观(题干 / 进度 / 选项 / 底部动作条)。Frank 2026-08-03
 * 「保证所有答题页面一致,包括选工作」—— 一致的做法不是两边照着抄一遍样式,
 * 而是**同一个组件**:选工作页(OccPicker)与四选一那几页(QuizForm)渲染的是同一批
 * DOM 与同一段 CSS,想不一致都不行。以前那套「样式写两处」正是「下一题位置不统一」
 * 「胶囊跑偏」的土壤。
 * 这一层是 2026-08-03 撤掉 SurveyJS 之后自己出的(那个框架 1.43 MB JS + 306 KB CSS,
 * 换来的只是 10 道单选题的翻页,而站内为了压它的默认样式写了 25 处 .sd-* 覆盖)。
 *
 * 🔴 **跨桶共用类,不许迁 module.css**(2026-08-28 记):这一段注的是全局类,
 * 其中 `.plQuizPad` 由 plan 桶按类名字符串在用、`.qzFill` 由 jobs 桶按字符串在用、
 * `.quizBar` 由 chat 桶的吸底避让测量按特征扫到 —— 等同 main.css 的一段,是跨桶契约。
 * 要迁 module.css 得连消费桶一起改,另立专批;本批只把这段死值从 tsx 顶层挪进
 * constants.ts(`no-constant-in-tsx`),类名与值一格未动。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { QUIZ_CSS } from './constants'

/**
 * 把答题壳的全局样式注进页面。
 *
 * @returns 一枚 `<style>`。
 */
export function QuizStyle() {
  return <style>{QUIZ_CSS}</style>
}
