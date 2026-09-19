'use client'
/**
 * 雇主板的筛选区:常用一行(搜索 / 行业 / 省 / 「无经验可投」开关)+「清空」+ 行尾更新时间 ——
 * 职位板同一套形态(站规 jobtable-is-the-standard;2026-09-13 Frank「只需要一个时间即可」:池构建日撤,
 * Updated 自 H1 下那行挪到这里,职位板同位;同日「这个宽度不能和 jobs 那个保持一致吗」:搜索框与两枚下拉
 * 照抄职位板 filterrow 的形 —— 下拉缺省 sm 档量宽、搜索框 sm)。
 * 2026-09-13 雇主板批二:口径下拉与「更多筛选」抽屉(社区 / 职业)退役 —— 行业组是板的第一维,
 * 指定改成带排序的列(Frank 09-12 拍板合表 + 排序列);开关两枚:「无经验可投」(身份预置用:应届 / 无加国经验
 * 的画像默认开)与「有 LMIA 记录」(09-13「这一列删掉,筛选加一个 LMIA 的筛选」:旅转工画像用)。
 * 2026-08-27 换装批自 Employers.tsx 的筛选段提出成文件。
 * 2026-09-18 雇主板换版(Frank「可以参考下 job 页面的布局吗」「省份筛选加了吗」「这种也设计成下拉框?」):
 * 筛选行逐位照职位板 —— 搜索 / 省 / 行业 / 类别 / 更多筛选 / 清除 / 行尾更新时间;两枚胶囊开关(无经验可投、有 LMIA 记录)
 * 改成下拉收进「更多筛选」抽屉,整行不再有胶囊。抽屉样式用的是本域 09-13 退役时留下的 .drawer / .moreBtn 一族。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { POOL_GROUPS, POOL_SECTORS } from '@/lib/employers'
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Search } from '@/components/search'
import { Select } from '@/components/select'
import { ColPicker } from '@/components/table'
import { Updated } from '@/components/time'
import { BTN_SECONDARY, KEY_ENTRY_ON, KEY_LMIA_ON, OPTS_ON, SEARCH_SIZE, TEXT_NONE } from './constants'
import {
  anyFilterOf, broadKeysOf, caretOf, clearBtnClsOf, foldCountOf, makeBroadLabel, makeGroupLabel, makeOnLabel,
  makeProvLabel, makeSectorLabel,
  moreBtnClsOf, onValueOf, pickWordsOf,
} from './functions'
import type { EmployerPanelIn } from './types'
import css from './employers.module.css'

/**
 * 雇主板筛选区。
 *
 * @param props 整机面板(它只读不写)。
 * @returns 常用一行 + 「更多筛选」抽屉。
 */
export function EmployerFilterBar({ p }: EmployerPanelIn) {
  const n = foldCountOf({ f: p.f })
  return (
    <div className={css.filtCol}>
      <div className={css.filtRow}>
        <Search value={p.qDraft} onChange={p.onQDraft} placeholder={p.t('de.qPh')} size={SEARCH_SIZE} />
        <Select value={p.f.prov}
          onChange={p.onProv}
          opts={p.data.provs}
          all={p.t('all.prov')}
          labelOf={makeProvLabel()} />
        {p.f.prov !== TEXT_NONE && (
          <Select value={p.f.city} onChange={p.onCity} opts={p.data.cities} all={p.t('all.city')} />
        )}
        {p.f.city !== TEXT_NONE && p.data.districts.length > 0 && (
          <Select value={p.f.district} onChange={p.onDistrict} opts={p.data.districts} all={p.t('all.district')} />
        )}
        <Select value={p.f.group}
          onChange={p.onGroup}
          opts={POOL_GROUPS}
          all={p.t('de.allGroup')}
          labelOf={makeGroupLabel({ t: p.t })} />
        <Select value={p.f.broad}
          onChange={p.onBroad}
          opts={broadKeysOf(p.data.broads)}
          all={p.t('de.allBroad')}
          labelOf={makeBroadLabel({ t: p.t, lang: p.lang, opts: p.data.broads })} />
        <Select value={p.f.sector}
          onChange={p.onSector}
          opts={POOL_SECTORS}
          all={p.t('de.allSector')}
          labelOf={makeSectorLabel({ t: p.t })} />
        <Button kind={BTN_SECONDARY} className={moreBtnClsOf({ fold: p.fold, n })} onClick={p.onFold}>
          {p.t('filter.more')}
          {n > 0 && <span className={cssOf(css.moreBadge)}>{n}</span>}
          <span className={cssOf(css.caret)}>{caretOf(p.fold)}</span>
        </Button>
        {anyFilterOf({ f: p.f }) && (
          <Button kind={BTN_SECONDARY} className={clearBtnClsOf()} onClick={p.onClear}>
            {p.t('clear')}
          </Button>
        )}
        <div className={css.filtTail}>
          <Updated iso={p.updatedAt} t={p.t} />
          <ColPicker pick={p.pick} boxRef={p.pickRef} words={pickWordsOf({ t: p.t, n: p.pick.n })} />
        </div>
      </div>
      {p.fold && (
        <div className={css.drawer}>
          <div className={css.filtRow}>
            <Select value={onValueOf(p.f.entry)}
              onChange={p.onEntry}
              opts={OPTS_ON}
              all={p.t('de.entryAll')}
              labelOf={makeOnLabel({ t: p.t, k: KEY_ENTRY_ON })} />
            <Select value={onValueOf(p.f.lmia)}
              onChange={p.onLmia}
              opts={OPTS_ON}
              all={p.t('de.lmiaAll')}
              labelOf={makeOnLabel({ t: p.t, k: KEY_LMIA_ON })} />
          </div>
        </div>
      )}
    </div>
  )
}
