/**
 * 专业域的行为:整张 CIP 2021 专业表的取数(进程内 TTL 缓存)与内存里的三种筛法(热门 / 搜索 / 按码),
 * 外加给 quiz 域第 3 题注入的「这个专业落哪些本站大类」。
 * 表 2,119 行,一次读进来在内存里筛 —— 站级聚合禁每请求现算;池由调用方注进来(方案 A,本文件不 import payload)。
 * 表还没建(DDL docs/sql/cip-programs-20261004.sql 没跑)时取数走 queryRowsOrEmpty:留痕回空数组,
 * 接口回空清单不 500;空表不进缓存,建表灌数后下一个请求就看得到。
 * 2026-10-05 专业题照掌上高考做(Frank「可以,做吧」):加选择器的大类清单与每个大类的树(折叠专业类 + 单列专业),
 * 按数据层写好的 places 挂点与排序数逐格摆;随整表一起建进同一格缓存,整表重读才重建。挂点只在服务端,不随接口出去。
 *
 * @author Frank
 * @time 2026-10-04 02:14:05
 */

import { jsonOrNull, numOrNull, queryRowsOrEmpty, SQL, text, textOrNull } from '../db'
import type { Db } from '../db'
import { log, MAJORS_LOG } from '../log'
import {
  ACRONYM_MAX, ACRONYM_MIN, ACRONYM_STOP, CAT_KEY_RE, CJK_RE, HOT_TIERS, INSIDE_MIN, MAJORS_TTL_MS, MATCH_ACRONYM,
  MATCH_ACRONYM_HEAD, MATCH_EXACT, MATCH_HOT, MATCH_INSIDE, MATCH_NONE, MATCH_ORDER, MATCH_PREFIX, MATCH_STEM, MATCH_WORD,
  PLACE_ORDER_MAX, PLACE_ORDER_MIN, SEARCH_LIMIT, SEARCH_SPACE_DROP, SEARCH_SPACE_RE, SHORT_Q_MAX, SINK_SERIES, STEM_MIN,
  STEM_SUFFIXES, WORD_GLUE, WORD_SEP, WORD_SPLIT_RE,
} from './constants'
import { CACHE } from './variables'
import type {
  MajorBroadsIn, MajorBroadsOut, MajorCatRow, MajorCatRows, MajorCatsOut, MajorDbRow, MajorFact, MajorFacts, MajorFindIn,
  MajorGroupBin, MajorPlace, MajorPlaceItemJson, MajorPlaces, MajorPlacesJson, MajorRow, MajorRows, MajorSearchIn,
  MajorsOut, MajorsSlot, MajorsSlotIn, MajorsSlotOut, MajorTree, MajorTreeGetIn, MajorTreeIn, MajorTreeOut, MatchIn,
  MaybeMajor, MaybePlace, NameMatchIn, OrderedList, OrderSlots, QueryFact, SlotPushIn, WordHeadIn, WordList,
} from './types'

/**
 * 某专业落哪些本站大类(quiz 域第 3 题由路由注入;大类本身是数据层 etl/noc MAJOR_SERIES_BROADS 推好的)。
 *
 * @param input 连接与 class 码。
 * @returns 大类清单;查无此码 / 表没建是空数组。
 */
export async function getMajorBroads(input: MajorBroadsIn): MajorBroadsOut {
  const hit = majorOf({ rows: await getMajors(input.db), code: input.code })
  if (hit == null) {
    return []
  }
  return hit.broads
}

/**
 * 选择器左栏的大类清单(catOrder 序;随整表缓存,2026-10-05 立)。
 *
 * @param db 能查的连接(池由调用方注进来)。
 * @returns 大类清单;表没建 / 还没灌挂点是空数组。
 */
export async function getMajorCats(db: Db): MajorCatsOut {
  return (await getMajorsSlot(db)).cats
}

/**
 * 一个大类的树(折叠专业类 + 单列专业;随整表缓存,2026-10-05 立)。键不合 CAT_KEY_RE 的不进库。
 *
 * @param input 连接与大类键。
 * @returns 那个大类的树;不认识 / 不合形的键是空树。
 */
