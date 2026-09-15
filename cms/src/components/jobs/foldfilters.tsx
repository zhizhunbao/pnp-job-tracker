'use client'
/**
 * #59 折叠区:低频筛选(市/区、中/小类、PNP/AIP/试点/类型/年薪/对比中位/直发/身份预筛)。
 * state 全保留 = 老保存筛选照常生效。
 * PNP / 年薪:原在常用一行,2026-08-16 下沉至此(方案 B,Frank「上面这一行太长了吧」);
 * 年薪排到「对比中位」旁,两条薪资维度同处。
 * gig = 兼职∪casual∪seasonal(E6-06);未标注岗选类型自然不命中,与「未分类」同一诚实口径。
 * RCIP/FCIP 试点社区(E6-11):yes = 任一命中,RCIP/FCIP = 指定类型。
 * GAP1③:排除 JD 明确不担保/须 PR 的岗(红旗 = 数据层检测;未检出 = 通过,非担保保证)。
 * 2026-08-28 换装批自 Jobs.tsx 提出成文件。
 * 2026-08-29 Frank 实拍:「仅雇主直发」「排除不担保/须 PR」两颗复选框的 title 悬浮提示撤掉 ——
 * 2026-08-06 拍板「消费页 tooltips 全撤,靠列名自解释」的两条漏网。只撤属性,label 文案照旧。
 * 2026-09-14 Frank「全部市提到全部省后面吧」:市下拉升到常用一行紧挨省,地区行只剩区。
 * 2026-09-15 Frank「可以放下来吧,如果选择市 用户可以在 input 里面输入 更方便一些。现在市太多了」:
 * 市下拉退回本区地理行,紧挨区之前(区是市的联动下级);常用一行靠搜索框打字找城市。
 * 2026-09-15 Frank「筛选也分两个吧」「一个是渠道 一个是来源」「同时把其他这个也拆一下分类吧」:「其他」一行拆成四行 ——
 * 移民资格(PNP、AIP、试点社区、须 PR)、职位类型、薪资(年薪、对比中位)、发布(渠道、来源、仅雇主直发);
 * 渠道与来源两个下拉是新加的(参数 org / src 早就有,只是板上没控件)。行名全用现成词条;「发布」行借表格
 * 「发布」列同一个词条 col.direct,术语一致,也免得「来源」行里再放「全部来源」重字。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { Select } from '@/components/select'
import {
  ELIG_OK, FK, INPUT_CHECKBOX, K_EMP, K_ORIGIN, K_SAL, K_VS, OPTS_EMP, OPTS_ORIGIN, OPTS_PILOT, OPTS_SAL, OPTS_VS,
  OPTS_YES_NO,
} from './constants'
import {
  checkClsOf, makeCatLabel, makeCheckChange, makeCityChange, makeEligChange, makeMidChange, makeOptLabel,
  makePilotLabel, makePrefixLabel, makeSlotChange, slotOf,
} from './functions'
import type { BoardPanelIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染折叠区。
 *
 * @param props 职位板整台状态机。
 * @returns 六行低频筛选。
 */
