'use client'
// E12-09 · 省提名自评打分 + 跨省对照。Frank:「分不够赶紧换省换工作,不要继续耗」。
//
// 从 BcSirsCard(只有 BC)改成两省对照 —— **有两个省才谈得上「换哪个省更快」**,这是这块的全部价值。
// 现有:BC SIRS 200 分制(对照真实抽选线)/ SK SINP 110 分制(对照官方 60 分申请门槛)。
//
// 硬约束(别放宽):
//   ① 分值全部来自 pnp_score_factors(官方分值表),前端一分都不许自己编;算法见 pnpSelfScore.ts;
//   ② 用户只填**一套条件**,各省按各自官方表折算,并把命中的官方原文标签显出来让用户核对;
//   ③ 对照锚点只能是官方事实:BC=真实抽选记录(pnp_draws),SK=官方申请门槛 —— 没有就写「官方未公布」,不编;
//   ④ 结果只能说「按官方分值表自算」,**不是资格认定**;
//   ⑤ 默认值一律取保守值(非本岗省份的工作地区默认 0 分档),不许用有利默认把分数吹上去。
import { useEffect, useMemo, useState } from 'react'

import type { TFn } from './i18n'
import { DEFAULT_PROFILE, EDU_KEYS, scoreProvince, type DrawRow, type EduKey, type ScoreFactor, type SelfProfile } from './pnpSelfScore'

// 打分是**关于你这个人**的功能,不绑某一个岗位(Frank 2026-07-27「应该单独弄个功能吧,
// 不应该放到 pnp 弹框里面」)—— 所以只收一个轻量语境:职业(拿该省在招数)、目标省(排序)、
// 时薪与城市(BC 的两项按官方规则要用,拿不到就让用户自己填)。全是可选。
export type ScoreCtx = { noc?: string; province?: string; hourly?: number | null; city?: string; hasOffer?: boolean }

// 大温地区(Area 1)成员市镇 —— 官方 PDF 只写「Metro Vancouver Regional District」,成员名单是公开事实。
const MVRD = ['vancouver', 'surrey', 'burnaby', 'richmond', 'coquitlam', 'delta', 'langley', 'maple ridge',
  'new westminster', 'north vancouver', 'port coquitlam', 'port moody', 'pitt meadows', 'white rock',
  'west vancouver', 'bowen island', 'anmore', 'belcarra', 'lions bay', 'tsawwassen']
const AREA2 = ['squamish', 'abbotsford', 'agassiz', 'mission', 'chilliwack']
const guessArea = (city: string): number => {
  const c = (city || '').toLowerCase()
  if (MVRD.some((m) => c.includes(m))) return 0
  if (AREA2.some((m) => c.includes(m))) return 1
  return 2
}

// 官方标签是英文原文;中文/韩文界面按这张表出人话(**只译不改口径**,分值仍来自官方表)。
const L10N: Record<string, { zh: string; ko: string }> = {
  // BC
  'At least 1 year of directly related experience in Canada': { zh: '在加拿大有 1 年以上同职业经验', ko: '캐나다 내 동일 직종 1년 이상' },
  'Currently working full-time in B.C. for the employer in the occupation identified in the BC PNP registration': { zh: '目前在 BC 为该雇主全职做同一职业', ko: '현재 BC에서 해당 고용주와 동일 직종 풀타임' },
  'Post-secondary education completed in B.C., or': { zh: '学历在 BC 读的', ko: 'BC에서 취득한 학력' },
  'Post-secondary education completed in Canada (outside of B.C.)': { zh: '学历在加拿大其它省读的', ko: '캐나다 타 주에서 취득' },
  'Eligible professional designation in B.C.': { zh: '持 BC 认可的执业资格', ko: 'BC 인정 전문 자격 보유' },
  'Language proficiency in both English and French': { zh: '英法双语都达标', ko: '영어·프랑스어 모두 충족' },
  'Area 1: Metro Vancouver Regional District': { zh: 'Area 1 大温地区', ko: 'Area 1 메트로 밴쿠버' },
  'Area 2: Squamish, Abbotsford, Agassiz, Mission, and Chilliwack': { zh: 'Area 2 Squamish 等 5 市镇', ko: 'Area 2 Squamish 등 5개 지역' },
  'Area 3: Areas of B.C. not included in Area 1 or 2': { zh: 'Area 3 其余地区', ko: 'Area 3 기타 지역' },
  'Regional Experience, or': { zh: '有地区工作经验或地区院校毕业', ko: '지역 근무 경력 또는 지역 졸업' },
  // SK
  'High skilled employment offer from a Saskatchewan employer': { zh: '有 SK 雇主的高技能岗 offer', ko: 'SK 고용주의 고숙련 오퍼 보유' },
  'Close family relative in Saskatchewan': { zh: '在 SK 有近亲(公民或永居)', ko: 'SK에 가까운 친척 거주' },
  'Past work experience in Saskatchewan': { zh: '在 SK 工作过(近 5 年满 12 个月)', ko: 'SK 근무 경력(최근 5년 12개월)' },
  'Past student experience in Saskatchewan': { zh: '在 SK 读过书(满一学年)', ko: 'SK 유학 경험(1학년도 이상)' },
}
const label = (raw: string, lang: string) => (lang === 'zh' ? L10N[raw]?.zh : lang === 'ko' ? L10N[raw]?.ko : '') || raw

