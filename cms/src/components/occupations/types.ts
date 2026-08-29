/**
 * occupations 域(紧缺职业清单页)的自足形状:清单行、两级分组、展示行、列声明,
 * 以及各件的 props 与各函数的入参。
 * 清单行(lib/employers 的 OccRow)**不跨域取**,按宪法 08-25「types 自声明」
 * 只声明本页真读的那几格(官方清单页地址那一格 2026-08-27 之后没人渲,不抄进来);
 * 少声明一格真读不到会当场 tsc 红。
 *
 * @author Frank
 * @time 2026-08-28 00:10:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值 —— 形状本域自己声明,
 * 真参数是 lib/i18n 那个带附加成员的交叉类型,结构上兜得住)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 官方清单的一行(一个省的一条通道点名的一个职业)。
 */
export type OccupationRow = {
  /**
   * 两位省码。
   */
  province: string

  /**
   * 通道的官方名(分组键,也是显示短名查不到时的兜底文案)。
   */
  stream: string

  /**
   * 通道的人话名;'' = 清单没给。
   */
  label: string

  /**
   * 5 位职业码。
   */
  noc: string

  /**
   * 职业名;'' = 官方清单只给了码。
   */
  name: string

  /**
   * 官方清单页的抓取日(YYYY-MM-DD);'' = 没记。
   */
  fetched: string
}

/**
 * 一条通道的分组(通道下面挂它点名的全部职业)。
 */
export type StreamGroup = {
  /**
   * 通道的官方名(分组键)。
   */
  stream: string

  /**
   * 通道的人话名;'' = 清单没给(显示时回落官方名)。
   */
  label: string

  /**
   * 官方清单页的抓取日;'' = 没记(那一格整个不渲)。
   */
  fetched: string

  /**
   * 这条通道点名的职业(保持入库序)。
   */
  occ: OccupationRow[]
}

/**
 * 一个省的分组(省下面挂它的全部通道)。
 */
export type ProvGroup = {
  /**
   * 两位省码(也是省小节的锚点身份)。
   */
  prov: string

  /**
   * 这个省的通道(保持入库序)。
   */
  streams: StreamGroup[]
}

/**
 * 表格一行的展示行(要取词才能算的显示值都在 toOccCellRow 里洗完,单元格只读算好的那一项)。
 */
export type OccCellRow = {
  /**
   * 行身份(同一张表里职业码唯一)。
   */
  key: string

  /**
   * 5 位职业码(灰字小注)。
   */
  noc: string

  /**
   * 职业名;官方只给了码时是横杠。
   */
  name: string

  /**
   * 职业名的排序取值;null = 名字缺席,恒沉底(不拿横杠去跟真名字比大小)。
   */
  nameSort: string | null

  /**
   * 「在职位板查看」的去处(职位板按这个职业码搜)。
   */
  href: string

  /**
   * 「在职位板查看」的文案。
   */
  goLabel: string
}

/**
 * 一列的声明 —— 本域自声明真正用到的五项(table 域那份还有 width/align 等,本域不用;
 * 结构相同即兼容,走样当场 tsc 红)。
 */
export type OccCol = {
  /**
   * 列身份(排序态与列宽都按它记)。
   */
  key: string

  /**
   * 表头文案。
   */
  label: React.ReactNode

  /**
   * 单元格渲染器。
   */
  render: (r: OccCellRow) => React.ReactNode

  /**
   * 排序取值器;不给就是不可排序。
   */
  sort?: (r: OccCellRow) => string | number | null

  /**
   * 单元格不换行。
   */
  nowrap?: boolean
}

/**
 * Occupations(整页正文)的 props。
 */
export type OccupationsIn = {
  /**
   * 官方清单的全部行(已按 省/通道/职业码 排好序,分组只顺着扫一遍)。
   */
  rows: OccupationRow[]
}

/**
 * ProvNav(省锚点导航)的 props。
 */
export type ProvNavIn = {
  /**
   * 页面上出现的省(顺序即导航顺序)。
   */
  provs: ProvGroup[]

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * ProvSection(一个省的小节)的 props。
 */
export type ProvSectionIn = {
  /**
   * 这个省的分组。
   */
  prov: ProvGroup

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * StreamTable(一条通道的表)的 props。
 */
export type StreamTableIn = {
  /**
   * 这条通道的分组。
   */
  stream: StreamGroup

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * StreamHead(通道表的头行)的 props。
 */
export type StreamHeadIn = {
  /**
   * 这条通道的分组。
   */
  stream: StreamGroup

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * toProvGroups 的入参。
 */
export type ProvGroupsIn = {
  /**
   * 官方清单的全部行。
   */
  rows: OccupationRow[]
}

/**
 * toOccCellRows 的入参。
 */
export type OccCellRowsIn = {
  /**
   * 这条通道点名的职业。
   */
  rows: OccupationRow[]

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * toOccCellRow 的入参。
 */
export type OccCellRowIn = {
  /**
   * 这一行清单事实。
   */
  r: OccupationRow

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * occColsOf 的入参。
 */
export type OccColsIn = {
  /**
   * 取词函数(三个列名都从它取)。
   */
  t: TFn
}

/**
 * provNameOf 的入参。
 */
export type ProvNameIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 两位省码。
   */
  code: string
}

/**
 * provAnchorIdOf 与 provAnchorHrefOf 的入参。
 */
export type ProvAnchorIn = {
  /**
   * 两位省码。
   */
  code: string
}

/**
 * streamTitleOf 的入参。
 */
export type StreamTitleIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 通道的官方名。
   */
  stream: string

  /**
   * 通道的人话名;'' = 清单没给。
   */
  label: string
}

/**
 * nocCountTextOf 的入参。
 */
export type NocCountIn = {
  /**
   * 这条通道点名的职业条数。
   */
  count: number
}
