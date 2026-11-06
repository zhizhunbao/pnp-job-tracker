'use client'
/**
 * 域内小件:S1 的一张脉象卡(纯展示,不可点)。卡内容居中(2026-08-06 Frank「都缩在左上角」),
 * 数字主、标签副。
 * ⚠️ 旧版这张卡的数据里还带着一格 `tip`(悬停口径)与一行 `sub`(环比副行):
 * tooltips 2026-08-06 全撤(靠标签自解释),环比副行 08-07 Frank 拍板删(「那个绿字没用」)
 * —— 两格自那以后就再没渲染过,2026-08-28 换装批据实撤掉,行为一字未变。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 * 2026-11-05 Frank「这四个卡片去掉点击」:整卡链接(去职位板)与点击埋点撤,改成静态卡。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import type { NumCardIn } from './types'

/**
 * 渲染一张脉象卡。
 *
 * @param props 这张卡的展示行。
 * @returns 一张静态卡。
 */
export function NumCard({ card }: NumCardIn) {
  return (
    <div>
      <b>{card.value}</b>
      <span>{card.label}</span>
    </div>
  )
}
