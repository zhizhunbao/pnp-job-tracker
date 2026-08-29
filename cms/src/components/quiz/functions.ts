/**
 * quiz 域的函数:三问的答案层(读答案、注册后落档、职业名砍尾)、答题壳的取词与类名预算、
 * 选职业控件的取数在途工作者与手柄工厂、目标省控件的手柄工厂。
 * 零 JSX 零 hook —— 排版归各件的 tsx,状态归 hooks.ts,死值归 constants.ts。
 * 2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」时先迁进来一个 makeSearch;
 * 2026-08-28 换装批把 EntryQuiz.tsx 的答案层与三个 tsx 的组件体一起收进来。
 *
 * @author Frank
 * @time 2026-08-26 15:28:17
 */
import { OB_SEEN_KEY, POPULAR_NOCS } from '@/components/profile'
import { cssOf } from '@/components/css'
import { pickName } from '@/lib/noc'
import { BROAD_SLUGS } from '@/lib/stats'
import { ANSWERS_KEY, answeredBasics, readAnswers, toEngineAnswers } from '@/lib/quiz'
import {
  ABORT_NAME, ALPHA_A, CLS_BAR, CLS_HINT, CLS_ITEM, CLS_ITEM_ON, CLS_LIST, CLS_OCC_CAT_TAB,
  CLS_OCC_CAT_TAB_ON, CLS_OCC_PILL, CLS_OCC_PILL_ON, CLS_OCC_PILL_SKELETON, CLS_SEP, CRED_INCLUDE,
  DUP_MIN, HDR_CONTENT_TYPE, KEY_BROAD_HEAD, LEN_ZERO, LOCALE_NUM, METHOD_PATCH, MIME_JSON,
  OCC_AND_RE, OCC_COMMA_RE, OCC_TAIL_RE, PERCENT_MAX, PERCENT_SIGN, PROGRESS, PTS_ZERO, QUERY_MIN,
  SEARCH_DEBOUNCE_MS, SEEN_ONE, SEP_COMMA, SIGN_PLUS, SKEL_KINDS, SLOT_DONE, SLOT_TOTAL, TEXT_NONE,
  TOP_N, TOTAL_MIN, URL_ME, URL_QUIZ_BROAD, URL_QUIZ_COUNTS, URL_QUIZ_NOC, URL_QUIZ_Q, URL_QUIZ_TOP,
  URL_USERS_HEAD,
} from './constants'
import type {
  AlphaIn, ApplyPickIn, BarStyleIn, BootstrapIn, Cand, CandsJson, CatLabelIn, CatPickIn,
  CatPickOfFn, CatalogFetchIn, CatalogLoadIn, CatalogMap, CatalogPutIn, CatalogUpdateFn,
  CheckChangeFn, CheckToggleIn, ChipNameIn, ChoicePickIn, ClickFn, CountsFetchIn, CountsJson,
  CountsMergeIn, DeadFlag, DupCountIn, DupHintIn, DupMap, EngineValue, FactsJson, FirstListIn,
  FirstTextIn, ForeignMonthsIn, InitialTitlesIn, KeepBoolIn, KeepNumIn, KnownTitlesIn, L, MeJson,
  MeUser, MouseStopFn, OccBaseIn, OccLabelIn, OccListOfIn, OccNextIn, OccSegIn, OnClsIn, OneTitleIn,
  OpenTextIn, PickItemIn, PickOfFn, PickOfIn, PopularRowsIn, ProfileJson, ProfilePatch, ProfilePatchIn,
  ProfileSaved, ProgressTextIn, ProvAnyIn, ProvDoneIn, ProvPickIn, ProvPickOfFn, ProvStateIn,
  PtsTextIn, PutProfileIn, QuizAnswers, QuizAnswersRead, QuizLang, RadioChangeFn, SearchFireIn,
  SearchFn, SearchIn, SearchRunIn, SearchStopIn, SelectChangeFn, SkelClsIn, SkelFillIn, StartFn,
  StopFn, TimerHolderIn, TitleHit, TitleMap, TitlePutIn, TitleUpdateFn, TitlesFetchIn,
  TitlesFillIn, TitlesMergeIn, Top, TopFetchIn, TopGivenIn, TopJson, TopMergeIn, TopUpdateFn,
} from './types'
import css from './quiz.module.css'

/**
 * 三问此刻的答案。语义不变:从没答过 → null(职位板据此决定弹不弹)。
 * 三问只关心三个字段,档位字段留给答题器。
 * 记忆键收敛到 lib/quiz/answers 一个 key(2026-07-31 统一题库):三问与拿 PR 的答案
 * 同住一份,处境与目标省不再各存一份。本域不再直接碰 localStorage,读写都过门面。
 *
 * @returns 三问答案(收过卷时多一格 done);从没答过给 null。
 */
export function readQuiz(): QuizAnswersRead | null {
  const a = readAnswers()
  if (answeredBasics(a) === false) {
    return null
  }
  const out: QuizAnswersRead = { status: a.status, nocs: a.nocs, provs: a.provs }
  if (a.done === true) {
    out.done = true
  }
  return out
}

/**
 * 「答过没有」的记忆键。2026-07-31 统一题库后它就是 lib/quiz 的那一个 key ——
 * 三问与拿 PR 的答案同住一份存档,别处判「答过没有」时按名取这一个,不许另起。
 *
 * @returns 记忆键。
 */
export function quizKey(): string {
  return ANSWERS_KEY
}

/**
 * 三问答案 → 档案落库(注册成功后由宿主调;原内联在职位板页面,2026-07-30 随组件提级
 * 抽到这 —— jobs 与 /start 两个宿主同一份落库逻辑,不复制)。
 *
 * @param a 三问的三个答案。
 * @returns 无。落库失败不卡用户(整段吞掉不再抛):答案还在 localStorage,
 *          下次进来照样读得到,而弹一个「保存失败」只会把注册成功那一刻打断。
 */
export async function quizToProfile(a: QuizAnswers): Promise<void> {
  try {
    const user = await loadMe()
    if (user == null) {
      return
    }
    const uid = user.id
    if (uid == null || uid === TEXT_NONE) {
      return
    }
    let old: ProfileJson = {}
    if (user.profile != null) {
      old = user.profile
    }
    await putProfile({ uid, profile: profilePatchOf({ a, old }) })
    markOnboardingSeen()
  } catch {
    return
  }
}

