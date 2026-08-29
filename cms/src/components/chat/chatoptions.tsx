'use client'
/**
 * 每轮唯一交互块(08-09 Frank「只要你这种」= 带标题的选项卡 + 自行输入,一轮只出
 * 一块,追问胶囊堆同拍撤掉):答复轮与引导轮共用同一张卡(数据口径在 functions 的
 * optionsOf,别另写一份)。胶囊沿示例形态;推荐项蓝框浅蓝底 + 绿徽标;点击目标
 * ≥44px;只挂**最后一轮**,下一轮开始自然消失 —— 永不堵嘴,输入框随时可用;
 * 点选 = 以用户身份把 sendText 发出去(气泡进对话流)。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { PLAIN_BTN_KIND } from './constants'
import { makePick, makeSelf, optionsOf } from './functions'
import type { ChatOptionsIn } from './types'
import css from './chat.module.css'

/**
 * 选项卡。
 *
 * @param props 面板与这一轮(逐格注释见下方内联形状)。
 * @returns 选项卡;一条都没有 = null(输入框就在下面,不出废话)。
 */
export function ChatOptions({ p, turn }: ChatOptionsIn) {
  const card = optionsOf({ turn, turns: p.turns, examples: p.examples, t: p.t })
  if (card == null) {
    return null
  }
  const items = []
  for (const [k, o] of card.items.entries()) {
    let cls = css.cbOpt
    if (o.recommended === true) {
      cls = `${css.cbOpt} ${css.cbOptRec}`
    }
    items.push(
      <Button key={k}
        kind={PLAIN_BTN_KIND}
        className={cls}
        disabled={p.busy}
        onClick={makePick({ p, k, q: o.sendText })}>
        {o.recommended === true && <span className={css.cbOptTag}>{p.t('chat.opt.rec')}</span>}
        <span className={css.cbOptMain}>
          <span className={css.cbOptLabel}>{o.label}</span>
          {o.consequence != null && o.consequence !== '' && <span className={css.cbOptCons}>{o.consequence}</span>}
        </span>
      </Button>,
    )
  }
  return (
    <div className={css.cbOpts}>
      {card.reason !== '' && <div className={css.cbOptWhy}>{card.reason}</div>}
      {items}
      <Button kind={PLAIN_BTN_KIND} className={cssOf(css.cbOpt)} onClick={makeSelf({ p })}>
        <span className={css.cbOptMain}>
          <span className={`${css.cbOptLabel} ${css.cbSelfLabel}`}>{p.t('chat.opt.self')}</span>
        </span>
      </Button>
    </div>
  )
}
