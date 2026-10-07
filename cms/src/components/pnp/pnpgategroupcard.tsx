'use client'
/**
 * 域内小件:魁省弹框的合并门槛卡 —— 一张「申请门槛」卡,本岗能走的每个通道一小节(小节头:通道的界面语言名,右端该通道的官方来源;
 * 下面是该通道的门槛行,同 PnpGateCard 那份行)。
 * 2026-10-01 三弹框统一(Frank「统一一下 ee pnp aip 弹框的顺序 和 格式」「各个省都检查一下」,看过效果图「可以,做吧」):
 * 魁省原先一通道一张门槛卡排在最前、没有结论卡;改成与其余省同一骨架 —— 通道进「本岗能走的通道」卡,门槛合成这一张。
 *
 * @author Frank
 * @time 2026-10-01 23:39:28
 */
import { Button } from '@/components/button'
import { SRC_BTN_KIND, TARGET_BLANK, TEXT_NONE } from './constants'
import { DrawsHead } from './drawshead'
import { PnpGateRows } from './pnpgaterows'
import type { PnpGateGroupCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染魁省合并门槛卡。
 *
 * @param props 卡标题与各通道洗好的门槛卡。
 * @returns 一张卡;没有通道给 null。
 */
export function PnpGateGroupCard({ title, specs }: PnpGateGroupCardIn) {
  if (specs.length === 0) {
    return null
  }
  const parts = []
  for (const s of specs) {
    let name = s.sub
    if (name === TEXT_NONE) {
      name = s.title
    }
    parts.push(
      <div key={s.title} className={css.gateSec}>
        <div className={css.headRow}>
          <div className={css.gateSecHead}>{name}</div>
          {s.source != null && (
            <Button kind={SRC_BTN_KIND} sm href={s.source.href} target={TARGET_BLANK}>
              {s.source.text}
            </Button>
          )}
        </div>
        <PnpGateRows rows={s.rows} />
      </div>,
    )
  }
  return (
    <div className={css.card}>
      <DrawsHead title={title} source={null} jump={null} />
      {parts}
    </div>
  )
}
