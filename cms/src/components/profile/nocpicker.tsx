'use client'
/**
 * 职业选择整块(§3.4):热门 chips 一点即选(只显示职位名藏码;已选的再点取消)
 * + 搜索兜底(命中下拉 + 「加输入框里这一个」小钮)+ 已选标签串(NocTags)。
 * 分类下钻留 wizard(E11-05b),不在这。
 * 命中行显示官方名、没名显示码;搜索框外壳沿用 main.css 的全局 .profNocSearch
 * (历史位置,PROF_SEARCH_CLS 挂着注释)。
 * 2026-08-27 换装批自 ProfileForm.tsx 的职业段提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 22:00:00
 */
import { Button } from '@/components/button'
import { Chip } from '@/components/chip'
import { cssOf } from '@/components/css'
import { Search } from '@/components/search'
import { NOC_SEARCH_SIZE, PLAIN_BTN_KIND, POPULAR_NOCS, PROF_SEARCH_CLS } from './constants'
import { makeNocAdd, makeNocDrop } from './functions'
import { NocTags } from './noctags'
import type { NocPickerIn } from './types'
import css from './profile.module.css'

/**
 * 职业选择整块。
 *
 * @param props 搜索态、选项全集、命中与已选清单(见 NocPickerIn 逐格注释)。
 * @returns 热门 chips + 搜索兜底 + 已选标签。
 */
export function NocPicker({ q, setQ, opts, hits, nocs, setNocs, onAddTyped, t }: NocPickerIn) {
  const popular = []
  for (const p of POPULAR_NOCS) {
    const on = nocs.includes(p.noc)
    let pick = makeNocAdd({ code: p.noc, nocs, setNocs, setQ })
    if (on) {
      pick = makeNocDrop({ code: p.noc, nocs, setNocs })
    }
    popular.push(
      <Chip key={p.noc} onClick={pick} active={on}>
        {t(p.key)}
      </Chip>,
    )
  }
  const hitRows = []
  for (const o of hits) {
    let shown = o.title
    if (shown === '') {
      shown = o.noc
    }
    hitRows.push(
      <div key={o.noc} onClick={makeNocAdd({ code: o.noc, nocs, setNocs, setQ })} className={css.hitRow}>
        {shown}
      </div>,
    )
  }
  return (
    <div>
      <div className={css.fieldNote}>{t('prof.jobPopular')}</div>
      <div className={css.chipsRow}>{popular}</div>
      <div className={PROF_SEARCH_CLS}>
        <Search value={q} onChange={setQ} placeholder={t('prof.nocSearch')} size={NOC_SEARCH_SIZE} />
      </div>
      {q.trim() !== '' && (
        <Button kind={PLAIN_BTN_KIND} onClick={onAddTyped} className={cssOf(css.nocAdd)}>
          {t('prof.nocAdd')}
        </Button>
      )}
      {hits.length > 0 && <div className={css.hitsBox}>{hitRows}</div>}
      <NocTags nocs={nocs} setNocs={setNocs} opts={opts} t={t} />
    </div>
  )
}
