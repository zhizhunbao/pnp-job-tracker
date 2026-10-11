/**
 * 通知域(lib/notify)的形状:清单库行 → 洗净 → 对外行三段律,今日推荐的注入口,各函数的入参与结果。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */
import type { Db } from '../db'

/**
 * 用户 id(payload 的主键两形)。
 */
export type NotifyUserId = string | number

/**
 * 清单一行的库行。
 */
export type NotifyDbRow = {
  /**
   * 种类:reply / bounced / sent / picks。
   */
  kind: string | null

  /**
   * 指向哪一行:回信 = 信 id,退信 / 已发出 = 投递行 id,今日推荐 = 0。
   */
  ref_id: number | string | null

  /**
   * 公司名(回信对不上投递时是发件人名或地址;今日推荐空串)。
   */
  label: string | null

  /**
   * 发生的时刻。
   */
  at: Date | string | null

  /**
   * 比上次看铃铛新。
   */
  unseen: boolean | null
}

/**
 * 清单一行(洗净)。
 */
export type NotifyFact = {
  /**
   * 种类。
   */
  kind: string

  /**
   * 指向哪一行。
   */
  id: number

  /**
   * 公司名。
   */
  label: string

  /**
   * 发生的时刻(ISO)。
   */
  at: string

  /**
   * 比上次看铃铛新。
   */
  unseen: boolean
}

/**
 * 清单一行(对外)。
 */
export type NotifyRow = {
  /**
   * 种类:reply / bounced / sent / picks。
   */
  kind: string

  /**
   * 指向哪一行(今日推荐 = 0)。
   */
  id: number

  /**
   * 公司名(今日推荐空串)。
   */
  label: string

  /**
   * 今日推荐几条(别的种类 0)。
   */
  n: number

  /**
   * 发生的时刻(ISO)。
   */
  at: string

  /**
   * 比上次看铃铛新。
   */
  unseen: boolean
}

/**
 * GET /api/notify 的回包。
 */
export type NotifyJson = {
  /**
   * 清单,新的在前。
   */
  items: NotifyRow[]

  /**
   * 几条没看过(铃铛上的红色数字)。
   */
  unseen: number
}

/**
 * loadNotify 的入参。
 */
export type NotifyIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 用户 id(会话里的)。
   */
  userId: NotifyUserId

  /**
   * 今日推荐几条(0 = 那一条不出)。
   */
  picks: number
}

/**
 * loadNotify 的结果。
 */
export type NotifyOut = Promise<NotifyJson>

/**
 * notifyJsonOf 的入参。
 */
export type NotifyJsonIn = {
  /**
   * 洗净的清单(库里排好序的)。
   */
  facts: NotifyFact[]

  /**
   * 今日推荐几条。
   */
  picks: number
}

/**
 * markSeen 的入参。
 */
export type SeenIn = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 用户 id(会话里的)。
   */
  userId: NotifyUserId
}

/**
 * 写库没有返回值。
 */
export type WriteOut = Promise<void>

/**
 * 今日推荐取数函数的入参(与 lib/myjobs 的 getPicks 入参同形,本域自抄)。
 */
export type PicksArg = {
  /**
   * 能查的连接。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: NotifyUserId

  /**
   * 预选省码(空串 = 不知道)。
   */
  prov: string

  /**
   * 是不是 Pro。
   */
  pro: boolean

  /**
   * 不用当天缓存(铃铛恒 false:跟「我的求职」共用当天那一份)。
   */
  fresh: boolean
}

/**
 * 今日推荐取数函数的回包(只读两格:看得见的条与还有几条)。
 */
export type PicksView = {
  /**
   * 看得见的推荐(只数条数,形状不读)。
   */
  picks: object[]

  /**
   * 还有几条(免费号锁住的)。
   */
  more: number
}

/**
 * 今日推荐取数函数(lib/myjobs 的 getPicks,由 routes 注入)。
 */
export type PicksFn = (x: PicksArg) => Promise<PicksView>

/**
 * countPicks 的入参。
 */
export type CountPicksIn = {
  /**
   * 取数函数的入参。
   */
  arg: PicksArg

  /**
   * 取数函数。
   */
  getPicks: PicksFn
}

/**
 * countPicks 的结果。
 */
export type CountOut = Promise<number>
