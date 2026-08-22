/**
 * 判定域的桶 —— **浏览器也能跑的那半**。
 *
 * 门里只有转发,一个函数都没有(宪法「两个门的域怎么摆」)。
 *
 * 🔴 **这个门一个函数都不转发**,只有案例清单与类型 —— 因为 `functions.ts` 现在自己去连库
 * (`getDb`、`next/headers`),而 `Cases.tsx` 是 `'use client'` 且取的是**值**。
 * 只要这个门碰一下 `functions.ts`,连接池就跟着进浏览器包(tsc 全绿、只有 `build` 才炸)。
 * 判定函数一律走 `./server`。
 *
 * @author Frank
 * @time 2026-08-20 18:12:00
 */

export {
  CASES,
} from './constants'

export type {
  DesignatedEmployerRow, EmployerFacts, EmployerVerdict, NameRow, OccupationRow, PathLeverOpts, PathwayVerdict,
  ReqRow, TripleCard, TripleCompany, TripleCompareRow, TripleJob, TripleProfile, TripleRow, VerdictData,
  VerdictDrawRow, VerdictLever, VerdictProfile, VerdictReason,
} from './types'
