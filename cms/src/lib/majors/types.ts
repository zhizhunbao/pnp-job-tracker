/**
 * 专业域的形状 —— **本域自己声明,不从别的域取**(唯一例外:`import type` 自 db 基础设施叶子)。
 * 一行 = CIP 2021 的一个 class(cip_programs 表;数据层 etl/statcan/cip 子域产,本域零计算)。
 *
 * @author Frank
 * @time 2026-10-04 02:14:05
 */

import type { Db } from '../db'

/**
 * 一个专业(对外行;to* 洗净后的形)。
 */
export type MajorRow = {
  /**
   * CIP 2021 class 码(52.0203)—— 访客答案存的就是它。
   */
  code: string

  /**
   * 官方英文类名。
   */
  titleEn: string

  /**
   * 中文名(本地模型译);null = 数据层没译成,前端回退英文名。
   * 2026-10-05 起是数据层清洗过的中文显示名(去「/技术员」这类直译尾巴、「X/Y」改「X与Y」;CIP 原译留在 processed 的 titleZhRaw)。
   */
  titleZh: string | null

  /**
   * 韩文名(同上)。
   */
  titleKo: string | null

  /**
   * 英文显示名(热门与专业类手写、其余按规则清洗);空串 = 没有,照用 titleEn(2026-10-05 专业题照掌上高考做)。
   */
  titleEnShort: string

  /**
   * 两位 series 码(52)。
   */
  series: string

  /**
   * 两位 primary grouping 码(05)。
   */
  grouping: string

  /**
   * 本站职业大类清单(数据层 etl/noc MAJOR_SERIES_BROADS 推;第 3 题按它取在招职业)。
   */
  broads: string[]

  /**
   * 热门名次(1 起);null = 不在热门清单。
   */
  popular: number | null
}

/**
 * 专业清单(热门 / 搜索的返回,也是整表缓存的值)。
 */
export type MajorRows = MajorRow[]

/**
 * 一个专业或没有(按码查无此码)。
 */
export type MaybeMajor = MajorRow | null

/**
 * 一行专业的 pg 原始行(SQL.MAJORS_ALL;列值三态,判定在行构造器的词汇表)。
 */
export type MajorDbRow = {
  /**
   * class 码。
   */
  code: string | null

  /**
   * 英文类名。
   */
  title_en: string | null

  /**
   * 中文名。
   */
  title_zh: string | null

  /**
   * 韩文名。
   */
  title_ko: string | null

  /**
   * series 码。
   */
  series: string | null

  /**
   * primary grouping 码。
   */
  grouping: string | null

  /**
   * 大类清单(jsonb;pg 已解析成数组,极少数驱动给 JSON 串)。
   */
  broads: string[] | string | null

  /**
   * 热门名次(numeric;pg 给字符串)。
   */
  popular: string | number | null

  /**
   * 英文显示名(varchar;2026-10-05 加列,灌库前是 NULL)。
   */
  title_en_short: string | null

  /**
   * 选择器里挂在哪(jsonb;pg 已解析,极少数驱动给 JSON 串;2026-10-05 加列,灌库前是 NULL)。
   */
  places: MajorPlacesJson | string | null
}

/**
 * places 格解析后的样子(归一前:jsonb 在信任边界外,写成什么都可能;行构造器逐项验)。
 */
export type MajorPlacesJson = MajorPlaceItemJson[] | MajorPlaceJson | number | boolean

/**
 * places 数组里的一项(归一前:不一定是对象)。
 */
export type MajorPlaceItemJson = MajorPlaceJson | string | number | boolean | null

/**
 * places 数组里一项对象的原文(归一前:哪格都可能缺;键名是数据层 etl/statcan/cip 定的契约)。
 */
export type MajorPlaceJson = {
  /**
   * 大类键。
   */
  cat?: string

  /**
   * 大类排第几。
   */
  catOrder?: number

  /**
   * 大类英文名。
   */
  catEn?: string

  /**
   * 大类中文名。
   */
  catZh?: string

  /**
   * 大类韩文名。
   */
  catKo?: string

  /**
   * 专业类键。
   */
  group?: string

  /**
   * 专业类英文名。
   */
  groupEn?: string

  /**
   * 专业类中文名。
   */
  groupZh?: string

  /**
   * 专业类韩文名。
   */
  groupKo?: string

  /**
   * 专业类在大类里排第几。
   */
  groupOrder?: number

  /**
   * 专业在专业类里排第几。
   */
  order?: number

  /**
   * 这个专业类在这个大类里只装这一个专业。
   */
  single?: boolean
}

/**
 * 一个专业在选择器里的一个挂点(to* 洗净后的形;一个专业可挂两个大类,各一项)。
 * 排序数与 single 都是数据层 etl/statcan/cip 算好的,本域只按序号摆(2026-10-05)。
 */
