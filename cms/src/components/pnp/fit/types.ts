/**
 * pnp 子桶 fit 的形状:身份对照的线格式(只声明读的格)、资讯页筛选条件(父桶整份递进)与各函数入参。
 * 子桶不取父桶,形状本桶自声明(父桶 PnpFitsJson / PnpStepsFilter 同形)。
 *
 * @author Frank
 * @time 2026-10-11 23:30:00
 */

/**
 * 院校条件一条(etl/pathways 段 6;线格式,没写的格缺席 = 不限)。
 */
export type SchoolJson = {
  /**
   * 地点词:own / other / canada / any。
   */
  prov: string

  /**
   * 性质词:public / private;缺席 = 不限。
   */
  kind?: string

  /**
   * 课程时长下限词:y1 / y2 / y3 / master;缺席 = 不限。
   */
  min?: string
}

/**
 * 一种身份的格。
 */
export type FitJson = {
  /**
   * 能不能走:yes / after / no。
   */
  can: string

  /**
   * 院校条件(任一段教育经历合上任一条即可);缺席 = 不挑院校。
   */
  schools?: SchoolJson[]
}

/**
 * 一条通道的身份对照(身份词 → 格;没登的身份缺席)。
 */
export type FitsJson = Record<string, FitJson>

/**
 * 教育经历一段(筛选卡一行;'' = 这一格没选)。
 */
export type EduRow = {
  /**
   * 院校所在地:省码或 abroad。
   */
  prov: string

  /**
   * 性质:public / private。
   */
  kind: string

  /**
   * 课程时长:y1 / y2 / y3 / master。
   */
  len: string
}

/**
 * 资讯页「申请步骤」的筛选条件(省份不在这:哪几省的卡由页面挑)。
 */
export type StepsFilter = {
  /**
   * 身份词;'' = 没选。
   */
  who: string

  /**
   * 教育经历(至多两段)。
   */
  edu: EduRow[]
}

/**
 * keepStreamOf 的入参。
 */
export type KeepIn = {
  /**
   * 这条通道的身份对照;没登 = null。
   */
  fits: FitsJson | null

  /**
   * 通道所在省码(院校条件的本省 / 外省按它算)。
   */
  province: string

  /**
   * 筛选条件。
   */
  filter: StepsFilter
}

/**
 * anySchoolHitOf 的入参。
 */
export type AnySchoolIn = {
  /**
   * 填了地点的教育经历。
   */
  rows: EduRow[]

  /**
   * 院校条件。
   */
  schools: SchoolJson[]

  /**
   * 通道所在省码。
   */
  province: string
}

/**
 * schoolHitOf / provHitOf 的入参。
 */
export type SchoolHitIn = {
  /**
   * 一段教育经历。
   */
  row: EduRow

  /**
   * 一条院校条件。
   */
  school: SchoolJson

  /**
   * 通道所在省码。
   */
  province: string
}
