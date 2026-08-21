/**
 * 判定域的**服务端**门 —— 取数与接线那半。
 *
 * `functions.ts` 里那几支自己**不 import `payload`**:连接池、登录态、六张底表全部由调用方
 * 注进来(`loadVerdictTables(db)` / `buildTripleWire({ db, … })` / `caseAnswer({ db, … })`)。
 *
 * `queries.ts` 是域里唯一**自己去连库**的文件(取池、两份 TTL 缓存、读登录态)。
 * 分成两个文件而不是并进 `functions.ts`,理由与两个门同源:`functions.ts` 沾上 `payload`
 * 就会把连接池打进浏览器包(tsc 全绿、只有 `build` 才炸)。
 * 先例是 `lib/score/scoreTables.ts` 之于 `lib/score/server.ts`。
 *
 * @author Frank
 * @time 2026-08-20 18:12:30
 */

export {
  buildTripleWire, caseAnswer, casePages, employerVerdict, getDesignatedEmployers, getVerdictData,
  jobPathways, loadVerdictTables, matchDesignation, pathLevers, pathVerdict, tripleVerdict,
  tripleWireOf,
} from './functions'

export type {
  AnswerBag, CaseAnswer, CasePageSpec, ClientAnswers, DesignatedEmployerRow, DesignatedLoader,
  EmployerFacts, EmployerVerdict, NameRow, OccupationRow, OpsFacts, PathLeverOpts, PathwayVerdict,
  Queryable, ReqRow, Row, Sql, TripleCard, TripleCompany, TripleJob, TripleProfile, TripleWire,
  TripleWireResult, VerdictData, VerdictDrawRow, VerdictLever, VerdictProfile, VerdictReason,
} from './types'
