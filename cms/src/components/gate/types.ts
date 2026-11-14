/**
 * gate 域(访客门)的契约:由头、步序、草稿、整机面板、各件 props 与手柄入参。
 * 2026-10-04 访客四题改版自 profile 桶迁入(原 2026-10-03 付费闭环批 A1 立);形状本域自己声明,不从别的域取 ——
 * 借 profile 桶已选标签件(OnboardingTags)的那几格(nocs / setNocs / resume)在 GatePanel 上照它的形逐格自抄。
 * 同日收口:单选手柄改借 profile 桶的 makeOptPick,自家的 OptTapIn 随之删;按关注点归拢排序,与 functions.ts 同序
 * (组件域不许 `//` 段横幅,闸 jsdoc-comments-only:共用形状 → 整机与 props → 步序 / 进度条 → 走步 → 上报口 → 关闭与交接 → 查名 → 进站向导)。
 * 同日 A2:职业题改用 quiz 桶选职业控件(它自己补名字、自己借已选标签件),「查名」一段(预选职业的码 + 名、查名入参、
 * 查名接口响应)与整机上的 resume 一格随之删;新增专业题一段(专业行、取数响应、专业题面板与各手柄入参)与回职位板一段,
 * 排在上报口之后、关闭与交接之前。
 * 同日收口:整机面板上的 onMajor 一格撤(专业题改由专业题面板的 pickOf 报码,已没有件读它;上报口只在整机内部接给专业题机器);
 * 专业题加一排胶囊件的 props(GateMajorPillsIn)与搜索结果取舍的入参(MajorHitsIn)。
 * 同日收口审查:整机面板多一格题面 id(换题挪焦点)、专业题面板多一格搜索在途;换题挪焦点、
 * 补交钩子那一跑、回职位板在现有地址上改,各添入参(位置同 functions.ts;卸掉时撤交接戳那一件无入参)。
 * 2026-10-05 专业题的选择器搬去 components/majors:专业行、取数响应、专业题面板、左栏(大类 / 专业类树)与各手柄入参整段
 * 带过去(注释原样);同日专业改多选:草稿、整机面板与主钮判定里的专业码换成码清单,整机面板上的专业题面板一格撤
 * (选择器机器改由向导件 GateWizard 挂,本域只留答案与上报口);题目分派多收一格 children(专业题那一屏);
 * 回职位板取专业大类只声明真读的那一格(BoardMajor)。
 * 2026-10-11 访客不再答题(Frank「我应该先注册 再问问题吧」):草稿、访客向导整机入参、向导 props、走步 / 关闭 / 交接 /
 * 补交 / 回职位板各入参与「动过了」落格随访客向导删;整机面板的 onRegistered 一格撤(只剩编辑模式,没有注册屏);
 * 新增访客注册框 GateAuth 的 props、钩子与回调入参。
 * 2026-11-07 Frank「删了吧」:一题一屏的 GateEdit 换成一页表单 GateForm 后删 —— 返回钮规格、题目分派 / 职业题 props、
 * 步序 / 题面 / 挪焦点 / 返回 / 主钮灰 / 目标与身份上报口 / 下一题 / 主钮字 / 编辑步序 / 跳过 / 起始题各入参与 GateEdit 的 props 删;
 * 整机入参 GateEditHookIn 瘦成 GateFormHookIn,整机面板与 edit 格撤掉没人读的格,步名收窄。
 * 2026-11-12 按「大于 1000 就拆子桶」:教育经历几段这一族的函数搬去子桶 ./edu,只有它们在用的七个入参 / 返回形状
 * (EduMergeIn / EduMergeOut / EduItemIn / EduPickIn / EduLabelIn / EduCellSetIn / EduRowsIn)连注释搬去子桶的 types;
 * 整机与件还在读的(EduPick / EduEntry / EduSeedIn / EduCellIn / PrefillEdu)留在这里,子桶自声明一份同形的。
 * 2026-11-13 Frank「别等一周啊 都做完」:「从简历填写」这一族搬去子桶 ./fill,只有它读的形状(ResumeFillIn / PrefillJson /
 * PrefillFact / ApplyPrefillIn / PrefillEdu)随之删(子桶自声明);上一行的 PrefillEdu 不再留在这里。新增同步旧档案的入参
 * OldSyncIn 与「投递发出去了」事件里本域读的两格 ApplySentDetail。
 *
 * @author Frank
 * @time 2026-10-04 02:10:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值;本域自抄,types 不许 import)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 访客向导的由头(与 lib/guest 同名同义,本域自抄):点开职位弹框、未登录点投递、未登录点收藏、进站即弹。
 * 2026-10-04 加进站即弹(entry);job 改成未登录点开职位弹框就算。
 * 同日收口加 filter(关掉进站向导后在职位板上改筛选再弹)。
 */
export type GateIntent = 'job' | 'apply' | 'save' | 'entry' | 'filter'

/**
 * 访客向导走到哪一屏:四道题 + 注册屏。
 * 2026-11-07 一题一屏的 GateEdit 删:只剩 missingStepsOf 报「档案里哪几样还空着」,收窄成它报得出的五样(身份、教育经历、注册屏撤)。
 */
export type GateStep = 'goal' | 'major' | 'job' | 'work' | 'prov' | 'name' | 'who' | 'edu'

/**
 * 往已选职业清单上合并的更新函数(React 落格收的另一种形态;本域只整份地拨,形状照 profile 的同名件自抄,
 * 好让整机面板原样喂给 profile 桶的已选标签件)。
 * 2026-10-04 A2 起已选标签归 quiz 桶选职业控件,这一形只剩「职业题落格(makeTouchedNocs)也收它」一个用处。
 * 2026-10-11 访客向导撤、makeTouchedNocs 随之删:职业题落格直接是 React 的 setNocs,整机面板的 setNocs 格照收这两形。
 */
export type NocsMergeFn = (prev: string[]) => string[]

/**
 * 已选职业清单的落格:既收整份新清单,也收上面那种合并函数。
 */
export type SetNocsFn = (v: string[] | NocsMergeFn) => void

