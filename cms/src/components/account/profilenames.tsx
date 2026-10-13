'use client'
/**
 * 我的档案里一格多个名字(专业、想做的工作;2026-10-09「我的档案」批,Frank「专业可能有多个」):一个名字一组,
 * 竖排;每个名字照名字规范英文在上、界面语译名灰字在下(name 桶 Name,不可点)。
 * 同日 Frank「可以」(想做的工作选了十几个把卡撑得一屏放不下):多于 5 个先摆前 5 个,下面一行「还有 N 个」,点了全摆。
 * 2026-10-12 Frank「还有 11 个 改成 展开 / 收起,和其他地方一致」:那一行换成全站清单卡的 pager 桶 FoldLine + useFold
 * (「展开 N 个 ▾」/「收起 ▴」,一次展开 FOLD_STEP 个),前 5 个照旧。
 *
 * @author Frank
 * @time 2026-10-09 23:30:00
 */
import { cssOf } from '@/components/css'
import { Name, subOf } from '@/components/name'
import { FoldLine, useFold } from '@/components/pager'
import { PF_FOLD_N, PF_FOLD_UNIT_KEY } from './constants'
import { pfShownOf } from './functions'
import type { PfNamesIn } from './types'
import css from './account.module.css'

/**
 * 一串名字。
 *
 * @param props 名字、界面语与取词函数。
 * @returns 竖排的名字(多于 PF_FOLD_N 个时带展开 / 收起一行)。
 */
export function ProfileNames({ names, lang, t }: PfNamesIn) {
  const f = useFold({ hidden: Math.max(0, names.length - PF_FOLD_N) })
  const shown = pfShownOf({ names, extra: f.extra })
  const out = []
  for (const n of shown) {
    out.push(<Name key={n.code} en={n.en} sub={subOf({ lang, zh: n.zh, ko: n.ko })} />)
  }
  return (
    <span className={cssOf(css.pfNames)}>
      {out}
      <FoldLine t={t}
        unit={t(PF_FOLD_UNIT_KEY)}
        hidden={Math.max(0, names.length - PF_FOLD_N)}
        extra={f.extra}
        busy={false}
        onMore={f.onMore}
        onFold={f.onFold} />
    </span>
  )
}
