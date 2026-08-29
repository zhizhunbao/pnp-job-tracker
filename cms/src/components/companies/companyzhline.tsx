'use client'
/**
 * 中文对照行(#185 Frank「点了才在下面显示中文」):英文段下挂的那条蓝竖条译文,
 * 与 JD 逐句对照同规范 —— 同一件事只有一副皮,公司简介不自造。
 * 2026-08-28 拆域批自 jobs/Company.tsx 的 zhBlock 闭包重写成件。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { zhLineClsOf } from './functions'
import type { CompanyZhLineIn } from './types'

/**
 * 一条中文对照。
 *
 * @param props 译文与散文态(逐格注释见 CompanyZhLineIn)。
 * @returns 译文行。
 */
export function CompanyZhLine({ text, prose = false }: CompanyZhLineIn) {
  return <div className={zhLineClsOf({ prose })}>{text}</div>
}
