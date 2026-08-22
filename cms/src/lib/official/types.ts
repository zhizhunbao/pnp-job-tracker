/**
 * 官方资料域的形状 —— 本域自己声明。
 *
 * @author Frank
 * @time 2026-08-22 22:00:00
 */

/**
 * 界面语言码(镜像 i18n 的 Lang;types 是叶子不 import,加语言时 i18n 装配处 tsc 会点名)。
 */
export type LangCode = 'zh' | 'en' | 'ko'

/**
 * 一条官方资源:`name`/`url` 是身份,`use` 是三语用途说明 —— 拆开会让
 * 「这条资源说什么」跨两个文件(2026-08-17 自 app/(frontend)/resources/data.ts 整体搬来,E4-05)。
 */
export type Res = {
  /**
   * 资源名(身份,官方原名)。
   */
  name: string

  /**
   * 三语用途说明。
   */
  use: Record<LangCode, string>

  /**
   * 官方 URL(身份;人工核对现行有效)。
   */
  url: string
}

/**
 * `officialLabel` 的入参。
 */
export type OfficialLabelIn = {
  /**
   * 官方英文原句。
   */
  raw: string

  /**
   * 界面语言(调用端的 `t.lang`,宽字符串;不认识的语言查表落空后回落原文)。
   */
  lang: string
}
