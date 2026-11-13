/**
 * me 桶子桶 profile 的形状:档案接口回包、我的通道表行与各行为函数、各界面件的契约(本桶自声明)。
 *
 * @author Frank
 * @time 2026-11-07 16:05:00
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
 * 一个名字的三语(形同 quiz 域 ProfileName,本桶自声明)。
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
 * 一串名字。
 */
export type PfNames = PfName[]

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
  majors: PfNames

  /**
   * 想做的工作。
   */
  nocs: PfNames

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
   * 「进我的求职先弹五题」弹过了(2026-10-11;记在答案档里随账号走)。
   */
  asked: boolean

  /**
   * 身份词;空串 = 没答(2026-10-13 档案加题)。
   */
  who: string

  /**
   * 教育经历串(「所在地.公立私立.时长」);空列 = 没答(2026-10-13)。
   */
  edu: string[]

  /**
   * 教育经历明细(2026-11-12;服务端已洗,没存过明细的按 edu 现补);空列 = 没答。档案卡与修改面板以它为准。
   */
  eduList: PfEduItem[]

  /**
   * 简历资料(2026-11-12:工作经历几段、电话、链接、技能与模板)。
   */
  cv: PfCv

  /**
   * 做过的工作(码与译名,2026-11-08)。
   */
  works: PfNames

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
 * 教育经历明细的一条(形同 quiz 域 EduItem,本桶自声明;2026-11-12)。
 */
export type PfEduItem = {
  /**
   * 「所在地.公立私立.时长」串;没选全 = 空串。
   */
  key: string

  /**
   * 证书或学历名称;没填 = 空串。
   */
  cred: string

  /**
   * 学校;没填 = 空串。
   */
  school: string

  /**
   * 开始年份(四位数字);没填 = 空串。
   */
  from: string

  /**
   * 结束年份(四位数字);没填或在读 = 空串。
   */
  to: string

  /**
   * 这一段学的专业(CIP 码;2026-11-12 专业并进教育经历的每一段);没选 = 空串。
   */
  major: string
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
   * 身份词(2026-10-13)。
   */
  who: string

  /**
   * 教育经历串(2026-10-13)。
   */
  edu: string[]

  /**
   * 教育经历明细(2026-11-12)。
   */
  eduList: PfEduItem[]

  /**
   * 简历资料(2026-11-12:工作经历几段、电话、链接、技能与模板)。
   */
  cv: PfCv

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
 * useProfile 的入参。
 */
export type ProfileHookIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 一进页就开着修改面板(从「我的求职」的「去补全」过来)。
   */
  autoEdit: boolean

  /**
   * 档案存好了(交给页面:回「我的求职」时推荐按新档案重算)。
   */
  onChanged: () => void
}

/**
 * 我的档案整机交回的面板。
 */
export type ProfilePanel = {
  /**
   * 取词函数(入参原样交回,同 pnp 桶 usePnpMyStreams 交回的那格)。
   */
  t: TFn

  /**
   * 界面语(灰字取哪种译名)。
   */
  lang: Lang

  /**
   * 取数状态(busy / ok / fail)。
   */
  load: string

  /**
   * 档案;没到 = null。
   */
  view: PfView | null

  /**
   * 修改弹框开着。
   */
  editing: boolean

  /**
   * 编辑弹框从哪一题开始(题键;空串 = 第一题;2026-10-13)。
   */
  start: string

  /**
   * 开修改弹框(从第一题起)。
   */
  onEdit: () => void

  /**
   * 「我的通道」的「去回答」:开编辑弹框、直接到身份题(2026-10-13)。
   */
  onAsk: () => void

  /**
   * 关修改弹框(没保存)。
   */
  onClose: () => void

  /**
   * 保存成功:关框、重取档案。
   */
  onSaved: () => void
}

/**
 * ProfileActs / ProfileBody(页标题右边的「修改」、正文)的 props。
 */
