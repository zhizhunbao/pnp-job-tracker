'use client'
/**
 * stats 域的结构:echarts 薄壳。echarts 走**动态 import 懒加载** —— 展开图才拉,
 * 首屏不背它的体积;实例、点击回调转发与三道效果全在 hooks 的 useEChart 里,
 * 本件只负责那一个 div 与它的类。
 * E13-03(2026-08-06):按省 / 按大类的预设四图与自定义区(StatsCharts)随 /stats 索引页
 * 退役一并删,主图折进把脉首页 S4(默认收起);本壳当时留下的 DrillCard 一并删,不留死代码。
 * 2026-08-28 换装批自 charts.tsx 拆出成件。
 *
 * @author Frank
 * @time 2026-08-28 12:43:43
 */
import { chartClsOf } from './functions'
import { useEChart } from './hooks'
import type { EChartIn } from './types'

/**
 * echarts 薄壳。
 *
 * @param props option / 图高 / 点击回调(见 EChartIn 逐格注释)。
 * @returns 画布容器。
 */
export function EChart({ option, height, onBarClick }: EChartIn) {
  const boxRef = useEChart({ option, height, onBarClick })
  return (
    <div ref={boxRef}
      className={chartClsOf({ clickable: onBarClick != null })}
      // eslint-disable-next-line react/forbid-dom-props -- 图高是运行时数据(全屏时撑满视口),有限枚举的类装不下
      style={{ height }} />
  )
}
