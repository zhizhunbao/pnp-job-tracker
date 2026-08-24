'use client'
/**
 * auth 域的首字母头像(E11-01):有 src 走图;无则名/邮箱首字母 + 由字符串稳定
 * hash 出的色块(同一人恒定色)。v1 不做上传,src 仅来自 OAuth 带回的头像 URL。
 * 2026-08-24 组件域形制化。
 *
 * style 白名单:直径是调用方传的数字、底色是名字 hash 出来的 —— 都是运行时数据。
 *
 * @author Frank
 * @time 2026-08-24 01:30:00
 */
import { AVATAR_FONT_RATIO, AVATAR_SIZE_DEFAULT } from './constants'
import { stableColor } from './functions'
import type { AvatarIn } from './types'
import css from './auth.module.css'

/**
 * 头像(图或首字母色块)。
 *
 * @param props 图/名字/邮箱/直径。
 * @returns 头像。
 */
export function Avatar({ src, name, email, size = AVATAR_SIZE_DEFAULT }: AvatarIn) {
  let base = '?'
  if (name != null && name !== '') {
    base = name
  } else if (email != null && email !== '') {
    base = email
  }
  const label = base.trim()
  let initial = '?'
  if (label !== '') {
    initial = label.charAt(0).toUpperCase()
  }
  if (src != null && src !== '') {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- OAuth 外源头像不进 next/image 管线(域名不可控)
      <img src={src} alt="" width={size} height={size} className={css.avatarImg} />
    )
  }
  return (
    <span aria-hidden="true"
      className={css.avatarBadge}
      // eslint-disable-next-line react/forbid-dom-props -- 直径是调用方数字、底色是名字 hash —— 运行时数据
      style={{
        width: size,
        height: size,
        background: stableColor(label.toLowerCase()),
        fontSize: Math.round(size * AVATAR_FONT_RATIO),
      }}>
      {initial}
    </span>
  )
}
