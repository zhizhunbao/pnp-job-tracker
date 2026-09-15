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

/**
 * 没有语言信号时用的空串:`langFromAccept` 收的原料可能是 null(爬虫、直连,
 * 或服务端根本读不到 Accept-Language 头),先折成空串再判 —— 空串三条前缀都不匹配,
 * 落到末尾当英文。
 * 原判(立规当日,已于 2026-09-15 被 Frank 改判,原文保留):「🔴 空串在这里代表**没给信号**,
 * 不是给了一个我们不认识的语言:后者要当英文(英文是国际默认),前者只能回默认中文
 * (与改造前 `useState('zh')` 逐字一致)—— 两种情况判反了,爬虫抓到的就全是英文页。」
 * 🔴 2026-09-15 改判(Frank「google 爬的是英文吧」「要给整理后的英文版本吧」):**没给信号就当英文**,
 * 原判那句「爬虫抓到的全是英文页」现在正是要的结果。病因链:Googlebot 不带 Accept-Language → 落中文界面 →
 * 中文界面的正文要等对照译完才渲(2026-09-14「不要显示原文,直接显示整理之后的」+ 对照在途出转圈)→
 * 服务端渲染时译文永远没有 → 爬虫拿到一页转圈(当日生产实测同一岗页:带 en 头 933 字有正文,
 * 不带头 309 字转圈)。英文界面无对照这道工序,整理版(按原帖语言生成,JB 那批即英文)直接进 HTML。
 * 真人浏览器一律带这个头,该中文的照旧中文;变的只有不带头的访问(爬虫、curl),站上 88% 流量本就是英文。
 */
export const ACCEPT_NONE = ''
