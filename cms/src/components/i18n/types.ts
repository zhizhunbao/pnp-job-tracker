/**
 * i18n 组件域的形状。语言类型是 lib/i18n 的契约,这里只做 type 引入
 * (组件域与 lib 域同名对应,形状同源不复制)。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
import type { Lang } from '@/lib/i18n'

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
