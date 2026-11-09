/**
 * 生成简历桶的形状 —— 草稿(形同 lib/cv 的 CvDraft,本域亲手构造喂它,全格照抄)、分区配置、窗口整机面板、线格式。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */

/**
 * 取词函数。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 设一格状态的函数(React 的 setState 形)。
 */
export type SetFn<T> = (v: T) => void

/**
 * 改一个文本格的回调(收已取出的字符串)。
 */
export type TextFn = (v: string) => void

/**
 * 无参动作。
 */
export type ActFn = () => void

/**
 * 多行框改值。
 */
export type AreaFn = (e: React.ChangeEvent<HTMLTextAreaElement>) => void

/**
 * 联系方式。
 */
export type CvContact = {
  /**
   * 英文姓名。
   */
  name: string

  /**
   * 邮箱。
   */
  email: string

  /**
   * 电话。
   */
  phone: string

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
 * 分区里的一条。
 */
export type CvEntry = {
  /**
   * 名称(职位名 / 专业 / 证书……)。
   */
  title: string

  /**
   * 机构(雇主 / 学校 / 颁发机构)。
   */
  org: string

  /**
   * 城市。
   */
  city: string

  /**
   * 省份或国家。
   */
  region: string

  /**
   * 开始年。
   */
  fromY: string

  /**
   * 开始月(1~12)。
   */
  fromM: string

  /**
   * 结束年。
   */
  toY: string

  /**
   * 结束月。
   */
  toM: string

  /**
   * 至今。
   */
  now: boolean

  /**
   * 描述(一行一条)。
   */
  desc: string

  /**
   * 隐藏(留着不印)。
   */
  hidden: boolean
}

/**
 * 一份简历的草稿。
 */
export type CvDraft = {
  /**
   * 联系方式。
   */
  contact: CvContact

  /**
   * 个人简介。
   */
  summary: string

  /**
   * 工作经历。
   */
  work: CvEntry[]

  /**
   * 教育经历。
   */
  edu: CvEntry[]

  /**
   * 技能。
   */
  skills: string

  /**
   * 证书执照。
   */
  creds: CvEntry[]

  /**
   * 志愿经历。
   */
  volunteer: CvEntry[]

  /**
   * 奖项荣誉。
   */
  awards: CvEntry[]

  /**
   * 自定义分区。
   */
  extra: CvEntry[]
}

/**
 * 条目式分区的键。
 */
export type CvListKey = 'work' | 'edu' | 'creds' | 'volunteer' | 'awards' | 'extra'

/**
 * 段落式分区的键。
 */
export type CvTextKey = 'summary' | 'skills'

/**
 * 一条里的文本格。
 */
export type CvEntryKey = 'title' | 'org' | 'city' | 'region' | 'fromY' | 'fromM' | 'toY' | 'toM' | 'desc'

/**
 * 联系方式的格。
 */
export type CvContactKey = 'name' | 'email' | 'phone' | 'city' | 'region'

/**
 * 日期写法。
 */
export type CvDateKind = 'range' | 'one' | 'none'

/**
 * 条目式分区的表单配置(constants 的 CV_LIST 各项)。
 */
export type CvListConf = {
  /**
   * 分区键。
   */
  key: CvListKey

  /**
   * 分区卡标题词条。
   */
  card: string

  /**
   * 表单第一张卡的标题词条。
   */
  whatCard: string

  /**
   * 名称格的词条。
   */
  title: string

  /**
   * 表单第二张卡的标题词条(空串 = 没有这张卡)。
   */
  orgCard: string

  /**
   * 机构格的词条(空串 = 没有这格)。
   */
  org: string

  /**
   * 机构必填。
   */
  orgReq: boolean

  /**
   * 有城市与省份。
   */
  place: boolean

  /**
   * 日期写法。
   */
  dates: CvDateKind

  /**
   * 有「至今」。
   */
  now: boolean

  /**
   * 能导入 NOC 职责。
   */
  duties: boolean

  /**
   * 描述格的词条。
   */
  desc: string
}

/**
 * 正在填的一条:哪个分区、第几条(新加是 -1)、当前的值。
 */
export type EntryEdit = {
  /**
   * 分区。
   */
  list: CvListKey

  /**
   * 第几条;新加 -1。
   */
  index: number

  /**
   * 当前的值。
   */
  v: CvEntry
}

/**
 * 正在填的段落(简介或技能)。
 */
export type TextEdit = {
  /**
   * 哪一段。
   */
  key: CvTextKey

  /**
   * 当前的值。
   */
  v: string
}

/**
 * 某个分区的第几条。
 */
export type EntryAt = {
  /**
   * 分区。
   */
  list: CvListKey

  /**
   * 第几条。
   */
  index: number
}

/**
 * 「导入职责」搜到的一个职业(/api/noc/duties 的一项)。
 */
export type DutyHit = {
  /**
   * 五位职业码。
   */
  noc: string

  /**
   * 官方英文职业名。
   */
  title: string

  /**
   * 命中的名字。
   */
  hit: string

  /**
   * 职责各条。
   */
  duties: string[]
}

/**
 * 「导入职责」那块的状态。
 */
export type DutyState = {
  /**
   * 展开着。
   */
  open: boolean

  /**
   * 检索词。
   */
  q: string

  /**
   * 搜到的职业。
   */
  hits: DutyHit[]

  /**
   * 选中第几个职业。
   */
  pick: number

  /**
   * 勾了哪几条职责(下标)。
   */
  checked: number[]

  /**
   * 搜到的结果是按哪个检索词搜的(与 q 不同 = 还在搜)。
   */
  done: string
}

/**
 * 整机的全部格与设值函数(各 make* 手柄读它)。
 */
export type CvCells = {
  /**
   * 草稿。
   */
  draft: CvDraft

  /**
   * 正在填的一条。
   */
  entry: EntryEdit | null

  /**
   * 正在改的联系方式。
   */
  contact: CvContact | null

  /**
   * 正在填的段落。
   */
  text: TextEdit | null

  /**
   * 删除确认框问的是哪一条。
   */
  ask: EntryAt | null

  /**
   * 导入职责那块。
   */
  duty: DutyState

  /**
   * 设草稿。
   */
  setDraft: SetFn<CvDraft>

  /**
   * 设正在填的一条。
   */
  setEntry: SetFn<EntryEdit | null>

  /**
   * 设正在改的联系方式。
   */
  setContact: SetFn<CvContact | null>

  /**
   * 设正在填的段落。
   */
  setText: SetFn<TextEdit | null>

  /**
   * 设删除确认框。
   */
  setAsk: SetFn<EntryAt | null>

  /**
   * 设导入职责那块。
   */
  setDuty: SetFn<DutyState>

  /**
   * 设预览开关。
   */
  setPreview: SetFn<boolean>

  /**
   * 设存着。
   */
  setSaving: SetFn<boolean>

  /**
   * 设错误词条。
   */
  setErr: SetFn<string>

  /**
   * 设表单里的错误词条。
   */
  setFormErr: SetFn<string>

  /**
   * 设坏字。
   */
  setChars: SetFn<string[]>

  /**
   * 存成了(交回新简历 id)。
   */
  onSaved: (id: number) => void
}

/**
 * 窗口整机的面板(各件只读它)。
 */
export type CvPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 草稿拿到了吗(没拿到先占位)。
   */
  loaded: boolean

  /**
   * 草稿。
   */
  draft: CvDraft

  /**
   * 正在填的一条。
   */
  entry: EntryEdit | null

  /**
   * 正在改的联系方式。
   */
  contact: CvContact | null

  /**
   * 正在填的段落。
   */
  text: TextEdit | null

  /**
   * 删除确认框问的是哪一条。
   */
  ask: EntryAt | null

  /**
   * 导入职责那块。
   */
  duty: DutyState

  /**
   * 预览开着。
   */
  preview: boolean

  /**
   * 存着。
   */
  saving: boolean

  /**
   * 错误词条(空串 = 没错)。
   */
  err: string

  /**
   * 表单里的错误词条。
   */
  formErr: string

  /**
   * 坏字(报错里列出来)。
   */
  chars: string[]

  /**
   * 关窗口。
   */
  onClose: ActFn

  /**
   * 改联系方式。
   */
  onContactEdit: ActFn

  /**
   * 联系方式某一格的改值手柄。
   */
  contactFieldOf: (key: CvContactKey) => TextFn

  /**
   * 存联系方式。
   */
  onContactSave: ActFn

  /**
   * 填段落的手柄。
   */
  textEditOf: (key: CvTextKey) => ActFn

  /**
   * 段落改值。
   */
  onTextArea: AreaFn

  /**
   * 存段落。
   */
  onTextSave: ActFn

  /**
   * 加一条的手柄。
   */
  addOf: (list: CvListKey) => ActFn

  /**
   * 修改某一条的手柄。
   */
  editOf: (at: EntryAt) => ActFn

  /**
   * 隐藏 / 显示某一条的手柄。
   */
  hideOf: (at: EntryAt) => ActFn

  /**
   * 删除某一条的手柄(先弹确认框)。
   */
  delOf: (at: EntryAt) => ActFn

  /**
   * 确认删除。
   */
  onDelOk: ActFn

  /**
   * 取消删除。
   */
  onDelCancel: ActFn

  /**
   * 一条某一格的改值手柄。
   */
  entryFieldOf: (key: CvEntryKey) => TextFn

  /**
   * 描述改值。
   */
  onDescArea: AreaFn

  /**
   * 「至今」勾选。
   */
  onEntryNow: (e: React.ChangeEvent<HTMLInputElement>) => void

  /**
   * 存一条。
   */
  onEntrySave: ActFn

  /**
   * 关表单(不存)。
   */
  onFormClose: ActFn

  /**
   * 展开 / 收起导入职责。
   */
  onDutyToggle: ActFn

  /**
   * 改检索词。
   */
  onDutyQ: TextFn

  /**
   * 选某个职业的手柄。
   */
  dutyPickOf: (i: number) => ActFn

  /**
   * 勾某条职责的手柄。
   */
  dutyCheckOf: (i: number) => ActFn

  /**
   * 把勾的职责导入描述。
   */
  onDutyImport: ActFn

  /**
   * 开预览。
   */
  onPreview: ActFn

  /**
   * 从档案导入(2026-11-08 清单第 8 条)。
   */
  onImport: ActFn

  /**
   * 正在导入。
   */
  importing: boolean

  /**
   * 关预览。
   */
  onPreviewClose: ActFn

  /**
   * 存成简历。
   */
  onSave: ActFn
}

