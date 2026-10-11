'use client'
/**
 * 「今日推荐 N」卡 + 「更多推荐 N」卡(2026-10-10 批 2,docs/design/我的/我的求职-20261009.md 第 3 节 15b / 16c / 16d):
 * 不答题也推(省按档案 / 时区猜,职业按收藏 / 投过的岗猜);免费号每天 3 条,多出来的进「更多推荐」卡锁着,Pro 无上限。
 * 一条没有时出一行「今天没有新推荐」;拉失败出「刷新再试」。「升级 Pro」开全站同一个定价框。
 * 同日 lead 对效果图:推荐行改走 JobList(网页端通用表格:职位 / 公司 / 地址 / 薪资 / 工时 / 雇佣期 / 发布 / 截止 / 为什么推荐 / 操作;
 * 手机一岗一张卡),原推荐横行 PickRow 撤。
 *
 * @author Frank
 * @time 2026-10-10 10:00:00
 */
import { useLang } from '@/components/i18n'
import { PricingModal } from '@/components/pricing'
import { ANCHOR_PICKS } from './constants'
import { pickColsOf, pickRowsOf, picksOf } from './functions'
import { useLazyTitles, usePicks } from './hooks'
import { JobList } from './joblist'
import { MorePicks } from './morepicks'
import { Section } from './section'
import type { PicksIn } from './types'
import css from './myjobs.module.css'

/**
 * 推荐两张卡。
 *
 * @param props 取词函数、是不是 Pro、重拉代数与答档案代数。
 * @returns 今日推荐卡(免费号推荐多时再加更多推荐卡)。
 */
export function Picks({ t, pro, gen, asked }: PicksIn) {
  const [lang] = useLang()
  const p = usePicks({ gen, asked })
  const titles = useLazyTitles({ items: picksOf(p.data), lang })
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
  const rows = pickRowsOf({ items: p.data.picks, lang, t, titles })
  return (
    <>
      <Section title={t('mj.picks')} count={p.data.picks.length} anchor={ANCHOR_PICKS}>
        <JobList rows={rows} cols={pickColsOf({ t })} empty={<div className={css.note}>{t('mj.picksEmpty')}</div>} />
      </Section>
      {pro === false && p.data.more > 0 && (
        <MorePicks t={t} more={p.data.more} locked={p.data.locked} onUpgrade={p.onUpsell} />
      )}
      {p.upsell && <PricingModal t={t} loggedIn pro={pro} onClose={p.onUpsellClose} />}
    </>
  )
}
