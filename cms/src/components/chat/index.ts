/**
 * chat 页面域的桶 —— 全站悬浮顾问入口(ChatLauncher,挂在 (frontend)/layout.tsx 上)
 * 与它的问答面板。2026-08-26 自 app/(frontend)/chat/ 整体迁入;2026-08-27 换装批
 * 整体重写成小写件形制:三个 PascalCase 组件拆成 13 个单组件小写件 + 四抽屉,
 * chatExamples.ts(不在抽屉名单)解散 —— 表进 constants、挑选函数进 functions、
 * 形状进 types;例句/记忆挑选另有 tests/int 在断言(经本桶取)。
 * 对应 lib 域:lib/consult。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */
export { ChatLauncher } from './chatlauncher'
