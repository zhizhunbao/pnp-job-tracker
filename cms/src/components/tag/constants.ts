/**
 * tag 域的死值。
 * 2026-10-05 带删钮的标签收进本桶(Tag 的 del 格):× 的字符与钮底座自 profile 桶迁入。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */

/**
 * 变体默认档(调用方不传 variant 时用省/地区配色;原 ui/Tag.tsx 签名里的默认值,迁移起名)。
 */
export const VARIANT_DEFAULT = 'region'

/**
 * 摘除已选职业 × 钮的字符(图标是内容不是样式,归常量不进 css)。
 * 与 account 域同名同义,各家一份。
 * 2026-10-05 自 profile 桶迁入(带删钮的标签收进本桶;已选专业的标签也用这一枚)。
 */
export const DEL_MARK = '×'

/**
 * 定制样式钮的统一底座(2026-08-26 Frank「<button 这种不允许直接使用」):
 * ghost 底最素,视觉全由本域的加倍类定形。与 account 域同名同义,各家一份。
 * 2026-10-05 随 × 摘除钮自 profile 桶抄来一份(profile 那份别的钮还在用,照留)。
 */
export const PLAIN_BTN_KIND = 'ghost'

