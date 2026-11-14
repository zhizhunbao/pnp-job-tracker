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
 * 2026-11-07 Frank「删了吧」:GateEdit 换成一页表单 GateForm 后删 —— 只为一题一屏而在的步序与题面(gateStepOf /
 * gateQuestionKeyOf / editStepsOf / startStepOf)、换题挪焦点(focusGateQuestion)、返回(gateBackOf / makeGateBack)、
 * 主钮灰与主钮字(gateNextOffOf / editNextKeyOf)、跳过(editBlankOf)、下一题(makeEditNext)、点了就翻页的目标与身份
 * 上报口(makeGoalPick / makeWhoPick)随之删;missingStepsOf 留着(「我的求职」补全档案提示条按它判空)。
 * 2026-11-12 Frank「这两个不能合并成一个吗?比如匹配规则 是 按专业,还是按什么其他的一个下拉选」:匹配依据、匹配模式并成一只「匹配规则」下拉。
 * 同日 Frank「这部分不能直接显示具体的年份和学历 证书吗?」:教育经历一段多四格明细,存进答案档 eduList,fitEdu 由它派生;简历里的教育经历能并进来。
 * 同日按「大于 1000 就拆子桶」(样张 apply/letter):本文件到 981 行贴线,教育经历几段这一族(起头 eduPicksOf / eduFormRowsOf、
 * 存档 eduListOf / eduStrsOf、改格加段删段 makeEduPick / makeEduAdd / makeEduRemove、选项字 makeEduLabel、并简历 eduMergedOf
 * 与它们的私件)原样搬去子桶 ./edu;本文件只剩「从简历填写」里调 eduMergedOf 那一处。
 * 同日 Frank「简历里能抽出来吧」:简历提取的教育经历多带院校所在地、公立私立、课程时长(回包照收,并法在子桶)。
 * 2026-11-13 Frank「别等一周啊 都做完」(档案自动生成,不用用户填):本文件又到 981 行贴线,「从简历填写」这一族
 * (makeResumeFill / runResumeFill / fillErrOf / fillMsgOf / toPrefill / applyPrefill)原样搬去子桶 ./fill,与新加的两条无界面的路
 * (传简历后自己读简历填并存、投出后补想做的工作与现居省)同住;本文件留装配点 fillFnsOf(把子桶 work / edu / seed 的函数与
 * 本文件的存取注给它)和两个页面事件的回调 onResumeUploaded / onApplySentFill;上面「本文件只剩『从简历填写』里调 eduMergedOf
 * 那一处」作废。同步旧档案那一步收成 syncOldProfile(保存与投出后补格共用)。
 *
 * @author Frank
 * @time 2026-10-04 02:10:00
 */
