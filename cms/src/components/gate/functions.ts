/**
 * gate 域(访客门)的函数:步序与题面、进度条分段、四道题的上报口、专业题的取数与搜索、下一步 / 跳过 / 返回、
 * 注册后交接与回职位板、关闭;进站向导的关闭 / 注册完两个回调。浏览记录与草稿的存取不在这里,归 lib/guest。
 * (改版立时首句是「……注册后交接、关闭,与预选职业查名;……」;A2 起查名撤、专业题与回职位板加入,收口时首句照现状改写。)
 * 2026-10-04 访客四题改版自 profile 桶迁入(原 2026-10-03 付费闭环批 A1 立;进站向导那两个工厂原住 profile 的 hooks 顶层 ——
 * 当时 profile/functions.ts 已到 991 行逼近 1000 行闸,搬家后回到函数抽屉)。
 * 同日收口:「点了报值」的单选手柄删掉自家那份(makeOptTap),改借 profile 桶的 makeOptPick;只在本文件里用的
 * segClsOf / toNocName 不再导出;查名失败的日志改记在访客域 GUEST_LOG 名下(原借 PROFILE_LOG);按关注点归拢排序
 * (组件域不许 `//` 段横幅:步序 / 进度条 → 走步 → 上报口 → 关闭与交接 → 查名 → 进站向导)。
 * 同日 A2:专业题改成「热门具体专业 + 搜索全部 CIP 2021 专业」,接上取热门、防抖搜索、按码回显选中的那个与它们的行构造器
 * (排在上报口之后);职业题改用 quiz 桶选职业控件(它自己补名字),「查名」一段(makeLoadNocNames / toNocName)随之删;
 * 注册完(邮箱当场、Google 回跳补交)由头是进站或点开职位、人在职位板上时,按答案把地址栏换成筛选(gateBoardGo)。
 * 同日收口审查:换题把焦点挪到题面(focusGateQuestion);向导没注册成就卸掉时撤交接戳(dropGateHandoff);
 * 补交钩子那一跑收成 runGateSync(交成了才记引导弹过、才回职位板);回职位板在现有地址上改(gateBoardUrlOf 收查询串);
 * 专业搜索多一格在途标。
 * 2026-10-05 专业题的选择器整块搬去 components/majors(取热门、防抖搜索、按码回显、左栏大类与专业类树、按语言挑名与
 * 它们的行构造器,注释原样带过去;首句「专业题的取数与搜索」那半随之不在本文件);回职位板要专业大类时借那边的 fetchMajor。
 * 同日专业改多选:专业上报口改报码清单(makeMajorsPick),主钮按清单空不空判,回职位板取第一个专业的大类;
 * 第 3 题选职业控件的专业码改递逗号连的清单(occMajorOf)。
 *
 * @author Frank
 * @time 2026-10-04 02:10:00
 */
