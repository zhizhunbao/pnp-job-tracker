'use client'
/**
 * notice 域的结构:提醒/通知统一框(#114 E-I 批,四色四用禁新配色)——
 * 图标 + 粗体引导语(可省)+ 正文 + 右侧钮槽(可省)。散装提醒框一律换用本组件。
 * 2026-08-24 自 ui/Notice.tsx 按组件域形制迁入(四色表迁 module.css,图标表进 constants)。
 *
 * style 白名单:style 是调用方几何微调的过渡口,消费页形制化批逐个收。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { NOTICE_ICON, NOTICE_KIND_DEFAULT } from './constants'
import { noticeClsOf } from './functions'
import type { NoticeIn } from './types'
import css from './notice.module.css'

/**
 * 提醒框。
 *
 * @param props 色/引导语/钮槽/微调/正文。
 * @returns 提醒框。
 */
export function Notice({ kind = NOTICE_KIND_DEFAULT, lead, action, style, className, children }: NoticeIn) {
  let extraCls: string | null = null
  if (className != null) {
    extraCls = className
  }
  return (
    // eslint-disable-next-line react/forbid-dom-props -- 调用方几何微调的过渡口(见文件头)
    <div className={noticeClsOf({ kind, className: extraCls })} style={style}>
      <span className={css.body}>
        <span className={css.icon}>{NOTICE_ICON[kind]}</span>
        {lead != null && <b className={css.lead}>{lead}</b>}
        {children}
      </span>
      {action}
    </div>
  )
}
