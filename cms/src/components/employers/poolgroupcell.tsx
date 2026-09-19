'use client'
/**
 * 域内哑单元格:雇主板「行业」列 —— 洗行时算好的行业组名,没有就渲灰色横杠
 * (2026-09-18 Frank「雇主后面加一个行业列吧」;词与「选择行业」下拉同一套)。
 * 同日 Frank「这个应该是 EE 类别,不是人们正常用的大类别吧」「现在的行业改成 EE 类别」:这八组是照联邦 EE 类别抽选分的,
 * 列头与下拉首项改叫「EE 类别」,「行业」一词留给将来的公司行业分类。
 * 2026-09-18 晚 Frank「EE 类别 改成可选列」:默认不显,字段面板里勾 —— EE 类别分的是职业不是雇主,只招一两个岗的雇主
 * (Town of High Level 招了个 IT 岗就显示 STEM)这一格近乎随机;下拉筛选照留。
 *
 * @author Frank
 * @time 2026-09-18 20:00:00
 */
import { TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import type { EmployerCellRow } from './types'

/**
 * 渲染行业格。
 *
 * @param r 这一行的展示行。
 * @returns 一行文字,或灰色横杠。
 */
export function PoolGroupCell(r: EmployerCellRow) {
  return <DashText v={{ text: r.groupText, cls: TEXT_NONE }} />
}
