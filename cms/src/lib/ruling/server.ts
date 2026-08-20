/**
 * 判定域的**服务端**门 —— 取数与接线那半。
 *
 * 🔴 这几支自己**不 import `payload`**:连接池、登录态、六张底表全部由调用方注进来
 * (`loadVerdictTables(db)` / `buildTripleWire({ db, … })` / `caseAnswer({ sql, … })`)。
 * 单独开一个门,只是因为这些名字在浏览器里没有意义 —— 不是因为它们碰得到连接池。
 *
 * 带 `payload` 的进程内 TTL 缓存**不属于本域**,那是路由层的基建,住 `lib/rulingCache.ts`。
 *
 * @author Frank
 * @time 2026-08-20 18:12:30
 */

export {
  buildTripleWire, caseAnswer, casePages, loadVerdictTables,
} from './functions'

export type {
  AnswerBag, CaseAnswer, CasePageSpec, ClientAnswers, DesignatedEmployerRow, DesignatedLoader,
  OpsFacts, Queryable, Row, Sql, TripleWire, TripleWireResult, VerdictData,
} from './types'
