'use client'
/**
 * apply 桶子桶 review 的分块:改写进行中的等待画面。
 * 2026-11-11 Frank「这个运行的时候,是不是太大了」「应该这个过程弄的高科技一点吧,比如努力匹配中,加个 gif 图标之类的」:
 * 原先整宽一张卡里只有一行转圈,换成居中一小块 —— 动画圈、一句「努力匹配中」、四步进度(做完的打勾、正在做的闪动、
 * 没到的灰字)、一条来回走的进度条。动画只用样式,不带图片文件;系统设了「减少动态效果」时不动。
 * 同日 Frank「两个加载中吗」「只有一个就行吧」:只是在取已有结果时框里什么都不出(开框前已经出过一句「加载中…」),
 * 真在改写才出这一块。
 *
 * @author Frank
 * @time 2026-11-11 23:00:00
 */
import { cssOf } from '@/components/css'
import { DATA_ON, ROLE_STATUS } from './constants'
import { waitStepsOf } from './functions'
import type { ReviewWaitIn } from './types'
import css from './review.module.css'

/**
 * 等待画面。
 *
 * @param props 正在做的那一步与取词。
 * @returns 居中的一小块。
 */
export function ReviewWait({ stage, t }: ReviewWaitIn) {
  const rows = []
  for (const s of waitStepsOf({ stage, t })) {
    rows.push(<li key={s.key} data-st={s.state}>{s.text}</li>)
  }
  return (
    <div className={cssOf(css.waitBox)} role={ROLE_STATUS}>
      <div className={cssOf(css.waitArt)} aria-hidden={DATA_ON} />
      <div className={cssOf(css.waitTitle)}>{t('tr.waitTitle')}</div>
      <ol className={cssOf(css.waitSteps)}>{rows}</ol>
      <div className={cssOf(css.waitBar)} aria-hidden={DATA_ON} />
    </div>
  )
}