/**
 * 访客向导的整块面板(useGateWizard 出;顶行、各题、钮区与借来的已选标签件都读它)。
 * 2026-10-04 改版:钮组改成本域自己的粘底钮区,原为共用首访向导钮组凑的三格(saving / isLast / apply 恒 false)随之撤。
 * 2026-10-11 访客向导撤:只剩档案编辑整机 useGateEdit 出它(GateEdit 的顶行、各题、钮区读它)。
 * 2026-11-07 GateEdit 删:出它的是 useGateForm,读它的是一页表单(GateForm、七格与城市 / 教育经历 / 姓名三件);
 * 步数、当前题、题面 id、点了就翻页的目标上报口、一共几题、下一步、主钮灰、返回与返回钮规格九格随之撤。
 */
export type GatePanel = {
  /**
   * 目标档;0 = 没答。
   */
  goal: number

  /**
   * 专业的 CIP 2021 class 码清单(至多 3 个,选的先后序);空列 = 没答。
   * A1 立时是专业大类码;2026-10-04 A2 起是 class 码;2026-10-05 改多选(格名 major → majors,单个码 → 码清单)。
   * 2026-11-12 起由教育经历各段的专业汇出,不再单独改(上报口 onMajors 撤)。
   */
  majors: string[]

  /**
   * 界面语言码(专业名按它挑;职业题的选职业控件也要它)。
   */
  lang: string

  /**
   * 已选职业码。
   */
  nocs: string[]

  /**
   * 拨已选职业码(职业题的胶囊与标签 × 都走它)。
   */
  setNocs: SetNocsFn

  /**
   * 做过的工作(职业码;2026-11-12 起由工作经历各段汇出,不再单独改)。
   */
  workNocs: string[]

  /**
   * 所在省那一格亮哪个(省码;境外 = PROV_ABROAD;空串 = 都不亮)。
   */
  provActive: string

  /**
   * 点所在省格子。
   */
  onProv: (v: string) => void

  /**
   * 城市区(2026-10-09「我的档案」批:选完省下面出城市,选填)。
   */
  cities: CityPanel

  /**
   * 来自简历的标记(「字段:值」串)。
   */
  fromResume: string[]

  /**
   * 改来自简历的标记。
   */
  setFromResume: (v: string[]) => void

  /**
   * 编辑模式才用得上的几格(英文姓名那一题、主钮的字、保存态;访客向导给定值)。
   */
  edit: EditBits

  /**
   * 关掉向导(×、Esc、点遮罩):撤交接戳再交还调用方 —— 关掉了就不许 Google 回跳以外的登录替他交草稿。
   */
  onClose: () => void
}

/**
 * 访客向导各件(顶行、题目分派、各题、钮区)共用的 props:整机面板 + 取词函数。
 */
export type GatePartIn = {
  /**
   * 访客向导整机。
   */
  g: GatePanel

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * GateAuth(访客注册框)的 props(2026-10-11 访客不再答题,替掉 GateWizardIn;职位弹框、收藏、筛选、进站四处在传)。
 */
export type GateAuthIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这次弹框的由头(记进 gate-open 埋点)。
   */
  intent: GateIntent

  /**
   * Google 整页登录后回跳到哪(调用方可省 = 当前页;点开职位那一路回职位整页)。
   */
  returnTo?: string

  /**
   * 弹框层级(调用方可省)。
   */
  z?: number

  /**
   * 关掉(×、Esc、点遮罩)。
   */
  onClose: () => void

  /**
   * 注册 / 登录成功之后交还调用方。
   */
  onDone: () => void
}

/**
 * useGateAuth 的入参。
 */
export type GateAuthHookIn = {
  /**
   * 这次弹框的由头。
   */
  intent: GateIntent

  /**
   * 注册 / 登录成功之后交还调用方。
   */
  onDone: () => void
}

/**
 * makeGateAuthDone 的入参。
 */
export type GateAuthDoneIn = {
  /**
   * 交还调用方。
   */
  onDone: () => void
}

/**
 * 进站向导整机(useEntryGate,2026-10-04)交回的面板。
 */
export type EntryGatePanel = {
  /**
   * 这一页弹着进站向导。
   */
  open: boolean

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 关掉向导(页面照常看)。
   */
  onClose: () => void

  /**
   * 注册成功、草稿交出去之后:收起向导、软刷让页面拿到登录态。
   */
  onDone: () => void
}

/**
 * makeProvPick 的入参。
 */
export type ProvPickIn = {
  /**
   * 所在省落格。
   */
  setProv: (v: string) => void

  /**
   * 境外落格。
   */
  setAbroad: (v: boolean) => void

  /**
   * 城市落格(2026-10-09:换省 / 选境外时清掉旧城市 —— 城市挂在省下面)。
   */
  setCity: CityClearFn
}

/**
 * gateProvActiveOf 的入参。
 */
export type GateProvActiveIn = {
  /**
   * 所在省码。
   */
  prov: string

  /**
   * 答的是境外。
   */
  abroad: boolean
}

/**
 * makeEntryClose(进站向导关闭手柄)的入参。
 */
export type EntryCloseIn = {
  /**
   * 「为哪一页弹的」落格(收起 = null)。
   */
  setOpenAt: (v: string | null) => void
}

/**
 * makeEntryDone(进站向导注册完回调)的入参。
 */
export type EntryDoneIn = {
  /**
   * 「为哪一页弹的」落格(收起 = null)。
   */
  setOpenAt: (v: string | null) => void

  /**
   * 软刷(router.refresh:服务端组件重渲、会话种子换成登录态,客户端状态原地保留)。
   */
  refresh: () => void
}


/**
 * 城市区的面板(整机的 cities 格)。
 */
export type CityPanel = {
  /**
   * 选中的城市英文名;空串 = 没选。
   */
  city: string

  /**
   * 点一个城市(再点同一个 = 取消)。
   */
  onCity: (v: string) => void

  /**
   * 搜索框的词。
   */
  q: string

  /**
   * 改搜索词。
   */
  onQ: (v: string) => void

  /**
   * 这一刻摆哪些城市(没搜 = 本省热门,搜了 = 命中的);省没选 / 选了境外 = 空列。
   */
  opts: CityOpt[]
}

