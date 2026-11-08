/**
 * me 桶子桶 settings 的形状:「账户设置」页(改登录邮箱、改密码;2026-11-07 Frank「先做 5 条必备」第 5 条)。
 *
 * @author Frank
 * @time 2026-11-07 23:55:00
 */

/**
 * 取词函数(本桶抄形)。
 */
export type TFn = (key: string, params?: Record<string, string | number>) => string

/**
 * 哪个面板开着(空串 = 都关着)。
 */
export type SettingsPanelKey = '' | 'pw' | 'email'

/**
 * 账户设置一页的整机(useSettings)。
 */
export type SettingsPanel = {
  /**
   * 哪个面板开着。
   */
  panel: SettingsPanelKey

  /**
   * 开「修改密码」。
   */
  openPw: () => void

  /**
   * 开「修改登录邮箱」。
   */
  openEmail: () => void

  /**
   * 关面板(清表单与报错)。
   */
  close: () => void

  /**
   * 当前密码。
   */
  cur: string

  /**
   * 改当前密码。
   */
  setCur: (v: string) => void

  /**
   * 新密码。
   */
  next: string

  /**
   * 改新密码。
   */
  setNext: (v: string) => void

  /**
   * 再输一次新密码。
   */
  again: string

  /**
   * 改再输一次。
   */
  setAgain: (v: string) => void

  /**
   * 新邮箱。
   */
  email: string

  /**
   * 改新邮箱。
   */
  setEmail: (v: string) => void

  /**
   * 正在提交。
   */
  busy: boolean

  /**
   * 报错一句(没有是空串)。
   */
  err: string

  /**
   * 提交「修改密码」。
   */
  submitPw: () => void

  /**
   * 提交「修改登录邮箱」。
   */
  submitEmail: () => void
}

/**
 * 整机的入参。
 */
export type SettingsHookIn = {
  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 页正文(SettingsBody)的 props。
 */
export type SettingsBodyIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前用户(登录邮箱、注册来路)。
   */
  me: SettingsMe

  /**
   * 整机。
   */
  s: SettingsPanel
}

/**
 * 面板(PwDrawer / EmailDrawer)的 props。
 */
export type SettingsDrawerIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 整机。
   */
  s: SettingsPanel
}

/**
 * 一行(SettingsRow)的 props。
 */
export type SettingsRowIn = {
  /**
   * 左边的名字(「登录邮箱」「密码」)。
   */
  label: string

  /**
   * 中间的值。
   */
  value: string

  /**
   * 右边的钮(Google 账号不给)。
   */
  act: React.ReactNode
}

/**
 * 一个表单格(SettingsField)的 props。
 */
export type SettingsFieldIn = {
  /**
   * 格名。
   */
  label: string

  /**
   * 格下灰字提示(没有是空串)。
   */
  hint: string

  /**
   * 输入框。
   */
  children: React.ReactNode
}

/**
 * 提交(postSettings)的入参。
 */
export type PostSettingsIn = {
  /**
   * 接口。
   */
  url: string

  /**
   * 请求体。
   */
  body: Record<string, string>
}

/**
 * 提交的结果:成功是空串,失败是结果码(网络断了是 net)。
 */
export type PostOut = Promise<string>

/**
 * 造提交手柄的入参。
 */
export type SubmitIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 当前密码。
   */
  cur: string

  /**
   * 新密码。
   */
  next: string

  /**
   * 再输一次。
   */
  again: string

  /**
   * 新邮箱。
   */
  email: string

  /**
   * 拨「正在提交」。
   */
  setBusy: (v: boolean) => void

  /**
   * 写报错。
   */
  setErr: (v: string) => void

  /**
   * 成功后关面板。
   */
  close: () => void
}

/**
 * 造开 / 关面板手柄的入参。
 */
export type PanelSetIn = {
  /**
   * 开哪个(关 = 空串)。
   */
  key: SettingsPanelKey

  /**
   * 拨面板。
   */
  setPanel: (v: SettingsPanelKey) => void

  /**
   * 清表单与报错。
   */
  reset: () => void
}

/**
 * 结果码 → 报错(errOf)的入参。
 */
export type ErrOfIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 结果码。
   */
  code: string
}

/**
 * 账户设置接口不过关时的回包(只读 error 一格)。
 */
export type PostRespJson = {
  /**
   * 结果码。
   */
  error?: string
}

/**
 * 当前用户里本桶读的两格(me 桶 MeUser 的本桶抄形)。
 */
export type SettingsMe = {
  /**
   * 登录邮箱。
   */
  email: string

  /**
   * 注册来路(email / google;老账号可能缺)。
   */
  loginProvider?: string | null
}

/**
 * 「密码」那一行的值(pwValueOf)的入参。
 */
export type PwValueIn = {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 是不是 Google 账号。
   */
  google: boolean
}

