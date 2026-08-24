/**
 * footer 域的死值:法务链表与版权行(轨宽随 maxWidth prop 连根拔,定死进 module.css)。
 *
 * @author Frank
 * @time 2026-08-24 02:30:00
 */

/**
 * 法务四链(href 身份 + i18n 键;#79 免责压短、资料库三链收顶栏后页脚只剩这一行)。
 */
export const LEGAL_LINKS = [
  /**
   * 免责声明(全文页;页脚免责短句的出处)。
   */
  {
    href: '/legal/disclaimer',
    key: 'foot.disclaimerLink',
  },

  /**
   * 隐私政策。
   */
  {
    href: '/legal/privacy',
    key: 'foot.privacy',
  },

  /**
   * 服务条款。
   */
  {
    href: '/legal/terms',
    key: 'foot.terms',
  },

  /**
   * 关于页。
   */
  {
    href: '/about',
    key: 'foot.about',
  },
]

/**
 * 版权行(品牌串,非翻译文案)。
 */
export const COPYRIGHT = '© 2026 Offer2PR'