/**
 * 读回当前登录用户(#107 同类保险丝的前半截:落档前**先读回既有档案**,
 * 语言分/CRS/PGWP 这些三问没问的一律原样带回,不能被整组 PATCH 抹掉)。
 *
 * @returns 用户格;没登录/读不到给 null。
 */
async function loadMe(): Promise<MeUser | null> {
  const res = await fetch(URL_ME, { credentials: CRED_INCLUDE })
  const me: MeJson = await res.json()
  if (me.user == null) {
    return null
  }
  return me.user
}

/**
 * 整组更新用户档案。
 *
 * @param x 用户 id 与合并好的档案。
 * @returns 无。
 */
async function putProfile(x: PutProfileIn): Promise<void> {
  const headers: Record<string, string> = {}
  headers[HDR_CONTENT_TYPE] = MIME_JSON
  await fetch(URL_USERS_HEAD + x.uid, {
    method: METHOD_PATCH,
    credentials: CRED_INCLUDE,
    headers,
    body: JSON.stringify({ profile: x.profile }),
  })
}

/**
 * 三问答案与既有档案合并成整组 PATCH 的档案。
 * 判定核个人条件要的槽全部一起落(2026-08-12 Frank「先把功能做完善」)——
 * 先前只落了 status/nocs/provs/clb,于是答过的经验/offer/加拿大学历在判定里等于没答,
 * 「个人条件」那几行对任何人(含 Pro)都只能输出「判不了」。**不落档答了也白答**。
 * 档位 → 引擎值一律走字段库 toAnswer(单一来源,「不清楚」在那里被翻成缺席);
 * 没答的不覆盖旧值 —— 一次没答不该把上次答过的抹掉。
 *
 * @param x 三问答案与既有档案。
 * @returns 合并后的整份档案(旧档里三问没碰的字段由 Object.assign 原样带回)。
 */
function profilePatchOf(x: ProfilePatchIn): ProfileSaved {
  const e = toEngineAnswers(Object.assign({}, readAnswers(), x.a))
  const canada = numOrNull(e.canadianExpMonths)
  const total = numOrNull(e.totalExpMonths)
  const patch: ProfilePatch = {
    currentStatus: firstTextOf({ now: x.a.status, prev: x.old.currentStatus }),
    nocCodes: firstListOf({ now: x.a.nocs, prev: x.old.nocCodes }),
    targetProvinces: firstListOf({ now: x.a.provs, prev: x.old.targetProvinces }),
    clb: keepNum({ now: e.clb, prev: x.old.clb }),
    expCanadaMonths: keepNum({ now: e.canadianExpMonths, prev: x.old.expCanadaMonths }),
    expForeignMonths: foreignMonthsOf({ total, canada, prev: x.old.expForeignMonths }),
    hasOffer: keepBool({ now: e.hasJobOffer, prev: x.old.hasOffer }),
    canadaStudy: keepBool({ now: e.canadaStudy, prev: x.old.canadaStudy }),
    profileUpdatedAt: new Date().toISOString(),
  }
  return Object.assign({}, x.old, patch)
}

/**
 * 答完三题就记一笔「已经问过」,别再弹建档向导。
 *
 * @returns 无。存不进去(隐私模式/配额满)照旧往下走:向导多弹一次不是错误,
 *          为它拦住注册流程才是。
 */
function markOnboardingSeen(): void {
  try {
    localStorage.setItem(OB_SEEN_KEY, SEEN_ONE)
  } catch {
    return
  }
}

/**
 * 引擎值收窄成数;不是数(没答 → 字段库给的是缺席)就 null。
 *
 * @param v 引擎值。
 * @returns 数或 null。
 */
function numOrNull(v: EngineValue): number | null {
  if (typeof v === 'number') {
    return v
  }
  return null
}

/**
 * 这次答了就用这次的,没答就留旧值(数字格)。
 *
 * @param x 这次算出来的值与旧档里的值。
 * @returns 该落库的数;两边都没有给 null。
 */
function keepNum(x: KeepNumIn): number | null {
  const now = numOrNull(x.now)
  if (now != null) {
    return now
  }
  if (x.prev == null) {
    return null
  }
  return x.prev
}

/**
 * 这次答了就用这次的,没答就留旧值(布尔格)。
 *
 * @param x 这次算出来的值与旧档里的值。
 * @returns 该落库的布尔;两边都没有给 null。
 */
function keepBool(x: KeepBoolIn): boolean | null {
  if (typeof x.now === 'boolean') {
    return x.now
  }
  if (x.prev == null) {
    return null
  }
  return x.prev
}

/**
 * 官方口径的「海外经验」= 总经验 − 加拿大经验。
 *
 * @param x 两段经验与旧值。
 * @returns 海外经验月数;总经验没答就留旧值(两个都答了才算得出,算不出不许折 0 ——
 *          折 0 = 替用户编一个「没有海外经验」的事实)。
 */
function foreignMonthsOf(x: ForeignMonthsIn): number | null {
  if (x.total == null) {
    if (x.prev == null) {
      return null
    }
    return x.prev
  }
  let canada = 0
  if (x.canada != null) {
    canada = x.canada
  }
  return Math.max(0, x.total - canada)
}

/**
 * 这次答了就用这次的,没答就留旧值(文本格)。
 *
 * @param x 这次答的与旧档里的。
 * @returns 该落库的文本;两边都是空的给 null。
 */
function firstTextOf(x: FirstTextIn): string | null {
  if (x.now !== TEXT_NONE) {
    return x.now
  }
  if (x.prev == null || x.prev === TEXT_NONE) {
    return null
  }
  return x.prev
}

/**
 * 这次选了就用这次的,没选就留旧值(清单格)。
 *
 * @param x 这次选的与旧档里的。
 * @returns 该落库的清单;两边都空就是空列。
 */
function firstListOf(x: FirstListIn): string[] {
  if (x.now.length > LEN_ZERO) {
    return x.now
  }
  if (x.prev == null) {
    return []
  }
  return x.prev
}

