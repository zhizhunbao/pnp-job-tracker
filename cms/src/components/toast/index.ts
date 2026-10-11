/**
 * toast 组件桶 —— 右上角提示(通用件;2026-10-11 批 5「提示统一 + 顶栏铃铛」,照 Azure 门户)。
 * 各处发提示只取 toast();只有全站骨架(app/(frontend)/layout.tsx)挂 ToastHost。
 *
 * @author Frank
 * @time 2026-10-11 10:00:00
 */

export { toast } from './functions'
export { ToastHost } from './toasthost'
export type { ToastKind, ToastMsg } from './types'
