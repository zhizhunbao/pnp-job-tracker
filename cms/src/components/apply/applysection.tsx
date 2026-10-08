'use client'
/**
 * 「我的求职」上方的投递区(2026-10-07 Frank「投递不应该跳到我的投递页面吗」→「合成一个」:投递并进「我的求职」):
 * 地址栏带职位 id 就取起始态、走四步;没带不出东西(只看下面的投递记录表);这一岗已经发出也不出(记录在表里);
 * 岗下架 / 没投递邮箱(且没投过)只摆原因一行;取不到出「刷新再试」;发出后收起,并通知外面刷新表。
 *
 * @author Frank
 * @time 2026-10-07 05:00:00
 */
import { useState } from 'react'
import { Loading } from '@/components/loading'
import { ApplyFlow } from './applyflow'
import { FAIL_KEY, LOAD_FAIL, LOAD_NONE, LOAD_OK, SENT_STATUSES, TEXT_NONE } from './constants'
import { blockKeyOf, makeSent } from './functions'
import { useApplyStart } from './hooks'
import type { ApplySectionIn } from './types'
import css from './apply.module.css'

/**
 * 投递区。
 *
 * @param props 发出后的回调。
 * @returns 四步本体,或原因 / 失败一行,或加载占位;没带职位、已发出给空。
 */
export function ApplySection({ onSent }: ApplySectionIn) {
  const s = useApplyStart()
  const [sent, setSent] = useState(false)
  if (s.load === LOAD_NONE || sent) {
    return null
  }
  if (s.load === LOAD_FAIL) {
    return <div className={css.note}>{s.t(FAIL_KEY)}</div>
  }
  if (s.load !== LOAD_OK || s.start == null) {
    return <Loading text={s.t('act.loadingText')} />
  }
  if (SENT_STATUSES.includes(s.start.status)) {
    return null
  }
  const block = blockKeyOf(s.start)
  if (block !== TEXT_NONE) {
    return <div className={css.note}>{s.t(block)}</div>
  }
  return <ApplyFlow start={s.start} onSent={makeSent({ setSent, onSent })} />
}
