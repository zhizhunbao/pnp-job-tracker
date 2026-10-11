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
 * 界面语三字面量(各域自抄;2026-10-10 批 2 推荐行的译名灰字要它)。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 锁住那条的一份假字纹理。
 */
export type LockFill = {
  /**
   * 假公司名。
   */
  company: string

  /**
   * 假地址。
   */
  address: string

  /**
   * 假薪资。
   */
  salary: string
}

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

  /**
   * 发出时附了求职信(我的求职:出「求职信」链接的前提;2026-10-10 Frank「两处都改吧」)。
   */
  hasCover: boolean

  /**
   * 职位名中文译文(没有 = 空串;2026-10-10 批 2)。
   */
  titleZh: string

  /**
   * 职位名韩文译文(没有 = 空串)。
   */
  titleKo: string

  /**
   * 公司中文译名(没有 = 空串)。
   */
  companyZh: string

  /**
   * 公司韩文译名(没有 = 空串)。
   */
  companyKo: string

  /**
   * 地点一行(照 Indeed)。
   */
  address: string

  /**
   * 工时归一值 full / part(没标 = 空串;2026-10-10 批 2)。
   */
  hours: string

  /**
   * 雇佣期归一值(没标 = 空串)。
   */
  term: string

  /**
   * 截止日(ISO;没有 = 空串)。
   */
  validThrough: string

  /**
   * 收藏的时刻(ISO;「收藏于」与手机卡右上日期;2026-10-10 批 2)。
   */
  savedAt: string
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

  /**
   * 界面语(译名灰字要它;2026-10-10 批 2)。
   */
  lang: Lang

  /**
   * 懒翻回来的职位名译名表(jobtitle 桶 useTitleMap;库里没存界面语译名的岗名才在里面)。
   */
  titles: Record<string, string>
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

  /**
   * 界面语。
   */
  lang: Lang

  /**
   * 懒翻回来的职位名译名表(jobtitle 桶 useTitleMap;库里没存界面语译名的岗名才在里面)。
   */
  titles: Record<string, string>
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
 * 一张清单(JobList:网页端通用 Table、手机一岗一张卡)的 props。
 */
