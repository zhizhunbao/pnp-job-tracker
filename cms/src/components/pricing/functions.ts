/**
 * pricing 域(定价页与定价件)的函数:营销截图按语言选门、来路归档、四条埋点、开关手柄
 * 工厂与注册完成后的整页重载;2026-08-28 第二波再收进价卡三件的算与拼 —— 展示价解析与
 * 折算、Checkout 两条购买流、各处的类名预算、打码文本。零 JSX 零 hook —— 排版归各 tsx,
 * 状态归 hooks.ts,死值归 constants.ts,算出来的容器归 variables.ts。
 *
 * @author Frank
 * @time 2026-08-28 12:45:00
 */
import { cssOf } from '@/components/css'
import { FREE_JOBTEXT_TRIES, FREE_MATCH_JOBS_PER_DAY } from '@/lib/quota'
import { track } from '@/lib/track'
import {
  CLS_SEP, CRED_INCLUDE, DAYS_30, DAYS_90, EVENT_CHECKOUT, EVENT_PAY_CLICK, EVENT_PRICING_OPEN, EVENT_SHOT_CLICK,
  EVENT_UPGRADE_OPEN, FROM_RE, HDR_CONTENT_TYPE, KIND_DIRECT, LANG_ZH, METHOD_POST,
  MIME_JSON, PCT_FULL, PER_30_DIV, PLAN_30, PLAN_90, PRICE_CURRENCY_RE, PRICE_DECIMALS, PRICE_DIGITS_RE,
  PRICE_DISPLAY_DEFAULT, PRICE_SEP, P_FROM, TEXT_NONE, URL_CHECKOUT, URL_SHOT_EN,
  URL_SHOT_ZH, WIDE_GAP,
} from './constants'
import type {
  BuyClsIn, BuyFn, CardClsIn, CheckoutRespJson, CheckoutUrlOfIn, ClickFn,
  FlagSetIn, FromKindOfIn, Per30In, PerDayOfIn, PerLabelIn, PickedPriceIn, PlanPickIn,
  PlanSelectIn, Price, PriceAmountOfIn, PriceCaps, PriceCurrencyOfIn, PricePlan, PriceTexts, PricingBuyIn,
  PricingShotOfIn, SavePctOfIn, TrackCheckoutIn, TrackPayClickIn, UpBuyClsIn, UpCardClsIn, UpgradeBuyIn,
} from './types'
import css from './pricing.module.css'

/**
 * 第一卖点(price.pA「担保雇主名单」)配的真图走哪一门:中文界面出中文那张,
 * 英/韩界面出英文那张(蓝图 §2 的 B3;图里是界面截图,语言错了就读不懂)。
 *
 * @param x 界面语言。
 * @returns 该出的截图地址。
 */
export function pricingShotOf(x: PricingShotOfIn): string {
  if (x.lang === LANG_ZH) {
    return URL_SHOT_ZH
  }
  return URL_SHOT_EN
}

/**
 * 来路归档:白名单认得的原样记,认不得的与没带参数的一律记成直达。
 * 白名单存在的理由见 FROM_RE —— 埋点维度的基数必须封死。
 *
 * @param x 地址栏里读到的来路原文。
 * @returns 记进埋点的来路档。
 */
export function fromKindOf(x: FromKindOfIn): string {
  if (x.raw == null) {
    return KIND_DIRECT
  }
  if (FROM_RE.test(x.raw) === false) {
    return KIND_DIRECT
  }
  return x.raw
}

/**
 * 进定价页那一下的埋点(漏斗第 4 步)。2026-08-03 量数才发现:这一页**从来没有发过
 * `pricing-open`** —— 先前只有 PricingModal/UpgradeModal 在 mount 时发,而站内唯一直链
 * /pricing 的入口正是报告锁区那个 CTA。于是「报告 → 定价」这条**主转化边整条不计数**,
 * 面板上第 4 步恒为 0:那个 0 是量不到,不是没人点。跟 08-02 抓到的「jd-open 从来没有
 * 调用点」是同一类洞,往下挪了一格。带上来路 → 面板能分开看「从报告来的」与「从别处来的」,
 * M3 分叉才有得分。
 */
export function trackPricingOpen(): void {
  const raw = new URLSearchParams(window.location.search).get(P_FROM)
  track(EVENT_PRICING_OPEN, { kind: fromKindOf({ raw }) })
}

/**
 * 点营销截图那一下的埋点。只记一笔,不拦导航 —— 点完照常走链接去把脉页橱窗。
 */
export function trackShotClick(): void {
  track(EVENT_SHOT_CLICK)
}

