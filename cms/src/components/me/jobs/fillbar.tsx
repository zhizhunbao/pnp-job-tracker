'use client'
/**
 * me 桶子桶 jobs 的结构:「补全档案」提示条(2026-11-07 Frank「按 Azure 的改」:原先进「我的求职」先弹五题拦人,
 * 照 Azure 门户的 MessageBar 改成顶上一条浅蓝提示,点名空着的几样;「去补全」去「我的档案」并开修改面板,✕ 这一页不再出;
 * docs/design/我的/我的框架-20261107.md 2.7)。档案都填了、或还没取回来时什么都不画。
 *
 * @author Frank
 * @time 2026-11-07 19:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconX } from '@/components/icons'
import { Notice } from '@/components/notice'
import { FILL_CLOSE_ARIA, FILL_GO_KEY, FILL_NOTICE_KIND, PLAIN_BTN_KIND } from './constants'
import { fillTextOf } from './functions'
import { useFill } from './hooks'
import type { FillBarIn } from './types'
import css from './jobs.module.css'

/**
 * 「补全档案」提示条。
 *
 * @param props 取词与「去补全」。
 * @returns 提示条;不出为 null。
 */
export function FillBar({ t, onFill }: FillBarIn) {
  const f = useFill()
  const text = fillTextOf({ view: f.view, t })
  if (text == null || f.hidden) {
    return null
  }
  const action = (
    <>
      <Button kind={PLAIN_BTN_KIND} sm onClick={onFill}>{t(FILL_GO_KEY)}</Button>
      <Button kind={PLAIN_BTN_KIND} sm onClick={f.onHide} ariaLabel={FILL_CLOSE_ARIA}><IconX /></Button>
    </>
  )
  return (
    <div className={cssOf(css.fillGap)}>
      <Notice kind={FILL_NOTICE_KIND} action={action}>{text}</Notice>
    </div>
  )
}
