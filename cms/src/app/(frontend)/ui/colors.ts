// ⚠️ **过渡文件,终点是 main.css 的 :root**(2026-08-17 Frank「不应该迁移到 main.css 里吗」——是)。
// 现在还留着,是因为全站还有约 450 处 tsx 在用 `UI.primary` 这类值写内联样式。
// 此刻把调色板搬进 :root 会造出两份真相(CSS 变量一份 + 这个对象一份),
// 正是今天在修的那类 bug(ACCT_SLOT_W 抄两份 → 52px 错位)。
// 正确顺序:每迁完一个组件文件,它对 UI 的引用随之消失;等引用归零,把这 12 个色写进 :root 并删掉本文件。
//
// 全站配色的单一来源(2026-07-18 Frank 拍板:颜色四模块分配 OK/页头浅色带/header 合一)。
// 原则:现有色收口不发明新色;一处定义全站换装;零新依赖。
// 设计总表见 docs/assets/mockups/65-primitives库设计总表.html;banner 图版规范见 mockups/模块banner-设计总表.html。
export const UI = {
  primary: '#2563eb', primaryDeep: '#1e40af',
  danger: '#dc2626', warn: '#b45309', ok: '#15803d',
  text: '#111827', text2: '#6b7280', text3: '#9ca3af',
  border: '#e5e7eb', hairline: '#f3f4f6', bg: '#f9fafb', card: '#fff',
} as const
