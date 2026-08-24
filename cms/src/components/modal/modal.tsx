'use client'
/**
 * modal 域的结构:居中弹框壳(三档宽 / Esc / 点遮罩关 / header 拖拽 / 全屏还原)
 * 与统一标题块。只剩 JSX 装配 —— 机器在 hooks(useCard/useEscClose…)、预算在
 * functions(clsOf/cardStyleOf/maxKeyOf)、死值在 constants、样式在 modal.module.css。
 * (2026-07-05 用户拍板:全站弹框格式布局一致;2026-08-24 组件域刀 A 形制化、
 * 同日 Frank 二筛三筛:三目/裸断言/匿名函数/对象展开/体内函数与常量全数归抽屉。)
 *
 * style 白名单(同 table 域头注那条边界):zIndex、拖拽 transform 与过渡、
 * 按档宽 --mw 与高上限 --vh、eyebrow 场景色 —— 全是运行时数据/变量,不是静态样式;
 * 每处挂逐行特批牌(闸 react/forbid-dom-props)。
 *
 * 决策记录:#314 全屏钮的 title/aria-label 原是写死中文,英韩界面属性残留中文 ——
 * 改经 useLang 取词(cw.restore/cw.max)。
 *
 * @author Frank
 * @time 2026-08-24 04:30:00
 */
import { useLang } from '@/components/i18n'
import { CLOSE_ARIA, EYEBROW_C_DEFAULT, SIZE_DEFAULT, Z_MODAL } from './constants'
import { cardStyleOf, clsOf, maxKeyOf, stopClick } from './functions'
import { useCard, useEscClose, useIsNarrow, useOverlayClose } from './hooks'
import type { MaxToggleIconIn, ModalIn, ModalTitleIn } from './types'
import css from './modal.module.css'

/**
 * 弹框标题块:eyebrow 小字(可省)+ 17px 标题(右侧给关闭钮留位)。
 *
 * @param props eyebrow/场景色/标题。
 * @returns 标题块。
 */
export function ModalTitle({
  eyebrow,
  color = EYEBROW_C_DEFAULT,
  title,
}: ModalTitleIn) {
  return (
    <div className={css.titleWrap}>
      {eyebrow ? (
        // eslint-disable-next-line react/forbid-dom-props -- 场景色是运行时数据,经 --eyebrow-c 变量进 css
        <div className={css.eyebrow} style={{ '--eyebrow-c': color } as React.CSSProperties}>{eyebrow}</div>
      ) : null}
      <h3 className={css.title}>{title}</h3>
    </div>
  )
}

/**
 * 放大图标(全屏钮的两态之一;提成具名小件,JSX 里不放三目二选一)。
 *
 * @returns 图标。
 */
function MaxIcon() {
  return (
    <svg width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
    </svg>
  )
}

/**
 * 还原图标(全屏钮的两态之一)。
 *
 * @returns 图标。
 */
function RestoreIcon() {
  return (
    <svg width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"/>
    </svg>
  )
}

/**
 * 全屏钮的两态图标(按全屏态二选一;选择收在小件里,Modal 体内不留分支)。
 *
 * @param props 是否全屏态。
 * @returns 图标。
 */
function MaxToggleIcon({ maximized }: MaxToggleIconIn) {
  if (maximized) {
    return <RestoreIcon />
  }
  return <MaxIcon />
}

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
    // eslint-disable-next-line react/forbid-dom-props -- 层级是调用方传的运行时数据(普通层 50/叠加层 60)
    <div onMouseDown={ov.onMouseDown} onClick={ov.onClick} className={cls.scrim} style={{ zIndex: z }}>
      <div onClick={stopClick}
        onPointerDown={card.onPointerDown}
        onPointerMove={card.onPointerMove}
        onPointerUp={card.onPointerUp}
        className={cls.card}
        // eslint-disable-next-line react/forbid-dom-props -- 拖拽位移/过渡与 --mw/--vh 全是运行时预算(cardStyleOf)
        style={cardStyle}>
        <div className={css.acts} onClick={stopClick}>
          {actions}
          {resizable && narrow === false && (
            <button onClick={card.toggleMax} aria-label={maxLabel} title={maxLabel} className={css.iconBtn}>
              <MaxToggleIcon maximized={card.maximized} />
            </button>
          )}
          <button onClick={onClose} aria-label={CLOSE_ARIA} className={css.iconBtn}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
