'use client'
/**
 * pte 域的结构:/pte/[type] 题单页正文 —— Shell 轨 + 头行(H1 / 返回)+ 免责一句 + 白卡
 * (题型胶囊 / 窗口与筛胶囊 / 计数行 / 桌面表或手机卡 / 显示更多)。壳件拼装归页面门。
 * 2026-09-03 批二新立(设计稿 docs/design/PTE刷题-20260903.md,效果图 img/PTE题单-*)。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { Button } from '@/components/button'
import { useLang } from '@/components/i18n'
import { Shell } from '@/components/shell'
import { KIND_LINK, KIND_SECONDARY, SHELL_TOP, URL_PTE } from './constants'
import { cellRowsOf, countTextOf, makeGoBack } from './functions'
import { usePteBoard } from './hooks'
import { PteCards } from './ptecards'
import { PteFilters } from './ptefilters'
import { PteTable } from './ptetable'
import { PteTypeChips } from './ptetypechips'
import type { PteIn } from './types'
import css from './pte.module.css'

/**
 * 题单页正文。
 *
 * @param props 题型维度、当前题型与这一型的全部题(逐格注释见 PteIn)。
 * @returns 正文。
 */
export function Pte({ types, type, rows }: PteIn) {
  const [lang, , t] = useLang()
  const b = usePteBoard({ rows })
  const cells = cellRowsOf({ t, rows: b.shown, done: b.done })
  return (
    <Shell top={SHELL_TOP}>
      <div className={css.track}>
        <div className={css.headRow}>
          <h1 className={css.h1}>{t('pte.title')}</h1>
          <Button kind={KIND_LINK} onClick={makeGoBack({ fallback: URL_PTE })}>{t('pte.back')}</Button>
        </div>
        <div className={css.sub}>{t('pte.disclaimer')}</div>
        <div className={css.card}>
          <PteTypeChips types={types} type={type} lang={lang} />
          <PteFilters t={t} b={b} />
          <div className={css.count}>{countTextOf({ t, win: b.win, n: b.rows.length })}</div>
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
