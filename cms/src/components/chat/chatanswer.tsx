'use client'
/**
 * 一条助手答复的三段结构 —— **结论正文 → 操作条(复制/赞/踩/出处开关)→ 出处清单**
 * (2026-08-04 从 ChatBox 拆出)。为什么不套现成聊天框架:assistant-ui / ai-chatbot
 * 的消息模型里只有 markdown 文本,没有 facts / evidence / followups —— 而这三样
 * 正是本站与通用聊天的全部区别,套进去等于把「每个数字都能点回官方原页」降级成
 * 一段纯文本。操作条只留三个图标(2026-08-05 照 GPT/Claude 形态):「分叉/重生成/
 * 继续」在我们这儿语义不成立 —— 对话不落库、答复过五道出口校验不能随手重来。
 * 「解决了你的问题吗?」问句 2026-08-09 Frank 拍板撤掉(图标自解释);追问胶囊堆
 * 同拍撤掉(每轮唯一交互块 = 选项卡,渲在 ChatBox 的卡位);免责句 2026-08-05
 * 挪到面板底部常驻一条。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */
import { useState } from 'react'
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { ICON_PX, K_COPIED, K_COPY, PLAIN_BTN_KIND, TEXT_NONE, VOTE_BAD, VOTE_GOOD } from './constants'
import { IconCheck, IconClipboard, IconThumbDown, IconThumbUp } from '@/components/icons'
import { useLang } from '@/components/i18n'
import { citedFactsOf, makeCopyAnswer, makeFlagSet, makeRate } from './functions'
import { ChatSources } from './chatsources'
import { ChatText } from './chattext'
import type { ChatAnswerIn } from './types'
import css from './chat.module.css'

/**
 * 一条答复。
 *
 * @param props 那条答复(见 ChatAnswerIn 逐格注释)。
 * @returns 正文 + 操作条 + 出处。
 */
export function ChatAnswer({ a }: ChatAnswerIn) {
  const [, , t] = useLang()
  const [copied, setCopied] = useState(false)
  const [srcOpen, setSrcOpen] = useState(false)
  const [vote, setVote] = useState<string>(TEXT_NONE)
  const canCopy = typeof navigator !== 'undefined' && navigator.clipboard != null
  const facts = citedFactsOf({ a })
  let copyKey = K_COPY
  if (copied) {
    copyKey = K_COPIED
  }
  let goodCls = css.cbAct
  if (vote === VOTE_GOOD) {
    goodCls = `${css.cbAct} ${css.cbVoted}`
  }
  let badCls = css.cbAct
  if (vote === VOTE_BAD) {
    badCls = `${css.cbAct} ${css.cbVoted}`
  }
  return (
    <div className={css.cbMsg}>
      <ChatText text={a.answer} sheet={a.degraded} />
      <div className={css.cbActs}>
        {canCopy && (
          <Button kind={PLAIN_BTN_KIND}
            className={cssOf(css.cbAct)}
            ariaLabel={t(copyKey)}
            title={t(copyKey)}
            onClick={makeCopyAnswer({ text: a.answer, setCopied })}>
            {copied && <IconCheck size={ICON_PX} />}
            {copied === false && <IconClipboard size={ICON_PX} />}
          </Button>
        )}
        <Button kind={PLAIN_BTN_KIND}
          className={goodCls}
          disabled={vote !== ''}
          ariaLabel={t('chat.fb.good')}
          title={t('chat.fb.good')}
          pressed={vote === VOTE_GOOD}
          onClick={makeRate({ vote, setVote, kind: VOTE_GOOD })}>
          <IconThumbUp size={ICON_PX} />
        </Button>
        <Button kind={PLAIN_BTN_KIND}
          className={badCls}
          disabled={vote !== ''}
          ariaLabel={t('chat.fb.bad')}
          title={t('chat.fb.bad')}
          pressed={vote === VOTE_BAD}
          onClick={makeRate({ vote, setVote, kind: VOTE_BAD })}>
          <IconThumbDown size={ICON_PX} />
        </Button>
        {facts.length > 0 && (
          <Button kind={PLAIN_BTN_KIND}
            className={cssOf(css.cbSrcTgl)}
            expanded={srcOpen}
            onClick={makeFlagSet({ set: setSrcOpen, v: srcOpen === false })}>
            {t('chat.sources')}
            <span className={css.cbCnt}>{facts.length}</span>
          </Button>
        )}
      </div>
      {facts.length > 0 && srcOpen && <ChatSources facts={facts} t={t} />}
    </div>
  )
}
