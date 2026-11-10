/**
 * pricing 域(定价页与定价件)的死值:来路参数与白名单、埋点事件名、营销截图的两门地址与
 * 它的去处、正文轨版式档、注册弹框的初始态;2026-08-28 换装批第二波再收进价卡三件的散值
 * (展示价的 env 默认档与解析用正则、两档天数与档位标识、Checkout 的线格式、四层弹框层级、
 * 打码占位的四行假文本与三个全局类名)。两波都是搬家挂注释,值一个不改。
 *
 * @author Frank
 * @time 2026-08-28 12:45:00
 */

/**
 * 来路参数名(报告锁区 CTA 打到本页时带 `?from=rpt-<卡>`;打错就是静默失效 ——
 * 参数名读不到不会报错,只会让漏斗第 4 步全数记成直达)。
 */
export const P_FROM = 'from'

/**
 * 来路白名单(低基数,与 lib/funnel 的 PROP_OK 同口径):只认小写字母、数字与连字符,
 * 至多 24 字 —— 埋点维度的基数必须封死,不然任何人拼一串参数就能把面板刷爆。
 */
export const FROM_RE = /^[a-z0-9-]{1,24}$/

/**
 * 白名单没兜住(或压根没带来路)时记的档:直达。
 */
export const KIND_DIRECT = 'direct'

/**
 * 进定价页的埋点事件名(漏斗第 4 步)。
 */
export const EVENT_PRICING_OPEN = 'pricing-open'






/**
 * 正文轨的上内衬档(px;Shell 的档位之一,定价页首屏留白 40)。
 */
export const SHELL_TOP = 40

/**
 * 注册弹框的初始态(定价页的 CTA 是「注册」,直接开在注册那一面,不让人再点一次切换)。
 */
export const AUTH_MODE_REGISTER = 'register'

/**
 * 空串。判空基准与「这一格没有内容」的写法都用它(宪法禁 `!x`,空串一律 `=== TEXT_NONE`)。
 */
export const TEXT_NONE = ''

/**
 * 拼 className 时各类之间的分隔符。HTML 的 class 属性按空白切词,写错不会报错,
 * 只会让基座类与修饰类粘成一个匹配不上的长类名,那一块当场变成没样式的裸元素。
 * (account / employers / notice 各有一份同名同义的私有常量;跨域不互相取常量。)
 */
export const CLS_SEP = ' '

/**
 * 图标与它旁边那句话之间的半角空格。它是**文案里的分隔**,与拼 className 的那一个
 * 不是同一件事,所以各有各的名字(同名同义件在 legal 域)。
 */
export const ICON_GAP = ' '


/**
 * 钮上「档名」与「价格」之间、计价口径与每天单价之间的**全角**空格。
 * 中文界面里全角空格才拉得开两截短语,半角看着像没分开(同名同义件在 companies 域)。
 */
export const WIDE_GAP = '　'

/**
 * 「对比」文字钮尾巴上那个右箭头:它说的是「点了还有下文」(开定价弹窗),
 * 与钮本身的文案是两件事,所以单独一格。
 */
export const ARROW_NEXT = '→'

/**
 * 展示价(2026-09-04 Frank 拍板 5/13 两档,env 覆盖退役 —— Render 上老 env 会把展示价压回 19/39)。改价 = 换 Stripe Price
 * 与 env,零代码 —— 这两个数字只是「env 没配」时的最后一道保底,不是真价。
 * 2026-11-09 Frank「站内会员价格金额只写 $,不出现 CA$;货币单位只在一处说明一次」:前缀从 CA$ 改成 $,
 * 加元由付款钮下那一行(词条 price.cad)说明;价格和扣款币种不变。
 */
export const PRICE_DISPLAY_DEFAULT = '$5,$13'

/**
 * 展示价 env 里两档之间的分隔符(`"CA$19,CA$39"` 前 30 天档、后 90 天档)。
 */
export const PRICE_SEP = ','


/**
 * 从展示价里剥掉非数字的正则(`"CA$19"` → `"19"`),留小数点以支持 `CA$19.90` 这类。
 */
export const PRICE_DIGITS_RE = /[^\d.]/g

/**
 * 从展示价里剥掉数字与其后一切的正则(`"CA$19"` → `"CA$"`),拿的是货币前缀。
 */
export const PRICE_CURRENCY_RE = /[\d.,]+.*$/

/**
 * 每天单价保留几位小数(钱按分显示,`CA$0.63` 这种)。
 */
export const PRICE_DECIMALS = 2

/**
 * 百分数的满值(省 N% 的 N 由比值乘它得来)。
 */
export const PCT_FULL = 100

/**
 * 30 天时长包的档位标识(发给 `/api/stripe/checkout` 的 plan 值,也是埋点事件的属性值)。
 */
export const PLAN_30 = '30'

/**
 * 90 天时长包的档位标识(同上)。
 */
export const PLAN_90 = '90'