export type MajorPlace = {
  /**
   * 大类键(fin / eng …;合 CAT_KEY_RE)。
   */
  cat: string

  /**
   * 大类排第几(1 起)。
   */
  catOrder: number

  /**
   * 大类英文名。
   */
  catEn: string

  /**
   * 大类中文名。
   */
  catZh: string

  /**
   * 大类韩文名。
   */
  catKo: string

  /**
   * 专业类键(CIP subseries 码 52.03,或数据层自定的 eng.mech / logi.mgmt)。
   */
  group: string

  /**
   * 专业类英文名。
   */
  groupEn: string

  /**
   * 专业类中文名。
   */
  groupZh: string

  /**
   * 专业类韩文名。
   */
  groupKo: string

  /**
   * 专业类在大类里排第几(1 起)。
   */
  groupOrder: number

  /**
   * 专业在专业类里排第几(1 起)。
   */
  order: number

  /**
   * 这个专业类在这个大类里只装这一个专业(不折叠,合进大类末尾那张单列卡)。
   */
  single: boolean
}

/**
 * 一个挂点或没有(原文不成样子)。
 */
export type MaybePlace = MajorPlace | null

/**
 * 一个专业的全部挂点(不进选择器的是空数组)。
 */
export type MajorPlaces = MajorPlace[]

/**
 * 一个专业(to* 洗净后的形,服务端用):对外行 + 挂点。挂点只拿来建选择器的树,不随接口出去。
 */
export type MajorFact = {
  /**
   * 对外行(接口里出去的就是这个对象,不带挂点)。
   */
  row: MajorRow

  /**
   * 选择器里的挂点。
   */
  places: MajorPlaces
}

/**
 * 整张专业表(洗净后,code 序)。
 */
export type MajorFacts = MajorFact[]

/**
 * 选择器左栏的一个大类(对外行)。
 */
export type MajorCatRow = {
  /**
   * 大类键(?cat= 拿它取树)。
   */
  key: string

  /**
   * 英文名。
   */
  titleEn: string

  /**
   * 中文名。
   */
  titleZh: string

  /**
   * 韩文名。
   */
  titleKo: string
}

/**
 * 大类清单(catOrder 序)。
 */
export type MajorCatRows = MajorCatRow[]

/**
 * 一个大类里的一个折叠专业类(对外行;装两个以上专业)。
 */
export type MajorGroupRow = {
  /**
   * 专业类键。
   */
  key: string

  /**
   * 英文名。
   */
  titleEn: string

  /**
   * 中文名。
   */
  titleZh: string

  /**
   * 韩文名。
   */
  titleKo: string

  /**
   * 类里的专业(order 序)。
   */
  majors: MajorRows
}

/**
 * 一个大类的树(?cat= 的响应体):折叠专业类 + 单列专业。
 */
export type MajorTree = {
  /**
   * 折叠专业类(groupOrder 序,只装一个专业的类不在这)。
   */
  groups: MajorGroupRow[]

  /**
   * 只装一个专业的类里那个专业,合成一列(按 groupOrder、order)。
   */
  singles: MajorRows
}

/**
 * `majorTreeOf` 的入参。
 */
export type MajorTreeIn = {
  /**
   * 整张专业表(洗净后)。
   */
  facts: MajorFacts

  /**
   * 大类键。
   */
  cat: string
}

/**
 * 建树时一个专业类的半成品:名字、单列与否,专业按 order 装格。
 */
export type MajorGroupBin = {
  /**
   * 专业类键。
   */
  key: string

  /**
   * 英文名。
   */
  titleEn: string

  /**
   * 中文名。
   */
  titleZh: string

  /**
   * 韩文名。
   */
  titleKo: string

  /**
   * 只装一个专业(取这个类头一个挂点上的标)。
   */
  single: boolean

  /**
   * 专业按 order 装格。
   */
  majors: OrderSlots<MajorRow>
}

/**
 * 按序号装格:序号(1 起)→ 落在这一格的东西(同号的按先来后到)。逐格摆放,不用比较器。
 */
export type OrderSlots<T> = Map<number, T[]>

/**
 * 逐格摆好的清单(slotOrderOf 出的:序号从小到大,同号按先来后到)。
 */
export type OrderedList<T> = T[]

/**
 * `pushSlot` 的入参。
 */
export type SlotPushIn<T> = {
  /**
   * 装格的表。
   */
  slots: OrderSlots<T>

  /**
   * 序号。
   */
  at: number

  /**
   * 要装进去的东西。
   */
  item: T
}

/**
 * `getMajors` 的返回(整张专业表,code 序)。
 */
export type MajorsOut = Promise<MajorRows>

/**
 * 整表缓存一格。
 * 2026-10-05 同一格还挂着选择器的大类清单与各大类的树:随整表一起建,整表重读才重建(站级聚合禁每请求现算)。
 */