import { fetchMajor } from '@/components/majors'
import { quizToProfile } from '@/components/quiz'
import { isSenderName } from '@/lib/apply'
import { clearGateHandoff, isGateSignedIn, markGateHandoff, markGateSignedIn, syncGateDraft } from '@/lib/guest'
import { GUEST_LOG, log } from '@/lib/log'
import { readAnswers, saveBasics } from '@/lib/quiz'
import { track } from '@/lib/track'
import {
  BOARD_HEAD, BOARD_INTENTS, BOARD_PATH, BROAD_DROP_PARAMS, CITIES_BAD, CITY_HIT_MAX, CITY_HOT_N, CRED_INCLUDE,
  EDIT_ERR_ANSWERS, EDIT_ERR_NAME, GATE_EDIT_STEPS,
  GATE_FRAME_SEL, GATE_QUESTIONS, GATE_QUESTION_GOAL, GATE_STEPS, GATE_STEP_JOB, GATE_STEP_MAJOR, GATE_STEP_NAME,
  GATE_STEP_PROV, GATE_STEP_REG, HDR_CONTENT_TYPE, LANG_KO, LANG_ZH, MAJOR_SEP, METHOD_PATCH, MIME_JSON,
  NEXT_KEY, NOC_DROP_PARAMS, NOC_SEP, PROV_ABROAD, PROV_DROP_PARAMS, P_BROAD, P_NOC, P_PROV, SAVE_FAIL_KEY, SAVE_KEY,
  STATUS_OVERSEAS,
  TEXT_NONE, TRACK_GATE_STEP, URL_CITIES_HEAD, URL_PREFS,
} from './constants'
import type {
  BoardGoIn, BoardUrlIn, CitiesJson, CityLabelIn, CityOpt, CityOptsIn, CityPickIn, EditNextIn, EditPatch, EditSaveIn,
  EntryCloseIn, EntryDoneIn, GateBackIn, GateCloseIn, GateDoneIn, GateEditSeed, GateIntent, GateNextIn, GateNextOffIn,
  GateProvActiveIn, GateQuestionIn, GateStep, GateStepOfIn, GateSyncRunIn, GoalPickIn, LoadCitiesIn, MajorsPickIn,
  MaybeBoardMajor, NocsMergeFn, ParamsDropIn, ProvPickIn, QuestionFocusIn, SetNocsFn, TouchedNocsIn,
} from './types'

/**
 * 访客向导走到第几步 → 这一屏是什么(2026-10-03 付费闭环批 A1):四道题按 GATE_STEPS 取,走过最后一道是注册屏。
 *
 * @param x 走到第几步。
 * @returns 这一屏。
 */
export function gateStepOf(x: GateStepOfIn): GateStep {
  const s = x.steps[x.step]
  if (s == null) {
    return GATE_STEP_REG
  }
  return s
}

/**
 * 访客向导这一屏的题面键;对不上题面表时退回第一问,不让题面开天窗(同 profile 的 obQuestionKeyOf)。
 *
 * @param x 当前这一屏。
 * @returns 题面的文案键。
 */
export function gateQuestionKeyOf(x: GateQuestionIn): string {
  let key: string = GATE_QUESTION_GOAL
  for (const q of GATE_QUESTIONS) {
    if (q.step === x.step) {
      key = q.key
    }
  }
  return key
}

/**
 * 换了题就把焦点挪到题面上(2026-10-04 收口审查):点目标大卡、点下一步 / 跳过 / 返回时,被点的钮跟着这一屏卸掉,
 * 焦点原先掉回 body —— 读屏不知道换了题,键盘用户得从页首重新 Tab。开屏不挪(还是开屏那一步):进站即弹时页面刚载完,
 * 抢焦点会让背后的页面滚动、冒出一圈焦点框;挪的时候也不滚(preventScroll)。指针点进来的,浏览器不给题面画焦点框
 * (:focus-visible 不中),键盘走过来的照画。走到注册屏没有题面(找不到那一格)就不挪。
 * 同日收口:挪焦点前先把弹框卡片滚回顶 —— 上一题比卡片高、滚下去才点的下一步,新题原先开在半截(进度条与题面在上面看不见);
 * 只动卡片自己(GATE_FRAME_SEL),背后的页面不动。
 *
 * @param x 题面 id、现在的步数与上次挪焦点时的步数。
 * @returns 无。
 */
export function focusGateQuestion(x: QuestionFocusIn): void {
  if (x.last.current === x.step) {
    return
  }
  x.last.current = x.step
  const el = document.getElementById(x.id)
  if (el == null) {
    return
  }
  const card = el.closest(GATE_FRAME_SEL)
  if (card != null) {
    card.scrollTop = 0
  }
  el.focus({ preventScroll: true })
}

/**
 * 造访客向导的「下一步」手柄:打一个「离开这一步」的点、记「动过了」(从此每次改动都写草稿)、往后走一步;
 * 走过第四道题进注册屏时再打一个 reg 点,并落交接戳(Google 整页登录回跳后凭它补交草稿)。
 *
 * @param x 位置、当前这一屏与两个落格。
 * @returns 下一步手柄。
 */
