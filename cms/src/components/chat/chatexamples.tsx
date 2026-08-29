'use client'
/**
 * 空态示例块。🔴 **不随第一轮卸载**(2026-08-05 Frank:「用户一点问题,瞬间就跳到
 * 一个新对话,上面的问题一下就闪没了,这个需要保持吧」):它是线程**最上方的一条
 * 内容**,随线程一起滚上去 —— 第二轮之后自然滚出视野,但回滚上去还找得到,从头到尾
 * 只有这一份。点完仍可点:用户下一步很可能就是想问第二条示例。
 * 🔴 形态与答复下方那张选项卡**必须是同一种**(2026-08-09 Frank:「这个样式怎么
 * 上下不一致」)—— 同一个东西上面窄灰胶囊、下面通栏白卡,读者会以为是两种东西。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { PLAIN_BTN_KIND } from './constants'
import { makeAskExample } from './functions'
import type { ChatExamplesIn } from './types'
import css from './chat.module.css'

/**
 * 空态示例块(三条,可点即发)。
 *
 * @param props 面板(逐格注释见下方内联形状)。
 * @returns 示例块。
 */
export function ChatExamples({ p }: ChatExamplesIn) {
  const items = []
  for (const ex of p.examples) {
    items.push(
      <Button key={ex.key}
        kind={PLAIN_BTN_KIND}
        className={cssOf(css.cbOpt)}
        disabled={p.busy}
        onClick={makeAskExample({ p, ex })}>
        <span className={css.cbOptMain}><span className={css.cbOptLabel}>{p.t(ex.key, ex.params)}</span></span>
      </Button>,
    )
  }
  return (
    <div className={`${css.cbEmpty} ${css.cbOpts}`}>
      <div className={css.cbOptWhy}>{p.t('chat.try')}</div>
      {items}
    </div>
  )
}