export function FoldFilters({ b }: BoardPanelIn) {
  const f = b.filters
  return (
    <div className={cssOf(css.fold)}>
      <div className={cssOf(css.ctl)}>
        <span className={cssOf(css.filtLabel)}>{b.t('filter.geo')}</span>
        <Select value={slotOf({ fState: f.fState, k: FK.city })}
          onChange={makeCityChange(f.fState)}
          opts={f.opts.city} all={b.t('all.city')} />
        <Select value={slotOf({ fState: f.fState, k: FK.district })}
          onChange={makeSlotChange({ fState: f.fState, k: FK.district })}
          opts={f.opts.district} all={b.t('all.district')} />
      </div>
      <div className={cssOf(css.ctl)}>
        <span className={cssOf(css.filtLabel)}>{b.t('filter.cat')}</span>
        <Select value={slotOf({ fState: f.fState, k: FK.mid })} onChange={makeMidChange(f.fState)}
          opts={f.opts.mid} all={b.t('all.mid')} labelOf={makeCatLabel(b.t)} />
        <Select value={slotOf({ fState: f.fState, k: FK.fine })}
          onChange={makeSlotChange({ fState: f.fState, k: FK.fine })}
          opts={f.opts.fine} all={b.t('all.fine')} labelOf={makeCatLabel(b.t)} />
      </div>
      <div className={cssOf(css.ctl)}>
        <span className={cssOf(css.filtLabel)}>{b.t('filter.elig')}</span>
        <Select value={slotOf({ fState: f.fState, k: FK.pnp })}
          onChange={makeSlotChange({ fState: f.fState, k: FK.pnp })}
          opts={OPTS_YES_NO} all={b.t('all.pnp')} labelOf={makeOptLabel(b.t)} />
        <Select value={slotOf({ fState: f.fState, k: FK.aip })}
          onChange={makeSlotChange({ fState: f.fState, k: FK.aip })}
          opts={OPTS_YES_NO} all={b.t('all.aip')} labelOf={makeOptLabel(b.t)} />
        <Select value={slotOf({ fState: f.fState, k: FK.pilot })}
          onChange={makeSlotChange({ fState: f.fState, k: FK.pilot })}
          opts={OPTS_PILOT} all={b.t('all.pilot')} labelOf={makePilotLabel(b.t)} />
        <label className={checkClsOf(slotOf({ fState: f.fState, k: FK.elig }) === ELIG_OK)}>
          <input type={INPUT_CHECKBOX} checked={slotOf({ fState: f.fState, k: FK.elig }) === ELIG_OK}
            onChange={makeEligChange(f.fState)} />
          {b.t('eligOnly')}
        </label>
      </div>
      <div className={cssOf(css.ctl)}>
        <span className={cssOf(css.filtLabel)}>{b.t('filter.emp')}</span>
        <Select value={slotOf({ fState: f.fState, k: FK.emp })}
          onChange={makeSlotChange({ fState: f.fState, k: FK.emp })}
          opts={OPTS_EMP} all={b.t('all.emp')} labelOf={makePrefixLabel({ t: b.t, prefix: K_EMP })} />
      </div>
      <div className={cssOf(css.ctl)}>
        <span className={cssOf(css.filtLabel)}>{b.t('filter.salary')}</span>
        <Select value={slotOf({ fState: f.fState, k: FK.sal })}
          onChange={makeSlotChange({ fState: f.fState, k: FK.sal })}
          opts={OPTS_SAL} all={b.t('all.sal')} labelOf={makePrefixLabel({ t: b.t, prefix: K_SAL })} />
        <Select value={slotOf({ fState: f.fState, k: FK.vs })}
          onChange={makeSlotChange({ fState: f.fState, k: FK.vs })}
          opts={OPTS_VS} all={b.t('all.vs')} labelOf={makePrefixLabel({ t: b.t, prefix: K_VS })} />
      </div>
      <div className={cssOf(css.ctl)}>
        <span className={cssOf(css.filtLabel)}>{b.t('col.direct')}</span>
        <Select value={slotOf({ fState: f.fState, k: FK.origin })}
          onChange={makeSlotChange({ fState: f.fState, k: FK.origin })}
          opts={OPTS_ORIGIN} all={b.t('all.origin')} labelOf={makePrefixLabel({ t: b.t, prefix: K_ORIGIN })} />
        <Select value={slotOf({ fState: f.fState, k: FK.source })}
          onChange={makeSlotChange({ fState: f.fState, k: FK.source })}
          opts={f.opts.source} all={b.t('all.source')} />
        <label className={checkClsOf(f.directOnly)}>
          <input type={INPUT_CHECKBOX} checked={f.directOnly} onChange={makeCheckChange(f.onDirect)} />
          {b.t('directOnly')}
        </label>
      </div>
    </div>
  )
}