import { cssOf } from '@/components/css'
import { majorNameOf } from '@/components/majors'
import { quizToProfile, shortOcc } from '@/components/quiz'
import { isSenderName } from '@/lib/apply'
import { markGateSignedIn } from '@/lib/guest'
import { GUEST_LOG, log } from '@/lib/log'
import { eduKeysOf, readAnswers, saveBasics } from '@/lib/quiz'
import {
  CITIES_BAD, CITY_HIT_MAX, CITY_HOT_N, CRED_INCLUDE, EDIT_ERR_ANSWERS, EDIT_ERR_NAME,
  FORM_NAME_WAIT, GATE_ABROAD_KEY, GATE_PROV_OPTS, GATE_STEP_GOAL,
  GATE_STEP_JOB, GATE_STEP_MAJOR, GATE_STEP_NAME, GATE_STEP_WORK, GATE_STEP_WHO, GATE_STEP_EDU, GATE_STEP_PROV,
  HDR_CONTENT_TYPE,
  K_WHO_HEAD, LANG_KO, LANG_ZH, MAJOR_SEP, METHOD_PATCH, MIME_JSON, PROV_ABROAD, SAVE_FAIL_KEY,
  STATUS_OVERSEAS, TEXT_NONE, URL_CITIES_HEAD, URL_PREFS,
  FROM_MAJORS,
  FROM_NAME, FROM_SEP,
  FROM_WORK,
  K_RULE_HEAD, MATCH_EDU, MATCH_WORK, MODE_DEFAULT, MODE_STRICT, RULE_EDU, RULE_EDU_STRICT,
  EDU_F_KIND, EDU_F_LEN, EDU_F_PROV, EDU_SUM_SEP, EDU_YEAR_SEP, LINE_KEY_CITY, LINE_KEY_PROV,
  RULE_WORK_STRICT, CLS_SEP,
} from './constants'
import { eduFormRowsOf, eduListOf, eduMajorsOf, eduMergedOf, eduWithMajorsOf, makeEduLabel } from './edu'
import { runApplyAuto, runResumeAuto } from './fill'
import type { FillFns } from './fill'
import { pullSeed } from './seed'
import { workFilledOf, workFormRowsOf, workListOf, workNocsOf } from './work'
import css from './gate.module.css'
import type {
  CitiesJson, CityLabelIn, CityOpt, CityOptsIn, CityPickIn, EditPatch, EditSaveIn,
  EntryCloseIn, EntryDoneIn, GateAuthDoneIn, GateEditSeed, GateLabelOfIn, GatePickSetIn,
  ApplySentDetail, EduLinesIn, EduSumIn, FromKeptIn, FromResumeIn, OccLinesIn, OldSyncIn, PickedLine,
  WhereLinesIn,
  GateProvActiveIn, GateStep, LoadCitiesIn, ProvPickIn,
  RuleOfIn, RulePickIn,
  AtSetIn, CvFactsIn, EduMajorAtIn, FormCloseIn, SeedLoaded, GateCv, MajorNamesIn, SavedThenIn, SaveThenIn, TplClsIn,
} from './types'

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
 * 档案里还空着的那几题(按五题原序):目标没答、专业 / 想做的工作一个没选、所在地没答(省与境外都没有)、英文姓名没填。
 * 「我的」页据它判进「我的求职」要不要自动弹(一题不空就不弹),弹框据它排这一回的题。
 * 2026-11-07 弹五题与一题一屏的弹框(GateEdit)都已撤:只剩「我的求职」顶上「补全档案」提示条据它点名空着的几样(me/jobs fillTextOf)。
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
  if (s.workNocs.length === 0) {
    out.push(GATE_STEP_WORK)
  }
  if (s.prov === TEXT_NONE && s.abroad === false) {
    out.push(GATE_STEP_PROV)
  }
  if (s.name.trim() === TEXT_NONE) {
    out.push(GATE_STEP_NAME)
  }
  if (s.who === TEXT_NONE) {
    out.push(GATE_STEP_WHO)
  }
  if (s.edu.length === 0) {
    out.push(GATE_STEP_EDU)
  }
  return out
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
    await syncOldProfile({ nocs: x.a.nocs, prov: x.a.prov })
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
 * 2026-10-13:身份与教育经历两格一并整格覆盖。
 * 2026-11-12:教育经历明细 eduList 一并整格覆盖;fitEdu 不再直接取表单,改由 eduList 派生(不空的 key,按序)。
 * 同日:简历资料 cv(工作经历几段、电话、链接、技能、模板)一并整格覆盖;workNocs 由工作经历各段汇出。
 *
 * @param a 这一份答案。
 * @returns 要覆盖的格。
 */
function editPatchOf(a: GateEditSeed): EditPatch {
  if (a.abroad) {
    return {
      goalBand: a.goal,
      majors: a.majors,
      nocs: a.nocs,
      resProv: TEXT_NONE,
      resCity: TEXT_NONE,
      status: STATUS_OVERSEAS,
      fitWho: a.who,
      fitEdu: eduKeysOf(a.eduList),
      eduList: a.eduList,
      workNocs: a.workNocs,
      matchBy: a.matchBy,
      matchMode: a.matchMode,
      fromResume: a.fromResume,
      cv: a.cv,
    }
  }
  return {
    goalBand: a.goal,
    majors: a.majors,
    nocs: a.nocs,
    resProv: a.prov,
    resCity: a.city,
    fitWho: a.who,
    fitEdu: eduKeysOf(a.eduList),
    eduList: a.eduList,
    workNocs: a.workNocs,
    matchBy: a.matchBy,
    matchMode: a.matchMode,
    fromResume: a.fromResume,
    cv: a.cv,
  }
}

/**
 * 把职业与省同步进旧档案(users.profile;makeEditSave 头注说的那一步)。
 * 2026-11-13 Frank「别等一周啊 都做完」:自 runEditSave 拆出 —— 投出后补想做的工作与现居省(子桶 fill)存完也要同步,
 * 两处走这一个口。
 *
 * @param x 想做的工作与现居省。
 * @returns 无。
 */
