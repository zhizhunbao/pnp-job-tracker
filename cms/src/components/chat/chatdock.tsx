'use client'
/**
 * 启动器(右下角圆球 + 首访轻提示):面板开着时整块收走(手机全屏接管,桌面面板
 * 正压在它头上)。可自由拖动(2026-08-06 Frank「防挡内容」):按住位移超过阈值
 * 才算拖,松手压掉那一次 click;拖过 = 改用 left/top 定位并隐藏轻提示(提示条会把
 * dock 向左撑宽,钳制口径就不再是那颗 56px 的钮)。
 * 走查 #298:提示胶囊在手机上是 210×56 的一块,钉在视口底部永远盖住正文最后一行 ——
 * 窄屏只留圆球不出这条;评估/处境两条动线的手机端连圆球也不出(clNarrowOff)。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconChat } from '@/components/icons'
import { DOCK_ICON_PX, PLAIN_BTN_KIND } from './constants'
import type { ChatDockIn } from './types'
import css from './chat.module.css'

/**
 * 启动器。
 *
 * @param props 面板、启动器引用与「本路由窄屏藏球」档(逐格注释见 ChatDockIn)。
 * @returns 启动器一块;面板开着时由调用方不渲。
 */
export function ChatDock({ p, dockEl, narrowOff }: ChatDockIn) {
  let dockCls = css.clDock
  if (narrowOff) {
    dockCls = `${css.clDock} ${css.clNarrowOff}`
  }
  return (
    <div ref={dockEl}
      className={dockCls}
      // eslint-disable-next-line react/forbid-dom-props -- 运行时几何:避让实测距离或用户拖过的自定义位,非静态样式
      style={p.dockStyle}
      onPointerDown={p.onDockDown}>
      {p.hint && p.dockPos == null && p.wide && (
        <Button kind={PLAIN_BTN_KIND} className={cssOf(css.clHint)} onClick={p.show}>{p.t('cw.hint')}</Button>
      )}
      <Button kind={PLAIN_BTN_KIND}
        className={cssOf(css.clBtn)}
        ariaLabel={p.t('cw.open')}
        title={p.t('cw.open')}
        onClick={p.onDockClick}>
        <IconChat size={DOCK_ICON_PX} />
      </Button>
    </div>
  )
}
