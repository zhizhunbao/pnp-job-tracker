/**
 * quiz 域的函数:三问的答案层(读答案、注册后落档、职业名砍尾)、答题壳的取词与类名预算、
 * 选职业控件的取数在途工作者与手柄工厂、目标省控件的手柄工厂。
 * 零 JSX 零 hook —— 排版归各件的 tsx,状态归 hooks.ts,死值归 constants.ts。
 * 2026-08-26 Frank 立「tsx 组件体内不许声明内嵌函数」时先迁进来一个 makeSearch;
 * 2026-08-28 换装批把 EntryQuiz.tsx 的答案层与三个 tsx 的组件体一起收进来。
 * 2026-10-04 A2(访客第 3 题复用选职业控件):热门那一屏可按专业取(topUrlOf)、取的路上不拿内置清单顶(occBaseOf 的 hold),
 * 大号档借 profile 桶已选标签件要的三样(makeNocsSet / occNamesOf / occShownOf)。
 * 2026-10-05(Frank「这个职位 怎么还有 小字 英文呢」):一颗胶囊 = 一个职业 = 中文短名相同的一组码(数据层 etl/noc 的
 * OCC_MERGE 把 21230 / 21231 / 21232 写成同一个「软件开发」;职位板 components/jobs 的 occGroupsOf、查询层 lib/jobs 的
 * nocGroup 展开读的是同一列)。归组只读数据层算好的短名、不另立判定;职位板那份收的是职位板整包维度表、且 jobs 桶反过来
 * 借本桶(互借即成环),所以本桶照同一列自读(occKeysOf / occItemsOf / pickedOf)。点选整组选上、整组撤掉,汇总与计数同组算一个。
 * 2026-10-05 访客第 3 题改成与第 2 题同一副左右两栏(Frank「也改成左右 两部分吗?」「改啊」):多左栏几样(occRailItemsOf /
 * makeRailPick / railKeyOf / railBusyOf)与已选一行 × 的读屏名(tagDelNameOf);上面 A2 那句「借 profile 桶已选标签件要的三样」
 * 连同只供它们用的 occHeadsOf / expandHeadsOf 撤 —— 已选一行改由本桶 OccTags 用 tag 桶 TagRow + Tag 摆,全部已选都摆
 * (不再按「这一屏摆着」挑),× 走与胶囊同一只 pickOf(整组撤掉,原 makeNocsSet 把代表码展开回整组那一步随之不要)。
 *
 * @author Frank
 * @time 2026-08-26 15:28:17
 */