export function makeGateNext(x: GateNextIn): () => void {
  return function gateNext(): void {
    track(TRACK_GATE_STEP, { kind: x.cur })
    x.setTouched(true)
    x.setStep(x.step + 1)
    if (x.step + 1 >= GATE_STEPS.length) {
      track(TRACK_GATE_STEP, { kind: GATE_STEP_REG })
      markGateHandoff()
    }
  }
}

/**
 * 造访客向导的「回上一题」手柄(顶行左边的返回钮;第 1 题上不出钮,这里再夹一次不走到负数)。
 * 回头不清答案、不打点 —— 答过的照旧亮着,改不改由他。
 *
 * @param x 位置与步数落格。
 * @returns 返回手柄。
 */
export function makeGateBack(x: GateBackIn): () => void {
  return function gateBack(): void {
    x.setStep(Math.max(0, x.step - 1))
  }
}

/**
 * 这一题的主钮该不该灰着(2026-10-04 Frank「跳过这步 去掉」:跳过撤了,没答就不许往下走):
 * 专业题没选专业、职业题一个没选、所在省题省与境外都没亮,灰;目标题没有主钮(大卡点了就走),不灰。
 * 预选的职业(刚看过的职位)、按时区预选的省算答了 —— 那一屏亮着他看得见,点下一步就是收下。
 * 2026-10-05 专业改多选:专业题一个都没选才灰(至少选 1 个才能往下走)。
 *
 * @param x 当前这一屏与三道题的现值。
 * @returns 灰 = true。
 */
export function gateNextOffOf(x: GateNextOffIn): boolean {
  if (x.cur === GATE_STEP_NAME) {
    return x.nameBad
  }
  if (x.cur === GATE_STEP_MAJOR) {
    return x.majors.length === 0
  }
  if (x.cur === GATE_STEP_JOB) {
    return x.nocs.length === 0
  }
  if (x.cur === GATE_STEP_PROV) {
    return x.provActive === TEXT_NONE
  }
  return false
}

/**
 * 造目标大卡的上报口:记「动过了」、记下这一档,随即进下一题(2026-10-04 改版:目标题只有两张大卡,
 * 点了就是答了,不再要「下一步」;原先报 number | null 是借区间单选行的形,大卡不会报 null,收窄成数)。
 *
 * @param x 目标档与「动过了」两个落格,外加往后走的手柄。
 * @returns 上报口。
 */
export function makeGoalPick(x: GoalPickIn): (v: number) => void {
  return function pickGoal(v: number): void {
    x.setTouched(true)
    x.setGoal(v)
    x.next()
  }
}

/**
 * 造专业胶囊的上报口。
 * 2026-10-05 专业改多选(原名 makeMajorPick,报一个码):收选择器报来的整份码清单,照旧记「动过了」。
 *
 * @param x 专业码清单与「动过了」两个落格。
 * @returns 上报口。
 */
export function makeMajorsPick(x: MajorsPickIn): (v: string[]) => void {
  return function pickMajors(v: string[]): void {
    x.setTouched(true)
    x.setMajors(v)
  }
}

/**
 * 第 3 题选职业控件要的专业码(2026-10-05 专业改多选):码清单逗号连成一串,递进 quiz 桶 OccPicker 现有的 majorCode 一格
 * (/api/quiz?major= 收逗号连的至多 3 个码,热门那一屏取它们本站大类并集下在招最多的职业);没选 = 空串(控件照旧取全站榜)。
 * majorCode 这个名字说的是一个码,实际已是清单 —— quiz 桶眼下有别的批次在改,等它空出来再把那一格改名(如 majorCodes)。
 *
 * @param codes 专业码清单。
 * @returns 逗号连的码串。
 */
