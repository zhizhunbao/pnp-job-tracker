/**
 * pricing 域(定价页与定价件)的自足形状:各视图的 props 契约、状态机器交给视图的整块面板,
 * 以及每个函数的入参。档位数(免费额度四格)本域**自己声明**一份 —— 宪法 08-25
 * 「types 自声明」:形状不从别的域取,结构相同即兼容,少声明一格 tsc 当场拦。
 * 2026-08-28 换装批第二波补进价卡三件的形状(展示价容器、档位标识、Checkout 线格式、
 * 埋点对象的归一前形状、升级钮三态)。
 *
 * @author Frank
 * @time 2026-08-28 12:45:00
 */

/**
 * 界面语言(三字面量各域自抄;营销截图分两门那一格要读它)。
 */
export type PricingLang = 'zh' | 'en' | 'ko'

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值 —— 本域自声明,
 * 真参数是 lib/i18n 那个带附加成员的交叉类型,结构上兜得住)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 无参无返的点击手柄(注册钮、弹框开关、截图埋点都是这一形)。
 */
export type ClickFn = () => void

/**
 * 免费与 Pro 的档位数(服务端 lib/quota 读 env 算好后随 props 下来 ——
 * 客户端直接 import 拿到的是**构建期**的默认值,改 env 就不准了)。
 */
export type PriceCaps = {
  /**
   * 免费用户的 AI 顾问总试用次数。
   */
  advisor: number

  /**
   * 免费用户的岗位文本解析总试用次数。
   */
  jobtext: number

  /**
   * 免费用户每天可匹配的岗位数。
   */
  match: number

  /**
   * Pro 用户每天的 AI 顾问次数。
   */
  proAdvisor: number
}

/**
 * Pricing(定价页正文)的 props。
 */
export type PricingIn = {
  /**
   * 登录没登录(CTA 三态之一:未登录点付费 → 先开注册弹框)。
   */
  loggedIn: boolean

  /**
   * 是不是 Pro(CTA 三态之二:已 Pro → 去账户页续期,不再卖一遍)。
   */
  pro: boolean

  /**
   * 档位数四格。
   */
  caps: PriceCaps
}

/**
 * usePricingPage 交给视图的整块面板:语言、注册弹框的开关态与四只手柄。
 */
export type PricingPanel = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前界面语言(营销截图选哪一门靠它)。
   */
  lang: PricingLang

  /**
   * 注册弹框开着没有。
   */
  authOpen: boolean

  /**
   * 点营销截图(埋点后照常走链接去把脉页 —— 不拦导航)。
   */
  onShot: ClickFn

  /**
   * 未登录点付费:开注册弹框。
   */
  onRegister: ClickFn

  /**
   * 关掉注册弹框。
   */
  onAuthClose: ClickFn

  /**
   * 注册完成:整页重载,让服务端重新认人(登录态与 Pro 态都由服务端下发)。
   */
  onAuthDone: ClickFn
}

/**
 * pricingShotOf 的入参:界面语言。
 */
export type PricingShotOfIn = {
  /**
   * 当前界面语言。
   */
  lang: PricingLang
}

/**
 * fromKindOf 的入参:地址栏里读到的来路原文。
 */
export type FromKindOfIn = {
  /**
   * 来路参数的原文;null = 地址上压根没带这个参数。
   */
  raw: string | null
}

/**
 * makeFlagSet 的入参:一格布尔开关的落格与要拨成的值。注册弹框、对比弹窗的开与关
 * 都是它 —— 每个开关各造一个工厂只会得到几份同文(同名同义件在 account 域)。
 * 2026-08-28 第二波把原先只管注册弹框的 AuthToggleIn 就地泛化成它。
 */
export type FlagSetIn = {
  /**
   * 拨哪格。
   */
  set: (v: boolean) => void

  /**
   * 拨成什么(开 true、关 false)。
   */
  v: boolean
}

/**
 * 时长包的档位标识(发给 Checkout 的 plan 值,也是埋点事件的属性值)。
 */
export type PricePlan = '30' | '90'

/**
 * 展示价 env 解析出来的两档原文。
 */
export type PriceTexts = {
  /**
   * 30 天档的展示价原文(如 CA$19)。
   */
  p30: string

  /**
   * 90 天档的展示价原文(如 CA$39)。
   */
  p90: string
}

