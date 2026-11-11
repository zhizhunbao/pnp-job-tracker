/**
 * me 桶子桶 jobs 的形状:三个接口的线格式(我的投递 / 我的收藏 / 今日推荐 / 档案)→ 展示行 → 各件 props 与各函数契约(本桶自声明)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 界面语三字面量(各域自抄)。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * 分层态(页面门递来、原样报给全站弹框宿主,本桶一格不读;不透明化)。
 */
export type JobsPlan = object

/**
 * 打开只读投递框(父桶注入:子桶 apps 的 openAppView)。
 */
export type OpenAppFn = (appId: number) => void

/**
 * 哪张清单:我的投递 / 我的收藏。
 */
export type ListKind = 'applied' | 'saved'

/**
 * 清单的一行(/api/myjobs/applied、/api/myjobs/saved 的线格式;只声明真读的格)。
 */
export type MyJobItem = {
  /**
   * 收藏记录 id;我的投递 = 投递行 id。
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
   * 职位名中文译文(没有 = 空串)。
   */
  titleZh: string

  /**
   * 职位名韩文译文(没有 = 空串)。
   */
  titleKo: string

  /**
   * 公司名。
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
   * 公司页 slug(点公司名开公司弹框;没有 = 空串)。
   */
  companySlug: string

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
   * 地点一行(照 Indeed)。
   */
  address: string

  /**
   * 薪资显示串。
   */
  salary: string

  /**
   * 工时归一值 full / part(没标 = 空串)。
   */
  hours: string

  /**
   * 雇佣期归一值(没标 = 空串)。
   */
  term: string

  /**
   * 发布日期(ISO)。
   */
  datePosted: string

  /**
   * 截止日(ISO;没有 = 空串)。
   */
  validThrough: string

  /**
   * 收藏的时刻(ISO)。
   */
  savedAt: string

  /**
   * 投递进度(空串 = 只收藏没投)。
   */
  stage: string

  /**
   * 最近一次改动的时刻(ISO;发出去的行 = 发出那一刻,草稿 = 最近改动)。
   */
  updatedAt: string

  /**
   * 职位已下架。
   */
  closed: boolean

  /**
   * 库里有投递邮箱(我的收藏:出「投递」钮的前提)。
   */
  hasEmail: boolean

  /**
   * 发出时附了求职信(我的投递「求职信」格出「查看」的前提;2026-11-11)。
   */
  hasCover: boolean

  /**
   * 发出那份简历的文件类型(没有 = 空串;PDF 才就地预览)。
   */
  resumeMime: string

  /**
   * 这一岗有按职位改写的那份 PDF(草稿行出「查看」的前提)。
   */
  hasTailor: boolean
}

/**
 * 弹框里看的一份附件(发出去的简历 / 求职信;2026-11-11 Frank「用户可以随时查看」)。
 */
export type FileView = {
  /**
   * 是哪一种(列名:简历 / 求职信;弹框标题上面那行小字)。
   */
  kicker: string

  /**
   * 哪个职位的(弹框标题)。
   */
  title: string

  /**
   * 文件地址。
   */
  src: string

  /**
   * 是 PDF(能就地预览;不是就出一句改下载)。
   */
  pdf: boolean
}

/**
 * 开查看附件弹框。
 */
export type FileViewFn = (v: FileView) => void

/**
 * 「简历」「求职信」格里的那颗钮。
 */
export type FileBtn = {
  /**
   * 表格里的钮面(「查看」)。
   */
  text: string

  /**
   * 手机一条里的钮面(列名:简历 / 求职信)。
   */
  label: string

  /**
   * 点了开弹框。
   */
  onClick: () => void
}

/**
 * fileBtnOf / fileSrcOf 的入参。
 */
export type FileBtnIn = {
  /**
   * 这一行与它的清单上下文。
   */
  row: CellRowIn

  /**
   * 要的是求职信(否 = 简历)。
   */
  cover: boolean
}

/**
 * makeFileOpen 的入参。
 */
export type FileOpenIn = {
  /**
   * 开弹框。
   */
  view: FileViewFn

  /**
   * 要看的那一份。
   */
  file: FileView
}

/**
 * 改「开着的那份附件」。
 */
export type FileSetFn = (v: FileView | null) => void

