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
   */
  majors: string[]

  /**
   * 报新的专业码清单(专业题选择器的上报口;记「动过了」)。
   * 2026-10-05 立:原「专业题的热门 / 搜索 / 选中回显」一格(majors: MajorPanel,整机开屏就取热门)撤 ——
   * 选择器机器搬去 components/majors,由向导件 GateWizard 开屏挂上(照旧开屏就取热门),这里只留值与上报口。
   */
  onMajors: (v: string[]) => void

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
   * 做过的工作(职业码)。
   */
  workNocs: string[]

  /**
   * 改做过的工作。
   */
  setWorkNocs: SetNocsFn

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
   * 匹配依据;空串 = 没选。
   */
  matchBy: string

  /**
   * 选匹配依据。
   */
  setMatchBy: (v: string) => void

  /**
   * 匹配模式;空串 = 没选。
   */
  matchMode: string

  /**
   * 选匹配模式。
   */
  setMatchMode: (v: string) => void

  /**
   * 直接保存(一页表单的「保存」;向导走 onNext 翻到最后一题才存)。
   */
  onSave: () => void
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
}

/**
 * 教育经历一段(界面上的三格;存档时拼成「所在地.公立私立.时长」串)。
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
   * 哪一格:prov / kind / len。
   */
  f: string
}

/**
 * makeEduPick 的入参。
 */
export type EduPickIn = {
  /**
   * 第几段与哪一格。
   */
  cell: EduCellIn

  /**
   * 现在的几段。
   */
  edu: EduPick[]

  /**
   * 写几段。
   */
  setEdu: (v: EduPick[]) => void
}

/**
 * makeEduLabel 的入参。
 */
export type EduLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 哪一格:prov / kind / len。
   */
  f: string
}

/**
 * eduCellSetOf 的入参。
 */
export type EduCellSetIn = {
  /**
   * 这一段。
   */
  row: EduPick

  /**
   * 哪一格:prov / kind / len。
   */
  f: string

  /**
   * 新值。
   */
  v: string
}

/**
 * makeEduAdd / makeEduRemove 的入参。
 */
export type EduRowsIn = {
  /**
   * 现在的几段。
   */
  edu: EduPick[]

  /**
   * 写几段。
   */
  setEdu: (v: EduPick[]) => void

  /**
   * 第几段(删用;加时给 0)。
   */
  i: number
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
   * 教育经历串,只收三格都选了的段(2026-10-13)。
   */
  fitEdu: string[]

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
   * 开专业选择器。
   */
  onMajor: () => void

  /**
   * 开职业选择器。
   */
  onJob: () => void

  /**
   * 开「做过的工作」选择器。
   */
  onWork: () => void

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
 * 「已选几个」一行的取法入参。
 */
export type GatePickedIn = {
  /**
   * 取词。
   */
  t: TFn

  /**
   * 已选几个。
   */
  n: number
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
   * 叠开选择器的手柄。
   */
  k: GatePickPanel

  /**
   * 取词。
   */
  t: TFn
}
