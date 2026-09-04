'use client'
/**
 * 域内小件:城市卡(形照省卡 ProvCard:名 + 码 + 键值行;省卡是切省的钮,城市卡是落职位板的链接)。
 *
 * @author Frank
 * @time 2026-09-04 22:10:00
 */
import { LinkButton } from '@/components/button'
import { cityCardClsOf } from './functions'
import { KvRow } from './kvrow'
import type { CityCardIn } from './types'
import css from './start.module.css'

/**
 * 渲染一张城市卡。
 *
 * @param props 这一行与取词函数。
 * @returns 链接卡。
 */
export function CityCard({ t, row }: CityCardIn) {
  return (
    <LinkButton href={row.href} className={cityCardClsOf()}>
      <div className={css.provCardHead}>
        <span className={css.provCardName}>{row.name}</span>
        <span className={css.provCardCode}>{row.provCode}</span>
      </div>
      <div className={css.provCardBody}>
        <KvRow k={t('pulse.s4.prov')} v={row.provName} />
        <KvRow k={t('stats.openJobs')} v={<strong>{row.openText}</strong>} />
        <KvRow k={t('stats.new7d')} v={row.new7Text} />
        <KvRow k={t('stats.medWage')} v={row.wageText} />
        <KvRow k={t('stats.named')} v={row.namedText} />
      </div>
    </LinkButton>
  )
}
