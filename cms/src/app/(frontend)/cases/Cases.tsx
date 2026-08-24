'use client'
// 常见案例索引页(2026-08-13 Frank:「这个是不是放到其他页面比较好」——16 条处境在决策页占了
// 大半屏,决策页要的是动线不是阅览室)。骨架照 /resources:Header + 1320 轨 + banner + 白卡。
// 行形态原样搬决策页那张卡(08-11 Frank 连拍四刀后的终态):一行一条不折叠,
// 做了事实层的才有「完整案例」按钮 —— 答不了就不假装能答。
import { useLang } from '@/components/i18n'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { BANNER_IMGS, Banner, UI } from '@/components/ui'
import { CASES } from '@/lib/ruling'
import { track } from '@/lib/track'

export function Cases() {
  const [lang, setLangSaved, t] = useLang()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: UI.bg, fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <Header lang={lang} setLang={setLangSaved} t={t} />
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '1rem 1.25rem 40px', width: '100%', boxSizing: 'border-box', flex: '1 0 auto' }}>
        <Banner module="pathways" title={t('dp.cases')} images={BANNER_IMGS.pathways} />
        <div style={{ background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 12, padding: '14px 16px', marginTop: 10 }}>
          {CASES.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
              borderTop: `1px solid ${UI.hairline}`, padding: '10px 0' }}>
              <span style={{ minWidth: 0, flex: 1, fontSize: 13.5, fontWeight: 600, color: '#111827', lineHeight: 1.5 }}>
                {t(`case.${c.id}.label`)}
              </span>
              {c.page && (
                <a href={`/cases/${c.page}`} onClick={() => track('cases-index-page', { id: c.id })}
                  style={{ background: UI.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-block', whiteSpace: 'nowrap' }}>
                  {t('dp.caseAnswer')}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
      <Footer t={t} />
    </div>
  )
}
