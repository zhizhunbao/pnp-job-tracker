/**
 * i18n 组件域的形状。组件域与 lib 域同名对应;语言类型原先直接 type 引入 lib/i18n 的
 * Lang(形状同源不复制),2026-08-26 依宪法 08-25「types 自声明 / Lang 三字面量各域自抄」
 * 改为本域自声明。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */

/**
 * 语言码 —— 本域自声明(宪法 08-25「Lang 三字面量各域自抄」,2026-08-26 撤跨域 import;
 * 与全站三语同集,加语言两处同改)。
 */
export type Lang = 'zh' | 'en' | 'ko'

/**
 * LangProvider 的 props。
 */
export type LangProviderIn = {
  /**
   * 服务端算好的首帧语言(layout 的 ssrLang() 从 cookie/Accept-Language 下来)。
   */
  initial: Lang

  /**
   * 子树。
   */
  children: React.ReactNode
}

/**
 * useLangState 交回的机器面板。
 */
export type LangStateOut = {
  /**
   * 当前语言。
   */
  lang: Lang

  /**
   * 换语言(顺带落盘 localStorage + cookie,并同步 html lang)。
   */
  setLang: (l: Lang) => void
}
