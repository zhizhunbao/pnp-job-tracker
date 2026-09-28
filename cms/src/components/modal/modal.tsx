'use client'
/**
 * modal 域的主结构:居中弹框壳(三档宽 / Esc / 点遮罩关 / header 拖拽 / 全屏还原)。
 * 一个 tsx 一个组件、通用件各归各域(2026-08-24 Frank 拍板):标题块在 title 域、
 * 全屏钮图标在 icons 域;机器在 hooks(useCard/useEscClose…)、预算在 functions
 * (clsOf/cardStyleOf/maxKeyOf)、死值在 constants、样式在 modal.module.css。
 * (2026-07-05 用户拍板:全站弹框格式布局一致;2026-08-24 组件域刀 A 形制化。)
 *
 * style 白名单(同 table 域头注那条边界):只剩两条真运行时数据 ——
 * zIndex(调用方有 z+10 算术叠层)与拖拽 transform(每帧连续像素),
 * 各挂逐行特批牌(闸 react/forbid-dom-props);其余全类化进 module.css 了。
 *
 * 决策记录:#314 全屏钮的 title/aria-label 原是写死中文,英韩界面属性残留中文 ——
 * 改经 useLang 取词(cw.restore/cw.max)。
 * 2026-09-23 Frank「这个带全屏的都去掉吧」:全屏 / 还原钮整功能撤(resizable 开关、全屏态、MaxIcon 随删),
 * 拖拽与四边缩放不动。
 * 2026-09-28 并壳(Frank「别并存啊」「你都重构了 还并存什么」):advisor 的浮层壳(FloatPanel:职位描述 / 公司 / 字段三个弹框)
 * 并进来成「窗口形」(win 规格:标题栏钉住、正文单独滚、可拖可拉、记住尺寸),全站弹框只剩这一个壳;
 * 机器合成一台 useFrame(拖动 / 拉伸 / 记忆),拖动不再走 transform —— 拖过、拉过之后白卡钉在视口坐标上,
 * style 白名单里的「拖拽 transform」随之换成「钉住的位置与尺寸」;关闭钮与窗口钮一律 ModalBtn,把手一律 ResizeHandles。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { SIZE_DEFAULT, Z_MODAL } from './constants'
import { bodyClsOf, clsOf, frameOf, stopClick } from './functions'
import { useEscClose, useFrame, useOverlayClose } from './hooks'
import { ModalActs } from './modalacts'
import { ModalBar } from './modalbar'
import { ResizeHandles } from './resizehandles'
import type { ModalIn } from './types'

/**
 * 弹框壳。普通弹框:sm=390, md=560, lg=760,支持按住白卡拖动(draggable)、edgeResize = 四边四角拖拽缩放
 * (2026-09-04 pte 字典弹框先例);窗口形(win):标题栏 + 窗口钮排 + 单独滚动的正文,可拖可拉、记住尺寸。
 * 右上角全屏 / 还原钮 2026-09-23 撤。
 *
 * @param props 关闭回调与形态开关。
 * @returns 弹框。
 */
export function Modal({
  onClose,
  size = SIZE_DEFAULT,
  z = Z_MODAL,
  pad = true,
  tall = false,
  draggable = true,
  edgeResize = false,
  actions,
  win,
  frame,
  children,
}: ModalIn) {
  const ov = useOverlayClose(onClose)
  useEscClose(onClose)
  const own = useFrame({ win, draggable, edgeResize })
  const f = frameOf({ ext: frame, own })
  const narrow = f.narrow
  const cls = clsOf({ narrow, size, draggable, pad, tall, win: win != null })

  return (
    // eslint-disable-next-line react/forbid-dom-props -- 层级是调用方传的运行时数据(有 z+10 算术叠层)
    <div onMouseDown={ov.onMouseDown} onClick={ov.onClick} className={cls.overlay} style={{ zIndex: z }}>
      <div onClick={stopClick}
        data-frame
        onPointerDown={f.onCardDown}
        className={cls.card}
        // eslint-disable-next-line react/forbid-dom-props -- 拖过 / 拉过 / 窗口形钉住的位置与尺寸是每帧连续变化的运行时像素(frameStyleOf)
        style={f.style}>
        {win != null && (
          <ModalBar head={win.head} actions={actions} onClose={onClose} onDown={f.onBarDown} narrow={narrow} />
        )}
        {win != null && <div className={bodyClsOf({ jd: win.jd })}>{children}</div>}
        {win == null && <ModalActs actions={actions} onClose={onClose} bar={false} />}
        {win == null && children}
        {f.resizable && <ResizeHandles startOf={f.startOf} />}
      </div>
    </div>
  )
}
