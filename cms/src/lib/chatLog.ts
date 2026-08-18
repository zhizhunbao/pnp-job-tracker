/**
 * 对话留痕 —— 把每一轮问答写进 `chat-logs`(collection 见 collections/ChatLogs.ts,DDL 见 docs/sql/chat-logs.sql)。
 *
 * 设计 docs/design/对话Case-Harness方案-20260805.md §1.1:在此之前对话内容一个字都没存,
 * 每天的真实语料在答完的瞬间永久丢失。这张表是复现率仪表盘的数据源。
 *
 * 🔴 两条铁律:
 *   ① **永不影响回答**。写库失败只吞进 console,绝不 throw、绝不 await 在回答路径上 ——
 *      留痕是副产品,不是功能;它挂了用户不该有任何感知。
 *   ② **不存能指向人的东西**。没有 IP、没有 user 关系、没有邮箱。`thread` 是首轮提问的哈希,
 *      只为把一串追问串起来;两个人问同一句话会撞进同一个 thread,这是有意的取舍(§7①)。
 */
import { createHash } from 'node:crypto'
import type { Lang } from './i18n'
import type { ChatResult, ChatTurn } from './chatOrchestrate'

const Q_CAP = 2000      // 入口本来就按 MAX_TEXT=1200 截过,这里只是兜底
const A_CAP = 8000
const THREAD_SEED = 200 // 首轮提问取前 200 字做哈希:后面再长也不影响同一串的归并

/**
 * 同一串追问的 id = **首轮提问文本**的哈希。
 * 为什么不用 IP/UA/session:那三样都指向人,而我们只需要「这几轮是一串」这一个信息。
 * 多轮时 history 的第一条 user 消息就是首轮;首轮自己则拿本次文本。
 */
export function threadId(text: string, history: ChatTurn[] = []): string {
  const first = history.find((h) => h.role === 'user')?.content ?? text
  return createHash('sha256').update(first.trim().slice(0, THREAD_SEED)).digest('hex').slice(0, 16)
}

/** 本串里的第几轮:history 里的 user 消息数 + 1(前端最多回传 6 条,足够看追问深度)。 */
export const turnOf = (history: ChatTurn[] = []): number =>
  history.filter((h) => h.role === 'user').length + 1

export type ChatLogRow = {
  text: string
  lang: Lang
  history?: ChatTurn[]
  result?: ChatResult
  err?: string
  ms: number
}

/**
 * 写一行。**不返回 Promise 给调用方 await** —— 调用方 fire-and-forget,自己吞异常。
 * payload 为空(getPayload 自己挂了)时直接跳过:那种情况下用户已经拿到错误码,留痕不值得再抢救。
 * 走 local API(默认 overrideAccess) —— collection 的 access 对外四把全关,只有这条路进得去。
 */
export function logChat(payload: any, row: ChatLogRow): void {
  if (!payload) return
  const { text, lang, history = [], result, err, ms } = row
  const facts = result?.facts ?? []
  payload.create({
    collection: 'chat-logs',
    data: {
      thread: threadId(text, history),
      turn: turnOf(history),
      lang,
      question: text.slice(0, Q_CAP),
      answer: result?.answer ? result.answer.slice(0, A_CAP) : null,
      noc: result?.slots?.noc ?? null,
      slots: result?.slots ?? null,
      facts: facts.length ? facts : null,
      // 去重保序:一眼看出本轮实际打了哪几个 lookup(D3 给 Fact 加 code 之前,tool 名是唯一稳定的标识)
      tools: facts.length ? [...new Set(facts.map((f) => f.tool))] : null,
      degraded: result?.degraded ?? false,
      err: err ?? null,
      ms: Math.round(ms),
    },
  }).catch((e: unknown) => {
    // 表还没建、库在排队、字段类型不对 —— 都只留一行日志。用户那边什么都不该发生。
    console.log(`[chatlog] skipped: ${e instanceof Error ? e.message.slice(0, 160) : String(e)}`)
  })
}
