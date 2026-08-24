'use client'
// 处境页(样板 C01)。骨架照职位详情页:Shell 轨 + 右上返回 + H1 + 白卡。
//
// 版式顺序由 Frank 2026-08-11 定死:**他问的那个省 → 为什么 → 由易到难的替代 → 走不通的 → 第一步**。
// 上一版做成「四块无主的事实」,被点名「列一堆信息,用户看了有什么用」—— 摆事实不等于给答案。
// 每条路径下面挂的是判定核给的理由(met/gap/excluded),官方原句原样摆,页面不改写、不加戏。
import { BackButton } from '@/components/ui'
import { dropProvPrefix } from '@/lib/jobs'
import { useLang } from '@/components/i18n'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Shell, UI } from '@/components/ui'
import type { CaseAnswer, OpsFacts } from '@/lib/ruling/server'
import type { PathwayVerdict, VerdictReason } from '@/lib/ruling'
import { track } from '@/lib/track'

const CARD: React.CSSProperties = { background: '#fff', border: `1px solid ${UI.border}`, borderRadius: 12, padding: '16px 18px', margin: '0 0 10px' }
const H2: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 6px' }
const TONE: Record<VerdictReason['kind'], string> = { met: UI.ok, gap: '#b45309', excluded: '#b91c1c', 'needs-info': UI.text3 }
/** 摊开几条再折叠(走查 #299) */
const HEAD_N = 5
const SUMMARY: React.CSSProperties = { padding: '10px 0 2px', color: UI.primary, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }

