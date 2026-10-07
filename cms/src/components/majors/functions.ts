/**
 * majors 组件域(专业选择器)的函数:按界面语言挑名、已选一行与上面那一排摆什么、选满灰哪几行、点选 / 摘选、
 * 取热门、按码查回选中的、防抖搜索、左栏(大类清单、专业类树、展开收起)与 /api/majors 响应的行构造器。
 * 零 JSX 零 hook —— 排版归各 tsx,状态归 hooks.ts,死值归 constants.ts。
 * 2026-10-05 自 gate 桶整段迁入(原 gate/functions.ts 的「专业题的取数与搜索」一段与照掌上高考加的左栏一段;
 * 那边 992 行逼近 1000 行闸):逐条注释原样带过来,各条末尾补一句搬家记录。
 * 同日改多选(Frank「现在点了专业没法取消,而且不能选多个吗」「在哪里显示已选的专业呢」):点选中的那一行 = 摘掉、
 * 至多 MAJOR_PICK_MAX 个、满了没选的行灰着;选中的码与「手上那一行」都换成清单;多一段已选那一行摆什么(pickedRowsOf)。
 * 取挂了的日志照旧记在访客域 GUEST_LOG.majors 名下(lib/log 的日志族;选择器眼下只有访客第 2 题一个宿主)。
 *
 * @author Frank
 * @time 2026-10-05 12:24:22
 */
import { GUEST_LOG, log } from '@/lib/log'
import {
  CJK_RE, LANG_KO, LANG_ZH, MAJOR_CAT_HOT, MAJOR_DEBOUNCE_MS, MAJOR_HITS_MAX, MAJOR_PICK_MAX, MAJOR_Q_CJK_MIN,
  MAJOR_Q_MIN, TEXT_NONE, URL_MAJORS_CAT, URL_MAJORS_CATS, URL_MAJORS_Q, URL_MAJORS_TOP, URL_MAJOR_CODE,
} from './constants'
import type {
  CatNameIn, CatPickIn, CatsFetchIn, CatsLoadIn, CodesWithoutIn, DeadFlag, FoldOfFn, FoldOfIn, HotFetchIn, HotLoadIn,
  KnownAddIn, MajorCat, MajorCatJson, MajorCatsJson, MajorFireIn, MajorHitsIn, MajorNameIn, MajorOffIn, MajorOneJson,
  MajorPickOfFn, MajorPickOfIn, MajorRailItem, MajorRow, MajorRowJson, MajorSearchIn, MajorsJson, MajorStopIn,
  MajorTitled, MajorTopIn, MajorTree, MajorTreeJson, MaybeMajor, MaybeTree, MissingCodesIn, PickedFetchIn,
  PickedLoadIn, PickedRowsIn, RailItemsIn, RowOfCodeIn, TreeAddIn, TreeFetchIn, TreeLoadIn, TreeMap, TreeOfIn,
} from './types'

/**
 * 一个专业按界面语言挑名字(2026-10-04 A2):中文界面取中文名、韩文界面取韩文名,没译成(null / 空串)回退官方英文名;
 * 其余界面一律官方英文名。
 * 2026-10-05 照掌上高考改版:英文那一路先取数据层写的短名(titleEnShort),没有才用官方长名;按语言挑名交给 catNameOf
 * (大类、专业类同一把,不各写一份)。
 * 2026-10-05 自 gate 桶迁入(已选那一行的标签名也用它,与行里看到的同名)。
 *
 * @param x 一个专业与界面语言码。
 * @returns 显示名。
 */
export function majorNameOf(x: MajorNameIn): string {
  let titleEn = x.row.titleEn
  if (x.row.titleEnShort !== TEXT_NONE) {
    titleEn = x.row.titleEnShort
  }
  return catNameOf({ titled: { titleEn, titleZh: x.row.titleZh, titleKo: x.row.titleKo }, lang: x.lang })
}