/**
 * 价格锚点的一份展示事实(#74:PricingCard 与 UpgradeModal 共用,不许 fork)。
 * 全是**给人看的成品串与成品数**,不带函数 —— 算法在 functions,这里只装算完的结果。
 */
export type Price = {
  /**
   * 30 天档的展示价原文。
   */
  p30: string

  /**
   * 90 天档的展示价原文。
   */
  p90: string

  /**
   * 30 天档折算到每天的展示价。
   */
  perDay30: string

  /**
   * 90 天档折算到每天的展示价。
   */
  perDay90: string

  /**
   * 买 90 天比买 30 天每天省百分之几(徽标上的 N)。env 里 30 天档价读不出数时记 0。
   */
  savePct: number

  /**
   * 90 天档折成每 30 天的价(卡上「CA$4.33 / 30 天」)。
   */
  per30Of90: string
}

/**
 * priceAmountOf 的入参。
 */
export type PriceAmountOfIn = {
  /**
   * 展示价原文。
   */
  text: string
}

/**
 * priceCurrencyOf 的入参。
 */
export type PriceCurrencyOfIn = {
  /**
   * 展示价原文。
   */
  text: string
}

/**
 * perDayOf 的入参。
 */
export type PerDayOfIn = {
  /**
   * 该档的展示价原文。
   */
  text: string

  /**
   * 该档管多少天。
   */
  days: number
}

/**
 * savePctOf 的入参:两档的展示价原文。
 */
export type SavePctOfIn = {
  /**
   * 30 天档的展示价原文。
   */
  p30: string

  /**
   * 90 天档的展示价原文。
   */
  p90: string
}

/**
 * `/api/stripe/checkout` 的响应体(线格式:拿不到 url = 发起失败)。
 */
export type CheckoutRespJson = {
  /**
   * Stripe Checkout 的跳转地址;发起失败时缺席或 null。
   */
  url?: string | null
}

/**
 * 环境注入的 umami 统计对象的形状(只声明本域真用的 track 一格)。
 */
export type UmamiLike = {
  /**
   * 上报一个事件:事件名 + 随事件带的属性(档位 30 / 90,用来分辨两张 Pro 卡的转化)。
   * 两参签名由 umami 这个外部脚本定死,不是本域的契约。
   */
  track: (event: string, data: Record<string, string>) => void
}

/**
 * 带 umami 的 window(归一前形状:埋点脚本被拦截或还没加载时整格缺席)。
 */
export type UmamiWindow = {
  /**
   * 环境注入的统计对象;没有就不发。
   */
  umami?: UmamiLike
}

/**
 * trackCheckout 的入参。
 */
export type TrackCheckoutIn = {
  /**
   * 发起的是哪一档。
   */
  plan: PricePlan
}

/**
 * checkoutUrlOf 的入参。
 */
export type CheckoutUrlOfIn = {
  /**
   * 买的是哪一档。
   */
  plan: PricePlan
}

/**
 * trackPayClick 的入参。
 */
export type TrackPayClickIn = {
  /**
   * 点的是哪一档。
   */
  plan: PricePlan

  /**
   * 点的时候登录没登录(未登录点了也是付费意向,要能分开看)。
   */
  loggedIn: boolean
}

/**
 * 发起一档购买的手柄。
 */
export type BuyFn = (plan: PricePlan) => Promise<void>

/**
 * makePlanPick 的入参:把一枚钮和它代表的档绑起来。
 */
export type PlanPickIn = {
  /**
   * 这一枚买哪一档。
   */
  plan: PricePlan

  /**
   * 点了往哪报。
   */
  onBuy: BuyFn
}

/**
 * makePricingBuy 的入参:价卡那条购买流要用的登录态、注册出口与忙态落格。
 */
export type PricingBuyIn = {
  /**
   * 登录没登录(未登录点付费 → 不发请求,先开注册弹框)。
   */
  loggedIn: boolean

  /**
   * 未登录时的出口:开注册弹框。
   */
  onRegister: ClickFn

  /**
   * 忙态的落格(等 Checkout URL 期间两枚钮都禁用)。
   */
  setBusy: (v: boolean) => void
}

