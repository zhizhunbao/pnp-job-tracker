/**
 * 额度子桶的形状:额度账、会员当期、记账与重新生成计数的入参。
 *
 * @author Frank
 * @time 2026-11-09 21:00:00
 */
import type { Db } from '@/lib/db'

// =========================================================================
// 1. 额度
// =========================================================================

/**
 * 额度档。
 */
export type CreditPlan = 'free' | 'pro'

/**
 * 用户 id。
 */
export type UserId = string | number

/**
 * 可能没有的时刻(ISO 串)。
 */
export type MaybeIso = string | null

/**
 * 会员当期:从哪一刻到哪一刻。
 */
export type Period = {
  /**
   * 当期开始(ISO 串)。
   */
  startIso: string

  /**
   * 当期结束,也就是额度恢复的时刻(ISO 串)。
   */
  endIso: string
}

/**
 * 会员当期;不是会员是 null。
 */
export type MaybePeriod = Period | null

/**
 * `periodOf` 的入参。
 */
export type PeriodIn = {
  /**
   * 会员到期日;从没买过是 null。
   */
  proUntil: MaybeIso

  /**
   * 现在(毫秒时间戳)。
   */
  nowMs: number
}

/**
 * 额度用量的库行。
 */
export type CreditDbRow = {
  /**
   * 免费额度用了几个。
   */
  free_used: number | string | null

  /**
   * 会员当期用了几个。
   */
  pro_used: number | string | null

  /**
   * 这一个职位记过账没有。
   */
  here: boolean | null
}

/**
 * 额度用量(洗净)。
 */
export type CreditUse = {
  /**
   * 免费额度用了几个。
   */
  freeUsed: number

  /**
   * 会员当期用了几个。
   */
  proUsed: number

  /**
   * 这一个职位记过账没有(记过的再写不另算)。
   */
  here: boolean
}

/**
 * 一个人对一个职位的额度账。
 */
export type CreditFact = {
  /**
   * 额度档。
   */
  plan: CreditPlan

  /**
   * 用了几个(免费是终身累计,会员是当期)。
   */
  used: number

  /**
   * 一共几个。
   */
  max: number

  /**
   * 还剩几个,不低于 0。
   */
  left: number

  /**
   * 这一个职位记过账没有。
   */
  here: boolean

  /**
   * 额度哪一刻恢复;免费额度终身一次,没有恢复日。
   */
  resetAt: MaybeIso
}

/**
 * `creditOf` 的入参。
 */
export type CreditOfIn = {
  /**
   * 用量。
   */
  use: CreditUse

  /**
   * 会员当期;不是会员是 null。
   */
  period: MaybePeriod
}

/**
 * `loadCredit` 的入参。
 */
export type CreditIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 职位 id。
   */
  jobId: number

  /**
   * 会员到期日;从没买过是 null。
   */
  proUntil: MaybeIso

  /**
   * 现在(毫秒时间戳)。
   */
  nowMs: number
}

/**
 * `loadCredit` 的返回。
 */
export type CreditOut = Promise<CreditFact>

/**
 * `markCredit` 的入参。
 */
export type CreditMarkIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 职位 id。
   */
  jobId: number

  /**
   * 记在哪一档名下。
   */
  plan: CreditPlan
}

/**
 * 只写不读的返回。
 */
export type WriteOut = Promise<void>

/**
 * `creditLeftOf` 的入参。
 */
export type CreditLeftIn = {
  /**
   * 动手之前的额度账。
   */
  credit: CreditFact

  /**
   * 这一次是不是写成并记了账。
   */
  marked: boolean
}

// =========================================================================
// 2. 重新生成
// =========================================================================

/**
 * `regenMaxOf` 的入参。
 */
export type RegenMaxIn = {
  /**
   * 额度档。
   */
  plan: CreditPlan
}

/**
 * `takeRegen` 的入参。
 */
export type RegenIn = {
  /**
   * 数据库连接(调用方注入)。
   */
  db: Db

  /**
   * 用户 id。
   */
  userId: UserId

  /**
   * 职位 id。
   */
  jobId: number

  /**
   * 哪一份文件(步骤名)。
   */
  step: string

  /**
   * 今天最多几次。
   */
  max: number
}

/**
 * `takeRegen` 的返回:占到了没有。
 */
export type RegenOut = Promise<boolean>

/**
 * 重新生成计数的库行。
 */
export type RegenDbRow = {
  /**
   * 今天第几次。
   */
  n: number | string | null
}
