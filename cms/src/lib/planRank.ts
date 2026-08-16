// 初评排序的**唯一来源**(2026-08-15 #307:此前引擎 obstacle()/服务端 bandOf+竞争比/客户端
// 0 岗沉底+本省优先 三处并存,#302 的「省外提示与排序不是同一把尺」就是分叉的直接后果)。
// 服务端(profile-pathways route)排完序下发,客户端只渲染不再重排;省外提示与主排序共用
// 本文件同一把尺(#302),并把竞争比与地理成本一并纳入判据(#303)。
//
// 次序(全部 Frank 逐条拍板;2026-08-16 凌晨④升位:「所以在阿尔伯塔省学完,需要跑到安省走
// pnp??????」—— 本省优先从「同档内加分」升为**跨档主键**:搬省从来不是零成本,本省可行的路
// 必须排在外省更快的路前面;「外省门槛更快」由省外提示如实说,不霸榜):
//   ① 0 岗跨档沉底(「0 不是少,是没有」)
//   ② 沉降段:availability≠ok / belowLine(估分够不着线)沉底 —— 本省也救不了缺数据与够不着
//   ③ **本省优先(跨档)**:现居省 ∪ 学历省的行排在外省行前
//   ④ 档位 band:verdict|blockedBy|tier(引擎序首现定档)
//   ⑤ thin(在招 <10 或无数)沉同档尾;null 不逃降档
//   ⑥ thin 组内按岗数多→少;足量组按竞争比松→紧
//   ⑦ 引擎原序兜底
export type RankableRow = {
  key: string
  province: string
  verdict: string
  tier: number | null
  availability: string
  blockedBy?: string | null
  belowLine?: boolean
  competition?: { ratio: number } | null
}

export type RankCtx = {
  /** 该省该职业在招岗数(按通道的 jobsSource 口径);非省级行 / 无数据 = null */
  jobsOf: (row: RankableRow) => number | null
  /** 本省 = 现居省 ∪ 学历省(地理成本判据,#302) */
  homeProvs: ReadonlySet<string>
}

export const bandOf = (row: RankableRow): string =>
  `${row.availability !== 'ok' ? 'y' : 'a'}|${row.belowLine ? 'z' : 'a'}|${row.verdict}|${row.blockedBy ?? ''}|${row.tier ?? ''}`

type Decorated<T> = { row: T; i: number; band: number; n: number | null; home: boolean; ratio: number }

function decorate<T extends RankableRow>(rows: T[], ctx: RankCtx): Decorated<T>[] {
  // band 首现定档:引擎输出本身按障碍难度排(pathVerdict 的 obstacle 序),首现即档位次序
  const bandRank = new Map<string, number>()
  rows.forEach((row) => { if (!bandRank.has(bandOf(row))) bandRank.set(bandOf(row), bandRank.size) })
  return rows.map((row, i) => ({
    row, i,
    band: bandRank.get(bandOf(row)) ?? 0,
    n: ctx.jobsOf(row),
    home: /^[A-Z]{2}$/.test(row.province) && ctx.homeProvs.has(row.province),
    ratio: row.competition?.ratio ?? Number.POSITIVE_INFINITY,
  }))
}

function cmp<T extends RankableRow>(a: Decorated<T>, b: Decorated<T>): number {
  const aZero = a.n === 0, bZero = b.n === 0
  if (aZero !== bZero) return aZero ? 1 : -1
  // 沉降段先于本省:缺数据/够不着线的行,本省也救不上来
  const sink = (d: Decorated<T>) => d.row.availability !== 'ok' || !!d.row.belowLine
  if (sink(a) !== sink(b)) return sink(a) ? 1 : -1
  // 本省优先跨档(2026-08-16 升位,见文件头)
  if (a.home !== b.home) return a.home ? -1 : 1
  if (a.band !== b.band) return a.band - b.band
  const aThin = a.n == null || a.n < 10, bThin = b.n == null || b.n < 10
  if (aThin !== bThin) return aThin ? 1 : -1
  if (aThin && bThin && a.n !== b.n) return (b.n ?? -1) - (a.n ?? -1)
  if (a.ratio !== b.ratio) return a.ratio - b.ratio
  return a.i - b.i
}

/** 主排序:输入 = 引擎序(pathVerdict 原样,区域线已拆省、竞争比已挂),输出 = 展示序 */
export function rankRows<T extends RankableRow>(rows: T[], ctx: RankCtx): T[] {
  return decorate(rows, ctx).sort(cmp).map((d) => d.row)
}

export type OutsidePick<T> = {
  row: T
  /** 场内第一名(给措辞层摆对照:两边的竞争比与档位都要如实说,#303) */
  insideBest: T | null
}

/**
 * 省外提示(#302/#303):与主排序**同一把尺**(cmp 全量,含 0 岗/thin/本省/竞争比)。
 * 只在省外候选按这把尺**严格排在场内第一名之前**、且自身不是空盘/薄盘、且竞争比有数时才提;
 * 判据不再只比档位 —— 竞争比与地理成本(home 在 cmp 里)都参与。措辞层拿 insideBest 摆对照,
 * 不许再用裸「更优」二字(队伍长一倍还叫更优就是 #303 的病)。
 */
export function pickOutside<T extends RankableRow>(allRows: T[], targets: string[], ctx: RankCtx): OutsidePick<T> | null {
  if (!targets.length) return null
  const ranked = decorate(allRows, ctx).sort(cmp)
  const inTargets = (p: string) => targets.includes(p)
  const insideIdx = ranked.findIndex((d) => inTargets(d.row.province))
  const insideBest = insideIdx >= 0 ? ranked[insideIdx].row : null
  for (let i = 0; i < ranked.length; i++) {
    if (insideIdx >= 0 && i >= insideIdx) break
    const d = ranked[i]
    if (!/^[A-Z]{2}$/.test(d.row.province) || inTargets(d.row.province)) continue
    if (d.n === 0 || d.n == null || d.n < 10) continue
    if (!Number.isFinite(d.ratio)) continue
    return { row: d.row, insideBest }
  }
  return null
}
