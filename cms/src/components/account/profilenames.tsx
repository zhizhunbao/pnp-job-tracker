'use client'
/**
 * 我的档案里一格多个名字(专业、想做的工作;2026-10-09「我的档案」批,Frank「专业可能有多个」):一个名字一组,
 * 竖排;每个名字照名字规范英文在上、界面语译名灰字在下(name 桶 Name,不可点)。
 * 同日 Frank「可以」(想做的工作选了十几个把卡撑得一屏放不下):多于 5 个先摆前 5 个,下面一行「还有 N 个」,点了全摆。
 *
 * @author Frank
 * @time 2026-10-09 23:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Name, subOf } from '@/components/name'
import { PF_MORE_KEY, PLAIN_BTN_KIND } from './constants'
import { pfShownOf } from './functions'
import { usePfFold } from './hooks'
import type { PfNamesIn } from './types'
import css from './account.module.css'

/**
 * 一串名字。
 *
 * @param props 名字、界面语与取词函数。
 * @returns 竖排的名字(折起来时带一行「还有 N 个」)。
 */
export function ProfileNames({ names, lang, t }: PfNamesIn) {
  const f = usePfFold()
  const shown = pfShownOf({ names, open: f.open })
  const rest = names.length - shown.length
  const out = []
  for (const n of shown) {
    out.push(<Name key={n.code} en={n.en} sub={subOf({ lang, zh: n.zh, ko: n.ko })} />)
  }
  return (
    <span className={cssOf(css.pfNames)}>
      {out}
      {rest > 0 && (
        <Button kind={PLAIN_BTN_KIND} onClick={f.onOpen} className={cssOf(css.pfMore)}>
          {t(PF_MORE_KEY, { n: rest })}
        </Button>
      )}
    </span>
  )
}
