'use client'
/**
 * 一个分组的事实一次铺开(E8-10 S6,2026-07-21)。收编前:点「通道」列只渲通道一条
 * —— 弹框标题写着「移民」,里面却只有一个字段,用户还得退出去再点 PNP、再点 EE、
 * 再点 AIP,每点一次烧一次额度。这正是 24 个弹框的病根。
 * 顺序即阅读顺序,先结论后依据;字段 → 分组是一张明表(constants 的 GROUP_SECTIONS),
 * 不是 if 链 —— 一套组件伺候 24 种字段必漏。
 * 2026-08-28 换装批自 Advisor.tsx 的 GroupFactsSection 重写落位。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { makeT } from '@/lib/i18n'
import { CARD_HEAD_CLS, CARD_MD_CLS, FIELD_EE, FIELD_PNP } from './constants'
import { FieldFacts } from './fieldfacts'
import { cardHeadOf, groupKeysOf } from './functions'
import type { GroupFactsIn } from './types'

/**
 * 渲染一组事实。PNP/EE 两节自己拆多卡(判定/抽选/清单各一卡,2026-07-25 与
 * EE 的 Frank「拆成三个卡片吧」),所以不给它们再包壳卡 —— 再包一层就是卡中卡;
 * 标题由判定卡自持,#173「每卡必有 title」不破。
 *
 * @param props 铺哪一组与取数包。
 * @returns 这一组的各张卡。
 */
export function GroupFacts({ group, f }: GroupFactsIn) {
  const t = makeT(f.lang)
  const cards = []
  for (const k of groupKeysOf({ group, f })) {
    if (k === FIELD_PNP || k === FIELD_EE) {
      cards.push(<FieldFacts key={k} field={k} f={f} />)
      continue
    }
    cards.push(
      <div key={k} className={CARD_MD_CLS}>
        <div className={CARD_HEAD_CLS}>{cardHeadOf({ t, field: k })}</div>
        <FieldFacts field={k} f={f} />
      </div>,
    )
  }
  return <>{cards}</>
}
