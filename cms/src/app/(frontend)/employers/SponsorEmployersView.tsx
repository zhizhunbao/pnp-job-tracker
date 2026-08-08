'use client'
// 在招担保雇主·三分表共用列组与手机卡(唯一消费方=把脉页 StartView 橱窗)。
// 货架页 SponsorEmployersView Frank 08-08 拍板下架(/employers 308 → /start),本文件只剩共享渲染件。
// 红线:凭证=历史事实/官方名录,非担保承诺。
import { streamDisplay, type Lang, type TFn } from '../jobs/i18n'
import { track } from '@/lib/track'
import { Card, CardKV, UI } from '../ui/primitives'
import { type SponsorEmployerRow } from '@/lib/sponsorEmployers'

// 所在地压缩(Frank 文案铁律:不折行不杂糅):单省=市+省全名;两省=省全名并列;≥3 省=「N 省」
// 省一律两字码(Frank 08-08「省可以用缩写」);单省带市,多省列码,≥4 省收「N 省」
function whereText(r: SponsorEmployerRow, t: TFn): string {
  if (!r.provs.length) return r.city || '—'
  if (r.provs.length === 1) return [r.city, r.provs[0]].filter(Boolean).join(' ')
  if (r.provs.length <= 3) return r.provs.join(t('se.where.sep'))
  return t('se.where.multi', { n: r.provs.length })
}

