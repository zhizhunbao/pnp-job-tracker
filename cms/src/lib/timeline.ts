// 政策时间线读取(C6-01):三路在库事件源合并 + 抽选节奏统计。零 schema 改动,SQL 只 SELECT。
// 诚实红线循 E6-04:省分数带分制标注(≠CRS);节奏只报历史统计不预测下一次(伪权威红线)。

export type TlEvent = {
  date: string                       // YYYY-MM-DD
  prov: string                       // 两字省码;'' = 联邦
  kind: 'draw' | 'notice' | 'policy' // 抽选 / 省通告 / 政策公告(news)
  title: string                      // draw=流名;policy=新闻标题
  score: number | null               // draw:最低分
  scale: string                      // draw:分制标注(SIRS/WEOI/…,'' = 无)
  invitations: number | null         // draw:邀请数
  note: string                       // notice/policy 摘要
  importance: number | null          // policy:AI 重要度 1-5
  url: string                        // 外链(官方来源)或 ''
  slug: string                       // policy:站内 /news/[slug]
}

export type TlCadence = {
  prov: string; stream: string; scale: string
  last: string                       // 最近抽选日期
  daysSince: number                  // 距今天数(服务端算,当天口径 UTC 日)
  avgGapDays: number | null          // 近几期平均间隔(<2 期 = null)
  draws: number                      // 在库期数
}

const day = (v: any): string => {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v ?? '').slice(0, 10)
}

export async function fetchTimeline(pool: any): Promise<{ events: TlEvent[]; cadence: TlCadence[]; eeCadence: { category: string; label: string; last: string; daysSince: number }[] }> {
  const [draws, ee, news] = await Promise.all([
    pool.query(`SELECT province, kind, draw_date, stream, score, scale, invitations, note, label, url FROM pnp_draws`),
    // 各类别最新一期抽选(类别多 NOC 行共享同一期,按 category 去重)
    pool.query(`SELECT DISTINCT ON (category) category, label, draw_crs, draw_date, draw_size, url FROM ee_categories
                WHERE draw_date IS NOT NULL AND draw_date <> '' ORDER BY category`),
    pool.query(`SELECT region, title, date, slug, importance, url FROM news ORDER BY date DESC LIMIT 90`),
  ])
  const today = new Date().toISOString().slice(0, 10)
  const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000)

  const events: TlEvent[] = []
  for (const r of draws.rows) {
    events.push({
      date: day(r.draw_date), prov: r.province ?? '', kind: r.kind === 'notice' ? 'notice' : 'draw',
      title: r.label || r.stream || '', score: r.score == null ? null : Number(r.score), scale: r.scale ?? '',
      invitations: r.invitations == null ? null : Number(r.invitations), note: r.note ?? '',
      importance: null, url: r.url ?? '', slug: '',
    })
  }
  for (const r of ee.rows) {
    events.push({
      date: day(r.draw_date), prov: '', kind: 'draw', title: r.label || r.category,
      score: r.draw_crs == null ? null : Number(r.draw_crs), scale: 'CRS',
      invitations: r.draw_size == null ? null : Number(r.draw_size), note: '',
      importance: null, url: r.url ?? '', slug: '',
    })
  }
  for (const r of news.rows) {
    const region = (r.region ?? '').toUpperCase()
    events.push({
      date: day(r.date), prov: region === 'FEDERAL' || region === 'CA' ? '' : region, kind: 'policy',
      title: r.title ?? '', score: null, scale: '', invitations: null, note: '',
      importance: r.importance == null ? null : Number(r.importance), url: '', slug: r.slug ?? '',
    })
  }
  events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  // 抽选节奏(省×项目,kind=draw 且有日期;只报历史统计)。
  // 分组键=label||stream(项目级):stream 每期写法不同(BC 各 ITA 因素/AB 各期描述),按它分组会碎成一期一卡。
  const byStream = new Map<string, { prov: string; stream: string; scale: string; dates: string[] }>()
  for (const r of draws.rows) {
    if (r.kind === 'notice') continue
    const d = day(r.draw_date)
    if (!d) continue
    const name = r.label || r.stream || ''
    const key = `${r.province}|${name}`
    const g = byStream.get(key) ?? { prov: r.province ?? '', stream: name, scale: r.scale ?? '', dates: [] as string[] }
    g.dates.push(d)
    byStream.set(key, g)
  }
  const cadence: TlCadence[] = [...byStream.values()].map((g) => {
    const dates = [...new Set(g.dates)].sort()
    const gaps = dates.slice(1).map((d, i) => daysBetween(dates[i], d))
    return {
      prov: g.prov, stream: g.stream, scale: g.scale,
      last: dates[dates.length - 1], daysSince: daysBetween(dates[dates.length - 1], today),
      avgGapDays: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null,
      draws: dates.length,
    }
  }).sort((a, b) => a.prov.localeCompare(b.prov) || a.stream.localeCompare(b.stream))

  // EE:历史未入库,只报「距今」(二期=EE draws 历史入库后并入 cadence)
  const eeCadence = ee.rows.map((r: any) => ({
    category: r.category ?? '', label: r.label || r.category || '', last: day(r.draw_date),
    daysSince: daysBetween(day(r.draw_date), today),
  })).filter((x: any) => x.last).sort((a: any, b: any) => a.daysSince - b.daysSince)

  return { events, cadence, eeCadence }
}
