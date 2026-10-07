/**
 * 「我的」页两张岗位表(myjobs 组件桶)的形状:线格式 → 展示行 → 列。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
// eslint-disable-next-line local/no-import-in-leaf -- 原样透传给公司弹框的整份行与分层态,本域一格不读(先例 employers/types.ts)
import type { JobRow, Plan } from '@/lib/jobs'

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形;形状本桶自己声明)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 界面语。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 哪张表:我的求职 / 我的收藏。
 */
export type ListKind = 'applied' | 'saved'

/**
 * 清单的一行(/api/myjobs/* 的线格式;只声明真读的格)。
 */
export type MyJobItem = {
  /**
   * 收藏记录 id(取消收藏时 DELETE 它)。
   */
  id: number

  /**
   * 职位 id;null = 职位已从库里删掉(打不开职位页)。
   */
  jobId: number | null

  /**
   * 职位名(英文原名)。
   */
  title: string

  /**
   * 公司名。
   */
  company: string

  /**
   * 城市英文名。
   */
  city: string

  /**
   * 城市中文译名。
   */
  cityZh: string

  /**
   * 城市韩文译名。
   */
  cityKo: string

  /**
   * 省码。
   */
  province: string

  /**
   * 薪资显示串。
   */
  salary: string

  /**
   * 折算年薪(薪资列排序用;没有 = null)。
   */
  salaryAnnual: number | null

  /**
   * 发布日期(ISO)。
   */
  datePosted: string

  /**
   * 公司页 slug(点公司名开公司弹框;没有 = 空串)。
   */
  companySlug: string

  /**
   * 投递进度(空串 = 只收藏没投)。
   */
  stage: string

  /**
   * 最近一次改进度的时刻(ISO;已投的行 = 投递那一刻)。
   */
  updatedAt: string

  /**
   * 职位已下架。
   */
  closed: boolean
}

/**
 * 清单接口的响应体。
 */
export type MyJobsRespJson = {
  /**
   * 清单;缺席按零条读。
   */
  items?: MyJobItem[]
}

/**
 * 改清单。
 */
export type SetItemsFn = (v: MyJobItem[]) => void

/**
 * 两张表(AppliedList / SavedList)的 props。
 */
export type MyJobsListIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 分层态(公司弹框要它;页面门递来)。
   */
  plan: MyJobsPlan
}

/**
 * useMyJobs 的入参。
 */
export type MyJobsHookIn = {
  /**
   * 清单接口。
   */
  url: string
}

/**
 * 一张表整机的面板(useMyJobs 出)。
 */
export type MyJobsPanel = {
  /**
   * 清单(还没拉回来 = null)。
   */
  items: MyJobItem[] | null

  /**
   * 改清单(取消收藏时先本地删)。
   */
  setItems: SetItemsFn

  /**
   * 拉清单失败了(出一句「刷新再试」,不冒充空清单)。
   */
  failed: boolean

  /**
   * 界面语(决定灰注出哪种译名、城市出哪种名)。
   */
  lang: Lang

  /**
   * 弹框栈(公司弹框一层层叠;modal 域 useLayerStack 起的)。
   */
  stack: PeekStackRef

  /**
   * 开公司弹框(叠一层)。
   */
  onOpenCompany: OpenCompanyFn
}

/**
 * 拉清单(makeLoadMyJobs)的入参。
 */
export type LoadMyJobsIn = {
  /**
   * 清单接口。
   */
  url: string

  /**
   * 写清单。
   */
  setItems: SetItemsFn

  /**
   * 拨「拉失败了」。
   */
  setFailed: (v: boolean) => void
}

/**
 * 一行展示行(洗好的字、链接与手柄;单元格与卡片只管摆)。
 */
export type MyJobCellRow = {
  /**
   * 行身份(收藏记录 id)。
   */
  key: string

  /**
   * 职位页链接;空串 = 职位已删、不出链接。
   */
  href: string

  /**
   * 职位名。
   */
  title: string

  /**
   * 公司名。
   */
  company: string

  /**
   * 城市主文案(界面语言有译名用译名)。
   */
  cityName: string

  /**
   * 城市灰注(「英文名 省码」或只有省码)。
   */
  cityNote: string

  /**
   * 城市落职位板按城市筛的地址;空串 = 没有城市、不出链接。
   */
  cityHref: string

  /**
   * 点公司名:开公司弹框;null = 公司表没这家,公司名不可点。
   */
  onCompany: (() => void) | null

  /**
   * 折算年薪(薪资列排序用)。
   */
  salaryAnnual: number | null

  /**
   * 城市格的点击(这两张表里城市不链去职位板,给一个什么都不做的口;随行带来,哑单元格不 import functions)。
   */
  onCity: () => void

  /**
   * 薪资(没有 = 空串)。
   */
  salary: string

  /**
   * 日期(年-月-日;我的求职 = 投递日期,我的收藏 = 发布日期;没有 = 空串)。
   */
  date: string

  /**
   * 日期的排序值(ISO)。
   */
  sortAt: string

  /**
   * 投递进度字样(只收藏没投 = 空串;手机卡胶囊排用)。
   */
  statusText: string

  /**
   * 投递状态格的字(没投过 = 横杠)。
   */
  stageCell: string

  /**
   * 职位状态格的字(在架 / 已下架)。
   */
  listingText: string

  /**
   * 职位已下架(职位状态格染橙)。
   */
  closed: boolean

  /**
   * 「职位已下架」字样;在架 = 空串。
   */
  closedText: string

  /**
   * 「打开」的字。
   */
  openText: string

  /**
   * 「取消收藏」的字(我的求职那张表不出这颗钮,给空串)。
   */
  unsaveText: string

  /**
   * 取消收藏的手柄(我的求职那张表给 null)。
   */
  onUnsave: (() => void) | null
}

