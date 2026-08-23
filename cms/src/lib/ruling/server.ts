/**
 * 判定域的**服务端**门 —— 取数与接线那半。
 *
 * `functions.ts` 里那几支自己**不 import `payload`**:连接池、登录态、六张底表全部由调用方
 * 注进来(`loadVerdictTables(db)` / `buildTripleWire({ db, … })` / `caseAnswer({ db, … })`)。
 *
 * 但域里还有三支**自己去连库**的(取池、两份 TTL 缓存、读登录态):`getVerdictData`、
 * `getDesignatedEmployers`、`tripleWireOf`。它们原先住 `queries.ts`,2026-08-20 并进
 * `functions.ts` —— 一个域只许那九个文件名(闸 `domain-file-names`)。
 * 代价是这个域的 `functions.ts` 从此沾着 `payload`,所以 `./index` 一个函数都不敢转发。
 *
 * @author Frank
 * @time 2026-08-20 18:12:30
 */

export {
  buildTripleWire, caseAnswer, casePages, employerVerdict, getDesignatedEmployers, getVerdictData,
  jobPathways, loadVerdictTables, matchDesignation, pathLevers, pathVerdict, tripleVerdict,
  tripleWireOf,
} from './functions'
export { rulingPathwaysRoute, rulingVerdictGetRoute, rulingVerdictPostRoute } from './routes'

export type {
  AnswerBag, CaseAnswer, CasePageSpec, ClientAnswers, DesignatedEmployerRow, DesignatedLoader, EmployerFacts,
  EmployerVerdict, NameRow, OccupationRow, OpsFacts, PathLeverOpts, PathwayVerdict, ReqRow, Row, TripleCard,
  TripleCompany, TripleJob, TripleProfile, TripleWire, TripleWireResult, VerdictData, VerdictDrawRow,
  VerdictLever, VerdictProfile, VerdictReason,
} from './types'
