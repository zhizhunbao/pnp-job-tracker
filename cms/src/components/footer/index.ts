/**
 * footer 组件域的桶 —— 全站共享页脚(2026-07-16 用户拍板「所有页面都应该用同一个
 * header 和 footer」)。对应 lib 域:无(站架件)。
 *
 * 组件域样张(2026-08-24 Frank 拍板「组件即域,域自带 css/常量/函数,main.css 退全局层」):
 * 结构 footer.tsx / 样式 footer.module.css / 死值 constants.ts;域自包含,可整体搬迁。
 * 决策记录:#79 免责压短、资料库三链收顶栏(07-19 方案 A)→ 页脚单行;免责三段解释
 * 07-31 Frank 拍板删(全文在 /legal/disclaimer);#212 手机端链高 19px 点不中 →
 * tapPad 只扩点区(全局规范类,留 main.css)。
 *
 * @author Frank
 * @time 2026-08-24 02:30:00
 */
export { Footer } from './footer'
export type { FooterIn } from './types'
