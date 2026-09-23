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
 * 2026-09-23 Frank「是把筛选去掉先,因为不常用」:职位类型一行撤掉 —— 下拉、URL 参数 emp、接口参数 fEmp、
 * SQL 条件一并撤(生产 10 条已存筛选里 0 条设过它);表格「工时」「雇佣期」两列照旧。
 * 2026-09-23 Frank「薪职筛选也去掉吧」:薪资一行(年薪、对比中位)同样撤掉 —— 下拉、URL 参数 sal 与 vs、
 * 接口参数 fSal 与 fVs、SQL 条件一并撤(已存筛选 0 条设过);表格「年薪」「vs 中位」两列与按列排序照旧。
 * 2026-09-23 Frank「这部分是不是放到雇主筛选比较好?还是也先去掉」「逻辑应该是先找工作,然后投简历,然后看哪些公司要我。
 * 然后在考虑这些是 AIP RCIP FCIP」「大部分英文用户,他是没有 pr 焦虑的问题的」:移民资格一行(PNP、AIP、试点社区、须 PR)
 * 撤控件。与上两行不同,URL 参数与接口参数照旧能认 —— /start、/plan 带 pnp、aip、pilot 深链进板,「我的匹配」视图用 fElig
 * (同 fScore 撤控件后「深链仍生效」的先例);这四格不再计入折叠徽标,因为折叠区里已没有它们的控件。
 * 2026-09-23 Frank「这个也删掉吧。用户根本不知道什么是 雇主直发」:「仅雇主直发」勾选框撤(已存筛选 0 条勾过)。
 * directOnly 那条布尔管线与「我的匹配」缠在同一批函数里,留待清那一批一起拆,本批只撤控件。
 * 2026-09-23 职业分类改两级(Frank 选「两级:大类 + 职业」,设计稿 docs/design/职业分类两级-20260923.md):「职业分类」一行的
 * 中类、小类两个下拉换成一个「职业」下拉 —— 值是职业码(筛选参数 fNoc,与问卷 / 规划页深链同一个),选项跟着大类与 EE 类别联动、
 * 在招多的在前,显示人话短名;老深链 `?mid=` / `?fine=` 照旧能筛,只是折叠区里不再有它们的控件。
 * 同日 Frank「职业分类筛选,是不是放到全部大类后面比较好」:「职业」下拉挪进常用一行紧跟大类,折叠区「职业分类」一行撤,剩地理、发布两行。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { cssOf } from '@/components/css'
import { Select } from '@/components/select'
import {
  FK, K_ORIGIN, OPTS_ORIGIN,
} from './constants'
import {
  makeCityChange, makePrefixLabel, makeSlotChange, slotOf,
} from './functions'
import type { BoardPanelIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染折叠区。
 *
 * @param props 职位板整台状态机。
 * @returns 两行低频筛选。
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
        <span className={cssOf(css.filtLabel)}>{b.t('col.direct')}</span>
        <Select value={slotOf({ fState: f.fState, k: FK.origin })}
          onChange={makeSlotChange({ fState: f.fState, k: FK.origin })}
          opts={OPTS_ORIGIN} all={b.t('all.origin')} labelOf={makePrefixLabel({ t: b.t, prefix: K_ORIGIN })} />
        <Select value={slotOf({ fState: f.fState, k: FK.source })}
          onChange={makeSlotChange({ fState: f.fState, k: FK.source })}
          opts={f.opts.source} all={b.t('all.source')} />
      </div>
    </div>
  )
}
