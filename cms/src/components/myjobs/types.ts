/**
 * 「我的」页两张岗位清单(myjobs 组件桶)的形状:线格式 → 展示行 → 清单。
 * 2026-10-08 进度板:列构造撤,展示行直接喂横卡。
 * 2026-10-09 N6 批:职位名 / 公司名换 name 桶现成件,弹框栈各层形状与开框手柄退役;下面特批行说的「整份行」随之不再有,只剩分层态透传。
 *
 * @author Frank
 * @time 2026-10-06 23:20:00
 */
// eslint-disable-next-line local/no-import-in-leaf -- 原样透传给公司弹框的整份行与分层态,本域一格不读(先例 employers/types.ts)
import type { Plan } from '@/lib/jobs'

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形;形状本桶自己声明)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 哪张清单:我的求职 / 我的收藏。
 */
export type ListKind = 'applied' | 'saved'

/**
 * 清单的一行(/api/myjobs/* 的线格式;只声明真读的格)。
 */
export type MyJobItem = {
  /**
   * 收藏记录 id(取消收藏时 DELETE 它);我的求职 = 投递行 id。
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
   * 折算年薪(没有 = null)。
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
   * 最近一次改动的时刻(ISO;发出去的行 = 发出那一刻,草稿 / 待投 = 最近改动)。
   */
  updatedAt: string

  /**
   * 职位已下架。
   */
  closed: boolean

  /**
   * 库里有投递邮箱(我的收藏:出「投递」钮的前提;2026-10-08)。
   */
  hasEmail: boolean
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
 * 两张清单(AppliedList / SavedList)的 props。
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
 * 一张清单整机的面板(useMyJobs 出)。
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
   * 阶段筛选(all = 不筛;我的求职顶上那排胶囊)。
   */
  stage: string

  /**
   * 改阶段筛选。
   */
  setStage: (s: string) => void
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
 * 一行展示行(洗好的字、链接与手柄;横卡只管摆)。
 */
export type MyJobCellRow = {
  /**
   * 行身份(收藏记录 / 投递行 id)。
   */
  key: string

  /**
   * 原始投递进度(阶段筛选按它;只收藏没投 = 空串)。
   */
  stage: string

  /**
   * 公司首字母(没公司名 = ?)。
   */
  avatar: string

  /**
   * 首字母块的配色类名(c0 ~ c6)。
   */
  avatarCls: string

  /**
   * 职位 id(职位名点了按它叠开职位框;2026-10-09 N6 批换 name 桶 JobName);null = 职位已删,职位名黑字不可点。
   */
  jobId: number | null

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
   * 公司页 slug(公司名点了开公司弹框;2026-10-09 N6 批换 name 桶 CompanyName);空串 = 公司表没这家,公司名黑字不可点。
   */
  companySlug: string

  /**
   * 城市英文名(name 桶 CityName 主文案;空串 = 没有,不出)。
   */
  city: string

  /**
   * 城市中文译名(CityName 灰字;空串 = 译名表外)。
   */
  cityZh: string

  /**
   * 城市韩文译名(同上)。
   */
  cityKo: string

  /**
   * 两位省码(name 桶 ProvName,与城市分开各一份;空串 = 没有,不出)。
   */
  province: string

  /**
   * 薪资(没有 = 空串;只收藏那张清单出)。
   */
  salary: string

  /**
   * 日期一行(「投递于 日期」「最近改于 日期」「发布于 日期」;没有 = 空串)。
   */
  dateText: string

  /**
   * 投递状态胶囊的字(只收藏没投 = 空串)。
   */
  statusText: string

  /**
   * 投递状态胶囊的档(tag 桶;没投 = 空串)。
   */
  statusTag: StatusTag

  /**
   * 职位已下架。
   */
  closed: boolean

  /**
   * 「已下架」字样;在架 = 空串。
   */
  closedText: string

  /**
   * 「打开」的字。
   */
  openText: string

  /**
   * 「取消收藏」的字(我的求职那张清单不出这颗钮,给空串)。
   */
  unsaveText: string

  /**
   * 取消收藏的手柄(我的求职那张清单给 null)。
   */
  onUnsave: (() => void) | null

  /**
   * 发出去的那份简历的地址(我的求职;草稿、我的收藏给空串)。
   */
  resumeHref: string

  /**
   * 那封求职信 PDF 的地址(同上)。
   */
  coverHref: string

  /**
   * 「简历」「求职信」两个字(附件链接)。
   */
  resumeText: string

  /**
   * 「求职信」的字。
   */
  coverText: string

  /**
   * 草稿 / 待投「继续」的去处(投递区);其余 = 空串(2026-10-08)。
   */
  continueHref: string

  /**
   * 点「继续」:整页跳到投递区(2026-10-08 Frank「点继续应该触发什么」—— 同页软跳转只改地址栏不装流程,实撞)。
   * 2026-10-09 A 批:草稿行改为就地弹投递框;待投行照旧整页跳到「今日待投」。
   */
  onContinue: () => void

  /**
   * 「继续」的字。
   */
  continueText: string

  /**
   * 收藏行「投递」的去处(投递区);投不了 = 空串(2026-10-08)。
   */
  applyHref: string

  /**
   * 点收藏行「投递」:就地弹投递框(2026-10-09 A 批)。
   */
  onApply: () => void

  /**
   * 「投递」的字。
   */
  applyText: string
}

/**
 * 造展示行(myJobCellRowsOf)的入参。
 */
export type CellRowsIn = {
  /**
   * 哪张清单。
   */
  kind: ListKind

  /**
   * 当前状态筛选(全部 / 草稿 / 待投…;收藏清单恒「全部」)。筛到单一状态时行上不再重复挂状态胶囊
   * (2026-10-08 Frank「这已经是待投了,为什么还要右边加个待投标签」)。
   */
  filter: string

  /**
   * 清单。
   */
  items: MyJobItem[]

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 改清单(取消收藏要用)。
   */
  setItems: SetItemsFn
}

/**
 * 造一行展示行(cellRowOf 及其各格)的入参。
 */
export type CellRowIn = {
  /**
   * 哪张清单。
   */
  kind: ListKind

  /**
   * 当前状态筛选(同 CellRowsIn.filter)。
   */
  filter: string

  /**
   * 这一行。
   */
  item: MyJobItem

  /**
   * 整张清单(取消收藏时重建)。
   */
  items: MyJobItem[]

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 改清单。
   */
  setItems: SetItemsFn
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
 * 横卡清单(JobList)的 props。
 */
export type JobListIn = {
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
 * 一张横卡(JobRow)的 props。
 */
export type JobRowIn = {
  /**
   * 这一行的展示行。
   */
  r: MyJobCellRow
}

/**
 * 阶段胶囊排(StageBar)的 props。
 */
export type StageBarIn = {
  /**
   * 胶囊(字 + 计数 + 选中没有 + 点了切到哪一档)。
   */
  pills: StagePill[]

  /**
   * 切档。
   */
  onPick: (key: string) => void
}

/**
 * 一枚阶段胶囊。
 */
export type StagePill = {
  /**
   * 筛哪一类(all = 不筛)。
   */
  key: string

  /**
   * 字。
   */
  label: string

  /**
   * 这一类有几岗。
   */
  count: number

  /**
   * 选中了没有。
   */
  on: boolean
}

/**
 * 一枚阶段胶囊钮(StagePillButton)的 props。
 */
export type StagePillIn = {
  /**
   * 这一枚。
   */
  pill: StagePill

  /**
   * 切档。
   */
  onPick: (key: string) => void
}

/**
 * `makePillClick` 的入参。
 */
export type PillClickIn = {
  /**
   * 这一枚的档键。
   */
  key: string

  /**
   * 切档。
   */
  onPick: (key: string) => void
}

/**
 * `stagePillsOf` 的入参。
 */
export type StagePillsIn = {
  /**
   * 清单(全部,不筛)。
   */
  items: MyJobItem[]

  /**
   * 当前筛哪一类。
   */
  stage: string

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * `byStageOf`(按阶段筛清单)的入参。
 */
export type ByStageIn = {
  /**
   * 清单。
   */
  items: MyJobItem[]

  /**
   * 筛哪一类(all = 不筛)。
   */
  stage: string
}

/**
 * `makePick`(阶段胶囊点了切档)的入参。
 */
export type PickIn = {
  /**
   * 切档落格。
   */
  setStage: (s: string) => void
}

/**
 * 分层态(外域形状,逐行特批):页面门递来、原样喂给公司弹框,本域一格不读。
 */
export type MyJobsPlan = Plan

/**
 * `fileHrefOf` 的入参。
 */
export type FileHrefIn = {
  /**
   * 这一行的造行入参(哪张清单、这一行)。
   */
  x: CellRowIn

  /**
   * 附件种类尾。
   */
  tail: string
}

/**
 * 投递状态的一档(STAGES 的一行)。
 */
export type StageDef = {
  /**
   * 状态值。
   */
  st: string

  /**
   * 词条。
   */
  labelKey: string

  /**
   * 胶囊档。
   */
  tag: StatusTag
}

/**
 * 投递状态胶囊能用的档(tag 桶的四档;空串 = 没胶囊)。
 */
export type StatusTag = 'info' | 'ok' | 'bad' | 'gray' | ''

/**
 * `dateLineOf` 的入参。
 */
export type DateLineIn = {
  /**
   * 造行入参(取词函数在里面)。
   */
  x: CellRowIn

  /**
   * 词条键。
   */
  key: string

  /**
   * ISO 时刻(没有 = 空串)。
   */
  iso: string
}

/**
 * `avaClsOf` 的入参。
 */
export type AvaClsIn = {
  /**
   * 配色类名(c0 ~ c6)。
   */
  cls: string
}

/**
 * 没有这一档。
 */
export type MaybeStageDef = StageDef | null