/**
 * makeUpgradeBuy 的入参:升级弹框那条购买流要用的取词函数与两格落格。
 */
export type UpgradeBuyIn = {
  /**
   * 取词函数(失败话术要它)。
   */
  t: TFn

  /**
   * 忙态的落格。
   */
  setBusy: (v: boolean) => void

  /**
   * 失败话术的落格;空串 = 没有错。
   */
  setErr: (v: string) => void
}

/**
 * buyClsOf 的入参:价卡购买钮的档位与忙态。
 */
export type BuyClsIn = {
  /**
   * 哪一档(配色靠它查表)。
   */
  plan: PricePlan

  /**
   * 是不是正在等 Checkout URL(压暗)。
   */
  busy: boolean
}

/**
 * upBuyClsOf 的入参:升级弹框购买钮的档位与忙态。
 */
export type UpBuyClsIn = {
  /**
   * 哪一档。
   */
  plan: PricePlan

  /**
   * 是不是正在等 Checkout URL。
   */
  busy: boolean
}

/**
 * featureClsOf 的入参:清单一行是不是弱化档。
 */
export type FeatureClsIn = {
  /**
   * 弱化档(承接句用灰字,不与卖点抢眼)。
   */
  dim: boolean
}

/**
 * cardClsOf 的入参:价卡是不是主推档。
 */
export type CardClsIn = {
  /**
   * 主推档(90 天卡:琥珀描边 + 省 N% 徽标;主推靠版式不靠营销词)。
   */
  hot: boolean
}

/**
 * maskTextOf 的入参:打码几行。
 */
export type MaskTextOfIn = {
  /**
   * 打码几行(至多 MASK_LINES 的长度)。
   */
  lines: number
}

/**
 * ctaLabelOf 的入参:升级钮上写什么字。
 */
export type CtaLabelOfIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 调用方指定的文案;缺席 = 按形态取默认词。未登录 429 场景的出路是「登录 / 注册」
   * 不是「升级 Pro」—— 文案随场景变,行为还是同一个组件。
   */
  label?: string

  /**
   * 是不是文字链形态(两种形态的默认词不一样:文字链短、实心钮长一点)。
   */
  link: boolean
}

/**
 * lockMsgOf 的入参:锁行的灰注。
 */
export type LockMsgOfIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 调用方指定的灰注;缺席 = 默认的额度话术。
   */
  msg?: string
}

/**
 * ctaSlotClsOf 的入参:免费卡底那格占位是哪一种。
 */
export type CtaSlotClsIn = {
  /**
   * 是不是「当前方案」那一种(另一种是已 Pro 时的破折号占位)。
   */
  current: boolean
}

/**
 * perLabel30Of / perLabel90Of 的入参:计价口径那行小注。
 */
export type PerLabelIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 该档折算到每天的展示价。
   */
  perDay: string
}

/**
 * 升级钮的三态:什么都没开 / 开着升级弹框 / 开着注册弹框。
 */
export type UpgradeOpen = '' | 'up' | 'auth'

/**
 * upgradeOpenOf 的入参:点升级钮时的登录态。
 */
export type UpgradeOpenOfIn = {
  /**
   * 登录没登录(已登录开升级弹框,未登录开注册弹框)。
   */
  loggedIn: boolean
}

/**
 * makeUpgradeOpen 的入参:升级钮三态的落格与点它那一刻的登录态。
 */
export type UpgradeOpenIn = {
  /**
   * 三态的落格。
   */
  set: (v: UpgradeOpen) => void

  /**
   * 登录没登录。
   */
  loggedIn: boolean
}

/**
 * makeUpgradeSet 的入参:升级钮三态的落格与要拨成的值。
 */
export type UpgradeSetIn = {
  /**
   * 三态的落格。
   */
  set: (v: UpgradeOpen) => void

  /**
   * 拨成什么。
   */
  v: UpgradeOpen
}

/**
 * PricingCard(对照三卡 + CTA 三态)的 props。页面版与弹窗版共用同一份代码,不许 fork。
 */
