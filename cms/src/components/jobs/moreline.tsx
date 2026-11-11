'use client'
/**
 * 域内小件:点击分页那一行。不随滚动自动加载(用户拍板);按钮只报剩余条数 ——
 * #42 同族,20000 载入护栏当分母像写死(2026-07-16 用户指出)。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 * 2026-11-11 Frank「这个加载的时候 应该 显示 加载中 动态的」:在途时不再出一颗写着「…」的钮,换成通用 loading 桶的转圈 +「加载中…」。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Loading } from '@/components/loading'
import { BTN_SECONDARY } from './constants'
import type { BoardPanelIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染分页行。
 *
 * @param props 职位板整台状态机。
 * @returns 「显示更多」、在途的「加载中…」或「已全部显示」。
 */
export function MoreLine({ b }: BoardPanelIn) {
  return (
    <div className={cssOf(css.more)}>
      {b.data.rows.length > 0 && b.data.rows.length >= b.data.total && b.allShownText}
      {b.data.rows.length > 0 && b.data.rows.length < b.data.total && b.data.loading === false && (
        <Button kind={BTN_SECONDARY} sm onClick={b.data.onMore}>{b.moreText}</Button>
      )}
      {b.data.rows.length > 0 && b.data.rows.length < b.data.total && b.data.loading && (
        <Loading text={b.t('loading')} />
      )}
    </div>
  )
}