/**
 * 大类 / 专业类按界面语言挑名字(中文界面取中文名、韩文界面取韩文名,没有回退英文显示名)。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param x 大类或专业类与界面语言码。
 * @returns 显示名。
 */
export function catNameOf(x: CatNameIn): string {
  let name: string | null = null
  if (x.lang === LANG_ZH) {
    name = x.titled.titleZh
  } else if (x.lang === LANG_KO) {
    name = x.titled.titleKo
  }
  if (name == null || name === TEXT_NONE) {
    return x.titled.titleEn
  }
  return name
}

/**
 * 已选那一行摆哪几个专业(2026-10-05 多选立,Frank「在哪里显示已选的专业呢」):按选的先后序,名字从手上的行取、
 * 没有再从热门取;两头都认不出(草稿带来的、按码查回之前)先不摆 —— 查回来就补上,不拿码当名字。
 *
 * @param x 选中的码、热门清单与手上的行。
 * @returns 已选那一行的专业。
 */
export function pickedRowsOf(x: PickedRowsIn): MajorRow[] {
  const out: MajorRow[] = []
  for (const code of x.codes) {
    let row = rowOfCode({ rows: x.known, code })
    if (row == null) {
      row = rowOfCode({ rows: x.hot, code })
    }
    if (row != null) {
      out.push(row)
    }
  }
  return out
}

/**
 * 在几行里按码找一行(2026-10-05 多选立)。
 *
 * @param x 那几行与专业码。
 * @returns 那一行;没有 = null。
 */
function rowOfCode(x: RowOfCodeIn): MaybeMajor {
  for (const r of x.rows) {
    if (r.code === x.code) {
      return r
    }
  }
  return null
}

/**
 * 专业题上面那一排:热门清单;选中的专业不在热门里时排到最前(亮着)—— 不然搜出来选中的、草稿里带来的,
 * 回到这一题就看不见选了什么。手上那一行不是现在选中的(跳过清掉了)就不摆。
 * 2026-10-05 自 gate 桶迁入;同日多选:选中的码逐个看,热门外、手上有那一行的按选的先后序排到最前;
 * 手上有但已摘掉的不摆(同上一句)。
 *
 * @param x 热门清单、手上的行与现在选中的码。
 * @returns 上面那一排。
 */
export function majorTopOf(x: MajorTopIn): MajorRow[] {
  const front: MajorRow[] = []
  for (const code of x.codes) {
    const held = rowOfCode({ rows: x.known, code })
    if (held != null && isHotMajor({ rows: x.hot, code }) === false) {
      front.push(held)
    }
  }
  return front.concat(x.hot)
}

/**
 * 这个码在不在热门清单里。
 * 2026-10-05 自 gate 桶迁入(入参改收 rowOfCode 同一形)。
 *
 * @param x 热门清单与专业码。
 * @returns 在 = true。
 */
function isHotMajor(x: RowOfCodeIn): boolean {
  return rowOfCode(x) != null
}

/**
 * 这一行该不该灰着点不动(2026-10-05 多选立):选满 MAJOR_PICK_MAX 个、且它不是选中的那几个之一。
 * 选中的行永远点得动(摘选得点它);不满时一行都不灰。
 *
 * @param x 选中的码与这一行的码。
 * @returns 灰 = true。
 */
export function isMajorOff(x: MajorOffIn): boolean {
  return x.codes.length >= MAJOR_PICK_MAX && x.codes.includes(x.code) === false
}

/**
 * 专业题搜索结果那一排摆什么:检索词够起搜才摆结果;不够(刚删短了,上一次的结果要等 effect 才清)摆空,
 * 不让过期的结果多露一拍。2026-10-04 A2 收口自专业题件的 JSX 条件下沉。
 * 同日收口审查:搜索在途也摆空(那一排换成占位)—— 上一次的结果不再挂到新的结果到来,与第 3 题选职业的搜索同一条规矩。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param x 够不够起搜、在不在途与搜索结果。
 * @returns 这一排的专业。
 */
