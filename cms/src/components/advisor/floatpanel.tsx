'use client'
/**
 * 浮层壳(顾问弹框与职位描述弹框共用):遮罩 + 可拖可拉可全屏的白卡 + 标题栏 + 正文。
 * 遮罩用 modal 域的同一份类 —— 自带壳的重弹框不套 Modal 组件(它没有八向拉伸与尺寸记忆),
 * 但遮罩必须与全站一致(2026-08-24 弹框族批:`style={SCRIM}` 换成 overlayCls)。
 * 窄屏(E8-03)强制全屏:不出全屏钮、不出拉伸手柄。
 * 2026-08-28 换装批自 Advisor.tsx 两个弹框逐字重复的浮层壳合成一件
 * (白卡与窗口钮的规范值从 modal 域的 CARD / iconBtn 逐格抄进 .panel / .iconBtn)。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconMaximize, IconMinimize } from '@/components/icons'
import { overlayCls, useOverlayClose } from '@/components/modal'
import { BTN_GHOST, CLOSE_MARK, CLS_SEP } from './constants'
import { fullTitleOf, makeActsDown, panelBodyClsOf, panelClsOf, panelHeadClsOf, stopClick } from './functions'
import { ResizeHandles } from './resizehandles'
import type { FloatPanelIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染浮层壳。
 *
 * @param props 浮层机器、页眉左块、关闭回调与三个形态开关(逐格注释见 FloatPanelIn)。
 * @returns 遮罩 + 白卡。
 */
export function FloatPanel({ panel, head, onClose, t, tight, jdBody, actsStopDrag, children }: FloatPanelIn) {
  const ov = useOverlayClose(onClose)
  const fullLabel = fullTitleOf({ t, full: panel.full })
  return (
    <div onMouseDown={ov.onMouseDown} onClick={ov.onClick} className={cssOf(css.scrim) + CLS_SEP + overlayCls()}>
      {/* eslint-disable-next-line react/forbid-dom-props -- 浮层的位置与尺寸是每帧连续变化的运行时像素(panelStyleOf) */}
      <div onClick={stopClick} className={panelClsOf({ full: panel.full })} style={panel.panelStyle}>
        <div onPointerDown={panel.onHeadDown} className={panelHeadClsOf({ full: panel.full, tight })}>
          {head}
          <div className={cssOf(css.winActs)} onPointerDown={makeActsDown({ stop: actsStopDrag })}>
            {panel.narrow === false && (
              <Button kind={BTN_GHOST} onClick={panel.toggleFull} title={fullLabel} ariaLabel={fullLabel}
                className={cssOf(css.iconBtn)}>
                {panel.full && <IconMinimize />}
                {panel.full === false && <IconMaximize />}
              </Button>
            )}
            <Button kind={BTN_GHOST} onClick={onClose} className={cssOf(css.iconBtn)}>{CLOSE_MARK}</Button>
          </div>
        </div>
        <div className={panelBodyClsOf({ jd: jdBody })}>{children}</div>
        {panel.full === false && <div className={cssOf(css.grip)} />}
        {panel.full === false && <ResizeHandles onEdgeDown={panel.onEdgeDown} />}
      </div>
    </div>
  )
}