export async function getMajorTree(input: MajorTreeGetIn): MajorTreeOut {
  if (CAT_KEY_RE.test(input.cat)) {
    const tree = (await getMajorsSlot(input.db)).trees.get(input.cat)
    if (tree != null) {
      return tree
    }
  }
  return { groups: [], singles: [] }
}

/**
 * 整张专业表(code 序;TTL 内走进程缓存)。表没建 / 查不动回空数组(queryRowsOrEmpty 已留痕),空表不进缓存。
 * 2026-10-05 取数与缓存挪进 getMajorsSlot(同一格还挂选择器的大类清单与树),这里只取整表那一份。
 *
 * @param db 能查的连接(池由调用方注进来)。
 * @returns 全部专业。
 */
export async function getMajors(db: Db): MajorsOut {
  return (await getMajorsSlot(db)).rows
}

/**
 * 整表缓存那一格(TTL 内走进程缓存):整张表 + 大类清单 + 各大类的树,一起建、一起换(2026-10-05 从 getMajors 挪出)。
 * 表没建 / 查不动回空表(queryRowsOrEmpty 已留痕),空表不进缓存。
 *
 * @param db 能查的连接(池由调用方注进来)。
 * @returns 那一格。
 */
async function getMajorsSlot(db: Db): MajorsSlotOut {
  const hot = CACHE.table
  if (hot != null && Date.now() - hot.at < MAJORS_TTL_MS) {
    return hot
  }
  const facts = await queryRowsOrEmpty({ db: db, sql: SQL.MAJORS_ALL, params: [], map: toMajorFact })
  const slot = majorsSlotOf({ at: Date.now(), facts: facts })
  if (facts.length > 0) {
    CACHE.table = slot
  }
  return slot
}

/**
 * 一格缓存的全部内容:对外行(表序,不带挂点)、大类清单、每个大类的树(2026-10-05 立)。
 *
 * @param input 落格时刻与整张表。
 * @returns 那一格。
 */
function majorsSlotOf(input: MajorsSlotIn): MajorsSlot {
  const rows: MajorRow[] = []
  for (const f of input.facts) {
    rows.push(f.row)
  }
  const cats = categoriesOf(input.facts)
  const trees = new Map<string, MajorTree>()
  for (const c of cats) {
    trees.set(c.key, majorTreeOf({ facts: input.facts, cat: c.key }))
  }
  return { at: input.at, rows: rows, cats: cats, trees: trees }
}

/**
 * 大类清单:挂点里出现过的大类,按 catOrder 逐格摆(同一个键只取头一次见到的名字;2026-10-05 立)。
 *
 * @param facts 整张专业表(洗净后)。
 * @returns 大类清单(catOrder 序)。
 */
export function categoriesOf(facts: MajorFacts): MajorCatRows {
  const order: OrderSlots<MajorCatRow> = new Map<number, MajorCatRow[]>()
  const seen = new Set<string>()
  for (const f of facts) {
    for (const p of f.places) {
      if (seen.has(p.cat)) {
        continue
      }
      seen.add(p.cat)
      pushSlot({ slots: order, at: p.catOrder, item: { key: p.cat, titleEn: p.catEn, titleZh: p.catZh, titleKo: p.catKo } })
    }
  }
  return slotOrderOf(order)
}

/**
 * 一个大类的树:挂在这个大类的专业按专业类归拢,类按 groupOrder、类里按 order 逐格摆;
 * 只装一个专业的类(挂点 single)不折叠,那个专业按 groupOrder、order 进 singles(2026-10-05 立)。
 * 出去的专业是对外行本身,挂点留在服务端。
 *
 * @param input 整张专业表与大类键。
 * @returns 那个大类的树;没有专业挂在这个键上是空树。
 */
