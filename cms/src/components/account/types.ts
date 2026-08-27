/**
 * 账户页(/account)那几个迁出组件体的函数的契约。
 * 2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」,ProfileForm 的 addTyped 与
 * AccountPage 的 onNickKey 随之迁进本目录的 functions.ts —— 原先靠闭包拿到的东西
 * 全部改成这里的显式入参,组件只负责把手上的值递进去。
 * 2026-08-26 页面「纯拼装门」改造批续:page.tsx 的三个 type(Me / ProfileWithResume /
 * Sec)与拆出来的六件视觉组件的 props 契约一并迁进来。
 *
 * @author Frank
 * @time 2026-08-26 15:28:17
 */

/**
 * makeAddTyped 的入参(原 ProfileForm 体内 addTyped 闭包的三样东西)。
 */
export type AddTypedIn = {
  /**
   * 搜索框里当前敲进去的原字(未 trim;5 位数字按 NOC 码直加)。
   */
  q: string

  /**
   * 当前搜索命中的职业清单;不是码时取第一条加。
   * 只声明本函数真读的那一格(职业码),标题等格不关它的事。
   */
  hits: readonly { noc: string }[]

  /**
   * 把一个职业码加进已选清单(重复与空串由它自己挡)。
   */
  addNoc: (code: string) => void
}

/**
 * 「加输入框里这一个」的按钮手柄:不带参数,点了就按当前输入加一个职业。
 */
export type AddTypedFn = () => void

/**
 * makeNickKey 的入参(原 AccountPage 体内 onNickKey 闭包的两样东西)。
 */
export type NickKeyIn = {
  /**
   * 存昵称(Enter 触发);判空与忙态归它自己。
   */
  saveNick: () => void

  /**
   * 昵称编辑态 setter;给 null = 退出编辑(Esc 触发)。
   */
  setNick: (v: string | null) => void
}

/**
 * 昵称框的键盘手柄。只读事件的 key 一格 —— 按本域自己声明形状的规矩,
 * 不去借 React 的事件类型(实参是 React.KeyboardEvent,结构上兜得住)。
 */
export type NickKeyFn = (e: { key: string }) => void

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值 —— 宪法 08-25「types 自声明」,
 * 形状本域自己声明,不从别的域取;真参数是 lib/i18n 那个带附加成员的交叉类型,
 * 结构上兜得住)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 账户页的节标识。同 URL 深链 `?sec=` 的取值,也是侧栏节表 SEC_TABS 的键
 * (2026-08-26 自 page.tsx 迁入)。
 */
export type Sec = 'overview' | 'profile' | 'favs' | 'sjobs' | 'saved' | 'buy'

/**
 * 用户档案 + 简历存档两键。profile 上的简历存档两键(E11-08)只在本页读显示、
 * 不进 ProfileForm 的表单值 —— 原先是 `ProfileValue & { … }` 就地扩类型,
 * 2026-08-26 随页面拆件迁进本文件;types.ts 不许 import,所以照抄全格
 * (结构相同即与 ProfileValue 兼容,喂给 ProfileForm 的接缝零断言)。
 */
export type ProfileWithResume = {
  /**
   * 分型(E11-04:海外/在读/在职/求职/已 PR);未填 = null。
   */
  currentStatus?: string | null

  /**
   * 目标职业的 NOC 码清单;未填 = null。
   */
  nocCodes?: string[] | null

  /**
   * 英语 CLB 档;未填 = null。
   */
  clb?: number | null

  /**
   * EE 的 CRS 分;未填 = null。
   */
  crs?: number | null

  /**
   * 目标省码清单;未填 = null。
   */
  targetProvinces?: string[] | null

  /**
   * 工签剩余月数;未填 = null。
   */
  pgwpMonthsLeft?: number | null

  /**
   * 存档的简历全文(E11-08);没存过 = null。
   */
  resumeText?: string | null

  /**
   * 简历存档时间(ISO);没存过 = null。
   */
  resumeSavedAt?: string | null
}

/**
 * 已登录用户(/api/users/me 下发的那份,只声明本页真读的那几格)。
 */
export type AccountUser = {
  /**
   * 用户 id(PATCH /api/users/:id 要它)。
   */
  id: string | number

  /**
   * 邮箱(身份行的佐证;昵称为空时取 @ 前缀当显示名)。
   */
  email: string

  /**
   * 角色(本页不渲染,随接口原样收下)。
   */
  role?: string

  /**
   * Pro 到期日(ISO);从没买过 = null。
   */
  proUntil?: string | null

  /**
   * 移民档案 + 简历存档;从没填过 = null。
   */
  profile?: ProfileWithResume | null

  /**
   * 昵称(E11-01 可就地改);没设过 = null。
   */
  displayName?: string | null

  /**
   * OAuth 带回的头像 URL;没有 = null(走首字母色块)。
   */
  avatar?: string | null

  /**
   * 用户偏好语(本页不渲染,随接口原样收下)。
   */
  locale?: string | null
}

/**
 * 会话探测的结果:拿到用户 = 对象,没登录 = null(2026-08-26 自 page.tsx 迁入)。
 */
export type Me = AccountUser | null

/**
 * 时长包档位(E3-03)。发给 /api/stripe/checkout 的 plan 值。
 */
export type BuyPlan = '30' | '90'

/**
 * AccountShell 的 props。
 */
export type AccountShellIn = {
  /**
   * 整页内容(顶栏 + 正文 + 页脚)。
   */
  children: React.ReactNode
}

