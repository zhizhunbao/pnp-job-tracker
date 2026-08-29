'use client'
/**
 * quiz 域的结构:选职业控件的全局样式注入件。
 *
 * 🔴 **跨桶共用类,不许迁 module.css**(2026-08-28 记):`.occPill` 与 `.occSelectedChip`
 * 由 modal 桶按类名字符串在用(`modal/constants.ts` 的 `DRAG_IGNORE_SEL` —— 拖动弹框时
 * 点在这两种件上不许起拖)。整段与 QuizStyle 同办法处理:注入机制、类名、值一格不改;
 * 要迁 module.css 得连 modal 桶一起改,另立专批。
 * 本批只把这段死值从 OccPicker 的组件体里挪进 constants.ts(tsx 不许住模板字面量常量,
 * 也不许在组件体里散着),内容逐字未动。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { OCC_CSS } from './constants'

/**
 * 把选职业控件的全局样式注进页面。
 *
 * @returns 一枚 `<style>`。
 */
export function OccStyle() {
  return <style>{OCC_CSS}</style>
}