/**
 * 查看附件整机(useFileView 出)。
 */
export type FileViewPanel = {
  /**
   * 开着的那一份(没开 = null)。
   */
  file: FileView | null

  /**
   * 开弹框。
   */
  onView: FileViewFn

  /**
   * 关弹框。
   */
  onClose: () => void
}

/**
 * FileViewModal(查看附件弹框)的 props。
 */
export type FileViewModalIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 开着的那一份。
   */
  file: FileView

  /**
   * 关弹框。
   */
  onClose: () => void
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
 * useMyJobs 的入参。
 */
export type MyJobsHookIn = {
  /**
   * 清单接口。
   */
  url: string

  /**
   * 删一条的接口前缀(后接 id)。
   */
  delHead: string

  /**
   * 重拉代数(变了再拉一次)。
   */
  gen: number
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
   * 拉清单失败了(出一句「刷新再试」,不冒充空清单)。
   */
  failed: boolean

  /**
   * 阶段筛选(all = 不筛;我的投递顶上那排)。
   */
  stage: string

  /**
   * 改阶段筛选。
   */
  setStage: (s: string) => void

  /**
   * 删掉一条(行末「⋯」→ 删除 → 确认后调;2026-11-07)。
   */
  remove: RemoveFn
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
 * 造整张清单展示行(listRowsOf)的入参。
 */
export type CellRowsIn = {
  /**
   * 哪张清单。
   */
  kind: ListKind

  /**
   * 请删除先确认(开确认框;确认了才调 run)。
   */
  ask: AskFn

  /**
   * 删掉这张清单里的一条(先从表里拿掉再发删除,没删成放回)。
   */
  remove: RemoveFn

  /**
   * 当前状态筛选(收藏清单恒「全部」)。筛到单一状态时行上不再重复挂状态胶囊
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
   * 界面语。
   */
  lang: Lang

  /**
   * 懒翻回来的职位名译名表。
   */
  titles: Record<string, string>

  /**
   * 懒翻回来的公司名译名表(公司名 → 界面语译名)。
   */
  cos: Record<string, string>

  /**
   * 打开只读投递框。
   */
  openApp: OpenAppFn

  /**
   * 开查看附件弹框(我的投递的「简历」「求职信」两格;收藏清单给个空手柄)。
   */
  view: FileViewFn
}

/**
 * 造一行展示行(listRowOf 及其各格)的入参。
 */
export type CellRowIn = {
  /**
   * 哪张清单。
   */
  kind: ListKind

  /**
   * 请删除先确认(开确认框;确认了才调 run)。
   */
  ask: AskFn

  /**
   * 删掉这张清单里的一条(先从表里拿掉再发删除,没删成放回)。
   */
  remove: RemoveFn

  /**
   * 当前状态筛选(同 CellRowsIn.filter)。
   */
  filter: string

  /**
   * 这一行。
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

  /**
   * 懒翻回来的职位名译名表。
   */
  titles: Record<string, string>

  /**
   * 懒翻回来的公司名译名表。
   */
  cos: Record<string, string>

  /**
   * 打开只读投递框。
   */
  openApp: OpenAppFn

  /**
   * 开查看附件弹框(我的投递的「简历」「求职信」两格;收藏清单给个空手柄)。
   */
  view: FileViewFn
}

/**
 * 投递状态胶囊能用的档(tag 桶的四档)。
 */
export type StatusTag = 'info' | 'ok' | 'bad' | 'gray'

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
 * 没有这一档。
 */
export type MaybeStageDef = StageDef | null

/**
 * 一枚阶段筛选。
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
 * `makePillClick` 的入参。
 */
export type PillClickIn = {
  /**
   * 这一枚的档键。
   */
  key: string

  /**
   * 切档落格。
   */
  setStage: (s: string) => void
}

/**
 * 阶段筛选排(StageBar)的 props。
 */
export type StageBarIn = {
  /**
   * 筛选(字 + 计数 + 选中没有)。
   */
  pills: StagePill[]

  /**
   * 切档落格。
   */
  setStage: (s: string) => void
}

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
   * 截止日(ISO;没有 = 空串)。
   */
  validThrough: string

  /**
   * 具名省提名通道(没有 = 空串)。
   */
  pnpStream: string

  /**
   * 能走省提名。
   */
  pnpEligible: boolean

  /**
   * 本省有省默认通道。
   */
  provDefault: boolean

  /**
   * 推荐理由码。
   */
  reasons: string[]

  /**
   * 薪资高出本省同职业中位的百分比(没有是 null)。
   */
  abovePct: number | null

  /**
   * 本省同职业时薪中位(没有是 null)。
   */
  wageMedHourly: number | null

  /**
   * 5 位职业码(没有 = 空串)。
   */
  noc: string

  /**
   * 雇主办过的 LMIA 外劳名额(没有是 0)。
   */
  lmiaPositions: number

  /**
   * EE 定向类别(没有 = 空串)。
   */
  eeCategory: string

  /**
   * 社区试点名(RCIP / FCIP;没有 = 空串)。
   */
  pilot: string
}

