/**
 * 档案导入简历的形状。
 *
 * @author Frank
 * @time 2026-11-09 01:00:00
 */

/**
 * 档案里能进简历的两张清单(英文名;简历是英文的)。
 */
export type ProfileLists = {
  /**
   * 做过的工作。
   */
  works: string[]

  /**
   * 专业。
   */
  majors: string[]
}

/**
 * 档案接口里的一个名字(线格式)。
 */
export type ProfileNameJson = {
  /**
   * 英文名。
   */
  en?: string | null
}

/**
 * /api/quiz/profile 的回包(线格式,只声明读的格)。
 */
export type ProfileListsJson = {
  /**
   * 档案;未登录时缺席。
   */
  profile?: {
    /**
     * 做过的工作。
     */
    works?: ProfileNameJson[] | null

    /**
     * 专业。
     */
    majors?: ProfileNameJson[] | null
  } | null
}

/**
 * 把名字补进清单的入参。
 */
export type EntriesWithNamesIn<E> = {
  /**
   * 要补的名字。
   */
  names: string[]

  /**
   * 已有条目。
   */
  have: E[]

  /**
   * 造一条空条目。
   */
  blank: () => E
}

/**
 * 补完的结果。
 */
export type EntriesWithNamesOut<E> = {
  /**
   * 新清单。
   */
  list: E[]

  /**
   * 新加了几条。
   */
  added: number
}

/**
 * 能补名字的条目(只读写名字一格)。
 */
export type TitledEntry = {
  /**
   * 名字。
   */
  title: string
}

/**
 * 能补空格的联系方式(只读写三格)。
 */
export type FillableContact = {
  /**
   * 英文姓名。
   */
  name: string

  /**
   * 城市。
   */
  city: string

  /**
   * 省份或国家。
   */
  region: string
}

/**
 * contactFilledOf 的入参。
 */
export type ContactFillIn<C> = {
  /**
   * 现有联系方式。
   */
  have: C

  /**
   * 档案带来的联系方式。
   */
  from: C
}

/**
 * 并入的结果。
 */
export type MergeOut<D> = {
  /**
   * 新草稿。
   */
  draft: D

  /**
   * 新加了几条。
   */
  added: number
}

/**
 * 造「从档案导入」的入参。
 */
export type ProfileImportIn<D> = {
  /**
   * 拉档案并并入;拉不到为 null。
   */
  load: () => Promise<MergeOut<D> | null>

  /**
   * 取词函数。
   */
  t: (key: string, vars?: Record<string, string | number>) => string

  /**
   * 落草稿。
   */
  setDraft: (d: D) => void

  /**
   * 落「正在导入」。
   */
  setImporting: (v: boolean) => void
}
