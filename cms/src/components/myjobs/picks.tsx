'use client'
/**
 * 「今日推荐 N」卡(2026-10-10 批 2,docs/design/我的/我的求职-20261009.md 第 3 节 15b / 16c / 16d):
 * 不答题也推(省按档案 / 时区猜,职业按收藏 / 投过的岗猜);免费号每天 3 条,多出来的进「更多推荐」卡锁着,Pro 无上限。
 * 一条没有时出一行「今天没有新推荐」;拉失败出「刷新再试」。「升级 Pro」开全站同一个定价框。
 * 同日 lead 对效果图:推荐行改走 JobList(网页端通用表格:职位 / 公司 / 地址 / 薪资 / 工时 / 雇佣期 / 发布 / 截止 / 为什么推荐 / 操作;
 * 手机一岗一张卡),原推荐横行 PickRow 撤。
 * 2026-10-12 Frank「这两个要不要合成一个 然后点击显示更多,列出来这个收费部分」:「更多推荐」卡并进这张卡 —— 卡头数字 = 全部条数,
 * 先列 PICKS_FIRST 条,底下通用 pager 桶「显示更多」;点了 Pro 列出其余真行,免费号列出锁住的几条 + 「升级 Pro」。
 * 2026-10-12 Frank「隐藏的 和 显示的 要对齐啊」「上下要对齐。有 中文 灰字的 要加上」:打码的几条不再另起一块,并进同一张表(列宽一致、职位名带灰字);「升级 Pro」大钮按量出来的打码行上沿盖上去。
 * 2026-10-12 Frank「这个按钮部分 也没改 看着有点单薄」:「升级 Pro」钮放到最大号(xl)、加宽、垫蓝色投影。
 *
 * @author Frank
 * @time 2026-10-10 10:00:00
 */
import { Button } from '@/components/button'
import { useLang } from '@/components/i18n'
import { MoreLine } from '@/components/pager'
import { PricingModal } from '@/components/pricing'
import { AskDelModal } from './askdelmodal'
import { ANCHOR_PICKS, TEXT_NONE, UPGRADE_KIND } from './constants'
import { lockedRowsOf, pickColsOf, pickRowsOf } from './functions'
import { useAskDel, useLazyCompanies, useLazyTitles, useLockTop, usePicks } from './hooks'
import { JobList } from './joblist'
import { hiddenPicksOf, picksLockedN, picksOf, picksTotalOf, shownPicksOf, titledPicksOf } from './recommend'
import { Section } from './section'
import type { PicksIn } from './types'
import css from './myjobs.module.css'

/**
 * 推荐卡。
 *
 * @param props 取词函数、是不是 Pro、重拉代数与答档案代数。
 * @returns 今日推荐卡。
 */
export function Picks({ t, pro, gen, asked }: PicksIn) {
  const [lang] = useLang()
  const p = usePicks({ gen, asked })
  const titles = useLazyTitles({ items: titledPicksOf(p.data), lang })
  const cos = useLazyCompanies({ items: picksOf(p.data), lang })
  const del = useAskDel()
  const lock = useLockTop({ on: p.expanded && pro === false && picksLockedN(p.data) > 0, n: picksLockedN(p.data) })
  if (p.failed) {
    return (
      <Section title={t('mj.picks')} count={null} anchor={ANCHOR_PICKS}>
        <div className={css.note}>{t('mj.fail')}</div>
      </Section>
    )
  }
  if (p.data == null) {
    return null
  }
  const items = shownPicksOf({ items: p.data.picks, expanded: p.expanded })
  const rows = pickRowsOf({ items, lang, t, titles, cos, data: p.data, setData: p.setData, setAsk: del.setAsk })
  const locked = lockedRowsOf({ data: p.data, show: p.expanded && pro === false, lang, t, titles })
  const hidden = hiddenPicksOf({ data: p.data, expanded: p.expanded })
  return (
    <>
      <Section title={t('mj.picks')} count={picksTotalOf(p.data)} anchor={ANCHOR_PICKS}>
        {/* eslint-disable-next-line react-hooks/refs -- ref 对象只递给 DOM 挂载,渲染时不读 current */}
        <div className={css.lockWrap} ref={lock.ref}>
          <JobList rows={rows.concat(locked)} cols={pickColsOf({ t })}
            empty={<div className={css.note}>{t('mj.picksEmpty')}</div>} />
          {/* eslint-disable-next-line react-hooks/refs -- top 是 state(useLockTop 量完落的格),不是 ref.current */}
          {lock.top != null && (
            <div className={css.lockCover}
              // eslint-disable-next-line react/forbid-dom-props, react-hooks/refs -- 打码行上沿:量出来的运行时像素(是 state)
              style={{ top: lock.top }}>
              <Button kind={UPGRADE_KIND} xl onClick={p.onUpsell} className={css.lockBtn}>{t('mj.upgrade')}</Button>
            </div>
          )}
        </div>
        {hidden > 0 && (
          <MoreLine shown={rows.length} total={rows.length + hidden} loading={false}
            moreText={t('loadMore', { n: hidden })} allText={TEXT_NONE} onMore={p.onExpand} />
        )}
      </Section>
      {p.upsell && <PricingModal t={t} loggedIn pro={pro} onClose={p.onUpsellClose} />}
      <AskDelModal t={t} a={del} />
    </>
  )
}
