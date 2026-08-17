// 配色的**映射表**,不是真值 —— 真值只有一份,在 main.css 的 :root
// (2026-08-17 Frank「不应该迁移到 main.css 里吗」搬过去的)。
//
// 这里留着是因为全站约 450 处 tsx 还在用 `background: UI.primary` 写内联样式。
// 映射成 var() 而不是复制一份十六进制:调用点一个字不用改,值也不会有第二份 ——
// 「同一个值抄两处」正是今天修的那类 bug(ACCT_SLOT_W 抄两份 → 52px 错位)。
// 内联样式吃 var() 没问题;拼透明度那种写法(`${UI.primary}22`)吃不了,
// 已在 SectionTabs 用 color-mix 替掉,以后也别再写。
//
// 每迁完一个组件文件,它对 UI 的引用随之消失;等引用归零,本文件删除。
// E12-08 通道档色阶(1-5):5/4 绿深浅、3 默认、2 琥珀、1/缺 灰(scoreColor 0-100 版随加权分退役)。
// 移民通道档与公司担保档共用同一套档色 —— 都是「1-5 档」,一个值一种颜色只该定义一次。
export const gradeColor = (g: number | null | undefined) => (
  g == null ? '#9ca3af' : g >= 5 ? '#166534' : g >= 4 ? '#15803d' : g >= 3 ? '#374151' : g >= 2 ? '#b45309' : '#9ca3af'
)

export const UI = {
  primary: 'var(--primary)', primaryDeep: 'var(--primary-deep)',
  danger: 'var(--danger)', warn: 'var(--warn)', ok: 'var(--ok)',
  text: 'var(--text)', text2: 'var(--text2)', text3: 'var(--text3)',
  border: 'var(--border)', hairline: 'var(--hairline)', bg: 'var(--bg)', card: 'var(--card)',
} as const
