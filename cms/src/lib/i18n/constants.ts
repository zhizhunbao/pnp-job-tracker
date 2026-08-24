/**
 * i18n 域的死值:偏好键与语言切换器档位表。
 *
 * @author Frank
 * @time 2026-08-24 03:30:00
 */

/**
 * localStorage 的语言偏好键(老用户的既有偏好来源,cookie 被清时兜底)。
 */
export const LANG_KEY = 'jobs.lang'

/**
 * 语言偏好 cookie 名。语言也走 cookie(2026-08-03 Frank「英韩版刷新为什么先闪中文」):
 * 原来只存 localStorage —— 服务端读不到,于是 SSR 一律渲中文,浏览器先画中文那一帧,
 * 等水合后才换语言。cookie 服务端读得到 → 首帧就是对的(同列偏好 COLS_COOKIE 的老路)。
 */
export const LANG_COOKIE = 'jt.lang.v1'

/**
 * cookie 有效期(一年,秒)。
 */
export const LANG_COOKIE_MAX_AGE_S = 31536000

/**
 * 语言切换器的档位(code 进 makeT,label 是切换器上那个字;as const 让 code 推导成
 * 字面量,免拴 types 的注解 —— 叶子不 import 的写法)。
 * 한 保留(2026-07-19 Frank 拍板):全量文案经本地 qwen3.6 对照 zh/en 校对一轮后亮回。
 */
export const LANGS = [
  /**
   * 中文档。
   */
  { code: 'zh', label: '中' },

  /**
   * 英文档。
   */
  { code: 'en', label: 'EN' },

  /**
   * 韩文档。
   */
  { code: 'ko', label: '한' },
] as const

/**
 * 语言码字面量:中文(判语比较与装配键用;字面量推导保 Lang 收窄)。
 */
export const LANG_ZH = 'zh'

/**
 * 语言码字面量:英文。
 */
export const LANG_EN = 'en'

/**
 * 语言码字面量:韩文。
 */
export const LANG_KO = 'ko'

/**
 * cookie 键值等号。
 */
export const COOKIE_EQ = '='

/**
 * cookie 尾段一:全站 path + 有效期前缀。
 */
export const COOKIE_PATH_AGE = '; path=/; max-age='

/**
 * cookie 尾段二:samesite。
 */
export const COOKIE_SAMESITE = '; samesite=lax'

/**
 * 插值槽左括号({var} 的边)。
 */
export const VAR_L = '{'

/**
 * 插值槽右括号。
 */
export const VAR_R = '}'
