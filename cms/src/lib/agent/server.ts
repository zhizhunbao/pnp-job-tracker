/**
 * 对话兜底模块的服务端门。
 * 它只补槽位:事实、合成、出口闸全在 lib/chat;它挂了/超时/env 关着,流水线行为与从前逐字相同。
 *
 * @author Frank
 * @time 2026-08-18 20:38:09
 */

export { resolveByAgent } from './functions'

// pi 壳的一部分:`convertToLlm` 要的那道过滤。`lib/consult` 跑的是同一个循环,同一份过滤 ——
// 复制一份等于给「哪几种消息能喂给模型」开个岔(2026-08-20 收拢)。
export { acceptNoc, passThroughMessages } from './functions'