export function majorTreeOf(input: MajorTreeIn): MajorTree {
  const order: OrderSlots<MajorGroupBin> = new Map<number, MajorGroupBin[]>()
  const bins = new Map<string, MajorGroupBin>()
  for (const f of input.facts) {
    for (const p of f.places) {
      if (p.cat !== input.cat) {
        continue
      }
      let bin = bins.get(p.group)
      if (bin == null) {
        bin = groupBinOf(p)
        bins.set(p.group, bin)
        pushSlot({ slots: order, at: p.groupOrder, item: bin })
      }
      pushSlot({ slots: bin.majors, at: p.order, item: f.row })
    }
  }
  const tree: MajorTree = { groups: [], singles: [] }
  for (const bin of slotOrderOf(order)) {
    const majors = slotOrderOf(bin.majors)
    if (bin.single) {
      tree.singles = tree.singles.concat(majors)
    } else {
      tree.groups.push({ key: bin.key, titleEn: bin.titleEn, titleZh: bin.titleZh, titleKo: bin.titleKo, majors: majors })
    }
  }
  return tree
}

/**
 * 建树时一个专业类的空半成品(名字与单列标取这个类头一个挂点上的;2026-10-05 立)。
 *
 * @param p 这个类头一个挂点。
 * @returns 半成品(专业还没装)。
 */
function groupBinOf(p: MajorPlace): MajorGroupBin {
  return {
    key: p.group, titleEn: p.groupEn, titleZh: p.groupZh, titleKo: p.groupKo, single: p.single,
    majors: new Map<number, MajorRow[]>(),
  }
}

/**
 * 装一格:序号那一格没有就开一格,有就接在后面(同号的按先来后到;2026-10-05 立)。
 *
 * @param input 装格的表、序号与要装的东西。
 * @returns 无(就地装进表里)。
 */
function pushSlot<T>(input: SlotPushIn<T>): void {
  const list = input.slots.get(input.at)
  if (list == null) {
    input.slots.set(input.at, [input.item])
  } else {
    list.push(input.item)
  }
}

/**
 * 按序号从 1 起逐格取出,空格跳过(序号上限由行构造器管住:PLACE_ORDER_MAX;2026-10-05 立)。不用比较器。
 *
 * @param slots 装好格的表。
 * @returns 摆好的清单。
 */
function slotOrderOf<T>(slots: OrderSlots<T>): OrderedList<T> {
  let last = 0
  for (const at of slots.keys()) {
    last = Math.max(last, at)
  }
  let out: T[] = []
  for (let at = 1; at <= last; at++) {
    const list = slots.get(at)
    if (list != null) {
      out = out.concat(list)
    }
  }
  return out
}

/**
 * 搜索:英 / 中 / 韩名包含检索词(不分大小写);名字以它开头的排前面,同档按 code 序;最多 SEARCH_LIMIT 条。
 * 2026-10-04 收口:改四档 —— 三语名任一与检索词完全相等 > 热门(按名次)> 开头 > 包含,除热门档外档内按 code 序;
 * 检索词与名字都先转成比对键(转小写、删掉全部空白)再比。逐档装桶,热门档交 topMajorsOf 按名次逐格摆,不用比较器。
 * 同日八档改判(Frank 截图:搜「AI」最前面是供应链 / 烹饪与厨师 / 护理助理,人工智能没出来):英文改按词比 ——
 * 完全相等 > 缩写相等 > 热门整词命中 > 名字开头 > 某个词开头 > 去词尾后开头 > 中间含(够长才算)> 缩写开头,
 * 中韩文照旧删空白比(相等 > 热门 > 开头 > 中间含);每档里热门按名次在前,不计学分课与住院医师培训(SINK_SERIES)沉到最后。
 *
 * @param input 整张专业表与检索词。
 * @returns 命中的专业;检索词为空给空数组。
 */
