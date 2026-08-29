'use client'
/**
 * 担保雇主表(named 表)「雇主门槛」列的单元格:渲染公司事实 × 该省官方雇主侧门槛
 * 判出的三态,外加公共部门旁路(B4,design/雇主省提名门槛判定-20260808.md)。
 * 🔴 「待核」**不是「不满足」**,是我们查不到 —— 所以它用灰色 + 常规字重,不许被读成
 * 一个判定结果;整批全是「待核」时这一列压根不进列组(判在 hasVerdictSignal)。
 * 显示什么话、用哪一档色,都在洗展示行的时候算完了,本文件只渲。
 * 2026-08-27 换装批自 Sponsors.tsx 的 verdict 列 render 提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import type { SponsorCellRow } from './types'

/**
 * 渲染担保雇主表「雇主门槛」列的一个单元格。
 *
 * @param r 这一行的展示行。
 * @returns 判定文案(带它那一档色)。
 */
export function VerdictCell(r: SponsorCellRow) {
  return <span className={r.verdict.cls}>{r.verdict.text}</span>
}
