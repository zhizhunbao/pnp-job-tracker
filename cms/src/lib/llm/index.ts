/**
 * 模型域的桶。advisor、对话、简历、翻译要模型时,都只从这一个名字取。
 *
 * 域内四件:constants 参数、types 形状、functions 行为,加上本文件这道门。
 * 另外三件为什么没有、与 lib/agent 的边界怎么划、为什么不开 ./server 门,
 * 三条判定都在 docs/implementation/文案收拢/14_lib-llm域重构.md。
 *
 * 测试里 11 处 `vi.mock('@/lib/llm', …)` 打的就是本文件,这个路径不能改。
 * 那些工厂是部分替换,只给被测代码真正用到的名字 —— 从桶里取到 undefined 不是这里的 bug,
 * 是那个 mock 该补一条。
 *
 * 失败与留痕不从这个桶走:判定与错误码在 `@/lib/error`,日志字面量在 `@/lib/log`。
 *
 * @author Frank
 * @time 2026-08-19 06:32:21
 */

export { completeText, streamChat } from './functions'
export { contentTag, friendChat, friendChatOrThrow, friendLlmReady, refPrompt } from './functions'
export { summarizeNews, translateLinesAligned, translateParasStrict, translatePlainLines, translateReady, translateSectioned } from './functions'
export {
  E_BAD_REQUEST, E_COL_NOT_READY, E_NOT_CONFIGURED, E_NOT_FOUND, E_RATE_LIMITED, E_TRANSLATE_NOT_CONFIGURED,
  SUM_LANGS, TRANS_KEY_SEP, TRANS_LANGS, TRANSLATE_ROUTE_TIMEOUT_MS,
} from './constants'
export { FRIEND_INPUT_MAX } from './constants'
export type { ChatMessage, ResultMeta } from './types'