/**
 * 推荐(洗净)。
 */
export type PicksFact = {
  /**
   * 今天的推荐。
   */
  picks: PickItem[]
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
}

/**
 * usePicks 的入参。
 */
export type PicksHookIn = {
  /**
   * 重拉代数(投出一封加一)。
   */
  gen: number

  /**
   * 答档案代数(大于 0 = 这一页答过,重拉时现算)。
   */
  asked: number
}

/**
 * 推荐展示行(pickRowsOf)的入参。
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
   * 懒翻回来的职位名译名表。
   */
  titles: Record<string, string>

  /**
   * 懒翻回来的公司名译名表。
   */
  cos: Record<string, string>
}

/**
 * 一行推荐展示行(pickRowOf)的入参。
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
   * 懒翻回来的职位名译名表。
   */
  titles: Record<string, string>

  /**
   * 懒翻回来的公司名译名表。
   */
  cos: Record<string, string>
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
 * 一行唯一的那颗钮(2026-11-07 效果图:一行只留一颗主行动)。
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
   * 链接(按钮给空串)。
   */
  href: string
}

/**
 * 三张清单(今日推荐 / 我的收藏 / 我的投递)共用的展示行:网页端表格各格、手机一条各行都从它取。
 */
export type ListRow = {
  /**
   * 行身份。
   */
  key: string

  /**
   * 职位 id(职位删了 = null,职位名黑字不可点;2026-11-07 打码行撤)。
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
   * 通道英文名(只有今日推荐有;不走省提名 = 空串)。
   */
  chanEn: string

  /**
   * 通道界面语名(灰字)。
   */
  chanSub: string

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
   * 地点的 Google 地图链接(按完整地址一行查;没有地点 = 空串)。2026-11-07 网页端「地址」列改「地点」列,
   * 完整地址一行不再上屏,只留这一条链接。
   */
  addressHref: string

  /**
   * 地点灰字(「市译名,省译名」;英文界面空串)。
   */
  addressSub: string

  /**
   * 地点「市, 省码」(手机一条底行;2026-11-07 起网页端「地点」列也出它;没有城市只写省码,都没有 = 空串)。
   */
  place: string

  /**
   * 手机一条底行的「截止 月-日」(没有截止日 = 空串)。
   */
  due: string

  /**
   * 薪资(没有 = 空串)。
   */
  salary: string

  /**
   * 中位时薪与 vs 中位两格(不是推荐清单 = 两格空串)。
   */
  wage: WageView

  /**
   * 工时英文名(没标 = 空串)。
   */
  hoursEn: string

  /**
   * 雇佣期英文名(没标 = 空串)。
   */
  termEn: string

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
   * 完整地址一行(我的投递「地址」列;没有 = 空串;2026-11-11)。
   */
  address: string

  /**
   * 发出去的那份简历的「查看」钮(没有 = null:收藏 / 推荐行、还没改写的草稿)。
   */
  resume: FileBtn | null

  /**
   * 发出去的那封求职信的「查看」钮(没有 = null:没附求职信、收藏 / 推荐行)。
   */
  cover: FileBtn | null

  /**
   * 表格胶囊格(收藏 / 投递 = 状态;推荐原因列 2026-11-09 撤,推荐行给空)。
   */
  tags: TagItem[]

  /**
   * 手机一条上的胶囊(收藏 / 投递 = 状态;推荐不出,照效果图)。
   */
  cardTags: TagItem[]

  /**
   * 唯一那颗钮(没有 = null)。
   */
  act: ActBtn | null

  /**
   * 行末「⋯」菜单各项(2026-11-07 收进删除)。
   */
  menu: RowMenuItem[]

  /**
   * 「⋯」按钮的无障碍名(「更多操作」)。
   */
  more: string
}

