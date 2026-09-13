'use client'
/**
 * 雇主板的筛选区:常用一行(搜索 / 行业 / 省 / 「无经验可投」开关)+「清空」+ 行尾更新时间 ——
 * 职位板同一套形态(站规 jobtable-is-the-standard;2026-09-13 Frank「只需要一个时间即可」:池构建日撤,
 * Updated 自 H1 下那行挪到这里,职位板同位;同日「这个宽度不能和 jobs 那个保持一致吗」:搜索框与两枚下拉
 * 照抄职位板 filterrow 的形 —— 下拉缺省 sm 档量宽、搜索框 sm)。
 * 2026-09-13 雇主板批二:口径下拉与「更多筛选」抽屉(社区 / 职业)退役 —— 行业组是板的第一维,
 * 指定 / LMIA 改成带排序的列(Frank 09-12 拍板合表 + 排序列),开关只留「无经验可投」一个
 * (身份预置用:应届 / 无加国经验的画像默认开)。
 * 2026-08-27 换装批自 Employers.tsx 的筛选段提出成文件。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { POOL_GROUPS } from '@/lib/employers'
import { Button } from '@/components/button'
import { Chip } from '@/components/chip'
import { Search } from '@/components/search'
import { Select } from '@/components/select'
import { Updated } from '@/components/time'
import { BTN_SECONDARY, SEARCH_SIZE } from './constants'
import { anyFilterOf, clearBtnClsOf, makeGroupLabel, makeProvLabel } from './functions'
import type { EmployerPanelIn } from './types'
import css from './employers.module.css'

/**
 * 雇主板筛选区。
 *
 * @param props 整机面板(它只读不写)。
 * @returns 常用一行。
 */
export function EmployerFilterBar({ p }: EmployerPanelIn) {
  return (
    <div className={css.filtCol}>
      <div className={css.filtRow}>
        <Search value={p.qDraft} onChange={p.onQDraft} placeholder={p.t('de.qPh')} size={SEARCH_SIZE} />
        <Select value={p.f.group}
          onChange={p.onGroup}
          opts={POOL_GROUPS}
          all={p.t('de.allGroup')}
          labelOf={makeGroupLabel({ t: p.t })} />
        <Select value={p.f.prov}
          onChange={p.onProv}
          opts={p.data.provs}
          all={p.t('all.prov')}
          labelOf={makeProvLabel({ t: p.t })} />
        <Chip active={p.f.entry} onClick={p.onEntry}>{p.t('de.entry')}</Chip>
        {anyFilterOf({ f: p.f }) && (
          <Button kind={BTN_SECONDARY} className={clearBtnClsOf()} onClick={p.onClear}>
            {p.t('clear')}
          </Button>
        )}
        <Updated iso={p.updatedAt} t={p.t} />
      </div>
    </div>
  )
}