export type ProfilePartIn = {
  /**
   * 我的档案状态。
   */
  p: ProfilePanel

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * loadProfile 的入参。
 */
export type PfLoadIn = {
  /**
   * 档案落格。
   */
  setView: (v: PfView | null) => void

  /**
   * 取数状态落格。
   */
  setLoad: (v: string) => void
}

/**
 * makeEditOpen 的入参。
 */
export type PfEditOpenIn = {
  /**
   * 起始题落格。
   */
  setStart: (v: string) => void

  /**
   * 弹框开关落格。
   */
  setEditing: (v: boolean) => void

  /**
   * 从哪一题开始(题键;空串 = 第一题)。
   */
  start: string
}

/**
 * makeUploadedFill 的入参。
 */
export type PfUploadedIn = {
  /**
   * 档案;还没取到 = null。
   */
  view: PfView | null

  /**
   * 起始方式落格。
   */
  setStart: (v: string) => void

  /**
   * 修改面板开关落格。
   */
  setEditing: (v: boolean) => void
}

/**
 * makeFlagSet 的入参。
 */
export type PfFlagSetIn = {
  /**
   * 开关落格。
   */
  set: (v: boolean) => void

  /**
   * 落什么。
   */
  v: boolean
}

/**
 * makeProfileSaved 的入参。
 */
export type PfSavedIn = {
  /**
   * 关框。
   */
  setEditing: (v: boolean) => void

  /**
   * 重取的代数落格。
   */
  setGen: (v: number) => void

  /**
   * 当前代数。
   */
  gen: number

  /**
   * 档案存好了的交还口(页面把档案代数 +1)。
   */
  onChanged: () => void
}

/**
 * pfShownOf 的入参。
 */
export type PfShownIn = {
  /**
   * 全部名字。
   */
  names: PfNames

  /**
   * 已展开了几个(pager 桶 useFold 交回;0 = 收着)。
   */
  extra: number
}

/**
 * ProfileRows(档案那几行)的 props。
 */
export type PfRowsIn = {
  /**
   * 档案。
   */
  v: PfView

  /**
   * 界面语。
   */
  lang: Lang

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * ProfileItem(Essentials 里的一条「标签-值」)的 props。
 */
export type PfItemIn = {
  /**
   * 标签。
   */
  k: string

  /**
   * 值。
   */
  children: React.ReactNode
}

/**
 * ProfileNames(一格里一串名字)的 props。
 */
export type PfNamesIn = {
  /**
   * 名字。
   */
  names: PfNames

  /**
   * 来自简历的标记。
   */
  marks: string[]

  /**
   * 这一格在标记里的字段名;空串 = 不打胶囊。
   */
  field: string

  /**
   * 界面语。
   */
  lang: Lang

  /**
   * 取词函数(「展开其余 N 个」)。
   */
  t: TFn
}

/**
 * ProfileWhere(所在地那一格)的 props。
 */
export type PfWhereIn = {
  /**
   * 档案。
   */
  v: PfView

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * ProfileEdu(「教育经历」那一格)的 props。
 */
export type PfEduIn = {
  /**
   * 教育经历明细(2026-11-12 起读明细,原先读教育经历串)。
   */
  list: PfEduItem[]

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 档案卡上教育经历的一条(两行;pfEduLinesOf 出)。
 */
export type PfEduLine = {
  /**
   * 第一行的几个词(年份、证书或学历名称;两样都没有时是「所在地, 公立私立, 时长」一句)。
   */
  main: string[]

  /**
   * 第二行灰字(学校,再加 key 的三个词);没有 = 空串。
   */
  sub: string
}

/**
 * pfEduLinesOf 的入参。
 */
export type PfEduLinesIn = {
  /**
   * 教育经历明细。
   */
  list: PfEduItem[]

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * pfEduLineOf / pfEduPartsOf 的入参。
 */
export type PfEduLineIn = {
  /**
   * 一条明细。
   */
  e: PfEduItem

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * pfRuleKeyOf 的入参。
 */
export type PfRuleIn = {
  /**
   * 匹配依据;空串 = 没选。
   */
  matchBy: string

  /**
   * 匹配模式;空串 = 没选。
   */
  matchMode: string
}

/**
 * MyStreams(档案下面的「我的通道」卡)的 props(2026-10-13)。
 */
export type MyStreamsIn = {
  /**
   * 档案。
   */
  v: PfView

  /**
   * 界面语言。
   */
  lang: Lang

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 「去回答」:开档案的编辑弹框。
   */
  onEdit: () => void
}

/**
 * 条件胶囊一枚(pnp 桶 ChannelTag 同形)。
 */
export type MyStreamTag = {
  /**
   * 键。
   */
  key: string

  /**
   * 字。
   */
  text: string

  /**
   * 样式类。
   */
  cls: string
}

/**
 * 「我的通道」表的一行(pnp 桶表行 + 点通道名的手柄;条件胶囊的形本桶自声明)。
 */
export type MyStreamCellRow = {
  /**
   * 通道编号。
   */
  key: string

  /**
   * 官方英文名。
   */
  title: string

  /**
   * 界面语言名。
   */
  sub: string

  /**
   * 全程;没有给空串。
   */
  total: string

  /**
   * 条件胶囊(字与样式类)。
   */
  tags: MyStreamTag[]

  /**
   * 点通道名:开弹框。
   */
  onOpen: () => void
}

/**
 * useMyStreams 的入参。
 */
export type MyStreamsHookIn = {
  /**
   * 档案的所在省码(空串 = 没答或在境外)。
   */
  prov: string
}

/**
 * useMyStreams 交回的面板。
 */
export type MyStreamsPanel = {
  /**
   * 看哪个省。
   */
  prov: string

  /**
   * 造「点省份胶囊」。
   */
  provPickOf: (code: string) => () => void

  /**
   * 开着弹框的通道编号;空串 = 没开。
   */
  open: string

  /**
   * 造「点通道名」。
   */
  openOf: (key: string) => () => void

  /**
   * 关弹框。
   */
  onClose: () => void
}

/**
 * makeProvPickOf 的入参。
 */
export type MsProvPickIn = {
  /**
   * 省份落格。
   */
  setProv: (v: string) => void

  /**
   * 开着的通道落格(换省时关掉)。
   */
  setOpen: (v: string) => void
}

/**
 * makeStreamOpenOf 的入参。
 */
export type MsOpenIn = {
  /**
   * 开着的通道落格。
   */
  setOpen: (v: string) => void
}

/**
 * makeTextSet 的入参。
 */
export type PfTextSetIn = {
  /**
   * 字串落格。
   */
  set: (v: string) => void

  /**
   * 落什么。
   */
  v: string
}

/**
 * MyStreamModal 的 props。
 */
export type MyStreamModalIn = {
  /**
   * 界面语言。
   */
  lang: Lang

  /**
   * 省码。
   */
  province: string

  /**
   * 通道编号。
   */
  streamKey: string

  /**
   * 官方英文名。
   */
  title: string

  /**
   * 界面语言名。
   */
  sub: string

  /**
   * 小标(省名)。
   */
  kicker: string

  /**
   * 关框。
   */
  onClose: () => void
}

/**
 * MyStreamCard(「我的通道」手机卡)的 props(2026-10-13)。
 */
export type MyStreamCardIn = {
  /**
   * 这一行。
   */
  r: MyStreamCellRow
}

/**
 * 档案里的简历资料(2026-11-12 Frank「右侧弹 sidebar 用户一项一项填,最后用 sonnet 生成简历」;服务端已洗;
 * 形同 lib/quiz CvFacts 与 gate 桶 GateCv,本桶自声明、整份递给修改面板)。
 */
export type PfCv = {
  /**
   * 工作经历几段;空列 = 还没存过。
   */
  work: PfWork[]

  /**
   * 电话;空串 = 没填。
   */
  phone: string

  /**
   * 个人链接(领英等);空串 = 没填。
   */
  link: string

  /**
   * 技能,一行一项;空串 = 没填。
   */
  skills: string

  /**
   * 简历模板:classic / modern。
   */
  tpl: string
}

/**
 * 工作经历一段(形同 lib/quiz CvWork)。
 */
export type PfWork = {
  /**
   * 这一段对应的职业码;空列 = 没选。
   */
  nocs: string[]

  /**
   * 职位名称。
   */
  title: string

  /**
   * 公司。
   */
  org: string

  /**
   * 城市。
   */
  city: string

  /**
   * 开始年月(2021 或 2021-03)。
   */
  from: string

  /**
   * 结束年月;空串 = 至今或没填。
   */
  to: string

  /**
   * 做了什么。
   */
  desc: string
}