/**
 * 行末「⋯」菜单的一项(menu 桶 MenuItem 的本桶抄形)。
 */
export type RowMenuItem = {
  /**
   * 渲染键。
   */
  key: string

  /**
   * 显示文字。
   */
  text: string

  /**
   * 危险操作(红字)。
   */
  danger: boolean

  /**
   * 点这一项。
   */
  onClick: () => void
}

/**
 * 等着确认的一次删除。
 */
export type AskDel = {
  /**
   * 删的是哪一条(确认框正文:职位名)。
   */
  name: string

  /**
   * 确认后真删。
   */
  run: () => void
}

/**
 * 请删除先确认。
 */
export type AskFn = (a: AskDel) => void

/**
 * 删掉清单里的一条(参数:行身份 id)。
 */
export type RemoveFn = (id: number) => void

/**
 * 删除确认框整机(useAskDel)。
 */
export type AskPanel = {
  /**
   * 等着确认的那一次(没有 = null,框不出)。
   */
  ask: AskDel | null

  /**
   * 请删除先确认。
   */
  onAsk: AskFn

  /**
   * 点「删除」:真删再关框。
   */
  onOk: () => void

  /**
   * 点「取消」:关框。
   */
  onCancel: () => void
}

/**
 * 造菜单项「删除」(delMenuOf)的入参。
 */
export type DelMenuIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 请删除先确认。
   */
  ask: AskFn

  /**
   * 删掉这条。
   */
  remove: RemoveFn

  /**
   * 这一条的 id。
   */
  id: number

  /**
   * 确认框里显示的名字(职位名)。
   */
  name: string
}

/**
 * 造「删一条」(makeRemoveMine)的入参。
 */
export type RemoveMineIn = {
  /**
   * 删除接口前缀(后接 id)。
   */
  urlHead: string

  /**
   * 当前清单。
   */
  items: MyJobItem[] | null

  /**
   * 写清单。
   */
  setItems: (v: MyJobItem[] | null) => void
}

/**
 * 发删除请求(sendDelete)的入参。
 */
export type SendDeleteIn = {
  /**
   * 删除接口地址(已带 id)。
   */
  url: string

  /**
   * 没删成时把原样放回。
   */
  restore: () => void
}

/**
 * 拨删除确认框(参数:等着确认的那一次;null = 关框)。
 */
export type AskSetFn = (a: AskDel | null) => void

/**
 * 造「删除」钮(makeAskOk)的入参。
 */
export type AskOkIn = {
  /**
   * 等着确认的那一次。
   */
  ask: AskDel | null

  /**
   * 拨框手柄。
   */
  setAsk: AskSetFn
}

/**
 * 删除确认框(AskDelModal)的 props。
 */
export type AskDelModalIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 删除确认框整机。
   */
  a: AskPanel
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
 * 列构造(pickColsOf / savedColsOf / appliedColsOf)的入参。
 */
export type ColsIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 一张清单(JobList:宽屏通用 Table、窄屏一岗一条)的 props。
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
 * PagedJobList(「我的收藏」「我的投递」分页壳)的 props。
 */
