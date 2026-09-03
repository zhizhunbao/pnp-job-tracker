'use client'
/**
 * C2 对话即产品:landing 主入口的对话框(答题卡 2026-08-04 摘除后由它接主位)。
 * 形态 2026-08-04 重做(Frank:「是不是太简陋了,参考一些开源项目」)—— 只抄
 * 交互范式不引框架:① 历史在上、composer 钉底;② 空态给 3 个示例问题(可点即发,
 * 对着空白框写自己的移民处境门槛极高,这是转化最大的杠杆);③ 错误分引导与故障
 * 两类;④ Enter 发送 / Shift+Enter 换行。本组件只渲染,不算数 —— 结论、数字、
 * 判定全部来自服务端工具层并挂 evidence(总红线)。状态机器住 hooks 的 useChatBox,
 * 本件只拼装。2026-08-27 换装批自 ChatBox.tsx(PascalCase 迁移存量)整体重写,
 * 内联 <style> 全部迁 chat.module.css。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */
import { TEXT_NONE } from './constants'
import { useChatBox } from './hooks'
import { ChatComposer } from './chatcomposer'
import { ChatDisclaimer } from './chatdisclaimer'
import { ChatTurn } from './chatturn'
import type { ChatBoxIn } from './types'
import css from './chat.module.css'

/**
 * 对话框(独立卡壳;compact 档卸壳嵌进挂件面板)。
 *
 * @param props compact/autoFocus/prefill(见 ChatBoxIn 逐格注释)。
 * @returns 对话框整块。
 */
export function ChatBox({ compact = false, autoFocus = false, prefill = TEXT_NONE }: ChatBoxIn) {
  const { p, threadEl, taEl } = useChatBox({ prefill, autoFocus })
  const turns = []
  for (const [i, turn] of p.turns.entries()) {
    turns.push(<ChatTurn key={i} p={p} turn={turn} i={i} />)
  }
  let threadCls = css.cbThread
  if (p.empty) {
    threadCls = `${css.cbThread} ${css.cbNoScroll}`
  }
  const card = (
    <div className={css.cbCard}>
      <div ref={threadEl} className={threadCls} onScroll={p.onScroll}>
        {turns}
      </div>
      <ChatComposer p={p} taEl={taEl} />
      <ChatDisclaimer p={p} />
    </div>
  )
  if (compact) {
    return <div className={css.cbFill}>{card}</div>
  }
  return <div>{card}</div>
}
