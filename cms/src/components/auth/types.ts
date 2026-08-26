/**
 * auth 域的形状:登录/注册/找回/重置四态机、账户菜单、头像、首帧会话的 props 契约
 * 与提交流的进出口。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值 —— 本域当初手抄成单参,
 * 2026-08-24 到期日文案带 {d} 插值时撞出来,按真形补齐)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * 表单四态:登录 / 注册 / 找回密码(输邮箱)/ 重置密码(邮件链接落地设新密码 ——
 * 「改密码」走的就是这条链)。
 */
export type AuthMode = 'login' | 'register' | 'forgot' | 'reset'

/**
 * 入口可指定的初始态(forgot 只能从登录态点进去,不做入口)。
 */
export type AuthInitMode = 'login' | 'register' | 'reset'

/**
 * 密码强度档:0 太短(不可提交)/ 1 弱 / 2 中 / 3 强。
 */
export type PwLevel = 0 | 1 | 2 | 3

/**
 * AuthForm 的 props。
 */
export type AuthFormIn = {
  /**
   * 界面语翻译函数。
   */
  t: TFn

  /**
   * 认证完成回调(邮箱路径原地刷新;有问卷缺口时先跳问卷,不走它)。
   */
  onDone: () => void

  /**
   * 初始态(可省 = login)。
   */
  initialMode?: AuthInitMode

  /**
   * 重置密码的邮件 token(reset 态用)。
   */
  resetToken?: string

  /**
   * 认证后回跳的站内路径(E9-04b:Google 整页 OAuth 用;可省 = 当前页)。
   */
  returnTo?: string

  /**
   * 调用方语境标题(dd24-#109:投递闸 =「注册后帮你预填投递邮件」);
   * 只换 register 态大标题,登录态照旧。
   */
  hero?: string
}

/**
 * AuthModal 的 props(AuthForm 套 Modal sm 壳)。
 */
export type AuthModalIn = {
  /**
   * 界面语翻译函数。
   */
  t: TFn

  /**
   * 关闭回调。
   */
  onClose: () => void

  /**
   * 认证完成回调。
   */
  onDone: () => void

  /**
   * 初始态(入口决定:注册 CTA 直达注册;可省 = login)。
   */
  mode?: AuthInitMode

  /**
   * 重置密码的邮件 token。
   */
  resetToken?: string

  /**
   * 弹框层级(叠加场景传)。
   */
  z?: number

  /**
   * 认证后回跳的站内路径。
   */
  returnTo?: string

  /**
   * 调用方语境标题。
   */
  hero?: string
}

/**
 * runAuthFlow 的入参:一次提交所需的全部现场。
 */
export type AuthFlowIn = {
  /**
   * 当前态。
   */
  mode: AuthMode

  /**
   * 邮箱。
   */
  email: string

  /**
   * 密码。
   */
  pw: string

  /**
   * 重置 token;null = 没有。
   */
  resetToken: string | null

  /**
   * 注册时随档存下的界面语言(邮件按本人语言发)。
   */
  locale: string
}

/**
 * runAuthFlow 的出参:三种收场之一。
 */
export type AuthFlowOut = {
  /**
   * sent = 找回邮件已(声称)发出;done = 已登录成功;err = 报错。
   */
  kind: 'sent' | 'done' | 'err'

  /**
   * kind=err 时的 i18n 键;其余 null。
   */
  errKey: string | null
}

/**
 * finishAuth 的入参。
 */
export type FinishAuthIn = {
  /**
   * 回跳路径;null = 当前页。
   */
  returnTo: string | null

  /**
   * 无问卷缺口时的完成回调。
   */
  onDone: () => void
}

/**
 * registerErrKeyOf 的入参。
 */
export type RegisterErrIn = {
  /**
   * HTTP 状态码。
   */
  status: number

  /**
   * 响应体串(JSON 字符串化,匹配字段级错误用)。
   */
  body: string
}

/**
 * umami 打点脚本挂在 window 上的形状(站外脚本注入,只认这一格)。
 */
export type UmamiHost = {
  /**
   * 打点对象;脚本没加载到就没有。
   */
  umami?: {
    /**
     * 发一个事件。
     */
    track: (name: string) => void
  }
}

/**
 * useClickOutside 的入参。
 */
export type ClickOutsideIn = {
  /**
   * 弹层根节点 ref。
   */
  ref: React.RefObject<HTMLElement | null>

  /**
   * 当前开合(关着不挂监听)。
   */
  open: boolean

  /**
   * 关闭回调。
   */
  close: () => void
}