/**
 * 只随窄屏分叉的类名预算入参(两列容器 / 左卡 / 右卡三处共用同一个判据)。
 */
export type NarrowClsIn = {
  /**
   * 窄屏(手机)= true。
   */
  narrow: boolean
}

/**
 * AccountColumns 的 props。
 */
export type AccountColumnsIn = {
  /**
   * 窄屏(手机)= true:两列改上下叠,左卡变顶部横排条。
   */
  narrow: boolean

  /**
   * 左卡里的节导航(由调用方拼好递进来 —— 本件只管两列的骨架)。
   */
  nav: React.ReactNode

  /**
   * 右卡里当前选中节的内容。
   */
  children: React.ReactNode
}

/**
 * AccountNav 的 props。
 */
export type AccountNavIn = {
  /**
   * 当前选中的节(决定哪一枚钮亮起来)。
   */
  sec: Sec

  /**
   * 窄屏(手机)= true:横排条里不渲分隔线(一条横线会把那一行切断)。
   */
  narrow: boolean

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 点某一节。
   */
  onPick: (sec: Sec) => void

  /**
   * 点退出登录。
   */
  onLogout: () => void
}

/**
 * navBtnClsOf 的入参。
 */
export type NavBtnClsIn = {
  /**
   * 这一枚是不是当前节。
   */
  active: boolean
}

/**
 * navLabelOf 的入参。
 */
export type NavLabelIn = {
  /**
   * 该节的标题原文(可能带括号说明)。
   */
  label: string
}

/**
 * makeSecPick 的入参。
 */
export type SecPickIn = {
  /**
   * 这一枚钮代表哪一节。
   */
  sec: Sec

  /**
   * 点了往哪报。
   */
  onPick: (sec: Sec) => void
}

/**
 * 一枚节钮的点击手柄:不带参数,点了就切到它代表的那一节。
 */
export type SecPickFn = () => void

/**
 * nickShownOf 的入参。
 */
export type NickShownIn = {
  /**
   * 昵称原值;没设过 = null。
   */
  displayName?: string | null

  /**
   * 邮箱(昵称空时取 @ 前缀兜底)。
   */
  email: string
}

/**
 * nickSaveLabelOf 的入参。
 */
export type NickSaveLabelIn = {
  /**
   * 正在存 = true(钮面换成省略号)。
   */
  busy: boolean

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * AccountNickname 的 props。
 */
export type AccountNicknameIn = {
  /**
   * 看态显示的名字(昵称,空则已回退成邮箱前缀)。
   */
  shown: string

  /**
   * 编辑值;null = 不在编辑(看态)。
   */
  nick: string | null

  /**
   * 正在存 = true(保存钮禁用并换成省略号)。
   */
  nickBusy: boolean

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 点铅笔进编辑态。
   */
  onEdit: () => void

  /**
   * 编辑框改值。
   */
  onChange: (v: string) => void

  /**
   * 点保存。
   */
  onSave: () => void

  /**
   * 编辑框的键盘出口(Enter 存、Esc 取消)。
   */
  onKey: NickKeyFn
}

/**
 * AccountPlanLine 的 props。
 */
export type AccountPlanLineIn = {
  /**
   * Pro 在期 = true。
   */
  pro: boolean

  /**
   * Pro 到期日(ISO,渲染时裁到 10 位);没买过可省 = null。
   */
  until?: string | null

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * AccountOverview 的 props。
 */
export type AccountOverviewIn = {
  /**
   * 已登录用户(调用点已判过非 null)。
   */
  me: AccountUser

  /**
   * Pro 在期 = true。
   */
  pro: boolean

  /**
   * Stripe 回跳带了 ?ok=1 = true(顶上出一条成功提示)。
   */
  payOk: boolean

  /**
   * 昵称编辑值;null = 不在编辑。
   */
  nick: string | null

  /**
   * 昵称正在存 = true。
   */
  nickBusy: boolean

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 点铅笔进编辑态。
   */
  onNickEdit: () => void

  /**
   * 昵称编辑框改值。
   */
  onNickChange: (v: string) => void

  /**
   * 点保存昵称。
   */
  onNickSave: () => void

  /**
   * 昵称编辑框的键盘出口。
   */
  onNickKey: NickKeyFn
}

/**
 * buyBtnClsOf 的入参。
 */
export type BuyBtnClsIn = {
  /**
   * 这一枚是哪一档(决定底色深浅)。
   */
  plan: BuyPlan

  /**
   * 正在等 Checkout URL = true(整钮压暗)。
   */
  busy: boolean
}

/**
 * makeBuyPick 的入参。
 */
export type BuyPickIn = {
  /**
   * 这一枚钮买哪一档。
   */
  plan: BuyPlan

  /**
   * 点了往哪报。
   */
  onBuy: (plan: BuyPlan) => void
}

/**
 * 一枚购买钮的点击手柄:不带参数,点了就按它代表的档发起 Checkout。
 */
export type BuyPickFn = () => void

/**
 * AccountBuyPanel 的 props。
 */
export type AccountBuyPanelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 正在等 Checkout URL = true(两钮禁用并压暗)。
   */
  buying: boolean

  /**
   * 拿不到 Checkout URL 时的错误话术;空串 = 没出错。
   */
  buyErr: string

  /**
   * 点某一档。
   */
  onBuy: (plan: BuyPlan) => void
}