import { OB_SEEN_KEY, POPULAR_NOCS } from '@/components/profile'
import { chipClsOf } from '@/components/chip'
import { cssOf } from '@/components/css'
import { pickName } from '@/lib/noc'
import { BROAD_SLUGS } from '@/lib/stats'
import { ANSWERS_KEY, answeredBasics, readAnswers, toEngineAnswers } from '@/lib/quiz'
import {
  ABORT_NAME, ALPHA_A, CLS_BAR, CLS_HINT, CLS_ITEM, CLS_ITEM_ON, CLS_LIST, CLS_OCC_CAT_TAB,
  CLS_OCC_CAT_TAB_ON, CLS_OCC_PILL, CLS_OCC_PILL_ON, CLS_OCC_PILL_SKELETON, CLS_SEP, CRED_INCLUDE,
  DUP_MIN, HDR_CONTENT_TYPE, KEY_BROAD_HEAD, LEN_ZERO, LOCALE_NUM, METHOD_PATCH, MIME_JSON,
  OCC_AND_RE, OCC_CAT_REC, OCC_COMMA_RE, OCC_TAIL_RE, OCC_WORD_KEY, PERCENT_MAX, PERCENT_SIGN, PROGRESS, PTS_ZERO,
  QUERY_MIN,
  SEARCH_DEBOUNCE_MS, SEEN_ONE, SEP_COMMA, SIGN_PLUS, SKEL_KINDS, SLOT_DONE, SLOT_TOTAL, TEXT_NONE,
  TOP_N, TOTAL_MIN, URL_ME, URL_QUIZ_BROAD, URL_QUIZ_COUNTS, URL_QUIZ_MAJOR, URL_QUIZ_MAJOR_N, URL_QUIZ_NOC,
  URL_QUIZ_Q, URL_QUIZ_TOP, URL_USERS_HEAD,
} from './constants'
import type {
  AllOnIn, AllPickIn, AlphaIn, ApplyPickIn, BarStyleIn, BootstrapIn, Cand, CandsJson, CatLabelIn, CatPickIn,
  CatPickOfFn, CatalogFetchIn, CatalogLoadIn, CatalogMap, CatalogPutIn, CatalogUpdateFn,
  CheckChangeFn, CheckToggleIn, ChipNameIn, ChoicePickIn, ClickFn, CountsFetchIn, CountsJson,
  CountsMergeIn, DeadFlag, DupCountIn, DupHintIn, DupMap, EngineValue, FactsJson, FirstListIn,
  FirstTextIn, ForeignMonthsIn, InitialTitlesIn, ItemOnIn, KeepBoolIn, KeepNumIn, KeyMap, KeysMergeIn, KeysUpdateFn,
  KnownTitlesIn, L, MeJson,
  MeUser, MouseStopFn, OccBaseIn, OccGroup, OccItem, OccItemsIn,
  OccKeyIn, OccKeysIn, OccLabelIn, OccListOfIn,
  OccNextIn, OccRailItem, OccRailItemsIn, OccSegIn, OnClsIn, OneTitleIn, PickedIn,
  OpenTextIn, PickItemIn, PickOfFn, PickOfIn, PopularRowsIn, ProfileJson, ProfilePatch, ProfilePatchIn,
  ProfileSaved, ProgressTextIn, ProvAnyIn, ProvDoneIn, ProvPickIn, ProvPickOfFn, ProvStateIn,
  PtsTextIn, PutProfileIn, QuizAnswers, QuizAnswersRead, QuizLang, RadioChangeFn, RailBusyIn, RailPickFn, SearchFireIn,
  SearchFn, SearchIn, SearchRunIn, SearchStopIn, SelectChangeFn, SkelClsIn, SkelFillIn, StartFn,
  StopFn, TagDelNameIn, TimerHolderIn, TitleHit, TitleMap, TitlePutIn, TitleUpdateFn, TitlesFetchIn,
  TitlesFillIn, TitlesMergeIn, Top, TopFetchIn, TopGivenIn, TopJson, TopMergeIn, TopSeedIn, TopSwapIn, TopUpdateFn,
  TopUrlIn,
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
  return chipClsOf({ active: x.on, hot: false, lg: false, extra: null })
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
 * 2026-10-04 A2:按专业取的清单还在路上(hold)时给空列 —— 内置清单与专业对不上,先摆再换就是一次重排,
 * 交给骨架占满格子;到了原位替换,取回来是空的再退回内置清单。
 *
 * @param x 取词函数、已有的热门榜与「按专业取的还在路上」。
 * @returns 这一屏的原料。
 */
export function occBaseOf(x: OccBaseIn): Top[] {
  if (x.hold) {
    return []
  }
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
 * 热门榜的初值:服务端送了就用它(一次成型);给了专业码就先空着(内置清单与专业对不上,先摆再换就是一次重排,
 * 交给骨架占满格子等按专业取的那份;2026-10-04 A2);其余先摆内置常用清单。
 * 2026-10-04 A2 自 useOccPicker 的初值函数体下沉(整机行数闸)。
 *
 * @param x 取词函数、服务端送下来的热门榜与专业码。
 * @returns 热门榜初值。
 */
export function topSeedOf(x: TopSeedIn): Top[] {
  const given = x.initialTop
  if (given != null && given.length > LEN_ZERO) {
    return given
  }
  if (x.majorCode !== TEXT_NONE) {
    return []
  }
  return popularRowsOf({ t: x.t })
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
 * 2026-10-05:行按组键合成职业(同组几个码一颗胶囊),合成后按组里加总的在招数再排一次(见 openItemsOf);
 * 热门那一屏先合成再取前 24 个职业 —— 先取 24 行再合成,组员被切在线外就整组选不全。
 *
 * @param x 当前分类、该分类的清单、兜底原料与组键表。
 * @returns 这一屏的职业。
 */
export function occListOf(x: OccListOfIn): OccItem<Top>[] {
  if (x.cat !== TEXT_NONE) {
    if (x.catRows == null) {
      return []
    }
    return openItemsOf({ rows: x.catRows, keys: x.keys })
  }
  const sorted = x.base.slice()
  sorted.sort(byOpenDesc)
  return openItemsOf({ rows: sorted, keys: x.keys }).slice(0, TOP_N)
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
 * 一份清单合成职业,再按组里加总的在招数降序排(2026-10-05):合成的那一个挂的是几个码之和,不重排它就顶着更大的数
 * 排在中间 —— 胶囊上写着数,顺序不跟着它走,读者会以为这个序另有含义(同上 2026-08-12)。排序稳定:没合成的职业照原序。
 *
 * @param x 已按在招量排好的行与组键表。
 * @returns 职业(在招数从多到少)。
 */
function openItemsOf(x: OccItemsIn<Top>): OccItem<Top>[] {
  const items = occItemsOf(x)
  items.sort(byItemOpenDesc)
  return items
}

/**
 * 职业在招量(组里加总)降序的比较器。
 *
 * @param a 一个职业。
 * @param b 另一个职业。
 * @returns 排序权。
 */
// eslint-disable-next-line local/one-parameter -- 比较器的两参一返由 Array.prototype.sort 定死(宪法钦定的豁免形态)
function byItemOpenDesc(a: OccItem<Top>, b: OccItem<Top>): number {
  return itemOpenOf(b) - itemOpenOf(a)
}

/**
 * 一份清单按组键合成职业(2026-10-05):组键相同的行并成一个,排在前面的那行当代表(清单已按在招量排过 = 在招最多的码,
 * 与职位板 occGroupsOf 取代表码同一口径);组键各不相同的行原样一行一个,顺序不动。
 *
 * @param x 一份清单的行与组键表。
 * @returns 职业。
 */
export function occItemsOf<T extends Cand>(x: OccItemsIn<T>): OccItem<T>[] {
  const out: OccItem<T>[] = []
  const byKey = new Map<string, OccItem<T>>()
  for (const row of x.rows) {
    let key = rowKeyOf(row)
    if (key === TEXT_NONE) {
      key = occKeyOf({ noc: row.noc, keys: x.keys })
    }
    const had = byKey.get(key)
    if (had != null) {
      had.rows.push(row)
      continue
    }
    const item: OccItem<T> = { key, head: row, rows: [row] }
    byKey.set(key, item)
    out.push(item)
  }
  return out
}

/**
 * 一行职业自己带的组键 = 中文短名。哪几个码算一个职业由数据层定:etl/noc 的三张裁决表把有意合成的码写成同一个短名
 * (OCC_MERGE,撞车报告对这些组不报、其余全表互不重名);本函数只读那一列,不另立判定(2026-10-05)。
 *
 * @param row 一行职业。
 * @returns 中文短名;库里没压出短名给空串(这一行不参与归组,与职位板、查询层同口径)。
 */
function rowKeyOf(row: Cand): string {
  if (row.titleZhShort == null) {
    return TEXT_NONE
  }
  return row.titleZhShort
}

/**
 * 一个码此刻的组键(2026-10-05)。
 *
 * @param x NOC 码与组键表。
 * @returns 组键;表里没有或记的是空串(没有短名)就是码自己 —— 自成一组。
 */
function occKeyOf(x: OccKeyIn): string {
  const key = x.keys[x.noc]
  if (key == null || key === TEXT_NONE) {
    return x.noc
  }
  return key
}

/**
 * 控件此刻知道的全部组键(2026-10-05):点选 / 逐码查询记下的那一格状态,再叠上热门榜、已查过的分类清单、
 * 搜索命中里带短名的行(行比记下的新,以行为准)。
 *
 * @param x 记下的组键与三份清单。
 * @returns 码 → 组键。
 */
export function occKeysOf(x: OccKeysIn): KeyMap {
  const out: KeyMap = Object.assign({}, x.keys)
  const lists: Cand[][] = [x.top, x.cands]
  for (const rows of Object.values(x.catalog)) {
    lists.push(rows)
  }
  for (const rows of lists) {
    for (const r of rows) {
      const key = rowKeyOf(r)
      if (key !== TEXT_NONE) {
        out[r.noc] = key
      }
    }
  }
  return out
}

/**
 * 一个职业里的全部码(点它 = 这几个码一起选上 / 撤掉;2026-10-05)。
 *
 * @param x 一个职业。
 * @returns NOC 码(代表码在首)。
 */
export function itemNocsOf(x: OccItem<Cand>): string[] {
  const out: string[] = []
  for (const r of x.rows) {
    out.push(r.noc)
  }
  return out
}

/**
 * 一个职业的在招数 = 组里各码之和(一个岗只挂一个码,加总不重算;职位板按这个职业筛出来的就是这些岗;2026-10-05)。
 *
 * @param x 一个职业。
 * @returns 在招数。
 */
export function itemOpenOf(x: OccItem<Top>): number {
  let n = 0
  for (const r of x.rows) {
    n += r.open
  }
  return n
}

/**
 * 一颗职业胶囊亮不亮:已选里有这个职业的码就亮(同组任一个码选着都算;2026-10-05)。
 *
 * @param x 胶囊的组键与已选职业。
 * @returns 亮 = true。
 */
export function itemOnOf(x: ItemOnIn): boolean {
  for (const g of x.picked) {
    if (g.key === x.key) {
      return true
    }
  }
  return false
}

/**
 * 已选码按组键收拢成职业(按选中先后;2026-10-05):底部汇总、大号档标签、「已选 N 个」都按它数,同组几个码算一个。
 *
 * @param x 已选码与组键表。
 * @returns 已选职业。
 */
export function pickedOf(x: PickedIn): OccGroup[] {
  const out: OccGroup[] = []
  const byKey = new Map<string, OccGroup>()
  for (const n of x.nocs) {
    const key = occKeyOf({ noc: n, keys: x.keys })
    const had = byKey.get(key)
    if (had != null) {
      had.nocs.push(n)
      continue
    }
    const g: OccGroup = { key, head: n, nocs: [n] }
    byKey.set(key, g)
    out.push(g)
  }
  return out
}

/**
 * 显示名 → 出现次数。库里会出现同名不同码(中文都叫「厨师」= 63200 Cooks 与
 * 62200 Chefs)—— 重名时挂英文官方名区分,不重名的什么都不挂(甩个 5 位码只添噪音,
 * 2026-07-27 拍板)。
 * 2026-10-05:按职业数(同组几个码已合成一颗,只算一次)—— 有意合成的那一组不再挂小注;没人拍过板的同名照旧挂。
 *
 * @param x 这一屏的职业与界面语言码。
 * @returns 计数表。
 */
export function dupCountOf(x: DupCountIn): DupMap {
  const out: DupMap = new Map()
  for (const item of x.list) {
    const l = occLabelOf({ row: item.head, lang: x.lang })
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
 * 大号档左栏的各项:第一项「推荐」(热门那一屏 —— 给了专业码是按专业取的那份,没给是全站热门),其后是全站大类,
 * 名字与常规档的分类页签同一把(catLabelOf)。2026-10-05 立(Frank「也改成左右 两部分吗?」「改啊」:访客第 3 题改成
 * 与第 2 题同一副左右两栏;常规档的「热门」页签照旧叫 occ.cat.hot,大号档那一屏装的是给这几个专业挑的,另叫「推荐」)。
 *
 * @param x 取词函数与全部大类。
 * @returns 左栏各项(推荐在首)。
 */
export function occRailItemsOf(x: OccRailItemsIn): OccRailItem[] {
  const out: OccRailItem[] = [{ key: OCC_CAT_REC, label: x.t('occ.cat.rec') }]
  for (const slug of x.cats) {
    out.push({ key: slug, label: catLabelOf({ t: x.t, slug }) })
  }
  return out
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
 * 大号档已选一行里一颗标签 × 的读屏名(「移除 {名字}」)里的那个名字:名字到了 = 标签上看得见的那个(chipNameOf);
 * 还没拉回来(标签上摆着占位条)就先报码 —— 只在这一拍,名字一到就换。2026-10-05 立(「也改成左右 两部分吗?」「改啊」:
 * 已选一行改由本桶自己摆)。
 * 2026-10-05 同日收口:还没拉回来时不再报码(读屏念「Remove 21232」= 代码当主文案,代码不裸奔),报泛称「职业」(OCC_WORD_KEY),
 * 名字一到照旧换成名字;入参多收取词函数(TagDelNameIn)。上面「就先报码」作废。
 *
 * @param x 取词函数、代表码与名字表。
 * @returns 名字;还没拉到给泛称。
 */
export function tagDelNameOf(x: TagDelNameIn): string {
  const name = chipNameOf({ noc: x.noc, titles: x.titles })
  if (name === TEXT_NONE) {
    return x.t(OCC_WORD_KEY)
  }
  return name
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
 * 2026-10-05:被点的是一个职业(一组码)—— 已选里有这个职业的码(同组任一个)就整组撤掉,没有就整组选上;
 * 名字与组键整组记下(搜索结果清掉以后,汇总与标签照样认得出这几个码是一个职业)。键就是码自己的(库里没压出短名)不记:
 * 记了它就再也不回查(同 chipPickNameOf 不许把空串写进名字表)。
 *
 * @param x 手柄工厂的入参与被点的那个职业。
 * @returns 无。
 */
function applyPick(x: ApplyPickIn): void {
  x.p.setTitles(makeTitlePut({ nocs: x.i.nocs, name: x.i.name }))
  const keys: KeyMap = {}
  for (const n of x.i.nocs) {
    if (n !== x.i.key) {
      keys[n] = x.i.key
    }
  }
  x.p.setKeys(makeKeysMerge({ patch: keys }))
  const next: string[] = []
  let had = false
  for (const n of x.p.nocs) {
    if (x.i.nocs.includes(n) || occKeyOf({ noc: n, keys: x.p.keys }) === x.i.key) {
      had = true
    } else {
      next.push(n)
    }
  }
  if (had === false) {
    for (const n of x.i.nocs) {
      next.push(n)
    }
  }
  x.p.setNocs(next)
  if (x.p.onChange != null) {
    x.p.onChange(next)
  }
}

/**
 * 这一屏的职业是不是全选着(每一个职业都在已选里;空清单不算全选)。2026-10-05 Frank「有可能这个大类下 我想全选」立。
 *
 * @param x 这一屏的职业与已选职业。
 * @returns 全选着 = true。
 */
export function isAllOn(x: AllOnIn): boolean {
  if (x.items.length === LEN_ZERO) {
    return false
  }
  for (const item of x.items) {
    if (itemOnOf({ key: item.key, picked: x.picked }) === false) {
      return false
    }
  }
  return true
}

/**
 * 造「全选」的点击手柄(大号档大类那一屏首行;2026-10-05 立):没全选着 = 没选的职业整组选上(名字与组键照 applyPick 记下);
 * 全选着 = 这一屏的职业整组全部撤掉。别的屏已选的职业一个不动。
 *
 * @param x 点选手柄的共用入参、这一屏的职业与界面语言码。
 * @returns 点击手柄。
 */
export function makeAllPick(x: AllPickIn): ClickFn {
  return function pickAll(): void {
    applyAll(x)
  }
}

/**
 * 「全选」的真身(同 applyPick:onChange 在 updater 外面调)。
 *
 * @param x 点选手柄的共用入参、这一屏的职业与界面语言码。
 * @returns 无。
 */
function applyAll(x: AllPickIn): void {
  const picked = pickedOf({ nocs: x.p.nocs, keys: x.p.keys })
  const allOn = isAllOn({ items: x.items, picked })
  const keysHere: string[] = []
  const keys: KeyMap = {}
  for (const item of x.items) {
    keysHere.push(item.key)
    if (allOn === false && itemOnOf({ key: item.key, picked }) === false) {
      x.p.setTitles(makeTitlePut({ nocs: itemNocsOf(item), name: occLabelOf({ row: item.head, lang: x.lang }) }))
    }
    for (const n of itemNocsOf(item)) {
      if (n !== item.key) {
        keys[n] = item.key
      }
    }
  }
  x.p.setKeys(makeKeysMerge({ patch: keys }))
  const next: string[] = []
  for (const n of x.p.nocs) {
    if (allOn === false || keysHere.includes(occKeyOf({ noc: n, keys: x.p.keys })) === false) {
      next.push(n)
    }
  }
  if (allOn === false) {
    for (const item of x.items) {
      if (itemOnOf({ key: item.key, picked }) === false) {
        for (const n of itemNocsOf(item)) {
          if (next.includes(n) === false) {
            next.push(n)
          }
        }
      }
    }
  }
  x.p.setNocs(next)
  if (x.p.onChange != null) {
    x.p.onChange(next)
  }
}

/**
 * 造一枚「把这个职业的名字记进表里」的 updater。
 * 2026-10-05:一个职业的整组码记同一个名字(只记代表码的话,逐码查询会为其余组员白跑一趟)。
 *
 * @param x NOC 码与名字。
 * @returns 交给 setTitles 的 updater。
 */
export function makeTitlePut(x: TitlePutIn): TitleUpdateFn {
  return function putTitle(m: TitleMap): TitleMap {
    const patch: TitleMap = {}
    for (const n of x.nocs) {
      patch[n] = x.name
    }
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
 * 造一枚「把这一批组键并进表里」的 updater(2026-10-05)。
 *
 * @param x 要并进去的组键。
 * @returns 交给 setKeys 的 updater。
 */
function makeKeysMerge(x: KeysMergeIn): KeysUpdateFn {
  return function mergeKeys(m: KeyMap): KeyMap {
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
 * 造大号档左栏的切换手柄(签名由 tabs 桶 RailTabs 的 onChange 定):点「推荐」回到热门那一屏(分类状态记空串,
 * 与常规档点「热门」页签同一个值),点大类记它的 slug —— 目录照旧由整机的 loadCatalog 按需取、取过的不再取。
 * 2026-10-05 立(「也改成左右 两部分吗?」「改啊」)。
 *
 * @param x 当前分类 setter。
 * @returns 挂到 RailTabs onChange 上的手柄。
 */
export function makeRailPick(x: CatPickIn): RailPickFn {
  return function pickRail(key: string): void {
    if (key === OCC_CAT_REC) {
      x.setCat(TEXT_NONE)
      return
    }
    x.setCat(key)
  }
}

/**
 * 当前分类落在左栏的哪一项(分类状态里热门那一屏记空串,左栏上它是「推荐」那一项;2026-10-05「改啊」)。
 *
 * @param cat 当前分类 slug;空串 = 热门那一屏。
 * @returns 左栏项的键。
 */
export function railKeyOf(cat: string): string {
  if (cat === TEXT_NONE) {
    return OCC_CAT_REC
  }
  return cat
}

/**
 * 大号档右边那块此刻该不该摆「加载中」:点了大类、它的目录还在路上;或停在「推荐」、按专业取的那份还在路上
 * (那一拍清单是空的,不摆内置清单顶 —— 见 occBaseOf 的 hold)。没给专业码时推荐先摆内置常用清单,不算在路上。
 * 2026-10-05 立(「也改成左右 两部分吗?」「改啊」;常规档同一拍摆的是整排骨架)。
 *
 * @param x 当前分类、目录在途与按专业取的在途。
 * @returns 该摆 = true。
 */
export function railBusyOf(x: RailBusyIn): boolean {
  if (x.catLoading) {
    return true
  }
  return x.cat === TEXT_NONE && x.hold
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
 * 2026-10-04 A2:给了专业码就只取 ② 且换成按专业取(topUrlOf)—— 首屏不摆内置清单,① 那份在招数没处可并。
 *
 * @param x 三个 setter、已选码、界面语言码与专业码。
 * @returns 启动器(调用它开跑,返回的收尾器交给 effect)。
 */
export function makeBootstrap(x: BootstrapIn): StartFn {
  return function startBootstrap(): StopFn {
    const flag: DeadFlag = { dead: false }
    const topCtl = new AbortController()
    const countsCtl = new AbortController()
    if (x.majorCode === TEXT_NONE) {
      void fetchCounts({ flag, signal: countsCtl.signal, setTop: x.setTop })
    }
    void fetchTop({
      flag,
      signal: topCtl.signal,
      setTop: x.setTop,
      setTopLoaded: x.setTopLoaded,
      setTitles: x.setTitles,
      nocs: x.nocs,
      lang: x.lang,
      url: topUrlOf({ majorCode: x.majorCode }),
      swap: x.majorCode !== TEXT_NONE,
    })
    return function stopBootstrap(): void {
      flag.dead = true
      topCtl.abort()
      countsCtl.abort()
    }
  }
}

/**
 * 热门那一屏从哪取:给了专业码 = 该专业对应大类下在招最多的 24 个职业(/api/quiz?major=),
 * 没给 = 全站热门榜(URL_QUIZ_TOP,与服务端预热同键)。2026-10-04 A2 立。
 *
 * @param x 专业码。
 * @returns 取榜地址。
 */
export function topUrlOf(x: TopUrlIn): string {
  if (x.majorCode === TEXT_NONE) {
    return URL_QUIZ_TOP
  }
  return URL_QUIZ_MAJOR + encodeURIComponent(x.majorCode) + URL_QUIZ_MAJOR_N
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
 * 取真实热门榜(top=24;2026-10-04 A2 起地址由调用方给,按专业取同走这一条)。24 与服务端启动预热、缓存键完全一致 —— 先前改成 200 会绕过预热,
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
    const res = await fetch(x.url, { signal: x.signal })
    const d: TopJson = await res.json()
    if (x.flag.dead) {
      return
    }
    const rows = topRowsOf(d)
    if (x.swap) {
      x.setTop(makeTopSwap({ rows }))
    } else {
      x.setTop(makeTopMerge({ rows }))
    }
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
 * 造一枚「取回来的榜整份换上」的 updater(按专业取的那一路;2026-10-05 访客向导开屏就挂选职业机器时立)。
 * 上面 makeTopMerge 保顺序是给「首屏内置清单 → 真实热门榜」用的;按专业取的那一路首屏不摆内置清单(A2),
 * 换了专业手上那份是别的专业(或全站热门)的榜,并进去会把这一份挤到后面,所以整份换。空榜也照换(不留别的专业的榜)。
 *
 * @param x 取回来的榜行。
 * @returns 交给 setTop 的 updater。
 */
function makeTopSwap(x: TopSwapIn): TopUpdateFn {
  return function swapTop(): Top[] {
    return x.rows
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
 * 2026-10-05 够不够字改由 isOccQuery 判(与整机交出的 searchOn 同一个判定:正文换成命中那一屏 ⇔ 发这次搜索)。
 *
 * @param x 搜索词、计时器句柄与两个 setter。
 * @returns 启动器。
 */
export function makeSearchRun(x: SearchRunIn): StartFn {
  return function startSearch(): StopFn {
    clearTimer({ timer: x.timer })
    const ctl = new AbortController()
    const query = x.q.trim()
    if (isOccQuery(query) === false) {
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
 * 这个搜索词够不够起搜(去掉首尾空白后至少 QUERY_MIN 个字)。2026-10-05 立:原先常规档 OccBody、大号档 OccRail 与本文件的
 * 搜索启动器各写一遍,收成一处 —— 整机据它交 searchOn(正文换不换成命中那一屏),启动器据它发不发请求。
 *
 * @param q 搜索框现值(没去空白的也行)。
 * @returns 够了 = 真。
 */
export function isOccQuery(q: string): boolean {
  return q.trim().length >= QUERY_MIN
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
 * 2026-10-05:连组键一起补(缺名字或缺组键的码都查一次;见 fetchTitles)。
 *
 * @param x 已选码、已有名字表与组键、界面语言码与两个 setter。
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
 * 2026-10-05:缺组键的码也查(名字从内置常用清单来的码 —— 21232 就是 —— 手里没有短名,不查就和同组的码合不成一个);
 * 名字只补原来缺的(内置清单那句不被覆盖,免得胶囊上的字换一下),组键查到几个记几个,查不到记空串(不再回查)。
 *
 * @param x 启动器的入参与存活标记。
 * @returns 无。
 */
async function fetchTitles(x: TitlesFetchIn): Promise<void> {
  const miss: string[] = []
  for (const n of x.fill.nocs) {
    if (isTitleMiss({ noc: n, titles: x.fill.titles }) || x.fill.keys[n] == null) {
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
  const keys: KeyMap = {}
  for (const hit of rows) {
    if (isTitleMiss({ noc: hit.noc, titles: x.fill.titles })) {
      patch[hit.noc] = hit.name
    }
    keys[hit.noc] = hit.key
  }
  x.fill.setTitles(makeTitlesMerge({ patch }))
  x.fill.setKeys(makeKeysMerge({ patch: keys }))
}

/**
 * 名字表里缺不缺这个码的名字(2026-10-05 自 fetchTitles 提出:挑要查的码与补名字两处同一把尺)。
 *
 * @param x NOC 码与名字表。
 * @returns 没有或是空串 = true。
 */
function isTitleMiss(x: ChipNameIn): boolean {
  const had = x.titles[x.noc]
  return had == null || had === TEXT_NONE
}

/**
 * 查一个 NOC 码的显示名。
 * 2026-10-05:顺带交回组键(事实卡名字面里的中文短名)。
 *
 * @param x NOC 码与界面语言码。
 * @returns 码与名字;查不到就拿码当名字(空胶囊比裸码更糟 —— 至少码还认得出是同一行)。组键查不到给空串(自成一组)。
 */
async function fetchOneTitle(x: OneTitleIn): Promise<TitleHit> {
  try {
    const res = await fetch(URL_QUIZ_NOC + encodeURIComponent(x.noc))
    const d: FactsJson = await res.json()
    let row: Cand | null = null
    let key = TEXT_NONE
    if (d.facts != null) {
      row = d.facts
      key = rowKeyOf(d.facts)
    }
    const name = pickName({ row, lang: x.lang })
    if (name === TEXT_NONE) {
      return { noc: x.noc, name: x.noc, key }
    }
    return { noc: x.noc, name, key }
  } catch {
    return { noc: x.noc, name: x.noc, key: TEXT_NONE }
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
