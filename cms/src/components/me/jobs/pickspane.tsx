'use client'
/**
 * me 桶子桶 jobs 的「今日推荐」页签(2026-10-10 批 2,docs/design/我的/我的求职-20261009.md 第 3 节 15b / 16c / 16d):
 * 不答题也推(省按档案 / 时区猜,职业按收藏 / 投过的岗猜);免费号每天 3 条,多出来的锁着,Pro 无上限。
 * 一条没有时出一行「今天没有新推荐」;拉失败出「刷新再试」。
 * 2026-10-12 Frank「这两个要不要合成一个 然后点击显示更多,列出来这个收费部分」:先列 PICKS_FIRST 条,底下通用 pager 桶「显示更多」;
 * 点了 Pro 列出其余真行,免费号列出锁住的几条(并进同一张表,2026-10-12 Frank「隐藏的 和 显示的 要对齐啊」)+ 盖在上面的大钮。
 * 2026-10-13 Frank「这个叫 升级 Pro 用户能明白吗」→ 大钮字「解锁其余 N 条」、付费琥珀;N = 锁住的全部条数 more。
 * 2026-10-13 Frank「这个要不要加个按钮 换一批」→「都要」:「换一批」(推荐多于先列的几条才出),免费号一天换 3 次、再点弹定价框。
 * 2026-10-13 Frank「显示更多之后点开,还需要有收起功能」「收起放边上,显示更多放中间」:展开着同一位置换「收起 ▴」。
 * 2026-11-07 效果图(docs/design/我的/我的框架-20261107.md 2.1):卡头撤(条数挂页签上),「换一批」挪到表上方右端;
 * 一行只留「投递」,「删除」(这一岗以后不再推)撤。
 * 2026-11-07 Frank「现在都按 Azure 的来」:打码行与盖在上面的大钮撤 —— 免费号锁住的在表下一行说「还有 N 条推荐」+
 * 常规大小主钮「解锁其余 N 条」(开定价框;N 仍是锁住的全部条数 more);「显示更多 / 收起」只管没列出来的真行;
 * 「换一批」再挪到页签那一行右端(JobsBody)。
 * 2026-11-11 Frank「别一次性推荐 50 个」「不需要解锁其余」(任务书第 47 条):每天 10 条全列、全免费;显示更多、解锁那一行、
 * 换一批、行上的删除都撤;表下加一颗「看全部同类职位」去职位板(带省与这批推荐的职业码)。
 * 同日 Frank 指着那颗钮说「这个也删掉」:「看全部同类职位」撤(连同去处的算法、职业码下发、钮档与词条)。
 * 2026-11-11 任务书第 41 到 46 条:表里加「推荐指数」列(一枚胶囊;原「点胶囊开弹框」同日 Frank「不要弹框了」
 * 「直接那一列,列 bullets」撤,再改「点击 high 那个按钮时候才显示」:点胶囊在原地展开几条要点);没有职业依据不出表、出引导去填;目标「拿 PR」
 * 而身份、语言成绩、工作年限有没答的,不出表、提示先补哪几项;高中档都没有时出低档,表上方说明一句。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { useLang } from '@/components/i18n'
import { TEXT_NONE } from './constants'
import { pickColsOf, pickRowsOf } from './functions'
import { useFitFold, useLazyCompanies, useLazyTitles } from './hooks'
import { JobList } from './joblist'
import { PicksNote } from './picksnote'
import { needTextOf, onPickListClick, picksOf, titledPicksOf } from './recommend'
import type { PicksPaneIn } from './types'
import css from './jobs.module.css'

/**
 * 「今日推荐」页签。
 *
 * @param props 取词函数与推荐整机。
 * @returns 表(或失败一句);还没拉到不渲。
 */
export function PicksPane({ t, p, onFill }: PicksPaneIn) {
  const [lang] = useLang()
  const titles = useLazyTitles({ items: titledPicksOf(p.data), lang })
  const cos = useLazyCompanies({ items: picksOf(p.data), lang })
  const fold = useFitFold()
  if (p.failed) {
    return <div className={cssOf(css.note)}>{t('mj.fail')}</div>
  }
  if (p.data == null) {
    return null
  }
  if (p.data.basis === false) {
    return <PicksNote text={t('mj.picksNoBasis')} go={t('mj.fillGo')} onGo={onFill} />
  }
  if (p.data.need.length > 0) {
    const fields = needTextOf({ need: p.data.need, t })
    return <PicksNote text={t('mj.picksNeed', { fields })} go={t('mj.fillGo')} onGo={onFill} />
  }
  const rows = pickRowsOf({ items: p.data.picks, fits: p.data.fits, lang, t, titles, cos, fold })
  return (
    <>
      {p.data.lowOnly && <PicksNote text={t('mj.picksLowOnly')} go={TEXT_NONE} onGo={onFill} />}
      <div onClick={onPickListClick}>
        <JobList rows={rows} cols={pickColsOf({ t })}
          empty={<div className={cssOf(css.note)}>{t('mj.picksEmpty')}</div>} />
      </div>
    </>
  )
}