/**
 * 造一枚「把一格布尔拨成定值」的小手柄:注册弹框的开与关、对比弹窗的开与关都是它 ——
 * 每个开关各造一个工厂只会得到几份同文。2026-08-28 第二波把原先只管注册弹框的
 * makeAuthToggle 就地泛化成它(同名同义件在 account 域)。
 *
 * @param x 拨哪格、拨成什么。
 * @returns 点一下拨过去的手柄。
 */
export function makeFlagSet(x: FlagSetIn): ClickFn {
  return function setFlag(): void {
    x.set(x.v)
  }
}

/**
 * 注册完成后整页重载:登录态与 Pro 态都由服务端在页面门里认人下发,
 * 只改客户端的开关态会让这一页继续显示未登录的 CTA。
 */
export function reloadPage(): void {
  window.location.reload()
}

/**
 * 把 env 里那行展示价算成一份成品:两档原文、两档每天单价、省 N% 的 N。
 * 只在模块装载时跑一次(结果挂 variables 的 PRICE),因为 env 是构建期内联的死值。
 *
 * @returns 价格锚点的一份展示事实。
 */
export function priceOf(): Price {
  const texts = priceTextsOf()
  return {
    p30: texts.p30,
    p90: texts.p90,
    perDay30: perDayOf({ text: texts.p30, days: DAYS_30 }),
    perDay90: perDayOf({ text: texts.p90, days: DAYS_90 }),
    savePct: savePctOf({ p30: texts.p30, p90: texts.p90 }),
    per30Of90: per30Of({ text: texts.p90 }),
  }
}

/**
 * 90 天档折成每 30 天多少钱(`CA$13` → `CA$4.33`)。
 *
 * @param x 90 天档展示价原文。
 * @returns 每 30 天的价。
 */
export function per30Of(x: Per30In): string {
  const each = priceAmountOf({ text: x.text }) / PER_30_DIV
  return `${priceCurrencyOf({ text: x.text })}${each.toFixed(PRICE_DECIMALS)}`
}

/**
 * 两档展示价(逗号前 30 天档、逗号后 90 天档;单一来源 PRICE_DISPLAY_DEFAULT,2026-09-04 env 覆盖退役)。
 *
 * @returns 两档的展示价原文(已去掉两头空白)。
 */
export function priceTextsOf(): PriceTexts {
  const line = PRICE_DISPLAY_DEFAULT
  const cut = line.indexOf(PRICE_SEP)
  if (cut < 0) {
    return { p30: line.trim(), p90: line.trim() }
  }
  return { p30: line.slice(0, cut).trim(), p90: line.slice(cut + PRICE_SEP.length).trim() }
}

/**
 * 把一档的展示价折算成每天单价,货币前缀照抄原文(`CA$39` / 90 天 → `CA$0.43`)。
 *
 * @param x 该档的展示价原文与它管多少天。
 * @returns 每天单价的展示串。
 */
export function perDayOf(x: PerDayOfIn): string {
  const each = priceAmountOf({ text: x.text }) / x.days
  return `${priceCurrencyOf({ text: x.text })}${each.toFixed(PRICE_DECIMALS)}`
}

/**
 * 买 90 天比买 30 天每天省百分之几(徽标上的 N)。30 天档价读不出数时记 0 ——
 * 除数为零算出来的百分比是假事实,宁可不显示这个卖点。
 *
 * @param x 两档的展示价原文。
 * @returns 省下的百分数(已取整)。
 */
export function savePctOf(x: SavePctOfIn): number {
  const a30 = priceAmountOf({ text: x.p30 })
  if (a30 <= 0) {
    return 0
  }
  const a90 = priceAmountOf({ text: x.p90 })
  return Math.round((1 - a90 / DAYS_90 / (a30 / DAYS_30)) * PCT_FULL)
}

/**
 * 从展示价原文里读出数目(`CA$19` → 19)。读不出数记 0,交给调用方决定这一格怎么显示。
 *
 * @param x 展示价原文。
 * @returns 数目。
 */
export function priceAmountOf(x: PriceAmountOfIn): number {
  const n = parseFloat(x.text.replace(PRICE_DIGITS_RE, TEXT_NONE))
  if (Number.isNaN(n)) {
    return 0
  }
  return n
}

/**
 * 从展示价原文里读出货币前缀(`CA$19` → `CA$`)。折算出来的每天单价要跟档价同一个币种,
 * 所以前缀照抄原文,不在代码里写死。
 *
 * @param x 展示价原文。
 * @returns 货币前缀。
 */
export function priceCurrencyOf(x: PriceCurrencyOfIn): string {
  return x.text.replace(PRICE_CURRENCY_RE, TEXT_NONE)
}

