/**
 * jobtitle 域的形状:挑灰字要读的一行、两台懒翻的入参与接口线格式。
 *
 * @author Frank
 * @time 2026-09-23 01:45:57
 */

/**
 * 界面语言(三字面量本域自抄)。
 */
export type JobTitleLang = 'zh' | 'en' | 'ko'

/**
 * 挑灰字要读的一行职位(只声明三格:职位板行、在招清单行、相关职位行都带着它们)。
 */
export type TitledFact = {
  /**
   * 职位名。
   */
  title: string

  /**
   * 这一岗库里存好的中文译名;'' = 没有。
   */
  titleZh: string

  /**
   * 这一岗库里存好的韩文译名;'' = 没有。
   */
  titleKo: string
}

/**
 * titleSubOf 的入参。
 */
export type TitleSubIn = {
  /**
   * 这一行(岗名 + 库里存好的两语译名)。
   */
  row: TitledFact

  /**
   * 界面语言。
   */
  lang: JobTitleLang

  /**
   * 懒翻回来的译名(批量译名表里查到的,或按岗翻回来的);'' = 没有。
   */
  lazy: string

  /**
   * 职业名(界面语言的 NOC 官方名);'' = 没有 —— 两样译名都没有时的兜底。
   */
  noc: string
}

/**
 * lazyTitleOf 的入参。
 */
export type LazyTitleIn = {
  /**
   * 批量懒翻回来的职位名 → 译名。
   */
  map: Record<string, string>

  /**
   * 职位名。
   */
  title: string
}

/**
 * untranslatedOf 的入参。
 */
export type UntranslatedIn = {
  /**
   * 这一组的行。
   */
  rows: TitledFact[]

  /**
   * 界面语言。
   */
  lang: JobTitleLang
}

/**
 * storedTitleOf 的入参。
 */
export type StoredTitleIn = {
  /**
   * 这一行。
   */
  row: TitledFact

  /**
   * 界面语言。
   */
  lang: JobTitleLang
}

/**
 * 懒翻挂掉时的死旗(组件卸了就不落格)。
 */
export type DeadFlag = {
  /**
   * 已拆卸。
   */
  dead: boolean
}

/**
 * 带死旗的取数函数。
 */
export type LoadFn = (flag: DeadFlag) => void

/**
 * makeLoadTitles 的入参。
 */
export type LoadTitlesIn = {
  /**
   * 要翻的一组职位名。
   */
  titles: string[]

  /**
   * 界面语言。
   */
  lang: JobTitleLang

  /**
   * 译名表落格(职位名 → 译名)。
   */
  setMap: (m: Record<string, string>) => void
}

/**
 * 批量懒翻接口的响应(线格式)。
 */
export type TitlesJson = {
  /**
   * 翻成功了没有。
   */
  ok?: boolean

  /**
   * 职位名 → 译名。
   */
  texts?: Record<string, string> | null
} | null

/**
 * makeLoadTitleTrans 的入参。
 */
export type LoadTitleTransIn = {
  /**
   * 职位名。
   */
  title: string

  /**
   * 这一岗的岗位号(单个词的歧义标题靠它按岗翻;2026-09-20 改键,原传原帖链接 —— 多条岗共用一个链接会串岗)。
   */
  id: string | number

  /**
   * 界面语言。
   */
  lang: JobTitleLang

  /**
   * 译名落格。
   */
  setText: (v: string) => void
}

/**
 * 按岗懒翻接口的响应(线格式)。
 */
export type TitleTransJson = {
  /**
   * 翻成功了没有。
   */
  ok?: boolean

  /**
   * 译名。
   */
  text?: string | null
} | null

/**
 * useTitleMap 的入参。
 */
export type TitleMapHookIn = {
  /**
   * 要翻的一组职位名(库里已有界面语言译名的不要放进来,untranslatedOf 挑)。
   */
  titles: string[]

  /**
   * 界面语言(英文不翻)。
   */
  lang: JobTitleLang
}

/**
 * useTitleTrans 的入参。
 */
export type TitleTransHookIn = {
  /**
   * 职位名。
   */
  title: string

  /**
   * 这一岗的岗位号(单个词的歧义标题靠它按岗翻;2026-09-20 改键,原传原帖链接 —— 多条岗共用一个链接会串岗)。
   */
  id: string | number

  /**
   * 界面语言(英文不翻)。
   */
  lang: JobTitleLang

  /**
   * 这一岗库里存好的标题译名(storedTitleOf);'' = 没有,才懒翻。
   */
  cached: string

  /**
   * 重译代数:变了就清掉已翻的副题重翻一次(2026-09-14)。
   */
  gen: number
}