export type JobListIn = {
  /**
   * 展示行。
   */
  rows: ListRow[]

  /**
   * 网页端的列。
   */
  cols: MjCol<ListRow>[]

  /**
   * 空态。
   */
  empty: React.ReactNode
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
export type StatusTag = 'info' | 'ok' | 'bad' | 'gray'

/**
 * 没有这一档。
 */
export type MaybeStageDef = StageDef | null

/**
 * 今日推荐一行(线格式;lib/myjobs 的 PickRow 全格照抄)。
 */
export type PickItem = {
  /**
   * 职位 id。
   */
  id: number

  /**
   * 职位名英文原文。
   */
  title: string

  /**
   * 职位名中文译文(没有 = 空串)。
   */
  titleZh: string

  /**
   * 职位名韩文译文(没有 = 空串)。
   */
  titleKo: string

  /**
   * 公司英文名。
   */
  company: string

  /**
   * 公司中文译名(没有 = 空串)。
   */
  companyZh: string

  /**
   * 公司韩文译名(没有 = 空串)。
   */
  companyKo: string

  /**
   * 公司页 slug(没有 = 空串)。
   */
  companySlug: string

  /**
   * 地点一行(照 Indeed)。
   */
  address: string

  /**
   * 城市英文名。
   */
  city: string

  /**
   * 城市中文译名(没有 = 空串)。
   */
  cityZh: string

  /**
   * 城市韩文译名(没有 = 空串)。
   */
  cityKo: string

  /**
   * 省码。
   */
  province: string

  /**
   * 薪资显示串(没有 = 空串)。
   */
  salary: string

  /**
   * 发布日期(ISO;没有 = 空串)。
   */
  datePosted: string

  /**
   * 推荐理由码。
   */
  reasons: string[]

  /**
   * 省提名项目简称(没有 = 空串)。
   */
  program: string

  /**
   * 工时归一值 full / part(没标 = 空串;2026-10-10 批 2)。
   */
  hours: string

  /**
   * 雇佣期归一值(没标 = 空串)。
   */
  term: string

  /**
   * 截止日(ISO;没有 = 空串)。
   */
  validThrough: string
}

/**
 * 「更多推荐」里锁住的一条(线格式:只有职位名与理由)。
 */
export type LockedItem = {
  /**
   * 职位名英文原文。
   */
  title: string

  /**
   * 推荐理由码。
   */
  reasons: string[]

  /**
   * 省提名项目简称(没有 = 空串)。
   */
  program: string
}

/**
 * 推荐接口回包(信任边界:缺席的格按空读)。
 */
export type PicksRespJson = {
  /**
   * 看得见的推荐。
   */
  picks?: PickItem[]

  /**
   * 还有几条看不见。
   */
  more?: number

  /**
   * 锁住给看的几条。
   */
  locked?: LockedItem[]
}

/**
 * 推荐(洗净)。
 */
export type PicksFact = {
  /**
   * 看得见的推荐。
   */
  picks: PickItem[]

  /**
   * 还有几条看不见。
   */
  more: number

  /**
   * 锁住给看的几条。
   */
  locked: LockedItem[]
}

/**
 * 推荐整机的面板(usePicks 出)。
 */
export type PicksPanel = {
  /**
   * 推荐(还没拉回来 = null)。
   */
  data: PicksFact | null

  /**
   * 拉失败了。
   */
  failed: boolean

  /**
   * 定价框开着没有。
   */
  upsell: boolean

  /**
   * 开定价框。
   */
  onUpsell: () => void

  /**
   * 关定价框。
   */
  onUpsellClose: () => void
}

/**
 * 拉推荐(makeLoadPicks)的入参。
 */
export type LoadPicksIn = {
  /**
   * 写推荐。
   */
  setData: (v: PicksFact) => void

  /**
   * 拨「拉失败了」。
   */
  setFailed: (v: boolean) => void

  /**
   * 不用服务端当天缓存、现算一份(2026-10-11:这一页答过档案)。
   */
  fresh: boolean
}

/**
 * 推荐展示行(pickCellRowsOf)的入参。
 */
export type PickRowsIn = {
  /**
   * 推荐。
   */
  items: PickItem[]

  /**
   * 界面语。
   */
  lang: Lang

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 懒翻回来的职位名译名表(jobtitle 桶 useTitleMap;库里没存界面语译名的岗名才在里面)。
   */
  titles: Record<string, string>
}

/**
 * 一行推荐展示行(pickCellRowOf)的入参。
 */
export type PickRowIn = {
  /**
   * 这一行。
   */
  item: PickItem

  /**
   * 界面语。
   */
  lang: Lang

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 懒翻回来的职位名译名表(jobtitle 桶 useTitleMap;库里没存界面语译名的岗名才在里面)。
   */
  titles: Record<string, string>
}

/**
 * 理由胶囊的字(reasonTextsOf)的入参。
 */
export type ReasonTextsIn = {
  /**
   * 理由码。
   */
  reasons: string[]

  /**
   * 省提名项目简称。
   */
  program: string

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 推荐两张卡(Picks)的 props。
 */
export type PicksIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 是不是 Pro(决定出不出「更多推荐」;服务端另有自己的判定)。
   */
  pro: boolean

  /**
   * 重拉代数(投出一封加一,推荐跟着重拉;页面门递来)。
   */
  gen: number

  /**
   * 答档案代数(2026-10-11「进我的求职先弹五题」:五题弹框关了加一,推荐跟着重拉、且不用服务端当天缓存;页面门递来)。
   */
  asked: number
}

/**
 * usePicks 的入参。
 */
export type PicksHookIn = {
  /**
   * 重拉代数。
   */
  gen: number

  /**
   * 答档案代数(大于 0 = 这一页答过,重拉时现算)。
   */
  asked: number
}

/**
 * 「更多推荐」卡的 props。
 */
export type MorePicksIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 还有几条看不见。
   */
  more: number

  /**
   * 锁住给看的几条。
   */
  locked: LockedItem[]

  /**
   * 点「升级 Pro」。
   */
  onUpgrade: () => void
}

/**
 * 锁住的一条(LockedPick 组件)的 props。
 */
export type LockedPickIn = {
  /**
   * 职位名。
   */
  title: string

  /**
   * 理由胶囊的字。
   */
  reasons: string[]

  /**
   * 第几条(挑一份假字纹理)。
   */
  i: number
}

/**
 * 一张分区白卡(Section)的 props。
 */
export type SectionIn = {
  /**
   * 卡标题。
   */
  title: string

  /**
   * 标题旁的灰字计数(不出 = null)。
   */
  count: number | null

  /**
   * 锚点 id(旧深链 `?sec=favs` 滚到收藏卡用;不要 = 空串)。
   */
  anchor: string

  /**
   * 卡内容。
   */
  children: React.ReactNode
}

/**
 * 推送卡整机的面板(usePush 出)。
 */
export type PushPanel = {
  /**
   * 设置拉回来了没有(没拉回来不渲)。
   */
  ready: boolean

  /**
   * 拉失败了。
   */
  failed: boolean

  /**
   * 选中的频率(空串 = 不发;下拉的「全部」档就是它)。
   */
  freq: string

  /**
   * 改频率。
   */
  setFreq: (v: string) => void

  /**
   * 邮箱框里的字。
   */
  email: string

  /**
   * 改邮箱框。
   */
  setEmail: (v: string) => void

  /**
   * 保存后的那一句(没有 = 空串)。
   */
  note: string

  /**
   * 正在存。
   */
  busy: boolean

  /**
   * 点「保存」。
   */
  onSave: () => void
}