/**
 * CvBuilder 的 props(我的简历页、投递第 1 步两处挂)。
 */
export type CvBuilderIn = {
  /**
   * 关窗口。
   */
  onClose: () => void

  /**
   * 存成了(新简历 id;宿主重拉清单、投递框选中它)。
   */
  onSaved: (id: number) => void
}

/**
 * 只读面板的件的 props。
 */
export type CvPartIn = {
  /**
   * 整机面板。
   */
  p: CvPanel
}

/**
 * 条目式分区卡的 props。
 */
export type CvListCardIn = {
  /**
   * 整机面板。
   */
  p: CvPanel

  /**
   * 分区配置。
   */
  conf: CvListConf
}

/**
 * 段落式分区卡的 props。
 */
export type CvTextCardIn = {
  /**
   * 整机面板。
   */
  p: CvPanel

  /**
   * 哪一段。
   */
  k: CvTextKey

  /**
   * 卡标题词条。
   */
  head: string
}

/**
 * 分区卡外壳的 props。
 */
export type CvCardIn = {
  /**
   * 卡标题。
   */
  head: string

  /**
   * 卡头右侧的钮(没有给 null)。
   */
  acts: React.ReactNode

  /**
   * 卡里的内容。
   */
  children: React.ReactNode
}

/**
 * 一格(标签 + 控件)的 props。
 */