export function majorHitsOf(x: MajorHitsIn): MajorRow[] {
  if (x.searchOn === false || x.searching) {
    return []
  }
  return x.hits
}

/**
 * 要按码查回哪几个选中的专业:选了、热门已到且不在热门里、手上又没有那一行(草稿里带来的)才查 ——
 * 热门没到之前不知道在不在,先不查;点选的那一行手上就有,不查。
 * 2026-10-05 自 gate 桶迁入(原 isPickedMissing:一个码判要不要查);同日多选改成逐码挑出要查的那几个。
 *
 * @param x 选中的码、热门清单与到没到、手上的行。
 * @returns 要查的码(选的先后序);不用查 = 空列。
 */
export function missingCodesOf(x: MissingCodesIn): string[] {
  const out: string[] = []
  if (x.hotLoaded === false) {
    return out
  }
  for (const code of x.codes) {
    if (rowOfCode({ rows: x.known, code }) == null && isHotMajor({ rows: x.hot, code }) === false) {
      out.push(code)
    }
  }
  return out
}

/**
 * 造逐专业的点选手柄工厂(热门、搜索结果两排共用;单选):记下这一行(热门外的靠它排到最前)、报专业码、清搜索框
 * (选完回到上面那一排看得见亮着的那个,不把结果留着挡路)。
 * 2026-10-05 自 gate 桶迁入;同日改多选(Frank「现在点了专业没法取消,而且不能选多个吗」):点选中的那一行 = 摘掉
 * (保序删去,搜索框不动 —— 在结果里摘一个不把结果冲掉);点没选的 = 记下这一行、追加在尾、清搜索框(同上);
 * 已满 MAJOR_PICK_MAX 个时没选的行不动(那一行本就灰着点不到,这里再夹一次)。已选那一行的 × 也走它(那一行一定是选中的)。
 *
 * @param x 选中的码、手上的行与搜索框两个落格、码清单上报口。
 * @returns 逐专业的手柄工厂。
 */
export function makeMajorPickOf(x: MajorPickOfIn): MajorPickOfFn {
  return function majorPickOf(row: MajorRow): () => void {
    return function pickMajorRow(): void {
      if (x.codes.includes(row.code)) {
        x.onChange(codesWithout({ codes: x.codes, code: row.code }))
        return
      }
      if (x.codes.length >= MAJOR_PICK_MAX) {
        return
      }
      x.setKnown(makeKnownAdd({ rows: [row] }))
      x.onChange(x.codes.concat([row.code]))
      x.setQ(TEXT_NONE)
    }
  }
}

/**
 * 码清单去掉一个码(保序;2026-10-05 多选立)。
 *
 * @param x 码清单与要摘掉的那一个。
 * @returns 新清单。
 */
function codesWithout(x: CodesWithoutIn): string[] {
  const out: string[] = []
  for (const c of x.codes) {
    if (c !== x.code) {
      out.push(c)
    }
  }
  return out
}

/**
 * 造手上的行的函数式更新(2026-10-05 多选立):旧清单照抄一份,添上手上还没有的那几行(不改旧清单)。
 *
 * @param x 要添上的行。
 * @returns 交给落格的更新函数。
 */
function makeKnownAdd(x: KnownAddIn): (prev: MajorRow[]) => MajorRow[] {
  return function addKnown(prev: MajorRow[]): MajorRow[] {
    const next = prev.slice()
    for (const r of x.rows) {
      if (rowOfCode({ rows: next, code: r.code }) == null) {
        next.push(r)
      }
    }
    return next
  }
}

/**
 * 造取热门专业的启动器(整机开屏跑一次;返回的收尾器交给 effect,卸载后迟到的结果不落格)。
 * 2026-10-05 自 gate 桶迁入(「整机」现指本域的选择器机器 useMajorPicker,宿主开屏就挂它)。
 *
 * @param x 热门清单与「到了」两个落格。
 * @returns 启动器。
 */