export type MajorsSlot = {
  /**
   * 落格时刻(ms)。
   */
  at: number

  /**
   * 整张专业表。
   */
  rows: MajorRows

  /**
   * 大类清单(catOrder 序)。
   */
  cats: MajorCatRows

  /**
   * 大类键 → 那个大类的树。
   */
  trees: Map<string, MajorTree>
}

/**
 * `majorsSlotOf` 的入参。
 */
export type MajorsSlotIn = {
  /**
   * 落格时刻(ms)。
   */
  at: number

  /**
   * 整张专业表(洗净后)。
   */
  facts: MajorFacts
}

/**
 * `getMajorsSlot` 的返回。
 */
export type MajorsSlotOut = Promise<MajorsSlot>

/**
 * `getMajorCats` 的返回(表没建 / 没灌挂点是空数组)。
 */
export type MajorCatsOut = Promise<MajorCatRows>

/**
 * `getMajorTree` 的入参。
 */
export type MajorTreeGetIn = {
  /**
   * 能查的连接(池由调用方注进来)。
   */
  db: Db

  /**
   * 大类键(没过 CAT_KEY_RE 的不进库)。
   */
  cat: string
}

/**
 * `getMajorTree` 的返回(不认识的键是空树)。
 */
export type MajorTreeOut = Promise<MajorTree>

/**
 * 专业域全部可变状态的形状(住 variables.ts 的 CACHE)。
 */
export type MajorsCache = {
  /**
   * 整表缓存;null = 还没查过,或上次查回空表(空表不进缓存,下次请求再查)。
   */
  table: MajorsSlot | null
}

/**
 * `searchMajorsOf` 的入参。
 */
export type MajorSearchIn = {
  /**
   * 整张专业表。
   */
  rows: MajorRows

  /**
   * 检索词(英 / 中 / 韩名包含匹配,不分大小写)。
   * 2026-10-04 收口:也不分空白(比对前两边都删掉全部空白)。
   * 2026-10-05 英文名之外也比英文显示名(titleEnShort),八档照旧。
   */
  q: string
}

/**
 * 按词拆开的一串词(wordsOf 出的;转小写、空词不留;2026-10-04 八档立)。
 */
export type WordList = string[]

/**
 * 检索词拆好的几样(queryFactOf 出的,一次搜索只拆一次;2026-10-04 八档立)。
 */
export type QueryFact = {
  /**
   * 带中文 / 韩文(按中韩文比:删空白后比开头与中间含)。
   */
  cjk: boolean

  /**
   * 比对键:转小写、删掉全部空白(中韩文比对用;全是空白时为空串)。
   */
  key: string

  /**
   * 英文按词拆开(转小写,标点与空白当词界,空词不留)。
   */
  words: string[]

  /**
   * 各词拼在一起不加分隔(数字母、比缩写、比「computerscience」这种连写)。
   */
  letters: string

  /**
   * 各词去掉常见词尾(对不上词尾的原样留)。
   */
  stems: string[]
}

/**
 * `matchRankOf` 的入参。
 */
export type MatchIn = {
  /**
   * 一个专业。
   */
  row: MajorRow

  /**
   * 已转小写、去首尾空白的检索词。
   * 2026-10-04 收口:去的是全部空白(searchKeyOf 出来的比对键),不只首尾。
   * 同日八档改判:改收拆好的检索词(QueryFact),一次搜索只拆一次。
   */
  q: QueryFact
}

/**
 * `nameRankOf` 的入参(一个名字对检索词的命中档)。
 */
export type NameMatchIn = {
  /**
   * 一个语言的专业名(原样,比对前在函数里转成比对键)。
   */
  name: string

  /**
   * 比对键形的检索词(searchKeyOf 出来的:转小写、删掉全部空白)。
   * 2026-10-04 八档改判:改收拆好的检索词(QueryFact)。
   */
  q: QueryFact
}

/**
 * `everyWordHead` 的入参(2026-10-04 八档立)。
 */
export type WordHeadIn = {
  /**
   * 名字拆开的词。
   */
  words: string[]

  /**
   * 要逐个找到「某个词以它开头」的检索词片段。
   */
  heads: string[]
}

/**
 * `majorOf` 的入参。
 */
export type MajorFindIn = {
  /**
   * 整张专业表。
   */
  rows: MajorRows

  /**
   * class 码。
   */
  code: string
}

/**
 * `getMajorBroads` 的入参(给 quiz 域第 3 题注入用)。
 */
export type MajorBroadsIn = {
  /**
   * 能查的连接(池由调用方注进来)。
   */
  db: Db

  /**
   * class 码。
   */
  code: string
}

/**
 * `getMajorBroads` 的返回(查无此码 / 表没建 = 空数组)。
 */
export type MajorBroadsOut = Promise<string[]>
