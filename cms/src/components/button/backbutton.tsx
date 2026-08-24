/**
 * button 族的返回钮变体(渲真 <a>,内链要被爬到)(2026-07-18 Frank「返回按钮应该有统一的样式吧 全网站」)。
 * 药丸幽灵样式,不带箭头;新增返回入口一律用它,不许裸 <a>。
 * 2026-08-24 自 ui/BackButton.tsx 迁入;同日并进 button 域(按钮族一域多变体)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { LinkButton } from './linkbutton'
import type { BackButtonIn } from './types'
import css from './button.module.css'

/**
 * 返回钮(真 <a>,内链要被爬到、要能整页导航)。
 *
 * @param props 目标与文字。
 * @returns 返回钮。
 */
export function BackButton({ href, label }: BackButtonIn) {
  return (
    <LinkButton href={href} className={css.backButton}>
      {label}
    </LinkButton>
  )
}