const sel: React.CSSProperties = { width: '100%', height: 34, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff', padding: '0 8px' }
const lbl: React.CSSProperties = { fontSize: 12, color: '#6b7280', marginBottom: 3 }

// 抽选线要对得上通道:BC 现行是**按通道分别设线**(近 12 次里 Build 97 / Care: Health 96 / Innovate 132 /
// 偏远医疗 50),拿最近一次的 50 去比一个木匠的分是错的对照。所以先按通道名匹配,匹配不上就不给差分结论。
// 通道名两边写法不同(岗位侧「BC PNP Build: construction trades targeted ITA」/ 抽选侧「Build: Construction Trades」)
// → 取实词做子集判断,不做字面相等。
const STREAM_STOP = new Set(['bc', 'pnp', 'the', 'and', 'targeted', 'ita', 'stream', 'authority', 'initiative', 'only', 'all'])
const streamWords = (s: string) => (s || '').toLowerCase().replace(/[^a-z]+/g, ' ').split(' ').filter((w) => w.length > 2 && !STREAM_STOP.has(w))
const streamMatches = (drawStream: string, jobStream: string) => {
  const a = streamWords(drawStream), b = new Set(streamWords(jobStream))
  return a.length > 0 && b.size > 0 && a.every((w) => b.has(w))
}

/** 加分项一条 = [勾选框 | 条目 | +N] 三列 —— +N 单独成列才对得齐(别塞回文字尾巴上) */
function Tick({ on, onToggle, text, pts }: { on: boolean; onToggle: (v: boolean) => void; text: string; pts: number | null }) {
  return (
    <label style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr max-content', alignItems: 'baseline',
      columnGap: 5, fontSize: 12, color: '#374151', cursor: 'pointer', lineHeight: 1.7 }}>
      <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} style={{ alignSelf: 'center' }} />
      <span>{text}</span>
      <span style={{ color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>+{pts}</span>
    </label>
  )
}

