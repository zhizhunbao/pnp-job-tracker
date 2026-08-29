'use client'
/**
 * 域内小件:三分表表题旁的对话导流钮。2026-08-08 Frank 追加「表管事实,人话归对话」:
 * 三分表各挂一个,挂在表题旁(Sec 的右槽,与 S5 的 TopN / 链接同一处理);
 * 行为复刻 C6 通道卡 PathwaysCard.openChat 的既有写法(o2p:chat-open + prefill),
 * 不自造事件;预填问句只填框,**绝不代发送**。
 * AIP 表的两行口径注 08-10 Frank 拍掉(「我不要解释,我要用户一眼看表就能明白,
 * 或者直接问顾问」)—— 要问 TEER 门槛 / 被指定算不算数,走的就是这个钮。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { Button } from '@/components/button'
import { PLAIN_BTN_KIND } from './constants'
import { askClsOf, makeAskChat } from './functions'
import type { AskChatBtnIn } from './types'

/**
 * 渲染对话导流钮。
 *
 * @param props 人群档与取词函数。
 * @returns 文字钮。
 */
export function AskChatBtn({ kind, t }: AskChatBtnIn) {
  return (
    <Button kind={PLAIN_BTN_KIND} className={askClsOf()} onClick={makeAskChat({ kind, t })}>
      {t('se.askChat')}
    </Button>
  )
}
