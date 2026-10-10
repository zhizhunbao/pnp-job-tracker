'use client'
/**
 * 「今日待投」底部:错误一行;左「改信」(去投递区)、右「跳过」「投出」;多于一岗再出「全部投出」。
 * 2026-10-08 Frank 看「我的」改判:「全部投出」撤(「不要一次性投出去 5 个吧。其他的还没有看呢」)、「跳过」撤(「跳过 按钮删了」)、
 * 「改信」挪进右边动作组(「改信 那个按钮放在哪里也是突兀啊」);左边换翻页「上一个 · n / N · 下一个」(多于一岗才出);
 * 「投出」要逐项检查四项全勾才亮。
 * 同日 Frank「看着不乱吗」:自拼的文字翻页撤,改用通用 Pager(‹ 1/6 ›,与表格页脚同一个);手机英文一行放得下。
 *
 * @author Frank
 * @time 2026-10-08 15:00:00
 */
import { Button } from '@/components/button'
import { Pager } from '@/components/pager'
import { BTN_PRIMARY, ERR_NONE } from './constants'
import type { QueueFootIn } from './types'
import css from './queue.module.css'

/**
 * 渲染底部。
 *
 * @param props 整机面板、这一岗与取词函数。
 * @returns 错误一行与钮组。
 */
export function QueueFoot({ p, item, t }: QueueFootIn) {
  return (
    <>
      {p.err !== ERR_NONE && <div className={css.err}>{t(p.err)}</div>}
      <div className={css.foot}>
        {p.state.items.length > 1 && (
          <span className={css.left}>
            <Pager page={p.pos} max={p.state.items.length} onPage={p.onPage} />
          </span>
        )}
        <span className={css.right}>
          <Button kind={BTN_PRIMARY}
            onClick={p.onSend}
            disabled={p.busy || item.closed || item.jobId == null}
            busy={p.busy}>
            {t('qu.send')}
          </Button>
        </span>
      </div>
    </>
  )
}