/**
 * 职业名砍尾。NOC 官方职业名是**分类名**不是岗位名,天生很长
 * (「食品柜台服务员、厨房助手及相关辅助职业」)。Frank 2026-07-27「很多职业名字是不是
 * 太长了啊」:选职业的人只需要认出**头一个**是不是自己那行,后面的「及相关职业」是
 * 分类学尾巴 → 显示层砍尾 + 取第一段;全名仍挂 title,不丢信息。
 * landing 行情卡同用这把刀(2026-07-30 v2)。
 *
 * @param name 完整职业名。
 * @returns 砍完的短名;砍成空串就退回原名(宁可长也不给一个空胶囊)。
 */
export function shortOcc(name: string): string {
  let s = TEXT_NONE
  if (name != null) {
    s = name
  }
  s = s.replace(OCC_TAIL_RE, TEXT_NONE).trim()
  s = firstSegOf({ text: s, sep: OCC_COMMA_RE })
  s = firstSegOf({ text: s, sep: OCC_AND_RE })
  if (s === TEXT_NONE) {
    return name
  }
  return s
}

/**
 * 按分隔符切开取第一段。只在「、」「及」处切 —— 不切「和」
 * (中文译名里「汽车服务技师卡车和公共汽车机械师」切了会更怪)。
 *
 * @param x 原文与分隔符。
 * @returns 第一段(已去空白);切不出来给空串。
 */
function firstSegOf(x: OccSegIn): string {
  const parts = x.text.split(x.sep)
  const head = parts[0]
  if (head == null) {
    return TEXT_NONE
  }
  return head.trim()
}

/**
 * 三语表按当前语言取字;已经取好的字原样给回。
 * 形状跟着**字段库**走(lib/quiz/fields 的 L),这里只负责按当前语言取。
 *
 * @param x 三语表或已取好的字。
 * @param lang 当前界面语言。
 * @returns 该显示的那句话。
 */
// eslint-disable-next-line local/one-parameter -- 跨桶公共 API:plan 按 pickL(text, lang) 两参在调,签名由消费者定死(承重墙「对外 API 一字不变」)
export function pickL(x: L | string, lang: QuizLang): string {
  if (typeof x === 'string') {
    return x
  }
  return x[lang]
}

/**
 * 进度那一行的字(「已填 3/5 项」)。三句住 constants 的 PROGRESS
 * (先前是覆盖 SurveyJS 的 questionsProgressText;「已答 0/2 题」那套考试口吻
 * 2026-07-31 被 Frank 点名,改成建档口吻)。
 *
 * @param x 界面语言与两个计数。
 * @returns 进度文字。
 */
export function progressTextOf(x: ProgressTextIn): string {
  const tpl = PROGRESS[x.lang]
  return tpl.replace(SLOT_DONE, String(x.done)).replace(SLOT_TOTAL, String(x.total))
}

/**
 * 进度条已填那一截的宽度。
 *
 * @param x 两个计数。
 * @returns 行内宽度(百分比;题数为 0 时不许除 0)。
 */
export function barStyleOf(x: BarStyleIn): React.CSSProperties {
  const pct = Math.round((x.done / Math.max(x.total, TOTAL_MIN)) * PERCENT_MAX)
  return { width: pct + PERCENT_SIGN }
}

/**
 * 一张选项卡片的类(选中时加一档加倍类)。
 *
 * @param x 选中没有。
 * @returns 类名。
 */
export function itemClsOf(x: OnClsIn): string {
  if (x.on) {
    return CLS_ITEM + CLS_SEP + CLS_ITEM_ON
  }
  return CLS_ITEM
}

/**
 * 「下一题」那颗钮的类(置灰时加一档三倍类 —— 要压过 button 域的 `.primary:disabled`)。
 *
 * @param x 置灰没有。
 * @returns 类名。
 */
export function nextClsOf(x: OnClsIn): string {
  if (x.on) {
    return cssOf(css.nextBtn) + CLS_SEP + cssOf(css.nextBtnOff)
  }
  return cssOf(css.nextBtn)
}

/**
 * 一颗省药丸的类(选中时加一档加倍类)。
 *
 * @param x 选中没有。
 * @returns 类名。
 */
export function provPillClsOf(x: OnClsIn): string {
  if (x.on) {
    return cssOf(css.provPill) + CLS_SEP + cssOf(css.provPillOn)
  }
  return cssOf(css.provPill)
}

/**
 * 选项组的类(答题壳共用,≥900px 两列铺开)。
 *
 * @returns 类名。
 */
export function listCls(): string {
  return CLS_LIST
}

/**
 * 动作条的类(答题壳共用;chat 桶的吸底避让按特征扫它)。
 *
 * @returns 类名。
 */
export function barCls(): string {
  return CLS_BAR
}

/**
 * 动作条中间那句灰字的类。
 *
 * @returns 类名。
 */
export function hintCls(): string {
  return CLS_HINT
}

/**
 * 第 i 个选项的字母徽标(原生 radio 的圆点点击目标感弱,Frank 拿三个答题项目对比过)。
 *
 * @param x 这是第几个选项。
 * @returns A/B/C/D…。
 */
export function alphaOf(x: AlphaIn): string {
  return String.fromCharCode(ALPHA_A + x.i)
}

/**
 * 多选条目右侧那一格分值。加分项有负分(MB 风险评估 -100):符号跟着分值走,
 * 不拼「+-100」。
 *
 * @param x 这一条的分值。
 * @returns 带符号的分值文字。
 */
export function ptsTextOf(x: PtsTextIn): string {
  if (x.pts >= PTS_ZERO) {
    return SIGN_PLUS + String(x.pts)
  }
  return String(x.pts)
}

/**
 * 造一枚多选条目的勾选手柄(签名由 DOM 的 change 事件定死)。
 *
 * @param x 这一条的勾选落格。
 * @returns 挂到 `<input type="checkbox">` onChange 上的手柄。
 */
export function makeCheckToggle(x: CheckToggleIn): CheckChangeFn {
  return function onCheck(e: React.ChangeEvent<HTMLInputElement>): void {
    x.toggle(e.target.checked)
  }
}

