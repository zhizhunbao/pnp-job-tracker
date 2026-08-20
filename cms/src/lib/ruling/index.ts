/**
 * 判定域的桶 —— **浏览器也能跑的那半**。
 *
 * 门里只有转发,一个函数都没有(宪法「两个门的域怎么摆」)。
 * 要连库的那半在 `./server`;分界不是风格,是**对外露哪几个名字** ——
 * `functions.ts` 本身不 import `payload`,连接池一律由调用方注进来。
 *
 * @author Frank
 * @time 2026-08-20 18:12:00
 */

export {
  CASES,
} from './constants'

export {
  employerVerdict, jobPathways, matchDesignation, pathLevers, pathVerdict, tripleVerdict,
} from './functions'

export type {
  DesignatedEmployerRow, EmployerFacts, EmployerVerdict, NameRow, OccupationRow,
  PathLeverOpts, PathwayVerdict, ReqRow,
  TripleCard, TripleCompany, TripleCompareRow, TripleJob, TripleProfile, TripleRow,
  VerdictData, VerdictDrawRow, VerdictLever, VerdictProfile, VerdictReason,
} from './types'