export function Case({ caseId, answer }: { caseId: string; answer: CaseAnswer }) {
  const [lang, setLangSaved, t] = useLang()
  // 判定核给的理由:有 pv.* 键就走措辞层,没有(将来新加漏挂的)退回中文原句 —— 宁可露一句中文,不露键名
  const say = (r: VerdictReason) => (r.key ? t(r.key, r.params) : r.text)
  const provOf = (code: string) => { const full = t('prov.' + code); return full === 'prov.' + code ? code : full }
  const tierLabel = (tier: 0 | 1 | 2 | 3 | null) => t(`case.tier${tier ?? 0}`)

  // 供需:各省公布的口径不同,谁公布什么写什么,**不硬凑统一比值**。
  // 2026-08-11 Frank「不需要小字 都改成 bullet」——原来是 12px 灰字一行、三条用全角分号粘着
  //(英文态那个「；」也是中文标点)。现在返回条目数组,由 Path 摊进理由那张 bullet 列表,同字号。
  const supply = (o?: OpsFacts): string[] => {
    if (!o) return []
    const bits: string[] = []
    if (o.allocation != null && o.nominated != null) {
      bits.push(t('case.ops.spots', { total: o.allocation, used: o.nominated, left: Math.max(o.allocation - o.nominated, 0), period: o.allocPeriod ?? '' }))
    } else if (o.allocation != null) bits.push(t('case.ops.alloc', { n: o.allocation, period: o.allocPeriod ?? '' }))
    if (o.poolTotal != null) {
      // 期次形态决定说法:纯年份=年报的**年末快照**(MB);带日期=当天的**实时池**(AB)。
      // 两者差着一年,套同一句话就等于把去年的数说成今天的(2026-08-11 接 MB 时实拍撞到)。
      const key = !o.poolPeriod ? 'case.ops.pool' : /^\d{4}$/.test(o.poolPeriod) ? 'case.ops.poolAt' : 'case.ops.poolOn'
      bits.push(t(key, { n: o.poolTotal, period: o.poolPeriod ?? '' }))
    }
    if (o.nominated != null && o.refused != null) {
      const pct = Math.round((o.nominated / (o.nominated + o.refused)) * 1000) / 10
      bits.push(t('case.ops.approved', { pct, ok: o.nominated, no: o.refused, period: o.ytdPeriod ?? '' }))
    }
    return bits
  }

  // 一条通道 = 省 + 官方通道名 + 档位 + 判定核给的理由(官方原句原样挂)+ 该省供需
  const Path = ({ v, rank }: { v: PathwayVerdict; rank?: number }) => (
    <div style={{ borderTop: `1px solid ${UI.hairline}`, padding: '12px 0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        {rank ? <span style={{ color: UI.text3, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{rank}</span> : null}
        <span style={{ minWidth: 0, color: '#111827', fontSize: 14.5, fontWeight: 700 }}>
          {/* 省名与官方通道名之间留空,用样式不用全角空格 —— 全角空格在英文行里是一道明显的洞。
              走查 #293:通道名本身以省名开头的(New Brunswick Skilled Worker stream…)把前缀摘掉,
              否则一行里省名说两遍,还多折一行。 */}
          {v.province === 'FED' ? t('dp.federal') : provOf(v.province)}
          <span style={{ display: 'inline-block', width: 10 }} />
          {dropProvPrefix({ name: v.stream, prov: v.province === 'FED' ? '' : provOf(v.province) })}
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
                  {r.evidence?.url ? <> <a href={r.evidence.url} target="_blank" rel="noreferrer" style={{ marginLeft: 6, color: UI.primary, textDecoration: 'none' }}>{t('case.official')}</a></> : null}
                </span>
              </details>
            ) : <span style={{ color: TONE[r.kind] }}>{say(r)}</span>}
          </li>
        ))}
        {/* 工作机会:同档排序就是按它排的,所以每条路径下面把这个数摆出来 —— 排序依据必须看得见。
            跨省通道(AIP/RCIP/联邦)没有单一省份,openings 里查不到 → 不编,直接不出这条。 */}
        {answer.openings[v.province] ? (
          <li style={{ marginBottom: 5, color: UI.text2 }}>
            {answer.openings[v.province].t > 0
              ? t('case.openingsTrain', { n: answer.openings[v.province].n, m: answer.openings[v.province].t })
              : t('case.openings', { n: answer.openings[v.province].n })}
          </li>
        ) : null}
        {/* 该省公布的运营数字:与判定理由同列同字号,一条一个 bullet(不再是列表外的一行灰小字) */}
        {supply(answer.ops[v.province]).map((s, i) => (
          <li key={`ops${i}`} style={{ marginBottom: 5, color: UI.text3 }}>{s}</li>
        ))}
      </ul>
    </div>
  )

  // 段首说明一律走 bullet:一条一行、与路径理由同字号。
  // 撤的是「灰色小字整段」那种版式 —— Frank 2026-08-11 连指三处(供需行、概率框、段首句)。
  const Lead = ({ lines }: { lines: string[] }) => (
    <ul style={{ margin: '0 0 10px', padding: '0 0 0 18px', color: UI.text2, fontSize: 13, lineHeight: 1.75 }}>
      {lines.filter(Boolean).map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
    </ul>
  )

  // 摊平成一条有序队列(档位分组只是排序依据,不是版面分节),前 HEAD_N 条直出、其余折叠
  const flatTiers = answer.tiers.flatMap((g) => g.rows)
  let rank = 0
  return (
    <div className="caseWrap" style={{ background: UI.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', color: '#1f2937' }}>
      {/* #300 触控靶:640 断点下 summary 实测 23px,指头点不准;只扩点击区不动桌面版式 */}
      <style>{`@media(max-width:640px){.caseWrap summary{min-height:44px;display:flex;align-items:center}}`}</style>
      <Header lang={lang} setLang={setLangSaved} t={t} active="pathways" />
      <div style={{ flex: '1 0 auto' }}>
        <Shell top={16} bottom={40}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, margin: '0 0 12px' }}>
            <h1 style={{ flex: 1, minWidth: 0, fontSize: 22, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.45 }}>{t(`case.${caseId}.label`)}</h1>
            <BackButton href="/plan/pr" label={t('case.back')} />
          </div>

          {/* 用户原话,一个字不改。「用户原话」那个标签 2026-08-11 Frank 撤掉 —— 引号自己就说明了。
              引号跟着语言走:中文用「」,英韩用弯引号(英文句子外面套一对全角方头括号是明显的中文味) */}
          <div style={{ ...CARD, background: '#f8fbff', borderColor: '#dbeafe' }}>
            <div style={{ color: '#111827', fontSize: 16, fontWeight: 600, lineHeight: 1.65 }}>
              {lang === 'zh' ? `「${t(`case.${caseId}.q`)}」` : `“${t(`case.${caseId}.q`)}”`}
            </div>
          </div>

          {/* ① 先回答他点名问的那个省 */}
          {answer.asked ? (
            <div style={CARD}>
              <h2 style={H2}>{t('case.askedTitle', { prov: provOf(answer.asked.province) })}</h2>
              <Lead lines={[t('case.askedFastest', { fastest: tierLabel(answer.tiers[0]?.tier ?? 0) })]} />
              <Path v={answer.asked} />
              {/* 2026-08-11 Frank 撤掉「关于『概率』」整块。它是拿五句话去驳中介那个 80% ——
                  但**驳这件事本身就是加戏**:批准率、邀请数、名额剩余这些数已经在上面的 bullet 里逐条摆着,
                  用户看得出那个 80% 站不住。摆事实不需要再配一段解说词。 */}
            </div>
          ) : null}

          {/* ② 其余路径,由易到难。走查 #299:整页太长(英文 5.5k px)——
              **前 5 条摊开、其余收进 <details>**。第 6 条往后都是「更慢或更难」的,先看不着不影响判断;
              用原生 details 是因为内容仍在 DOM 里,爬虫照样吃得到(不是懒加载)。 */}
          {flatTiers.length ? (
            <div style={CARD}>
              <h2 style={H2}>{t('case.othersTitle')}</h2>
              {flatTiers.slice(0, HEAD_N).map((v) => { rank += 1; return <Path key={v.key} v={v} rank={rank} /> })}
              {flatTiers.length > HEAD_N ? (
                <details>
                  <summary style={SUMMARY}>{t('case.showMore', { n: flatTiers.length - HEAD_N })}</summary>
                  {flatTiers.slice(HEAD_N).map((v) => { rank += 1; return <Path key={v.key} v={v} rank={rank} /> })}
                </details>
              ) : null}
            </div>
          ) : null}

          {/* ③ 现在走不通的:整块收起 —— 它回答的是「哪些别去试」,不是他此刻要做的事 */}
          {answer.excluded.length ? (
            <div style={CARD}>
              <h2 style={{ ...H2, margin: 0 }}>{t('case.blockedTitle')}</h2>
              <details>
                <summary style={SUMMARY}>{t('case.showMore', { n: answer.excluded.length })}</summary>
                <Lead lines={[t('case.blockedLead')]} />
                {answer.excluded.map((v) => <Path key={v.key} v={v} />)}
              </details>
            </div>
          ) : null}

          {/* ④ 第一步:零经验的人先要的是「谁肯带」 */}
          {answer.trainable.length ? (
            <div style={CARD}>
              <h2 style={H2}>{t('case.firstStepTitle')}</h2>
              <Lead lines={[t('case.firstStepOffer'), t('case.firstStepCount', { n: answer.trainableTotal })]} />
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
            <Lead lines={[t('case.mineLead')]} />
            <a href="/plan/pr?quiz=1" onClick={() => track('case-to-quiz', { id: caseId })}
              style={{ display: 'inline-block', background: UI.primary, color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>
              {t('case.mineCta')}
            </a>
          </div>

          <div style={{ fontSize: 11.5, color: UI.text3, lineHeight: 1.7 }}>{t('case.note')}</div>
        </Shell>
      </div>
      <Footer t={t} />
    </div>
  )
}
