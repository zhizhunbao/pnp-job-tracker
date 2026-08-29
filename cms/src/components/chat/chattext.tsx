'use client'
/**
 * 助手正文的唯一渲染出口(答复 / 降级清单 / 引导语 / **逐句流式的半截正文**共用
 * 一套排版)。caret = 还在写(光标跟在最后一个块尾巴上)。半截正文走同一个渲染器
 * 不是洁癖:服务端放行的单位是**整句**,那截里早就带着行首 `- ` 了 —— 另用
 * pre-wrap 铺一遍,用户会先看见一串裸着的 `- `,等整段落地再跳成项目符号,
 * 白白抖一次版。排版口径见 functions 的 textBlocksOf。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */
import { BLOCK_UL } from './constants'
import { textBlocksOf } from './functions'
import type { ChatTextIn } from './types'
import css from './chat.module.css'

/**
 * 助手正文。
 *
 * @param props 正文、降级档与书写光标(见 ChatTextIn 逐格注释)。
 * @returns 排好版的正文块。
 */
export function ChatText({ text, sheet, caret }: ChatTextIn) {
  const blocks = textBlocksOf({ text })
  const last = blocks.length - 1
  let wrapCls = css.cbA
  if (sheet === true) {
    wrapCls = `${css.cbA} ${css.cbSheet}`
  }
  const out = []
  for (const [i, b] of blocks.entries()) {
    if (b.type === BLOCK_UL) {
      const lis = []
      for (const [k, s] of b.items.entries()) {
        lis.push(
          <div className={css.cbLi} key={k}>
            {s}
            {caret === true && i === last && k === b.items.length - 1 && <i className={css.cbCaret} />}
          </div>,
        )
      }
      out.push(<div className={css.cbUl} key={i}>{lis}</div>)
    } else {
      out.push(
        <p className={css.cbP} key={i}>
          {b.text}
          {caret === true && i === last && <i className={css.cbCaret} />}
        </p>,
      )
    }
  }
  return <div className={wrapCls}>{out}</div>
}