export type PagedJobListIn = {
  /**
   * 展示行(全部;分页在壳里切)。
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

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 手机一条(JobCard)的 props。
 */
export type JobCardIn = {
  /**
   * 展示行。
   */
  r: ListRow
}

/**
 * 一排胶囊(TagList)的 props。
 */
export type TagListIn = {
  /**
   * 胶囊。
   */
  tags: TagItem[]
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
   * 库里存好的中文译名(没有 = 空串)。
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

/**
 * useLazyTitles 的入参。
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
 * 带公司名与两语库存译名的一行(MyJobItem / PickItem 都合这个形)。
 */
export type CompanyNamedItem = {
  /**
   * 公司名(英文原名)。
   */
  company: string

  /**
   * 库里存好的中文译名(没有 = 空串)。
   */
  companyZh: string

  /**
   * 库里存好的韩文译名。
   */
  companyKo: string
}

/**
 * useLazyCompanies 的入参。
 */
export type LazyCompaniesIn = {
  /**
   * 这一张清单的行(还没拉到 = null)。
   */
  items: CompanyNamedItem[] | null

  /**
   * 界面语。
   */
  lang: Lang
}

/**
 * 懒翻回来一家落进译名表(makeCoLand)的入参。
 */
export type CoLandIn = {
  /**
   * 公司名。
   */
  name: string

  /**
   * 改译名表。
   */
  setCos: (f: (prev: Record<string, string>) => Record<string, string>) => void
}

/**
 * 一格公司译名(coAliasFor)的入参。
 */
export type CoAliasForIn = {
  /**
   * 库里存的这一语译名。
   */
  own: string

  /**
   * 公司名。
   */
  name: string

  /**
   * 懒翻表(当前界面语的)。
   */
  cos: Record<string, string>

  /**
   * 这一格是哪一语。
   */
  want: Lang

  /**
   * 界面语。
   */
  lang: Lang
}

/**
 * 手机一条底行(placeDueOf)的入参。
 */
export type PlaceDueIn = {
  /**
   * 城市英文名。
   */
  city: string

  /**
   * 省码。
   */
  province: string

  /**
   * 截止日(ISO;没有 = 空串)。
   */
  validThrough: string

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 手机一条底行的两段。
 */
export type PlaceDue = {
  /**
   * 「市, 省码」(没有城市 = 空串)。
   */
  place: string

  /**
   * 「截止 月-日」(没有截止日 = 空串)。
   */
  due: string
}

/**
 * useJobs 的入参。
 */
export type JobsHookIn = {
  /**
   * 重拉代数(投出一封加一:推荐与我的投递重拉)。
   */
  gen: number

  /**
   * 答档案代数(五题关了加一:推荐按新答案现算)。
   */
  asked: number
}

/**
 * 「我的求职」一页整机(useJobs 出)。
 */
export type JobsPanel = {
  /**
   * 今日推荐。
   */
  picks: PicksPanel

  /**
   * 我的收藏。
   */
  saved: MyJobsPanel

  /**
   * 我的投递。
   */
  applied: MyJobsPanel
}

/**
 * JobsBody(「我的求职」正文)的 props。
 */
export type JobsBodyIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前出哪一张表(picks / saved / applied;2026-11-09 页签挪到侧边栏,由页面递来)。
   */
  tab: string

  /**
   * 分层态(公司 / 职位弹框要它;页面门递来)。
   */
  plan: JobsPlan

  /**
   * 重拉代数(投出一封加一,推荐与我的投递跟着重拉;页面门递来)。
   */
  gen: number

  /**
   * 档案代数(「我的档案」修改面板存好了加一,推荐跟着重拉、且不用服务端当天缓存;页面门递来)。
   */
  asked: number

  /**
   * 点「补全档案」的「去补全」(页面门切到「我的档案」并开修改面板)。
   */
  onFill: () => void

  /**
   * 打开只读投递框(父桶注入:子桶 apps 的 openAppView)。
   */
  openApp: OpenAppFn
}

/**
 * PicksPane(今日推荐页签)的 props。
 */
export type PicksPaneIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 推荐整机。
   */
  p: PicksPanel
}

/**
 * SavedPane / AppliedPane(我的收藏 / 我的投递页签)的 props。
 */
export type ListPaneIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 清单整机。
   */
  l: MyJobsPanel

  /**
   * 打开只读投递框。
   */
  openApp: OpenAppFn
}

/**
 * 一个名字的三语(形同 quiz 域 ProfileName)。
 */
export type PfName = {
  /**
   * 码;城市给空串。
   */
  code: string

  /**
   * 英文名。
   */
  en: string

  /**
   * 中文译名;没有 = 空串。
   */
  zh: string

  /**
   * 韩文译名;没有 = 空串。
   */
  ko: string
}

/**
 * 档案(形同 quiz 域 QuizProfile;/api/quiz/profile 的 profile 格)。
 */