/**
 * quizDestinationOf 的入参。
 */
export type QuizDestIn = {
  /**
   * 调用方指定的回跳路径;null = 当前页。
   */
  returnTo: string | null
}

/**
 * BrandHead 无 props(品牌头是死内容),占位形状省略。
 * GoogleButton 的 props。
 */
export type GoogleButtonIn = {
  /**
   * 界面语翻译函数。
   */
  t: TFn

  /**
   * 点击(整页 OAuth 跳转由调用方拼 returnTo)。
   */
  go: (e: React.MouseEvent) => void
}

/**
 * AuthHero(表单头部区)的 props。
 */
export type AuthHeroIn = {
  /**
   * 界面语翻译函数。
   */
  t: TFn

  /**
   * 当前态(只会是 login/register,调用方判过)。
   */
  mode: AuthMode

  /**
   * 调用方语境标题;null = 用默认文案。
   */
  hero: string | null

  /**
   * Google 钮点击。
   */
  go: (e: React.MouseEvent) => void
}

/**
 * AuthFields(表单体)的 props。
 */
export type AuthFieldsIn = {
  /**
   * 界面语翻译函数。
   */
  t: TFn

  /**
   * 当前态(定字段显隐与提交钮文案)。
   */
  mode: AuthMode

  /**
   * 邮箱值。
   */
  email: string

  /**
   * 密码值。
   */
  pw: string

  /**
   * 提交中(禁钮)。
   */
  busy: boolean

  /**
   * 报错文案;空串 = 无错。
   */
  err: string

  /**
   * 邮箱输入回调。
   */
  onEmail: (e: React.ChangeEvent<HTMLInputElement>) => void

  /**
   * 密码输入回调。
   */
  onPw: (e: React.ChangeEvent<HTMLInputElement>) => void

  /**
   * 表单提交回调。
   */
  onSubmit: (e: React.FormEvent) => void
}

/**
 * PwMeter(密码强度条)的 props。
 */
export type PwMeterIn = {
  /**
   * 界面语翻译函数。
   */
  t: TFn

  /**
   * 当前密码(空串不渲染,调用方已判)。
   */
  pw: string
}

/**
 * AuthFooter(表单页脚的态切换钮)的 props。
 */
export type AuthFooterIn = {
  /**
   * 界面语翻译函数。
   */
  t: TFn

  /**
   * 当前态。
   */
  mode: AuthMode

  /**
   * 找回邮件是否已发(sent 后 forgot 态不渲返回钮 —— 成功页自带)。
   */
  sent: boolean

  /**
   * 切换到指定态(顺带清报错)。
   */
  onMode: (m: AuthMode) => void
}

/**
 * useAuthForm(四态机)的入参。
 */
export type AuthFormHookIn = {
  /**
   * 界面语翻译函数(报错文案在机器里翻好)。
   */
  t: TFn

  /**
   * 认证完成回调。
   */
  onDone: () => void

  /**
   * 初始态。
   */
  init: AuthMode

  /**
   * 重置 token;null = 没有。
   */
  resetToken: string | null

  /**
   * 回跳路径;null = 当前页。
   */
  returnTo: string | null
}

/**
 * useAuthForm 交回的机器面板。
 */
export type AuthFormHookOut = {
  /**
   * 当前态。
   */
  mode: AuthMode

  /**
   * 邮箱值。
   */
  email: string

  /**
   * 密码值。
   */
  pw: string

  /**
   * 提交中。
   */
  busy: boolean

  /**
   * 报错文案(已翻译);空串 = 无错。
   */
  err: string

  /**
   * 找回邮件已(声称)发出。
   */
  sent: boolean

  /**
   * 切态(顺带清报错)。
   */
  switchMode: (m: AuthMode) => void

  /**
   * 从找回成功页返回登录(顺带清 sent)。
   */
  backFromSent: () => void

  /**
   * 邮箱输入。
   */
  onEmail: (e: React.ChangeEvent<HTMLInputElement>) => void

  /**
   * 密码输入。
   */
  onPw: (e: React.ChangeEvent<HTMLInputElement>) => void

  /**
   * Google 整页跳转。
   */
  goGoogle: (e: React.MouseEvent) => void

  /**
   * 表单提交。
   */
  submit: (e: React.FormEvent) => void
}

/**
 * SessionProvider 的 props。
 */
