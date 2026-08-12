'use client'
// 处境页(样板 C01)。骨架照职位详情页:PageShell 轨 + 右上返回 + H1 + 白卡。
//
// 版式顺序由 Frank 2026-08-11 定死:**他问的那个省 → 为什么 → 由易到难的替代 → 走不通的 → 第一步**。
// 上一版做成「四块无主的事实」,被点名「列一堆信息,用户看了有什么用」—— 摆事实不等于给答案。
// 每条路径下面挂的是判定核给的理由(met/gap/excluded),官方原句原样摆,页面不改写、不加戏。
import { BackLink } from '../../BackLink'
import { useLang } from '../../LangProvider'
import { SiteFooter } from '../../SiteFooter'
import { SiteHeader } from '../../SiteHeader'
import { PageShell, UI } from '../../ui/primitives'
import type { CaseAnswer, OpsFacts } from '@/lib/caseFacts'
import type { L3 } from '@/lib/caseLibrary'
import type { PathwayVerdict, VerdictReason } from '@/lib/pathVerdict'
import { track } from '@/lib/track'

const CARD: React.CSSProperties = { background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 12, padding: '16px 18px', margin: '0 0 10px' }
const H2: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 6px' }
const TONE: Record<VerdictReason['kind'], string> = { met: UI.ok, gap: '#b45309', excluded: '#b91c1c', 'needs-info': UI.text3 }