export type PricingCardIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 登录没登录。
   */
  loggedIn: boolean

  /**
   * 是不是 Pro。
   */
  pro: boolean

  /**
   * 档位数四格。价卡本身不读它,是调用方一直在传的对外契约:定价页由服务端下发真值,
   * 弹窗版给构建期默认值(哪天分层数字改走 env,读的就是这一格而不是 import 来的常量)。
   */
  caps: PriceCaps

  /**
   * 未登录点付费时的出口:开注册弹框。
   */
  onRegister: ClickFn
}

/**
 * PricingFree(免费卡)的 props。
 */
export type PricingFreeIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 登录没登录。
   */
  loggedIn: boolean

  /**
   * 是不是 Pro。
   */
  pro: boolean

  /**
   * 未登录时的出口:开注册弹框。
   */
  onRegister: ClickFn
}

/**
 * PricingFreeCta(免费卡底部的 CTA 三态)的 props。
 */
export type PricingFreeCtaIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 登录没登录。
   */
  loggedIn: boolean

  /**
   * 是不是 Pro。
   */
  pro: boolean

  /**
   * 未登录时的出口:开注册弹框。
   */
  onRegister: ClickFn
}

/**
 * PricingPro90(90 天主推卡)的 props。
 */
export type PricingPro90In = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 是不是正在等 Checkout URL(购买钮禁用并压暗)。
   */
  busy: boolean

  /**
   * 点购买。
   */
  onBuy: BuyFn
}

/**
 * PricingPro30(30 天试水卡)的 props。
 */
export type PricingPro30In = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 是不是正在等 Checkout URL。
   */
  busy: boolean

  /**
   * 点购买。
   */
  onBuy: BuyFn
}

/**
 * PriceAmount(价格行:大字档价 + 灰字小注)的 props。
 */
export type PriceAmountIn = {
  /**
   * 大字那半:档价(免费卡放免费那两个字)。
   */
  amount: string

  /**
   * 灰字那半:计价口径与每天单价;空串 = 只出大字。
   */
  per: string
}

/**
 * PriceFeature(清单一行:对勾 + 一句话)的 props。
 */
export type PriceFeatureIn = {
  /**
   * 弱化档(承接句用灰字);可省 = 正常档。
   */
  dim?: boolean

  /**
   * 这一行说的事。
   */
  children: React.ReactNode
}

/**
 * PriceSell(Pro 卖点一行:一句结论 + 底下小字)的 props。
 * 标题不许只喊口号,小字是可核对的东西。
 */
export type PriceSellIn = {
  /**
   * 结论那一句。
   */
  head: string

  /**
   * 底下写清具体给什么的小字。
   */
  detail: string
}

/**
 * PricingModal(定价弹窗)的 props。
 */
export type PricingModalIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 登录没登录。
   */
  loggedIn: boolean

  /**
   * 是不是 Pro。
   */
  pro: boolean

  /**
   * 关闭回调。
   */
  onClose: ClickFn

  /**
   * 层级;可省 = 普通页面上那一层。叠在别的弹框之上时由调用方抬。
   */
  z?: number
}

/**
 * usePricingModal 交给视图的面板:注册弹框的开关态与三只手柄。
 */
export type PricingModalPanel = {
  /**
   * 注册弹框开着没有。
   */
  authOpen: boolean

  /**
   * 未登录点付费:开注册弹框。
   */
  onRegister: ClickFn

  /**
   * 关掉注册弹框。
   */
  onAuthClose: ClickFn

  /**
   * 注册完成:整页重载,让服务端重新认人。
   */
  onAuthDone: ClickFn
}

/**
 * usePricingBuy 的入参。
 */
export type PricingBuyHookIn = {
  /**
   * 登录没登录。
   */
  loggedIn: boolean

  /**
   * 未登录时的出口:开注册弹框。
   */
  onRegister: ClickFn
}

/**
 * useUpgradeModal 的入参。
 */
export type UpgradeModalHookIn = {
  /**
   * 取词函数(失败话术要它)。
   */
  t: TFn
}

/**
 * useUpgradeCta 的入参。
 */
export type UpgradeCtaHookIn = {
  /**
   * 登录没登录(决定点了开哪一层)。
   */
  loggedIn: boolean
}

/**
 * usePricingBuy 交给视图的面板:购买流的忙态与手柄。
 */
export type PricingBuyPanel = {
  /**
   * 是不是正在等 Checkout URL。
   */
  busy: boolean

  /**
   * 发起一档购买。
   */
  onBuy: BuyFn
}