export function searchMajorsOf(input: MajorSearchIn): MajorRows {
  const q = queryFactOf(input.q)
  if (q.key === SEARCH_SPACE_DROP) {
    return []
  }
  if (q.cjk === false && q.letters === WORD_GLUE) {
    return []
  }
  const buckets = new Map<number, MajorRow[]>()
  for (const r of input.rows) {
    const rank = boostedRankOf({ row: r, q: q })
    if (rank === MATCH_NONE) {
      continue
    }
    const list = buckets.get(rank)
    if (list == null) {
      buckets.set(rank, [r])
    } else {
      list.push(r)
    }
  }
  let out: MajorRow[] = []
  for (const tier of MATCH_ORDER) {
    const list = buckets.get(tier)
    if (list != null) {
      out = out.concat(tierRowsOf(list))
    }
  }
  return out.slice(0, SEARCH_LIMIT)
}

/**
 * 把检索词拆成比对要用的几样(一次搜索只拆一次,2026-10-04 八档立)。
 *
 * @param raw 用户打的检索词。
 * @returns 拆好的检索词。
 */
function queryFactOf(raw: string): QueryFact {
  const words = wordsOf(raw)
  const stems: string[] = []
  for (const w of words) {
    stems.push(stemOf(w))
  }
  return { cjk: CJK_RE.test(raw), key: searchKeyOf(raw), words: words, letters: words.join(WORD_GLUE), stems: stems }
}

/**
 * 比对键:转小写、删掉全部空白(韩文复合名词分写随意,「컴퓨터 과학」与「컴퓨터과학」要算同一个)。
 * 检索词与专业名走同一把,两边才对得上;不往 MajorRow 上存键(对外行,接口体会胖一倍),每次搜现算。
 *
 * @param s 检索词或一个专业名。
 * @returns 比对键;全是空白的给空串。
 */
function searchKeyOf(s: string): string {
  return s.toLowerCase().replace(SEARCH_SPACE_RE, SEARCH_SPACE_DROP)
}

/**
 * 按词拆开:转小写,字母与数字以外的都当词界,空词不留(2026-10-04 八档立)。
 *
 * @param s 检索词或一个专业名。
 * @returns 词清单。
 */
function wordsOf(s: string): WordList {
  const out: string[] = []
  for (const w of s.toLowerCase().split(WORD_SPLIT_RE)) {
    if (w !== WORD_GLUE) {
      out.push(w)
    }
  }
  return out
}

/**
 * 去掉一个常见词尾(STEM_SUFFIXES 按序试,先对上的先去;去完不足 STEM_MIN 个字母就不去)。2026-10-04 八档立。
 *
 * @param word 一个词(已转小写)。
 * @returns 去过词尾的词;对不上原样给。
 */
function stemOf(word: string): string {
  for (const suf of STEM_SUFFIXES) {
    if (word.endsWith(suf) && word.length - suf.length >= STEM_MIN) {
      return word.slice(0, word.length - suf.length)
    }
  }
  return word
}

/**
 * 一个专业最后落哪一桶:名字本身的命中档;热门行的整词命中(HOT_TIERS)升进热门桶 ——
 * 英文检索词两个字母以下不升(多是缩写,升了会把词首碰巧对上的热门顶上来),中韩文一律升。2026-10-04 八档立。
 *
 * @param input 专业与拆好的检索词。
 * @returns 桶号(档值)。
 */
function boostedRankOf(input: MatchIn): number {
  const rank = matchRankOf(input)
  if (input.row.popular == null || HOT_TIERS.includes(rank) === false) {
    return rank
  }
  if (input.q.cjk || input.q.letters.length > SHORT_Q_MAX) {
    return MATCH_HOT
  }
  return rank
}

/**
 * 一个专业对检索词的命中档:三语名里任一个以它开头 = 开头档,中间含 = 包含档,都不含 = 没命中。
 * 2026-10-04 收口:加完全相等档;三语各算一档取最高(档值越大越靠前),不再见开头就返回 —— 后面的语言可能完全相等。
 * 同日八档改判:中韩文检索词只比中 / 韩名(英文名里没有中韩字);英文检索词三语名都比(中韩名里偶有英文缩写)。
 * 2026-10-05 英文检索词也比英文显示名(titleEnShort;空串 = 没有,比不中任何档),取最高那一档照旧。
 *
 * @param input 专业与拆好的检索词。
 * @returns 命中档。
 */