export type CvFieldIn = {
  /**
   * 标签。
   */
  label: string

  /**
   * 必填(标签前出红星)。
   */
  req: boolean

  /**
   * 控件。
   */
  children: React.ReactNode
}

/**
 * 条目清单里一条的 props。
 */
export type CvItemIn = {
  /**
   * 整机面板。
   */
  p: CvPanel

  /**
   * 分区配置。
   */
  conf: CvListConf

  /**
   * 这一条。
   */
  e: CvEntry

  /**
   * 第几条。
   */
  index: number
}

/**
 * 填一条的表单的 props。
 */
export type CvFormIn = {
  /**
   * 整机面板。
   */
  p: CvPanel

  /**
   * 正在填的一条。
   */
  edit: EntryEdit
}

/**
 * 「导入职责」那块的 props。
 */
export type CvDutiesIn = {
  /**
   * 整机面板。
   */
  p: CvPanel
}

/**
 * 一条的日期卡的 props。
 */
export type CvDatesIn = {
  /**
   * 整机面板。
   */
  p: CvPanel

  /**
   * 分区配置。
   */
  conf: CvListConf

  /**
   * 正在填的一条。
   */
  e: CvEntry
}

/**
 * 一行字(形同 lib/cv 的 CvLine)。
 */
export type PaperLine = {
  /**
   * 字。
   */
  text: string

  /**
   * 按要点排。
   */
  bullet: boolean
}

