'use client'
/**
 * me 桶子桶 profile 的结构:一格多个名字(专业、想做的工作;2026-10-09「我的档案」批,Frank「专业可能有多个」):一个名字一组,
 * 竖排;每个名字照名字规范英文在上、界面语译名灰字在下(name 桶 Name,不可点)。
 * 2026-10-09 Frank「可以」(想做的工作选了十几个把卡撑得一屏放不下):多了先摆前几个。
 * 2026-10-12 Frank「还有 11 个 改成 展开 / 收起,和其他地方一致」:那一行换成全站清单卡的 pager 桶 FoldLine + useFold
 * (「展开其余 N 个 ▾」/「收起 ▴」)。
 * 2026-11-07 照 Fluent 效果图先摆 3 个(原 5 个)。
 * 2026-11-09「我的」第一批:从简历提取、用户保存过的名字后面挂「来自简历」胶囊(值改掉胶囊就没了)。
 * 2026-11-13 Frank「来自简历 删掉」:胶囊撤,上一句作废;名字后面什么都不挂。
 *
 * @author Frank
 * @time 2026-11-07 16:05:00
 */
import { cssOf } from '@/components/css'
import { Name, subOf } from '@/components/name'
import { FoldLine, useFold } from '@/components/pager'
import { PF_FOLD_UNIT_KEY } from './constants'
import { pfHiddenOf, pfShownOf } from './functions'
import type { PfNamesIn } from './types'
import css from './profile.module.css'

/**
 * 一串名字。
 *
 * @param props 名字、界面语与取词函数。
 * @returns 竖排的名字(多于 PF_FOLD_N 个时带展开 / 收起一行)。
 */
export function ProfileNames({ names, lang, t }: PfNamesIn) {
  const hidden = pfHiddenOf(names)
  const f = useFold({ hidden })
  const out = []
  for (const n of pfShownOf({ names, extra: f.extra })) {
    out.push(
      <div key={n.code} className={cssOf(css.nameMark)}>
        <Name en={n.en} sub={subOf({ lang, zh: n.zh, ko: n.ko })} />
      </div>,
    )
  }
  return (
    <div className={cssOf(css.names)}>
      {out}
      <FoldLine t={t}
        unit={t(PF_FOLD_UNIT_KEY)}
        hidden={hidden}
        extra={f.extra}
        busy={false}
        onMore={f.onMore}
        onFold={f.onFold} />
    </div>
  )
}
