'use client'
/**
 * 域内小件:S4b 的切省一行 —— 全国档下拉打头(Frank 2026-08-06「全国 省份 城市 都需要」;
 * 职业×城市粒度现库没有,ETL 侧排下一批,不瞎猜)+ 十省 chips。
 * 省 chips 用全名(#146 站规:英文在前,中韩括注译名;NL 用通行短名);
 * 下拉只显本语言全名(Frank 2026-08-08「全部省那么宽吗」—— 双语并排把控件撑到 460px)。
 * 2026-08-28 换装批自 Pulse.tsx 提出成文件;同批撤掉一处恒假的「全国」Chip 死分支
 * (那一行 `{false && …}` 从来没渲染过,行为一字未变)。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import { Chip } from '@/components/chip'
import { PROVS } from '@/lib/stats'
import { PROV_ALL } from './constants'
import { provChipTextOf, provFullOf, provSelClsOf } from './functions'
import type { ProvChipsIn } from './types'
import css from './start.module.css'

/**
 * 渲染切省一行。
 *
 * @param props 取词函数、界面语言、当前省与两只手柄。
 * @returns 下拉 + chips。
 */
export function ProvChips({ t, lang, prov, onProvSelect, provPickOf }: ProvChipsIn) {
  const opts = []
  const chips = []
  for (const p of PROVS) {
    opts.push(<option key={p} value={p}>{provFullOf(p)}</option>)
    chips.push(
      <Chip key={p} active={p === prov} onClick={provPickOf(p)}>
        {provChipTextOf({ t, lang, code: p })}
      </Chip>,
    )
  }
  return (
    <div className={css.provChips}>
      <select className={provSelClsOf()} value={prov} onChange={onProvSelect}>
        <option value={PROV_ALL}>{t('pulse.s4.all')}</option>
        {opts}
      </select>
      {chips}
    </div>
  )
}
