'use client'
/**
 * 域内小件:点击分页那一行。不随滚动自动加载(用户拍板);按钮只报剩余条数 ——
 * #42 同族,20000 载入护栏当分母像写死(2026-07-16 用户指出)。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { BTN_SECONDARY, ELLIPSIS } from './constants'
import { moreBtnClsOf, moreLabelOf } from './functions'
import type { BoardPanelIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染分页行。
 *
 * @param props 职位板整台状态机。
 * @returns 「显示更多」或「已全部显示」。
 */
export function MoreLine({ b }: BoardPanelIn) {
  return (
    <div className={cssOf(css.more)}>
      {b.data.rows.length > 0 && b.data.rows.length >= b.data.total && b.allShownText}
      {b.data.rows.length > 0 && b.data.rows.length < b.data.total && (
        <Button kind={BTN_SECONDARY} sm disabled={b.data.loading} onClick={b.data.onMore}
          className={moreBtnClsOf(b.data.loading)}>
          {moreLabelOf({ loading: b.data.loading, label: b.moreText, busy: ELLIPSIS })}
        </Button>
      )}
    </div>
  )
}