export function occMajorOf(codes: string[]): string {
  return codes.join(MAJOR_SEP)
}

/**
 * 造所在省格子的上报口:点「加拿大境外」= 境外、省清空;点省 = 那个省、境外撤掉(单选,两样不并存)。
 *
 * @param x 省、境外与「动过了」三个落格。
 * @returns 上报口。
 */
export function makeProvPick(x: ProvPickIn): (v: string) => void {
  return function pickProv(v: string): void {
    x.setTouched(true)
    x.setCity(TEXT_NONE)
    if (v === PROV_ABROAD) {
      x.setProv(TEXT_NONE)
      x.setAbroad(true)
      return
    }
    x.setProv(v)
    x.setAbroad(false)
  }
}

/**
 * 造访客向导职业题的落格:职业胶囊与标签 × 照常拨清单,顺手记「动过了」。
 *
 * @param x 已选职业与「动过了」两个落格。
 * @returns 职业题用的落格。
 */
export function makeTouchedNocs(x: TouchedNocsIn): SetNocsFn {
  return function setNocsTouched(v: string[] | NocsMergeFn): void {
    x.setTouched(true)
    x.setNocs(v)
  }
}

/**
 * 所在省那一格亮哪个:境外亮「加拿大境外」,否则亮那个省(空串 = 都不亮)。
 *
 * @param x 所在省码与境外。
 * @returns 该亮的那一格的值。
 */
export function gateProvActiveOf(x: GateProvActiveIn): string {
  if (x.abroad) {
    return PROV_ABROAD
  }
  return x.prov
}

/**
 * 造访客向导的关闭手柄(×、Esc、点遮罩):先撤交接戳 —— 关掉了,之后页头登录、别处登录都不许替他交草稿
 * (草稿留着,下次弹向导照它预填)—— 再交还调用方。
 *
 * @param x 调用方的关法。
 * @returns 关闭手柄。
 */
export function makeGateClose(x: GateCloseIn): () => void {
  return function closeGate(): void {
    clearGateHandoff()
    x.onClose()
  }
}

/**
 * 访客向导卸掉时的收尾器(2026-10-04 收口审查;整机的 effect 原样交出去):没在注册屏注册 / 登录成就卸掉
 * (浏览器返回、换页、弹它的那一页自己卸掉)= 同 × 一样撤交接戳 —— 原先只有 × 撤,别的走法戳留着,10 分钟内页头登录
 * 就会替他交草稿、改地址栏,破了「没戳的登录不碰答案档」。这个页面里在向导里注册 / 登录成功过(lib/guest 的
 * isGateSignedIn,注册成功回调当场记)的不撤:交没交成归 syncGateDraft(没交成它会把戳放回去等补交)。
 * Google 整页登录是整页卸载,React 不跑收尾器,戳照旧带到回跳那一页 —— 不用另立「跳转中」的记号。
 *
 * @returns 无。
 */
export function dropGateHandoff(): void {
  if (isGateSignedIn()) {
    return
  }
  clearGateHandoff()
}

/**
 * 造注册屏成功后的回调:先记「首访引导弹过了」(四道题就是他的建档,职位板别再自动弹六步那套 ——
 * 同 quiz 桶 quizToProfile 落档即记的先例;记法借 profile 桶的 obMarkSeen,与首访向导走完时同一枚手柄)
 * 与「这个页面里刚登录过」(软刷回来之前别再起弹),再把内存里这一刻的草稿交给 lib/guest 并进答案档
 * (只填空格;不等它,网络慢也不卡用户),最后交还调用方。
 * 2026-10-04 A2:交还之后再按同一份内存草稿回职位板筛(gateBoardGo;只在职位板上、由头是进站或点开职位时换地址栏)——
 * syncGateDraft 一上来就清本地草稿,筛选只认内存这份。同日收口:由头只剩进站(点开职位撤,理由见 constants 的 BOARD_INTENTS)。
 * 同日收口审查:「这个页面里刚登录过」那一记同时让随后卸掉向导时不撤交接戳(见 dropGateHandoff);回职位板带上这一页
 * 现在的查询串(在现有地址上改,见 gateBoardUrlOf)。
 * 2026-10-09「我的档案」批:首访引导向导退役,开头那一记「首访引导弹过了」(obMarkSeen)随之撤 —— 没有六步那套可弹了。
 *
 * @param x 这一刻的草稿、交还口、这一页的路径与换地址栏。
 * @returns 注册成功回调。
 */
