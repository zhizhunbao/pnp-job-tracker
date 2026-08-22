/**
 * 雇主域的桶 —— **浏览器也能打包的那半**:筛选枚举、对比栏的存取键、行形状。
 * `Employers.tsx` / `Sponsors.tsx` / `Compare.tsx` 是 `'use client'` 且取的是**值**
 * (EMP_PROGRAMS / CMP_KEY),混进服务端依赖会把连接池整条链拉进浏览器包
 * (tsc 全绿,build 才炸 —— lib/jobs 08-18 实撞)。
 * 门里只有转发(闸 door-forward-only);外部一律从两个门取,测试例外直接点文件。
 *
 * @author Frank
 * @time 2026-08-21 23:20:43
 */

export { CMP_KEY, CMP_MAX, EMP_PROGRAMS } from './constants'
export type {
  CompareRow, CompanyResearch, EmployerFilters, EmployerMode, EmployerPage, EmployerRow, OccRow,
  SponsorBoards, SponsorEmployerRow,
} from './types'
