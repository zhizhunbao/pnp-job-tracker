'use client'
/**
 * 市级指定学习机构(DLI)卡:公立与私立在学签/毕业工签上的待遇不同,所以公立要标出来。
 * 2026-08-28 换装批自 Advisor.tsx 的 LocationPanel 市级卡组提出成件。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { cssOf } from '@/components/css'
import { CARD_HEAD_CLS, CARD_MD_CLS, CLS_SEP, SPACE } from './constants'
import type { DliCardIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染 DLI 卡。
 *
 * @param props 取词函数与指定学习机构。
 * @returns DLI 卡。
 */
export function DliCard({ t, dli }: DliCardIn) {
  const out = []
  for (const s of dli.top) {
    let tag = null
    if (s.isPublic) {
      tag = <span className={cssOf(css.gnote)}>{t('loc.dliPublic')}</span>
    }
    out.push(
      <div key={s.name} className={cssOf(css.kv) + CLS_SEP + cssOf(css.kvTight)}>
        <span className={cssOf(css.kvV) + CLS_SEP + cssOf(css.listName)}>{s.name}</span>
        {tag}
      </div>,
    )
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>
        {t('loc.dli')}{SPACE}<span className={cssOf(css.gnoteM)}>{t('loc.dliN', { n: dli.count })}</span>
      </div>
      {out}
    </div>
  )
}
