'use client'
/**
 * apply 桶子桶 review 的分块:修改栏顶上「差在哪」那一块。
 * 2026-11-11 Frank「这个点出来让用户怎么改」:从一条没覆盖的要求点进修改简历 / 修改求职信时,栏顶上先说清是哪条要求没写进去,
 * 另一份里要是已经写到了,把那句话摆出来给他照着加。直接点「修改」进来的不出这一块。
 * 同日 Frank「这个是让用户手动输入,还是让用户怎么加」「可以」:加一颗「帮我写进去」—— 模型只补这一条(先用盒子上的模型写一句,
 * 写不成再整份重写),补完自动重新核对;下面的框照旧能自己改。
 *
 * @author Frank
 * @time 2026-11-12 00:10:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { TEXT_NONE } from './constants'
import type { ReviewNeedIn } from './types'
import css from './review.module.css'

/**
 * 修改栏顶上「差在哪」。
 *
 * @param props 那条要求、另一份里的那句话、说明词条、「帮我写进去」的手柄、在不在跑与取词。
 * @returns 一块说明。
 */
export function ReviewNeed({ r, other, otherKey, onAi, busy, t }: ReviewNeedIn) {
  return (
    <div className={cssOf(css.needBox)}>
      <div className={cssOf(css.needHead)}>{t('tr.needHead')}</div>
      <div>{r.jd}</div>
      {other !== TEXT_NONE && <div className={cssOf(css.needHead)}>{t(otherKey)}</div>}
      {other !== TEXT_NONE && <div>{other}</div>}
      <div className={cssOf(css.needAct)}>
        <Button sm onClick={onAi} disabled={busy}>{t('tr.needAi')}</Button>
      </div>
    </div>
  )
}