// 按人群分表的列组(Frank 08-08 三拍:每表只描述自己那条通道):
// lmia 表(没工签→要雇主办 LMIA):获批量/技能类/最近季度;
// named 表(有工签→要打包省提名):Frank 08-08 二拍「看的是省提名资质,不是 LMIA」——
//   列=命中省清单(具名清单标签);担保档/「担保过 PR」(正则全库 0 命中的死列)撤出本表;
// aip 表(去海洋省):指定身份即表题,行内只留 在招/所在地;'' = 三凭证并列总览。
const NIL = <span style={{ color: '#9ca3af' }}>—</span>
export type SponsorKind = '' | 'aip' | 'lmia' | 'named'
export function sponsorEmployerCols(t: TFn, lang: Lang, kind: SponsorKind = '') {
  // Frank 08-08「胶囊和中文应该弄两列」:别名/担保档从雇主格拆出各占一列(EN 界面无别名,列整体不出)
  const name = { key: 'name', label: t('dir.col.employer'), sort: (r: SponsorEmployerRow) => r.name.toLowerCase(), render: (r: SponsorEmployerRow) => (
    <a href={`/?q=${encodeURIComponent(r.name)}`} onClick={() => track('se-view-jobs')} style={{ color: UI.primary, textDecoration: 'none', fontWeight: 600 }}>{r.name}</a>
  ) }
  const alias = { key: 'alias', label: t('se.col.alias'), sort: (r: SponsorEmployerRow) => (lang === 'zh' ? r.aliasZh : r.aliasKo) || null, render: (r: SponsorEmployerRow) => {
    const v = lang === 'zh' ? r.aliasZh : r.aliasKo
    return v ? <span style={{ color: '#6b7280', fontSize: 12.5 }}>{v}</span> : NIL
  } }
  // #277：AIP 兜底档（g=3 且零 LMIA）不再渲「办过 LMIA」——AIP 列已有 ✓，此格显「—」不撒谎
  const aipOnly = (r: SponsorEmployerRow) => r.sponsorGrade === 3 && !r.lmiaPositions && r.aip
  const grade = { key: 'grade', label: t('se.col.grade'), nowrap: true, sort: (r: SponsorEmployerRow) => r.sponsorGrade ?? null, render: (r: SponsorEmployerRow) => (
    r.sponsorGrade != null && !aipOnly(r)
      ? <span title={t('gr.sponsorTip')} style={{ fontSize: 10.5, padding: '1px 7px', borderRadius: 999, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', whiteSpace: 'nowrap' }}>{t('gr.sp.' + r.sponsorGrade)}</span>
      : NIL
  ) }
  const aip = { key: 'aip', label: t('se.chip.aip'), nowrap: true, sort: (r: SponsorEmployerRow) => (r.aip ? 1 : 0), render: (r: SponsorEmployerRow) => (r.aip ? <span style={{ color: '#15803d', fontWeight: 700 }}>✓</span> : NIL) }
  const lmia = { key: 'lmia', label: t('se.col.lmia'), nowrap: true, sort: (r: SponsorEmployerRow) => r.lmiaPositions, render: (r: SponsorEmployerRow) => (r.lmiaPositions > 0 ? <span style={{ color: '#0f766e', fontWeight: 700 }}>{r.lmiaPositions}</span> : NIL) }
  const w1 = { key: 'w1', label: t('se.col.w1'), nowrap: true, sort: (r: SponsorEmployerRow) => r.lmia1q, render: (r: SponsorEmployerRow) => (r.lmia1q > 0 ? <span style={{ color: '#0f766e', fontWeight: 700 }}>{r.lmia1q}</span> : NIL) }
  const w2 = { key: 'w2', label: t('se.col.w2'), nowrap: true, sort: (r: SponsorEmployerRow) => r.lmia2q, render: (r: SponsorEmployerRow) => (r.lmia2q > 0 ? <span style={{ color: '#0f766e', fontWeight: 700 }}>{r.lmia2q}</span> : NIL) }
  const w4 = { key: 'w4', label: t('se.col.w4'), nowrap: true, sort: (r: SponsorEmployerRow) => r.lmia4q, render: (r: SponsorEmployerRow) => (r.lmia4q > 0 ? <span style={{ color: '#0f766e', fontWeight: 700 }}>{r.lmia4q}</span> : NIL) }
  const skilled = { key: 'skilled', label: t('dir.col.skilled'), nowrap: true, sort: (r: SponsorEmployerRow) => r.lmiaPositionsSkilled ?? null, render: (r: SponsorEmployerRow) => (r.lmiaPositionsSkilled ? <span style={{ color: '#0f766e', fontWeight: 700 }}>{r.lmiaPositionsSkilled}</span> : NIL) }
  const streams = { key: 'streams', label: t('se.col.streams'), sort: (r: SponsorEmployerRow) => r.streams.length, render: (r: SponsorEmployerRow) => (
    r.streams.length ? <span style={{ color: '#92400e', fontWeight: 600 }}>{r.streams.map((s) => streamDisplay(t, s)).join(t('se.where.sep'))}</span> : NIL
  ) }
  const namedMix = { key: 'named', label: t('se.col.named'), nowrap: true, sort: (r: SponsorEmployerRow) => (r.named ? 1 : 0), render: (r: SponsorEmployerRow) => (r.named ? <span style={{ color: '#92400e', fontWeight: 700 }}>✓</span> : NIL) }
  const open = { key: 'open', label: t('se.col.open'), nowrap: true, sort: (r: SponsorEmployerRow) => r.openJobs, render: (r: SponsorEmployerRow) => <span style={{ fontWeight: 700 }}>{r.openJobs}</span> }
  const where = { key: 'where', label: t('se.col.where'), sort: (r: SponsorEmployerRow) => r.provs[0] ?? null, render: (r: SponsorEmployerRow) => <>{whereText(r, t)}</> }
  const base = lang === 'en' ? [name, grade, open] : [name, alias, grade, open]
  if (kind === 'lmia') return [...base, w1, w2, w4, lmia, skilled, where]
  if (kind === 'named') return lang === 'en' ? [name, streams, open, where] : [name, alias, streams, open, where]
  if (kind === 'aip') return [...base, where]
  return [...base, aip, lmia, namedMix, where]
}

export function SponsorCard({ r, lang, t, kind = '' }: { r: SponsorEmployerRow; lang: Lang; t: TFn; kind?: SponsorKind }) {
  const alias = lang === 'zh' ? r.aliasZh : lang === 'ko' ? r.aliasKo : ''
  const NILC = <span style={{ color: '#9ca3af' }}>—</span>
  const kv: { k: string; v: React.ReactNode }[] = []
  if (kind === 'lmia') {
    kv.push({ k: t('se.col.w1'), v: r.lmia1q > 0 ? <b style={{ color: '#0f766e' }}>{r.lmia1q}</b> : NILC })
    kv.push({ k: t('se.col.w4'), v: r.lmia4q > 0 ? <b style={{ color: '#0f766e' }}>{r.lmia4q}</b> : NILC })
    kv.push({ k: t('se.col.lmia'), v: r.lmiaPositions > 0 ? <b style={{ color: '#0f766e' }}>{r.lmiaPositions}</b> : NILC })
    kv.push({ k: t('dir.col.skilled'), v: r.lmiaPositionsSkilled ? <b style={{ color: '#0f766e' }}>{r.lmiaPositionsSkilled}</b> : NILC })
  } else if (kind === 'named') {
    kv.push({ k: t('se.col.streams'), v: r.streams.length ? <b style={{ color: '#92400e' }}>{r.streams.map((s) => streamDisplay(t, s)).join(t('se.where.sep'))}</b> : NILC })
  } else if (kind !== 'aip') {
    kv.push({ k: t('se.chip.aip'), v: r.aip ? <b style={{ color: '#15803d' }}>✓</b> : NILC })
    kv.push({ k: t('se.col.lmia'), v: r.lmiaPositions > 0 ? <b style={{ color: '#0f766e' }}>{r.lmiaPositions}</b> : NILC })
    kv.push({ k: t('se.col.named'), v: r.named ? <b style={{ color: '#92400e' }}>✓</b> : NILC })
  }
  kv.push({ k: t('se.col.open'), v: <span style={{ fontWeight: 700 }}>{r.openJobs}</span> })
  kv.push({ k: t('se.col.where'), v: whereText(r, t) })
  return (
    <Card>
      <div style={{ fontSize: 14.5, fontWeight: 600 }}>
        <a href={`/?q=${encodeURIComponent(r.name)}`} onClick={() => track('se-view-jobs')} style={{ color: UI.primary, textDecoration: 'none' }}>{r.name}</a>
        {kind !== 'named' && r.sponsorGrade != null && !(r.sponsorGrade === 3 && !r.lmiaPositions && r.aip) && <span title={t('gr.sponsorTip')} style={{ marginLeft: 6, fontSize: 10.5, padding: '1px 7px', borderRadius: 999, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontWeight: 600, whiteSpace: 'nowrap' }}>{t('gr.sp.' + r.sponsorGrade)}</span>}
      </div>
      {alias ? <div style={{ fontSize: 12.5, color: '#9ca3af', marginTop: 2 }}>{alias}</div> : null}
      <CardKV items={kv} />
    </Card>
  )
}