/**
 * 一列(交给 table 桶;只声明本桶用到的格)。
 */
export type MyJobCol = {
  /**
   * 列身份。
   */
  key: string

  /**
   * 表头文案。
   */
  label: string

  /**
   * 单元格渲染。
   */
  render: (r: MyJobCellRow) => React.ReactNode

  /**
   * 排序取值器;缺席 = 这列不排序。
   */
  sort?: (r: MyJobCellRow) => string | number | null

  /**
   * 单元格不换行。
   */
  nowrap?: boolean
}

/**
 * 造展示行(myJobCellRowsOf)的入参。
 */
export type CellRowsIn = {
  /**
   * 哪张表。
   */
  kind: ListKind

  /**
   * 清单。
   */
  items: MyJobItem[]

  /**
   * 界面语。
   */
  lang: Lang

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 改清单(取消收藏要用)。
   */
  setItems: SetItemsFn

  /**
   * 开公司弹框(公司格的手柄要用)。
   */
  onOpenCompany: OpenCompanyFn
}

/**
 * 造一行展示行(cellRowOf 及其各格)的入参。
 */
export type CellRowIn = {
  /**
   * 哪张表。
   */
  kind: ListKind

  /**
   * 这一行。
   */
  item: MyJobItem

  /**
   * 整张清单(取消收藏时重建)。
   */
  items: MyJobItem[]

  /**
   * 界面语。
   */
  lang: Lang

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 改清单。
   */
  setItems: SetItemsFn

  /**
   * 开公司弹框(公司格的手柄要用)。
   */
  onOpenCompany: OpenCompanyFn
}

/**
 * 取消收藏(makeUnsave)的入参。
 */
export type UnsaveIn = {
  /**
   * 哪一行(收藏记录 id)。
   */
  id: number

  /**
   * 删之前的整张清单(请求失败时退回它)。
   */
  items: MyJobItem[]

  /**
   * 改清单。
   */
  setItems: SetItemsFn
}

/**
 * 表 + 手机卡片(MyJobsView)的 props。
 */
export type MyJobsViewIn = {
  /**
   * 列组。
   */
  cols: MyJobCol[]

  /**
   * 展示行。
   */
  rows: MyJobCellRow[]

  /**
   * 空态。
   */
  empty: React.ReactNode
}

/**
 * 一张手机卡(MyJobCard)的 props。
 */
export type MyJobCardIn = {
  /**
   * 这一行的展示行。
   */
  r: MyJobCellRow
}

/**
 * 职位卡的标题格(交给 card 桶的 JobCard;只声明用到的格)。
 */
export type CardTitle = {
  /**
   * 标题文字。
   */
  text: string

  /**
   * 去处;缺席 = 纯文字。
   */
  href?: string
}

/**
 * 职位卡的公司格(交给 card 桶的 JobCard;只声明用到的格)。
 */
export type CardCompany = {
  /**
   * 公司名。
   */
  text: string

  /**
   * 点了开公司弹框;缺席 = 不可点。
   */
  onClick?: () => void
}

/**
 * 开着的公司弹框是哪一家(形同雇主板 EmpModal)。
 */
export type CoPeek = {
  /**
   * 公司页 slug(弹框按它取数)。
   */
  slug: string

  /**
   * 公司名(弹框页眉标题)。
   */
  name: string
}

/**
 * 开公司弹框。
 */
export type OpenCompanyFn = (co: CoPeek) => void

/**
 * 弹框栈的职位层(公司弹框里点在招职位叠开;与 advisor 域的同名形状同形,本域自抄)。
 */
export type PeekJobLayer = {
  /**
   * 层的种类。
   */
  kind: 'job'

  /**
   * 这一岗(整行)。
   */
  job: MyJobsJob
}

/**
 * 弹框栈的公司层。
 */
export type PeekCoLayer = {
  /**
   * 层的种类。
   */
  kind: 'company'

  /**
   * 这一家。
   */
  co: CoPeek
}

/**
 * 弹框栈的一层。
 */
export type PeekLayer = PeekJobLayer | PeekCoLayer

/**
 * 弹框栈(modal 域 useLayerStack 的出参;形状本域自抄):各层从下到上与三个手柄。
 */
export type PeekStackRef = {
  /**
   * 从下到上的各层。
   */
  layers: PeekLayer[]

  /**
   * 叠上一层。
   */
  push: (layer: PeekLayer) => void

  /**
   * 换掉最上面一层。
   */
  swapTop: (layer: PeekLayer) => void

  /**
   * 关掉最上面一层。
   */
  pop: () => void
}

/**
 * 职位板整行(外域形状,逐行特批):公司弹框现取回来、原样喂给职位描述弹框,本域一格不读。
 */
export type MyJobsJob = JobRow

/**
 * 分层态(外域形状,逐行特批):页面门递来、原样喂给公司弹框,本域一格不读。
 */
export type MyJobsPlan = Plan
