'use client'
/**
 * pager 域的结构:「显示更多」那一行 —— 点一下往下接一批,不随滚动自动加载;全部显示完换成一句「已全部显示」。
 * 2026-09-18 Frank「分页改成和 job table 一样的」:形与值照抄职位板的 jobs/moreline.tsx(居中、12.5px 灰字、
 * 白底描边小钮、手机钮高 40),立成通用件,雇主板先用;职位板那份绑着它自己的整台状态机,留给换装批改成消费本件。
 *
 * @author Frank
 * @time 2026-09-18 19:00:00
 */
import { Button } from '@/components/button'
import { MORE_BTN_KIND } from './constants'
import { moreBtnClsOf, moreLabelOf } from './functions'
import type { MoreLineIn } from './types'
import css from './pager.module.css'

/**
 * 「显示更多」行。
 *
 * @param props 已显示行数、总行数、在途态、两句文案与点击回调(逐格注释见 MoreLineIn)。
 * @returns 「显示更多」钮,或「已全部显示」一句;空表时只留空行。
 */
export function MoreLine({ shown, total, loading, moreText, allText, onMore }: MoreLineIn) {
  return (
    <div className={css.more}>
      {shown > 0 && shown >= total && allText}
      {shown > 0 && shown < total && (
        <Button kind={MORE_BTN_KIND} sm disabled={loading} onClick={onMore} className={moreBtnClsOf(loading)}>
          {moreLabelOf({ loading, label: moreText })}
        </Button>
      )}
    </div>
  )
}
