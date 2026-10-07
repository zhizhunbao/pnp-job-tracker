'use client'
/**
 * card 域的可展开白卡(2026-10-05 访客第 2 题照掌上高考立 —— 一个专业类一张):头行一行竖直居中 =
 * 名字(主色)+ 个数胶囊(tag 桶浅主色档)+ 箭头(展开朝上);点头行展开 / 收起,内容在同一张卡里、和名字左对齐。
 * 叠在全局 .card 白卡壳上(白卡壳全站一份),本域只给密度;展开态由调用方记(一次开几张、开哪张归调用方)。
 * 头行是 button 桶的 ghost 钮,挂 aria-expanded + aria-controls,读屏报得出展开没、展开的是哪块。
 *
 * @author Frank
 * @time 2026-10-05 10:40:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconChevronDown } from '@/components/icons'
import { Tag } from '@/components/tag'
import { CARD_CLS, PLAIN_BTN_KIND, TAG_V_PICK } from './constants'
import type { FoldCardIn } from './types'
import css from './card.module.css'

/**
 * 可展开白卡。
 *
 * @param props 名字、个数、展开态、切换回调、内容块 id 与内容(见 FoldCardIn 逐格注释)。
 * @returns 白卡。
 */
export function FoldCard({ title, count, open, onToggle, bodyId, children }: FoldCardIn) {
  let chevCls = cssOf(css.foldChev)
  if (open) {
    chevCls = `${cssOf(css.foldChev)} ${cssOf(css.foldChevOpen)}`
  }
  return (
    <div className={`${CARD_CLS} ${cssOf(css.fold)}`}>
      <Button kind={PLAIN_BTN_KIND} expanded={open} ariaControls={bodyId} onClick={onToggle}
        className={cssOf(css.foldHead)}>
        <span className={cssOf(css.foldName)}>{title}</span>
        <Tag variant={TAG_V_PICK}>{count}</Tag>
        <span className={chevCls}><IconChevronDown /></span>
      </Button>
      {open && <div id={bodyId} className={cssOf(css.foldBody)}>{children}</div>}
    </div>
  )
}