export function makeGateDone(x: GateDoneIn): () => void {
  return function gateDone(): void {
    markGateSignedIn()
    void syncGateDraft(x.draft)
    x.onDone()
    void gateBoardGo({ draft: x.draft, path: x.path, search: window.location.search, replace: x.replace })
  }
}

/**
 * 补交钩子那一跑(2026-10-04 收口审查,自 useGateSync 的 effect 体下沉):把读回的草稿交给 lib/guest 并进答案档,
 * **交成了**才记「首访引导弹过了」、才回职位板按答案筛 —— 原先不等结果就记、就换地址栏,票据过期(还是匿名)的人
 * 被记成弹过、地址栏被改。回职位板一页只试一次:第一跑就记上「试过」,第一跑没交成(草稿与戳放回去),
 * 后面换页补交成了也不换 —— 那时用户多半已自己动过筛选,再换就冲掉(同 useGateSync 头注「地址栏一页只换一次」);
 * 这一页刚在向导里登录过(邮箱注册当场已换过)的也不换。
 * 2026-10-09「我的档案」批:首访引导向导退役,「交成了才记首访引导弹过了」那一记(obMarkSeen)撤;交成了才回职位板照旧。
 *
 * @param x 草稿、路径、查询串、换地址栏与「这一页试过」记号。
 * @returns 无(结果在答案档、本地存储与地址栏上)。
 */
export async function runGateSync(x: GateSyncRunIn): Promise<void> {
  const first = x.boardWent.current === false
  x.boardWent.current = true
  const ok = await syncGateDraft(x.draft)
  if (ok === false) {
    return
  }
  if (first === false || isGateSignedIn()) {
    return
  }
  await gateBoardGo({ draft: x.draft, path: x.path, search: x.search, replace: x.replace })
}

/**
 * 注册完回职位板按答案筛(2026-10-04 A2,Frank「大类和职业我也都是现成的」):人在职位板(/)上、由头是进站,
 * 才把地址栏换成 /?prov=<省码>&noc=<职业码逗号连>;没选职业改带该专业的第一个本站大类(先按码取专业);境外不带省。
 * 职位板挂着 key = 筛选签名,地址栏一换整块重挂,筛选随之套上。点投递 / 收藏的由头不动地址栏(接着投 / 收藏)。
 * 什么都没答(拼不出一个参数)不换。
 * 立时由头是「进站或点开职位」;同日收口撤掉点开职位(板子重挂会卸掉刚亮出的职位弹框,见 constants 的 BOARD_INTENTS)。
 * 同日收口审查:地址在这一页现有的查询串上改(调用方传进来),关键词、排序这些用户自己带来的参数不丢。
 * 2026-10-05 专业改多选:没选职业时带第一个专业的第一个大类 —— 职位板的 broad 只收单值(等值筛,不收逗号连;
 * 见 constants 的 P_BROAD),几个专业的大类并集带不上去;按码取专业借 majors 桶的 fetchMajor。
 *
 * @param x 草稿、这一页的路径、现在的查询串与换地址栏。
 * @returns 无(结果在地址栏上)。
 */