export function makeHotMajorsLoad(x: HotLoadIn): () => () => void {
  return function startHotMajors(): () => void {
    const flag: DeadFlag = { dead: false }
    void fetchHotMajors({ flag, setHot: x.setHot, setHotLoaded: x.setHotLoaded })
    return makeFlagDown(flag)
  }
}

/**
 * 取热门专业:取挂了留痕、按空清单算(专业题只剩搜索框),都记「到了」撤占位。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param x 存活标记与两个落格。
 * @returns 无。
 */
async function fetchHotMajors(x: HotFetchIn): Promise<void> {
  let rows: MajorRow[] = []
  try {
    const r = await fetch(URL_MAJORS_TOP)
    rows = toMajorRows(await r.json() as MajorsJson)
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.majors + String(e) })
  }
  if (x.flag.dead) {
    return
  }
  x.setHot(rows)
  x.setHotLoaded(true)
}

/**
 * 造「作废这次在途取数」的收尾器。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param flag 存活标记。
 * @returns 收尾器。
 */
function makeFlagDown(flag: DeadFlag): () => void {
  return function flagDown(): void {
    flag.dead = true
  }
}

/**
 * 造按码查回选中那个专业的启动器(草稿里带来的、热门里没有的;名字要靠它回显)。
 * 2026-10-05 自 gate 桶迁入;同日多选:一次查回要查的那几个。
 *
 * @param x 要查的专业码与落格。
 * @returns 启动器。
 */
export function makePickedLoad(x: PickedLoadIn): () => () => void {
  return function startPickedLoad(): () => void {
    const flag: DeadFlag = { dead: false }
    void fetchPicked({ flag, codes: x.codes, setKnown: x.setKnown })
    return makeFlagDown(flag)
  }
}

/**
 * 按码查回一个专业并落格;查不到(查无此码 / 取挂了)不落 —— 上面那一排照旧只摆热门。
 * 2026-10-05 自 gate 桶迁入;同日多选:那几个码并发查,全回来后查到的一次添进手上的行(一个都没查到不落格,
 * 不让「查无此码」的那一个反复重查)。
 *
 * @param x 存活标记、要查的专业码与落格。
 * @returns 无。
 */
async function fetchPicked(x: PickedFetchIn): Promise<void> {
  const got = await Promise.all(x.codes.map(fetchMajor))
  const rows: MajorRow[] = []
  for (const row of got) {
    if (row != null) {
      rows.push(row)
    }
  }
  if (x.flag.dead || rows.length === 0) {
    return
  }
  x.setKnown(makeKnownAdd({ rows }))
}

/**
 * 按码取一个专业(majors 域 ?code= 分支);取挂了留痕给 null。
 * 2026-10-05 自 gate 桶迁入并出桶(gate 注册完回职位板要它拿专业的本站大类,不另写一份取数)。
 *
 * @param code CIP class 码。
 * @returns 那个专业;查无此码 / 取挂了 = null。
 */
export async function fetchMajor(code: string): Promise<MaybeMajor> {
  try {
    const r = await fetch(URL_MAJOR_CODE + encodeURIComponent(code))
    return toMajorOne(await r.json() as MajorOneJson)
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.majors + String(e) })
    return null
  }
}

/**
 * 造专业搜索的启动器(检索词一变跑一次):不够起搜的词就地清空结果、不发请求;够了停手 MAJOR_DEBOUNCE_MS 才发。
 * 结果到之前上一次的结果照旧摆着(不清空再填,少闪一下);换词 / 卸载由收尾器掐计时器、作废在途那一发。
 * 2026-10-04 收口审查:够起搜的词一落下就记「在途」(防抖等待算在内,同第 3 题选职业的 makeSearchRun),结果到了落、
 * 不够起搜落、收尾器作废时落;在途时结果那一排换占位(majorHitsOf),上一次的结果留在落格里但不再摆出来。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param x 搜索框现值、结果与在途两个落格。
 * @returns 启动器。
 */