function matchRankOf(input: MatchIn): number {
  let names = [input.row.titleEn, input.row.titleEnShort, input.row.titleZh, input.row.titleKo]
  if (input.q.cjk) {
    names = [input.row.titleZh, input.row.titleKo]
  }
  let rank = MATCH_NONE
  for (const name of names) {
    if (name == null) {
      continue
    }
    rank = Math.max(rank, nameRankOf({ name: name, q: input.q }))
  }
  return rank
}

/**
 * 一个名字对检索词的命中档:比对键完全相等 = 完全相等档,以它开头 = 开头档,中间含 = 包含档,不含 = 没命中。
 * 2026-10-04 八档改判:按检索词分两路 —— 中韩文走 cjkRankOf(删空白比),英文走 latinRankOf(按词比)。
 *
 * @param input 一个语言的专业名与拆好的检索词。
 * @returns 命中档。
 */
function nameRankOf(input: NameMatchIn): number {
  if (input.q.cjk) {
    return cjkRankOf(input)
  }
  return latinRankOf(input)
}

/**
 * 中韩文的命中档:删空白后完全相等 > 开头 > 中间含(中韩文没有词界,中间含就是整词档)。2026-10-04 八档立。
 *
 * @param input 一个中 / 韩名与拆好的检索词。
 * @returns 命中档。
 */
function cjkRankOf(input: NameMatchIn): number {
  const key = searchKeyOf(input.name)
  if (key === input.q.key) {
    return MATCH_EXACT
  }
  if (key.startsWith(input.q.key)) {
    return MATCH_PREFIX
  }
  if (key.includes(input.q.key)) {
    return MATCH_WORD
  }
  return MATCH_NONE
}

/**
 * 英文的命中档(按词比,标点当词界):完全相等(连写也算)> 缩写相等 > 名字开头 > 每个词都是某词开头 > 去词尾后开头 >
 * 中间含(INSIDE_MIN 个字母起)> 缩写开头;两个字母以下的检索词不认「某词开头」与「去词尾」。2026-10-04 八档立。
 *
 * @param input 一个专业名与拆好的检索词。
 * @returns 命中档。
 */
function latinRankOf(input: NameMatchIn): number {
  const q = input.q
  const words = wordsOf(input.name)
  const joined = words.join(WORD_SEP)
  const phrase = q.words.join(WORD_SEP)
  const flat = words.join(WORD_GLUE)
  if (joined === phrase || flat === q.letters) {
    return MATCH_EXACT
  }
  const acronymOk = isAcronymQuery(q)
  if (acronymOk && acronymOf(words) === q.letters) {
    return MATCH_ACRONYM
  }
  if (joined.startsWith(phrase) || flat.startsWith(q.letters)) {
    return MATCH_PREFIX
  }
  if (q.letters.length > SHORT_Q_MAX) {
    if (everyWordHead({ words: words, heads: q.words })) {
      return MATCH_WORD
    }
    if (everyWordHead({ words: words, heads: q.stems })) {
      return MATCH_STEM
    }
  }
  if (q.letters.length >= INSIDE_MIN && joined.includes(phrase)) {
    return MATCH_INSIDE
  }
  if (acronymOk && acronymOf(words).startsWith(q.letters)) {
    return MATCH_ACRONYM_HEAD
  }
  return MATCH_NONE
}

/**
 * 检索词像不像缩写:只有一个词,字母数在 ACRONYM_MIN..ACRONYM_MAX 之间(2026-10-04 八档立)。
 *
 * @param q 拆好的检索词。
 * @returns 像 = true。
 */
function isAcronymQuery(q: QueryFact): boolean {
  return q.words.length === 1 && q.letters.length >= ACRONYM_MIN && q.letters.length <= ACRONYM_MAX
}

/**
 * 名字的缩写:各词首字母拼起来,跳过 ACRONYM_STOP 里的虚词与套话(2026-10-04 八档立)。
 *
 * @param words 名字拆开的词。
 * @returns 缩写(小写)。
 */