/**
 * 造一枚单选选项的选中手柄。value 用受控 radio:选中不自动跳
 * (2026-07-31 Frank),跳转永远由用户按。
 *
 * @param x 这个选项的值与选中落格。
 * @returns 挂到 `<input type="radio">` onChange 上的手柄。
 */
export function makeChoicePick<T extends string | number>(x: ChoicePickIn<T>): RadioChangeFn {
  return function onRadio(): void {
    x.onPick(x.value)
  }
}

/**
 * 造一枚搜索框的改值手柄:清空即连候选一起清
 * (原先这句写在自搭清除钮的 onClick 里,2026-08-24 换 field 域的 Search 后收进这一处)。
 *
 * @param x 搜索词与候选清单两个 setter。
 * @returns 挂到 Search onChange 上的手柄。
 */
export function makeSearch(x: SearchIn): SearchFn {
  return function onSearch(v: string): void {
    x.setQ(v)
    if (v === '') {
      x.setCands([])
    }
  }
}

/**
 * 一行职业此刻的显示名。优先用库里的短名(三语,ETL 04g 产)——
 * 前端不自己截字符串,清洗归数据层。
 *
 * @param x 这一行职业与界面语言码。
 * @returns 显示名。
 */
export function occLabelOf(x: OccLabelIn): string {
  return pickName({ row: x.row, lang: x.lang })
}

/**
 * 兜底热门清单:热门榜空了就整份退回内置常用清单
 * (首屏先用它,不让冷启动的全表 GROUP BY 把题目冻成骨架 8 秒)。
 *
 * @param x 取词函数与已有的热门榜。
 * @returns 这一屏的原料。
 */
export function occBaseOf(x: OccBaseIn): Top[] {
  if (x.top.length > LEN_ZERO) {
    return x.top
  }
  return popularRowsOf({ t: x.t })
}

/**
 * 内置常用清单变成榜行(在招数还没到就先写 0)。
 *
 * @param x 取词函数。
 * @returns 14 行兜底职业。
 */
export function popularRowsOf(x: PopularRowsIn): Top[] {
  const out: Top[] = []
  for (const p of POPULAR_NOCS) {
    const name = x.t(p.key)
    out.push({ noc: p.noc, title: name, titleZh: name, open: 0 })
  }
  return out
}

/**
 * 进来时已选那几个职业的名字。常用职业名同步就有,刷新时不为回显一颗已选 chip
 * 再等一次事实查询。
 *
 * @param x 取词函数与进来时已选的码。
 * @returns 码 → 名字。
 */
export function initialTitlesOf(x: InitialTitlesIn): TitleMap {
  const out: TitleMap = {}
  for (const p of POPULAR_NOCS) {
    if (x.initial.includes(p.noc)) {
      out[p.noc] = x.t(p.key)
    }
  }
  return out
}

/**
 * 服务端有没有把热门榜一起送下来。给了它就**一次成型**:首帧即终态,
 * 不再「内置 14 个 → 补数字 → 换真榜」刷三次,骨架也用不上,一个请求都不发
 * (2026-08-12 Frank「现在是一点一点刷出来,不能一次性刷出来吗」)。
 *
 * @param x 服务端送下来的热门榜。
 * @returns 送了(且不是空列)= true。
 */
export function topGivenOf(x: TopGivenIn): boolean {
  return x.initialTop != null && x.initialTop.length > LEN_ZERO
}

/**
 * 内置常用清单的码表(拼进 counts 小查询)。
 *
 * @returns 逗号连接的 NOC 码。
 */
export function popularCodes(): string {
  const codes: string[] = []
  for (const p of POPULAR_NOCS) {
    codes.push(p.noc)
  }
  return codes.join(SEP_COMMA)
}

/**
 * 全部大分类的 slug(分类名称同步可见;职业只在用户点中某类后按需查询)。
 *
 * @returns 分类 slug 清单。
 */
export function broadCats(): string[] {
  const out: string[] = []
  for (const [, name] of BROAD_SLUGS) {
    out.push(name)
  }
  return out
}

/**
 * 这一屏要摆哪些职业。分类一次摆全:接口 loadBroadNocs 硬顶 60 条,不需要再分页
 * (「查看更多」已撤)。热门那一屏**按在招量降序**(2026-08-12 Frank:「cooks 应该排在
 * 第一啊」)—— 胶囊上就写着在招数,顺序不跟着它走,读者会以为这个序另有含义。
 * 分类页的行由接口按量排好,不再动。
 *
 * @param x 当前分类、该分类的清单与兜底原料。
 * @returns 这一屏的职业行。
 */
export function occListOf(x: OccListOfIn): Top[] {
  if (x.cat !== TEXT_NONE) {
    if (x.catRows == null) {
      return []
    }
    return x.catRows
  }
  const sorted = x.base.slice()
  sorted.sort(byOpenDesc)
  return sorted.slice(0, TOP_N)
}

/**
 * 在招量降序的比较器。
 *
 * @param a 一行。
 * @param b 另一行。
 * @returns 排序权。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死(宪法钦定的豁免形态)
function byOpenDesc(a: Top, b: Top): number {
  return b.open - a.open
}

/**
 * 显示名 → 出现次数。库里会出现同名不同码(中文都叫「厨师」= 63200 Cooks 与
 * 62200 Chefs)—— 重名时挂英文官方名区分,不重名的什么都不挂(甩个 5 位码只添噪音,
 * 2026-07-27 拍板)。
 *
 * @param x 这一屏的职业与界面语言码。
 * @returns 计数表。
 */
export function dupCountOf(x: DupCountIn): DupMap {
  const out: DupMap = new Map()
  for (const row of x.list) {
    const l = occLabelOf({ row, lang: x.lang })
    let n = 0
    const had = out.get(l)
    if (had != null) {
      n = had
    }
    out.set(l, n + 1)
  }
  return out
}

/**
 * 重名时挂在胶囊上的那一格灰字。
 *
 * @param x 这一行职业、它的显示名与计数表。
 * @returns 官方英文名(与显示名不同才给);不重名时给空串,没有官方名时退回五位码。
 */
