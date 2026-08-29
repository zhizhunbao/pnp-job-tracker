'use client'
/**
 * stats 域的结构:图本身与压在它右上角的全屏钮。全屏走浏览器原生 requestFullscreen
 * (2026-08-01 Frank 队列⑥「主图手机端加全屏按钮」)—— 退出由 ESC / 返回手势管,
 * 不自己造关闭态;全屏时图撑满视口高,退出自动还原,桌面不出这个钮(用不上)。
 * iOS WebKit 没有 Element.requestFullscreen,那台设备上改走 CSS 伪全屏(容器铺满视口 +
 * body 锁滚动),两条路共用同一个钮,判定见 hooks 的 useFullscreen。
 * 全屏那几格状态只有本件读,所以归本件自己的 useFullscreen,不进主图整机。
 * 手势与朝向的每一步见 functions 的 toggleFsAt 一族。
 * 2026-08-28 换装批自 charts.tsx 拆出成件。
 *
 * @author Frank
 * @time 2026-08-28 12:43:43
 */
import { Button } from '@/components/button'
import { PLAIN_BTN_KIND } from './constants'
import { EChart } from './echart'
import { fsClsOf, fsKeyOf } from './functions'
import { useFullscreen } from './hooks'
import type { MarketCanvasIn } from './types'

/**
 * 图与全屏钮。
 *
 * @param props 算好的 option 与取词函数。
 * @returns 全屏容器。
 */
export function MarketCanvas({ option, t }: MarketCanvasIn) {
  const [boxRef, fsv] = useFullscreen()
  return (
    <div ref={boxRef} className={fsv.boxCls}>
      <Button kind={PLAIN_BTN_KIND} onClick={fsv.onFs} className={fsClsOf()}>
        {t(fsKeyOf({ fs: fsv.fs }))}
      </Button>
      <EChart option={option} height={fsv.chartH} />
    </div>
  )
}
