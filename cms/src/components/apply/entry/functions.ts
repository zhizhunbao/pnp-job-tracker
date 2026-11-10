/**
 * apply 子桶 entry 的行为:按起始态定投递框开在哪一屏、没额度时要不要直接出升级框、换屏。
 * 2026-11-09 Frank 定的投递动线:点「邮箱投递」先在服务端查基础简历和额度,再决定开什么 ——
 * 生成过的直接看保存的那一版;免费有额度出两个选择;会员直接改写;没额度出升级框(框里能直接投基础简历)。
 * 父桶 functions.ts 贴着 1000 行,新关注点照 letter 的形开子桶;依赖只许父桶 → 子桶,要用的常量各自抄、形状本桶自声明。
 *
 * @author Frank
 * @time 2026-11-09 23:30:00
 */
import {
  DATE_LEN, KEY_LEFT_FREE, KEY_LEFT_PRO, KEY_OUT_FREE, KEY_OUT_PRO, MODE_BASE, MODE_CHOOSE, MODE_TAILOR, PLAN_PRO,
  SENT_STATUSES, STEP_LETTER, STEP_RESUME, TEXT_NONE,
} from './constants'
import type {
  BaseLetterIn, BaseStepIn, EntryStart, LeftAfter, MaybeEntryStart, ModeMakeIn, OutReason, StartModeIn,
} from './types'

/**
 * 投递框开在哪一屏。
 *
 * @param x 起始态与是不是从升级框进来的。
 * @returns 屏名。
 */
export function startModeOf(x: StartModeIn): string {
  if (x.base) {
    return MODE_BASE
  }
  if (x.start.tailored) {
    return MODE_TAILOR
  }
  if (x.start.credit.left <= 0) {
    return MODE_BASE
  }
  if (x.start.credit.plan === PLAN_PRO) {
    return MODE_TAILOR
  }
  return MODE_CHOOSE
}

/**
 * 是不是该直接出升级框:有基础简历、还没发出、这一岗没生成过、额度用完。
 *
 * @param start 起始态;还没到是 null。
 * @returns 该出升级框。
 */
export function isOutOf(start: MaybeEntryStart): boolean {
  if (start == null || start.resumes.length === 0 || SENT_STATUSES.includes(start.status)) {
    return false
  }
  return start.tailored === false && start.credit.left <= 0
}

/**
 * 没额度时升级框上的说明。
 *
 * @param start 起始态;还没到是 null。
 * @returns 词条键与恢复日。
 */
export function outReasonOf(start: MaybeEntryStart): OutReason {
  if (start == null || start.credit.plan !== PLAN_PRO || start.credit.resetAt == null) {
    return { key: KEY_OUT_FREE, d: TEXT_NONE }
  }
  return { key: KEY_OUT_PRO, d: start.credit.resetAt.slice(0, DATE_LEN) }
}

/**
 * 是不是会员档(会员的升级框不出购买卡)。
 *
 * @param start 起始态;还没到是 null。
 * @returns 是会员档。
 */
export function isMemberOf(start: MaybeEntryStart): boolean {
  return start != null && start.credit.plan === PLAN_PRO
}

/**
 * 三屏框页脚那一句「还剩几个额度」(2026-11-09 Frank「投递框第一屏显示剩余额度」;页脚只在这一岗写成之后才出):
 * 进框时没生成过的,写成后扣掉这一个;生成过的不再扣。
 *
 * @param start 起始态。
 * @returns 词条键与个数。
 */
export function leftAfterOf(start: EntryStart): LeftAfter {
  let n = start.credit.left
  if (start.tailored === false) {
    n = Math.max(0, n - 1)
  }
  if (start.credit.plan === PLAN_PRO) {
    return { key: KEY_LEFT_PRO, n }
  }
  return { key: KEY_LEFT_FREE, n }
}

/**
 * 基础简历投递屏开出来时的信:没生成过本岗版本、又存着草稿的接着用草稿,其余用固定模板填好的那一封。
 *
 * @param x 草稿信、模板信与生成过没有。
 * @returns 信。
 */
export function baseLetterOf(x: BaseLetterIn): string {
  if (x.tailored === false && x.draftCover.trim() !== TEXT_NONE) {
    return x.draftCover
  }
  return x.baseCover
}

/**
 * 基础简历投递屏该落在父桶的哪一步:没生成过本岗版本的落「求职信」步,父桶的离页 / 离手存草稿才会存;
 * 生成过的留在第一步不存,免得模板信盖掉生成的那一封。
 *
 * @param x 现在的步骤、屏与生成过没有。
 * @returns 步骤。
 */
export function baseStepOf(x: BaseStepIn): string {
  if (x.mode === MODE_BASE && x.tailored === false && x.step === STEP_RESUME) {
    return STEP_LETTER
  }
  return x.step
}

/**
 * 造换屏手柄;换到基础简历投递屏时把信换成那一屏的信。
 *
 * @param x 整机的那几格与目标屏。
 * @returns 点击手柄。
 */
export function makeMode(x: ModeMakeIn): () => void {
  return function onMode(): void {
    const c = x.cells
    c.setErr(TEXT_NONE)
    if (x.mode === MODE_BASE) {
      c.setLetter(baseLetterOf({ draftCover: c.draftCover, baseCover: c.baseCover, tailored: c.tailored }))
      c.setStep(baseStepOf({ step: c.step, mode: x.mode, tailored: c.tailored }))
    }
    c.setMode(x.mode)
  }
}