export function dupHintOf(x: DupHintIn): string {
  let n = 0
  const had = x.dupCount.get(x.label)
  if (had != null) {
    n = had
  }
  if (n <= DUP_MIN) {
    return TEXT_NONE
  }
  if (x.row.title !== TEXT_NONE && x.row.title !== x.label) {
    return x.row.title
  }
  return x.row.noc
}

/**
 * 胶囊上「N 在招」那一格。
 *
 * @param x 取词函数与在招数。
 * @returns 在招数文案。
 */
export function openTextOf(x: OpenTextIn): string {
  return x.t('quiz.openN', { n: x.open.toLocaleString(LOCALE_NUM) })
}

/**
 * 分类页签/下拉项上的字(空 slug = 热门那一档)。
 *
 * @param x 取词函数与分类 slug。
 * @returns 该显示的分类名。
 */
export function catLabelOf(x: CatLabelIn): string {
  if (x.slug === TEXT_NONE) {
    return x.t('occ.cat.hot')
  }
  return x.t(KEY_BROAD_HEAD + x.slug)
}

/**
 * 已选胶囊上的名字。答过一轮再回到这一步时,存档里只有 5 位码 —— 名字得现拉,
 * 不拉就在 chip 上甩一个「31301」(代码不裸奔,2026-08-01 翻页改回来后实拍撞到)。
 *
 * @param x NOC 码与显示名表。
 * @returns 砍完尾的显示名;还没拉到给空串(调用方出占位条)。
 */
export function chipNameOf(x: ChipNameIn): string {
  const name = x.titles[x.noc]
  if (name == null || name === TEXT_NONE) {
    return TEXT_NONE
  }
  return shortOcc(name)
}

/**
 * 点已选胶囊取消选中时,顺手记回名字表的那个名字。取**未砍尾的全名**
 * (与列表胶囊那条路一致);名字还没拉回来就拿五位码顶,不许把空串写进名字表 ——
 * 写进去下一轮就再也不会去补了。
 *
 * @param x NOC 码与显示名表。
 * @returns 要记回去的名字。
 */
export function chipPickNameOf(x: ChipNameIn): string {
  const name = x.titles[x.noc]
  if (name == null || name === TEXT_NONE) {
    return x.noc
  }
  return name
}

/**
 * 一颗职业胶囊的类(选中时加一档加倍类)。
 *
 * @param x 选中没有。
 * @returns 类名。
 */
export function pillClsOf(x: OnClsIn): string {
  if (x.on) {
    return CLS_OCC_PILL + CLS_SEP + CLS_OCC_PILL_ON
  }
  return CLS_OCC_PILL
}

/**
 * 一个分类页签的类(当前那一档加加倍类)。
 *
 * @param x 是不是当前分类。
 * @returns 类名。
 */
export function catTabClsOf(x: OnClsIn): string {
  if (x.on) {
    return CLS_OCC_CAT_TAB + CLS_SEP + CLS_OCC_CAT_TAB_ON
  }
  return CLS_OCC_CAT_TAB
}

/**
 * 分类清单在途时那一排骨架的类(宽度按分类页真胶囊的量级取)。
 *
 * @param x 这是第几颗骨架。
 * @returns 类名。
 */
export function skelCatClsOf(x: SkelClsIn): string {
  const widths = [css.skelCat0, css.skelCat1, css.skelCat2, css.skelCat3, css.skelCat4, css.skelCat5]
  return CLS_OCC_PILL_SKELETON + CLS_SEP + cssOf(widths[x.i % SKEL_KINDS])
}

/**
 * 热门榜还没到时补位那一排骨架的类。宽度按真胶囊(名字 +「N 在招」)的量级取,
 * 占位与实物差得越少,填上去那一下越看不出来。
 *
 * @param x 这是第几颗骨架。
 * @returns 类名。
 */
export function skelTopClsOf(x: SkelClsIn): string {
  const widths = [css.skelTop0, css.skelTop1, css.skelTop2, css.skelTop3, css.skelTop4, css.skelTop5]
  return CLS_OCC_PILL_SKELETON + CLS_SEP + cssOf(widths[x.i % SKEL_KINDS])
}

/**
 * 热门榜没到时要补几颗骨架:格子数从头到尾是 24,列表不会长一次、也就不会重排。
 *
 * @param x 这一屏已经摆出来几颗。
 * @returns 要补的颗数。
 */
export function skelFillCount(x: SkelFillIn): number {
  return Math.max(0, TOP_N - x.shown)
}

/**
 * 造逐职业的点击手柄工厂(热门/分类胶囊与已选胶囊共用)。
 *
 * @param x 已选码、三个 setter 与选择变化的回传。
 * @returns 逐职业的手柄工厂。
 */
export function makePickOf(x: PickOfIn): PickOfFn {
  return function pickOf(i: PickItemIn): ClickFn {
    return function pick(): void {
      applyPick({ p: x, i })
    }
  }
}

/**
 * 造搜索结果里逐候选的点击手柄工厂:选中之后连搜索框与候选一起清
 * (选完就回到热门那一屏,不把结果留在那儿挡着)。
 *
 * @param x 已选码、三个 setter 与选择变化的回传。
 * @returns 逐候选的手柄工厂。
 */
export function makeCandPickOf(x: PickOfIn): PickOfFn {
  return function candPickOf(i: PickItemIn): ClickFn {
    return function pickCand(): void {
      applyPick({ p: x, i })
      x.setQ(TEXT_NONE)
      x.setCands([])
    }
  }
}

/**
 * 切换一个职业的选中态(两只手柄的共同真身:顺手把这颗胶囊上的名字记进 titles,
 * 省一次回查)。onChange 必须在 updater **外面**调:React 的 setState updater 跑在
 * 渲染阶段,在里面回调父组件的 setState =「渲染 A 的时候更新 B」,控制台会红
 * (2026-08-02 走查在 console 抓到:Cannot update a component `PlanPrView` while
 * rendering a different component `OccPicker`)。事件处理器里 nocs 就是最新值,
 * 不需要 updater 形式。
 *
 * @param x 手柄工厂的入参与被点的那个职业。
 * @returns 无。
 */
