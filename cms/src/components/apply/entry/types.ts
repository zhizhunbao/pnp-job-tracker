/**
 * apply 子桶 entry 的形状:子桶读的那几格起始态与整机状态(父桶形状的子集,本桶自声明)、各函数入参。
 *
 * @author Frank
 * @time 2026-11-09 23:30:00
 */

/**
 * 写状态的手柄。
 */
export type SetFn<T> = (v: T) => void

/**
 * 起始态里的额度(只声明真读的格)。
 */
export type EntryCredit = {
  /**
   * 额度档。
   */
  plan: string

  /**
   * 还剩几个。
   */
  left: number

  /**
   * 额度哪一刻恢复(ISO);免费额度没有恢复日。
   */
  resetAt: string | null
}

/**
 * 起始态(只声明真读的格;简历清单只数个数,不读里面)。
 */
export type EntryStart = {
  /**
   * 额度。
   */
  credit: EntryCredit

  /**
   * 这一岗生成过本岗简历没有。
   */
  tailored: boolean

  /**
   * 这一岗的投递状态(没投过 = 空串)。
   */
  status: string

  /**
   * 简历清单。
   */
  resumes: object[]
}

/**
 * 可能还没到的起始态。
 */
export type MaybeEntryStart = EntryStart | null

/**
 * `startModeOf` 的入参。
 */
export type StartModeIn = {
  /**
   * 起始态。
   */
  start: EntryStart

  /**
   * 是不是从升级框点「不改写,直接投基础简历」进来的。
   */
  base: boolean
}

/**
 * 没额度时升级框上的说明:词条键与恢复日。
 */
export type OutReason = {
  /**
   * 词条键。
   */
  key: string

  /**
   * 恢复日(年-月-日;免费额度没有 = 空串)。
   */
  d: string
}

/**
 * 「还剩几个额度」那一句:词条键与个数。
 */
export type LeftAfter = {
  /**
   * 词条键。
   */
  key: string

  /**
   * 还剩几个。
   */
  n: number
}

/**
 * `baseLetterOf` 的入参。
 */
export type BaseLetterIn = {
  /**
   * 这一岗存着的草稿信(没有 = 空串)。
   */
  draftCover: string

  /**
   * 固定模板填好的信。
   */
  baseCover: string

  /**
   * 这一岗生成过本岗简历没有。
   */
  tailored: boolean
}

/**
 * `baseStepOf` 的入参。
 */
export type BaseStepIn = {
  /**
   * 现在的步骤。
   */
  step: string

  /**
   * 在哪一屏。
   */
  mode: string

  /**
   * 这一岗生成过本岗简历没有。
   */
  tailored: boolean
}

/**
 * 子桶读写的那几格整机状态(父桶 ApplyCells 的子集)。
 */
export type EntryCells = {
  /**
   * 现在的步骤。
   */
  step: string

  /**
   * 这一岗生成过本岗简历没有。
   */
  tailored: boolean

  /**
   * 固定模板填好的信。
   */
  baseCover: string

  /**
   * 这一岗存着的草稿信。
   */
  draftCover: string

  /**
   * 换屏。
   */
  setMode: SetFn<string>

  /**
   * 改信。
   */
  setLetter: SetFn<string>

  /**
   * 改步骤。
   */
  setStep: SetFn<string>

  /**
   * 改错误。
   */
  setErr: SetFn<string>
}

/**
 * `makeMode` 的入参。
 */
export type ModeMakeIn = {
  /**
   * 整机的那几格。
   */
  cells: EntryCells

  /**
   * 换到哪一屏。
   */
  mode: string
}
