'use client'
// E12-09 · BC 注册打分自评(SIRS 200 分制)。Frank:「分不够赶紧换省换工作,不要继续耗」。
//
// 硬约束(别放宽):
//   ① 分值全部来自**官方分值表**(pnp_score_factors ← 官方 Program Guide PDF),前端一分都不许自己编;
//   ② 岗位能替用户答的两项(时薪、工作地区)直接用岗位数据算,人力资本三项由用户自选;
//   ③ 结果只能说「按官方分值表自算」,**不是资格认定**——官方以文件审核为准;
//   ④ 对照的分数线是**本省真实抽选记录**(pnp_draws, scale=SIRS),没有记录就不给对照,不编。
import { useMemo, useState } from 'react'

import type { JobRow, PnpDraw, ScoreFactor } from './JobsTable'
import type { TFn } from './i18n'

// 大温地区(Area 1)成员市镇 —— 官方 PDF 只写「Metro Vancouver Regional District」,成员名单是公开事实。
// 判不准就让用户自己选:默认按岗位城市猜,下拉可改(猜错比不猜更糟,所以默认值必须可改)。
const MVRD = ['vancouver', 'surrey', 'burnaby', 'richmond', 'coquitlam', 'delta', 'langley', 'maple ridge',
  'new westminster', 'north vancouver', 'port coquitlam', 'port moody', 'pitt meadows', 'white rock',
  'west vancouver', 'bowen island', 'anmore', 'belcarra', 'lions bay', 'tsawwassen']
const AREA2 = ['squamish', 'abbotsford', 'agassiz', 'mission', 'chilliwack']

const guessArea = (city: string): 0 | 1 | 2 => {
  const c = (city || '').toLowerCase()
  if (MVRD.some((m) => c.includes(m))) return 0
  if (AREA2.some((m) => c.includes(m))) return 1
  return 2
}

/** 岗位时薪:优先帖面时薪,否则用数据层折算年薪反推(官方口径:年薪 ÷ 52 ÷ 每周小时,30-40 之间) */
const hourlyOf = (job: JobRow): number | null => {
  const txt = job.salaryText || job.salary || ''
  const m = /\$?\s*(\d+(?:\.\d+)?)\s*(?:–|-|to)?\s*(\d+(?:\.\d+)?)?\s*\/?\s*(hr|hour|小时)/i.exec(txt)
  if (m) {
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : null
    return b ? (a + b) / 2 : a
  }
  if (job.salaryAnnual) return job.salaryAnnual / 52 / 40   // 官方允许 30-40,取 40 = 保守(算出的时薪更低)
  return null
}

// 官方标签是英文原文;中文/韩文界面按这张表出人话(**只译不改口径**,分值仍来自官方表)。
// 这是显示层映射:官方标签是固定小集合,若将来涨到几十条就该下沉数据层随分值一起存。
const L10N: Record<string, { zh: string; ko: string }> = {
  '5 or more years': { zh: '5 年以上', ko: '5년 이상' },
  'At least 4 but less than 5 years': { zh: '4-5 年', ko: '4~5년' },
  'At least 3 but less than 4 years': { zh: '3-4 年', ko: '3~4년' },
  'At least 2 but less than 3 years': { zh: '2-3 年', ko: '2~3년' },
  'At least 1 but less than 2 years': { zh: '1-2 年', ko: '1~2년' },
  'Less than 1 year': { zh: '不到 1 年', ko: '1년 미만' },
  'No experience': { zh: '无经验', ko: '경력 없음' },
  'At least 1 year of directly related experience in Canada': { zh: '在加拿大有 1 年以上同职业经验', ko: '캐나다 내 동일 직종 1년 이상' },
  'Currently working full-time in B.C. for the employer in the occupation identified in the BC PNP registration': { zh: '目前在 BC 为该雇主全职做同一职业', ko: '현재 BC에서 해당 고용주와 동일 직종 풀타임' },
  'Doctoral Degree': { zh: '博士', ko: '박사' },
  'Master’s Degree': { zh: '硕士', ko: '석사' },
  'Post-Graduate Certificate or Diploma*': { zh: '研究生证书或文凭', ko: '대학원 수료증·디플로마' },
  'Bachelor’s Degree': { zh: '学士', ko: '학사' },
  'Associate Degree': { zh: '副学士', ko: '준학사' },
  'Post-secondary Diploma/Certificate (Trades or Non-Trades)': { zh: '大专文凭或证书(含技工)', ko: '전문대 디플로마·자격증' },
  'Secondary School (High School) or Less': { zh: '高中及以下', ko: '고졸 이하' },
  'Post-secondary education completed in B.C., or': { zh: '学历在 BC 读的', ko: 'BC에서 취득한 학력' },
  'Post-secondary education completed in Canada (outside of B.C.)': { zh: '学历在加拿大其它省读的', ko: '캐나다 타 주에서 취득' },
  'Eligible professional designation in B.C.': { zh: '持 BC 认可的执业资格', ko: 'BC 인정 전문 자격 보유' },
  'Below 4 or no test submitted': { zh: '低于 4 或没考', ko: '4 미만 또는 미제출' },
  'Language proficiency in both English and French': { zh: '英法双语都达标', ko: '영어·프랑스어 모두 충족' },
  'Area 1: Metro Vancouver Regional District': { zh: '大温地区', ko: '메트로 밴쿠버' },
  'Area 2: Squamish, Abbotsford, Agassiz, Mission, and Chilliwack': { zh: 'Squamish、Abbotsford、Agassiz、Mission、Chilliwack', ko: 'Squamish 등 5개 지역' },
  'Area 3: Areas of B.C. not included in Area 1 or 2': { zh: 'BC 其余地区', ko: 'BC 기타 지역' },
  'Regional Experience, or': { zh: '有地区工作经验或地区院校毕业', ko: '지역 근무 경력 또는 지역 졸업' },
}
const label = (raw: string, lang: string) => (lang === 'zh' ? L10N[raw]?.zh : lang === 'ko' ? L10N[raw]?.ko : '') || raw

