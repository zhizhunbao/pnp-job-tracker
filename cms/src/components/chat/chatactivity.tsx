'use client'
/**
 * Activity 面板 = 真轨迹 + 真档案 + 本轮真出处。默认收起,点开后才像 GPT 的
 * Activity 面板;没有模型内部思维文本,只有系统确实执行过的步骤(轨迹与正文
 * 都是真的,一格都不许编)。记忆节只读 users.profile —— 匿名会话的临时 slots
 * 不冒充「已保存」。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { K_MEM_MANAGE, K_MEM_SIGNIN, TARGET_BLANK, URL_MEM_LOGIN, URL_MEM_MANAGE } from './constants'
import { webSourcesOf } from './functions'
import type { ChatActivityIn } from './types'
import css from './chat.module.css'

/**
 * Activity 面板本体(折叠条里的展开区)。
 *
 * @param props 面板、这一轮与在跑档(逐格注释见下方内联形状)。
 * @returns 三节:执行轨迹 / 长期记忆 / 官方来源。
 */
export function ChatActivity({ p, turn, live }: ChatActivityIn) {
  const steps = []
  for (const [k, s] of turn.steps.entries()) {
    steps.push(<div className={css.cbStep} key={k}>{s}</div>)
  }
  const mems = []
  for (const [k, m] of p.memories.entries()) {
    mems.push(<div className={css.cbMem} key={k}>{m}</div>)
  }
  const sources = webSourcesOf({ a: turn.a })
  const webs = []
  for (const s of sources) {
    webs.push(
      <LinkButton className={cssOf(css.cbWeb)} href={s.url} target={TARGET_BLANK} key={s.url}>{s.name}</LinkButton>,
    )
  }
  let memBody = <div className={css.cbActEmpty}>{p.t('chat.memoryAnon')}</div>
  if (p.me.loggedIn) {
    memBody = <div className={css.cbActEmpty}>{p.t('chat.memoryEmpty')}</div>
    if (mems.length > 0) {
      memBody = <>{mems}</>
    }
  }
  let memHref = URL_MEM_LOGIN
  let memKey = K_MEM_SIGNIN
  if (p.me.loggedIn) {
    memHref = URL_MEM_MANAGE
    memKey = K_MEM_MANAGE
  }
  return (
    <div className={css.cbActivity}>
      <section className={css.cbActSec}>
        <div className={css.cbActTitle}>
          {p.t('chat.thinking')}
          <span className={css.cbActCount}>{turn.steps.length}</span>
        </div>
        {steps}
        {live === false && <div className={`${css.cbStep} ${css.cbStepDone}`}>{p.t('chat.done')}</div>}
      </section>
      <section className={css.cbActSec}>
        <div className={css.cbActTitle}>
          {p.t('chat.memory')}
          <span className={css.cbActCount}>{p.memories.length}</span>
        </div>
        {memBody}
        <LinkButton className={cssOf(css.cbMemLink)} href={memHref}>{p.t(memKey)}</LinkButton>
      </section>
      {webs.length > 0 && (
        <section className={css.cbActSec}>
          <div className={css.cbActTitle}>{p.t('chat.web')}<span className={css.cbActCount}>{webs.length}</span></div>
          <div className={css.cbWebs}>{webs}</div>
        </section>
      )}
    </div>
  )
}
