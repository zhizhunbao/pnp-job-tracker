'use client'
// 政策时间线视图(C6-01):三路事件混排时间轴 + 抽选节奏块;省筛/类型筛纯客户端(事件 <100)。
// 诚实红线:省分数带分制标注(≠CRS);节奏=历史统计,不预测下一次(tl.note 写死)。
import { useEffect, useMemo, useState } from 'react'
import { makeT, LANG_KEY, type Lang } from '../jobs/i18n'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { PageBanner, PageShell, SectionTabs, SectionTitle, Tag, UI, chipStyle } from '../ui/primitives'
import { IconNews } from '../Icons'
import type { TlCadence, TlEvent } from '@/lib/timeline'

export function TimelineView({ events, cadence, eeCadence }: {
  events: TlEvent[]; cadence: TlCadence[]
  eeCadence: { category: string; label: string; last: string; daysSince: number }[]
}) {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { const s = localStorage.getItem(LANG_KEY) as Lang | null; if (s) setLang(s) }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = makeT(lang)
  const [fProv, setFProv] = useState('')      // ''=全部;'FED'=联邦;两字码=省
  const [fKind, setFKind] = useState('')      // ''=全部;draw;policy(notice 归 draw 组显示)

  const provs = useMemo(() => [...new Set(events.map((e) => e.prov).filter(Boolean))].sort(), [events])
  const shown = useMemo(() => events.filter((e) =>
    (!fProv || (fProv === 'FED' ? e.prov === '' : e.prov === fProv)) &&
    (!fKind || (fKind === 'draw' ? e.kind !== 'policy' : e.kind === 'policy'))), [events, fProv, fKind])

  const provTag = (p: string) => p ? <Tag variant="region">{p}</Tag> : <Tag variant="federal">{t('tl.fed')}</Tag>
  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="news" />
      <PageShell pad="2rem 1.25rem 32px">
        <PageBanner module="news" icon={<IconNews />} title={t('tl.title')} sub={t('tl.sub')} />
        {/* 2026-07-19 Frank 批提案:统一二级 tab 条(与 /news 互为切换) */}
        <SectionTabs color="#0f766e" tabs={[
          { href: '/news', label: t('tl.tabNews') },
          { href: '/timeline', label: t('tl.title'), active: true },
        ]} />
        <div style={{ fontSize: 12.5, color: '#6b7280', margin: '0 0 12px', lineHeight: 1.6 }}>{t('tl.note')}</div>

        {/* 抽选节奏(个人化钩 v1:省×流 距今/平均间隔;EE=距今) */}
        <SectionTitle>{t('tl.cadence')}</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 10, marginBottom: 8 }}>
          {cadence.map((c) => (
            <div key={c.prov + c.stream} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontSize: 12.5 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                {provTag(c.prov)}<span style={{ fontWeight: 600, color: '#111827' }}>{c.stream}</span>
                {c.scale && <span style={{ color: '#9ca3af', fontSize: 11 }}>{c.scale}</span>}
              </div>
              <div style={{ color: '#6b7280' }}>
                {t('tl.last', { d: c.last })} · <b style={{ color: c.daysSince > (c.avgGapDays ?? 9999) ? UI.warn : '#374151' }}>{t('tl.daysSince', { n: c.daysSince })}</b>
                {c.avgGapDays != null && <> · {t('tl.avgGap', { n: c.avgGapDays, m: c.draws })}</>}
              </div>
            </div>
          ))}
          {eeCadence.map((c) => (
            <div key={c.category} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontSize: 12.5 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
                <Tag variant="federal">EE</Tag><span style={{ fontWeight: 600, color: '#111827' }}>{c.label}</span>
                <span style={{ color: '#9ca3af', fontSize: 11 }}>CRS</span>
              </div>
              <div style={{ color: '#6b7280' }}>{t('tl.last', { d: c.last })} · <b style={{ color: '#374151' }}>{t('tl.daysSince', { n: c.daysSince })}</b></div>
            </div>
          ))}
        </div>

        {/* 筛选 chips */}
        <SectionTitle>{t('tl.events')}</SectionTitle>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '0 0 6px' }}>
          <button style={chipStyle(!fProv)} onClick={() => setFProv('')}>{t('all.prov')}</button>
          <button style={chipStyle(fProv === 'FED')} onClick={() => setFProv('FED')}>{t('tl.fed')}</button>
          {provs.map((p) => <button key={p} style={chipStyle(fProv === p)} onClick={() => setFProv(p)}>{t('pr.' + p)}</button>)}
          <span style={{ width: 1, background: '#e5e7eb', margin: '0 4px' }} />
          <button style={chipStyle(!fKind)} onClick={() => setFKind('')}>{t('tl.kindAll')}</button>
          <button style={chipStyle(fKind === 'draw')} onClick={() => setFKind('draw')}>{t('tl.kindDraw')}</button>
          <button style={chipStyle(fKind === 'policy')} onClick={() => setFKind('policy')}>{t('tl.kindPolicy')}</button>
        </div>

        {/* 时间轴(左缘竖线+圆点) */}
        <div style={{ borderLeft: '2px solid #e5e7eb', margin: '10px 0 0 7px', paddingLeft: 18 }}>
          {shown.map((e, i) => (
            <div key={i} style={{ position: 'relative', padding: '7px 0' }}>
              <span style={{ position: 'absolute', left: -24, top: 14, width: 9, height: 9, borderRadius: '50%', background: e.kind === 'policy' ? '#0f766e' : '#2563eb', border: '2px solid #fff' }} />
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '9px 13px', fontSize: 13 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ color: '#9ca3af', fontSize: 12, whiteSpace: 'nowrap' }}>{e.date}</span>
                  {provTag(e.prov)}
                  {e.kind === 'policy'
                    ? <>{(e.importance ?? 0) >= 5 && <Tag variant="imp">{t('tl.imp')}</Tag>}
                        <a href={`/news/${e.slug}`} style={{ color: UI.primary, textDecoration: 'none', fontWeight: 600 }}>{e.title}</a></>
                    : <>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{e.kind === 'notice' ? t('tl.notice') : e.title}</span>
                        {e.score != null && <span style={{ color: UI.ok, fontWeight: 600 }}>{t('tl.min', { n: e.score })}{e.scale && e.scale !== 'CRS' && <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: 11 }}> ({e.scale}{t('tl.notCrs')})</span>}</span>}
                        {e.invitations != null && <span style={{ color: '#6b7280' }}>{t('tl.inv', { n: e.invitations })}</span>}
                        {e.url && <a href={e.url} target="_blank" rel="noreferrer" style={{ color: UI.primary, textDecoration: 'none', fontSize: 12 }}>{t('tl.src')}</a>}
                      </>}
                </div>
                {e.kind === 'notice' && e.note && <div style={{ color: '#6b7280', fontSize: 12.5, marginTop: 4 }}>{e.note}</div>}
              </div>
            </div>
          ))}
          {!shown.length && <div style={{ color: '#9ca3af', fontSize: 13, padding: '18px 0' }}>{t('tl.empty')}</div>}
        </div>
      </PageShell>
      <SiteFooter t={t} />
    </div>
  )
}