export function BcSirsCard({ t, lang, job, factors, draws, profileClb }: {
  t: TFn; lang: string; job: JobRow; factors: ScoreFactor[]; draws: PnpDraw[]; profileClb?: number | null
}) {
  const bc = useMemo(() => factors.filter((f) => f.province === 'BC'), [factors])
  const rows = (factor: string) => bc.filter((f) => f.factor === factor && f.kind === 'row')
  const bonus = (factor: string) => bc.filter((f) => f.factor === factor && f.kind === 'bonus')
  const wageRule = bc.find((f) => f.factor === 'wage' && f.kind === 'rule')

  // 人力资本三项:用户自选(语言默认取档案自报 CLB)
  const clbDefault = () => {
    const rs = rows('language')
    if (profileClb == null) return rs.length - 1
    const want = profileClb >= 9 ? '9+' : String(Math.max(4, Math.min(8, Math.floor(profileClb))))
    const i = rs.findIndex((r) => r.label.trim() === want)
    return i >= 0 ? i : rs.length - 1
  }
  const [workI, setWorkI] = useState(() => Math.max(0, rows('work').length - 1))
  const [eduI, setEduI] = useState(() => Math.max(0, rows('education').length - 1))
  const [langI, setLangI] = useState(clbDefault)
  const [areaI, setAreaI] = useState(() => guessArea(job.city || ''))
  const [ticks, setTicks] = useState<Record<string, boolean>>({})

  if (!bc.length) return null

  const hourly = hourlyOf(job)
  const wagePts = (() => {
    if (hourly == null || !wageRule) return null
    let cfg: { floorAt?: number; capAt?: number } = {}
    try { cfg = JSON.parse(wageRule.rule || '{}') } catch { /* 规则串坏了就按官方默认 */ }
    const floorAt = cfg.floorAt ?? 16, capAt = cfg.capAt ?? 70
    if (hourly < floorAt) return 0
    return Math.min(Math.floor(Math.min(hourly, capAt)) - 15, wageRule.factorMax ?? 55)
  })()

  const pick = (factor: string, i: number) => rows(factor)[i]?.points ?? 0
  // 加分:xorPrev 组内只取被勾中的最大一项(官方原文「…, or」)
  const bonusPts = (factor: string) => {
    const list = bonus(factor)
    let sum = 0, groupBest = 0, inGroup = false
    list.forEach((b, i) => {
      const on = !!ticks[`${factor}:${i}`]
      const next = list[i + 1]
      if (next?.xorPrev) { inGroup = true; groupBest = Math.max(groupBest, on ? (b.points ?? 0) : 0); return }
      if (b.xorPrev) {
        groupBest = Math.max(groupBest, on ? (b.points ?? 0) : 0)
        sum += groupBest; groupBest = 0; inGroup = false
        return
      }
      if (inGroup) { sum += groupBest; groupBest = 0; inGroup = false }
      if (on) sum += b.points ?? 0
    })
    return sum + groupBest
  }

  const parts = [
    { k: 'work', label: t('sirs.f.work'), pts: pick('work', workI) + bonusPts('work'), max: bc.find((f) => f.factor === 'work')?.factorMax ?? 40 },
    { k: 'education', label: t('sirs.f.education'), pts: pick('education', eduI) + bonusPts('education'), max: 40 },
    { k: 'language', label: t('sirs.f.language'), pts: pick('language', langI) + bonusPts('language'), max: 40 },
    { k: 'wage', label: t('sirs.f.wage'), pts: wagePts ?? 0, max: wageRule?.factorMax ?? 55, auto: true },
    { k: 'area', label: t('sirs.f.area'), pts: pick('area', areaI) + bonusPts('area'), max: 25, auto: true },
  ]
  const total = parts.reduce((s, p) => s + p.pts, 0)
  const maxTotal = bc[0]?.maxTotal ?? 200

  // 对照:本省真实抽选记录(SIRS 分制),没有就不给对照
  const bcDraws = draws.filter((d) => d.province === 'BC' && d.kind !== 'notice' && d.score != null)
    .sort((a, b) => (a.drawDate < b.drawDate ? 1 : -1)).slice(0, 3)
  const latest = bcDraws[0]
  const gap = latest?.score != null ? total - latest.score : null

  const sel: React.CSSProperties = { width: '100%', height: 34, border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff', padding: '0 8px' }
  const lbl: React.CSSProperties = { fontSize: 12, color: '#6b7280', marginBottom: 3 }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '13px 14px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#111827' }}>{t('sirs.title')}</span>
        <span style={{ fontSize: 11.5, color: '#9ca3af' }}>{bc[0]?.system} {maxTotal}</span>
        <a href={bc[0]?.url} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', fontSize: 11.5, color: '#2563eb', textDecoration: 'none' }}>{t('sirs.official')} ↗</a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        <div><div style={lbl}>{t('sirs.f.work')}</div>
          <select value={workI} onChange={(e) => setWorkI(Number(e.target.value))} style={sel}>
            {rows('work').map((r, i) => <option key={r.label} value={i}>{label(r.label, lang)}</option>)}
          </select></div>
        <div><div style={lbl}>{t('sirs.f.education')}</div>
          <select value={eduI} onChange={(e) => setEduI(Number(e.target.value))} style={sel}>
            {rows('education').map((r, i) => <option key={r.label} value={i}>{label(r.label, lang)}</option>)}
          </select></div>
        <div><div style={lbl}>{t('sirs.f.language')}</div>
          <select value={langI} onChange={(e) => setLangI(Number(e.target.value))} style={sel}>
            {rows('language').map((r, i) => <option key={r.label} value={i}>{/^[\d+]/.test(r.label) ? `CLB ${r.label}` : label(r.label, lang)}</option>)}
          </select></div>
        <div><div style={lbl}>{t('sirs.f.area')}</div>
          <select value={areaI} onChange={(e) => setAreaI(Number(e.target.value) as 0 | 1 | 2)} style={sel}>
            {rows('area').map((r, i) => <option key={r.label} value={i}>{label(r.label, lang)}</option>)}
          </select></div>
      </div>

      {/* 加分项:官方逐条,勾了才算;二选一组只算一项 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 10 }}>
        {(['work', 'education', 'language', 'area'] as const).flatMap((f) => bonus(f).map((b, i) => (
          <label key={`${f}:${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#374151', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!ticks[`${f}:${i}`]} onChange={(e) => setTicks((m) => ({ ...m, [`${f}:${i}`]: e.target.checked }))} />
            {label(b.label, lang)} <span style={{ color: '#9ca3af' }}>+{b.points}</span>
          </label>
        )))}
      </div>

      {/* 合计与分项 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'max-content max-content 1fr', columnGap: 12, rowGap: 3, alignItems: 'baseline', marginTop: 12, fontSize: 13 }}>
        {parts.flatMap((p) => [
          <span key={p.k + 'k'} style={{ color: '#9ca3af' }}>{p.label}</span>,
          <span key={p.k + 'v'} style={{ color: '#374151', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{p.pts} / {p.max}</span>,
          <span key={p.k + 'n'} style={{ fontSize: 11.5, color: '#9ca3af' }}>{p.auto ? t('sirs.fromJob') : ''}</span>,
        ])}
        <span style={{ color: '#111827', fontWeight: 700 }}>{t('sirs.total')}</span>
        <span style={{ color: '#1d4ed8', fontWeight: 700, fontSize: 17, fontVariantNumeric: 'tabular-nums' }}>{total} / {maxTotal}</span>
        <span />
      </div>

      {/* 与真实抽选线对照 —— 没有抽选记录就不给对照 */}
      {latest?.score != null ? (
        <div style={{ marginTop: 10, padding: '9px 11px', borderRadius: 8, background: (gap ?? 0) >= 0 ? '#f0fdf4' : '#fffbeb', fontSize: 12.5, color: (gap ?? 0) >= 0 ? '#166534' : '#b45309' }}>
          {(gap ?? 0) >= 0
            ? t('sirs.above', { gap: gap ?? 0, score: latest.score, date: (latest.drawDate || '').slice(0, 10), stream: latest.stream })
            : t('sirs.below', { gap: Math.abs(gap ?? 0), score: latest.score, date: (latest.drawDate || '').slice(0, 10), stream: latest.stream })}
        </div>
      ) : null}

      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, lineHeight: 1.6 }}>
        {t('sirs.note', { d: bc[0]?.guideEffective || '—' })}
      </div>
    </div>
  )
}