function applyPick(x: ApplyPickIn): void {
  x.p.setTitles(makeTitlePut({ noc: x.i.noc, name: x.i.name }))
  const next: string[] = []
  let had = false
  for (const n of x.p.nocs) {
    if (n === x.i.noc) {
      had = true
    } else {
      next.push(n)
    }
  }
  if (had === false) {
    next.push(x.i.noc)
  }
  x.p.setNocs(next)
  if (x.p.onChange != null) {
    x.p.onChange(next)
  }
}

/**
 * 造一枚「把这个职业的名字记进表里」的 updater。
 *
 * @param x NOC 码与名字。
 * @returns 交给 setTitles 的 updater。
 */
export function makeTitlePut(x: TitlePutIn): TitleUpdateFn {
  return function putTitle(m: TitleMap): TitleMap {
    const patch: TitleMap = {}
    patch[x.noc] = x.name
    return Object.assign({}, m, patch)
  }
}

/**
 * 造一枚「把这一批名字并进表里」的 updater。
 *
 * @param x 要并进去的名字表。
 * @returns 交给 setTitles 的 updater。
 */
function makeTitlesMerge(x: TitlesMergeIn): TitleUpdateFn {
  return function mergeTitles(m: TitleMap): TitleMap {
    return Object.assign({}, m, x.patch)
  }
}

/**
 * 造逐分类页签的点击手柄工厂。
 *
 * @param x 当前分类 setter。
 * @returns 逐分类的手柄工厂。
 */
export function makeCatPickOf(x: CatPickIn): CatPickOfFn {
  return function catPickOf(slug: string): ClickFn {
    return function pickCat(): void {
      x.setCat(slug)
    }
  }
}

/**
 * 造手机端分类下拉的改值手柄(签名由 DOM 的 change 事件定死)。
 *
 * @param x 当前分类 setter。
 * @returns 挂到 `<select>` onChange 上的手柄。
 */
export function makeCatSelect(x: CatPickIn): SelectChangeFn {
  return function onCatSelect(e: React.ChangeEvent<HTMLSelectElement>): void {
    x.setCat(e.target.value)
  }
}

/**
 * 造一枚「点在弹层里不算点遮罩」的拦截手柄(签名由 DOM 的 click 事件定死)。
 *
 * @returns 挂到弹层本体 onClick 上的手柄。
 */
export function makeStopClick(): MouseStopFn {
  return function stopClick(e: React.MouseEvent): void {
    e.stopPropagation()
  }
}

/**
 * 造「下一题」的点击手柄。
 *
 * @param x 已选码与交出口。
 * @returns 点击手柄。
 */
export function makeOccNext(x: OccNextIn): ClickFn {
  return function nextStep(): void {
    x.onDone(x.nocs)
  }
}

/**
 * 造首屏取数的启动器。首屏立即用内置常用清单;并行补两份事实:
 * ① 小查询只给这 14 个兜底职业补在招数,让数字尽快出现;
 * ② 完整 top=24 后台跑完后替换成真实热门榜。两者都不阻塞控件,也不再 400ms 就掐断。
 *
 * @param x 三个 setter、已选码与界面语言码。
 * @returns 启动器(调用它开跑,返回的收尾器交给 effect)。
 */
export function makeBootstrap(x: BootstrapIn): StartFn {
  return function startBootstrap(): StopFn {
    const flag: DeadFlag = { dead: false }
    const topCtl = new AbortController()
    const countsCtl = new AbortController()
    void fetchCounts({ flag, signal: countsCtl.signal, setTop: x.setTop })
    void fetchTop({
      flag,
      signal: topCtl.signal,
      setTop: x.setTop,
      setTopLoaded: x.setTopLoaded,
      setTitles: x.setTitles,
      nocs: x.nocs,
      lang: x.lang,
    })
    return function stopBootstrap(): void {
      flag.dead = true
      topCtl.abort()
      countsCtl.abort()
    }
  }
}

/**
 * 给兜底那 14 个职业补在招数。
 *
 * @param x 存活标记、中止信号与热门榜 setter。
 * @returns 无。数字拿不到不影响选择(整段吞掉):胶囊上少一格「N 在招」,
 *          选职业这件事照样成立。
 */
async function fetchCounts(x: CountsFetchIn): Promise<void> {
  try {
    const res = await fetch(URL_QUIZ_COUNTS + popularCodes(), { signal: x.signal })
    const d: CountsJson = await res.json()
    if (x.flag.dead || d.counts == null) {
      return
    }
    x.setTop(makeCountsMerge({ counts: d.counts }))
  } catch {
    return
  }
}

/**
 * 造一枚「把在招数并进现有榜行」的 updater。
 *
 * @param x 码 → 在招数的表。
 * @returns 交给 setTop 的 updater。
 */
function makeCountsMerge(x: CountsMergeIn): TopUpdateFn {
  return function mergeCounts(rows: Top[]): Top[] {
    const out: Top[] = []
    for (const r of rows) {
      const hit = x.counts[r.noc]
      let open = r.open
      if (hit != null) {
        open = hit.open
      }
      out.push(Object.assign({}, r, { open }))
    }
    return out
  }
}

/**
 * 取真实热门榜(top=24)。24 与服务端启动预热、缓存键完全一致 —— 先前改成 200 会绕过预热,
 * 冷启动重新 GROUP BY 全表,实测把职业题首屏从几十毫秒拖到 2.8 秒。
 * 回到这一步时存档只有 NOC 码,顺手从同一份数据补名字,避免已选胶囊在慢连接下多空白一拍;
 * 冷门职业仍由逐码查询兜底。
 *
 * @param x 存活标记、中止信号、三个 setter、已选码与界面语言码。
 * @returns 无。**abort 不算拿不到**:StrictMode/切页会中止第一次请求,把它当失败会立刻
 *          撤掉骨架,骨架一撤、真榜再到,列表照样长一次(2026-08-12 实撞,探针打出
 *          topLoaded=true 才看出来);真拿不到就用兜底那 14 个。
 */
async function fetchTop(x: TopFetchIn): Promise<void> {
  try {
    const res = await fetch(URL_QUIZ_TOP, { signal: x.signal })
    const d: TopJson = await res.json()
    if (x.flag.dead) {
      return
    }
    const rows = topRowsOf(d)
    x.setTop(makeTopMerge({ rows }))
    x.setTopLoaded(true)
    const known = knownTitlesOf({ rows, nocs: x.nocs, lang: x.lang })
    if (Object.keys(known).length > LEN_ZERO) {
      x.setTitles(makeTitlesMerge({ patch: known }))
    }
  } catch (e) {
    if (isAbort(e) === false) {
      x.setTopLoaded(true)
    }
  }
}