/**
 * useCityPick 的入参。
 */
export type CityPickHookIn = {
  /**
   * 选中的省码;空串 = 没选。
   */
  prov: string

  /**
   * 界面语。
   */
  lang: string

  /**
   * 起始城市(编辑模式从档案来;访客向导从草稿来)。
   */
  seed: string
}

/**
 * useCityPick 交回:面板 + 城市落格(换省时清城市要用)。
 */
export type CityPickOut = {
  /**
   * 城市区面板。
   */
  panel: CityPanel

  /**
   * 城市落格。
   */
  setCity: CityClearFn
}

/**
 * 编辑模式才用得上的几格(整机的 edit 格)。
 * 2026-11-07 GateEdit 删:主钮字(nextKey)、「跳过这步」(skip)、点了就翻页的身份上报口(onWho)三格撤。
 */
export type EditBits = {
  /**
   * 英文姓名;访客向导恒空串。
   */
  name: string

  /**
   * 改英文姓名。
   */
  onName: (v: string) => void

  /**
   * 英文姓名填了但不合规(只许英文字母、空格、点、撇号、连字符,2~60 字)。
   */
  nameBad: boolean

  /**
   * 正在保存(主钮禁用)。
   */
  saving: boolean

  /**
   * 保存失败那一行的词条键;空串 = 没失败。
   */
  failKey: string

  /**
   * 身份词;空串 = 没答(2026-10-13)。
   */
  who: string

  /**
   * 教育经历几段(至少一段,可能三格都空)。
   */
  edu: EduPick[]

  /**
   * 造「改某段某格」的手柄。
   */
  eduPickOf: (x: EduCellIn) => (v: string) => void

  /**
   * 「+ 再加一段」。
   */
  onEduAdd: () => void

  /**
   * 造「删第几段」的手柄。
   */
  eduRemoveOf: (i: number) => () => void

  /**
   * 直接改目标(一页表单用;向导里的 onGoal 点了顺手翻下一题,表单不翻)。
   */
  setGoal: (v: number) => void

  /**
   * 直接改身份(同上,表单不翻页)。
   */
  setWho: (v: string) => void

  /**
   * 整份写教育经历几段(「从简历填写」并进来用;2026-11-12)。
   */
  setEdu: (v: EduPick[]) => void

  /**
   * 「匹配规则」下拉现在的值(2026-11-12 匹配依据、匹配模式并成一只下拉):空串 = 按做过的工作,其余见 RULE_OPTS。
   */
  rule: string

  /**
   * 选匹配规则(落匹配依据、匹配模式两格)。
   */
  onRule: (v: string) => void

  /**
   * 直接保存(一页表单的「保存」;向导走 onNext 翻到最后一题才存)。
   */
  onSave: () => void

  /**
   * 「做过的工作」几段与它的手柄(2026-11-12)。
   */
  w: WorkRowsPanel

  /**
   * 只有生成简历才用的四格:电话、链接、技能、模板(2026-11-12)。
   */
  cvc: CvCellsPanel

  /**
   * 先存档案、存成了再跑后面那一步(「生成简历」用:生成读的是库里的档案;面板不关)。
   */
  saveThen: (after: () => void) => () => void

  /**
   * 现在填的够不够生成简历:英文姓名合规,且工作经历与教育经历至少填了一样。
   */
  cvReady: boolean

  /**
   * 教育经历几段的专业那一格:正在给第几段选、开框、点选与关框(2026-11-12)。
   */
  em: EduMajorPanel
}

/**
 * 只有生成简历才用的四格与它们的落格(useCvCells 出;2026-11-12)。
 */
export type CvCellsPanel = {
  /**
   * 电话。
   */
  phone: string

  /**
   * 改电话。
   */
  onPhone: (v: string) => void

  /**
   * 个人链接(领英等)。
   */
  link: string

  /**
   * 改个人链接。
   */
  onLink: (v: string) => void

  /**
   * 技能,一行一项。
   */
  skills: string

  /**
   * 改技能(多行输入框的 onChange)。
   */
  onSkills: (e: React.ChangeEvent<HTMLTextAreaElement>) => void

  /**
   * 简历模板:classic / modern。
   */
  tpl: string

  /**
   * 选简历模板。
   */
  onTpl: (v: string) => void
}

/**
 * cvFactsOf 的入参。
 */
export type CvFactsIn = {
  /**
   * 要存的工作经历(已去空段)。
   */
  work: WorkPick[]

  /**
   * 电话、链接、技能、模板四格。
   */
  cvc: CvCellsPanel
}

/**
 * makeSaveThen 的入参。
 */
export type SaveThenIn = {
  /**
   * 要存的答案。
   */
  a: GateEditSeed

  /**
   * 正在保存落格。
   */
  setSaving: (v: boolean) => void

  /**
   * 失败那一行的词条键落格。
   */
  setFail: (v: string) => void

  /**
   * 落「这一回开面板存过了」。
   */
  setSavedOnce: (v: boolean) => void
}

/**
 * GateWorkLayers(「做过的工作」弹框与叠在上面的选职业框)的 props。
 */
export type GateWorkLayersIn = {
  /**
   * 表单整机。
   */
  g: GatePanel

  /**
   * 叠开哪个选择器与它的手柄。
   */
  k: GatePickPanel

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 各段职业那一格的字。
   */
  names: string[]

  /**
   * 造「点第几段的选职业」的手柄。
   */
  occOpenOf: (i: number) => () => void

  /**
   * 选职业控件(叠开的选职业框的正文;调用方拼好递进来)。
   */
  rail: React.ReactNode

  /**
   * 出不出只有写简历才用的四格(职位名称、公司、城市、做了什么;2026-11-13:生成简历弹框里出,修改档案里不出)。
   */
  full: boolean
}

/**
 * 「生成简历」一段的整机(useCvGen 出;2026-11-12)。
 */
