/**
 * modal 组件域的桶 —— 全站弹框壳(2026-07-05 用户拍板:格式布局一致,遮罩不带毛玻璃;
 * 规范:遮罩 rgba(17,24,39,.5) · 圆角 14 · 阴影/关闭钮/内边距统一 · 普通层 z=50、叠加层 z=60)。
 * 对应 lib 域:无(通用件)。
 *
 * 2026-08-24 刀 A:Modal/ModalTitle 体内类化 + hooks 抽屉首证(useIsNarrow +
 * useOverlayClose,后者自 ui/overlay.ts 并入);SCRIM/CARD/iconBtnS 是跨弹框族的
 * **过渡导出**(39 处消费端还在 spread 拼运行时样式),各消费域形制化批里逐个类化后退役。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
export { CARD, iconBtnS, MODAL_RADIUS, MODAL_SHADOW, SCRIM } from './constants'
export { useIsNarrow, useOverlayClose } from './hooks'
export { Modal, ModalTitle } from './modal'
export type { ModalIn, ModalTitleIn, OverlayHandlers } from './types'