/**
 * 纸面上的一条(形同 lib/cv 的 CvItem)。
 */
export type PaperItem = {
  /**
   * 标题。
   */
  title: string

  /**
   * 起止。
   */
  when: string

  /**
   * 机构与地点。
   */
  sub: string

  /**
   * 描述各行。
   */
  lines: PaperLine[]
}

/**
 * 纸面上的一个分区(形同 lib/cv 的 CvSection)。
 */
export type PaperSection = {
  /**
   * 分区标题。
   */
  head: string

  /**
   * 条目。
   */
  items: PaperItem[]

  /**
   * 段落各行。
   */
  lines: PaperLine[]
}

/**
 * 纸面版式(形同 lib/cv 的 CvLayout)。
 */
export type PaperLayout = {
  /**
   * 姓名。
   */
  name: string

  /**
   * 联系方式各行。
   */
  contact: string[]

  /**
   * 各分区。
   */
  sections: PaperSection[]
}

/**
 * 几行字的 props。
 */
export type CvLinesIn = {
  /**
   * 各行。
   */
  lines: PaperLine[]
}

/**
 * 预览纸面的 props。
 */
export type CvPaperIn = {
  /**
   * 版式。
   */
  layout: PaperLayout
}

/**
 * `periodOf` 的入参。
 */
export type PeriodIn = {
  /**
   * 一条。
   */
  e: CvEntry

  /**
   * 日期写法。
   */
  kind: CvDateKind

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * `formTitleOf` 的入参。
 */
export type FormTitleIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 是不是新加。
   */
  isNew: boolean

  /**
   * 分区名。
   */
  s: string
}

/**
 * `ymOf` 的入参。
 */
export type YmIn = {
  /**
   * 年。
   */
  y: string

  /**
   * 月。
   */
  m: string
}

/**
 * `entryWith` 的入参。
 */
export type EntryWithIn = {
  /**
   * 原来的一条。
   */
  e: CvEntry

  /**
   * 改哪一格。
   */
  key: CvEntryKey

  /**
   * 新值。
   */
  v: string
}

/**
 * `contactWith` 的入参。
 */
export type ContactWithIn = {
  /**
   * 原来的联系方式。
   */
  c: CvContact

  /**
   * 改哪一格。
   */
  key: CvContactKey

  /**
   * 新值。
   */
  v: string
}

/**
 * `draftWithList` 的入参。
 */
export type DraftListIn = {
  /**
   * 原来的草稿。
   */
  d: CvDraft

  /**
   * 换哪个分区。
   */
  key: CvListKey

  /**
   * 新的条目。
   */
  list: CvEntry[]
}

/**
 * `draftWithText` 的入参。
 */
export type DraftTextIn = {
  /**
   * 原来的草稿。
   */
  d: CvDraft

  /**
   * 换哪一段。
   */
  key: CvTextKey

  /**
   * 新的字。
   */
  v: string
}

/**
 * `draftWithContact` 的入参。
 */
export type DraftContactIn = {
  /**
   * 原来的草稿。
   */
  d: CvDraft

  /**
   * 新的联系方式。
   */
  c: CvContact
}

/**
 * `entryErrOf` 的入参。
 */
export type EntryErrIn = {
  /**
   * 正在填的一条。
   */
  e: CvEntry

  /**
   * 分区配置。
   */
  conf: CvListConf
}

/**
 * `loadDuties` 的入参。
 */
export type LoadDutiesIn = {
  /**
   * 检索词。
   */
  q: string

  /**
   * 设导入职责那块(React 的 setState:收值或收「旧值 → 新值」的函数)。
   */
  setDuty: React.Dispatch<React.SetStateAction<DutyState>>
}

/**
 * `loadFirst` 的入参。
 */
export type LoadFirstIn = {
  /**
   * 设草稿。
   */
  setDraft: SetFn<CvDraft>

  /**
   * 设登录人 id(草稿按它存)。
   */
  setOwner: SetFn<string>

  /**
   * 设拿到了。
   */
  setLoaded: SetFn<boolean>
}

/**
 * `dutyWith` 的入参(导入职责那块换几格,其余照旧)。
 */
export type DutyWithIn = {
  /**
   * 原来那块。
   */
  d: DutyState

  /**
   * 新的勾选。
   */
  checked: number[]

  /**
   * 新的选中职业。
   */
  pick: number
}

/**
 * `withDesc` 的入参。
 */
