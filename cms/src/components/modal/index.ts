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
 * 2026-09-21 多一台弹框栈 useLayerStack(职位 / 公司弹框一层层叠,× 与 Esc 都只关最上面一层)。
 * 2026-09-28 并壳(Frank「别并存啊」「你都重构了 还并存什么」):advisor 的浮层壳并进 Modal 成「窗口形」(win 规格),
 * 全站弹框只剩这一个壳;窗口形的页眉左块 ModalHead、小标副段 KickerNote、窗口图标钮 ModalBtn 出桶;
 * 白卡机器 useFrame 也出桶(职位描述弹框在外层起一台交给 Modal,重新翻译整块重挂内容时位置尺寸不丢)。
 * CARD / iconBtnS / MODAL_RADIUS / MODAL_SHADOW 零消费者,随之退役。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
export { overlayCls } from './functions'
export { useEscClose, useFrame, useIsNarrow, useLayerStack, useOverlayClose } from './hooks'
export { KickerNote } from './kickernote'
export { Modal } from './modal'
export { ModalBtn } from './modalbtn'
export { ModalHead } from './modalhead'
export type { FrameOut, LayerStackOut, ModalIn, ModalWin, OverlayHandlers } from './types'