export type SessionProviderIn = {
  /**
   * 服务端算好的首帧登录态(layout 的 ssrHasSession() 下来)。
   */
  initial: boolean

  /**
   * 子树。
   */
  children: React.ReactNode
}

/**
 * Avatar 的 props。
 */
export type AvatarIn = {
  /**
   * OAuth 带回的头像 URL;无则走首字母色块。
   */
  src?: string | null

  /**
   * 昵称(取首字母与稳定色的第一优先)。
   */
  name?: string | null

  /**
   * 邮箱(昵称缺席时的兜底)。
   */
  email?: string | null

  /**
   * 直径像素(可省 = 36;菜单钮用 28)。
   */
  size?: number
}

/**
 * AccountMenuPop(下拉弹层)的 props。
 */
export type AccountMenuPopIn = {
  /**
   * 界面语翻译函数。
   */
  t: TFn

  /**
   * 邮箱;未知给 null。
   */
  email: string | null

  /**
   * 展示名(已按「昵称→邮箱前缀→—」算好)。
   */
  shortName: string

  /**
   * 是否 Pro。
   */
  isPro: boolean

  /**
   * Pro 到期日(YYYY-MM-DD);'' = 免费号或未知。
   */
  proUntil: string

  /**
   * 「升级 Pro」点击;null = 不显这一条。
   */
  onUpgrade: (() => void) | null
}

/**
 * AccountMenu 的 props。
 */
export type AccountMenuIn = {
  /**
   * 界面语翻译函数。
   */
  t: TFn

  /**
   * 邮箱;未知给 null。
   */
  email: string | null

  /**
   * 昵称;未设给 null。
   */
  displayName: string | null

  /**
   * 头像 URL;无给 null。
   */
  avatar: string | null

  /**
   * 是否 Pro。
   */
  isPro: boolean

  /**
   * Pro 到期日(YYYY-MM-DD),免费号不传。
   */
  proUntil?: string

  /**
   * 「升级 Pro」点击:调用方开自己的定价框。不传 = 不显这一条。
   */
  onPricing?: () => void
}

/**
 * 无参无返的钮点击手柄形状(账户菜单的开合与表单页脚的态切换钮都是这一形)。
 */
export type AuthActionFn = () => void

/**
 * makeAccountMenuHandles 的入参(2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」,
 * 原 AccountMenu 体内的 closeMenu/toggleMenu/clickUpgrade 迁出,闭包的开合态与
 * 升级回调改走这几格显式入参)。
 */
export type AccountMenuHandlesIn = {
  /**
   * 下拉此刻开着没有(翻面手柄按它决定去哪一头)。
   */
  open: boolean

  /**
   * 写开合的 setter。
   */
  setOpen: (v: boolean) => void

  /**
   * 「升级 Pro」点击;null = 调用方没给,手柄只收下拉不再往下传。
   */
  onPricing: AuthActionFn | null
}

/**
 * makeAccountMenuHandles 交回的三枚手柄(同一台开合状态机,一个工厂发齐)。
 */
export type AccountMenuHandlesOut = {
  /**
   * 关下拉(点外面与 Esc 两条关法共用同一枚)。
   */
  closeMenu: AuthActionFn

  /**
   * 头像钮:开合翻面。
   */
  toggleMenu: AuthActionFn

  /**
   * 「升级 Pro」:先收下拉,再交给调用方开自己的定价框。
   */
  clickUpgrade: AuthActionFn
}

/**
 * makeAuthFooterHandles 的入参(2026-08-26 同批:原 AuthFooter 体内的
 * toLogin/toggle/toForgot 迁出,闭包的当前态与切态回调改走显式入参)。
 */
export type AuthFooterHandlesIn = {
  /**
   * 当前态(登录↔注册的对切钮按它决定去哪一头)。
   */
  mode: AuthMode

  /**
   * 切换到指定态(顺带清报错,由调用方的机器负责)。
   */
  onMode: (m: AuthMode) => void
}

/**
 * makeAuthFooterHandles 交回的三枚手柄(同一台四态机,一个工厂发齐)。
 */
export type AuthFooterHandlesOut = {
  /**
   * 回登录态(重置态与找回未发态的返回钮)。
   */
  toLogin: AuthActionFn

  /**
   * 登录↔注册对切。
   */
  toggle: AuthActionFn

  /**
   * 去找回密码态。
   */
  toForgot: AuthActionFn
}
