'use client'
/**
 * 区级在招最多的雇主卡(Frank「点区看区的信息」)。有公司页的名字点得进去,
 * 没有 slug 的只出名字 —— 不做死链。
 * 2026-08-28 换装批自 Advisor.tsx 的 LocationPanel 区级卡组提出成件。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { CARD_HEAD_CLS, CARD_MD_CLS, CLS_SEP, TEXT_NONE, URL_COMPANY_HEAD } from './constants'
import { numOf } from './functions'
import type { DistrictEmployersIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染区级雇主卡。
 *
 * @param props 取词函数与区内在招最多的雇主。
 * @returns 雇主卡。
 */
export function DistrictEmployers({ t, employers }: DistrictEmployersIn) {
  const out = []
  for (const e of employers) {
    let name = <span className={cssOf(css.kvV) + CLS_SEP + cssOf(css.listName)}>{e.name}</span>
    if (e.slug !== TEXT_NONE) {
      name = (
        <LinkButton href={URL_COMPANY_HEAD + e.slug} className={cssOf(css.valueLink) + CLS_SEP + cssOf(css.listName)}>
          {e.name}
        </LinkButton>
      )
    }
    out.push(
      <div key={e.name + e.slug} className={cssOf(css.kv) + CLS_SEP + cssOf(css.kvTight)}>
        {name}
        <span className={cssOf(css.gnote)}>{t('loc.nJobs', { n: numOf(e.n) })}</span>
      </div>,
    )
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>{t('loc.distEmployers')}</div>
      {out}
    </div>
  )
}
