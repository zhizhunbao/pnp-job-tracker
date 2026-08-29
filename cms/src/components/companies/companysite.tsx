'use client'
/**
 * K 调查简介卡底下的官网行:链接 + 一句「来自检索」小注。
 * 2026-08-28 拆域批自 jobs/Company.tsx 的 site 闭包重写成件。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { CLS_SEP, LINK_CLS, TARGET_BLANK, TEXT_NONE } from './constants'
import type { CompanySiteIn } from './types'
import css from './companies.module.css'

/**
 * 简介卡底的官网行;没查到官网时整行不渲。
 *
 * @param props 官网、取词函数与扁平态(逐格注释见 CompanySiteIn)。
 * @returns 官网行。
 */
export function CompanySite({ website, t, flat }: CompanySiteIn) {
  if (website === TEXT_NONE) {
    return null
  }
  let cls = cssOf(css.site)
  if (flat) {
    cls = cssOf(css.site) + CLS_SEP + cssOf(css.flatBody)
  }
  return (
    <div className={cls}>
      <LinkButton href={website} target={TARGET_BLANK} className={cssOf(css.siteLink) + CLS_SEP + LINK_CLS}>
        {website}
      </LinkButton>
      <span className={css.siteNote}>{t('fact.aiSite')}</span>
    </div>
  )
}
