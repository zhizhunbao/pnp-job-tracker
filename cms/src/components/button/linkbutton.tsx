'use client'
/**
 * button 族的链接件 LinkButton:真 <a> 基础件(2026-08-24 Frank「弄个 button
 * 实际是 a 标签,统一,不裸写 a 标签」「都放到 button 里面」「叫 linkbutton」)。
 * 全站唯一允许裸写 <a> 的文件 —— 别处一律经它(Button href/BackButton 体内也经它):
 * · SEO 命门:爬虫只沿 <a href> 发现页面、传权重,按钮后面的页面等于不存在;
 * · target 传了自动补 rel="noreferrer"(原先 Button/LinkText/GoogleButton
 *   三处逐字抄这条 —— 收拢的判据就是这三份重复);
 * · 样式归调用域:它只管标签语义,不管长相;
 * · 2026-09-04 站内形态改走 next/link(渲出来仍是 <a href>,爬虫照旧;多了客户端切页与预取 ——
 *   Frank「点一下下一题怎么整个页面刷新」「卡的一笔」);带 target 的外链仍是裸 <a>。
 *
 * @author Frank
 * @time 2026-08-24 09:00:00
 */
import Link from 'next/link'
import { REL_NOREFERRER } from './constants'
import type { LinkButtonIn } from './types'

/**
 * 链接:站内形态走 next/link;带 target 或没 href 的走裸 <a>(target 形态自动补 rel)。
 *
 * @param props 去处与外观(见 LinkIn 逐格注释)。
 * @returns 链接。
 */
export function LinkButton({ href, onClick, target, title, className, ariaLabel, style, children }: LinkButtonIn) {
  if (target != null || href == null) {
    return (
      <a href={href}
        onClick={onClick}
        target={target}
        rel={REL_NOREFERRER}
        title={title}
        className={className}
        aria-label={ariaLabel}
        // eslint-disable-next-line react/forbid-dom-props -- 调用方几何微调的过渡口(Button href 形态)
        style={style}>{children}</a>
    )
  }
  return (
    <Link href={href} onClick={onClick} title={title} className={className} aria-label={ariaLabel} style={style}>
      {children}
    </Link>
  )
}
