'use client'
/**
 * plan 域的结构:还没有分时那两句引导。
 * 估分题还有欠账 → **不出提示**:没填的格子就在下面摆着,右上角还有「算我的分」,
 * 再写一句是废话(2026-08-16 Frank 圈了「答完 7 道估分题看你够不够线」)。
 * 留下的两句说的是**别的事**:表还没取到(得先答完基础卷)/ 本站真没这个省的表。
 * 后者是举证口径,不能省 —— 「官方不公布」与「本站未收录」在用户那儿意思相反
 * (见 CLAUDE.md「官方不公布是需要举证的断言」)。
 * 2026-08-28 换装批第二段自 ScoreLineCard.tsx 的 banner 空态提出成件。
 *
 * @author Frank
 * @time 2026-08-28 02:15:00
 */
import { ScoreLineNote } from './scorelinenote'
import { TONE_MUTE } from './constants'
import { noGridTextOf } from './functions'
import type { ScoreLineEmptyIn } from './types'

/**
 * 渲染还没有分时那句引导。
 *
 * @param props 取词函数、当前页签省、估分段题数、有表的省与那句带举证的说明。
 * @returns 引导框;题就在下面摆着或这个省本来就有表时不出。
 */
export function ScoreLineEmpty({ t, prov, total, gridProvinces, noGridNote }: ScoreLineEmptyIn) {
  if (total > 0) {
    return null
  }
  if (gridProvinces == null) {
    return <ScoreLineNote tone={TONE_MUTE}>{t('sl.needBasic')}</ScoreLineNote>
  }
  if (gridProvinces.includes(prov)) {
    return null
  }
  return <ScoreLineNote tone={TONE_MUTE}>{noGridTextOf({ t, prov, noGridNote })}</ScoreLineNote>
}
