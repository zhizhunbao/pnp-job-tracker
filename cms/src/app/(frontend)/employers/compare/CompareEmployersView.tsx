'use client'
// 多雇主对比视图(D3 / E5-06):维度行 × 雇主列(stats compare 转置先例);
// 免费=⑤价值时刻先例(价值点+模糊示例+升级钮,真值不出服务端);Pro=全维度+「与我的匹配」计数行。
// 红线:摆事实高亮差异不下结论;LMIA=历史事实≠担保(ce.note);缺数「—」不猜。
import { useEffect, useState } from 'react'
import { makeT, LANG_KEY, type Lang, type TFn } from '../../jobs/i18n'
import { SiteHeader } from '../../SiteHeader'
import { SiteFooter } from '../../SiteFooter'
import { BackLink } from '../../BackLink'
import { Button, Card, CardKV, Notice, PageShell, Tag, UI } from '../../ui/primitives'
import { DataTable } from '../../ui/DataTable'
import { PricingModal } from '../../jobs/PricingModal'
import { IconScale, IconStar } from '../../Icons'
import { CMP_KEY, type CompareRow } from '@/lib/employerCompareShared'

const money = (v: number | null) => (v != null ? `$${Math.round(v / 1000)}K` : null)
const dash = <span style={{ color: '#9ca3af' }}>—</span>
const DIFF_TAG: Record<string, 'ok' | 'warn' | 'federal'> = { easy: 'ok', mid: 'warn', tight: 'federal' }

type Dim = { key: string; label: React.ReactNode; tip?: string; render: (r: CompareRow) => React.ReactNode }

