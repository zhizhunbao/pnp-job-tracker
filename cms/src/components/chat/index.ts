/**
 * chat 页面域的桶 —— 全站悬浮顾问入口(ChatLauncher)与它的问答面板;
 * 例句/记忆挑选(chatExamples)另有 tests/int 在断言。
 * 2026-08-26 自 app/(frontend)/chat/ 整体迁入 —— 那个目录本来就没有 page.tsx,
 * 挂在 (frontend)/layout.tsx 上,搬完目录随之删除。
 * 对应 lib 域:lib/consult。
 *
 * @author Claude
 * @time 2026-08-26 19:28:00
 */
export { ChatLauncher } from './ChatLauncher'
export { exampleKind, pickExamples, profileMemories } from './chatExamples'
export type { ChatProfile } from './chatExamples'