function acronymOf(words: WordList): string {
  let out = WORD_GLUE
  for (const w of words) {
    if (ACRONYM_STOP.includes(w) === false) {
      out += w.charAt(0)
    }
  }
  return out
}

/**
 * 每个检索词片段都能在名字里找到一个以它开头的词(片段之间不管先后;2026-10-04 八档立)。
 *
 * @param x 名字的词与检索词片段。
 * @returns 都找到 = true;片段清单为空也给 true(调用方先判过字母数)。
 */
function everyWordHead(x: WordHeadIn): boolean {
  for (const head of x.heads) {
    let hit = false
    for (const w of x.words) {
      if (w.startsWith(head)) {
        hit = true
        break
      }
    }
    if (hit === false) {
      return false
    }
  }
  return true
}

/**
 * 一档之内的先后:热门按名次在前(topMajorsOf),其余按表序,不计学分课与住院医师培训(SINK_SERIES)沉到最后。
 * 2026-10-04 八档立(原先热门另装一桶、档内只按表序)。
 *
 * @param rows 落在同一档的专业(表序)。
 * @returns 排好的同档专业。
 */
function tierRowsOf(rows: MajorRows): MajorRows {
  const cold: MajorRow[] = []
  const sunk: MajorRow[] = []
  for (const r of rows) {
    if (r.popular != null) {
      continue
    }
    if (SINK_SERIES.includes(r.series)) {
      sunk.push(r)
    } else {
      cold.push(r)
    }
  }
  return topMajorsOf(rows).concat(cold, sunk)
}

/**
 * 热门清单:按名次(1 起)排,不在热门清单的不出。按名次逐格摆放,不用比较器。
 * 2026-10-04 收口:搜索的热门档也拿它按名次摆(那时入参是命中检索词的热门行,不是整表),所以挪到 searchMajorsOf 之后。
 * 同日八档改判:每一档都拿它把档内的热门按名次摆在前面(tierRowsOf)。
 *
 * @param rows 整张专业表。
 * @returns 热门专业(名次序)。
 */
export function topMajorsOf(rows: MajorRows): MajorRows {
  const byRank = new Map<number, MajorRow>()
  let last = 0
  for (const r of rows) {
    if (r.popular != null) {
      byRank.set(r.popular, r)
      last = Math.max(last, r.popular)
    }
  }
  const out: MajorRow[] = []
  for (let rank = 1; rank <= last; rank++) {
    const hit = byRank.get(rank)
    if (hit != null) {
      out.push(hit)
    }
  }
  return out
}

/**
 * 按 class 码取一条。
 *
 * @param input 整张专业表与 class 码。
 * @returns 那一条;查无此码是 null。
 */
export function majorOf(input: MajorFindIn): MaybeMajor {
  for (const r of input.rows) {
    if (r.code === input.code) {
      return r
    }
  }
  return null
}

// =========================================================================
// 行构造器(rows 抽屉 2026-08-23 撤编后的固定尾段;db 词汇只许 to* 体内)
// =========================================================================

/**
 * 一行专业(SQL.MAJORS_ALL)→ `MajorFact`:对外行 + 选择器挂点(2026-10-05 立;挂点只留在服务端建树)。
 *
 * @param r 库里的一行。
 * @returns 洗净的一行。
 */
function toMajorFact(r: MajorDbRow): MajorFact {
  return { row: toMajorRow(r), places: toPlaces(r) }
}

/**
 * 一行专业(SQL.MAJORS_ALL)→ `MajorRow`。译名缺格保 null(数据层没译成,不拿英文顶);
 * broads 解析不出落空数组(jsonOrNull 已留痕);popular 是 numeric,pg 给字符串,numOrNull 收窄。
 * 2026-10-05 加 titleEnShort:NULL(灌库前)与空串一样落空串 = 照用 titleEn。
 *
 * @param r 库里的一行。
 * @returns 洗净的一行。
 */
