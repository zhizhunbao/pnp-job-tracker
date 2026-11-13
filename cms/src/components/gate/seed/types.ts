/**
 * gate 桶子桶 seed 的形状:档案接口的回包里真读的格,与修改面板的起始答案。
 * 2026-11-12:形状本桶自声明,不取父桶;教育经历明细与简历资料服务端已洗、这里零读格透传,所以不透明(断言在父桶装配点)。
 *
 * @author Frank
 * @time 2026-11-12 20:00:00
 */

/**
 * 档案里一个带码的名字(只读码)。
 */
export type SeedCode = {
  /**
   * 码。
   */
  code: string
}

/**
 * 档案里的城市(只读英文名)。
 */
export type SeedCity = {
  /**
   * 英文名;没选 = 空串。
   */
  en: string
}

/**
 * 档案(/api/quiz/profile 的 profile 一格;服务端已洗,各格都在)。
 */
export type SeedProfile = {
  /**
   * 目标档。
   */
  goal: number

  /**
   * 专业。
   */
  majors: SeedCode[]

  /**
   * 想做的工作。
   */
  nocs: SeedCode[]

  /**
   * 现居省码。
   */
  prov: string

  /**
   * 在境外。
   */
  abroad: boolean

  /**
   * 现居城市。
   */
  city: SeedCity

  /**
   * 英文姓名。
   */
  name: string

  /**
   * 身份词。
   */
  who: string

  /**
   * 教育经历串。
   */
  edu: string[]

  /**
   * 教育经历明细(零读格透传)。
   */
  eduList: object[]

  /**
   * 做过的工作。
   */
  works: SeedCode[]

  /**
   * 匹配依据。
   */
  matchBy: string

  /**
   * 匹配模式。
   */
  matchMode: string

  /**
   * 来自简历的标记。
   */
  fromResume: string[]

  /**
   * 简历资料(零读格透传)。
   */
  cv: object
}

/**
 * 档案接口的回包(线格式)。
 */
export type SeedJson = {
  /**
   * 档案;没登录、取不到时缺席。
   */
  profile?: SeedProfile
}

/**
 * 修改面板的起始答案(形同父桶 GateEditSeed;教育经历明细与简历资料不透明)。
 */
export type SeedOut = {
  /**
   * 目标档。
   */
  goal: number

  /**
   * 专业码。
   */
  majors: string[]

  /**
   * 想做的工作(职业码)。
   */
  nocs: string[]

  /**
   * 现居省码。
   */
  prov: string

  /**
   * 在境外。
   */
  abroad: boolean

  /**
   * 现居城市英文名。
   */
  city: string

  /**
   * 英文姓名。
   */
  name: string

  /**
   * 身份词。
   */
  who: string

  /**
   * 教育经历串。
   */
  edu: string[]

  /**
   * 教育经历明细。
   */
  eduList: object[]

  /**
   * 做过的工作(职业码)。
   */
  workNocs: string[]

  /**
   * 匹配依据。
   */
  matchBy: string

  /**
   * 匹配模式。
   */
  matchMode: string

  /**
   * 来自简历的标记。
   */
  fromResume: string[]

  /**
   * 简历资料。
   */
  cv: object
}

/**
 * 起始答案或没有(还没取到、取不到)。
 */
export type MaybeSeed = SeedOut | null

/**
 * loadSeed 的入参。
 */
export type SeedLoadIn = {
  /**
   * 落起始答案。
   */
  setSeed: (v: MaybeSeed) => void

  /**
   * 落「取不到」。
   */
  setFailed: (v: boolean) => void
}

/**
 * 一串带码的名字。
 */
export type SeedCodes = SeedCode[]

/**
 * 一串码。
 */
export type Codes = string[]
