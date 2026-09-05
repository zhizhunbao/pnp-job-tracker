'use client'
/**
 * 域内小件:S1 判决区 —— banner + 四脉象卡(banner 下方;毛玻璃合并版试过一轮,
 * Frank 2026-08-06「还是放下来吧」。副题口号已删,调性靠数字自己立)。
 * banner 口号 08-07 Frank 拍板删(「你的下一步,用数据算出来」);图上叠页名 08-09 Frank
 * 「这个文字是不是应该删了」→ 切 #267 方案B:视觉纯图,H1 文字 sr-only 保留
 * (裸删 = #267 空 H1 复发,SEO / 无障碍双输);页 title 不受影响。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 * 2026-09-05 /fe banner(Frank「每个页面的 banner 保持一致大小」):200 加高档撤编,与全站同 130。
 * 同日 Frank 拍板 banner 文字统一(图标 + 页名 + 一句副题):#267 方案B 的 sr-only 撤编,页名与副题回图上。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { BANNER_IMGS, Banner } from '@/components/banner'
import { IconTarget } from '@/components/icons'
import { BANNER_MODULE } from './constants'
import { Band } from './band'
import { NumCard } from './numcard'
import type { HeroIn } from './types'
import css from './start.module.css'

/**
 * 渲染判决区。
 *
 * @param props 取词函数与四张脉象卡。
 * @returns hero 色带。
 */
export function Hero({ t, cards }: HeroIn) {
  const items = []
  for (const c of cards) {
    items.push(<NumCard key={c.label} card={c} />)
  }
  return (
    <Band hero>
      <Banner module={BANNER_MODULE}
        icon={<IconTarget />}
        title={t('pulse.entry')}
        sub={t('pulse.bnSub')}
        images={BANNER_IMGS.home} />
      {cards.length > 0 && <div className={css.nums}>{items}</div>}
    </Band>
  )
}
