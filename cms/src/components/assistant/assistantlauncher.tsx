'use client'
/**
 * 全站右下角对话助手的入口(2026-11-14 Frank「开始做吧」「照表做」):一个圆钮,点开是对话面板;不跳页、网址不变。
 * 盒子不在线时什么都不渲:挂上请求一次 /api/assistant/ready,回 true 才出圆钮。
 * 面板开着时圆钮收走(手机上面板铺满,桌面上面板正压在它的位置);关面板再开对话还在(状态住 useAssistant)。
 * 2026-11-14 Frank「右下角可不可以放一个3d 的小动物」:「小猫有吗」「用这只猫」:圆钮里的对话气泡图标换成一只立体画法的橘猫(public/img/assistant-cat.svg,
 * 本站自己画的矢量图,不加依赖;会眨眼、摇尾巴、轻轻起伏,系统设了减少动效就不动),蓝色圆底随之撤。
 * 面板没有做懒加载:整桶没有额外依赖,对话状态又得跟圆钮住在一起;懒加载还要配错误边界(chat 桶 panelguard 记的那次事故)。
 *
 * @author Frank
 * @time 2026-11-14 12:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { DOCK_IMG_PX, DOCK_IMG_SRC, PLAIN_BTN_KIND } from './constants'
import { useAssistant } from './hooks'
import { AssistantPanel } from './assistantpanel'
import css from './assistant.module.css'

/**
 * 入口:不在线不渲;在线出圆钮,点开换成面板。
 *
 * @returns 圆钮或面板;不在线是 null。
 */
export function AssistantLauncher() {
  const { p, inputEl, threadEl } = useAssistant()
  if (p.ready === false) {
    return null
  }
  if (p.open) {
    return <AssistantPanel p={p} inputEl={inputEl} threadEl={threadEl} />
  }
  return (
    <Button kind={PLAIN_BTN_KIND}
      className={cssOf(css.dock)}
      ariaLabel={p.t('asst.open')}
      title={p.t('asst.open')}
      onClick={p.show}>
      {/* eslint-disable-next-line @next/next/no-img-element -- 本站静态矢量图(自带眨眼与起伏动画),不需要 next/image 的裁切与懒加载 */}
      <img src={DOCK_IMG_SRC} alt="" width={DOCK_IMG_PX} height={DOCK_IMG_PX} className={cssOf(css.dockImg)} />
    </Button>
  )
}