/**
 * 推送卡(Push)的 props。
 */
export type PushIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 拨一个开关(makeFlag)的入参。
 */
export type FlagIn = {
  /**
   * 落格。
   */
  set: (v: boolean) => void

  /**
   * 拨成什么。
   */
  v: boolean
}

/**
 * 一枚胶囊(理由 / 状态 / 已下架)。
 */
export type TagItem = {
  /**
   * 字。
   */
  text: string

  /**
   * tag 桶的档。
   */
  variant: StatusTag | 'warn'
}

/**
 * 操作格里的一颗钮。
 */
export type ActBtn = {
  /**
   * 身份。
   */
  key: string

  /**
   * 字。
   */
  text: string

  /**
   * 钮档:主钮 / 带框次钮。
   */
  kind: 'primary' | 'secondary'

  /**
   * 点了做什么(链接钮给 null)。
   */
  onClick: (() => void) | null

  /**
   * 链接(新标签开;按钮给空串)。
   */
  href: string
}

/**
 * 三张清单(今日推荐 / 我的收藏 / 我的投递)共用的展示行(2026-10-10 批 2:网页端表格各格、手机卡各行都从它取)。
 */
export type ListRow = {
  /**
   * 行身份。
   */
  key: string

  /**
   * 职位 id(职位删了 = null,职位名黑字不可点)。
   */
  jobId: number | null

  /**
   * 职位名英文原文。
   */
  title: string

  /**
   * 职位名灰字(界面语译名;英文界面空串)。
   */
  titleSub: string

  /**
   * 「已下架」字(在架 = 空串;挂在职位名后面)。
   */
  closedText: string

  /**
   * 公司英文名。
   */
  company: string

  /**
   * 公司中文译名。
   */
  companyZh: string

  /**
   * 公司韩文译名。
   */
  companyKo: string

  /**
   * 公司页 slug(没有 = 空串)。
   */
  companySlug: string

  /**
   * 地点一行(照 Indeed)。
   */
  address: string

  /**
   * 地点的 Google 地图链接(没有地点 = 空串)。
   */
  addressHref: string

  /**
   * 地点灰字(「市译名,省译名」;英文界面空串)。
   */
  addressSub: string

  /**
   * 薪资(没有 = 空串)。
   */
  salary: string

  /**
   * 工时英文名(Full-time / Part-time;没标 = 空串)。
   */
  hoursEn: string

  /**
   * 工时界面语灰字。
   */
  hoursSub: string

  /**
   * 雇佣期英文名(Permanent / Fixed-term / Seasonal / Casual;没标 = 空串)。
   */
  termEn: string

  /**
   * 雇佣期界面语灰字。
   */
  termSub: string

  /**
   * 发布日期(年-月-日;没有 = 空串)。
   */
  posted: string

  /**
   * 截止日期(年-月-日;没有 = 空串)。
   */
  deadline: string

  /**
   * 收藏于(年-月-日;不是收藏清单 = 空串)。
   */
  savedOn: string

  /**
   * 投递于(年-月-日;只有发出去的行有)。
   */
  appliedOn: string

  /**
   * 手机卡右上角的日期(推荐 = 发布日期、收藏 = 收藏日期、已投 = 投递日期;没有 = 空串)。
   */
  cornerDate: string

  /**
   * 胶囊(推荐 = 理由、投递 = 状态)。
   */
  tags: TagItem[]

  /**
   * 操作钮(主钮在前)。
   */
  acts: ActBtn[]

  /**
   * 附件链接(我的投递发出去的行:简历 / 求职信;没有 = 空清单)。
   */
  files: ActBtn[]
}

/**
 * 网页端一列(table 桶 Col 的本桶抄形;只声明用到的格)。
 */
export type MjCol<T> = {
  /**
   * 列身份。
   */
  key: string

  /**
   * 表头。
   */
  label: React.ReactNode

  /**
   * 单元格。
   */
  render: (r: T) => React.ReactNode

  /**
   * 单元格不换行。
   */
  nowrap?: boolean
}

/**
 * 手机卡(MjCard)的 props。
 */
export type MjCardIn = {
  /**
   * 展示行。
   */
  r: ListRow
}

/**
 * 胶囊一排(TagList)的 props。
 */
export type TagListIn = {
  /**
   * 胶囊。
   */
  tags: TagItem[]
}

/**
 * 一排钮(ActList)的 props。
 */
export type ActListIn = {
  /**
   * 钮。
   */
  acts: ActBtn[]
}

/**
 * 列构造(pickColsOf / savedColsOf / appliedColsOf)的入参。
 */
export type ColsIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * viewRowOf 的入参(只读投递框「职位信息」卡的展示行)。
 */