export function makeMajorSearch(x: MajorSearchIn): () => () => void {
  return function startMajorSearch(): () => void {
    const q = x.q.trim()
    const flag: DeadFlag = { dead: false }
    if (isMajorQuery(q) === false) {
      x.setHits([])
      x.setSearching(false)
      return makeFlagDown(flag)
    }
    x.setSearching(true)
    const timer = setTimeout(
      makeMajorFire({ q, flag, setHits: x.setHits, setSearching: x.setSearching }),
      MAJOR_DEBOUNCE_MS,
    )
    return makeMajorStop({ flag, timer, setSearching: x.setSearching })
  }
}

/**
 * 这个检索词够不够起搜:含中日韩字的 1 个字起(一个汉字 / 韩文音节就有意思),其余 2 个字起(单个字母匹配整表没意义)。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param q 已去首尾空白的检索词。
 * @returns 够 = true。
 */
export function isMajorQuery(q: string): boolean {
  if (CJK_RE.test(q)) {
    return q.length >= MAJOR_Q_CJK_MIN
  }
  return q.length >= MAJOR_Q_MIN
}

/**
 * 造专业搜索的收尾器:掐防抖计时器、作废在途那一发。
 * 2026-10-04 收口审查:作废时一并落「在途」(换了够起搜的新词,启动器紧接着再记上,同一拍渲染不闪)。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param x 存活标记、计时器与在途落格。
 * @returns 收尾器。
 */
function makeMajorStop(x: MajorStopIn): () => void {
  return function stopMajorSearch(): void {
    x.flag.dead = true
    clearTimeout(x.timer)
    x.setSearching(false)
  }
}

/**
 * 造防抖到点后真正去搜的那一发。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param x 检索词、存活标记与结果落格。
 * @returns 交给 setTimeout 的回调。
 */
function makeMajorFire(x: MajorFireIn): () => void {
  return function fireMajorSearch(): void {
    void fetchMajorHits(x)
  }
}

/**
 * 按检索词搜专业:最多摆 MAJOR_HITS_MAX 条;取挂了留痕、按没搜到算。
 * 2026-10-04 收口审查:结果落格后落「在途」;作废了的那一发两样都不落(在途由收尾器落过)。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param x 检索词、存活标记、结果与在途两个落格。
 * @returns 无。
 */
async function fetchMajorHits(x: MajorFireIn): Promise<void> {
  let rows: MajorRow[] = []
  try {
    const r = await fetch(URL_MAJORS_Q + encodeURIComponent(x.q))
    rows = toMajorRows(await r.json() as MajorsJson)
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.majors + String(e) })
  }
  if (x.flag.dead) {
    return
  }
  x.setHits(rows.slice(0, MAJOR_HITS_MAX))
  x.setSearching(false)
}

/**
 * 左栏各项:第一项「热门」,其后 16 个大类(数据层排好的序)。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param x 大类清单、界面语言码与「热门」的文字。
 * @returns 左栏各项。
 */
export function railItemsOf(x: RailItemsIn): MajorRailItem[] {
  const out: MajorRailItem[] = [{ key: MAJOR_CAT_HOT, label: x.hot }]
  for (const c of x.cats) {
    out.push({ key: c.key, label: catNameOf({ titled: c, lang: x.lang }) })
  }
  return out
}

/**
 * 造取大类清单的启动器(专业题机器开屏跑一次)。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param x 大类清单落格。
 * @returns 启动器(交回收尾器)。
 */
export function makeCatsLoad(x: CatsLoadIn): () => () => void {
  return function startCatsLoad(): () => void {
    const flag: DeadFlag = { dead: false }
    void fetchMajorCats({ flag, setCats: x.setCats })
    return makeFlagDown(flag)
  }
}

