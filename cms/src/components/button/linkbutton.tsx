'use client'
/**
 * button 族的链接件 LinkButton:真 <a> 基础件(2026-08-24 Frank「弄个 button
 * 实际是 a 标签,统一,不裸写 a 标签」「都放到 button 里面」「叫 linkbutton」)。
 * 全站唯一允许裸写 <a> 的文件 —— 别处一律经它(Button href/BackButton 体内也经它):
 * · SEO 命门:爬虫只沿 <a href> 发现页面、传权重,按钮后面的页面等于不存在;
 * · target 传了自动补 rel="noreferrer"(原先 Button/LinkText/GoogleButton
 *   三处逐字抄这条 —— 收拢的判据就是这三份重复);
 * · 样式归调用域:它只管标签语义,不管长相。
 *
 * @author Frank
 * @time 2026-08-24 09:00:00
 */
import { REL_NOREFERRER } from './constants'
import type { LinkButtonIn } from './types'

/**
 * 真 <a> 链接;target 形态自动补 rel。
 *
 * @param props 去处与外观(见 LinkIn 逐格注释)。
 * @returns 链接。
 */
export function LinkButton({ href, onClick, target, title, className, ariaLabel, style, children }: LinkButtonIn) {
  if (target != null) {
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
    <a href={href}
      onClick={onClick}
      title={title}
      className={className}
      aria-label={ariaLabel}
      // eslint-disable-next-line react/forbid-dom-props -- 调用方几何微调的过渡口(Button href 形态)
      style={style}>{children}</a>
  )
}
