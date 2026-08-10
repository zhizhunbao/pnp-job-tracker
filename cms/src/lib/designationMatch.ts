// AIP 指定雇主名录的名字匹配口径(批D 欠账①;Frank 2026-08-10 拍板「完全匹配才算」= 下文 D 口径)。
// 纯函数、无 IO:名录行由调用方查好传入(候选缓存归 verdictCache,与判定层其余表同手法)。
//
// ── 为什么从「包含」收到「完全相等」──────────────────────────────────────────
// 旧口径(2026-08-09 前)= 双向大小写不敏感**子串包含**。子串落在单词内部照样算命中:
//   `Esso`     → `Wheeler Acc·esso·ries`(配件店)、`Fredericton Mont·esso·ri Academy`
//   `ARMS Ltd` → `Wohlgemuth F·arms Ltd`(农场)
// 全量审计坐实(docs/evaluation/名录匹配审计-20260809.md)。三分表是付费信任的地基,
// 表里认错公司比慢几秒严重得多 —— 用户发现「这家根本不是这家」,整张表的数字都不可信了。
//
// ── 为什么「完全相等」不能按字面比 ────────────────────────────────────────────
// 官方名录 1,459/3,867(38%)的行是「法定全称 o/a 营业名」:
//   `Grand View Manor Continuing Care Community o/a Grand View Manor`
//   `1919599 Ontario Limited O/A Harvey's 2568`
// 而岗位上挂的是**营业名**。字面完全相等会把真命中一起砍掉——实测四省 389 → 81(砍 79%),
// 连本站判定卡的基准 fixture(Grand View Manor)都会当场变成「名录里没认出这家」。
// 所以比的是**名录名的任一名段**:o/a 前的法定名、o/a 后的营业名。实测 D 口径 281 命中,
// 词内子串假阳性从根上不存在(不再有「包含」这回事,无需另加词边界)。
//
// ── 🔴 完全匹配治不了连锁多配 ────────────────────────────────────────────────
// 加盟法人的 o/a 段**本来就精确等于品牌名**:`12345 NB Inc o/a Tim Hortons` 的营业名段
// = `Tim Hortons`,同省 20 家全是合法的完全匹配,一家都不算错配。谁是你这份岗的雇主不可证
// → 多配 ≥2 时 `row=null`,只报家数不点名法人(「这条链在名录里」为真,「这家法人=你雇主」不编)。
//
// ── 口径实测(四省去重 2,218 对公司名;标定脚本一次性,未入库)────────────────
//   旧(双向裸包含)          389 命中 / 52 多配 / 最大 55 配
//   字面完全相等              81 命中 /  0 多配      ← 砍 79%,不可用
//   规范化相等               125 命中 /  0 多配
//   **D = 规范化 + o/a 段展开  281 命中 / 17 多配 / 最大 20 配**  ← 本文件实现
//   D + 剥法人后缀            335 命中 / 18 多配      ← 会把 `Foo Inc` 与 `Foo Ltd` 当成一家,不采用

/** 名录名里分隔「法定名 / 营业名」的写法(官方登记用 o/a,少数写 dba) */
const OA_SPLIT = /\s+(?:o\/a|d\/b\/a|dba|operating\s+as|carrying\s+on\s+business\s+as)\s+/gi

/**
 * 名字归一:大小写、`&`↔`and`、标点与多空格。**只归一书写形式,不动词**——
 * 法人后缀(Inc/Ltd)一律保留,`Foo Inc` 与 `Foo Ltd` 是两家公司,不许归一到一起。
 */
export function normalizeEmployerName(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9一-鿿]+/g, ' ')
    .trim()
}

/** 名录名 → 可比的名段:整名 + o/a 前后各段(法定名 / 营业名)。无 o/a 时就是整名一段。 */
export function employerNameSegments(name: string): string[] {
  const parts = (name || '').split(OA_SPLIT).map((p) => p.trim()).filter(Boolean)
  return parts.length ? parts : [name || '']
}

export type DesignationMatch<T> = {
  /** 唯一命中的那一行;**null = 没认出(count=0)或多配(count≥2,不点名法人)** */
  row: T | null
  /** 完全匹配的法人数:0 / 1 / N */
  count: number
  /** 命中行的名录名(AIP…);count=0 或多配行 source 不一致 → '' */
  source: string
}

/**
 * 公司名 × 该省名录行 → 完全匹配结果(D 口径)。
 * 命中 = 规范化后 `公司名` 等于 `名录名的某一个名段`。
 * @param rows **必须是已按省筛过的行**——跨省同名是两家公司,本函数不管省,由调用方筛。
 */
export function matchDesignation<T extends { name: string; source?: string }>(
  companyName: string,
  rows: readonly T[],
): DesignationMatch<T> {
  const target = normalizeEmployerName(companyName)
  if (!target) return { row: null, count: 0, source: '' }

  const hits = rows.filter((r) =>
    employerNameSegments(r.name).some((seg) => normalizeEmployerName(seg) === target),
  )
  if (!hits.length) return { row: null, count: 0, source: '' }

  const sources = new Set(hits.map((r) => (r.source ?? '').trim()).filter(Boolean))
  const source = sources.size === 1 ? [...sources][0]! : ''
  // 多配 → 不点名法人(row=null),只留家数与名录名
  return { row: hits.length === 1 ? hits[0]! : null, count: hits.length, source }
}
