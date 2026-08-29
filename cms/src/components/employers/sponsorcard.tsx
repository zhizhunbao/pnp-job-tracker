'use client'
/**
 * 在招担保雇主的手机卡(唯一消费方 = 把脉页 Pulse 的橱窗)。
 * 货架页 Sponsors 2026-08-08 Frank 拍板下架(/employers 308 → /start),本域只剩这一件
 * 共享渲染件与它背后的列组。
 * 🔴 红线:凭证 = 历史事实 / 官方名录,不是担保承诺。
 * 键值行与桌面表同一套口径:lmia 档多五条 LMIA 数值,named 档且整批有信号时多一条
 * 雇主门槛;卡底那条「看在招岗 →」随桌面「下一步」列一并撤(2026-08-10)——
 * 它与卡头雇主名是同一个落点。
 * 2026-08-27 换装批自 Sponsors.tsx 整体重写(列组迁 functions,值全部先洗成展示行)。
 *
 * @author Frank
 * @time 2026-08-27 23:30:00
 */
import { Card, CardKV } from '@/components/card'
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { KIND_LMIA, KIND_NAMED, TEXT_NONE } from './constants'
import { DashText } from './dashtext'
import { sponsorOpenLabelOf, toSponsorCellRow } from './functions'
import type { SponsorCardIn, SponsorKv } from './types'
import css from './employers.module.css'

/**
 * 在招担保雇主的手机卡。
 *
 * @param props 这一行事实、语言、取词函数、人群档与门槛开关(见 SponsorCardIn 逐格注释)。
 * @returns 一张卡。
 */
export function SponsorCard({ r, lang, t, kind, showVerdict = false }: SponsorCardIn) {
  const row = toSponsorCellRow({ r, t, lang, kind })
  const kv: SponsorKv[] = []
  if (kind === KIND_LMIA) {
    kv.push({ k: t('se.col.w1'), v: <DashText v={row.w1} /> })
    kv.push({ k: t('se.col.w2'), v: <DashText v={row.w2} /> })
    kv.push({ k: t('se.col.w4'), v: <DashText v={row.w4} /> })
    kv.push({ k: t('se.col.lmia'), v: <DashText v={row.lmia} /> })
    kv.push({ k: t('dir.col.skilled'), v: <DashText v={row.skilled} /> })
  }
  kv.push({ k: sponsorOpenLabelOf({ t, kind }), v: <span className={css.num}>{row.openText}</span> })
  kv.push({ k: t('se.col.where'), v: row.where })
  if (kind === KIND_NAMED && showVerdict) {
    kv.push({ k: t('se.col.verdict'), v: <b className={row.verdictCard.cls}>{row.verdictCard.text}</b> })
  }
  return (
    <Card>
      <div className={css.cardTitle}>
        <LinkButton href={row.href} onClick={row.onView} className={cssOf(css.cardLink)}>
          {row.name}
        </LinkButton>
      </div>
      {row.alias !== TEXT_NONE && <div className={css.cardAlias}>{row.alias}</div>}
      <CardKV items={kv} />
    </Card>
  )
}
