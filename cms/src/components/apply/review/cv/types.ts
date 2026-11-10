/**
 * review 子桶 cv 的形状:本岗简历能手改的部分(与 review 的 ReviewCv 同形,本桶自声明)与各函数入参。
 * 2026-11-10 按「大于 1000 就拆子桶」(样张 apply/letter):review 的 functions.ts 过线,切出修改简历右侧栏用的纯函数。
 * 依赖只许 review → 本子桶(经 index.ts);本子桶不取 review 的任何东西,常量自抄、形状自声明。
 *
 * @author Frank
 * @time 2026-11-10 23:00:00
 */

/**
 * 本岗简历里能手改的部分。
 */
export type CvEdit = {
  /**
   * 简介。
   */
  summary: string

  /**
   * 技能。
   */
  skills: string

  /**
   * 各段工作。
   */
  work: CvEditWork[]
}

/**
 * 本岗简历的一段工作(职位、公司和年份只显示不能改)。
 */
export type CvEditWork = {
  /**
   * 职位。
   */
  title: string

  /**
   * 公司。
   */
  org: string

  /**
   * 起始年。
   */
  fromY: string

  /**
   * 结束年;至今 = 空串。
   */
  toY: string

  /**
   * 要点,一行一条。
   */
  desc: string
}

/**
 * 换掉一段工作要点的入参。
 */
export type WithDescIn = {
  /**
   * 现在的草稿。
   */
  cv: CvEdit

  /**
   * 第几段工作。
   */
  i: number

  /**
   * 新的要点。
   */
  desc: string
}
