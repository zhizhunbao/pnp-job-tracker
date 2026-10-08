/**
 * pricing 域(定价页与定价件)的自足形状:各视图的 props 契约、状态机器交给视图的整块面板,
 * 以及每个函数的入参。档位数(免费额度两格;2026-09-28 顾问两格撤之前是四格)本域**自己声明**一份 —— 宪法 08-25
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
 * 2026-09-28 AI 顾问删(Frank「残留也删了吧」):顾问两格(advisor 免费试用、proAdvisor Pro 日上限)撤,剩免费档两格。
 */
export type PriceCaps = {
  /**
   * 免费用户的岗位文本解析总试用次数。
   */
  jobtext: number

  /**
   * 免费用户每天可匹配的岗位数。
   */
  match: number
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
   * 档位数两格。
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

  /**
   * 付完回哪儿(服务端按白名单收;空串 = 回账户页)。
   */
  back: string
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

  /**
   * 付完回哪儿;空串 = 回账户页。
   */
  back: string
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
 * cardClsOf 的入参:价卡是不是主推档。
 */
export type CardClsIn = {
  /**
   * 主推档(90 天卡:琥珀描边 + 省 N% 徽标;主推靠版式不靠营销词)。
   */
  hot: boolean
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
   * 档位数两格。价卡本身不读它,是调用方一直在传的对外契约:定价页由服务端下发真值,
   * 弹窗版给构建期默认值(哪天分层数字改走 env,读的就是这一格而不是 import 来的常量)。
   */
  caps: PriceCaps

  /**
   * 未登录点付费时的出口:开注册弹框。
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

  /**
   * 付完回哪儿;空串 = 回账户页。
   */
  back: string
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

  /**
   * 付完回哪儿(站内「我的」页某处,如投递区 `/account?sec=sjobs&job=…`;2026-10-07 批 C);可省 = 回账户页。
   */
  back?: string
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
