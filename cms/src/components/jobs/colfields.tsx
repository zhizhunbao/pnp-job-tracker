'use client'
/**
 * 字段钮与它的浮层。更新时间 + 字段(N)不是筛选,但 2026-08-16 PNP/年薪 下沉后这一行腾出了
 * 地方 —— Frank「这个能放到一行吗」→ 回到本行右端,不再单占一条。窄屏隐藏(卡片视图没有列)。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { BTN_SECONDARY, SPACE } from './constants'
import { IconSettings } from '@/components/icons'
import { fieldsBtnClsOf } from './functions'
import { ColPanel } from './colpanel'
import type { BoardPanelIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染字段钮与浮层。
 *
 * @param props 职位板整台状态机。
 * @returns 字段钮(展开时带浮层)。
 */
export function ColFields({ b }: BoardPanelIn) {
  return (
    <div ref={b.cols.boxRef} className={`${cssOf(css.hideNarrow)} ${cssOf(css.colWrap)}`}>
      <Button kind={BTN_SECONDARY} onClick={b.cols.onOpen} className={fieldsBtnClsOf()}>
        <IconSettings />{SPACE}{b.t('fields', { n: b.cols.shown.length })}
      </Button>
      {b.cols.open && <ColPanel b={b} />}
    </div>
  )
}