export type WithDescIn = {
  /**
   * 原来的描述。
   */
  desc: string

  /**
   * 要接在后面的各条职责。
   */
  lines: string[]
}

/**
 * `saveErrOf` 的入参。
 */
export type SaveErrIn = {
  /**
   * 状态码(网络没通是 0)。
   */
  status: number

  /**
   * 响应。
   */
  body: SaveJson
}

/**
 * `useDutySearch` 的入参。
 */
export type DutySearchIn = {
  /**
   * 导入职责那块。
   */
  duty: DutyState

  /**
   * 设那块(React 的 setState)。
   */
  setDuty: React.Dispatch<React.SetStateAction<DutyState>>
}

/**
 * `makeFlagSet` 的入参。
 */
export type FlagSetIn = {
  /**
   * 设开关。
   */
  set: SetFn<boolean>

  /**
   * 要设的值。
   */
  v: boolean
}

/**
 * `makeCvSaved` 的入参。
 */
export type CvSavedIn = {
  /**
   * 设窗口开关。
   */
  setOpen: SetFn<boolean>

  /**
   * 宿主在存成之后要做的事。
   */
  onDone: (id: number) => void
}

/**
 * `useCvOpen` 的入参。
 */
export type CvOpenIn = {
  /**
   * 宿主在存成之后要做的事(收新简历 id;只重拉清单的宿主可以不收)。
   */
  onDone: (id: number) => void
}

/**
 * 生成简历窗口的开关面板。
 */
export type CvOpenPanel = {
  /**
   * 开着吗。
   */
  open: boolean

  /**
   * 开。
   */
  onOpen: ActFn

  /**
   * 关。
   */
  onClose: ActFn

  /**
   * 存成了(交给 CvBuilder 的 onSaved)。
   */
  onSaved: (id: number) => void
}

/**
 * /api/resume/build 的响应。
 */
export type SaveJson = {
  /**
   * 存好的那份;出错时缺席。
   */
  meta?: SaveMetaJson

  /**
   * 错误码。
   */
  error?: string

  /**
   * 写不进 PDF 的字。
   */
  chars?: string[]
}

/**
 * 存好的那份(只读 id)。
 */
export type SaveMetaJson = {
  /**
   * 新简历 id。
   */
  id?: number
}

/**
 * /api/noc/duties 的响应。
 */
export type DutiesJson = {
  /**
   * 搜到的职业。
   */
  items?: DutyHit[]
}

/**
 * /api/quiz/profile 的响应(只读到的格)。
 */
export type PfJson = {
  /**
   * 档案;未登录缺席。
   */
  profile?: PfViewJson
}

/**
 * 档案(只读到的格)。
 */
export type PfViewJson = {
  /**
   * 英文姓名。
   */
  name?: string

  /**
   * 现居城市。
   */
  city?: PfCityJson

  /**
   * 现居省码。
   */
  prov?: string
}

/**
 * 档案里的城市(只读英文名)。
 */
export type PfCityJson = {
  /**
   * 英文名。
   */
  en?: string
}

/**
 * /api/users/me 的响应(只读邮箱)。
 */
export type MeJson = {
  /**
   * 登录人;未登录缺席或 null。
   */
  user?: MeUserJson | null
}

/**
 * 登录人(只读邮箱)。
 */
export type MeUserJson = {
  /**
   * 用户 id(草稿按它存)。
   */
  id?: number | string

  /**
   * 邮箱。
   */
  email?: string
}

/**
 * 登录人(取不到的格空串)。
 */
export type MeView = {
  /**
   * 用户 id;取不到是空串。
   */
  owner: string

  /**
   * 邮箱;取不到是空串。
   */
  email: string
}

/**
 * `writeDraft` 的入参。
 */
export type WriteDraftIn = {
  /**
   * 登录人 id;空串不存。
   */
  owner: string

  /**
   * 草稿。
   */
  d: CvDraft
}

/**
 * 并入档案的入参。
 */
export type ProfileMergeIn = {
  /**
   * 现有草稿。
   */
  d: CvDraft

  /**
   * 档案的联系方式。
   */
  c: CvContact

  /**
   * 档案的两张清单;拉不到为 null。
   */
  lists: ProfileLists | null
}

/**
 * 并入档案的结果。
 */
export type ProfileMergeOut = {
  /**
   * 新草稿。
   */
  draft: CvDraft

  /**
   * 新加了几条。
   */
  added: number
}

/**
 * 档案的两张清单(与子桶 prefill 同形,各家一份)。
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
