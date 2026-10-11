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
 * 2026-10-11 Frank「我应该先注册 再问问题吧。不然回答的问题 存哪里去了」→「需要改」:访客不再答题,门只剩注册 / 登录框。
 * 访客向导独有的走步(makeGateNext)、上报口的「动过了」(makeMajorsPick / makeTouchedNocs)、关闭与交接(makeGateClose /
 * dropGateHandoff / makeGateDone / runGateSync)、回职位板一整段(gateBoardGo 及其拼地址的四个私件)随之删;
 * 新增注册框登录完的回调 makeGateAuthDone。余下的题面、上报口、城市与编辑模式是档案编辑弹框(GateEdit)在用。
 *
 * @author Frank
 * @time 2026-10-04 02:10:00
 */
import { quizToProfile } from '@/components/quiz'
import { isSenderName } from '@/lib/apply'
import { markGateSignedIn } from '@/lib/guest'
import { GUEST_LOG, log } from '@/lib/log'
import { readAnswers, saveBasics } from '@/lib/quiz'
import {
  CITIES_BAD, CITY_HIT_MAX, CITY_HOT_N, CRED_INCLUDE, EDIT_ERR_ANSWERS, EDIT_ERR_NAME, GATE_EDIT_STEPS,
  GATE_FRAME_SEL, GATE_QUESTIONS, GATE_QUESTION_GOAL, GATE_STEP_GOAL, GATE_STEP_JOB, GATE_STEP_MAJOR, GATE_STEP_NAME,
  GATE_STEP_PROV, GATE_STEP_REG, HDR_CONTENT_TYPE, LANG_KO, LANG_ZH, MAJOR_SEP, METHOD_PATCH, MIME_JSON,
  NEXT_KEY, PROV_ABROAD, SAVE_FAIL_KEY, SAVE_KEY, STATUS_OVERSEAS, TEXT_NONE, URL_CITIES_HEAD, URL_PREFS,
} from './constants'
import type {
  CitiesJson, CityLabelIn, CityOpt, CityOptsIn, CityPickIn, EditBlankIn, EditNextIn, EditNextKeyIn, EditPatch,
  EditSaveIn, EditStepsIn, EntryCloseIn, EntryDoneIn, GateAuthDoneIn, GateBackIn, GateEditSeed, GateNextOffIn,
  GateProvActiveIn, GateQuestionIn, GateStep, GateStepOfIn, GoalPickIn, LoadCitiesIn, ProvPickIn, QuestionFocusIn,
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
 * 2026-10-11 访客不再答题(Frank「我应该先注册 再问问题吧」):「动过了」只为写访客草稿,随访客向导撤,这里只剩记档与往后走。
 *
 * @param x 目标档落格,外加往后走的手柄。
 * @returns 上报口。
 */
export function makeGoalPick(x: GoalPickIn): (v: number) => void {
  return function pickGoal(v: number): void {
    x.setGoal(v)
    x.next()
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
 * 2026-10-11 访客向导撤:「动过了」那一记随访客草稿撤。
 *
 * @param x 省、境外与城市三个落格。
 * @returns 上报口。
 */
export function makeProvPick(x: ProvPickIn): (v: string) => void {
  return function pickProv(v: string): void {
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
 * 造访客注册框登录完的回调(2026-10-11 访客不再答题,注册框替掉访客向导):先记「这个页面里刚登录过」
 * (lib/guest 的 markGateSignedIn —— 软刷回来之前分层态还是匿名,不记就会在那段空档里再弹一次),再交还调用方
 * (亮出这一岗 / 补收那一岗 / 收起并软刷)。
 *
 * @param x 交还口。
 * @returns 登录完回调。
 */
export function makeGateAuthDone(x: GateAuthDoneIn): () => void {
  return function gateAuthDone(): void {
    markGateSignedIn()
    x.onDone()
  }
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
 * 2026-10-11 访客不再答题:进站弹的是注册框,没有草稿可交;收起 + 软刷照旧。
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
 * 2026-10-11:「最后一题」按这一回一共几题算(只问没答那几题时不是五题);原只收步数、按 GATE_EDIT_STEPS 的长度算。
 *
 * @param x 走到第几步与一共几题。
 * @returns 词条键。
 */
export function editNextKeyOf(x: EditNextKeyIn): string {
  if (x.step + 1 >= x.total) {
    return SAVE_KEY
  }
  return NEXT_KEY
}

/**
 * 编辑模式这一回问哪几题(2026-10-11「进我的求职先弹五题」,Frank「一共没几个问题啊 都问不行吗」):
 * 五题全问(档案页「修改」),或只问起始答案里还空着的那几题、按原序(进「我的求职」自动弹)。
 *
 * @param x 起始答案与要不要只问空着的。
 * @returns 步序。
 */
export function editStepsOf(x: EditStepsIn): GateStep[] {
  if (x.missing) {
    return missingStepsOf(x.seed)
  }
  const out: GateStep[] = []
  for (const s of GATE_EDIT_STEPS) {
    out.push(s)
  }
  return out
}

/**
 * 档案里还空着的那几题(按五题原序):目标没答、专业 / 想做的工作一个没选、所在地没答(省与境外都没有)、英文姓名没填。
 * 「我的」页据它判进「我的求职」要不要自动弹(一题不空就不弹),弹框据它排这一回的题。
 *
 * @param s 档案的起始答案。
 * @returns 空着的题;都答了给空列。
 */
export function missingStepsOf(s: GateEditSeed): GateStep[] {
  const out: GateStep[] = []
  if (s.goal === 0) {
    out.push(GATE_STEP_GOAL)
  }
  if (s.majors.length === 0) {
    out.push(GATE_STEP_MAJOR)
  }
  if (s.nocs.length === 0) {
    out.push(GATE_STEP_JOB)
  }
  if (s.prov === TEXT_NONE && s.abroad === false) {
    out.push(GATE_STEP_PROV)
  }
  if (s.name.trim() === TEXT_NONE) {
    out.push(GATE_STEP_NAME)
  }
  return out
}

/**
 * 这一题眼下还空着没有(「跳过这步」只在空着时出;答了就点主钮)。
 *
 * @param x 当前这一屏与各题的值。
 * @returns 空着 true。
 */
export function editBlankOf(x: EditBlankIn): boolean {
  if (x.cur === GATE_STEP_GOAL) {
    return x.goal === 0
  }
  if (x.cur === GATE_STEP_NAME) {
    return x.name.trim() === TEXT_NONE
  }
  return gateNextOffOf({ cur: x.cur, majors: x.majors, nocs: x.nocs, provActive: x.provActive, nameBad: false })
}

/**
 * 造编辑模式的「下一题」:没到最后一题往后走;最后一题 = 保存(不打交接戳、不进注册屏,与访客向导分开)。
 * 2026-10-11:最后一题按这一回一共几题算(x.total);「跳过这步」也是它(跳过的那题本来就空着,往后走即可)。
 *
 * @param x 步数、落格与保存。
 * @returns 点击手柄。
 */
export function makeEditNext(x: EditNextIn): () => void {
  return function editNext(): void {
    if (x.step + 1 >= x.total) {
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
 * 2026-10-10 Frank「删吧」:queue 域撤,口子换成 apply 域的 PATCH /api/apply/name,回包不变。
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