/**
 * 90 天档折成「每 30 天」的除数(卡上写「CA$4.33 / 30 天」,照猩际的算法让用户自己比)。
 */
export const PER_30_DIV = 3

/**
 * 默认选中的档(季付更划算,先选它)。
 */
export const PLAN_DEFAULT = '90'

/**
 * Pro 权益清单,每条 [标题词条, 说明词条](2026-10-07 Frank「这些功能要重新盘点,重新写一下」,按代码里真锁在 Pro 后面的重盘):
 * AI 写信(lib/apply 本批,免费试用 3 个职位)、简历对照全条 + 改写建议(lib/resume gateMatch)、每天盯梢邮件(lib/alerts,
 * 免费档只有周报)、通道报告付费行(lib/ruling TIER_OF.paid)、担保雇主 CSV 导出(lib/employers export,浏览免费)。
 * 定价卡与升级框同读这一份;加减一条只改这里与三语词条。
 * 2026-11-09 Frank「升级框的权益清单按 B 节重写,不再出现旧的几条」:旧五条(AI 写信不限次、简历对照、岗位盯梢、
 * 通道报告、导出名单)撤,换成额度规则的两条 —— 每 30 天 60 个按职位改写额度、重新生成每份文件每天 5 次。
 */
export const PRO_PERKS: [string, string][] = [
  ['price.perk.tailor', 'price.perk.tailor.d'],
  ['price.perk.regen', 'price.perk.regen.d'],
]

/**
 * 30 天档的天数(每天单价 = 档价 ÷ 它)。
 */
export const DAYS_30 = 30

/**
 * 90 天档的天数(同上;省 N% 也是拿两档的每天单价比出来的)。
 */
export const DAYS_90 = 90

/**
 * 发起时长包购买的接口(POST plan → 回 Checkout URL,E3-03)。
 * 路径打错是静默 404,所以它必须有名字。
 */
export const URL_CHECKOUT = '/api/stripe/checkout'

/**
 * 结账新标签页先开的空白页地址。2026-10-12 Frank「应该新 弹个 tab 出来」:点购买在点击的同步调用栈里
 * 先开一个空白标签占住(异步拿到 URL 再开会被浏览器当弹窗拦掉),拿到 Checkout URL 再给它换地址。
 */
export const URL_BLANK = 'about:blank'

/**
 * 结账新标签页的打开目标(新开一个标签)。
 */
export const TAB_BLANK = '_blank'

/**
 * Checkout 请求的方法。
 */
export const METHOD_POST = 'POST'

/**
 * Checkout 请求带 cookie(认人靠它,漏了就是未登录)。
 */
export const CRED_INCLUDE = 'include'

/**
 * 请求体类型的头名。
 */
export const HDR_CONTENT_TYPE = 'Content-Type'

/**
 * 请求体类型的值。
 */
export const MIME_JSON = 'application/json'

/**
 * 已 Pro 时的账户页入口(价卡底下那一行;续期与发票都在那儿)。
 */
export const URL_ACCOUNT = '/account'

/**
 * 点付费钮那一下的埋点事件名(E5-07 §3.4 漏斗第 4 步)。
 */
export const EVENT_PAY_CLICK = 'pay-click'

/**
 * 发起 Stripe Checkout 的埋点事件名(E7-02)。
 * 2026-09-26 /fe Frank:同名进第一方漏斗白名单(lib/funnel 的 ALIAS;只计数不成链)。
 */
export const EVENT_CHECKOUT = 'checkout'

/**
 * 升级弹框被看到的埋点事件名。访客 →(此事件)→ checkout → 付款之间原本缺
 * 「看到卖点」一环,零付费时无从定位断点。
 */
export const EVENT_UPGRADE_OPEN = 'upgrade-open'


/**
 * 注册弹框压在定价弹窗之上要加的层级差(定价弹窗里点「注册」会再开一层)。
 */
export const Z_AUTH_STEP = 10

/**
 * 升级弹框的层级(比页内遮罩高一档)。
 */
export const Z_UPGRADE = 60



/**
 * 升级弹框的宽档(两档钮 + 一行注脚,窄档够用)。
 */
export const MODAL_SIZE_SM = 'sm'

/**
 * 拿不到 Checkout URL 时那条提醒的色档。
 */
export const NOTICE_KIND_ERR = 'err'

/**
 * 素底钮的变体:长相全由本域的加倍类给(2026-08-26 Frank「`<button` 这种不允许直接使用」
 * 之后,自定义配色的钮一律经 Button 的 ghost 档 + 本域加倍类,样张 account 的 PLAIN_BTN_KIND)。
 */
export const PLAIN_BTN_KIND = 'ghost'

/**
 * 白卡分区的全局类名(main.css 第 9 段;定价页把升级框正文装在这张卡里,各域自抄)。
 */
export const CARD_MD_CLS = 'cardMd'

/**
 * 次要钮的变体(升级框里「不改写,直接投基础简历」)。
 */
export const BTN_SECONDARY = 'secondary'
