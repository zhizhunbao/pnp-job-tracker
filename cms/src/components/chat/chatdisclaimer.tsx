'use client'
/**
 * 免责一条,**全局只出现一次**(2026-08-05 从每条答复下面挪来:一轮铺三条就重复
 * 三遍,那是噪音不是合规)。钉在 composer 边上常驻 —— 说的是「这块框里的话是
 * 模型说的」,跟页脚那条全站免责不是一回事,所以不能只留页脚。
 * 会话 ID(2026-08-09 Frank:「复制这个 ID 发给你,你就能帮我分析这段对话」):
 * chat_logs.thread(首轮提问哈希,不指向人),点击复制;首轮答复落地后才有。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { PLAIN_BTN_KIND } from './constants'
import type { ChatDisclaimerIn } from './types'
import css from './chat.module.css'

/**
 * 免责行(+ 可复制的会话 ID)。
 *
 * @param props 面板(逐格注释见下方内联形状)。
 * @returns 免责一条。
 */
export function ChatDisclaimer({ p }: ChatDisclaimerIn) {
  let idText = null
  if (p.thread != null) {
    idText = `${p.t('chat.thread')} ${p.thread}`
    if (p.thCopied) {
      idText = p.t('chat.threadCopied')
    }
  }
  return (
    <div className={`${css.cbDisc} ${css.cbCol}`}>
      {p.t('advisor.disclaimer')}
      {idText != null && (
        <Button kind={PLAIN_BTN_KIND} className={cssOf(css.cbThreadId)} onClick={p.onCopyThread}>{idText}</Button>
      )}
    </div>
  )
}
