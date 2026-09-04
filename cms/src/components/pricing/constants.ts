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
 * 点营销截图的埋点事件名(B3 第一卖点那张图的点击量)。
 */
export const EVENT_SHOT_CLICK = 'pricing-se-img'

/**
 * 中文界面的语言码(营销截图分两门,按界面语言选)。
 */
export const LANG_ZH = 'zh'

/**
 * 中文版营销截图的地址(担保雇主名单的真图)。
 */
export const URL_SHOT_ZH = '/pricing-se-zh.webp'

/**
 * 英文版营销截图的地址(默认档 —— 英/韩界面都走它)。
 */
export const URL_SHOT_EN = '/pricing-se-en.webp'

/**
 * 营销截图的去处:把脉页橱窗(货架页 2026-08-08 下架后,第一卖点的落点改成这里)。
 */
export const URL_START = '/start'

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
 * aria-hidden 的真值。React 的 aria-* 收字符串,写 'true' 与渲染出的 HTML 一字不差。
 */
export const ARIA_TRUE = 'true'

/**
 * 图标与它旁边那句话之间的半角空格。它是**文案里的分隔**,与拼 className 的那一个
 * 不是同一件事,所以各有各的名字(同名同义件在 legal 域)。
 */
export const ICON_GAP = ' '

/**
 * 大字档价与它右边灰字小注之间的半角空格。
 */
export const PER_GAP = ' '

/**
 * 钮上「档名」与「价格」之间、计价口径与每天单价之间的**全角**空格。
 * 中文界面里全角空格才拉得开两截短语,半角看着像没分开(同名同义件在 companies 域)。
 */
export const WIDE_GAP = '　'

/**
 * 已是 Pro 时免费卡底那格占位写的破折号 —— 免费档对他已经没有动作可给,
 * 但格子不能塌(三张卡的钮要在同一条线上)。
 */
export const CTA_BLANK_MARK = '—'

/**
 * 「对比」文字钮尾巴上那个右箭头:它说的是「点了还有下文」(开定价弹窗),
 * 与钮本身的文案是两件事,所以单独一格。
 */
export const ARROW_NEXT = '→'

/**
 * 展示价(2026-09-04 Frank 拍板 5/13 两档,env 覆盖退役 —— Render 上老 env 会把展示价压回 19/39)。改价 = 换 Stripe Price
 * 与 env,零代码 —— 这两个数字只是「env 没配」时的最后一道保底,不是真价。
 */
export const PRICE_DISPLAY_DEFAULT = 'CA$5,CA$13'

/**
 * 展示价 env 里两档之间的分隔符(`"CA$19,CA$39"` 前 30 天档、后 90 天档)。
 */
export const PRICE_SEP = ','

/**
 * 90 天档的兜底展示价(env 只写了一档时用它;30 天档的兜底就是 env 原文本身)。
 */
export const PRICE_P90_DEFAULT = 'CA$39'

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
 * 升级弹框权益清单的 i18n 键(只写已经有的功能;模考 / AI 评分做出来再加)。
 */
export const UP_PERK_KEYS = ['up.perk.quota', 'up.perk.sync']

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
 */
export const EVENT_CHECKOUT = 'checkout'

/**
 * 升级弹框被看到的埋点事件名。访客 →(此事件)→ checkout → 付款之间原本缺
 * 「看到卖点」一环,零付费时无从定位断点。
 */
export const EVENT_UPGRADE_OPEN = 'upgrade-open'

/**
 * 定价弹窗的默认层级(普通页面上开一层)。
 */
export const Z_PRICING = 50

/**
 * 注册弹框压在定价弹窗之上要加的层级差(定价弹窗里点「注册」会再开一层)。
 */
export const Z_AUTH_STEP = 10

/**
 * 升级弹框的层级(比页内遮罩高一档)。
 */
export const Z_UPGRADE = 60

/**
 * 升级弹框里点「对比」再开的定价弹窗层级(要压住升级弹框自己)。
 */
export const Z_COMPARE = 70

/**
 * 定价弹窗的宽档(对照三卡是站内最宽的弹框内容)。
 */
export const MODAL_SIZE_LG = 'lg'

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
 * 白底描边钮的变体(免费卡未登录时的「免费注册」)。
 */
export const BTN_SECONDARY = 'secondary'

/**
 * 付费琥珀钮的变体(实心升级钮 ⭐)。
 */
export const BTN_PRO = 'pro'

/**
 * 升级钮什么都没开着的态。
 */
export const UPGRADE_CLOSED = ''

/**
 * 升级钮开着升级弹框的态(已登录点它走这条)。
 */
export const UPGRADE_BUY = 'up'

/**
 * 升级钮开着注册弹框的态(未登录点它走这条 —— 先有身份才谈付费)。
 */
export const UPGRADE_AUTH = 'auth'

/**
 * 打码占位的四行假文本(#160)。糊掉的是**假文本**,零成本:额度判定本就在调用之前,
 * 拦下就不生成(不预跑、不占那台 qwen、不排队),真内容只在放行时才生成,一次都不浪费。
 * 真值同理不下发 —— blur 是视觉效果不是访问控制,右键就能读,故服务端剥离 + 前端渲假值
 * (与 #130 / #152 同一套)。四行长短不一,是为了让打码块看着像一段真话。
 */
export const MASK_LINES = [
  '████████████████████████████████',
  '██████████████████████████',
  '███████████████████████████████████',
  '████████████████████',
]

/**
 * 打码几行的缺省档(三行 = 一段短答的体量)。
 */
export const MASK_LINES_DEFAULT = 3

/**
 * 打码块各行之间的换行符(整块渲成一个文本节点,靠 `.maskLines` 的 pre-line 断行)。
 */
export const MASK_SEP = '\n'

/**
 * 打码锁区外壳的全局类名。真身写在 main.css 第 12 段的全局层,不是 CSS Module 生成的
 * 哈希名,所以取不到 `css.lkText`,只能按这个固定字符串拼(改名要连 main.css 一起改)。
 */
export const LK_TEXT_CLS = 'lkText'

/**
 * 打码块本体的全局类名(模糊、不可选中、不吃鼠标;同上住在全局层)。
 */
export const LK_MASK_CLS = 'lkMask'

/**
 * 锁行(打码块脚注)的全局类名(同上住在全局层)。
 */
export const LK_FOOT_CLS = 'lkFoot'
