/**
 * 档案域的形状 —— 本域自己声明(键白名单在 constants,与 collections/Users.ts 对齐)。
 *
 * @author Frank
 * @time 2026-08-22 19:27:15
 */

/**
 * profile group 的全字段形状(写库口径;「没有」显式 null)。
 */
export type ProfileFields = {
  /**
   * 当前身份(overseas / 学签在读等枚举)。
   */
  currentStatus: string | null

  /**
   * 档案职业码清单。
   */
  nocCodes: string[] | null

  /**
   * CLB 档。
   */
  clb: number | null

  /**
   * CRS 估分。
   */
  crs: number | null

  /**
   * 目标省清单。
   */
  targetProvinces: string[] | null

  /**
   * PGWP 剩余月数。
   */
  pgwpMonthsLeft: number | null

  /**
   * 档案更新时刻。
   */
  profileUpdatedAt: Date | string | null

  /**
   * 简历文本(G3)。
   */
  resumeText: string | null

  /**
   * 简历保存时刻。
   */
  resumeSavedAt: Date | string | null

  /**
   * 免费匹配日用量游标(`YYYY-MM-DD:n`)。
   */
  matchUses: string | null
}

/**
 * 局部更新的形状:出现的键才写(Partial 的缺席语义就是「不动这格」,
 * 不引入 undefined 进自家字段声明)。
 */
export type ProfilePatch = Partial<ProfileFields>

/**
 * patch 一格的取值(ProfileFields 各字段类型的并集;null = 清空这格)。
 */
export type PatchCell = ProfileFields[keyof ProfileFields]

/**
 * `patchProfile` 的返回(无值;失败抛)。
 */
export type PatchedOut = Promise<void>

/**
 * `patchProfile` 的入参。
 */
export type PatchProfileIn = {
  /**
   * 用户 id(payload 主键)。
   */
  userId: string | number

  /**
   * 要写的键。
   */
  patch: ProfilePatch
}