export function CompareEmployersView({ names, rows, pro, loggedIn }: {
  names: string[]; rows: CompareRow[]; pro: boolean; loggedIn: boolean
}) {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { const s = localStorage.getItem(LANG_KEY) as Lang | null; if (s) setLang(s) }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = makeT(lang)
  const [pricing, setPricing] = useState(false)
  const clear = () => { try { localStorage.removeItem(CMP_KEY) } catch { /* ignore */ } ; window.location.href = '/employers' }

  const withMatch = rows.some((r) => r.matchHigh != null)
  const dims: Dim[] = [
    { key: 'industry', label: t('fact.coSectors'), render: (r) => r.industry ? <Tag variant="region">{t('broad.' + r.industry)}</Tag> : dash },
    { key: 'known', label: t('dir.known'), render: (r) => r.wiki ? <a href={r.wiki} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}><Tag variant="pro">{t('dir.known')} ↗</Tag></a> : dash },
    { key: 'skilled', label: t('dir.col.skilled'), tip: t('dir.col.skilled.tip'), render: (r) => r.lmiaPositionsSkilled ? <b style={{ color: UI.ok }}>{r.lmiaPositionsSkilled}</b> : dash },
    { key: 'lmia', label: t('rank.col.lmia'), render: (r) => r.lmiaPositions ?? dash },
    { key: 'quarter', label: t('dir.col.quarter'), render: (r) => r.lmiaLastQuarter || dash },
    { key: 'aip', label: t('ce.aip'), render: (r) => r.aip ? <Tag variant="ok">✓</Tag> : dash },
    { key: 'open', label: t('rank.col.openJobs'), render: (r) => r.openJobs ? <a href={`/?q=${encodeURIComponent(r.name)}`} style={{ color: UI.primary, textDecoration: 'none' }}>{r.openJobs} →</a> : <>0</> },
    { key: 'avg', label: t('rank.col.avgScore'), render: (r) => r.avgScore ?? dash },
    { key: 'named', label: t('stats.named'), render: (r) => r.namedJobs ? <b style={{ color: UI.warn }}>{r.namedJobs}</b> : dash },
    { key: 'sal', label: t('stats.medSalary'), render: (r) => money(r.medSalary) ?? dash },
    { key: 'prov', label: t('ce.provDiff'), render: (r) => r.mainProvince ? (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {t('pr.' + r.mainProvince)}
        {r.diffTier && <Tag variant={DIFF_TAG[r.diffTier]}>{t('diff.' + r.diffTier)}</Tag>}
      </span>
    ) : dash },
    ...(withMatch ? [{
      key: 'match', label: t('ce.match'), render: (r: CompareRow) => r.matchHigh == null ? dash : (
        <span style={{ fontSize: 12.5 }}>
          <div style={{ color: UI.ok, fontWeight: 600 }}>{t('ce.matchHigh', { n: r.matchHigh })}</div>
          <div style={{ color: UI.primary }}>{t('ce.matchMid', { n: r.matchMid ?? 0 })}</div>
        </span>
      ),
    }] : []),
    { key: 'brief', label: t('ce.brief'), render: (r) => r.aiBrief ? <span title={r.aiBrief} style={{ fontSize: 12, display: 'inline-block', maxWidth: 240 }}>{r.aiBrief.slice(0, 150)}{r.aiBrief.length > 150 ? '…' : ''}</span> : dash },
  ]

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="employers" />
      <PageShell pad="2rem 1.25rem 32px">
        <div style={{ marginBottom: 8 }}><BackLink href="/employers" label={t('dir.title')} /></div>
        <h1 style={{ fontSize: 22, margin: '0 0 6px' }}><IconScale /> {t('ce.title')}</h1>
        <div style={{ fontSize: 12.5, color: '#6b7280', margin: '0 0 12px', lineHeight: 1.6 }}>{t('ce.note')}</div>

        {!pro ? (
          // ⑤ 价值时刻先例:三行价值点 + 模糊示例表 + 升级钮(真值不出服务端)
          <>
            <ul style={{ margin: '4px 0 12px 20px', fontSize: 13, color: '#374151', lineHeight: 2 }}>
              <li>{t('ce.v1')}</li>
              <li>{t('ce.v2')}</li>
              <li>{t('ce.v3')}</li>
            </ul>
            <div style={{ position: 'relative', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', maxWidth: 680 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, background: '#fff' }}>
                <thead><tr>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12.5, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}></th>
                  {['Maple Health Group', 'Northern Build Co', 'Prairie Foods Ltd'].map((n) => <th key={n} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12.5, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{n}</th>)}
                </tr></thead>
                <tbody>
                  {([[t('dir.col.skilled'), ['168', '52', '9']], [t('rank.col.openJobs'), ['24', '11', '37']], [t('stats.named'), ['12', '3', '0']], [t('ce.provDiff'), ['ON', 'AB', 'SK']]] as [string, string[]][]).map(([label, vals]) => (
                    <tr key={label}>
                      <td style={{ padding: '8px 12px', fontSize: 12.5, color: '#9ca3af', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>{label}</td>
                      {vals.map((v, i) => <td key={i} style={{ padding: '8px 12px', fontSize: 13, borderBottom: '1px solid #f3f4f6', filter: 'blur(4px)', userSelect: 'none' }}>{v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,255,255,.92)', border: '1px solid #fde68a', color: '#92400e', fontSize: 12.5, fontWeight: 600, borderRadius: 999, padding: '5px 12px' }}>{t('cmp.demo')}</span>
                <Button kind="pro" sm onClick={() => setPricing(true)}><IconStar /> {t('cmp.demoCta')}</Button>
              </div>
            </div>
            {pricing && <PricingModal t={t} loggedIn={loggedIn} pro={false} z={60} onClose={() => setPricing(false)} />}
          </>
        ) : rows.length < 2 ? (
          <Notice kind="info" action={<Button kind="secondary" sm href="/employers">{t('ce.goDir')}</Button>}>{t('ce.empty')}</Notice>
        ) : (
          <>
            {/* E8-08 #121:≤640 一雇主一卡(转置卡:原列头雇主=卡标题,原维度行=键值行;dims 数组复用零双写) */}
            <div className="tcCards">
              {rows.map((r, i) => {
                const alias = lang === 'zh' ? r.aliasZh : lang === 'ko' ? r.aliasKo : ''
                return (
                  <Card key={i}>
                    <div style={{ fontSize: 14.5, fontWeight: 600 }}>
                      {r.website ? <a href={r.website} target="_blank" rel="noreferrer" style={{ color: UI.primary, textDecoration: 'none' }}>{r.name} ↗</a> : r.name}
                    </div>
                    {alias ? <div style={{ fontSize: 12.5, color: '#9ca3af', marginTop: 2 }}>{alias}</div> : null}
                    <CardKV items={dims.map((d) => ({ k: d.label, v: d.render(r), wide: d.key === 'brief' }))} />
                  </Card>
                )
              })}
            </div>
            <div className="tcTableWrap">
            <DataTable<Dim> rows={dims} rowKey={(d) => d.key} minWidth={560} cols={[
              { key: 'dim', label: '', nowrap: true, render: (d) => <span title={d.tip} style={{ color: '#9ca3af', ...(d.tip ? { textDecoration: 'underline dotted #d1d5db' } : {}) }}>{d.label}</span> },
              ...rows.map((r, i) => ({
                key: `e${i}`,
                label: <span style={{ fontSize: 13.5 }}>{r.website
                  ? <a href={r.website} target="_blank" rel="noreferrer" style={{ color: UI.primary, textDecoration: 'none' }}>{r.name} ↗</a> : r.name}
                  {(lang === 'zh' ? r.aliasZh : lang === 'ko' ? r.aliasKo : '') && <span style={{ display: 'block', color: '#9ca3af', fontWeight: 400, fontSize: 11.5 }}>{lang === 'zh' ? r.aliasZh : r.aliasKo}</span>}</span>,
                render: (d: Dim) => d.render(r),
              })),
            ]} />
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
              <Button kind="secondary" sm href="/employers">{t('ce.goDir')}</Button>
              <Button kind="ghost" sm onClick={clear} style={{ color: '#9ca3af', fontWeight: 400 }}>{t('ce.clear')}</Button>
            </div>
          </>
        )}
      </PageShell>
      <SiteFooter t={t} />
    </div>
  )
}
