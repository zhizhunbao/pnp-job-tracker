'use client'
/**
 * pte 域的结构:/pte 门厅 —— H1 + 「开始练习」、总体进度三个数、近 7 天考过的题全列。三张卡,没有卖点文案
 * (Frank 2026-09-03「这个文案读着很别扭」「简陋一些但是清晰,不会有那么多文案废话」)。题型清单在顶栏下拉。
 *
 * @author Frank
 * @time 2026-09-03 20:00:00
 */
import { Button, LinkButton } from '@/components/button'
import { useLang } from '@/components/i18n'
import { Shell } from '@/components/shell'
import { Updated } from '@/components/time'
import { KIND_PRIMARY, NUM_HEAD, SHELL_TOP, SPACE, URL_PTE_START } from './constants'
import { agoTextOf } from './functions'
import { usePteHome } from './hooks'
import type { PteHomeIn } from './types'
import css from './pte.module.css'

/**
 * 门厅正文。
 *
 * @param props 统计、最近考了、登录态与更新时刻(逐格注释见 PteHomeIn)。
 * @returns 正文。
 */
export function PteHome({ stats, recent, loggedIn, updatedAt }: PteHomeIn) {
  const [, , t] = useLang()
  const h = usePteHome({ loggedIn })
  const rows = []
  for (const r of recent) {
    rows.push(
      <LinkButton key={r.qid} href={r.href} className={css.recentRow}>
        <span className={css.recentType}>{r.type}{SPACE}{NUM_HEAD}{r.num}</span>
        <span className={css.recentText}>{r.text}</span>
        <span className={css.recentAgo}>{agoTextOf({ t, iso: r.seen })}</span>
      </LinkButton>,
    )
  }
  return (
    <Shell top={SHELL_TOP}>
      <div className={css.track}>
        <div className={css.headRow}>
          <h1 className={css.h1}>{t('pte.title')}</h1>
        </div>
        <div className={css.sub}>{t('pte.disclaimer')}</div>
        <div className={css.card}>
          <Button kind={KIND_PRIMARY} href={URL_PTE_START} lg>{t('pte.home.start')}</Button>
        </div>
        <div className={css.card}>
          <div className={css.secTitle}>{t('pte.home.progress')}</div>
          <div className={css.stats}>
            <div className={css.stat}>
              <div className={css.statN}>{stats.total}</div>
              <div className={css.statL}>{t('pte.home.total')}</div>
            </div>
            <div className={css.stat}>
              <div className={css.statN}>{h.doneN}</div>
              <div className={css.statL}>{t('pte.home.done')}</div>
            </div>
            <div className={css.stat}>
              <div className={css.statN}>{stats.total - h.doneN}</div>
              <div className={css.statL}>{t('pte.home.left')}</div>
            </div>
          </div>
        </div>
        <div className={css.card}>
          <div className={css.secHead}>
            <div className={css.secTitle}>{t('pte.home.recent')}</div>
            <LinkButton href={URL_PTE_START}>{t('pte.home.all')}</LinkButton>
          </div>
          {rows}
          <div className={css.count}><Updated iso={updatedAt} t={t} /></div>
        </div>
      </div>
    </Shell>
  )
}
