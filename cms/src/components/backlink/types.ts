/**
 * backlink 域的形状:返回钮的 props 契约。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * BackLink 的 props。
 */
export type BackLinkIn = {
  /**
   * 返回目标(真 <a>,要能被爬、能整页导航)。
   */
  href: string

  /**
   * 钮文字(过 i18n 的词)。
   */
  label: string
}
