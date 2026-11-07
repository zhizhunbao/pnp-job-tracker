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
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { useLang } from '@/components/i18n'
import { MoreLine } from '@/components/pager'
import { PICKS_FIRST, SWAP_KIND, TEXT_NONE, UPGRADE_KIND } from './constants'
import { lockedRowsOf, pickColsOf, pickRowsOf } from './functions'
import { useLazyCompanies, useLazyTitles, useLockTop } from './hooks'
import { JobList } from './joblist'
import { hiddenPicksOf, picksLockedN, picksOf, picksTotalOf, shownPicksOf, titledPicksOf } from './recommend'
import type { PicksPaneIn } from './types'
import css from './jobs.module.css'

/**
 * 「今日推荐」页签。
 *
 * @param props 取词函数、是不是 Pro 与推荐整机。
 * @returns 换一批 + 表 + 显示更多(或失败一句);还没拉到不渲。
 */
export function PicksPane({ t, pro, p }: PicksPaneIn) {
  const [lang] = useLang()
  const titles = useLazyTitles({ items: titledPicksOf(p.data), lang })
  const cos = useLazyCompanies({ items: picksOf(p.data), lang })
  const lock = useLockTop({ on: p.expanded && pro === false && picksLockedN(p.data) > 0, n: picksLockedN(p.data) })
  if (p.failed) {
    return <div className={cssOf(css.note)}>{t('mj.fail')}</div>
  }
  if (p.data == null) {
    return null
  }
  const rows = pickRowsOf({ items: shownPicksOf({ items: p.data.picks, expanded: p.expanded }), lang, t, titles, cos })
  const locked = lockedRowsOf({ data: p.data, show: p.expanded && pro === false, lang, t, titles })
  const hidden = hiddenPicksOf({ data: p.data, expanded: p.expanded })
  return (
    <>
      {picksTotalOf(p.data) > PICKS_FIRST && (
        <div className={cssOf(css.bar)}><Button kind={SWAP_KIND} sm onClick={p.onSwap}>{t('mj.swap')}</Button></div>
      )}
      {/* eslint-disable-next-line react-hooks/refs -- ref 对象只递给 DOM 挂载,渲染时不读 current */}
      <div className={cssOf(css.lockWrap)} ref={lock.ref}>
        <JobList rows={rows.concat(locked)} cols={pickColsOf({ t })}
          empty={<div className={cssOf(css.note)}>{t('mj.picksEmpty')}</div>} />
        {/* eslint-disable-next-line react-hooks/refs -- top 是 state(useLockTop 量完落的格),不是 ref.current */}
        {lock.top != null && (
          <div className={cssOf(css.lockCover)}
            // eslint-disable-next-line react/forbid-dom-props, react-hooks/refs -- 打码行上沿:量出来的运行时像素(是 state)
            style={{ top: lock.top }}>
            <Button kind={UPGRADE_KIND} xl onClick={p.onUpsell} className={cssOf(css.lockBtn)}>
              {t('mj.unlock', { n: p.data.more })}
            </Button>
          </div>
        )}
      </div>
      {(hidden > 0 || p.expanded) && (
        <MoreLine shown={rows.length} total={rows.length + hidden} loading={false}
          moreText={t('loadMore', { n: hidden, left: hidden })} allText={TEXT_NONE} onMore={p.onExpand}
          foldText={t('fold.up')} onFold={p.onFold} />
      )}
    </>
  )
}
