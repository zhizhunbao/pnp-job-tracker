/**
 * gate 桶子桶 school 的形状:搜到的一所学校、教育经历一段里它要动的格与各函数入参。
 * 2026-11-12:形状本桶自声明、只声明真读的格,不取父桶。
 *
 * @author Frank
 * @time 2026-11-12 19:30:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形;本桶自抄,types 不许 import)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 搜到的一所学校(/api/quiz/schools 的一项;形同 lib/quiz SchoolHit)。
 */
export type SchoolHit = {
  /**
   * 校名(英文)。
   */
  name: string

  /**
   * 中文译名;没有 = 空串。
   */
  nameZh: string

  /**
   * 所在省码;库里没有 = 空串。
   */
  prov: string

  /**
   * 公立 true、私立 false。
   */
  isPublic: boolean
}

/**
 * 搜学校接口的回包(线格式)。
 */
export type SchoolsJson = {
  /**
   * 搜到的学校。
   */
  schools?: SchoolHit[]
}

/**
 * 教育经历一段(父桶 EduPick 的全格照抄:本桶要整段抄回去)。
 */
export type SchoolRow = {
  /**
   * 院校所在地。
   */
  prov: string

  /**
   * 公立私立。
   */
  kind: string

  /**
   * 课程时长。
   */
  len: string

  /**
   * 证书或学历名称。
   */
  cred: string

  /**
   * 学校。
   */
  school: string

  /**
   * 开始年份。
   */
  from: string

  /**
   * 结束年份。
   */
  to: string

  /**
   * 专业码。
   */
  major: string
}

/**
 * 存活标记(请求在途时换词或卸载,回来的结果不落)。
 */
export type DeadFlag = {
  /**
   * 作废了。
   */
  dead: boolean
}

/**
 * loadSchoolHits 的入参。
 */
export type SchoolLoadIn = {
  /**
   * 检索词。
   */
  q: string

  /**
   * 落搜到的学校。
   */
  setHits: (v: SchoolHit[]) => void

  /**
   * 存活标记。
   */
  flag: DeadFlag
}

/**
 * makeSchoolSearch 的入参。
 */
export type SchoolSearchIn = {
  /**
   * 检索词(正在打字那一段的学校格;没在打字 = 空串)。
   */
  q: string

  /**
   * 落搜到的学校。
   */
  setHits: (v: SchoolHit[]) => void
}

/**
 * makeSchoolTypeOf 的入参。
 */
export type SchoolTypeIn = {
  /**
   * 现在的几段。
   */
  rows: SchoolRow[]

  /**
   * 写几段。
   */
  setRows: (v: SchoolRow[]) => void

  /**
   * 写「正在搜第几段」。
   */
  setAt: (v: number) => void
}

/**
 * makeSchoolPickOf 的入参。
 */
export type SchoolPickIn = {
  /**
   * 现在的几段。
   */
  rows: SchoolRow[]

  /**
   * 写几段。
   */
  setRows: (v: SchoolRow[]) => void

  /**
   * 正在搜第几段。
   */
  at: number

  /**
   * 写「正在搜第几段」(选上就收起结果)。
   */
  setAt: (v: number) => void
}

/**
 * schoolSubOf 的入参。
 */
export type SchoolSubIn = {
  /**
   * 一所学校。
   */
  hit: SchoolHit

  /**
   * 界面语。
   */
  lang: string

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * schoolQOf 的入参。
 */
export type SchoolQIn = {
  /**
   * 现在的几段。
   */
  rows: SchoolRow[]

  /**
   * 正在搜第几段。
   */
  at: number
}
