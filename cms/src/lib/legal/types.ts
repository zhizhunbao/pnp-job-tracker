/**
 * 法律域的形状 —— 本域自己声明。
 *
 * @author Frank
 * @time 2026-08-22 22:00:00
 */

/**
 * 界面语言码(镜像 i18n 的 Lang;types 是叶子不 import,加语言时 i18n 装配处 tsc 会点名)。
 */
export type LangCode = 'zh' | 'en' | 'ko'

/**
 * 法务页的键(四页)。
 */
export type LegalPage = 'privacy' | 'terms' | 'disclaimer' | 'about'

/**
 * 一页法务正文的形状。
 */
export type LegalDoc = {
  /**
   * 页标题。
   */
  title: string

  /**
   * 更新日(展示原文)。
   */
  updated: string

  /**
   * 正文各节。
   */
  sections: {
    /**
     * 节标题。
     */
    h: string

    /**
     * 节内段落。
     */
    body: string[]
  }[]
}
