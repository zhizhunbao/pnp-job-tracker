/**
 * advisor 域的浏览器安全门:纯拼装 API 与形状(提示词组装零依赖,eval/测试从这取)。
 *
 * @author Frank
 * @time 2026-08-23 21:30:00
 */
export {
  cacheKeyOf, chatPromptOf, chatSystemOf, cityFactsOf, makeEmptyJob, makeLocJob, makeOccJob,
  profileFactsOf, promptOf, provFactsOf, readerCtxOf, systemOf, teerOf, toAdvisorJob,
} from './functions'
export type { AdvisorJob, ChatMsg, ChatMsgList, Lang, PromptIn, WebResearch } from './types'