/**
 * 弹窗版价卡的档位数:客户端直接 import lib/quota 拿到的是**构建期**的默认值。
 * 页面版由服务端读 env 算好随 props 下发,弹窗版没有服务端这一手,只能用默认值 ——
 * 哪天真用 env 改分层数字,这几个常量要么 NEXT_PUBLIC 化,要么改由调用方传进来。
 *
 * 2026-09-28 AI 顾问删(Frank「残留也删了吧」):顾问两格(免费试用、Pro 日上限)随之撤,剩免费档两格。
 *
 * @returns 免费档的档位数两格。
 */
export function clientCapsOf(): PriceCaps {
  return {
    jobtext: FREE_JOBTEXT_TRIES,
    match: FREE_MATCH_JOBS_PER_DAY,
  }
}

/**
 * 造价卡上那条购买流:埋点 → 认人 → 发 Checkout → 跳转。
 * E5-07 §3.4 漏斗第 4 步:pay-click 必须在登录判断**之前**发 —— 未登录点了也是付费意向,
 * 放到后面等于把「点了但没注册」这段整个漏掉(checkout 只在已登录时发,两个事件不重复)。
 * 未登录就此打住,先开注册弹框;已登录才进忙态发请求,拿到 url 就跳,拿不到就退出忙态。
 *
 * @param x 登录态、注册出口与忙态落格。
 * @returns 发起一档购买的手柄。
 */
export function makePricingBuy(x: PricingBuyIn): BuyFn {
  return async function buy(plan: PricePlan): Promise<void> {
    trackPayClick({ plan, loggedIn: x.loggedIn })
    if (x.loggedIn === false) {
      x.onRegister()
      return
    }
    x.setBusy(true)
    trackCheckout({ plan })
    const url = await checkoutUrlOf({ plan, back: TEXT_NONE })
    if (url === TEXT_NONE) {
      x.setBusy(false)
      return
    }
    window.location.href = url
  }
}

/**
 * 造升级弹框里那条购买流。本弹框只出现在**已登录**上下文(未登录的升级入口先走注册框),
 * 所以这里不再判登录,拿不到 Checkout URL 就出话术 —— 不静默降级。
 *
 * @param x 取词函数与忙态、话术两格落格。
 * @returns 发起一档购买的手柄。
 */
export function makeUpgradeBuy(x: UpgradeBuyIn): BuyFn {
  return async function buy(plan: PricePlan): Promise<void> {
    x.setBusy(true)
    x.setErr(TEXT_NONE)
    trackCheckout({ plan })
    const url = await checkoutUrlOf({ plan, back: x.back })
    if (url === TEXT_NONE) {
      x.setErr(x.t('acct.err.generic'))
      x.setBusy(false)
      return
    }
    window.location.href = url
  }
}

/**
 * 问 Stripe 要一档的 Checkout 跳转地址。响应体按 CheckoutRespJson 收形,
 * 请求挂了、`r.ok` 假、url 缺席或空串一律回空串 = 发起失败,由调用方决定怎么交代。
 *
 * @param x 买哪一档。
 * @returns Checkout 跳转地址;空串 = 发起失败。
 */
export async function checkoutUrlOf(x: CheckoutUrlOfIn): Promise<string> {
  try {
    const r = await fetch(URL_CHECKOUT, {
      method: METHOD_POST,
      credentials: CRED_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ plan: x.plan, back: x.back }),
    })
    const d = await r.json() as CheckoutRespJson
    if (r.ok === false || d.url == null) {
      return TEXT_NONE
    }
    return d.url
  } catch {
    return TEXT_NONE
  }
}

/**
 * 点付费钮那一下的埋点(E5-07 §3.4 漏斗第 4 步)。走统一入口 lib/track:
 * umami + 第一方漏斗(M2)一次发两处。
 *
 * @param x 点的是哪一档、点的时候登录没登录。
 */
export function trackPayClick(x: TrackPayClickIn): void {
  track(EVENT_PAY_CLICK, { plan: x.plan, loggedIn: String(x.loggedIn) })
}

/**
 * 发起 Stripe Checkout 那一下的埋点(E7-02)。统计对象由环境注入,按 UmamiWindow
 * 收形:没有就不发,发挂了也不挡购买 —— 这一步不许因为埋点失败而拦住付款。
 * 2026-09-26 /fe Frank:改走统一上报门 lib/track(umami + 第一方漏斗,档位记成第一方的低基数分组)——
 * 原先只直调 umami,被拦截器挡掉就没了。「不许拦住付款」那条红线照旧:门里两条腿各自吞错,
 * 第一方走 sendBeacon,紧接着整页跳 Stripe 也送得出去;UmamiWindow 形状随之退役。
 *
 * @param x 发起的是哪一档。
 */
