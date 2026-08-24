/**
 * modal 组件域的桶 —— 全站弹框壳(2026-07-05 用户拍板:格式布局一致,遮罩不带毛玻璃;
 * 规范:遮罩 rgba(17,24,39,.5) · 圆角 14 · 阴影/关闭钮/内边距统一 · 普通层 z=50、叠加层 z=60)。
 * 对应 lib 域:无(通用件)。
 *
 * 2026-08-24 刀 A:Modal/ModalTitle 体内类化 + hooks 抽屉首证(useIsNarrow +
 * useOverlayClose,后者自 ui/overlay.ts 并入)。同日弹框族批:SCRIM 退役 ——
 * 自带壳的重弹框(Advisor/Decision)改用 overlayCls() 拿同一份遮罩类
 * (同日 Frank 拍板:scrim 这个舞台术语改叫 overlay,与 useOverlayClose 同词);
 * CARD/iconBtnS 仍是过渡导出,随后续批次类化后退役。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
export { CARD, iconBtnS, MODAL_RADIUS, MODAL_SHADOW } from './constants'
export { overlayCls } from './functions'
export { useEscClose, useIsNarrow, useOverlayClose } from './hooks'
export { Modal } from './modal'
export type { ModalIn, OverlayHandlers } from './types'
