/**
 * footer 域的形状:Footer 的 props 契约(组件域规矩:XxxIn 一律进本抽屉并从桶导出 ——
 * props 是域的对外契约,调用方要看得到)。
 *
 * @author Frank
 * @time 2026-08-24 03:30:00
 */
import type { TFn } from '@/lib/i18n'

/**
 * Footer 的 props。
 */
export type FooterIn = {
  /**
   * 界面语翻译函数。
   */
  t: TFn
}