export type PfView = {
  /**
   * 目标档;0 = 没答。
   */
  goal: number

  /**
   * 专业。
   */
  majors: PfName[]

  /**
   * 想做的工作。
   */
  nocs: PfName[]

  /**
   * 现居省码;空串 = 没答或在境外。
   */
  prov: string

  /**
   * 在境外。
   */
  abroad: boolean

  /**
   * 现居城市;没选四格空串。
   */
  city: PfName

  /**
   * 英文姓名;没填空串。
   */
  name: string

  /**
   * 「进我的求职先弹五题」弹过了(记在答案档里随账号走)。
   */
  asked: boolean

  /**
   * 身份词;空串 = 没答。
   */
  who: string

  /**
   * 教育经历串(「所在地.公立私立.时长」);空列 = 没答。
   */
  edu: string[]

  /**
   * 做过的工作(码与译名,2026-11-08)。
   */
  works: PfName[]

  /**
   * 匹配依据;空串 = 没选。
   */
  matchBy: string

  /**
   * 匹配模式;空串 = 没选。
   */
  matchMode: string

  /**
   * 从简历提取、用户保存过的值(「字段:值」串;2026-11-09,值改掉就不再列,胶囊据它出)。
   */
  fromResume: string[]
}

/**
 * /api/quiz/profile 的响应(线格式)。
 */
export type PfJson = {
  /**
   * 档案;未登录时缺席。
   */
  profile?: PfView
}

/**
 * 档案编辑的起始答案(形同 gate 桶 GateEditSeed,本桶亲手构造喂它,全格照抄)。
 */
export type PfSeed = {
  /**
   * 目标档。
   */
  goal: number

  /**
   * 专业码。
   */
  majors: string[]

  /**
   * 职业码。
   */
  nocs: string[]

  /**
   * 现居省码。
   */
  prov: string

  /**
   * 在境外。
   */
  abroad: boolean

  /**
   * 现居城市英文名。
   */
  city: string

  /**
   * 英文姓名。
   */
  name: string

  /**
   * 身份词。
   */
  who: string

  /**
   * 教育经历串。
   */
  edu: string[]

  /**
   * 做过的工作(职业码,2026-11-08)。
   */
  workNocs: string[]

  /**
   * 匹配依据;空串 = 没选。
   */
  matchBy: string

  /**
   * 匹配模式;空串 = 没选。
   */
  matchMode: string

  /**
   * 从简历提取、用户保存过的值(「字段:值」串;2026-11-09,值改掉就不再列,胶囊据它出)。
   */
  fromResume: string[]
}

/**
 * loadProfile 的入参。
 */
export type PfLoadIn = {
  /**
   * 档案落格。
   */
  setView: (v: PfView | null) => void
}

/**
 * FillBar(「补全档案」提示条)的 props。
 */
export type FillBarIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 点「去补全」。
   */
  onFill: () => void
}

/**
 * 提示条整机交回的面板。
 */
export type FillPanel = {
  /**
   * 档案(没取回来 null)。
   */
  view: PfView | null

  /**
   * 这一页点过 ✕。
   */
  hidden: boolean

  /**
   * ✕。
   */
  onHide: () => void
}

/**
 * fillTextOf 的入参。
 */
export type FillTextIn = {
  /**
   * 档案(没取回来 null)。
   */
  view: PfView | null

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * makeFillHide 的入参。
 */
export type FillHideIn = {
  /**
   * 「这一页不再出」落格。
   */
  setHidden: (v: boolean) => void
}

/**
 * useRecordExport 的入参。
 */
export type RecordExportIn = {
  /**
   * 投递清单;还没拉回来为 null。
   */
  items: MyJobItem[] | null

  /**
   * 取词函数。
   */
  t: (key: string, vars?: Record<string, string | number>) => string
}

/**
 * 中位时薪与 vs 中位两格的显示(2026-11-09;子桶 recommend 的 wageViewOf 产出,同形自声明)。
 */
export type WageView = {
  /**
   * 中位时薪显示串(「$N/hr」;没有 = 空串)。
   */
  med: string

  /**
   * vs 中位显示串(「+N%」「-N%」;没有 = 空串)。
   */
  vs: string

  /**
   * 薪资低于中位(vs 中位格用琥珀;否则绿)。
   */
  down: boolean
}
