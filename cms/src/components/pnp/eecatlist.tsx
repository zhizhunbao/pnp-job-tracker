'use client'
/**
 * 域内小件:一个 EE 类别的职业清单(可折叠的类别头 + 职业行)。
 * Frank 走查#16:「类别清单」标签删 —— 类别名(如「医疗社服 37 个职业」)本身即 title。
 * 清单一律默认展开(「每个职位怎么没了」),想收再点头折。
 * 2026-07-25 Frank:每类别可折叠 + 职业带界面语言译名 + 展开全量不内嵌滚动(与 PNP 清单同规格)。
 * 2026-08-28 换装批自 Pnp.tsx 的 EeCategorySection 拆出成文件(可点的类别头改经 button 族)。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { eeDisplay } from '@/lib/jobs'
import { PLAIN_BTN_KIND } from './constants'
import { caretOf, catNameClsOf, occRowsOf } from './functions'
import { EeOccRow } from './eeoccrow'
import type { EeCatListIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染一个类别的职业清单。
 *
 * @param props 取词函数、界面语言、译名开关、这个类别、本岗职业码、字典、展开态与 ref 盒。
 * @returns 类别清单。
 */
export function EeCatList({ t, lang, showZh, cat, noc, nocRows, open, onToggle, matchRef }: EeCatListIn) {
  const rows = []
  for (const r of occRowsOf({ t, lang, showZh, cat, noc, nocRows })) {
    rows.push(<EeOccRow key={r.key} r={r} matchRef={matchRef} />)
  }
  return (
    <div className={css.cat}>
      <Button kind={PLAIN_BTN_KIND} className={cssOf(css.catHead)} onClick={onToggle}>
        <span className={catNameClsOf({ lg: true })}>{eeDisplay({ t, label: cat.label })}</span>
        <span className={css.catN}>{t('eelist.count', { n: cat.occupations.length })}</span>
        <span className={css.catCaret}>{caretOf(open)}</span>
      </Button>
      {open && <div className={css.mt6}>{rows}</div>}
    </div>
  )
}
