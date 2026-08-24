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
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { useLang } from '@/components/i18n'
import { CLOSE_ARIA, SIZE_DEFAULT, Z_MODAL } from './constants'
import { cardStyleOf, clsOf, maxKeyOf, stopClick } from './functions'
import { MaxIcon } from '@/components/icons'
import { useCard, useEscClose, useIsNarrow, useOverlayClose } from './hooks'
import type { ModalIn } from './types'
import css from './modal.module.css'

/**
 * 居中弹框壳:sm=390, md=560, lg=760;支持 header 按住拖拽移动(draggable)
 * 与右上角全屏/还原(resizable)。
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
  resizable = true,
  actions,
  children,
}: ModalIn) {
  const ov = useOverlayClose(onClose)
  const [, , t] = useLang()
  const narrow = useIsNarrow()
  const card = useCard({ narrow, draggable })
  useEscClose(onClose)

  const cls = clsOf({
    narrow,
    size,
    maximized: card.maximized,
    draggable,
    pad,
    tall,
    dragging: card.dragging(),
  })
  const cardStyle = cardStyleOf({ narrow, maximized: card.maximized, pos: card.pos })
  const maxLabel = t(maxKeyOf(card.maximized))

  return (
    // eslint-disable-next-line react/forbid-dom-props -- 层级是调用方传的运行时数据(有 z+10 算术叠层)
    <div onMouseDown={ov.onMouseDown} onClick={ov.onClick} className={cls.scrim} style={{ zIndex: z }}>
      <div onClick={stopClick}
        onPointerDown={card.onPointerDown}
        onPointerMove={card.onPointerMove}
        onPointerUp={card.onPointerUp}
        className={cls.card}
        // eslint-disable-next-line react/forbid-dom-props -- 拖拽 transform 是每帧连续变化的运行时像素(cardStyleOf)
        style={cardStyle}>
        <div className={css.acts} onClick={stopClick}>
          {actions}
          {resizable && narrow === false && (
            <button onClick={card.toggleMax} aria-label={maxLabel} title={maxLabel} className={css.iconBtn}>
              <MaxIcon maximized={card.maximized} />
            </button>
          )}
          <button onClick={onClose} aria-label={CLOSE_ARIA} className={css.iconBtn}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
