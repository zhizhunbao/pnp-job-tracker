/**
 * resources 域(官方资源导航页)的自足形状:一条资源与它的分组、状态机器交回的面板、
 * 三个小件的 props 契约与各函数的入参。
 * 资源条目与分组**本域自己声明**(宪法 08-25「types 自声明」):真身是 lib/official 的
 * `Res` / `ResGroup`,结构相同即兼容,本域只声明真正读到的那几格 —— 那边多一格不必跟着改,
 * 读不到的格子当场 tsc 红。
 * 整页外框不在这里:灰底撑满视口那层是 shell 域的通用件 Frame,由页面门拼,本域不留克隆。
 *
 * @author Frank
 * @time 2026-08-28 12:39:03
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值 —— 形状本域自己声明,
 * 真参数是 lib/i18n 那个带附加成员的交叉类型,结构上兜得住)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 界面语言(三字面量各域自抄;每条资源的用途说明按它取那一门)。
 */
export type ResourcesLang = 'zh' | 'en' | 'ko'

/**
 * 一条官方资源(镜像 lib/official 的 `Res`,只声明本页读的三格)。
 */
export type ResItem = {
  /**
   * 资源名(官方原名,主文案)。
   */
  name: string

  /**
   * 三语用途说明(卡片第二行的灰字小注,按界面语言取)。
   */
  use: Record<ResourcesLang, string>

  /**
   * 官方地址(整卡点开就去这里;人工核对现行有效)。
   */
  url: string
}

/**
 * 一个资源分组(镜像 lib/official 的 `ResGroup`)。
 */
export type ResGroup = {
  /**
   * 分组名(federal/pnp/wage… —— 拼上前缀就是它的 i18n 键)。
   */
  cat: string

  /**
   * 组内资源(搜索过滤后可能少于原组,空组整个不出)。
   */
  items: ResItem[]
}

/**
 * 搜索框改值的回调形状(交给 Search 的那只手柄)。
 */
export type QueryChangeFn = (query: string) => void

/**
 * useResources 交回的机器面板。
 */
export type ResourcesPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前界面语言(卡片小注按它取那一门用途说明)。
   */
  lang: ResourcesLang

  /**
   * 搜索框里的现值(原样回填,不做修剪 —— 修剪只发生在比对时)。
   */
  query: string

  /**
   * 按现在这个搜索词筛过的分组(空组已剔除;空列表 = 一条都没命中)。
   */
  groups: ResGroup[]

  /**
   * 搜索框的改值手柄。
   */
  onQueryChange: QueryChangeFn
}

/**
 * makeQueryChange 的入参:搜索词的落格。
 */
export type QueryChangeIn = {
  /**
   * 搜索词落格(useState 的写入端)。
   */
  setQuery: QueryChangeFn
}

/**
 * groupsOf 的入参:搜索框现值。
 */
export type GroupsOfIn = {
  /**
   * 搜索框现值(比对前会去掉首尾空白并转小写)。
   */
  query: string
}

/**
 * hitOf 的入参:一条资源与已归一的搜索词。
 */
export type HitOfIn = {
  /**
   * 待判的这一条资源。
   */
  item: ResItem

  /**
   * 已去空白转小写的搜索词(空串不该走到这里,由调用方先判)。
   */
  needle: string
}

/**
 * catKeyOf 的入参:分组名。
 */
export type CatKeyOfIn = {
  /**
   * 分组名(拼上前缀成 i18n 键)。
   */
  cat: string
}

/**
 * ResCategory(一个分区:小标题 + 密集网格)的 props。
 */
export type ResCategoryIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语言(透传给卡片取用途说明)。
   */
  lang: ResourcesLang

  /**
   * 这个分区(已筛过,非空)。
   */
  group: ResGroup
}

/**
 * ResCard(一条资源一张可点卡)的 props。
 */
export type ResCardIn = {
  /**
   * 界面语言(定第二行小注取哪一门)。
   */
  lang: ResourcesLang

  /**
   * 这一条资源。
   */
  item: ResItem
}
