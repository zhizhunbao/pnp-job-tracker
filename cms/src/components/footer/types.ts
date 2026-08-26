/**
 * footer 域的形状:Footer 的 props 契约(组件域规矩:XxxIn 一律进本抽屉并从桶导出 ——
 * props 是域的对外契约,调用方要看得到)。
 *
 * @author Frank
 * @time 2026-08-24 03:30:00
 */

/**
 * 界面语取词函数(与 lib/i18n 的 TFn 同形:键 + 可选插值 —— 宪法 08-25「types 自声明」,
 * 2026-08-26 撤跨域 import 本域自抄,同 auth/types 先例;走样当场 tsc 红)。
 */
export type TFn = (key: string, vars?: Record<string, string | number>) => string

/**
 * Footer 的 props。
 */
export type FooterIn = {
  /**
   * 界面语翻译函数。
   */
  t: TFn
}
