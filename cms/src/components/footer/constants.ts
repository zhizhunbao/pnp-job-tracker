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

/**
 * 手机触控靶的全局类名(真身在 main.css,整段裹在 `max-width: 640px` 里,桌面不生效)。
 * 全局做法是 `.tapPad::after` 用伪元素向外撑一个 min 40×40 的热区 —— 不占布局、
 * 视觉一个像素不动(#212 第 26 轮的教训:靠 padding/min-height 撑热区 = 控件真的变大、
 * 版式被挤走)。
 * 🔴 页脚这排法务链是例外:第 27 轮实测伪元素热区**会被相邻元素抢点**(成排小控件
 * 光靠 ::after 点不中),所以全局层另有一条 `.sfLinks a.tapPad` 给它们补真实内边距
 * (9px 上下 + inline-block)。也就是说这个类挂在页脚链上时真正起作用的是那条限定规则,
 * 不是伪元素 —— 所以它必须和下面的 SF_LINKS_CLS 一起出现,单挂这一个点不中。
 * 是全局层的类、不是本域 module.css 的哈希名,所以只能按这个固定字符串写。
 */
export const TAP_PAD_CLS = 'tapPad'

/**
 * 页脚链行的全局作用域类名。它自己不画样式,是给 main.css 那条
 * `.sfLinks a.tapPad` 当**限定前缀**用的 —— 触控靶的内衬只在页脚这一行加(9px 上下 +
 * inline-block),别处的 tapPad 不受影响。与本域 module.css 的 `links` 叠着写:
 * 全局类管跨页统一的触控行为,module 类管页脚自己的排布。
 */
export const SF_LINKS_CLS = 'sfLinks'