export function CaseView({ caseId, label, question, answer }: {
  caseId: string
  label: L3
  question: L3
  answer: CaseAnswer
}) {
  const [lang, setLangSaved, t] = useLang()
  const pick = (l: L3) => l[lang as keyof L3] || l.zh
  // 判定核给的理由:有 pv.* 键就走措辞层,没有(将来新加漏挂的)退回中文原句 —— 宁可露一句中文,不露键名
  const say = (r: VerdictReason) => (r.key ? t(r.key, r.params) : r.text)
  const provOf = (code: string) => { const full = t('prov.' + code); return full === 'prov.' + code ? code : full }
  const tierLabel = (tier: 0 | 1 | 2 | 3 | null) => t(`case.tier${tier ?? 0}`)

  // 供需一行:各省公布的口径不同,谁公布什么写什么,**不硬凑统一比值**
  const supply = (o?: OpsFacts) => {
    if (!o) return ''
    const bits: string[] = []
    if (o.allocation != null && o.nominated != null) {
      bits.push(t('case.ops.spots', { total: o.allocation, used: o.nominated, left: Math.max(o.allocation - o.nominated, 0), period: o.allocPeriod ?? '' }))
    } else if (o.allocation != null) bits.push(t('case.ops.alloc', { n: o.allocation, period: o.allocPeriod ?? '' }))
    if (o.poolTotal != null) bits.push(t('case.ops.pool', { n: o.poolTotal }))
    if (o.nominated != null && o.refused != null) {
      const pct = Math.round((o.nominated / (o.nominated + o.refused)) * 1000) / 10
      bits.push(t('case.ops.approved', { pct, ok: o.nominated, no: o.refused, period: o.ytdPeriod ?? '' }))
    }
    return bits.join('；')
  }

  // 一条通道 = 省 + 官方通道名 + 档位 + 判定核给的理由(官方原句原样挂)+ 该省供需
  const Path = ({ v, rank }: { v: PathwayVerdict; rank?: number }) => (
    <div style={{ borderTop: `1px solid ${UI.hairline}`, padding: '12px 0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        {rank ? <span style={{ color: UI.text3, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{rank}</span> : null}
        <span style={{ minWidth: 0, color: '#111827', fontSize: 14.5, fontWeight: 700 }}>
          {v.province === 'FED' ? t('dp.federal') : provOf(v.province)}　{v.stream}
        </span>
        <span style={{ marginLeft: 'auto', color: v.verdict === 'excluded' ? '#b91c1c' : v.tier === 0 ? UI.ok : '#92400e',
          background: v.verdict === 'excluded' ? '#fef2f2' : v.tier === 0 ? '#ecfdf5' : '#fffbeb',
          borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {v.verdict === 'excluded' ? t('case.blockedTag') : tierLabel(v.tier)}
        </span>
      </div>
      <ul style={{ margin: '8px 0 0', padding: '0 0 0 18px', color: UI.text2, fontSize: 13, lineHeight: 1.75 }}>
        {v.reasons.filter((r) => r.kind !== 'needs-info').slice(0, 4).map((r, i) => (
          <li key={i} style={{ marginBottom: 5 }}>
            {/* 官方原文默认收起,而且**不加「官方原文」那四个字**——一页十条路径要重复二十几遍。
                理由那句话自己就是开关(虚下划线示意可点),展开才出原文。多出来的字数为零。 */}
            {r.quote ? (
              <details>
                <summary style={{ color: TONE[r.kind], cursor: 'pointer', listStyle: 'none',
                  textDecoration: 'underline dotted', textDecorationColor: UI.border, textUnderlineOffset: 3 }}>
                  {say(r)}
                </summary>
                <span style={{ display: 'block', color: UI.text3, fontSize: 12, lineHeight: 1.6, margin: '3px 0 6px' }}>
                  {r.quote}
                  {r.evidence?.url ? <>　<a href={r.evidence.url} target="_blank" rel="noreferrer" style={{ color: UI.primary, textDecoration: 'none' }}>{t('case.official')}</a></> : null}
                </span>
              </details>
            ) : <span style={{ color: TONE[r.kind] }}>{say(r)}</span>}
          </li>
        ))}
      </ul>
      {supply(answer.ops[v.province]) ? (
        <div style={{ marginTop: 2, paddingLeft: 18, fontSize: 12, color: UI.text3, lineHeight: 1.6 }}>{supply(answer.ops[v.province])}</div>
      ) : null}
    </div>
  )

  let rank = 0
  return (
    <div style={{ background: UI.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      <SiteHeader lang={lang} setLang={setLangSaved} t={t} active="pathways" />
      <div style={{ flex: '1 0 auto' }}>
        <PageShell pad="1rem 1.25rem 40px">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, margin: '0 0 12px' }}>
            <h1 style={{ flex: 1, minWidth: 0, fontSize: 22, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.45 }}>{pick(label)}</h1>
            <BackLink href="/plan/pr" label={t('case.back')} />
          </div>

          {/* 用户原话,一个字不改 */}
          <div style={{ ...CARD, background: '#f8fbff', borderColor: '#dbeafe' }}>
            <div style={{ color: UI.text3, fontSize: 12, marginBottom: 6 }}>{t('case.theQuestion')}</div>
            <div style={{ color: '#111827', fontSize: 16, fontWeight: 600, lineHeight: 1.65 }}>「{pick(question)}」</div>
          </div>

          {/* ① 先回答他点名问的那个省 */}
          {answer.asked ? (
            <div style={CARD}>
              <h2 style={H2}>{t('case.askedTitle', { prov: provOf(answer.asked.province) })}</h2>
              <div style={{ fontSize: 13.5, color: UI.text2, lineHeight: 1.8 }}>
                {t('case.askedLead', {
                  prov: provOf(answer.asked.province),
                  tier: tierLabel(answer.asked.tier),
                  fastest: tierLabel(answer.tiers[0]?.tier ?? 0),
                })}
              </div>
              <Path v={answer.asked} />
              {(() => {
                const o = answer.ops[answer.asked!.province]
                if (!o?.nominated || !o?.refused) return null
                const pct = Math.round((o.nominated / (o.nominated + o.refused)) * 1000) / 10
                return (
                  <div style={{ marginTop: 12, padding: '11px 13px', borderRadius: 9, background: UI.bg, color: UI.text2, fontSize: 13, lineHeight: 1.8 }}>
                    {t('case.claimLead', { pct, ok: o.nominated, no: o.refused, invited: o.invited ?? 0, period: o.ytdPeriod ?? '' })}
                  </div>
                )
              })()}
            </div>
          ) : null}

          {/* ② 其余路径,由易到难 */}
          {answer.tiers.length ? (
            <div style={CARD}>
              <h2 style={H2}>{t('case.othersTitle')}</h2>
              <div style={{ fontSize: 13.5, color: UI.text2, lineHeight: 1.8 }}>{t('case.othersLead')}</div>
              {answer.tiers.map((g) => g.rows.map((v) => { rank += 1; return <Path key={v.key} v={v} rank={rank} /> }))}
            </div>
          ) : null}

          {/* ③ 现在走不通的 */}
          {answer.excluded.length ? (
            <div style={CARD}>
              <h2 style={H2}>{t('case.blockedTitle')}</h2>
              <div style={{ fontSize: 13.5, color: UI.text2, lineHeight: 1.8 }}>{t('case.blockedLead')}</div>
              {answer.excluded.map((v) => <Path key={v.key} v={v} />)}
            </div>
          ) : null}

          {/* ④ 第一步:零经验的人先要的是「谁肯带」 */}
          {answer.trainable.length ? (
            <div style={CARD}>
              <h2 style={H2}>{t('case.firstStepTitle')}</h2>
              <div style={{ fontSize: 13.5, color: UI.text2, lineHeight: 1.8, marginBottom: 10 }}>
                {t('case.firstStepLead', { n: answer.trainableTotal })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'max-content max-content', columnGap: 16, rowGap: 6, fontSize: 13.5 }}>
                {answer.trainable.map((x) => [
                  <span key={`${x.province}p`} style={{ color: '#111827', fontWeight: 600 }}>{provOf(x.province)}</span>,
                  <span key={`${x.province}n`} style={{ color: UI.text, fontWeight: 700, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{x.n}</span>,
                ]).flat()}
              </div>
            </div>
          ) : null}

          <div style={CARD}>
            <h2 style={H2}>{t('case.mineTitle')}</h2>
            <div style={{ fontSize: 13.5, color: UI.text2, lineHeight: 1.8, marginBottom: 12 }}>{t('case.mineLead')}</div>
            <a href="/plan/pr?quiz=1" onClick={() => track('case-to-quiz', { id: caseId })}
              style={{ display: 'inline-block', background: UI.primary, color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>
              {t('case.mineCta')}
            </a>
          </div>

          <div style={{ fontSize: 11.5, color: UI.text3, lineHeight: 1.7 }}>{t('case.note')}</div>
        </PageShell>
      </div>
      <SiteFooter t={t} />
    </div>
  )
}