export async function gateBoardGo(x: BoardGoIn): Promise<void> {
  if (x.path !== BOARD_PATH || isBoardIntent(x.draft.intent) === false) {
    return
  }
  let broad = TEXT_NONE
  const first = x.draft.majors[0]
  if (x.draft.nocs.length === 0 && first != null) {
    broad = majorBroadOf(await fetchMajor(first))
  }
  const url = gateBoardUrlOf({
    prov: x.draft.prov, abroad: x.draft.abroad, nocs: x.draft.nocs, broad, search: x.search,
  })
  if (url !== TEXT_NONE) {
    x.replace(url)
  }
}

/**
 * 这个由头注册完要不要回职位板按答案筛(进站即弹要;点开职位、点投递 / 收藏不要 —— 点开职位那一个 2026-10-04 A2 收口撤)。
 *
 * @param intent 这次向导的由头。
 * @returns 要 = true。
 */
function isBoardIntent(intent: GateIntent): boolean {
  return BOARD_INTENTS.includes(intent)
}

/**
 * 回职位板的地址(纯拼法):省码(境外不带)+ 职业码逗号连;没选职业时换成大类;一个参数都拼不出给空串。
 * 编码交给 URLSearchParams(与职位板自己写地址栏同一套,逗号编成 %2C,板子读回来解码一致)。
 * 2026-10-04 收口审查:从这一页现有的查询串起拼(调用方传 window.location.search,函数照旧纯)—— 原先从空串起拼,
 * 分享链接带来的关键词、市、排序注册完全丢。只改答案管得着的几格并撤掉会打架的:设了省撤市 / 区 / 国家,
 * 设了职业撤大类 / 中 / 小分类,设了大类撤职业 / 中 / 小分类;其余参数原样留着。答案一格都拼不出(没答 / 境外又没职业专业)
 * 照旧给空串不换(现有地址上本来就有的参数不算)。
 *
 * @param x 省、境外、职业码、大类与现在的查询串。
 * @returns 地址;空串 = 不用换。
 */
function gateBoardUrlOf(x: BoardUrlIn): string {
  const sp = new URLSearchParams(x.search)
  let set = false
  if (x.abroad === false && x.prov !== TEXT_NONE) {
    sp.set(P_PROV, x.prov)
    dropParams({ sp, keys: PROV_DROP_PARAMS })
    set = true
  }
  if (x.nocs.length > 0) {
    sp.set(P_NOC, x.nocs.join(NOC_SEP))
    dropParams({ sp, keys: NOC_DROP_PARAMS })
    set = true
  } else if (x.broad !== TEXT_NONE) {
    sp.set(P_BROAD, x.broad)
    dropParams({ sp, keys: BROAD_DROP_PARAMS })
    set = true
  }
  if (set === false) {
    return TEXT_NONE
  }
  return BOARD_HEAD + sp.toString()
}

/**
 * 从正在拼的查询参数里撤掉一组参数名(就地删;没有的跳过)。
 *
 * @param x 查询参数与要撤的参数名。
 * @returns 无。
 */
function dropParams(x: ParamsDropIn): void {
  for (const k of x.keys) {
    x.sp.delete(k)
  }
}

/**
 * 一个专业的第一个本站大类(回职位板按大类筛用);没取到专业、或它没有大类,给空串。
 * 2026-10-05 入参形改成本域自声明的 MaybeBoardMajor(只读 broads 一格;行的主人搬去 majors 桶)。
 *
 * @param row 按码取回的专业;null = 没取到。
 * @returns 大类;空串 = 没有。
 */
function majorBroadOf(row: MaybeBoardMajor): string {
  if (row == null) {
    return TEXT_NONE
  }
  const first = row.broads[0]
  if (first == null) {
    return TEXT_NONE
  }
  return first
}

/**
 * 造进站向导的关闭手柄(×、Esc、点遮罩):收起,页面照常看(这一页已记「弹过」,刷新不再弹)。
 *
 * @param x 「为哪一页弹的」落格。
 * @returns 关闭手柄。
 */
export function makeEntryClose(x: EntryCloseIn): () => void {
  return function closeEntryGate(): void {
    x.setOpenAt(null)
  }
}

