'use client'
/**
 * 市级 AIP 指定雇主卡(Frank 走查#7:直接内联列出名单,不再「雇主名录 →」点过去)。
 * 客户端筛已加载的名录,口径对齐后端(province + location 含 city)。
 * 2026-08-28 换装批自 Advisor.tsx 的 LocationPanel 市级卡组提出成件。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { cssOf } from '@/components/css'
import { CARD_HEAD_CLS, CARD_MD_CLS, SPACE } from './constants'
import type { AipEmployersCardIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染 AIP 指定雇主卡。
 *
 * @param props 取词函数与本市的指定雇主。
 * @returns 指定雇主卡。
 */
export function AipEmployersCard({ t, list }: AipEmployersCardIn) {
  const out = []
  for (const e of list) {
    let tag = null
    if (e.isTech) {
      tag = <span className={cssOf(css.listTag)}>{t('fact.aipTech')}</span>
    }
    out.push(
      <div key={e.name + e.location} className={cssOf(css.listRow)}>
        <span className={cssOf(css.listName)}>{e.name}</span>
        {tag}
      </div>,
    )
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>
        {t('loc.aip')}{SPACE}<span className={cssOf(css.gnoteM)}>{t('loc.aipN', { n: list.length })}</span>
      </div>
      <div className={cssOf(css.list)}>{out}</div>
    </div>
  )
}
