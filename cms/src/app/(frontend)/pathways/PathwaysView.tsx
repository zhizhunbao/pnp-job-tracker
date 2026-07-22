'use client'
// 方案卡渲染(E12-01):分组(与你的处境相关/其他路径)+ 每卡步骤/信号/缺口补法/出处。
// 纯显示——命中/缺口全由 lib/pathways.ts 算好传入;措辞红线在 i18n 键里落实(摆信息不下结论)。
import { useEffect, useMemo, useState } from 'react'
import { makeT, LANG_KEY, type Lang } from '../jobs/i18n'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { IconCheck, IconCompass, IconWarn } from '../Icons'
import { BANNER_IMGS, PageBanner } from '../ui/primitives'
import type { PathwayEval, PathwaySignal } from '@/lib/pathways'

// #198(Frank「所有页面改成一样的风格」):卡片对齐详情页基准(1px #e5e7eb / r12 / 白底)
const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }
const secTitle: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: '#6b7280', margin: '14px 0 6px' }

function SignalRow({ s, t }: { s: PathwaySignal; t: (k: string, v?: Record<string, string | number>) => string }) {
  const icon = s.verdict === 'pass' ? <IconCheck style={{ color: '#047857' }} /> : s.verdict === 'warn' ? <IconWarn style={{ color: '#b45309' }} /> : <span style={{ color: '#9ca3af' }}>–</span>
  return (
    <li style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, listStyle: 'none', display: 'flex', gap: 6 }}>
      <span style={{ flexShrink: 0 }}>{icon}</span>
      {/* #198(Frank「这个页面的跳转都删掉」):↗ 外链撤,只留信号文字 */}
      <span>{t(s.key, s.params)}</span>
    </li>
  )
}

export function PathwaysView({ evals, loggedIn, profileOk }: { evals: PathwayEval[]; loggedIn: boolean; profileOk: boolean }) {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { try { const l = localStorage.getItem(LANG_KEY) as Lang | null; if (l === 'zh' || l === 'en' || l === 'ko') setLang(l) } catch { /* ignore */ } }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = useMemo(() => makeT(lang), [lang])

  const grouped = evals.some((e) => e.forYou === true)   // 有分型且至少一条相关 → 分组;否则平铺
  const forYou = evals.filter((e) => e.forYou === true)
  const others = evals.filter((e) => e.forYou !== true)

  const Card = ({ ev }: { ev: PathwayEval }) => (
    <section style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 16, margin: 0, color: '#111827' }}>{t(`pw.${ev.recipe.id}.name`)}</h2>
        {ev.recipe.audience.map((a) => (
          <span key={a} style={{ fontSize: 11, color: '#4338ca', background: '#eef2ff', borderRadius: 20, padding: '2px 8px' }}>{t(`prof.st.${a}`)}</span>
        ))}
      </div>

      <div style={secTitle}>{t('pw.steps')}</div>
      <ol style={{ margin: 0, paddingLeft: 20 }}>
        {ev.recipe.steps.map((s) => (
          <li key={s.key} style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
            {t(s.key)}
          </li>
        ))}
      </ol>

      {ev.signals.length > 0 && (<>
        <div style={secTitle}>{t('pw.signals')}</div>
        <ul style={{ margin: 0, padding: 0 }}>{ev.signals.map((s, i) => <SignalRow key={i} s={s} t={t} />)}</ul>
      </>)}

      {ev.gaps.length > 0 && (<>
        <div style={secTitle}>{t('pw.gaps')}</div>
        <ul style={{ margin: 0, padding: 0 }}>
          {ev.gaps.map((g) => (
            <li key={g.key} style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, listStyle: 'none', display: 'flex', gap: 6 }}>
              <span style={{ color: '#b45309', flexShrink: 0 }}><IconWarn /></span>
              <span>{t(g.key)}</span>
            </li>
          ))}
        </ul>
      </>)}

      {/* #198(Frank「跳转都删掉」):出处 ↗ 外链撤,来源名作纯文字;「·」清理(核对于自成一段空格分隔) */}
      <div style={{ borderTop: '1px solid #f3f4f6', marginTop: 14, paddingTop: 8, fontSize: 11.5, color: '#9ca3af', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <span>{t('pw.sources')}:</span>
        {ev.recipe.sources.map((s) => (
          <span key={s.url}>{s.label}</span>
        ))}
        <span>{t('pw.reviewed', { d: ev.recipe.lastReviewed })}</span>
      </div>
    </section>
  )

  // #198:底色对齐详情页基准(#f9fafb),原紫渐变退役——与榜单/统计/名录同底
  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="pathways" />
      {/* #67 宽度统一(2026-07-19 Frank:「移民路径和其他的页面不一样宽」):860 → PageShell 1320 同轨 */}
      <main style={{ maxWidth: 1320, width: '100%', margin: '2rem auto', padding: '0 1.25rem', boxSizing: 'border-box', flex: '1 0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          {/* 页头=PageBanner(#65 五模块统一浅色带,路径=紫);免责小字留 banner 外 */}
          <PageBanner module="pathways" icon={<IconCompass />} title={t('pw.title')} sub={t('pw.sub')} images={BANNER_IMGS.pathways}
            stats={[{ v: evals.length, label: t('pw.bnRoutes') }]} />
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '6px 0 0' }}>{t('pw.disc')}</p>
        </div>

        {/* 建档 CTA:匿名→登录框深链;登录未建档→档案节 */}
        {!profileOk && (
          <a href={loggedIn ? '/account?sec=profile' : '/?login=1'}
            style={{ ...card, display: 'block', textDecoration: 'none', color: '#1d4ed8', background: '#eff6ff', border: '0.5px solid #bfdbfe', fontSize: 13.5, fontWeight: 600 }}>
            {loggedIn ? t('pw.buildCta') : t('pw.loginCta')}
          </a>
        )}

        {grouped ? (<>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>{t('pw.forYou')}</div>
          {forYou.map((ev) => <Card key={ev.recipe.id} ev={ev} />)}
          {others.length > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: '#9ca3af', marginTop: 6 }}>{t('pw.other')}</div>}
          {others.map((ev) => <Card key={ev.recipe.id} ev={ev} />)}
        </>) : evals.map((ev) => <Card key={ev.recipe.id} ev={ev} />)}
      </main>
      <SiteFooter t={t} />
    </div>
  )
}
