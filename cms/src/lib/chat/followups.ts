// 追问建议 + 对话槽 → 档案(只补空)。
//
// 追问建议**不过模型**:一个数字都不带,所以不需要 guard。
// 「只补空」是红线:用户自己填过的档案字段,对话里说漏嘴不许覆盖它。
import { FOLLOWUPS, LBL, type Lang, SAVED_LBL, SAVED_TAIL } from '../i18n'
import { NUM_RE, normNum } from './guards'
import type { Fact, Slots } from './types'

// ── 追问建议(不过模型:一个数字都不带,不需要 guard)──────────────────────────
//
// 🔴 **只推荐我们真答得上来的**(2026-08-04 生产实录:第一条推荐问题是「What are my odds of being
//    picked?」—— 本站红线是不算概率,等于亲手把用户领到我们不答的地方去)。所以不再用固定三句,
//    而是**按这次真查到了什么**生成:某个工具这轮拿回了带数字的 fact,才推它对应的那句。
//    证书、时长、胜算这类库里没有的,一律不推。
export type FollowKey = 'unsaid' | 'jobs' | 'thresholds' | 'coverage' | 'draws' | 'ops' | 'ee'
/** 这次真拿到了数据的工具 → 对应的追问;顺序即优先级,最多三条。拿不到数据的一条都不推。
 *  `asked` = 用户刚问的那句:同一句不再推给他(点了 chip 又看见同一个 chip,像没反应)。
 *  `occ` = 用户自己的职业叫法(slots.occText),织进模板;超长或空 → 回落通用句。 */
export function buildFollowups(facts: Fact[], lang: Lang, asked = '', occ = ''): string[] {
  const o = occ.trim().length >= 2 && occ.trim().length <= 20 ? occ.trim() : undefined
  const has = (tool: string, ok: (f: Fact) => boolean) => facts.some((f) => f.tool === tool && ok(f))
  const num = (f: Fact) => f.value != null
  const avail: [FollowKey, boolean][] = [
    ['unsaid', facts.some((f) => f.tool === 'checkClaims' && f.label === LBL[lang].unsaid)],
    ['jobs', has('lookupJobs', num)],
    ['thresholds', has('lookupThresholds', num)],
    ['coverage', has('lookupCoverage', (f) => f.unit === 'list')],
    ['draws', has('lookupDraws', num)],
    ['ops', has('lookupOps', num)],
    ['ee', has('lookupEE', num)],
  ]
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
  return avail.filter(([, ok]) => ok).map(([k]) => FOLLOWUPS[lang][k](o))
    .filter((q) => norm(q) !== norm(asked))
    .slice(0, 3)
}

/**
 * 🔴 出处区只列**答复真的用到的**(2026-08-04 生产实录:24 条全量倾倒,用户问中介收费,
 * 出处里摆着 AB 162 岗、ON 121 岗、QC 55 岗 —— 没一条与那句话有关)。
 * 判据只认两样**可证的**命中,不猜:① 这条的数值在答复里出现过(照 guardAnswer 那套归一);
 * ② label 里的官方专名(清单名/通道名)在答复里出现过。
 * 三类永不进出处:`note`(索引口径是**注意事项**不是来源)、`claim`(那是别人说的话,不是官方出处)、
 * 没有 URL 的(点不开的东西列出来只是噪音)。
 */
export function citeFacts(answer: string, facts: Fact[]): Fact[] {
  const nums = new Set<string>()
  for (const m of answer.matchAll(NUM_RE)) nums.add(normNum(m[0]))
  const low = answer.toLowerCase()
  return facts.map((f) => {
    if (f.unit === 'note' || f.unit === 'claim' || !f.evidence.url) return { ...f, cited: false }
    let cited = f.value != null && nums.has(normNum(String(f.value)))
    // 专名只认 label **冒号之后**那截(官方清单名/通道名就长在那儿)。整条 label 拿去匹配会误伤:
    // 「MB nominations so far this year — Skilled Worker」里的 Skilled Worker 撞上答复里的
    // 「Skilled Worker Stream draw cutoff」,一条没被用到的提名数就混进出处(2026-08-04 实测)。
    if (!cited) {
      const name = f.label.includes(': ') ? f.label.slice(f.label.lastIndexOf(': ') + 2) : ''
      cited = name.length >= 10 && low.includes(name.toLowerCase())
    }
    return { ...f, cited }
  })
}

// ── 对话槽 → 档案(D3:只补空)────────────────────────────────────────────────

/**
 * 🔴 **对话是最自然的建档场景,却是唯一不建档的入口**(D3;2026-08-09 实查:抽到的槽只进 chat_logs,
 * users.profile 零写点)。这里把一轮对话抽出来的**高置信槽**映射成 `users.profile` 的补丁。
 *
 * 三条红线,一条都不许松:
 *   ① **只补空**:目标字段现值为 null/空数组才写。手填优先 —— 用户在账户页/向导里亲手填的值,
 *      永远压过我们从一句话里抽出来的(抽槽是模型的活,手填是他自己的话)。
 *   ② **只写高置信的**:`status` 只认三种一一对得上的身份(graduated/visitor 落哪个分型都是猜,不写);
 *      `provs` 只在**这轮没有第三方主张**时才当目标省 —— 主张里的省份是「中介说曼省有合作公司」那种,
 *      是别人提的地方,不是他的目标;`crs`/`pgwpMonthsLeft` 对话里根本没有对应槽,不写。
 *   ③ **匿名不存**:登录判定在路由层(这里拿不到 user,也不该拿到)。
 * 返回 null = 这轮没有可补的,调用方一个字都不必说(尾行只在真写了的时候出现)。
 */
type ChatProfilePatch = {
  currentStatus?: string
  nocCodes?: string[]
  clb?: number
  targetProvinces?: string[]
}
/** 抽槽 status → 档案分型 slug(lib/jobs/match.ts 的 CurrentStatus)。**对不上的一律不映射**。 */
const STATUS_SLUG: Record<string, string> = { student: 'studying', working: 'working', abroad: 'overseas' }
/** 现值算不算「空」:null/undefined/空串/空数组算空,其余一律当用户已有值,绝不覆盖。 */
const emptyField = (v: unknown): boolean =>
  v == null || v === '' || (Array.isArray(v) && v.length === 0)

export function profileFill(
  slots: Slots, current: unknown, lang: Lang,
): { patch: ChatProfilePatch; tail: string } | null {
  const cur = (current && typeof current === 'object' ? current : {}) as Record<string, unknown>
  const patch: ChatProfilePatch = {}
  const items: string[] = []
  const T = SAVED_LBL[lang]
  if (/^\d{5}$/.test(slots.noc ?? '') && emptyField(cur.nocCodes)) {
    patch.nocCodes = [slots.noc as string]
    items.push(`${T.occ} ${slots.noc}`)
  }
  if (typeof slots.clb === 'number' && emptyField(cur.clb)) {
    patch.clb = slots.clb
    items.push(`${T.clb} ${slots.clb}`)
  }
  if (!slots.claims.length && slots.provs.length && emptyField(cur.targetProvinces)) {
    patch.targetProvinces = slots.provs
    items.push(`${T.prov} ${slots.provs.join(lang === 'zh' ? '、' : ', ')}`)
  }
  const slug = STATUS_SLUG[slots.status ?? '']
  if (slug && emptyField(cur.currentStatus)) {
    patch.currentStatus = slug
    items.push(T.status[slug])
  }
  return items.length ? { patch, tail: SAVED_TAIL[lang](items) } : null
}
