'use client'
// 在招担保雇主·三分表共用列组与手机卡(唯一消费方=把脉页 StartView 橱窗)。
// 货架页 SponsorEmployersView Frank 08-08 拍板下架(/employers 308 → /start),本文件只剩共享渲染件。
// 红线:凭证=历史事实/官方名录,非担保承诺。
import { type Lang, type TFn } from '../jobs/i18n'
import { track } from '@/lib/track'
import { Card, CardKV, UI } from '../ui/primitives'
import { type SponsorEmployerRow } from '@/lib/sponsorEmployers'

// 所在地统一省维度(Frank 08-08「怎么有的显示省有的显示市」:单省带市名造成两种粒度混排)——
// 1-3 省列两字码,≥4 省收「N 省」;市级细节归公司弹框
function whereText(r: SponsorEmployerRow, t: TFn): string {
  if (!r.provs.length) return '—'
  if (r.provs.length <= 3) return r.provs.join(t('se.where.sep'))
  return t('se.where.multi', { n: r.provs.length })
}

// 按人群分表的列组(Frank 08-08 连拍收敛:每表只留纯雇主事实+自己那条通道的数值):
// lmia 表(没工签→要雇主办 LMIA):时间窗/获批量/技能类数值列;担保档药丸列 08-08 四拍撤
//   (「这个标签也没有必要」——与数值列同源重复,#278 ③ 就此了断);
// named 表(有工签→要打包省提名):二拍撤担保档/「担保过 PR」死列,三拍撤「命中省清单」列
//   (清单是筛选维度不是雇主属性,只留橱窗清单下拉;streams 字段仍在行上供筛选);
// aip 表(去海洋省):指定身份即表题,行内只留 在招/所在地。
const NIL = <span style={{ color: '#9ca3af' }}>—</span>
export type SponsorKind = 'aip' | 'lmia' | 'named'
export function sponsorEmployerCols(t: TFn, lang: Lang, kind: SponsorKind) {
  // Frank 08-08「胶囊和中文应该弄两列」:别名独立一列(EN 界面无别名,列整体不出)
  const name = { key: 'name', label: t('dir.col.employer'), sort: (r: SponsorEmployerRow) => r.name.toLowerCase(), render: (r: SponsorEmployerRow) => (
    <a href={`/?q=${encodeURIComponent(r.name)}`} onClick={() => track('se-view-jobs')} style={{ color: UI.primary, textDecoration: 'none', fontWeight: 600 }}>{r.name}</a>
  ) }
  const alias = { key: 'alias', label: t('se.col.alias'), sort: (r: SponsorEmployerRow) => (lang === 'zh' ? r.aliasZh : r.aliasKo) || null, render: (r: SponsorEmployerRow) => {
    const v = lang === 'zh' ? r.aliasZh : r.aliasKo
    return v ? <span style={{ color: '#6b7280', fontSize: 12.5 }}>{v}</span> : NIL
  } }
  const lmia = { key: 'lmia', label: t('se.col.lmia'), nowrap: true, sort: (r: SponsorEmployerRow) => r.lmiaPositions, render: (r: SponsorEmployerRow) => (r.lmiaPositions > 0 ? <span style={{ color: '#0f766e', fontWeight: 700 }}>{r.lmiaPositions}</span> : NIL) }
  const w1 = { key: 'w1', label: t('se.col.w1'), nowrap: true, sort: (r: SponsorEmployerRow) => r.lmia1q, render: (r: SponsorEmployerRow) => (r.lmia1q > 0 ? <span style={{ color: '#0f766e', fontWeight: 700 }}>{r.lmia1q}</span> : NIL) }
  const w2 = { key: 'w2', label: t('se.col.w2'), nowrap: true, sort: (r: SponsorEmployerRow) => r.lmia2q, render: (r: SponsorEmployerRow) => (r.lmia2q > 0 ? <span style={{ color: '#0f766e', fontWeight: 700 }}>{r.lmia2q}</span> : NIL) }
  const w4 = { key: 'w4', label: t('se.col.w4'), nowrap: true, sort: (r: SponsorEmployerRow) => r.lmia4q, render: (r: SponsorEmployerRow) => (r.lmia4q > 0 ? <span style={{ color: '#0f766e', fontWeight: 700 }}>{r.lmia4q}</span> : NIL) }
  const skilled = { key: 'skilled', label: t('dir.col.skilled'), nowrap: true, sort: (r: SponsorEmployerRow) => r.lmiaPositionsSkilled ?? null, render: (r: SponsorEmployerRow) => (r.lmiaPositionsSkilled ? <span style={{ color: '#0f766e', fontWeight: 700 }}>{r.lmiaPositionsSkilled}</span> : NIL) }
  const open = { key: 'open', label: t('se.col.open'), nowrap: true, sort: (r: SponsorEmployerRow) => r.openJobs, render: (r: SponsorEmployerRow) => <span style={{ fontWeight: 700 }}>{r.openJobs}</span> }
  const where = { key: 'where', label: t('se.col.where'), sort: (r: SponsorEmployerRow) => r.provs[0] ?? null, render: (r: SponsorEmployerRow) => <>{whereText(r, t)}</> }
  const base = lang === 'en' ? [name, open] : [name, alias, open]
  if (kind === 'lmia') return [...base, w1, w2, w4, lmia, skilled, where]
  return [...base, where]
}

export function SponsorCard({ r, lang, t, kind }: { r: SponsorEmployerRow; lang: Lang; t: TFn; kind: SponsorKind }) {
  const alias = lang === 'zh' ? r.aliasZh : lang === 'ko' ? r.aliasKo : ''
  const NILC = <span style={{ color: '#9ca3af' }}>—</span>
  const kv: { k: string; v: React.ReactNode }[] = []
  if (kind === 'lmia') {
    kv.push({ k: t('se.col.w1'), v: r.lmia1q > 0 ? <b style={{ color: '#0f766e' }}>{r.lmia1q}</b> : NILC })
    kv.push({ k: t('se.col.w4'), v: r.lmia4q > 0 ? <b style={{ color: '#0f766e' }}>{r.lmia4q}</b> : NILC })
    kv.push({ k: t('se.col.lmia'), v: r.lmiaPositions > 0 ? <b style={{ color: '#0f766e' }}>{r.lmiaPositions}</b> : NILC })
    kv.push({ k: t('dir.col.skilled'), v: r.lmiaPositionsSkilled ? <b style={{ color: '#0f766e' }}>{r.lmiaPositionsSkilled}</b> : NILC })
  }
  kv.push({ k: t('se.col.open'), v: <span style={{ fontWeight: 700 }}>{r.openJobs}</span> })
  kv.push({ k: t('se.col.where'), v: whereText(r, t) })
  return (
    <Card>
      <div style={{ fontSize: 14.5, fontWeight: 600 }}>
        <a href={`/?q=${encodeURIComponent(r.name)}`} onClick={() => track('se-view-jobs')} style={{ color: UI.primary, textDecoration: 'none' }}>{r.name}</a>
      </div>
      {alias ? <div style={{ fontSize: 12.5, color: '#9ca3af', marginTop: 2 }}>{alias}</div> : null}
      <CardKV items={kv} />
    </Card>
  )
}