export function PnpScoreCard({ t, lang, ctx, factors, draws, profileClb, streams = {} }: {
  t: TFn; lang: string; ctx: ScoreCtx; factors: ScoreFactor[]; draws: DrawRow[]; profileClb?: number | null
  /** 省 → 你的职业命中的具名通道名。抽选线按通道对照,对不上就不给差分结论(见 ProvinceResult) */
  streams?: Record<string, string>
}) {
  // 有官方分值表的省(数据层决定,加省不用改这里)。目标省排第一列,其余省作「换省」对照。
  const provinces = useMemo(() => {
    const all = Array.from(new Set(factors.map((f) => f.province))).filter(Boolean)
    return all.sort((a, b) => (a === ctx.province ? -1 : b === ctx.province ? 1 : a < b ? -1 : 1))
  }, [factors, ctx.province])

  const [profile, setProfile] = useState<SelfProfile>(() => ({ ...DEFAULT_PROFILE, clb1: profileClb ?? DEFAULT_PROFILE.clb1 }))
  const set = <K extends keyof SelfProfile>(k: K, v: SelfProfile[K]) => setProfile((p) => ({ ...p, [k]: v }))
  const [ticks, setTicks] = useState<Record<string, boolean>>({})
  const [wage, setWage] = useState<number>(() => Math.round(ctx.hourly ?? 0))
  // 保守默认:知道城市才猜地区,否则默认 Area 1(0 分)—— 不许用有利默认把分数吹上去
  const [areaI, setAreaI] = useState<number>(() => (ctx.city ? guessArea(ctx.city) : 0))
  const [hasOffer, setHasOffer] = useState<boolean>(() => !!ctx.hasOffer)

  // 换省事实:同职业在各省的在招数(/api/quiz?noc= 已有,免费事实,不新增端点)
  const [byProv, setByProv] = useState<Record<string, { n: number; eligible: number }>>({})
  useEffect(() => {
    if (!ctx.noc) return
    let dead = false
    fetch(`/api/quiz?noc=${ctx.noc}`).then((r) => r.json()).then((d) => {
      if (dead || !d?.facts?.byProv) return
      setByProv(Object.fromEntries(d.facts.byProv.map((r: any) => [r.province, { n: r.n, eligible: r.eligible }])))
    }).catch(() => { /* 事实拿不到就不显示,不编 */ })
    return () => { dead = true }
  }, [ctx.noc])

  const scores = useMemo(() => provinces.map((prov) => {
    const mine = factors.filter((f) => f.province === prov)
    const overrides: Record<string, { pts: number; matched: string; source: 'profile' | 'job' | 'tick' }> = {}
    // BC:时薪按官方规则算(每整元 1 分,$16 起、$70 封顶);地区取用户选的档
    const wageRule = mine.find((f) => f.factor === 'wage' && f.kind === 'rule')
    if (wageRule) {
      let cfg: { floorAt?: number; capAt?: number } = {}
      try { cfg = JSON.parse(wageRule.rule || '{}') } catch { /* 规则串坏了就按官方默认 */ }
      const floorAt = cfg.floorAt ?? 16, capAt = cfg.capAt ?? 70
      const pts = wage < floorAt ? 0 : Math.min(Math.floor(Math.min(wage, capAt)) - 15, wageRule.factorMax ?? 55)
      overrides.wage = { pts, matched: `$${wage}/hr`, source: 'job' }
    }
    const areaRows = mine.filter((f) => f.factor === 'area' && f.kind === 'row')
    if (areaRows.length) {
      const r = areaRows[Math.min(areaI, areaRows.length - 1)]
      overrides.area = { pts: r?.points ?? 0, matched: r?.label ?? '', source: 'job' }
    }
    const offerRows = mine.filter((f) => f.factor === 'offer' && f.kind === 'row')
    if (offerRows.length) {
      overrides.offer = { pts: hasOffer ? (offerRows[0].points ?? 0) : 0, matched: offerRows[0].label, source: 'tick' }
    }
    return scoreProvince(factors, prov, profile, overrides, ticks)
  }).filter(Boolean) as NonNullable<ReturnType<typeof scoreProvince>>[], [provinces, factors, profile, ticks, wage, areaI, hasOffer])

  if (!scores.length) return null

  const bonusOf = (prov: string) => factors.filter((f) => f.province === prov && f.kind === 'bonus')
  const num = (n: number) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{n}</span>

  return (
    // 卡壳(边框/圆角/内边距)由外层 MODAL_CARD 提供 —— 这里再画一层就是卡中卡
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>{t('ps.title')}</h2>
        <span style={{ fontSize: 11.5, color: '#9ca3af' }}>{scores.map((s) => `${s.province} ${s.system}`).join('、')}</span>
      </div>

      {/* 你的条件 —— 一套答案,各省按各自官方表折算 */}
      <div style={lbl}>{t('ps.you')}</div>
      {/* 126 = 375 手机上正好两列:弹框内宽 301 − 卡片左右 padding 28 = 273,126×2+10=262 放得下
          (先试的 132 差 1px 就掉回一列 —— 算的时候别忘了减卡片自己的 padding)。纯 CSS auto-fit,不做 JS 宽度探测 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(126px, 1fr))', gap: 10 }}>
        <div><div style={lbl}>{t('ps.f.education')}</div>
          <select value={profile.edu} onChange={(e) => set('edu', e.target.value as EduKey)} style={sel}>
            {EDU_KEYS.map((k) => <option key={k} value={k}>{t('ps.edu.' + k)}</option>)}
          </select></div>
        <div><div style={lbl}>{t('ps.f.expRecent')}</div>
          <select value={profile.expRecent} onChange={(e) => set('expRecent', Number(e.target.value))} style={sel}>
            {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 5 ? t('ps.yr5') : t('ps.yr', { n })}</option>)}
          </select></div>
        <div><div style={lbl}>{t('ps.f.expOlder')}</div>
          <select value={profile.expOlder} onChange={(e) => set('expOlder', Number(e.target.value))} style={sel}>
            {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 5 ? t('ps.yr5') : t('ps.yr', { n })}</option>)}
          </select></div>
        <div><div style={lbl}>{t('ps.f.clb1')}</div>
          <select value={profile.clb1} onChange={(e) => set('clb1', Number(e.target.value))} style={sel}>
            <option value={0}>{t('ps.clbNone')}</option>
            {[4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>CLB {n}</option>)}
          </select></div>
        <div><div style={lbl}>{t('ps.f.clb2')}</div>
          <select value={profile.clb2} onChange={(e) => set('clb2', Number(e.target.value))} style={sel}>
            <option value={0}>{t('ps.clbNone')}</option>
            {[4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>CLB {n}</option>)}
          </select></div>
        <div><div style={lbl}>{t('ps.f.age')}</div>
          <select value={profile.age} onChange={(e) => set('age', Number(e.target.value))} style={sel}>
            {[17, 19, 25, 30, 34, 38, 42, 45, 48, 52].map((n) => <option key={n} value={n}>{t('ps.age.v', { n })}</option>)}
          </select></div>
        {scores.some((s) => s.parts.some((p) => p.factor === 'wage')) ? (
          <div><div style={lbl}>{t('ps.in.wage')}</div>
            <input type="number" value={wage} min={0} onChange={(e) => setWage(Number(e.target.value))} style={sel} /></div>
        ) : null}
        {scores.some((s) => s.parts.some((p) => p.factor === 'area')) ? (
          <div><div style={lbl}>{t('ps.in.area')}</div>
            <select value={areaI} onChange={(e) => setAreaI(Number(e.target.value))} style={sel}>
              {factors.filter((f) => f.factor === 'area' && f.kind === 'row').map((r, i) => <option key={r.label} value={i}>{label(r.label, lang)}</option>)}
            </select></div>
        ) : null}
      </div>

      {/* 加分项:官方逐条,勾了才算;二选一组只算一项 */}
      {provinces.map((prov) => {
        const list = bonusOf(prov)
        const offerRow = factors.find((f) => f.province === prov && f.factor === 'offer' && f.kind === 'row')
        if (!list.length && !offerRow) return null
        return (
          <div key={prov} style={{ marginTop: 10 }}>
            <div style={lbl}>{t('ps.bonusOf', { prov })}</div>
            {/* 一行两个事实(条目、+N)必须拆成列 —— 原来 +N 跟在文字后面飘,长短不一就参差
                (同 FactGrid 规矩:多值卡拆列、每列左对齐)。外层 auto-fit 决定几列,
                每个条目内部再 [勾选框 | 条目 | +N] 三列,+N 因此在同一列上对齐。 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '4px 16px' }}>
              {offerRow ? (
                <Tick on={hasOffer} onToggle={setHasOffer} text={label(offerRow.label, lang)} pts={offerRow.points} />
              ) : null}
              {list.map((b) => {
                const key = `${prov}:${b.factor}:${b.seq}`
                return (
                  <Tick key={key} on={!!ticks[key]} onToggle={(v) => setTicks((m) => ({ ...m, [key]: v }))}
                    text={label(b.label, lang)} pts={b.points} />
                )
              })}
            </div>
          </div>
        )
      })}

      {/* 各省结果:估分 + 官方对照线 + 差多少 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10, marginTop: 12 }}>
        {scores.map((s) => <ProvinceResult key={s.province} t={t} lang={lang} s={s} draws={draws} byProv={byProv}
          switchable={s.province !== ctx.province} matchedStream={streams[s.province] || ''} factors={factors} />)}
      </div>

      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, lineHeight: 1.7 }}>
        <div>{t('ps.note')}</div>
        <div>{scores.map((s) => `${s.province} ${s.guideEffective ? t('ps.eff', { d: s.guideEffective }) : t('ps.asof', { d: s.fetched })}`).join('、')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 2 }}>
          {scores.map((s) => (
            <a key={s.province} href={s.url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>{s.province} {t('ps.official')}</a>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProvinceResult({ t, lang, s, draws, byProv, switchable, matchedStream, factors }: {
  t: TFn; lang: string; s: NonNullable<ReturnType<typeof scoreProvince>>; draws: DrawRow[]
  byProv: Record<string, { n: number; eligible: number }>; switchable: boolean
  matchedStream: string; factors: ScoreFactor[]
}) {
  // 对照锚,按可信度排序:①本岗所在通道的最近一次抽选;②官方申请门槛;
  // ③都没有 → 只摆近期各通道分数线区间,**不给差分结论**(拿别的通道的线判你差多少分是编)。
  // 打分表可以自报它属于哪条通道(system 里的括号,如「OINP EOI points (Ontario Workforce Priority stream)」)——
  // ON 已公布的分数线全是改制前已关停通道的 EOI 分,与新通道不是同一套分制,拿来对照就是错的锚。
  // 声明了通道的省,只认同一条通道的抽选;没声明的(BC SIRS / SK)照旧全取。
  const gridStream = /\(([^)]+)\)\s*$/.exec(s.system)?.[1] ?? ''
  const scored = draws.filter((d) => d.province === s.province && d.kind !== 'notice' && d.score != null)
    .filter((d) => !gridStream || streamMatches(d.stream, gridStream))
    .sort((a, b) => (a.drawDate < b.drawDate ? 1 : -1))
  const latest = scored.find((d) => streamMatches(d.stream, matchedStream))
  const line = latest?.score ?? s.passMark ?? null
  const gap = line == null ? null : s.total - line
  const ok = (gap ?? 0) >= 0
  // 该省有分数线、但全是别的通道的(ON:旧通道已关停)→ 说清楚为什么这里没有线,而不是含糊说「未公布」
  const hasOtherStreamDraws = !scored.length && draws.some((d) => d.province === s.province && d.kind !== 'notice' && d.score != null)
  const range = line == null && scored.length
    ? { lo: Math.min(...scored.map((d) => d.score as number)), hi: Math.max(...scored.map((d) => d.score as number)), n: scored.length }
    : null

  // 「换省」可操作的一步:该省官方给雇主 offer 记多少分 —— 拿到就 +N,直接说出合计
  const offerRow = factors.find((f) => f.province === s.province && f.factor === 'offer' && f.kind === 'row')
  const offerPart = s.parts.find((p) => p.factor === 'offer')
  const offerGain = switchable && offerRow && (offerPart?.pts ?? 0) === 0 ? (offerRow.points ?? 0) : 0
  const jobs = byProv[s.province]

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 11px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{t('prov.' + s.province) || s.province}</span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>{s.system}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#1d4ed8', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
        {/* 「/ 总分」只在官方**公布了**总分上限时才显示:ON 的 OINP EOI 页只印各项分值、不印总分,
            拿各项相加冒充官方总分就是编数(BC 200 / SK 110 都是官方白纸黑字印着的) */}
        {s.total}{s.maxTotal ? <span style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500 }}> / {s.maxTotal}</span> : null}
      </div>

      {/* 分项:命中的官方原文标签一并显出来,好让用户核对我们选对了没有 */}
      {/* 「12 / 40」是两个事实 —— 拆成 得分 / 上限 两列(斜杠自成一列),数字才跨行对齐。
          标签列吃 max-content、数字列右对齐:两张省卡等宽,数字列因此也跨卡对齐。 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr max-content max-content', columnGap: 6, rowGap: 2, marginTop: 6, fontSize: 12, alignItems: 'baseline' }}>
        {s.parts.filter((p) => p.max > 0).map((p) => [
          <span key={p.factor + 'k'} style={{ color: '#9ca3af', gridColumn: '1 / 3' }} title={p.matched ? label(p.matched, lang) : ''}>{t('ps.f.' + p.factor) || p.factor}</span>,
          <span key={p.factor + 'v'} style={{ color: '#374151', fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'right', minWidth: 22 }}>{p.pts}</span>,
          <span key={p.factor + 'm'} style={{ color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>/ {p.max}</span>,
        ]).flat()}
      </div>

      <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, fontSize: 12.5, lineHeight: 1.6,
        background: line == null ? '#f9fafb' : ok ? '#f0fdf4' : '#fffbeb', color: line == null ? '#6b7280' : ok ? '#166534' : '#b45309' }}>
        {line == null ? (range ? t('ps.range', { lo: range.lo, hi: range.hi, n: range.n }) : t(hasOtherStreamDraws ? 'ps.noLineStream' : 'ps.noLine')) : (
          <>
            {latest?.score != null
              ? t('ps.cut', { n: line, date: (latest.drawDate || '').slice(0, 10), stream: latest.stream })
              : t('ps.pass', { n: line })}
            <br />
            {ok ? t('ps.over', { n: gap ?? 0 }) : t('ps.under', { n: Math.abs(gap ?? 0) })}
          </>
        )}
      </div>

      {/* 换省这一步具体怎么走:官方给的 offer 分 + 该省同职业在招数(都是事实,不评价「更容易」) */}
      {offerGain > 0 ? (
        <div style={{ fontSize: 12, color: '#374151', marginTop: 6, lineHeight: 1.6 }}>
          {t('ps.switch', { prov: t('prov.' + s.province) || s.province, n: offerGain, total: s.maxTotal ? Math.min(s.total + offerGain, s.maxTotal) : s.total + offerGain })}
        </div>
      ) : null}
      {jobs ? (
        <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 4 }}>{t('ps.openJobs', { n: jobs.n, e: jobs.eligible })}</div>
      ) : null}
    </div>
  )
}
