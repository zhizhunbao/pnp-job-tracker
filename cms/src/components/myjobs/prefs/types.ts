/**
 * myjobs 子桶 prefs 的形状(2026-10-10 批 2「新岗推送」卡:拉 / 存「把推荐和收藏动态发到邮箱」的频率与收件邮箱)。
 * 父桶 functions.ts 逼近 1000 行闸,按关注点切出这一族(照 apply/letter 子桶首例);依赖只许父桶 → 子桶(经本目录 index.ts),
 * 子桶不取父桶任何东西,要用的常量各自抄、形状本桶自声明。卡本身(push.tsx)仍住父桶(拼父桶的分区卡与样式)。
 *
 * @author Frank
 * @time 2026-10-10 20:00:00
 */

/**
 * 拉推送设置(makeLoadPush)的入参。
 */
export type LoadPushIn = {
  /**
   * 写频率。
   */
  setFreq: (v: string) => void

  /**
   * 写邮箱。
   */
  setEmail: (v: string) => void

  /**
   * 拨「拉回来了」。
   */
  setReady: (v: boolean) => void

  /**
   * 拨「拉失败了」。
   */
  setFailed: (v: boolean) => void
}

/**
 * 存推送设置(makeSavePush)的入参。
 */
export type SavePushIn = {
  /**
   * 频率(空串 = 不发)。
   */
  freq: string

  /**
   * 邮箱框里的字。
   */
  email: string

  /**
   * 取词函数。
   */
  t: TFn

  /**
   * 写那一句。
   */
  setNote: (v: string) => void

  /**
   * 拨「正在存」。
   */
  setBusy: (v: boolean) => void
}

/**
 * 存设置回包 → 那一句(pushNoteOf)的入参。
 */
export type PushNoteIn = {
  /**
   * 回包。
   */
  d: PushSaveJson

  /**
   * HTTP 成没成。
   */
  ok: boolean

  /**
   * 填的邮箱。
   */
  email: string

  /**
   * 取词函数。
   */
  t: TFn
}

/**
 * 推送设置(线格式)。
 */
export type PushPrefsJson = {
  /**
   * 频率:off / daily / weekly。
   */
  freq?: string

  /**
   * 实际收件邮箱。
   */
  email?: string

  /**
   * 待确认的新邮箱。
   */
  pending?: string
}

/**
 * 存推送设置的回包。
 */
export type PushSaveJson = {
  /**
   * saved / pending / mail。
   */
  result?: string

  /**
   * 错误码(body / email / auth)。
   */
  error?: string
}

/**
 * 推送频率下拉的选项字(pushFreqLabelOf 造的函数形)。
 */
export type FreqLabelFn = (v: string) => string

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形;形状本桶自己声明)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string
