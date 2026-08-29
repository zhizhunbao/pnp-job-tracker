'use client'
/**
 * 域内小件:职业榜的一张分榜(子标题 + 榜身)。四张分榜按用户决策顺序排:
 * 先排除(不在任何省紧缺清单且有省完全无路)→ 有兜底 → 有通道但在降温 → 有通道且在升温。
 * 口径说明句与悬停提示 2026-08-06 全撤(Frank「tooltips 都去掉」),榜题裸标题;
 * 「≠推荐」小注 08-10 也拍掉(解释类文案一律不留,靠表题自解释或问顾问)。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { boardGapClsOf } from './functions'
import { OccBoard } from './occboard'
import { Sec } from './sec'
import type { OccBoardSecIn } from './types'

/**
 * 渲染一张分榜。
 *
 * @param props 榜题、本榜的行与三个列形开关。
 * @returns 子标题 + 榜身。
 */
export function OccBoardSec({ t, lang, nocProvs, rows, title, gap, showProvs, deadCol, flatDelta }: OccBoardSecIn) {
  return (
    <div className={boardGapClsOf({ gap })}>
      <Sec title={title} sub>
        <OccBoard rows={rows}
          t={t}
          lang={lang}
          nocProvs={nocProvs}
          showProvs={showProvs}
          deadCol={deadCol}
          flatDelta={flatDelta} />
      </Sec>
    </div>
  )
}