/**
 * 取大类清单:取挂了留痕、按空清单算(左栏只剩「热门」,搜索照用)。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param x 存活标记与落格。
 * @returns 无。
 */
async function fetchMajorCats(x: CatsFetchIn): Promise<void> {
  let cats: MajorCat[] = []
  try {
    const r = await fetch(URL_MAJORS_CATS)
    cats = toMajorCats(await r.json() as MajorCatsJson)
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.majors + String(e) })
  }
  if (x.flag.dead) {
    return
  }
  x.setCats(cats)
}

/**
 * 造取一个大类专业类树的启动器(点到一个还没取过的大类时跑;取过的切回来不重取)。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param x 大类键与树表落格。
 * @returns 启动器(交回收尾器)。
 */
export function makeTreeLoad(x: TreeLoadIn): () => () => void {
  return function startTreeLoad(): () => void {
    const flag: DeadFlag = { dead: false }
    void fetchMajorTree({ flag, cat: x.cat, setTrees: x.setTrees })
    return makeFlagDown(flag)
  }
}

/**
 * 取一个大类的专业类树:取挂了留痕、按空树落格(这一类右边空着,不反复重取)。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param x 存活标记、大类键与落格。
 * @returns 无。
 */
async function fetchMajorTree(x: TreeFetchIn): Promise<void> {
  let tree: MajorTree = { groups: [], singles: [] }
  try {
    const r = await fetch(URL_MAJORS_CAT + encodeURIComponent(x.cat))
    tree = toMajorTree(await r.json() as MajorTreeJson)
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.majors + String(e) })
  }
  if (x.flag.dead) {
    return
  }
  x.setTrees(makeTreeAdd({ cat: x.cat, tree }))
}

/**
 * 造树表的函数式更新:旧表照抄一份,添上这一类(不改旧表)。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param x 大类键与取到的树。
 * @returns 交给落格的更新函数。
 */
function makeTreeAdd(x: TreeAddIn): (prev: TreeMap) => TreeMap {
  return function addTree(prev: TreeMap): TreeMap {
    const next = new Map(prev)
    next.set(x.cat, x.tree)
    return next
  }
}

/**
 * 左栏当前项的专业类树(热门 / 还没取到 = null)。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param x 树表与左栏当前项。
 * @returns 树或 null。
 */
export function treeOfCat(x: TreeOfIn): MaybeTree {
  const hit = x.trees.get(x.cat)
  if (x.cat === MAJOR_CAT_HOT || hit == null) {
    return null
  }
  return hit
}

/**
 * 造左栏的点选手柄:换当前项,并收起展开着的专业类(新的一类从全收着开始,照掌上高考)。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param x 当前项与展开着的专业类两个落格。
 * @returns 点选手柄(收页签键)。
 */
export function makeCatPick(x: CatPickIn): (key: string) => void {
  return function pickCat(key: string): void {
    x.setCat(key)
    x.setOpen(TEXT_NONE)
  }
}

/**
 * 造专业类头行的点击手柄工厂(一次开一张:点开着的收起,点别的换成它)。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param x 展开着的专业类与落格。
 * @returns 手柄工厂(收专业类键,交出那一张的展开 / 收起手柄)。
 */
export function makeFoldOf(x: FoldOfIn): FoldOfFn {
  return function foldOf(key: string): () => void {
    return function toggleFold(): void {
      if (x.open === key) {
        x.setOpen(TEXT_NONE)
        return
      }
      x.setOpen(key)
    }
  }
}

/**
 * 热门 / 搜索响应 → 专业清单(行构造器):逐行验,缺码缺英文名的行丢掉。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param d 响应体。
 * @returns 专业清单;响应不成样子给空列。
 */
function toMajorRows(d: MajorsJson): MajorRow[] {
  const out: MajorRow[] = []
  if (d == null || d.majors == null || Array.isArray(d.majors) === false) {
    return out
  }
  for (const j of d.majors) {
    const row = toMajorRow(j)
    if (row != null) {
      out.push(row)
    }
  }
  return out
}