export type ViewRowIn = {
  /**
   * 我的投递清单里那一行。
   */
  item: MyJobItem

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 界面语。
   */
  lang: Lang
}

/**
 * itemByIdOf 的入参。
 */
export type ItemByIdIn = {
  /**
   * 我的投递清单。
   */
  items: MyJobItem[]

  /**
   * 投递行 id。
   */
  id: number
}

/**
 * fileHrefFor 的入参。
 */
export type FileHrefForIn = {
  /**
   * 展示行。
   */
  row: ListRow

  /**
   * 附件身份(ACT_RESUME / ACT_COVER)。
   */
  key: string
}

/**
 * 只读投递框宿主 AppViewHost 的 props(2026-10-10 批 3)。
 */
export type AppViewHostIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 只读投递框 AppView 的 props。
 */
export type AppViewIn = {
  /**
   * 投递行 id。
   */
  appId: number

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 关框。
   */
  onClose: () => void
}

/**
 * useAppView 整机的面板:清单里那一行、往来、拉失败了没。
 */
export type AppViewPanel = {
  /**
   * 我的投递清单里那一行(还没拉回来 / 不在清单里 = null)。
   */
  item: MyJobItem | null

  /**
   * 往来(还没拉回来 = null)。
   */
  thread: AvThread | null

  /**
   * 两样有一样拉失败了。
   */
  failed: boolean
}

/**
 * 只读投递框「雇主回复」卡里一封回信的 props。
 */
export type AvMsgIn = {
  /**
   * 那一封。
   */
  m: AvMsg

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 只读投递框要的往来(子桶 thread 的 ThreadView 全格照抄;types 不 import)。
 */
export type AvThread = {
  /**
   * 英文姓名(没有给空串)。
   */
  senderName: string

  /**
   * 回复邮箱。
   */
  replyTo: string

  /**
   * 简历附件名。
   */
  resumeFile: string

  /**
   * 求职信附件名(空串 = 没附)。
   */
  coverFile: string

  /**
   * 邮件预览的收件人(公司名)。
   */
  company: string

  /**
   * 标题。
   */
  subject: string

  /**
   * 正文。
   */
  body: string

  /**
   * 发出时刻('YYYY-MM-DD HH:mm')。
   */
  sentAt: string

  /**
   * 雇主回信(先来的在前)。
   */
  messages: AvMsg[]

  /**
   * 回信同时转到的邮箱(转发关着给空串)。
   */
  forwardTo: string
}

/**
 * 只读投递框里一封雇主回信(子桶 thread 的 ThreadMsg 全格照抄)。
 */
export type AvMsg = {
  /**
   * 信 id。
   */
  id: number

  /**
   * 发件人一行。
   */
  from: string

  /**
   * 正文。
   */
  text: string

  /**
   * 收到的时刻('YYYY-MM-DD HH:mm')。
   */
  at: string

  /**
   * 本人回出去的。
   */
  replies: AvReply[]
}

/**
 * 本人回出去的一封(子桶 thread 的 ThreadReply 全格照抄)。
 */
export type AvReply = {
  /**
   * 信 id。
   */
  id: number

  /**
   * 正文。
   */
  text: string

  /**
   * 发出的时刻。
   */
  at: string
}

/**
 * useAppView 的入参。
 */
export type AppViewHookIn = {
  /**
   * 投递行 id。
   */
  appId: number
}

/**
 * useAppHost 整机的面板:地址栏里开着的投递行与关框。
 */
export type AppHostPanel = {
  /**
   * 开着的投递行 id(没开 = null)。
   */
  id: number | null

  /**
   * 关框。
   */
  onClose: () => void
}

/**
 * useLazyTitles 的入参(2026-10-11 三张清单的职位名灰字补懒翻)。
 */
export type LazyTitlesIn = {
  /**
   * 这一张清单的行(还没拉到 = null)。
   */
  items: TitledItem[] | null

  /**
   * 界面语。
   */
  lang: Lang
}

/**
 * 带职位名与两语库存译名的一行(MyJobItem / PickItem 都合这个形)。
 */
export type TitledItem = {
  /**
   * 职位名(英文原名)。
   */
  title: string

  /**
   * 库里存好的中文译名(过期当没有 = 空串)。
   */
  titleZh: string

  /**
   * 库里存好的韩文译名。
   */
  titleKo: string
}

/**
 * titleSubFor 的入参:职位名、两语库存译名、懒翻表与界面语。
 */
export type TitleSubForIn = {
  /**
   * 职位名。
   */
  title: string

  /**
   * 库里存好的中文译名。
   */
  titleZh: string

  /**
   * 库里存好的韩文译名。
   */
  titleKo: string

  /**
   * 懒翻回来的译名表。
   */
  titles: Record<string, string>

  /**
   * 界面语。
   */
  lang: Lang
}