function toMajorRow(r: MajorDbRow): MajorRow {
  let broads = jsonOrNull<string[]>(r.broads)
  if (broads == null) {
    broads = []
  }
  return {
    code: text(r.code), titleEn: text(r.title_en), titleZh: textOrNull(r.title_zh), titleKo: textOrNull(r.title_ko),
    titleEnShort: text(r.title_en_short), series: text(r.series), grouping: text(r.grouping), broads: broads,
    popular: numOrNull(r.popular),
  }
}

/**
 * 一行专业的 places 格 → 挂点清单(2026-10-05 立)。NULL(灌库前)= 不进选择器;JSON 串解析不出走 jsonOrNull 留痕;
 * 不是数组、或有一项不成样子(toPlace 给 null),整格当不成样子落空数组 —— 半截挂点会让一个专业在这个大类有、那个大类没有。
 * 2026-10-05 不成样子的整格落空时留痕(MAJORS_LOG.placesMalformed 带 class 码;解析不出的串 jsonOrNull 那行不带码,这里补一行);
 * NULL 是灌库前的正常态,不留痕。
 *
 * @param r 库里的一行。
 * @returns 挂点清单;不进选择器 / 不成样子是空数组。
 */
function toPlaces(r: MajorDbRow): MajorPlaces {
  if (r.places == null) {
    return []
  }
  const cell = jsonOrNull<MajorPlacesJson>(r.places)
  if (Array.isArray(cell) === false) {
    log({ tag: MAJORS_LOG.tag, text: MAJORS_LOG.placesMalformed + text(r.code) })
    return []
  }
  const out: MajorPlace[] = []
  for (const j of cell) {
    const place = toPlace(j)
    if (place == null) {
      log({ tag: MAJORS_LOG.tag, text: MAJORS_LOG.placesMalformed + text(r.code) })
      return []
    }
    out.push(place)
  }
  return out
}

/**
 * places 里的一项 → 一个挂点(2026-10-05 立):是对象、大类键合 CAT_KEY_RE、专业类键不空、六个名字是字符串、
 * 三个排序数是 PLACE_ORDER_MIN..PLACE_ORDER_MAX 的整数、single 是布尔,才收。
 *
 * @param j 一项原文。
 * @returns 一个挂点;不成样子是 null。
 */
function toPlace(j: MajorPlaceItemJson): MaybePlace {
  if (j == null || typeof j !== 'object') {
    return null
  }
  if (typeof j.cat !== 'string' || CAT_KEY_RE.test(j.cat) === false || typeof j.group !== 'string' || j.group === '') {
    return null
  }
  if (typeof j.catEn !== 'string' || typeof j.catZh !== 'string' || typeof j.catKo !== 'string') {
    return null
  }
  if (typeof j.groupEn !== 'string' || typeof j.groupZh !== 'string' || typeof j.groupKo !== 'string') {
    return null
  }
  if (typeof j.catOrder !== 'number' || typeof j.groupOrder !== 'number' || typeof j.order !== 'number') {
    return null
  }
  if (isPlaceOrder(j.catOrder) === false || isPlaceOrder(j.groupOrder) === false || isPlaceOrder(j.order) === false) {
    return null
  }
  if (typeof j.single !== 'boolean') {
    return null
  }
  return {
    cat: j.cat, catOrder: j.catOrder, catEn: j.catEn, catZh: j.catZh, catKo: j.catKo, group: j.group, groupEn: j.groupEn,
    groupZh: j.groupZh, groupKo: j.groupKo, groupOrder: j.groupOrder, order: j.order, single: j.single,
  }
}

/**
 * 排序数成不成样子:PLACE_ORDER_MIN..PLACE_ORDER_MAX 的整数(上限顺带管住逐格摆放的步数;2026-10-05 立)。
 *
 * @param n 一个排序数。
 * @returns 成样子 = true。
 */
function isPlaceOrder(n: number): boolean {
  return Number.isInteger(n) && n >= PLACE_ORDER_MIN && n <= PLACE_ORDER_MAX
}
