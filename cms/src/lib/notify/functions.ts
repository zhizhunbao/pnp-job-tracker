/**
 * 通知域(lib/notify)的行为:顶栏铃铛的清单(雇主回信、退信、近 7 天发出的投递、今日推荐)从既有表按人现查一条,
 * 比「上次看铃铛」新的算未读;打开面板记一次「看过了」。
 * 池由调用方注进来(方案 A);今日推荐的取数函数(lib/myjobs 的 getPicks,按人按天缓存)由 routes 注入,不跨域取。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */
import { count, queryRows, SQL, text } from '../db'
import { KIND_PICKS, NOTIFY_LIMIT, SENT_DAYS, TEXT_NONE } from './constants'
import type {
  CountOut, CountPicksIn, NotifyDbRow, NotifyFact, NotifyIn, NotifyJson, NotifyJsonIn, NotifyOut, NotifyRow, SeenIn,
  WriteOut,
} from './types'

/**
 * 本人的通知清单与未读数。每段都按会话里的用户 id 收窄(SQL 第一个参数)。
 *
 * @param x 连接、用户 id 与今日推荐几条。
 * @returns 清单与未读数。
 */
export async function loadNotify(x: NotifyIn): NotifyOut {
  const facts = await queryRows({
    db: x.db, sql: SQL.NOTIFY_LIST, params: [x.userId, NOTIFY_LIMIT, SENT_DAYS], map: toNotifyFact,
  })
  return notifyJsonOf({ facts, picks: x.picks })
}

/**
 * 清单库行 → 洗净(行构造器:缺席的文字格按空串、时刻转 ISO)。
 *
 * @param r 库行。
 * @returns 一行。
 */
export function toNotifyFact(r: NotifyDbRow): NotifyFact {
  let at = TEXT_NONE
  if (r.at instanceof Date) {
    at = r.at.toISOString()
  } else if (r.at != null) {
    at = r.at
  }
  return { kind: text(r.kind), id: count(r.ref_id), label: text(r.label), at, unseen: r.unseen === true }
}

/**
 * 洗净的清单 → 回包:今日推荐那一行补上条数(0 条就丢),截到上限,数没看过的。
 *
 * @param x 清单与今日推荐几条。
 * @returns 回包。
 */
export function notifyJsonOf(x: NotifyJsonIn): NotifyJson {
  const items: NotifyRow[] = []
  for (const f of x.facts) {
    if (items.length >= NOTIFY_LIMIT) {
      break
    }
    if (f.kind === KIND_PICKS && x.picks <= 0) {
      continue
    }
    let n = 0
    if (f.kind === KIND_PICKS) {
      n = x.picks
    }
    items.push({ kind: f.kind, id: f.id, label: f.label, n, at: f.at, unseen: f.unseen })
  }
  let unseen = 0
  for (const it of items) {
    if (it.unseen) {
      unseen += 1
    }
  }
  return { items, unseen }
}

/**
 * 今日推荐几条(看得见的 + 锁住的;跟「我的求职」共用当天那一份缓存)。
 *
 * @param x 取数函数与它的入参。
 * @returns 条数。
 */
export async function countPicks(x: CountPicksIn): CountOut {
  const v = await x.getPicks(x.arg)
  return v.picks.length + v.more
}

/**
 * 记本人看过铃铛了。
 *
 * @param x 连接与用户 id。
 * @returns 无。
 */
export async function markSeen(x: SeenIn): WriteOut {
  await x.db.query(SQL.NOTIFY_SEEN, [x.userId])
}
