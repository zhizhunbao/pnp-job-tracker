/**
 * backlink 域的结构:全站统一返回钮(2026-07-18 Frank「返回按钮应该有统一的样式吧 全网站」)。
 * 药丸幽灵样式,不带箭头;新增返回入口一律用它,不许裸 <a>。
 * 2026-08-24 自 ui/BackLink.tsx 迁入;同日并进 button 域(按钮族一域多变体)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import type { BackLinkIn } from './types'
import css from './button.module.css'

/**
 * 返回钮(真 <a>,内链要被爬到、要能整页导航)。
 *
 * @param props 目标与文字。
 * @returns 返回钮。
 */
export function BackLink({ href, label }: BackLinkIn) {
  return (
    <a href={href} className={css.backLink}>
      {label}
    </a>
  )
}
