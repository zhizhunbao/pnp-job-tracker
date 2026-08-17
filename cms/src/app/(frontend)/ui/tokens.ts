// #65 前端设计 token(2026-07-18 Frank 拍板:颜色四模块分配 OK/页头浅色带/header 合一)。
// 原则:现有色收口不发明新色;一处定义全站换装;零新依赖。
// 设计总表见 docs/assets/mockups/65-primitives库设计总表.html;banner 图版规范见 mockups/模块banner-设计总表.html。
export const UI = {
  primary: '#2563eb', primaryDeep: '#1e40af',
  danger: '#dc2626', warn: '#b45309', ok: '#15803d',
  text: '#111827', text2: '#6b7280', text3: '#9ca3af',
  border: '#e5e7eb', hairline: '#f3f4f6', bg: '#f9fafb', card: '#fff',
} as const

/** 类名 + 状态修饰:`cx('shNavLink', isActive)` → "shNavLink on"。
 *  样式迁进 main.css 之后,tsx 里剩下的只有「当前态开不开」这一个布尔,
 *  不再逐属性写 `color: on ? A : B, fontWeight: on ? 700 : 400`(2026-08-17 CSS 迁移)。 */
export const cx = (base: string, on?: boolean): string => (on ? `${base} on` : base)
