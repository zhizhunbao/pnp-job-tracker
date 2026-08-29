'use client'
/**
 * stats 域的结构:E8-14 统计主图 —— 一张图回答「在招的是什么工作、在哪、值多少钱」。
 * Frank 拍板「这个大图要做全,作为页面最主要的统计图之一」:横轴三切换(职业 / 省份 / 城市)
 * × 簇内四选 × 右轴叠中位年薪。**全用 echarts 原生**(Frank「不要自己实现」):
 * 簇状柱 = 多 series 共 xAxis、缩放 = dataZoom,不手搓柱子与滑块。
 * 红线(E8-06 起不变):计数类可跨省求和,**中位数不做跨省合并**。
 * 本件只出拼装 —— 现值与手柄在 hooks 的 useMarketChart,算什么画什么在 functions,
 * 三块视图各自成件(控件行 / 更多筛选 / 图与全屏钮)。
 * 2026-08-28 换装批自 charts.tsx(2026-08-26 自 app/(frontend)/stats/ 迁入的那一份)
 * 整体重写成小写件形制。
 *
 * @author Frank
 * @time 2026-08-28 12:43:43
 */
import { FIRST_SCREEN_DEFAULT, LANG_DEFAULT } from './constants'
import { cardClsOf } from './functions'
import { useMarketChart } from './hooks'
import { MarketCanvas } from './marketcanvas'
import { MarketControls } from './marketcontrols'
import { MarketFilters } from './marketfilters'
import type { MarketChartIn } from './types'
import css from './stats.module.css'

/**
 * 统计主图。
 *
 * @param props 四份数据、取词函数、界面语言、通道清单与首屏窗档(见 MarketChartIn 逐格注释)。
 * @returns 主图整卡;数据层没落地时不渲(红线:查不到不出空壳)。
 */
export function MarketChart({
  occ,
  city,
  rows,
  t,
  lang = LANG_DEFAULT,
  channels,
  firstScreen = FIRST_SCREEN_DEFAULT,
}: MarketChartIn) {
  const panel = useMarketChart({ occ, city, rows, t, lang, channels, firstScreen })
  if (panel.empty) {
    return null
  }
  return (
    <div className={cardClsOf()}>
      <MarketControls panel={panel} />
      {panel.more && <MarketFilters panel={panel} />}
      <MarketCanvas option={panel.option} t={t} />
      <div className={css.note}>{t('mkt.note')}</div>
    </div>
  )
}