/**
 * 造进站向导注册完的回调(草稿已由向导交出去):收起,再软刷让服务端组件与会话种子换成登录态。
 *
 * @param x 「为哪一页弹的」落格与软刷。
 * @returns 注册完回调。
 */
export function makeEntryDone(x: EntryDoneIn): () => void {
  return function doneEntryGate(): void {
    x.setOpenAt(null)
    x.refresh()
  }
}


/**
 * 城市区这一刻摆哪些城市:没搜摆本省在招最多的前 CITY_HOT_N 个;搜了按英文名与界面语译名找(不分大小写),至多 CITY_HIT_MAX 个。
 *
 * @param x 本省全部城市、搜索词与界面语。
 * @returns 要摆的城市。
 */
export function cityOptsOf(x: CityOptsIn): CityOpt[] {
  const q = x.q.trim().toLowerCase()
  const out: CityOpt[] = []
  for (const c of x.all) {
    const label = cityLabelOf({ c, lang: x.lang })
    if (q === TEXT_NONE && out.length >= CITY_HOT_N) {
      break
    }
    if (q !== TEXT_NONE && out.length >= CITY_HIT_MAX) {
      break
    }
    if (q === TEXT_NONE || c.name.toLowerCase().includes(q) || label.toLowerCase().includes(q)) {
      out.push({ name: c.name, label })
    }
  }
  return out
}

/**
 * 胶囊上的字:界面语有译名用译名,没有用英文名(胶囊按 10-08 例外保留短名,不出两行)。
 *
 * @param x 那一行城市与界面语。
 * @returns 胶囊上的字。
 */
function cityLabelOf(x: CityLabelIn): string {
  if (x.lang === LANG_ZH && x.c.zh !== TEXT_NONE) {
    return x.c.zh
  }
  if (x.lang === LANG_KO && x.c.ko !== TEXT_NONE) {
    return x.c.ko
  }
  return x.c.name
}

/**
 * 按省取城市(stats 域;在招多的在前)。取挂了留痕、按空清单落 —— 城市选填,不挡下一步。回来的不是清单(形状不对)同取挂了。
 *
 * @param x 省码、落格与存活标记。
 * @returns 无。
 */
export async function loadProvCities(x: LoadCitiesIn): Promise<void> {
  try {
    const r = await fetch(URL_CITIES_HEAD + encodeURIComponent(x.prov))
    if (r.ok === false) {
      throw new Error(String(r.status))
    }
    const body = await r.json() as CitiesJson
    if (Array.isArray(body.cities) === false) {
      throw new Error(CITIES_BAD)
    }
    if (x.flag.dead === false) {
      x.setAll({ prov: x.prov, rows: body.cities })
    }
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.cities + String(e) })
    if (x.flag.dead === false) {
      x.setAll({ prov: x.prov, rows: [] })
    }
  }
}

/**
 * 造「点一个城市」:点没选的 = 选它;再点选中的那个 = 取消(城市选填)。
 *
 * @param x 现选的城市与落格。
 * @returns 点击手柄。
 */
export function makeCityPick(x: CityPickIn): (v: string) => void {
  return function pickCity(v: string): void {
    if (v === x.city) {
      x.setCity(TEXT_NONE)
      return
    }
    x.setCity(v)
  }
}


/**
 * 英文姓名填了但不合规(与投递流同一条规矩,lib/apply isSenderName);没填不算不合规(选填,留着以后投递时再填)。
 *
 * @param name 输入框里的字。
 * @returns 不合规 true。
 */
export function nameBadOf(name: string): boolean {
  const n = name.trim()
  return n !== TEXT_NONE && isSenderName(n) === false
}

/**
 * 编辑模式钮区主钮的词条键:最后一题是「保存」,其余「下一步」。
 *
 * @param step 走到第几步。
 * @returns 词条键。
 */
