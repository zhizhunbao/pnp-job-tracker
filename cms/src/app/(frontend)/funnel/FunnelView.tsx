'use client'
// 漏斗五个数的显示层(主线 M2 / E7-05)。**内部页**:数据由服务端组件鉴权后传进来,这里零业务逻辑。
// 文案只有中文 —— 这页只给 Frank 看,不是产品页面,翻三语是浪费。
import { useEffect, useMemo, useState } from 'react'
import { initialLang, makeT, LANG_KEY, type Lang } from '../jobs/i18n'
import { SiteHeader } from '../SiteHeader'
import { SiteFooter } from '../SiteFooter'
import { PageShell, UI } from '../ui/primitives'
import { goBackOr } from '../BackLink'

export type FunnelRow = { step: string; label: string; d30: number; d7: number; d1: number; rate: number | null }

const TH: React.CSSProperties = { textAlign: 'right', padding: '8px 10px', fontSize: 12, color: UI.text3, fontWeight: 400, whiteSpace: 'nowrap' }
const TD: React.CSSProperties = { textAlign: 'right', padding: '11px 10px', fontSize: 14, fontVariantNumeric: 'tabular-nums', borderTop: `1px solid ${UI.hairline}` }

export function FunnelView({ rows, pro, stripe, byEntry, byPricing = [] }: {
  rows: FunnelRow[]; pro: number; stripe: number
  byEntry: { prop: string; n: number }[]; byPricing?: { prop: string; n: number }[]
}) {
  const [lang, setLang] = useState<Lang>('zh')
  useEffect(() => { setLang(initialLang()) }, [])
  const setLangSaved = (l: Lang) => { try { localStorage.setItem(LANG_KEY, l) } catch { /* ignore */ } ; setLang(l) }
  const t = useMemo(() => makeT(lang), [lang])
  const empty = rows.every((r) => r.d30 === 0)

  return (
    <>
      {/* 手机上砍掉「7 天/昨天」两列:375 宽下五列会把步骤名折成「① 打开职/位详情」——
          趋势在手机上不是重点,30 天与转化率才是。表本身仍在 overflow-x 容器里,页面不横滚 */}
      <style>{`@media(max-width:640px){.fnCol{display:none}}`}</style>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} />
      <PageShell>
        <div style={{ background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 12, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 19, fontWeight: 600, margin: 0 }}>漏斗五个数</h1>
              <div style={{ fontSize: 12.5, color: UI.text3, marginTop: 3 }}>第一方计数,不受广告拦截器影响;转化率按 30 天合计</div>
            </div>
            <button onClick={() => goBackOr('/')} style={{ marginLeft: 'auto', border: `1px solid ${UI.border}`, background: '#fff', color: UI.text2, borderRadius: 8, padding: '6px 13px', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>返回</button>
          </div>

          <div style={{ overflowX: 'auto', marginTop: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ ...TH, textAlign: 'left' }}>步骤</th>
                  <th style={TH}>30 天</th><th style={TH} className="fnCol">7 天</th><th style={TH} className="fnCol">昨天</th><th style={TH}>比上一步</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.step}>
                    <td style={{ ...TD, textAlign: 'left', whiteSpace: 'nowrap' }}>{r.label}</td>
                    <td style={TD}><b>{r.d30}</b></td>
                    <td style={TD} className="fnCol">{r.d7}</td>
                    <td style={TD} className="fnCol">{r.d1}</td>
                    <td style={{ ...TD, color: UI.text3 }}>{r.rate == null ? '—' : `${r.rate}%`}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ ...TD, textAlign: 'left', whiteSpace: 'nowrap' }}>⑥ 真实付费</td>
                  <td style={TD}><b>{pro}</b></td>
                  <td style={{ ...TD, textAlign: 'left', color: UI.text3, fontSize: 12.5, whiteSpace: 'normal' }} colSpan={3}>proUntil 有值;其中走过 Checkout 的 {stripe} 人</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 曝光要能按入口分开看:详情页(jd)与报告页(rpt)是两条路,M3 分叉时得知道该改哪一条 */}
          {byEntry.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 13, color: UI.text2 }}>
              锁区曝光按入口(30 天):{byEntry.map((e) => <span key={e.prop} style={{ marginLeft: 10 }}>{e.prop} {e.n}</span>)}
            </div>
          )}
          {/* 定价也要分来路:报告锁区 CTA 带 ?from=rpt-<卡>,其余算直达 —— 报告到底卖不卖得动就看这一行 */}
          {byPricing.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 13, color: UI.text2 }}>
              打开定价按来路(30 天):{byPricing.map((e) => <span key={e.prop} style={{ marginLeft: 10 }}>{e.prop} {e.n}</span>)}
            </div>
          )}
          {/* ② 那一格空着是有意的:详情页不是报告的唯一来路(首页 CTA 直接进 /plan/pr),
              拿 ① 当分母算出来的是 200% 这种数,不如不给 */}
          <div style={{ marginTop: 10, fontSize: 12.5, color: UI.text3, lineHeight: 1.6 }}>
            ② 不给「比上一步」:详情页不是报告的唯一来路(首页 CTA 直接进 /plan/pr),① 不是它的分母。
          </div>
          {empty && <div style={{ marginTop: 12, fontSize: 13, color: '#b45309' }}>还没有任何计数 —— 表刚建好,或事件还没打到生产。</div>}
        </div>
      </PageShell>
      <SiteFooter t={t} />
    </>
  )
}
