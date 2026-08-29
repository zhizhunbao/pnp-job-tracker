'use client'
/**
 * 域内小件:结果表右列(简历现状)的单元格 —— 记号 + 判定备注,命中绿、缺失红。
 * 哑单元格:记号与色档类都由行构造器 toMatchRow 算好挂在展示行上,这里只管渲
 * (2026-08-27 Frank 打回 make*Cell 工厂后的形:单参收展示行、零闭包零工厂)。
 * 2026-08-28 换装批自 ResumeMatchModal.tsx 的列声明 render 位提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 17:53:00
 */
import type { MatchRowFact } from './types'

/**
 * 渲染右列里属于这条要求的那一个单元格。
 *
 * @param r 这一行展示行。
 * @returns 带色档的一句判定。
 */
export function MatchResCell(r: MatchRowFact) {
  return <span className={r.cls}>{r.text}</span>
}