export type CvGenPanel = {
  /**
   * 现在填的够不够生成。
   */
  ready: boolean

  /**
   * 还剩几个改写额度;-1 = 还没取到。
   */
  left: number

  /**
   * 生成中。
   */
  busy: boolean

  /**
   * 一行提示。
   */
  msg: CvGenMsg

  /**
   * 生成出来、还没存的那一份;没有 = null(预览框关着)。
   */
  doc: CvGenDoc | null

  /**
   * 正在存成我的简历。
   */
  saving: boolean

  /**
   * 升级框开没开(额度用完)。
   */
  upgrade: boolean

  /**
   * 点「生成简历」/「重新生成」。
   */
  onGen: () => void

  /**
   * 点「设为我的简历」。
   */
  onSet: () => void

  /**
   * 点「下载」。
   */
  onDownload: () => void

  /**
   * 关预览框。
   */
  onDocClose: () => void

  /**
   * 关升级框。
   */
  onUpgradeClose: () => void
}

/**
 * 生成出来的一份简历(形同子桶 cv 的 CvDoc)。
 */
export type CvGenDoc = {
  /**
   * 浏览器里的临时地址。
   */
  url: string

  /**
   * 文件名。
   */
  fileName: string

  /**
   * PDF 文件。
   */
  file: File
}

/**
 * 「生成简历」一段的一行提示(形同子桶 cv 的 CvMsg)。
 */
export type CvGenMsg = {
  /**
   * 词条键;空串 = 不出。
   */
  key: string

  /**
   * 颜色。
   */
  kind: 'ok' | 'info' | 'err'
}

/**
 * useCvGen 的入参。
 */
export type CvGenHookIn = {
  /**
   * 表单整机。
   */
  g: GatePanel
}

/**
 * GateCvGen(「生成简历」一段)的 props。
 */
