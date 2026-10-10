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
 */
export type GateStep = 'goal' | 'major' | 'job' | 'prov' | 'name' | 'reg'

/**
 * 访客向导草稿(亲手构造后交 lib/guest 存与交接,全格照抄它的 GateDraft)。
 */
export type GateDraft = {
  /**
   * 目标档(1 = 拿 PR、2 = 先找工作);0 = 没答。
   */
  goal: number

  /**
   * 专业的 CIP 2021 class 码(如 '52.0203');空串 = 没答。
   * A1 立时存的是专业大类码('01'…'12');2026-10-04 A2 起存 class 码,A1 没上线,线上没有大类码的旧值。
   * 2026-10-05 改多选:格名 major → majors,存码清单(至多 3 个,选的先后序);空列 = 没答。单值那版没上线,不迁移。
   */
  majors: string[]

  /**
   * 想做的职业码。
   */
  nocs: string[]

  /**
   * 现在在哪个省;空串 = 没答或答了境外。
   */
  prov: string

  /**
   * 现在在哪个城市(2026-10-09「我的档案」批,选填):英文城市名;空串 = 没选。
   */
  city: string

  /**
   * 答的是「加拿大境外」。
   */
  abroad: boolean

  /**
   * 这次向导的由头。
   */
  intent: GateIntent
}

/**
 * 往已选职业清单上合并的更新函数(React 落格收的另一种形态;本域只整份地拨,形状照 profile 的同名件自抄,
 * 好让整机面板原样喂给 profile 桶的已选标签件)。
 * 2026-10-04 A2 起已选标签归 quiz 桶选职业控件,这一形只剩「职业题落格(makeTouchedNocs)也收它」一个用处。
 */
export type NocsMergeFn = (prev: string[]) => string[]

/**
 * 已选职业清单的落格:既收整份新清单,也收上面那种合并函数。
 */
export type SetNocsFn = (v: string[] | NocsMergeFn) => void

/**
 * useGateWizard 的入参。
 */
export type GateHookIn = {
  /**
   * 这次向导的由头。
   */
  intent: GateIntent

  /**
   * 注册成功、草稿交出去之后交还调用方(打开刚才的职位 / 接着投递 / 完成收藏)。
   */
  onDone: () => void

  /**
   * 关掉向导(调用方的关法;向导先撤交接戳再交给它)。
   */
  onClose: () => void

  /**
   * 取词函数(返回钮的读屏名;2026-10-05 返回钮收进弹框壳时加)。
   */
  t: TFn
}

/**
 * 弹框壳左上角返回钮的规格(与 modal 桶 back 位同形,本域自抄;null = 此刻不出 —— 第 1 题与注册屏)。2026-10-05 立。
 */
export type GateBack = {
  /**
   * 读屏名(界面语)。
   */
  aria: string

  /**
   * 回上一题。
   */
  onClick: () => void
} | null

/**
 * 访客向导的整块面板(useGateWizard 出;顶行、各题、钮区与借来的已选标签件都读它)。
 * 2026-10-04 改版:钮组改成本域自己的粘底钮区,原为共用首访向导钮组凑的三格(saving / isLast / apply 恒 false)随之撤。
 */