async function syncOldProfile(x: OldSyncIn): Promise<void> {
  await quizToProfile({ status: readAnswers().status, nocs: x.nocs, provs: editProvsOf(x.prov) })
}

/**
 * 同步进旧档案的目标省:答案档里答过目标省(PR 那套题)就用它;没答过用现居省;在境外给空列(旧档案原样留)。
 * 2026-11-13:入参从整份答案收成现居省(只读这一格;投出后补格那条路手里没有整份答案)。
 *
 * @param prov 现居省码;空串 = 没答或在境外。
 * @returns 目标省码清单。
 */
function editProvsOf(prov: string): string[] {
  const provs = readAnswers().provs
  if (provs.length > 0) {
    return provs
  }
  if (prov === TEXT_NONE) {
    return []
  }
  return [prov]
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

/**
 * 一页表单:开 / 关叠在上面的选择器。
 *
 * @param x setter 与按下后叠开哪一个。
 * @returns 无参手柄。
 */
export function makePickSet(x: GatePickSetIn): () => void {
  return function set(): void {
    x.setPicking(x.v)
  }
}

/**
 * 一页表单「所在地」下拉的取值:十个省加「加拿大境外」。
 *
 * @returns 取值清单。
 */
export function formProvOptsOf(): string[] {
  const out: string[] = []
  for (const o of GATE_PROV_OPTS) {
    out.push(o.value)
  }
  out.push(PROV_ABROAD)
  return out
}

/**
 * 一页表单「所在地」下拉每一项的字。
 *
 * @param x 取词。
 * @returns 取值 → 字。
 */
export function makeProvLabel(x: GateLabelOfIn): (v: string) => string {
  return function provLabel(v: string): string {
    if (v === PROV_ABROAD) {
      return x.t(GATE_ABROAD_KEY)
    }
    for (const o of GATE_PROV_OPTS) {
      if (o.value === v) {
        return x.t(o.key)
      }
    }
    return v
  }
}

/**
 * 一页表单「身份」下拉每一项的字。
 *
 * @param x 取词。
 * @returns 取值 → 字。
 */
export function makeWhoLabel(x: GateLabelOfIn): (v: string) => string {
  return function whoLabel(v: string): string {
    return x.t(K_WHO_HEAD + v)
  }
}

/**
 * 匹配依据、匹配模式两格 → 「匹配规则」下拉的值(2026-11-12 两格并成一只下拉):按做过的工作(没选也算)是空值档,给空串。
 *
 * @param x 匹配依据与匹配模式。
 * @returns 下拉的值。
 */
export function ruleOf(x: RuleOfIn): string {
  const strict = x.matchMode === MODE_STRICT
  if (x.matchBy === MATCH_EDU && strict) {
    return RULE_EDU_STRICT
  }
  if (x.matchBy === MATCH_EDU) {
    return RULE_EDU
  }
  if (strict) {
    return RULE_WORK_STRICT
  }
  return TEXT_NONE
}

/**
 * 造「选匹配规则」:下拉的一项拆回匹配依据、匹配模式两格落下(空值档 = 按做过的工作、默认)。
 *
 * @param x 两个落格。
 * @returns 下拉的 onChange。
 */
export function makeRulePick(x: RulePickIn): (v: string) => void {
  return function pickRule(v: string): void {
    if (v === RULE_EDU || v === RULE_EDU_STRICT) {
      x.setMatchBy(MATCH_EDU)
    } else {
      x.setMatchBy(MATCH_WORK)
    }
    if (v === RULE_WORK_STRICT || v === RULE_EDU_STRICT) {
      x.setMatchMode(MODE_STRICT)
    } else {
      x.setMatchMode(MODE_DEFAULT)
    }
  }
}

/**
 * 「匹配规则」下拉每一项的字。
 *
 * @param x 取词。
 * @returns 取值 → 字。
 */
export function makeRuleLabel(x: GateLabelOfIn): (v: string) => string {
  return function ruleLabel(v: string): string {
    return x.t(K_RULE_HEAD + v)
  }
}

/**
 * 这个值是不是来自简历(档案页与修改面板同一把尺)。
 *
 * @param x 标记、字段与值。
 * @returns 来自简历 true。
 */
export function isFromResume(x: FromResumeIn): boolean {
  return x.marks.includes(x.field + FROM_SEP + x.value)
}

/**
 * 保存时留下的标记:值还在的才留(值被改掉或摘掉,胶囊随之消失;没改的再存一次仍在)。
 *
 * @param x 现有标记与现在的三格值。
 * @returns 留下的标记。
 */
export function fromKeptOf(x: FromKeptIn): string[] {
  const live: string[] = []
  for (const code of x.workNocs) {
    live.push(FROM_WORK + FROM_SEP + code)
  }
  for (const code of x.majors) {
    live.push(FROM_MAJORS + FROM_SEP + code)
  }
  live.push(FROM_NAME + FROM_SEP + x.name)
  const out: string[] = []
  for (const m of x.marks) {
    if (live.includes(m)) {
      out.push(m)
    }
  }
  return out
}

/**
 * 已选职业 → 名字行。
 *
 * @param x 已选的组、名字表与标记。
 * @returns 名字行。
 */
export function occLinesOf(x: OccLinesIn): PickedLine[] {
  const out: PickedLine[] = []
  for (const g of x.picked) {
    let name: string = FORM_NAME_WAIT
    const got = x.titles[g.head]
    if (got != null && got !== TEXT_NONE) {
      name = shortOcc(got)
    }
    let from = false
    for (const n of g.nocs) {
      if (isFromResume({ marks: x.marks, field: FROM_WORK, value: n })) {
        from = true
      }
    }
    out.push({ key: g.key, name, sub: TEXT_NONE, from })
  }
  return out
}

/**
 * 所在地 → 摘要行:省一行、城市一行(2026-11-12 Frank「这个也需要弹框吧」:所在地改成摘要框加「修改」)。
 * 城市名用这一刻摆着的那批里的界面语名字,不在里面(搜索换了一批)就用英文名。
 *
 * @param x 选中的省与城市、摆着的城市与取词。
 * @returns 摘要行;省没选 = 空列。
 */
export function whereLinesOf(x: WhereLinesIn): PickedLine[] {
  const out: PickedLine[] = []
  if (x.prov === TEXT_NONE) {
    return out
  }
  const provLabel = makeProvLabel({ t: x.t })
  out.push({ key: LINE_KEY_PROV, name: provLabel(x.prov), sub: TEXT_NONE, from: false })
  if (x.city === TEXT_NONE) {
    return out
  }
  let name = x.city
  for (const o of x.opts) {
    if (o.name === x.city) {
      name = o.label
    }
  }
  out.push({ key: LINE_KEY_CITY, name, sub: TEXT_NONE, from: false })
  return out
}

/**
 * 造多行输入框的 onChange:把框里的字交给落格。
 *
 * @param set 落格。
 * @returns 多行输入框的 onChange。
 */
export function makeAreaSet(set: (v: string) => void): (e: React.ChangeEvent<HTMLTextAreaElement>) => void {
  return function areaSet(e: React.ChangeEvent<HTMLTextAreaElement>): void {
    set(e.target.value)
  }
}

/**
 * 模板卡的类名:选着的多一个高亮类。
 *
 * @param x 选着没有。
 * @returns 类名。
 */
export function tplClsOf(x: TplClsIn): string {
  if (x.on) {
    return cssOf(css.tplCard) + CLS_SEP + cssOf(css.tplCardOn)
  }
  return cssOf(css.tplCard)
}

/**
 * 造「存成了」的回调(「生成简历」先存档案那一步用):记下这一回开面板存过了,再跑后面那一步;面板不关。
 *
 * @param x 落格与后面那一步。
 * @returns 回调。
 */
export function makeSavedThen(x: SavedThenIn): () => void {
  return function savedThen(): void {
    x.setSavedOnce(true)
    x.after()
  }
}

/**
 * 表单上的工作经历与四格 → 要存的简历资料(电话、链接、技能去首尾空白)。
 *
 * @param x 要存的工作经历与四格。
 * @returns 简历资料。
 */
export function cvFactsOf(x: CvFactsIn): GateCv {
  const c = x.cvc
  return { work: x.work, phone: c.phone.trim(), link: c.link.trim(), skills: c.skills.trim(), tpl: c.tpl }
}

/**
 * 造「先存档案、存成了再跑后面那一步」的工厂(「生成简历」用;存成了面板不关,只记下存过了)。
 *
 * @param x 要存的答案与三个落格。
 * @returns 后面那一步 → 点击手柄。
 */
export function makeSaveThen(x: SaveThenIn): (after: () => void) => () => void {
  return function saveThen(after: () => void): () => void {
    return makeEditSave({
      a: x.a,
      setSaving: x.setSaving,
      setFail: x.setFail,
      onSaved: makeSavedThen({ setSavedOnce: x.setSavedOnce, after }),
    })
  }
}

/**
 * 各段专业那一格的字(2026-11-12 专业并进教育经历):这一段的专业码在已取到名字的行里的界面语名字;
 * 没选 = 空串,选了但名字还没取到先占位。
 *
 * @param x 几段、已取到名字的专业行与界面语。
 * @returns 与几段一一对应的字。
 */
export function majorNamesOf(x: MajorNamesIn): string[] {
  const out: string[] = []
  for (const r of x.rows) {
    let name: string = TEXT_NONE
    if (r.major !== TEXT_NONE) {
      name = FORM_NAME_WAIT
    }
    for (const row of x.picked) {
      if (row.code === r.major) {
        name = majorNameOf({ row, lang: x.lang })
      }
    }
    out.push(name)
  }
  return out
}

/**
 * 正在选专业的那一段现在挂的专业码(专业选择框打开时把它标成已选);没在选、那一段没挂 = 空列。
 *
 * @param x 几段与正在给第几段选。
 * @returns 至多一个码。
 */
export function eduMajorAtOf(x: EduMajorAtIn): string[] {
  const row = x.rows[x.at]
  if (row == null || row.major === TEXT_NONE) {
    return []
  }
  return [row.major]
}

/**
 * 造「把『正在给第几段选』落成某个值」的手柄(关专业选择框用)。
 *
 * @param x 落格与要落的值。
 * @returns 点击手柄。
 */
export function makeAtSet(x: AtSetIn): () => void {
  return function atSet(): void {
    x.setAt(x.v)
  }
}

/**
 * 造「点第几段就落第几段」的手柄工厂(开专业选择框用)。
 *
 * @param setAt 「正在给第几段选」的落格。
 * @returns 第几段 → 点击手柄。
 */
export function makeAtSetOf(setAt: (v: number) => void): (i: number) => () => void {
  return function atSetOf(i: number): () => void {
    return makeAtSet({ setAt, v: i })
  }
}

/**
 * 没人听的码清单上报口(只查名字用的专业选择器不露面,点不到,它的上报口什么都不做)。
 *
 * @param _codes 码清单。
 * @returns 无。
 */
export function dropCodes(_codes: string[]): void {
  return
}

/**
 * 造起始答案的落格(装配点):子桶 seed 交回的那一份,教育经历明细与简历资料是服务端洗过、原样透传的,
 * 在这里断言成本域的起始答案。
 *
 * @param set 起始答案的落格。
 * @returns 子桶用的落格。
 */
export function makeSeedSet(set: (v: GateEditSeed | null) => void): (v: SeedLoaded) => void {
  return function seedSet(v: SeedLoaded): void {
    set(v as GateEditSeed | null)
  }
}

/**
 * 造「把一个开关落成关」的手柄(关升级框用)。
 *
 * @param set 开关的落格。
 * @returns 点击手柄。
 */
export function makeFlagOff(set: (v: boolean) => void): () => void {
  return function flagOff(): void {
    set(false)
  }
}

/**
 * 造关面板的手柄:这一回存过(生成简历时存的)就按「存好了」关,档案页随之重取;没存过照常关。
 *
 * @param x 存过没有与两个出口。
 * @returns 点击手柄。
 */
export function makeFormClose(x: FormCloseIn): () => void {
  return function closeForm(): void {
    if (x.savedOnce) {
      x.onSaved()
    } else {
      x.onClose()
    }
  }
}

/**
 * 教育经历 → 摘要行:一段一行,什么都没填的段不出(2026-11-12 Frank「这个也弹框修改」)。
 *
 * @param x 现在的几段与取词。
 * @returns 摘要行。
 */
export function eduLinesOf(x: EduLinesIn): PickedLine[] {
  const out: PickedLine[] = []
  for (const [i, row] of x.rows.entries()) {
    let major: string = TEXT_NONE
    const got = x.majors[i]
    if (got != null) {
      major = got
    }
    const name = eduSumOf({ row, major, t: x.t })
    if (name !== TEXT_NONE) {
      out.push({ key: String(i), name, sub: TEXT_NONE, from: false })
    }
  }
  return out
}

/**
 * 一段教育经历的摘要:学校、证书或学历名称、专业、年份里填了的连成一行;这四样都没填,用三只下拉选了的字
 * (所在地、公立私立、学制)。
 *
 * @param x 这一段与取词。
 * @returns 摘要;什么都没填 = 空串。
 */
function eduSumOf(x: EduSumIn): string {
  const r = x.row
  let years = r.from.trim()
  if (years !== TEXT_NONE && r.to.trim() !== TEXT_NONE) {
    years = years + EDU_YEAR_SEP + r.to.trim()
  }
  const named: string[] = []
  for (const v of [r.school.trim(), r.cred.trim(), x.major, years]) {
    if (v !== TEXT_NONE) {
      named.push(v)
    }
  }
  if (named.length > 0) {
    return named.join(EDU_SUM_SEP)
  }
  const picked: string[] = []
  if (r.prov !== TEXT_NONE) {
    picked.push(makeEduLabel({ t: x.t, f: EDU_F_PROV })(r.prov))
  }
  if (r.kind !== TEXT_NONE) {
    picked.push(makeEduLabel({ t: x.t, f: EDU_F_KIND })(r.kind))
  }
  if (r.len !== TEXT_NONE) {
    picked.push(makeEduLabel({ t: x.t, f: EDU_F_LEN })(r.len))
  }
  return picked.join(EDU_SUM_SEP)
}

/**
 * 子桶 fill 要的那一组函数(装配点;2026-11-13 Frank「别等一周啊 都做完」):「从简历填写」这一族搬去子桶 ./fill
 * (本文件贴 1000 行线),它不取父桶也不取兄弟子桶 —— 工作经历、教育经历的并法(子桶 work / edu)、取档案(子桶 seed)、
 * 存姓名与同步旧档案(本文件)由这里注进去;表单那条路与两条无界面的路用同一组。
 *
 * @returns 注给子桶 fill 的函数。
 */
export function fillFnsOf(): FillFns {
  return {
    workFilledOf,
    workFormRowsOf,
    workListOf,
    workNocsOf,
    eduMergedOf,
    eduMajorsOf,
    eduWithMajorsOf,
    eduFormRowsOf,
    eduListOf,
    fromKeptOf,
    nameBadOf,
    pullSeed: pullEditSeed,
    saveName: saveEditName,
    syncOld: syncOldProfile,
  }
}

/**
 * 取服务端那份档案(装配点):子桶 seed 交回的那一份,教育经历明细与简历资料是服务端洗过、原样透传的,
 * 在这里断言成本域的起始答案(同 makeSeedSet)。
 *
 * @returns 起始答案;没登录、接口回了错 = null。
 */
async function pullEditSeed(): Promise<GateEditSeed | null> {
  return await pullSeed() as GateEditSeed | null
}

/**
 * 听到「简历上传成了」(「我的」页基础简历卡、投递框第 1 步;2026-11-13 Frank「别等一周啊 都做完」:档案自动生成,不用用户填):
 * 后台自己读简历,把档案里空着的格子填上并存 —— 不出界面、不弹提示、不挡投递(本体在子桶 fill 的 runResumeAuto)。
 * 「生成简历」后「设为我的简历」发的是另一个事件,不走这里(那份简历本来就是档案生成的)。
 *
 * @returns 无。
 */
export function onResumeUploaded(): void {
  void runResumeAuto(fillFnsOf())
}

/**
 * 听到「投递发出去了」(2026-11-13 同上一批):想做的工作空着就填刚投那个职位的职业码,现居省空着且不是境外就填它的省
 * (本体在子桶 fill 的 runApplyAuto)。DOM 的监听签名只给 Event,自定义事件的 detail 由 apply 桶的 announceSent 一处发出,
 * 断言只住这一处。
 *
 * @param e 事件。
 * @returns 无。
 */
export function onApplySentFill(e: Event): void {
  const d = (e as CustomEvent<ApplySentDetail>).detail
  void runApplyAuto({ noc: d.noc, prov: d.province, provs: formProvOptsOf(), fns: fillFnsOf() })
}
