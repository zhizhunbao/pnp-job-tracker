'use client'
/**
 * pte 域的结构:/pte/[type] 题单页正文 —— Shell 轨 + 头行(H1)+ 两张白卡:题型四栏面板一张、
 * 题表一张(右上更新时间 / 桌面表或手机卡 / 显示更多)。H1 下一条二级导航(练习 | 模考 | 单词表 | 评分标准 | 考试回忆 | 备考技巧,练习外五面未开;
 * Frank 2026-09-04「上面应该有一个二级导航标题,加两个功能一个是练习,模考」)。壳件拼装归页面门。
 * 2026-09-04 Frank「这个上下应该分成两个 section」「这个筛选都删了」「考生回忆整理不需要显示」:
 * 窗口 / 押题 / 未练过 / 排序四行胶囊与计数行整体撤掉,排序走表头,免责句撤。
 * 2026-09-03 批二新立(设计稿 docs/design/PTE刷题-20260903.md,效果图 img/PTE题单-*)。
 * 同日 Frank「所有主页面都不应该有返回按钮」:题单页是主页面,右上返回撤掉;
 * 「所有的 table 右上角都应该有一个更新时间」:计数行右端挂 Updated(time 桶)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { useMemo } from 'react'
import { Button } from '@/components/button'
import { useLang } from '@/components/i18n'
import { Shell } from '@/components/shell'
import { SectionTabs } from '@/components/tabs'
import { Updated } from '@/components/time'
import {
  KIND_SECONDARY, SHELL_TOP, URL_PTE_MOCK, URL_PTE_RECALL, URL_PTE_SCORING, URL_PTE_TIPS, URL_PTE_WORDS,
} from './constants'
import { cellRowsOf, listHrefOf } from './functions'
import { usePteBoard, usePteDict } from './hooks'
import { PteCards } from './ptecards'
import { PteDict } from './ptedict'
import { PteTable } from './ptetable'
import { PteSections } from './ptesections'
import type { PteIn } from './types'
import css from './pte.module.css'

/**
 * 题单页正文。
 *
 * @param props 题型维度、当前题型与这一型的全部题(逐格注释见 PteIn)。
 * @returns 正文。
 */
export function Pte({ types, type, rows, loggedIn, updatedAt, tiers }: PteIn) {
  const [lang, , t] = useLang()
  const b = usePteBoard({ rows, loggedIn })
  const d = usePteDict()
  const cells = useMemo(function rows() {
    return cellRowsOf({ t, rows: b.shown, done: b.done, tiers, onHoverWord: d.onHoverWord })
  }, [t, b.shown, b.done, tiers, d.onHoverWord])
  return (
    <Shell top={SHELL_TOP}>
      <PteDict t={t} d={d} lang={lang} />
      <div className={css.track}>
        <div className={css.headRow}>
          <h1 className={css.h1}>{t('pte.title')}</h1>
        </div>
        <SectionTabs tabs={[
          { href: listHrefOf({ type }), label: t('pte.tab.practice'), active: true },
          { href: URL_PTE_MOCK, label: t('pte.tab.mock'), disabled: true },
          { href: URL_PTE_WORDS, label: t('pte.tab.words'), disabled: true },
          { href: URL_PTE_SCORING, label: t('pte.tab.scoring'), disabled: true },
          { href: URL_PTE_RECALL, label: t('pte.tab.recall'), disabled: true },
          { href: URL_PTE_TIPS, label: t('pte.tab.tips'), disabled: true },
        ]} />
        <div className={css.card}>
          <PteSections types={types} type={type} lang={lang} t={t} />
        </div>
        <div className={css.card}>
          <div className={css.count}>
            <Updated iso={updatedAt} t={t} />
          </div>
          <PteTable t={t} rows={cells} />
          <PteCards t={t} rows={cells} />
          {b.rest > 0 && (
            <div className={css.moreRow}>
              <Button kind={KIND_SECONDARY} onClick={b.onMore}>{t('pte.more', { n: b.rest })}</Button>
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
