// 模型域的桶 —— 三个零件,名字并排读就是分工:
//    · provider.ts      **出口**   —— advisor 的唯一模型出口,三个后端(ollama / anthropic / friend)统一成一条字节流
//    · friend.ts        **传输层** —— 朋友的 ngrok → qwen3.6,OpenAI 兼容端点;只管传输,内容校验在调用方
//    · lineTranslate.ts **逐行对齐**—— 翻译要的是行数对齐,不是自由发挥
//
// 2026-08-19 从 lib/ 顶层收进来时改的名(`llm.ts`→`provider.ts`、`friendLlm.ts`→`friend.ts`):
// 域名已经说了 llm,文件名要说的是**在这个域里它是哪一件**。`llm/llm.ts` 只会让人多问一次。
//
// 🔴 **没有 `./server` 门,因为不需要**:全部消费者都是 API 路由与服务端模块,
//    零个 `'use client'` 组件从这儿取东西(判据见「开门看消费者,不看文件」)。
//    哪天真有客户端要用,再拆门也不迟 —— 现在拆是替假想中的消费者付账。
//
// ⚠️ 测试里的 `vi.mock('@/lib/llm', …)` 打的就是本文件。搬家后这个路径**没变**(顶层 llm.ts → llm/index.ts),
//    11 处 mock 一个字都不用改;但工厂是**部分替换**,只给了 LlmError + completeText ——
//    哪天有被测代码从桶里取 `streamChat`,那儿会拿到 undefined,不是这里的 bug,是那个 mock 该补一条。

export { LlmError, completeText, streamChat } from './provider'
export type { ChatMessage } from './provider'
export { contentTag, friendChat, friendLlmReady, refPrompt } from './friend'
export { translateLinesAligned, translateReady } from './lineTranslate'
