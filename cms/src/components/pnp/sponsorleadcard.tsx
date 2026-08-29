'use client'
/**
 * B1 在招担保雇主 · 弹框雇主线入口(docs/implementation/在招担保雇主/01_B1)。
 * 凭证行(AIP 指定/LMIA 获批)有据才出,无凭证整行不出也不写「无」;
 * 「看该职业的全部担保雇主」链随货架页下架摘除(Frank 08-08)→ company 态无内容可渲,整卡不出。
 * Frank 2026-08-08「按钮风格保持一致」:裸链改站内既有药丸钮(与「打开完整页 ↗」同款;↗=新开页惯例)。
 * 2026-08-28 换装批自 Pnp.tsx 整体重写成小写件形制(裸 <a> 改经 button 族的 LinkButton)。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { LINK_ARROW, TARGET_BLANK, TEXT_NONE } from './constants'
import { makeSponsorClick, sponsorHrefOf, sponsorLinesOf, sponsorShows } from './functions'
import type { SponsorLeadCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染担保引流卡。
 *
 * @param props 本岗、取词函数与来源。
 * @returns 引流卡;没有凭证(或 company 态)时给 null。
 */
export function SponsorLeadCard({ job, t, src }: SponsorLeadCardIn) {
  if (sponsorShows({ job, src }) === false) {
    return null
  }
  const lines = []
  let i = 0
  for (const line of sponsorLinesOf({ t, job })) {
    lines.push(<div key={String(i)} className={css.splRow}>{line}</div>)
    i += 1
  }
  return (
    <div className={css.card}>
      <div className={css.cardHead}>{t('spl.head')}</div>
      {lines}
      {job.company !== TEXT_NONE && (
        <div className={css.splActs}>
          <LinkButton href={sponsorHrefOf(job)}
            target={TARGET_BLANK}
            className={cssOf(css.pillLink)}
            onClick={makeSponsorClick(src)}>
            {t('spl.coJobs')}{LINK_ARROW}
          </LinkButton>
        </div>
      )}
    </div>
  )
}