export type GateCvGenIn = {
  /**
   * 表单整机。
   */
  g: GatePanel

  /**
   * 生成整机。
   */
  c: CvGenPanel

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * GateCvPreview(简历预览框)的 props。
 */
export type GateCvPreviewIn = {
  /**
   * 生成整机。
   */
  c: CvGenPanel

  /**
   * 生成出来的那一份。
   */
  doc: CvGenDoc

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * tplClsOf 的入参。
 */
export type TplClsIn = {
  /**
   * 这张模板卡选着没有。
   */
  on: boolean
}

/**
 * makeSavedThen 的入参。
 */
export type SavedThenIn = {
  /**
   * 落「这一回开面板存过了」。
   */
  setSavedOnce: (v: boolean) => void

  /**
   * 存成了之后跑的那一步。
   */
  after: () => void
}

/**
 * makeFormClose 的入参。
 */
export type FormCloseIn = {
  /**
   * 这一回开面板存过没有。
   */
  savedOnce: boolean

  /**
   * 关面板(什么都没存)。
   */
  onClose: () => void

  /**
   * 存好了(关面板并让档案页重取)。
   */
  onSaved: () => void
}

/**
 * 工作经历一段(2026-11-12 Frank「右侧弹 sidebar 用户一项一项填」;界面上的七格,形同子桶 work 的 WorkPick 与 lib/quiz CvWork)。
 */
export type WorkPick = {
  /**
   * 这一段对应的职业码(同一个职业可能有几个码);空列 = 没选。
   */
  nocs: string[]

  /**
   * 职位名称;空串 = 没填。
   */
  title: string

  /**
   * 公司;空串 = 没填。
   */
  org: string

  /**
   * 城市;空串 = 没填。
   */
  city: string

  /**
   * 开始年月(2021 或 2021-03;输入中可能还不合形);空串 = 没填。
   */
  from: string

  /**
   * 结束年月;空串 = 没填或至今。
   */
  to: string

  /**
   * 做了什么;空串 = 没填。
   */
  desc: string
}

/**
 * 档案里的简历资料(答案档 cv 一格;形同 lib/quiz CvFacts,本域自声明)。
 */
export type GateCv = {
  /**
   * 工作经历几段;空列 = 还没存过。
   */
  work: WorkPick[]

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
 * 「做过的工作」几段的整机(useWorkRows 出)。
 */
export type WorkRowsPanel = {
  /**
   * 几段(至少一段,可能七格都空)。
   */
  work: WorkPick[]

  /**
   * 整份写几段(「从简历填写」用)。
   */
  setWork: (v: WorkPick[]) => void

  /**
   * 造「改某段某格」的手柄。
   */
  workCellOf: (x: WorkCellIn) => (v: string) => void

  /**
   * 「+ 再加一段」。
   */
  onWorkAdd: () => void

  /**
   * 造「删第几段」的手柄。
   */
  workRemoveOf: (i: number) => () => void

  /**
   * 正在给第几段选职业;-1 = 没在选(选职业框关着)。
   */
  occAt: number

  /**
   * 写「正在给第几段选职业」。
   */
  setOccAt: (v: number) => void

  /**
   * 选职业框里点了一个职业(选职业控件的 onChange)。
   */
  onWorkOcc: (next: string[]) => void

  /**
   * 关选职业框。
   */
  onOccClose: () => void
}

/**
 * 「改工作经历某段某格」的入参(形同子桶 work 的 WorkCellIn)。
 */
export type WorkCellIn = {
  /**
   * 第几段。
   */
  i: number

  /**
   * 哪一格:title / org / city / from / to / desc。
   */
  f: string
}

/**
 * useWorkRows 的入参。
 */
export type WorkSeedIn = {
  /**
   * 档案里存过的几段;空列 = 还没存过。
   */
  list: WorkPick[]

  /**
   * 做过的工作(职业码);还没存过几段的人按它一码一段起头。
   */
  nocs: string[]
}

/**
 * GateWork(工作经历弹框正文)的 props。
 */
export type GateWorkIn = {
  /**
   * 表单整机。
   */
  g: GatePanel

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 各段职业那一格的字(与几段一一对应;没选 = 空串)。
   */
  names: string[]

  /**
   * 造「点第几段的选职业」的手柄。
   */
  occOpenOf: (i: number) => () => void

  /**
   * 出不出只有写简历才用的四格(职位名称、公司、城市、做了什么;2026-11-13:生成简历弹框里出,修改档案里不出)。
   */
  full: boolean
}

/**
 * GateWorkLine(工作经历一段)的 props。
 */
export type GateWorkLineIn = {
  /**
   * 表单整机。
   */
  g: GatePanel

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 第几段。
   */
  i: number

  /**
   * 这一段。
   */
  row: WorkPick

  /**
   * 这一段职业那一格的字;没选 = 空串。
   */
  name: string

  /**
   * 点「选职业」。
   */
  onOcc: () => void

  /**
   * 出不出只有写简历才用的四格(职位名称、公司、城市、做了什么;2026-11-13:生成简历弹框里出,修改档案里不出)。
   */
  full: boolean
}

/**
 * useWorkSync 的入参。
 */
export type WorkSyncIn = {
  /**
   * 各段汇出的职业码。
   */
  nocs: string[]

  /**
   * 把查名字用的选职业控件里已选的码整份换掉。
   */
  onReplace: (codes: string[]) => void
}

/**
 * GateCvFields(电话、链接、技能三格)的 props。
 */
export type GateCvFieldsIn = {
  /**
   * 表单整机。
   */
  g: GatePanel

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 教育经历题几段的整机(useEduRows 出;2026-10-13)。
 */
export type EduRowsPanel = {
  /**
   * 几段。
   */
  edu: EduPick[]

  /**
   * 整份写几段(2026-11-12)。
   */
  setEdu: (v: EduPick[]) => void

  /**
   * 造「改某段某格」的手柄。
   */
  eduPickOf: (x: EduCellIn) => (v: string) => void

  /**
   * 「+ 再加一段」。
   */
  onEduAdd: () => void

  /**
   * 造「删第几段」的手柄。
   */
  eduRemoveOf: (i: number) => () => void

  /**
   * 几段的专业那一格:正在给第几段选、开框、点选与关框(2026-11-12 专业并进教育经历的每一段)。
   */
  em: EduMajorPanel
}

/**
 * 教育经历一段(界面上的三格;存档时拼成「所在地.公立私立.时长」串)。
 * 2026-11-12 Frank「这部分不能直接显示具体的年份和学历 证书吗?」:多四格明细(名称、学校、起止年份),都选填。
 */
export type EduPick = {
  /**
   * 院校所在地:省码或 abroad;空串 = 没选。
   */
  prov: string

  /**
   * public / private;空串 = 没选。
   */
  kind: string

  /**
   * y1 / y2 / y3 / master;空串 = 没选。
   */
  len: string

  /**
   * 证书或学历名称;空串 = 没填。
   */
  cred: string

  /**
   * 学校;空串 = 没填。
   */
  school: string

  /**
   * 开始年份(输入中可能不足四位);空串 = 没填。
   */
  from: string

  /**
   * 结束年份;空串 = 没填或在读。
   */
  to: string

  /**
   * 这一段学的专业(CIP 码;2026-11-12 Frank「教育经历 和 专业是不是重复了」:专业并进每一段,档案的专业由各段汇出);空串 = 没选。
   */
  major: string
}

/**
 * 答案档里教育经历明细的一条(形同 lib/quiz EduItem,本域自声明)。
 */
export type EduEntry = {
  /**
   * 「所在地.公立私立.时长」串;三只下拉没选全 = 空串。
   */
  key: string

  /**
   * 证书或学历名称。
   */
  cred: string

  /**
   * 学校。
   */
  school: string

  /**
   * 开始年份(四位数字)或空串。
   */
  from: string

  /**
   * 结束年份(四位数字)或空串。
   */
  to: string

  /**
   * 这一段学的专业(CIP 码;2026-11-12);没选 = 空串。
   */
  major: string
}

/**
 * eduFormRowsOf 的入参:档案里的教育经历明细与老的教育经历串。
 */
export type EduSeedIn = {
  /**
   * 教育经历明细;空列 = 还没存过明细。
   */
  list: EduEntry[]

  /**
   * 教育经历串(没有明细时按它起头)。
   */
  strs: string[]

  /**
   * 档案里的专业码(2026-11-12:各段都还没挂专业的老档案,按序落进各段,多出的补成新段)。
   */
  majors: string[]
}

/**
 * ruleOf 的入参。
 */
export type RuleOfIn = {
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
 * makeRulePick 的入参。
 */
export type RulePickIn = {
  /**
   * 落匹配依据。
   */
  setMatchBy: (v: string) => void

  /**
   * 落匹配模式。
   */
  setMatchMode: (v: string) => void
}

/**
 * 「改某段某格」(eduPickOf)的入参。
 */
export type EduCellIn = {
  /**
   * 第几段。
   */
  i: number

  /**
   * 哪一格:prov / kind / len;2026-11-12 起还有 cred / school / from / to。
   */
  f: string
}

/**
 * GateEdu 一段(EduLine)的 props。
 */
export type GateEduLineIn = {
  /**
   * 访客向导整机。
   */
  g: GatePanel

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 第几段。
   */
  i: number

  /**
   * 这一段。
   */
  row: EduPick

  /**
   * 这一段专业的名字;没选 = 空串。
   */
  major: string

  /**
   * 点专业那一格的「修改」。
   */
  onMajor: () => void

  /**
   * 搜学校整机(这一段的学校格边打边搜)。
   */
  sch: SchoolPanel
}

/**
 * 城市区里的一个城市:英文名(存进答案)+ 胶囊上的字(界面语译名,没有译名用英文)。
 */
export type CityOpt = {
  /**
   * 英文城市名(与 cities.name 同写法)。
   */
  name: string

  /**
   * 胶囊上的字。
   */
  label: string
}

/**
 * 按省取城市接口的一行(线格式;stats 域 /api/stats/cities)。
 */
export type CityJson = {
  /**
   * 英文城市名。
   */
  name: string

  /**
   * 中文译名;没有 = 空串。
   */
  zh: string

  /**
   * 韩文译名;没有 = 空串。
   */
  ko: string

  /**
   * 在招岗数。
   */
  jobs: number
}

/**
 * 按省取城市接口的响应(线格式)。
 */
export type CitiesJson = {
  /**
   * 本省城市,在招多的在前。
   */
  cities: CityJson[]
}

/**
 * 取回来的一省城市(连省码一起记)。
 */
export type CitiesGot = {
  /**
   * 这一份是哪个省的;空串 = 还没取过。
   */
  prov: string

  /**
   * 这一省的城市。
   */
  rows: CityJson[]
}

/**
 * useProvCities 的入参。
 */
export type ProvCitiesIn = {
  /**
   * 选中的省码;空串 = 没选(不取)。
   */
  prov: string

  /**
   * 搜索词。
   */
  q: string

  /**
   * 界面语(胶囊上用哪种译名)。
   */
  lang: string
}

/**
 * loadProvCities 的入参。
 */
export type LoadCitiesIn = {
  /**
   * 省码。
   */
  prov: string

  /**
   * 取回来落格(连省码一起记,换了省那一下不摆上一个省的城市)。
   */
  setAll: (v: CitiesGot) => void

  /**
   * 存活标记(省换了 / 卸载了就不落格)。
   */
  flag: DeadFlag
}

/**
 * 异步取数的存活标记。
 */
export type DeadFlag = {
  /**
   * 已作废。
   */
  dead: boolean
}

/**
 * cityOptsOf 的入参。
 */
export type CityOptsIn = {
  /**
   * 本省全部城市。
   */
  all: CityJson[]

  /**
   * 搜索词。
   */
  q: string

  /**
   * 界面语。
   */
  lang: string
}

/**
 * cityLabelOf 的入参。
 */
export type CityLabelIn = {
  /**
   * 那一行城市。
   */
  c: CityJson

  /**
   * 界面语。
   */
  lang: string
}

/**
 * makeCityPick 的入参。
 */
export type CityPickIn = {
  /**
   * 现选的城市。
   */
  city: string

  /**
   * 城市落格。
   */
  setCity: (v: string) => void
}

/**
 * makeProvPick 换省时顺手清城市的那一格(ProvPickIn 加的;2026-10-09)。
 */
export type CityClearFn = (v: string) => void


/**
 * 编辑模式的起始答案(档案页取好的那一份;访客向导的草稿不参与)。
 */
export type GateEditSeed = {
  /**
   * 目标档(1 = 拿 PR、2 = 先找工作);0 = 没答。
   */
  goal: number

  /**
   * 专业码清单。
   */
  majors: string[]

  /**
   * 职业码清单。
   */
  nocs: string[]

  /**
   * 现居省码;空串 = 没答或在境外。
   */
  prov: string

  /**
   * 答的是「加拿大境外」。
   */
  abroad: boolean

  /**
   * 现居城市英文名;空串 = 没选。
   */
  city: string

  /**
   * 英文姓名;空串 = 没填。
   */
  name: string

  /**
   * 身份词;空串 = 没答(2026-10-13)。
   */
  who: string

  /**
   * 教育经历串(「所在地.公立私立.时长」);空列 = 没答(2026-10-13)。
   */
  edu: string[]

  /**
   * 教育经历明细(2026-11-12);起始答案里空列 = 还没存过明细(表单按 edu 起头),保存时 edu 由它派生。
   */
  eduList: EduEntry[]

  /**
   * 做过的工作(职业码)。
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

  /**
   * 简历资料(2026-11-12:工作经历几段、电话、链接、技能与模板)。
   */
  cv: GateCv
}

/**
 * useGateForm 的入参(2026-11-07 自 useGateEdit 的入参 GateEditHookIn 瘦来:取词函数、只问空着的、从哪题开始三格撤)。
 */
export type GateFormHookIn = {
  /**
   * 起始答案。
   */
  seed: GateEditSeed

  /**
   * 关框。
   */
  onClose: () => void

  /**
   * 保存成功。
   */
  onSaved: () => void
}

/**
 * makeEditSave 的入参:这一份答案、落格与保存成功的回调。
 */
export type EditSaveIn = {
  /**
   * 要存的答案。
   */
  a: GateEditSeed

  /**
   * 正在保存落格。
   */
  setSaving: (v: boolean) => void

  /**
   * 失败那一行的词条键落格。
   */
  setFail: (v: string) => void

  /**
   * 保存成功。
   */
  onSaved: () => void
}

/**
 * 编辑模式写进答案档的那几格(形同 lib/quiz AnswersPatch 的子集,本域自声明)。
 */
export type EditPatch = {
  /**
   * 目标档。
   */
  goalBand: number

  /**
   * 专业码清单。
   */
  majors: string[]

  /**
   * 职业码清单。
   */
  nocs: string[]

  /**
   * 现居省码(境外写空串)。
   */
  resProv: string

  /**
   * 现居城市英文名。
   */
  resCity: string

  /**
   * 处境(只有答了境外才写 overseas)。
   */
  status?: string

  /**
   * 身份词(2026-10-13)。
   */
  fitWho: string

  /**
   * 教育经历串,只收三格都选了的段(2026-10-13)。2026-11-12 起 = eduList 里不空的 key,按序。
   */
  fitEdu: string[]

  /**
   * 教育经历明细(2026-11-12)。
   */
  eduList: EduEntry[]

  /**
   * 做过的工作(职业码)。
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

  /**
   * 简历资料(2026-11-12),整格覆盖。
   */
  cv: GateCv
}

/**
 * GateForm(「我的档案」修改的一页表单;2026-11-07 照 Azure 编辑面板)的 props。
 */
export type GateFormIn = {
  /**
   * 取词。
   */
  t: TFn

  /**
   * 档案现值。
   */
  seed: GateEditSeed

  /**
   * 关面板。
   */
  onClose: () => void

  /**
   * 存好了。
   */
  onSaved: () => void

  /**
   * 开成生成简历弹框(2026-11-13 Frank「生成简历 应该和 修改档案 应该是分开的吧」:同一台表单整机,换一只壳、
   * 只出写简历要填的格子);可省 = 开成修改档案的右侧栏。
   */
  cv?: boolean
}

/**
 * GateCvBox(生成简历弹框;2026-11-13)的 props。
 */
export type GateCvBoxIn = {
  /**
   * 表单整机。
   */
  g: GatePanel

  /**
   * 叠开选择器的手柄。
   */
  k: GatePickPanel

  /**
   * 取词。
   */
  t: TFn

  /**
   * 几格已选的名字(这里用做过的工作、教育经历两格)。
   */
  n: GatePickLines

  /**
   * 生成整机。
   */
  c: CvGenPanel
}

/**
 * 表单里「专业」「想做的工作」两格叠开的选择器状态。
 */
export type GatePickPanel = {
  /**
   * 叠开着哪一个(专业 / 职业);没开为空串。
   */
  picking: string

  /**
   * 开职业选择器。
   */
  onJob: () => void

  /**
   * 开「做过的工作」选择器。
   */
  onWork: () => void

  /**
   * 开所在地的弹框(2026-11-12)。
   */
  onWhere: () => void

  /**
   * 开教育经历的弹框(2026-11-12)。
   */
  onEdu: () => void

  /**
   * 关选择器(选好了)。
   */
  onDone: () => void
}

/**
 * 「开 / 关选择器」手柄工厂的入参。
 */
export type GatePickSetIn = {
  /**
   * setter。
   */
  setPicking: (v: string) => void

  /**
   * 按下后叠开哪一个(空串 = 关)。
   */
  v: string
}

/**
 * 表单下拉框显示字的取法入参。
 */
export type GateLabelOfIn = {
  /**
   * 取词。
   */
  t: TFn
}

/**
 * 已选名字的一行。
 */
export type PickedLine = {
  /**
   * React key。
   */
  key: string

  /**
   * 显示名(界面语短名;还没取到是占位)。
   */
  name: string

  /**
   * 显示名下面的灰字(2026-11-13:做过的工作一格,职位名称对上的加拿大职业);没有空串。
   */
  sub: string

  /**
   * 来自简历。
   */
  from: boolean
}

/**
 * GatePicked(一格已选名字 + 修改钮)的 props。
 */
export type GatePickedIn = {
  /**
   * 已选的几行。
   */
  lines: PickedLine[]

  /**
   * 点「修改」。
   */
  onEdit: () => void

  /**
   * 取词。
   */
  t: TFn
}

/**
 * GateField(一页表单的一格)的 props。
 */
export type GateFieldIn = {
  /**
   * 标签。
   */
  label: string

  /**
   * 标签后面的灰字说明(选填、用途);没有不出。
   */
  hint?: string

  /**
   * 控件。
   */
  children: React.ReactNode
}

/**
 * GatePick(叠开的选择器框)的 props。
 */
export type GatePickBoxIn = {
  /**
   * 标题。
   */
  title: string

  /**
   * 「选好了」那颗钮的字。
   */
  doneText: string

  /**
   * 关框。
   */
  onDone: () => void

  /**
   * 选择器本体。
   */
  children: React.ReactNode
}

/**
 * GateFormFields(一页表单七格)的 props。
 */
export type GateFormFieldsIn = {
  /**
   * 表单状态(useGateEdit 同一台;2026-11-07 起改名 useGateForm)。
   */
  g: GatePanel

  /**
   * 专业、想做的工作、做过的工作三格的已选名字。
   */
  n: GatePickLines

  /**
   * 从简历填写的面板。
   */
  f: ResumeFillPanel

  /**
   * 叠开选择器的手柄。
   */
  k: GatePickPanel

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 三格已选名字。
 */
export type GatePickLines = {
  /**
   * 想做的工作。
   */
  jobs: PickedLine[]

  /**
   * 做过的工作。
   */
  works: PickedLine[]

  /**
   * 所在地:省一行、城市一行(2026-11-12)。
   */
  where: PickedLine[]

  /**
   * 教育经历:一段一行(2026-11-12)。
   */
  edu: PickedLine[]
}

/**
 * 所在地摘要行(whereLinesOf)的入参。
 */
export type WhereLinesIn = {
  /**
   * 选中的省码或境外;空串 = 没选。
   */
  prov: string

  /**
   * 选中的城市英文名;空串 = 没选。
   */
  city: string

  /**
   * 这一刻摆着的城市(取界面语的城市名用)。
   */
  opts: CityOpt[]

  /**
   * 取词。
   */
  t: TFn
}

/**
 * 教育经历摘要行(eduLinesOf)的入参。
 */
export type EduLinesIn = {
  /**
   * 现在的几段。
   */
  rows: EduPick[]

  /**
   * 取词。
   */
  t: TFn

  /**
   * 各段专业的名字(与几段一一对应;没选 = 空串)。
   */
  majors: string[]
}

/**
 * 一段教育经历的摘要(eduSumOf)的入参。
 */
export type EduSumIn = {
  /**
   * 这一段。
   */
  row: EduPick

  /**
   * 取词。
   */
  t: TFn

  /**
   * 这一段专业的名字;没选 = 空串。
   */
  major: string
}

/**
 * 从简历填写后的一行提示。
 */
export type FillMsg = {
  /**
   * 词条键;没有提示 = 空串。
   */
  key: string

  /**
   * 填上了几项。
   */
  n: number

  /**
   * 提示的颜色。
   */
  kind: 'ok' | 'info' | 'err'
}

/**
 * useResumeFill 的入参。
 */
export type ResumeFillHookIn = {
  /**
   * 表单状态。
   */
  g: GatePanel
}

/**
 * useResumeFill 交出的面板。
 */
export type ResumeFillPanel = {
  /**
   * 取数中。
   */
  busy: boolean

  /**
   * 提示。
   */
  msg: FillMsg

  /**
   * 点「从简历填写」。
   */
  onFill: () => void
}

/**
 * GateResumeFill 的 props。
 */
export type GateResumeFillIn = {
  /**
   * 从简历填写的面板。
   */
  f: ResumeFillPanel

  /**
   * 取词。
   */
  t: TFn

  /**
   * 这一格的标签(2026-11-13:按钮并进面板第一格的标签行)。
   */
  label: string

  /**
   * 这一格的控件。
   */
  children: React.ReactNode
}

/**
 * isFromResume 的入参。
 */
export type FromResumeIn = {
  /**
   * 标记(「字段:值」串)。
   */
  marks: string[]

  /**
   * 字段。
   */
  field: string

  /**
   * 值。
   */
  value: string
}

/**
 * fromKeptOf 的入参。
 */
export type FromKeptIn = {
  /**
   * 现有标记。
   */
  marks: string[]

  /**
   * 现在的专业。
   */
  majors: string[]

  /**
   * 现在做过的工作。
   */
  workNocs: string[]

  /**
   * 现在的英文姓名。
   */
  name: string
}

/**
 * occLinesOf 的入参。
 */
export type OccLinesIn = {
  /**
   * 已选的组(同组几个码算一行)。
   */
  picked: OccLineGroup[]

  /**
   * 码 → 显示名。
   */
  titles: Record<string, string>

  /**
   * 标记;想做的工作传空列。
   */
  marks: string[]
}

/**
 * occLinesOf 读的一组已选职业(只声明真读的格)。
 */
export type OccLineGroup = {
  /**
   * 组键。
   */
  key: string

  /**
   * 组里打头的码。
   */
  head: string

  /**
   * 组里全部的码。
   */
  nocs: string[]
}

/**
 * majorNamesOf 读的专业行(形同 majors 桶的 MajorRow,喂 majorNameOf 全格照抄)。
 */
export type MajorLineRow = {
  /**
   * 专业码。
   */
  code: string

  /**
   * 英文名。
   */
  titleEn: string

  /**
   * 英文短名。
   */
  titleEnShort: string

  /**
   * 中文名。
   */
  titleZh: string | null

  /**
   * 韩文名。
   */
  titleKo: string | null

  /**
   * 落的本站大类。
   */
  broads: string[]
}

/**
 * 教育经历几段「专业」那一格的手柄(2026-11-12 专业并进教育经历的每一段)。
 */
export type EduMajorPanel = {
  /**
   * 正在给第几段选专业;-1 = 没在选。
   */
  at: number

  /**
   * 造「点第几段的专业修改」的手柄。
   */
  openOf: (i: number) => () => void

  /**
   * 专业选择框里点了一个专业。
   */
  onPick: (next: string[]) => void

  /**
   * 关专业选择框。
   */
  onClose: () => void
}

/**
 * GateEdu(教育经历弹框正文)的 props。
 */
export type GateEduIn = {
  /**
   * 表单整机。
   */
  g: GatePanel

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 各段专业的名字(与几段一一对应;没选 = 空串)。
   */
  majors: string[]

  /**
   * 搜学校整机。
   */
  sch: SchoolPanel
}

/**
 * majorNamesOf 的入参。
 */
export type MajorNamesIn = {
  /**
   * 几段。
   */
  rows: EduPick[]

  /**
   * 已取到名字的专业行(专业选择器的已选行)。
   */
  picked: MajorLineRow[]

  /**
   * 界面语。
   */
  lang: string
}

/**
 * 搜到的一所学校(形同子桶 school 的 SchoolHit)。
 */
export type SchoolOpt = {
  /**
   * 校名(英文)。
   */
  name: string

  /**
   * 中文译名;没有 = 空串。
   */
  nameZh: string

  /**
   * 所在省码;库里没有 = 空串。
   */
  prov: string

  /**
   * 公立 true、私立 false。
   */
  isPublic: boolean
}

/**
 * 教育经历「搜学校」的整机(useSchoolSearch 出;2026-11-12)。
 */
export type SchoolPanel = {
  /**
   * 正在搜第几段(结果摆在那一段的学校格下面);-1 = 没在搜。
   */
  at: number

  /**
   * 搜到的学校;没搜到、没在搜 = 空列。
   */
  hits: SchoolOpt[]

  /**
   * 造第几段学校格的打字手柄。
   */
  typeOf: (i: number) => (v: string) => void

  /**
   * 造「点一所搜到的学校」的手柄。
   */
  pickOf: (hit: SchoolOpt) => () => void

  /**
   * 界面语(结果行的灰字按它出中文译名)。
   */
  lang: string
}

/**
 * useSchoolSearch 的入参。
 */
export type SchoolHookIn = {
  /**
   * 教育经历几段。
   */
  rows: EduPick[]

  /**
   * 整份写几段。
   */
  setRows: (v: EduPick[]) => void

  /**
   * 界面语。
   */
  lang: string
}

/**
 * GateSchoolHits(学校格下面那几行搜到的学校)的 props。
 */
export type GateSchoolHitsIn = {
  /**
   * 搜学校整机。
   */
  sch: SchoolPanel

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * GateFormLoad(自己取档案的修改面板;投递第 1 步的「生成简历」用)的 props。
 */
export type GateFormLoadIn = {
  /**
   * 取词。
   */
  t: TFn

  /**
   * 关面板。
   */
  onClose: () => void

  /**
   * 存好了。
   */
  onSaved: () => void
}

/**
 * 自己取到的起始答案(useSeedLoad 出)。
 */
export type SeedLoadPanel = {
  /**
   * 起始答案;还没取到、取不到 = null。
   */
  seed: GateEditSeed | null

  /**
   * 取不到(没登录、接口挂了)。
   */
  failed: boolean
}

/**
 * 子桶 seed 交回的起始答案(教育经历明细与简历资料在那边不透明;makeSeedSet 的装配点断言成 GateEditSeed)。
 */
export type SeedLoaded = object | null

/**
 * eduMajorAtOf 的入参。
 */
export type EduMajorAtIn = {
  /**
   * 几段。
   */
  rows: EduPick[]

  /**
   * 正在给第几段选专业;-1 = 没在选。
   */
  at: number
}

/**
 * makeAtSet 的入参。
 */
export type AtSetIn = {
  /**
   * 「正在给第几段选」的落格。
   */
  setAt: (v: number) => void

  /**
   * 要落的值。
   */
  v: number
}

/**
 * syncOldProfile 的入参(2026-11-13:把职业与省同步进旧档案,保存与投出后补格共用)。
 */
export type OldSyncIn = {
  /**
   * 想做的工作(职业码)。
   */
  nocs: string[]

  /**
   * 现居省码;空串 = 没答或在境外。
   */
  prov: string
}

/**
 * 「投递发出去了」事件带的那一份里本域读的两格(apply 桶 ApplySentOut 的子集,本域自声明;2026-11-13 投出后补档案用)。
 */
export type ApplySentDetail = {
  /**
   * 刚投的职位的职业码;没有 = 空串。
   */
  noc: string

  /**
   * 刚投的职位的省码;没有 = 空串。
   */
  province: string
}