export function editNextKeyOf(step: number): string {
  if (step + 1 >= GATE_EDIT_STEPS.length) {
    return SAVE_KEY
  }
  return NEXT_KEY
}

/**
 * 造编辑模式的「下一题」:没到最后一题往后走;最后一题 = 保存(不打交接戳、不进注册屏,与访客向导分开)。
 *
 * @param x 步数、落格与保存。
 * @returns 点击手柄。
 */
export function makeEditNext(x: EditNextIn): () => void {
  return function editNext(): void {
    if (x.step + 1 >= GATE_EDIT_STEPS.length) {
      x.save()
      return
    }
    x.setStep(x.step + 1)
  }
}

/**
 * 造编辑模式的「保存」:答案档那几格整格覆盖、立刻推(lib/quiz saveBasics);署名填了就存进投递资料;
 * 再把职业与省同步进旧档案(users.profile —— 职位板匹配度、职位框匹配卡等十几处还读它,首访引导退役后只剩这一处在写)。
 * 任一半没成:框不关、摆一行「没存上」,留痕。
 *
 * @param x 这一份答案、两个落格与保存成功的回调。
 * @returns 点击手柄。
 */
export function makeEditSave(x: EditSaveIn): () => void {
  return function editSave(): void {
    x.setSaving(true)
    x.setFail(TEXT_NONE)
    void runEditSave(x)
  }
}

/**
 * 保存的本体(makeEditSave 起它;拆出来是因为点击手柄不收异步)。
 *
 * @param x 同 makeEditSave。
 * @returns 无。
 */
async function runEditSave(x: EditSaveIn): Promise<void> {
  try {
    const ok = await saveBasics(editPatchOf(x.a))
    if (ok === false) {
      throw new Error(EDIT_ERR_ANSWERS)
    }
    if (x.a.name !== TEXT_NONE) {
      await saveEditName(x.a.name)
    }
    await quizToProfile({ status: readAnswers().status, nocs: x.a.nocs, provs: editProvsOf(x.a) })
    x.setSaving(false)
    x.onSaved()
  } catch (e) {
    log({ tag: GUEST_LOG.tag, text: GUEST_LOG.editSave + String(e) })
    x.setSaving(false)
    x.setFail(SAVE_FAIL_KEY)
  }
}

/**
 * 编辑模式写进答案档的那几格:答了境外写处境 overseas、省市清空;否则写省与城市(处境不动)。
 *
 * @param a 这一份答案。
 * @returns 要覆盖的格。
 */
function editPatchOf(a: GateEditSeed): EditPatch {
  if (a.abroad) {
    return {
      goalBand: a.goal, majors: a.majors, nocs: a.nocs, resProv: TEXT_NONE, resCity: TEXT_NONE, status: STATUS_OVERSEAS,
    }
  }
  return { goalBand: a.goal, majors: a.majors, nocs: a.nocs, resProv: a.prov, resCity: a.city }
}

/**
 * 同步进旧档案的目标省:答案档里答过目标省(PR 那套题)就用它;没答过用现居省;在境外给空列(旧档案原样留)。
 *
 * @param a 这一份答案。
 * @returns 目标省码清单。
 */
function editProvsOf(a: GateEditSeed): string[] {
  const provs = readAnswers().provs
  if (provs.length > 0) {
    return provs
  }
  if (a.prov === TEXT_NONE) {
    return []
  }
  return [a.prov]
}

/**
 * 存投递署名(queue 域 PATCH,与今日待投设置清单同一个口;不合规服务端回 422)。
 *
 * @param name 英文姓名。
 * @returns 无;没存上抛错。
 */
async function saveEditName(name: string): Promise<void> {
  const r = await fetch(URL_PREFS, {
    method: METHOD_PATCH,
    credentials: CRED_INCLUDE,
    headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
    body: JSON.stringify({ senderName: name }),
  })
  if (r.ok === false) {
    throw new Error(EDIT_ERR_NAME + String(r.status))
  }
}