export type GatePanel = {
  /**
   * 走到第几步(0~3 是四道题,4 是注册屏)。
   */
  step: number

  /**
   * 当前这一屏。
   */
  cur: GateStep

  /**
   * 题面那一格的元素 id(2026-10-04 收口审查:每换一题焦点挪到题面上 —— 点目标大卡、点下一步时被点的钮跟着这一屏卸掉,
   * 焦点原先掉回 body,读屏不知道换了题;本整机给一枚 useId,题面挂它、换题的 effect 按它找)。
   */
  qid: string

  /**
   * 目标档;0 = 没答。
   */
  goal: number

  /**
   * 点目标大卡:记下这一档并直接进下一题(目标题没有「下一步」钮)。
   */
  onGoal: (v: number) => void

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
   * 一共几题(顶行进度条的分母:访客向导 4,编辑模式 5)。
   */
  total: number

  /**
   * 下一步(打离开这一步的点;走过第四步进注册屏)。
   */
  onNext: () => void

  /**
   * 主钮灰着(这一题还没答;2026-10-04「跳过这步」撤了以后,没答就不许往下走 —— 判定见 functions 的 gateNextOffOf)。
   */
  nextOff: boolean

  /**
   * 回上一题(顶行左边的返回钮;第 1 题不出)。
   * 2026-10-05 起钮由弹框壳在左上角出(modal 桶 back 位,与 × 镜像),这里只交动作。
   */
  onBack: () => void

  /**
   * 弹框壳左上角返回钮的规格(第 1 题与注册屏 null)。2026-10-05 返回钮收进弹框壳时立。
   */
  back: GateBack

  /**
   * 注册屏 AuthForm 成功后的回调。
   */
  onRegistered: () => void

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
 * GateSteps(题目分派)的 props(2026-10-05 立):整机面板 + 取词函数 + 专业题那一屏。
 */
export type GateStepsIn = {
  /**
   * 访客向导整机。
   */
  g: GatePanel

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 专业题那一屏(majors 桶的选择器,向导件 GateWizard 挂好机器递进来;走到专业题才渲)。
   */
  children: React.ReactNode

  /**
   * 职业题那一屏(quiz 桶的 OccRail,向导件 GateWizard 开屏就挂好选职业机器递进来;走到职业题才渲)。
   * 2026-10-05 Frank「点过来的时候 有一个闪 的过程」立。
   */
  jobs: React.ReactNode
}

/**
 * GateJobs 的 props(2026-10-05 起只是职业题那一屏的宿主格,机器由向导件挂)。
 */
export type GateJobsIn = {
  /**
   * 职业题那一屏。
   */
  children: React.ReactNode
}

/**
 * GateWizard 的 props(契约照 A1 冻结:职位弹框、投递流、收藏、进站四处在传)。
 */
export type GateWizardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 这次向导的由头。
   */
  intent: GateIntent

  /**
   * Google 整页登录后回跳到哪(调用方可省 = 当前页;点开职位那一路回职位整页)。
   */
  returnTo?: string

  /**
   * 弹框层级(调用方可省;投递流叠在职位弹框上要抬一层)。
   */
  z?: number

  /**
   * 关掉向导(×、Esc、点遮罩)。
   */
  onClose: () => void

  /**
   * 注册成功、草稿交出去之后交还调用方。
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
 * gateStepOf 的入参。
 */
export type GateStepOfIn = {
  /**
   * 走到第几步。
   */
  step: number

  /**
   * 这一套题的步序(访客向导 GATE_STEPS,编辑模式 GATE_EDIT_STEPS)。
   */
  steps: readonly GateStep[]
}

/**
 * gateQuestionKeyOf 的入参。
 */
export type GateQuestionIn = {
  /**
   * 当前这一屏。
   */
  step: GateStep
}

/**
 * 「焦点上次挪到哪一步」的记号(useRef 那一格;本域自抄形,types 不许 import React)。
 */
export type StepRef = {
  /**
   * 上次挪焦点(或开屏)时的步数。
   */
  current: number
}

/**
 * focusGateQuestion 的入参(2026-10-04 收口审查)。
 */
export type QuestionFocusIn = {
  /**
   * 题面那一格的元素 id。
   */
  id: string

  /**
   * 现在走到第几步。
   */
  step: number

  /**
   * 上次挪焦点时的步数(开屏记的是第一题 —— 开屏不挪,只有换了题才挪)。
   */
  last: StepRef
}

/**
 * makeGateNext 的入参。
 */
export type GateNextIn = {
  /**
   * 走到第几步。
   */
  step: number

  /**
   * 当前这一屏(离开时打点用)。
   */
  cur: GateStep

  /**
   * 步数落格。
   */
  setStep: (v: number) => void

  /**
   * 「动过了」落格(动过才写草稿)。
   */
  setTouched: (v: boolean) => void
}

/**
 * makeGateBack 的入参。
 */
export type GateBackIn = {
  /**
   * 走到第几步。
   */
  step: number

  /**
   * 步数落格。
   */
  setStep: (v: number) => void
}

/**
 * gateNextOffOf 的入参:当前这一屏与三道题的现值(2026-10-04「跳过这步」撤时立,替掉 makeGateSkip 的入参)。
 */
export type GateNextOffIn = {
  /**
   * 英文姓名填了但不合规(只编辑模式那一题看它)。
   */
  nameBad: boolean

  /**
   * 当前这一屏。
   */
  cur: GateStep

  /**
   * 选中的专业码(空列 = 没选;2026-10-05 多选前是一个码、空串 = 没选)。
   */
  majors: string[]

  /**
   * 已选职业码。
   */
  nocs: string[]

  /**
   * 所在省那一格亮哪个(省码 / 境外;空串 = 都不亮)。
   */
  provActive: string
}

/**
 * makeGoalPick 的入参。
 */
export type GoalPickIn = {
  /**
   * 目标档落格。
   */
  setGoal: (v: number) => void

  /**
   * 「动过了」落格。
   */
  setTouched: (v: boolean) => void

  /**
   * 记完往后走一步(2026-10-04 改版:目标题点了直接进下一题)。
   */
  next: () => void
}

/**
 * makeMajorsPick 的入参(2026-10-05 多选前名 makeMajorPick / MajorPickIn,落一个码)。
 */
export type MajorsPickIn = {
  /**
   * 专业码清单落格。
   */
  setMajors: (v: string[]) => void

  /**
   * 「动过了」落格。
   */
  setTouched: (v: boolean) => void
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
   * 「动过了」落格。
   */
  setTouched: (v: boolean) => void

  /**
   * 城市落格(2026-10-09:换省 / 选境外时清掉旧城市 —— 城市挂在省下面)。
   */
  setCity: CityClearFn
}

/**
 * makeTouchedNocs 的入参。
 */
export type TouchedNocsIn = {
  /**
   * 已选职业落格。
   */
  setNocs: SetNocsFn

  /**
   * 「动过了」落格。
   */
  setTouched: (v: boolean) => void
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
 * makeGateClose 的入参。
 */
export type GateCloseIn = {
  /**
   * 调用方的关法。
   */
  onClose: () => void
}

/**
 * makeGateDone 的入参。
 */
export type GateDoneIn = {
  /**
   * 这一刻的草稿(内存里那份,本地存储被禁时也交得出去)。
   */
  draft: GateDraft

  /**
   * 交还调用方。
   */
  onDone: () => void

  /**
   * 这一页的路径(只在职位板上按答案筛;2026-10-04 A2)。
   */
  path: string

  /**
   * 换地址栏(router.replace;职位板按地址栏重挂套上筛选)。
   */
  replace: (href: string) => void
}

/**
 * 「这一页已经试过回职位板筛」的记号(useRef 那一格;本域自抄形)。
 */
export type BoardWentRef = {
  /**
   * 这一页已经试过(成没成都算 —— 一页只试一次)。
   */
  current: boolean
}

/**
 * runGateSync 的入参(2026-10-04 收口审查:补交钩子那一跑)。
 */
export type GateSyncRunIn = {
  /**
   * 读回的草稿。
   */
  draft: GateDraft

  /**
   * 这一页的路径(只在职位板上筛)。
   */
  path: string

  /**
   * 这一页现在的查询串(window.location.search;回职位板在它上面改)。
   */
  search: string

  /**
   * 换地址栏(router.replace)。
   */
  replace: (href: string) => void

  /**
   * 这一页试没试过回职位板筛。
   */
  boardWent: BoardWentRef
}

/**
 * gateBoardUrlOf 的入参(2026-10-04 A2:注册完回职位板按答案筛)。
 */
export type BoardUrlIn = {
  /**
   * 所在省码;空串 = 没答。
   */
  prov: string

  /**
   * 答的是境外(境外不带省)。
   */
  abroad: boolean

  /**
   * 第 3 题选的职业码。
   */
  nocs: string[]

  /**
   * 该专业的第一个本站大类(没选职业时带它);空串 = 没有。
   * 2026-10-05 专业改多选后是第一个专业的第一个大类(职位板 broad 只收单值,见 constants 的 P_BROAD)。
   */
  broad: string

  /**
   * 这一页现在的查询串(调用方传 window.location.search;2026-10-04 收口审查:在现有地址上改,不从空串起拼)。
   */
  search: string
}

/**
 * dropParams 的入参。
 */
export type ParamsDropIn = {
  /**
   * 正在拼的查询参数(就地删)。
   */
  sp: URLSearchParams

  /**
   * 要撤的参数名。
   */
  keys: string[]
}

/**
 * 回职位板要的那个专业(majors 桶 fetchMajor 取回的行,只声明本域真读的一格;2026-10-05 选择器搬家时立)。
 */
export type BoardMajor = {
  /**
   * 本站职业大类清单(取第一个;数据层推好的)。
   */
  broads: string[]
}

/**
 * 回职位板要的那个专业或没有(查无此码 / 取挂了)。
 */
export type MaybeBoardMajor = BoardMajor | null

/**
 * gateBoardGo 的入参。
 */
export type BoardGoIn = {
  /**
   * 这一份草稿(邮箱注册是向导内存里那份,Google 回跳是补交时读回的那份)。
   */
  draft: GateDraft

  /**
   * 这一页的路径(只在职位板上筛)。
   */
  path: string

  /**
   * 这一页现在的查询串(调用方传 window.location.search;2026-10-04 收口审查)。
   */
  search: string

  /**
   * 换地址栏(router.replace)。
   */
  replace: (href: string) => void
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
   * 钮区主钮的词条键(访客向导恒「下一步」;编辑模式最后一题是「保存」)。
   */
  nextKey: string

  /**
   * 正在保存(主钮禁用)。
   */
  saving: boolean

  /**
   * 保存失败那一行的词条键;空串 = 没失败。
   */
  failKey: string
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
}

/**
 * GateEdit 的 props。
 */
export type GateEditIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 起始答案。
   */
  seed: GateEditSeed

  /**
   * 关框(没保存)。
   */
  onClose: () => void

  /**
   * 保存成功(调用方关框并重取档案)。
   */
  onSaved: () => void
}

/**
 * useGateEdit 的入参(GateEditIn 去掉 seed 以外原样)。
 */
export type GateEditHookIn = {
  /**
   * 取词函数。
   */
  t: TFn

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
 * makeEditNext 的入参。
 */
export type EditNextIn = {
  /**
   * 走到第几步。
   */
  step: number

  /**
   * 步数落格。
   */
  setStep: (v: number) => void

  /**
   * 最后一题点了 = 保存。
   */
  save: () => void
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
}