/**
 * 热门榜/分类清单报文里的行。
 *
 * @param d 报文。
 * @returns 榜行;报文不成样子给空列。
 */
function topRowsOf(d: TopJson): Top[] {
  const rows = d.top
  if (rows == null) {
    return []
  }
  if (Array.isArray(rows) === false) {
    return []
  }
  return rows
}

/**
 * 造一枚「把真实热门榜并进首屏那一份」的 updater。
 * **保住首屏已经显示的顺序**:真实热门榜按在招量排,而首屏那份是内置常用清单的固定序 ——
 * 直接整份替换的话,用户眼睁睁看着胶囊重新洗牌(2026-08-12 Frank 实拍:「各种职业瞬间
 * 跳到第一个厨师」,厨师岗最多所以窜到第一)。改成:首屏那 14 个**一个都不动**
 * (在真实榜里的顺带把在招数合并进来,不在榜里的原样留着),榜里多出来的追加在后 ——
 * 只按榜单过滤的话,榜上没有的内置职业会凭空消失,看着还是重排。
 *
 * @param x 真实热门榜的行。
 * @returns 交给 setTop 的 updater(榜是空的就原样退回,不拿空榜盖掉首屏)。
 */
function makeTopMerge(x: TopMergeIn): TopUpdateFn {
  return function mergeTop(prev: Top[]): Top[] {
    if (x.rows.length === LEN_ZERO) {
      return prev
    }
    const byNoc = new Map<string, Top>()
    for (const r of x.rows) {
      byNoc.set(r.noc, r)
    }
    const kept: Top[] = []
    const keptSet = new Set<string>()
    for (const p of prev) {
      const hit = byNoc.get(p.noc)
      let row = p
      if (hit != null) {
        row = Object.assign({}, p, hit)
      }
      kept.push(row)
      keptSet.add(p.noc)
    }
    for (const r of x.rows) {
      if (keptSet.has(r.noc) === false) {
        kept.push(r)
      }
    }
    return kept
  }
}

/**
 * 从热门榜里顺手挑出已选职业的名字。
 *
 * @param x 榜行、已选码与界面语言码。
 * @returns 码 → 名字。
 */
function knownTitlesOf(x: KnownTitlesIn): TitleMap {
  const out: TitleMap = {}
  for (const r of x.rows) {
    if (x.nocs.includes(r.noc)) {
      out[r.noc] = occLabelOf({ row: r, lang: x.lang })
    }
  }
  return out
}

/**
 * 造某一类职业清单的启动器。分类名称同步可见;职业只在用户点中某类后按需查询 ——
 * 这样恢复旧版分类浏览,又不再让每次打开问卷都为从未点击的 26 类扫描 top=200。
 *
 * @param x 分类 slug 与目录 setter。
 * @returns 启动器。
 */
export function makeCatalogLoad(x: CatalogLoadIn): StartFn {
  return function startCatalog(): StopFn {
    const ctl = new AbortController()
    void fetchCatalog({ cat: x.cat, setCatalogByCat: x.setCatalogByCat, signal: ctl.signal })
    return function stopCatalog(): void {
      ctl.abort()
    }
  }
}

/**
 * 取某一类的职业清单。
 *
 * @param x 分类 slug、目录 setter 与中止信号。
 * @returns 无。拿不到就把这一类记成空列(骨架撤掉、出空态);abort 不记 ——
 *          切分类时被中止的那次不该把新那一类的格子占掉。
 */
async function fetchCatalog(x: CatalogFetchIn): Promise<void> {
  try {
    const res = await fetch(URL_QUIZ_BROAD + encodeURIComponent(x.cat), { signal: x.signal })
    const d: TopJson = await res.json()
    x.setCatalogByCat(makeCatalogPut({ cat: x.cat, rows: topRowsOf(d) }))
  } catch (e) {
    if (isAbort(e) === false) {
      x.setCatalogByCat(makeCatalogPut({ cat: x.cat, rows: [] }))
    }
  }
}

/**
 * 造一枚「把这一类的清单记进目录」的 updater。
 *
 * @param x 分类 slug 与它的行。
 * @returns 交给 setCatalogByCat 的 updater。
 */
function makeCatalogPut(x: CatalogPutIn): CatalogUpdateFn {
  return function putCatalog(m: CatalogMap): CatalogMap {
    const patch: CatalogMap = {}
    patch[x.cat] = x.rows
    return Object.assign({}, m, patch)
  }
}

/**
 * 造搜索的启动器(≥2 字、防抖 180ms;不到 2 字就地清空,不发请求)。
 *
 * @param x 搜索词、计时器句柄与两个 setter。
 * @returns 启动器。
 */
export function makeSearchRun(x: SearchRunIn): StartFn {
  return function startSearch(): StopFn {
    clearTimer({ timer: x.timer })
    const ctl = new AbortController()
    const query = x.q.trim()
    if (query.length < QUERY_MIN) {
      x.setCands([])
      x.setSearching(false)
      return makeSearchStop({ timer: x.timer, ctl })
    }
    x.setCands([])
    x.setSearching(true)
    x.timer.current = setTimeout(
      makeSearchFire({
        query,
        signal: ctl.signal,
        ctl,
        setCands: x.setCands,
        setSearching: x.setSearching,
      }),
      SEARCH_DEBOUNCE_MS,
    )
    return makeSearchStop({ timer: x.timer, ctl })
  }
}

/**
 * 造搜索的收尾器(翻走/改词时把在途那次连计时器一起收掉)。
 *
 * @param x 计时器句柄与中止把手。
 * @returns 收尾器。
 */
function makeSearchStop(x: SearchStopIn): StopFn {
  return function stopSearch(): void {
    clearTimer({ timer: x.timer })
    x.ctl.abort()
  }
}

/**
 * 掐掉在途的防抖计时器。
 *
 * @param x 计时器句柄。
 * @returns 无。
 */