export function trackCheckout(x: TrackCheckoutIn): void {
  track(EVENT_CHECKOUT, { plan: x.plan })
}

/**
 * 定价弹窗被看到那一下的埋点。与 upgrade-open 同理记「定价被看到」;
 * /pricing 直链页不走这里(那一页的 pageview 已经覆盖,另有带来路的 trackPricingOpen)。
 */
export function trackPricingModalOpen(): void {
  track(EVENT_PRICING_OPEN)
}

/**
 * 升级弹框被看到那一下的埋点。漏斗补洞:访客 →(此事件)→ checkout → 付款之间
 * 原本缺「看到卖点」一环,零付费时无从定位断点。
 */
export function trackUpgradeOpen(): void {
  track(EVENT_UPGRADE_OPEN)
}

/**
 * 造一枚购买钮的点击手柄:点了就按它代表的档发起购买。
 *
 * @param x 这一枚买哪一档、点了往哪报。
 * @returns 挂到钮上的手柄。
 */
export function makePlanPick(x: PlanPickIn): ClickFn {
  return function pickPlan(): void {
    x.onBuy(x.plan)
  }
}

/**
 * 30 天档价格行的灰字小注:计价口径 + 每天单价。
 *
 * @param x 取词函数与该档的每天单价。
 * @returns 小注。
 */
export function perLabel30Of(x: PerLabelIn): string {
  return `${x.t('price.per30')}${WIDE_GAP}${x.t('price.perDay', { v: x.perDay })}`
}

/**
 * 90 天档价格行的灰字小注:计价口径 + 每天单价。
 *
 * @param x 取词函数与该档的每天单价。
 * @returns 小注。
 */
export function perLabel90Of(x: PerLabelIn): string {
  return `${x.t('price.per90')}${WIDE_GAP}${x.t('price.perDay', { v: x.perDay })}`
}

/**
 * 价卡购买钮的类名预算:基座 + 档位配色(查表,键完整性由 Record<PricePlan, string> 管着)
 * + 忙态压暗。钮经 Button 的 ghost 档渲染,所以这几个类在 css 里都写两遍抬权重。
 *
 * @param x 档位与忙态。
 * @returns 拼好的 className。
 */
export function buyClsOf(x: BuyClsIn): string {
  const planCls: Record<PricePlan, string> = {
    [PLAN_30]: cssOf(css.buy30),
    [PLAN_90]: cssOf(css.buy90),
  }
  const cls = [cssOf(css.buy), planCls[x.plan]]
  if (x.busy) {
    cls.push(cssOf(css.busy))
  }
  return cls.join(CLS_SEP)
}

/**
 * 升级弹框购买钮的类名预算(同上一条,只是这两枚钮并排等分、比价卡上的钮高一档)。
 *
 * @param x 档位与忙态。
 * @returns 拼好的 className。
 */
export function upCardClsOf(x: UpCardClsIn): string {
  const cls = [cssOf(css.upCard)]
  if (x.on) {
    cls.push(cssOf(css.upCardOn))
  }
  return cls.join(CLS_SEP)
}

/**
 * 「确认支付 CA$x」里选中档的价。
 *
 * @param x 选中档与两档价。
 * @returns 展示价。
 */
export function pickedPriceOf(x: PickedPriceIn): string {
  if (x.plan === PLAN_90) {
    return x.price.p90
  }
  return x.price.p30
}

/**
 * 造选档手柄(点卡只选中,不直接跳支付)。
 *
 * @param x 档与落格。
 * @returns 手柄。
 */
export function makePlanSelect(x: PlanSelectIn): ClickFn {
  return function select(): void {
    x.set(x.plan)
  }
}

export function upBuyClsOf(x: UpBuyClsIn): string {
  const planCls: Record<PricePlan, string> = {
    [PLAN_30]: cssOf(css.upBuy30),
    [PLAN_90]: cssOf(css.upBuy90),
  }
  const cls = [cssOf(css.upBuy), planCls[x.plan]]
  if (x.busy) {
    cls.push(cssOf(css.busy))
  }
  return cls.join(CLS_SEP)
}

/**
 * 价卡外壳的类名预算:主推档多一道琥珀描边。
 *
 * @param x 是不是主推档。
 * @returns 拼好的 className。
 */
export function cardClsOf(x: CardClsIn): string {
  if (x.hot) {
    return [cssOf(css.card), cssOf(css.cardHot)].join(CLS_SEP)
  }
  return cssOf(css.card)
}
