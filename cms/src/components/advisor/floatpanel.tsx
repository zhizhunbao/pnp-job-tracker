'use client'
/**
 * 浮层壳(顾问弹框与职位描述弹框共用):遮罩 + 可拖可拉可全屏的白卡 + 标题栏 + 正文。
 * 遮罩用 modal 域的同一份类 —— 自带壳的重弹框不套 Modal 组件(它没有八向拉伸与尺寸记忆),
 * 但遮罩必须与全站一致(2026-08-24 弹框族批:`style={SCRIM}` 换成 overlayCls)。
 * 窄屏(E8-03)强制全屏:不出全屏钮、不出拉伸手柄。
 * 2026-08-28 换装批自 Advisor.tsx 两个弹框逐字重复的浮层壳合成一件
 * (白卡与窗口钮的规范值从 modal 域的 CARD / iconBtn 逐格抄进 .panel / .iconBtn)。
 * 2026-09-14 Frank「右下角的这个半个背景的去掉」「改成这种干净的」:右下角斜纹抓手撤(八向边拉照旧,只是不再画角标)。
 * 2026-09-21 Frank「这个改成 箭头,点击直接跳到落地页」:有落地页的框(职位描述弹框 → 职位详情页、公司弹框 / 公司字段弹框
 * → 公司页)全屏钮换成箭头,本页整页跳;窄屏也出(全屏钮窄屏不出是因为窄屏本来就全屏,箭头不是那回事)。没落地页的照旧全屏钮。
 * 同日 Frank「这个箭头长一点。并且打开新页面」:换长箭头 MoveUpRight;改新标签页打开(本域 TARGET_BLANK 口径:
 * 弹框里点出去的一律新标签,别把弹框关掉)—— 上一行「本页整页跳」作废。target 给了值 LinkButton 就走裸 a,不走 next/link 预取。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconMaximize, IconMinimize, IconMoveUpRight, IconRefresh } from '@/components/icons'
import { overlayCls, useOverlayClose } from '@/components/modal'
import { BTN_GHOST, CLOSE_MARK, CLS_SEP, TARGET_BLANK, TEXT_NONE } from './constants'
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
export function FloatPanel({
  panel, head, onClose, t, tight, jdBody, actsStopDrag, onRefresh, pageHref, children,
}: FloatPanelIn) {
  const ov = useOverlayClose(onClose)
  const fullLabel = fullTitleOf({ t, full: panel.full })
  return (
    <div onMouseDown={ov.onMouseDown} onClick={ov.onClick} className={cssOf(css.scrim) + CLS_SEP + overlayCls()}>
      {/* eslint-disable-next-line react/forbid-dom-props -- 浮层的位置与尺寸是每帧连续变化的运行时像素(panelStyleOf) */}
      <div onClick={stopClick} className={panelClsOf({ full: panel.full })} style={panel.panelStyle}>
        <div onPointerDown={panel.onHeadDown} className={panelHeadClsOf({ full: panel.full, tight })}>
          {head}
          <div className={cssOf(css.winActs)} onPointerDown={makeActsDown({ stop: actsStopDrag })}>
            {onRefresh != null && (
              <Button kind={BTN_GHOST} onClick={onRefresh} title={t('act.retrans')} ariaLabel={t('act.retrans')}
                className={cssOf(css.iconBtn)}>
                <IconRefresh />
              </Button>
            )}
            {pageHref !== TEXT_NONE && (
              <Button kind={BTN_GHOST} href={pageHref} target={TARGET_BLANK} title={t('detail.openFull')}
                ariaLabel={t('detail.openFull')}
                className={cssOf(css.iconBtn)}>
                <IconMoveUpRight />
              </Button>
            )}
            {pageHref === TEXT_NONE && panel.narrow === false && (
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
        {panel.full === false && <ResizeHandles onEdgeDown={panel.onEdgeDown} />}
      </div>
    </div>
  )
}