function clearTimer(x: TimerHolderIn): void {
  if (x.timer.current != null) {
    clearTimeout(x.timer.current)
  }
}

/**
 * 造防抖到点后真正开搜的那一发。
 *
 * @param x 查询词、中止信号与把手、两个 setter。
 * @returns 交给 setTimeout 的回调。
 */
function makeSearchFire(x: SearchFireIn): ClickFn {
  return function fireSearch(): void {
    void fetchCands(x)
  }
}

/**
 * 按关键词搜职业。
 *
 * @param x 查询词、中止信号与把手、两个 setter。
 * @returns 无。拿不到就出空结果(空态文案由调用方给);abort 不改在途标 ——
 *          上一次被中止的请求不该把新一次的「搜索中」提前熄掉。
 */
async function fetchCands(x: SearchFireIn): Promise<void> {
  try {
    const res = await fetch(URL_QUIZ_Q + encodeURIComponent(x.query), { signal: x.signal })
    const d: CandsJson = await res.json()
    x.setCands(candRowsOf(d))
  } catch (e) {
    if (isAbort(e) === false) {
      x.setCands([])
    }
  } finally {
    if (x.ctl.signal.aborted === false) {
      x.setSearching(false)
    }
  }
}

/**
 * 搜索报文里的候选行。
 *
 * @param d 报文。
 * @returns 候选;报文不成样子给空列。
 */
function candRowsOf(d: CandsJson): Cand[] {
  const rows = d.candidates
  if (rows == null) {
    return []
  }
  if (Array.isArray(rows) === false) {
    return []
  }
  return rows
}

/**
 * 造「补齐已选职业名字」的启动器。
 *
 * @param x 已选码、已有名字表、界面语言码与名字表 setter。
 * @returns 启动器。
 */
export function makeTitlesFill(x: TitlesFillIn): StartFn {
  return function startFill(): StopFn {
    const flag: DeadFlag = { dead: false }
    void fetchTitles({ fill: x, flag })
    return function stopFill(): void {
      flag.dead = true
    }
  }
}

/**
 * 逐码把缺的名字拉回来。
 *
 * @param x 启动器的入参与存活标记。
 * @returns 无。
 */
async function fetchTitles(x: TitlesFetchIn): Promise<void> {
  const miss: string[] = []
  for (const n of x.fill.nocs) {
    const had = x.fill.titles[n]
    if (had == null || had === TEXT_NONE) {
      miss.push(n)
    }
  }
  if (miss.length === LEN_ZERO) {
    return
  }
  const jobs: Promise<TitleHit>[] = []
  for (const n of miss) {
    jobs.push(fetchOneTitle({ noc: n, lang: x.fill.lang }))
  }
  const rows = await Promise.all(jobs)
  if (x.flag.dead) {
    return
  }
  const patch: TitleMap = {}
  for (const hit of rows) {
    patch[hit.noc] = hit.name
  }
  x.fill.setTitles(makeTitlesMerge({ patch }))
}

/**
 * 查一个 NOC 码的显示名。
 *
 * @param x NOC 码与界面语言码。
 * @returns 码与名字;查不到就拿码当名字(空胶囊比裸码更糟 —— 至少码还认得出是同一行)。
 */
async function fetchOneTitle(x: OneTitleIn): Promise<TitleHit> {
  try {
    const res = await fetch(URL_QUIZ_NOC + encodeURIComponent(x.noc))
    const d: FactsJson = await res.json()
    let row: Cand | null = null
    if (d.facts != null) {
      row = d.facts
    }
    const name = pickName({ row, lang: x.lang })
    if (name === TEXT_NONE) {
      return { noc: x.noc, name: x.noc }
    }
    return { noc: x.noc, name }
  } catch {
    return { noc: x.noc, name: x.noc }
  }
}

/**
 * 这个异常是不是「请求被中止」。
 *
 * @param e catch 收到的东西。
 * @returns 是中止 = true。
 */
function isAbort(e: unknown): boolean {
  return e instanceof Error && e.name === ABORT_NAME
}

/**
 * 造逐省药丸的点击手柄工厂(选了具体省就不再是「还不确定」)。
 *
 * @param x 已选省码、两个 setter 与选择变化的回传。
 * @returns 逐省的手柄工厂。
 */
export function makeProvPickOf(x: ProvPickIn): ProvPickOfFn {
  return function provPickOf(code: string): ClickFn {
    return function pickProv(): void {
      const next: string[] = []
      let had = false
      for (const c of x.selected) {
        if (c === code) {
          had = true
        } else {
          next.push(c)
        }
      }
      if (had === false) {
        next.push(code)
      }
      x.setAnyProv(false)
      x.setSelected(next)
      if (x.onChange != null) {
        x.onChange(next)
      }
    }
  }
}

/**
 * 造「还不确定」药丸的点击手柄。「还不确定」是**一等答案**,不是跳过
 * (2026-08-12 Frank:「很多人不知道去哪个省,比如国内的厨师」)。选它 = 不按省过滤,
 * 13 条通道全判一遍再按障碍难度排 ——「该去哪个省」本来就该由我们回答,
 * 不该当成必答题拦在门口。
 *
 * @param x 两个 setter 与选择变化的回传。
 * @returns 点击手柄。
 */
export function makeProvAny(x: ProvAnyIn): ClickFn {
  return function pickAny(): void {
    x.setAnyProv(true)
    x.setSelected([])
    if (x.onChange != null) {
      x.onChange([])
    }
  }
}

/**
 * 造目标省页「下一题」与旁路收卷共用的交卷手柄(**当前选择随参数交出去**,
 * 由调用方落档后收卷)。
 *
 * @param x 已选省码、「还不确定」态与交出口。
 * @returns 点击手柄。
 */
export function makeProvDone(x: ProvDoneIn): ClickFn {
  return function doneProv(): void {
    x.onDone(x.selected, x.anyProv)
  }
}

/**
 * 目标省页的「下一题」能不能点。
 *
 * @param x 已选省码与「还不确定」态。
 * @returns 一个省都没选、也没选「还不确定」= true(置灰)。
 */
export function provNextOffOf(x: ProvStateIn): boolean {
  return x.selected.length === LEN_ZERO && x.anyProv === false
}