/**
 * UpgradeModal(升级 Pro 专用弹框)的 props。
 */
export type UpgradeModalIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 关闭回调。
   */
  onClose: ClickFn

  /**
   * 为什么弹这一下(如收藏搜索是 Pro 功能);可省 = 不出这一行。
   */
  reason?: string
}

/**
 * useUpgradeModal 交给视图的面板:购买流两格状态、对比弹窗开关与三只手柄。
 */
export type UpgradeModalPanel = {
  /**
   * 是不是正在等 Checkout URL。
   */
  busy: boolean

  /**
   * 失败话术;空串 = 没有错。
   */
  err: string

  /**
   * 对比用的定价弹窗开着没有。
   */
  compare: boolean

  /**
   * 发起一档购买。
   */
  onBuy: BuyFn

  /**
   * 开对比弹窗(E8-02:站内不跳页)。
   */
  onCompareOpen: ClickFn

  /**
   * 关对比弹窗。
   */
  onCompareClose: ClickFn

  /**
   * 选中的档(默认 90 天)。
   */
  plan: PricePlan

  /**
   * 选某档(点卡)。
   */
  pickOf: (plan: PricePlan) => () => void

  /**
   * 「确认支付」:按选中档去 Checkout。
   */
  onPay: () => void
}

/**
 * UpgradeCta(统一升级钮)的 props。
 */
export type UpgradeCtaIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 登录没登录(已登录开升级弹框,未登录开注册弹框)。
   */
  loggedIn: boolean

  /**
   * 传给升级弹框的缘由;可省 = 弹框里不出这一行。
   */
  reason?: string

  /**
   * 钮文案;可省 = 按形态取默认词。
   */
  label?: string

  /**
   * 文字链形态(#160):打码占位旁的 CTA 不该再是实心钮 —— 一屏若干处打码,
   * 每处一枚棕钮就是又一堵墙;实心钮留给顶栏与弹窗,稀缺性就是它的说服力。
   * 两种形态行为完全一致。可省 = 实心钮。
   */
  link?: boolean
}

/**
 * useUpgradeCta 交给视图的面板:三态与两只手柄。
 */
export type UpgradeCtaPanel = {
  /**
   * 现在开着哪一层。
   */
  open: UpgradeOpen

  /**
   * 点钮:按登录态决定开升级弹框还是注册弹框。
   */
  onOpen: ClickFn

  /**
   * 关掉开着的那一层。
   */
  onClose: ClickFn
}

/**
 * LockedText(打码锁区)的 props。
 */
export type LockedTextIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 登录没登录(锁行的 CTA 靠它决定开哪一层)。
   */
  loggedIn: boolean

  /**
   * 打码几行;可省 = 三行。
   */
  lines?: number

  /**
   * 锁行的灰注;可省 = 默认的额度话术。
   */
  msg?: string

  /**
   * 锁行 CTA 的文案;可省 = 默认的升级词。
   */
  ctaLabel?: string
}

/**
 * LockFoot(锁行:锁 + 灰注 + 文字链 CTA)的 props。
 */
export type LockFootIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 登录没登录。
   */
  loggedIn: boolean

  /**
   * 灰注;可省 = 默认的额度话术。
   */
  msg?: string

  /**
   * CTA 文案;可省 = 默认的升级词。
   */
  ctaLabel?: string
}

/**
 * `per30Of` 的入参。
 */
export type Per30In = {
  /**
   * 90 天档展示价原文。
   */
  text: string
}

/**
 * 升级弹框套餐卡类名(`upCardClsOf`)的入参。
 */
export type UpCardClsIn = {
  /**
   * 选中。
   */
  on: boolean
}

/**
 * 选中档的价(`pickedPriceOf`)的入参。
 */
export type PickedPriceIn = {
  /**
   * 选中档。
   */
  plan: PricePlan

  /**
   * 两档价。
   */
  price: Price
}

/**
 * 选档手柄(`makePlanSelect`)的入参。
 */
export type PlanSelectIn = {
  /**
   * 这张卡的档。
   */
  plan: PricePlan

  /**
   * 落选中档。
   */
  set: (plan: PricePlan) => void
}
