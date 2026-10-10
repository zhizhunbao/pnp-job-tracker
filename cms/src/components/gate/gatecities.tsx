'use client'
/**
 * 「所在地」那一屏的城市区(2026-10-09「我的档案」批,Frank「所在地 需不需要 选城市」→「可以」):选了省才出 ——
 * 小标题「城市」+ 搜索框 + 城市胶囊(没搜摆本省在招最多的十来个,搜了摆命中的);点了亮,再点取消。选填:不选照旧按全省推。
 * 胶囊照 10-08 例外摆界面语短名(有译名用译名,没有用英文)。
 *
 * @author Frank
 * @time 2026-10-09 22:30:00
 */
import { Chip } from '@/components/chip'
import { cssOf } from '@/components/css'
import { makeOptPick } from '@/components/profile'
import { Search } from '@/components/search'
import { GATE_CITY_KEY, GATE_CITY_PH_KEY, PROV_ABROAD, TEXT_NONE } from './constants'
import type { GatePartIn } from './types'
import css from './gate.module.css'

/**
 * 城市区。
 *
 * @param props 整机面板与取词函数。
 * @returns 城市区;省没选 / 选了境外不出。
 */
export function GateCities({ g, t }: GatePartIn) {
  if (g.provActive === TEXT_NONE || g.provActive === PROV_ABROAD) {
    return null
  }
  const chips = []
  for (const c of g.cities.opts) {
    chips.push(
      <Chip key={c.name} active={g.cities.city === c.name}
        onClick={makeOptPick({ value: c.name, onPick: g.cities.onCity })}>
        {c.label}
      </Chip>,
    )
  }
  return (
    <div className={cssOf(css.cities)}>
      <div className={cssOf(css.cityHead)}>{t(GATE_CITY_KEY)}</div>
      <Search value={g.cities.q} onChange={g.cities.onQ} placeholder={t(GATE_CITY_PH_KEY)} />
      <div className={cssOf(css.cityChips)}>{chips}</div>
    </div>
  )
}