/**
 * 按码响应 → 一个专业(行构造器)。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param d 响应体。
 * @returns 那个专业;查无此码 / 响应不成样子 = null。
 */
function toMajorOne(d: MajorOneJson): MaybeMajor {
  if (d == null || d.major == null) {
    return null
  }
  return toMajorRow(d.major)
}

/**
 * 一行原文 → 一个专业(行构造器):码与英文名是字符串且不空才收;中韩名不是字符串记 null(前端回退英文名);
 * 大类只收非空字符串。2026-10-05:三语名交给 toMajorTitled(大类、专业类同一把);英文短名不是字符串记空串。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param j 一行原文。
 * @returns 一个专业;缺码缺英文名 = null。
 */
function toMajorRow(j: MajorRowJson): MaybeMajor {
  const titled = toMajorTitled(j)
  if (typeof j.code !== 'string' || j.code === TEXT_NONE || titled == null) {
    return null
  }
  const broads: string[] = []
  if (Array.isArray(j.broads)) {
    for (const b of j.broads) {
      if (typeof b === 'string' && b !== TEXT_NONE) {
        broads.push(b)
      }
    }
  }
  let titleEnShort = TEXT_NONE
  if (typeof j.titleEnShort === 'string') {
    titleEnShort = j.titleEnShort
  }
  return {
    code: j.code, titleEn: titled.titleEn, titleEnShort, titleZh: titled.titleZh, titleKo: titled.titleKo, broads,
  }
}

/**
 * 大类清单响应 → 大类(行构造器):键与英文名是字符串且不空才收。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param d 响应体。
 * @returns 大类清单;响应不成样子给空列。
 */
function toMajorCats(d: MajorCatsJson): MajorCat[] {
  const out: MajorCat[] = []
  if (d == null || d.cats == null || Array.isArray(d.cats) === false) {
    return out
  }
  for (const j of d.cats) {
    const titled = toMajorTitled(j)
    if (titled != null && typeof j.key === 'string' && j.key !== TEXT_NONE) {
      out.push({ key: j.key, titleEn: titled.titleEn, titleZh: titled.titleZh, titleKo: titled.titleKo })
    }
  }
  return out
}

/**
 * 专业类树响应 → 树(行构造器):专业类缺键缺名、一个专业都收不下的丢掉;专业逐行过 toMajorRow。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param d 响应体。
 * @returns 树;响应不成样子给空树。
 */
function toMajorTree(d: MajorTreeJson): MajorTree {
  const tree: MajorTree = { groups: [], singles: [] }
  if (d == null) {
    return tree
  }
  if (Array.isArray(d.groups)) {
    for (const j of d.groups) {
      const titled = toMajorTitled(j)
      const majors = toMajorRows(j)
      if (titled != null && typeof j.key === 'string' && j.key !== TEXT_NONE && majors.length > 0) {
        tree.groups.push({
          key: j.key, titleEn: titled.titleEn, titleZh: titled.titleZh, titleKo: titled.titleKo, majors,
        })
      }
    }
  }
  if (Array.isArray(d.singles)) {
    tree.singles = toMajorRows({ majors: d.singles })
  }
  return tree
}

/**
 * 大类 / 专业类原文 → 三语名(行构造器):英文名是字符串且不空才收;中韩名不是字符串记 null。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @param j 原文。
 * @returns 三语名;缺英文名 = null。
 */
function toMajorTitled(j: MajorCatJson): MajorTitled | null {
  if (typeof j.titleEn !== 'string' || j.titleEn === TEXT_NONE) {
    return null
  }
  let titleZh: string | null = null
  if (typeof j.titleZh === 'string') {
    titleZh = j.titleZh
  }
  let titleKo: string | null = null
  if (typeof j.titleKo === 'string') {
    titleKo = j.titleKo
  }
  return { titleEn: j.titleEn, titleZh, titleKo }
}
