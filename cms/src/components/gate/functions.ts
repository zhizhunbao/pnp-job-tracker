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
 *
 * @author Frank
 * @time 2026-10-04 02:10:00
 */
import { quizToProfile } from '@/components/quiz'
import { isSenderName } from '@/lib/apply'
import { markGateSignedIn } from '@/lib/guest'
import { GUEST_LOG, log } from '@/lib/log'
import { eduRowsOf } from '@/lib/pathways'
import { readAnswers, saveBasics } from '@/lib/quiz'
import {
  CITIES_BAD, CITY_HIT_MAX, CITY_HOT_N, CRED_INCLUDE, EDIT_ERR_ANSWERS, EDIT_ERR_NAME, EDU_ABROAD, EDU_F_KIND,
  EDU_F_LEN, EDU_F_PROV, EDU_SEP, FORM_NONE_KEY, FORM_PICKED_KEY, GATE_ABROAD_KEY, GATE_PROV_OPTS, GATE_STEP_GOAL,
  GATE_STEP_JOB, GATE_STEP_MAJOR, GATE_STEP_NAME, GATE_STEP_WORK, GATE_STEP_WHO, GATE_STEP_EDU, GATE_STEP_PROV,
  HDR_CONTENT_TYPE, K_KIND_HEAD, K_LEN_HEAD,
  K_PROV_HEAD, K_WHO_HEAD, LANG_KO, LANG_ZH, MAJOR_SEP, METHOD_PATCH, MIME_JSON, PROV_ABROAD, SAVE_FAIL_KEY,
  STATUS_OVERSEAS, TEXT_NONE, URL_CITIES_HEAD, URL_PREFS,
} from './constants'
import type {
  CitiesJson, CityLabelIn, CityOpt, CityOptsIn, CityPickIn, EditPatch, EditSaveIn, EduCellSetIn, EduLabelIn, EduPick,
  EduPickIn, EduRowsIn, EntryCloseIn, EntryDoneIn, GateAuthDoneIn, GateEditSeed, GateLabelOfIn, GatePickSetIn,
  GatePickedIn, GateProvActiveIn, GateStep, LoadCitiesIn, ProvPickIn,
} from './types'

/**
 * 答案档里的教育经历串 → 界面上的几段(拆法走 lib/pathways 的 eduRowsOf,与服务端推荐同一把尺;一段都没有给一个空段,界面总有一行可选)。
 *
 * @param strs 「所在地.公立私立.时长」串。
 * @returns 几段。
 */
export function eduPicksOf(strs: string[]): EduPick[] {
  const out: EduPick[] = []
  for (const r of eduRowsOf(strs)) {
    out.push({ prov: r.prov, kind: r.kind, len: r.len })
  }
  if (out.length === 0) {
    out.push({ prov: TEXT_NONE, kind: TEXT_NONE, len: TEXT_NONE })
  }
  return out
}

/**
 * 界面上的几段 → 存档串(只收三格都选了的段;选了一半的不存)。
 *
 * @param rows 几段。
 * @returns 「所在地.公立私立.时长」串。
 */
export function eduStrsOf(rows: EduPick[]): string[] {
  const out: string[] = []
  for (const r of rows) {
    if (r.prov !== TEXT_NONE && r.kind !== TEXT_NONE && r.len !== TEXT_NONE) {
      out.push(r.prov + EDU_SEP + r.kind + EDU_SEP + r.len)
    }
  }
  return out
}

/**
 * 造「改某段某格」的手柄。
 *
 * @param x 第几段哪一格、现在的几段与落格。
 * @returns 下拉的 onChange。
 */
export function makeEduPick(x: EduPickIn): (v: string) => void {
  return function pickEdu(v: string): void {
    const out: EduPick[] = []
    for (const [i, r] of x.edu.entries()) {
      if (i !== x.cell.i) {
        out.push(r)
      } else {
        out.push(eduCellSetOf({ row: r, f: x.cell.f, v }))
      }
    }
    x.setEdu(out)
  }
}

/**
 * 一段改一格。
 *
 * @param x 这一段、哪一格与新值。
 * @returns 改过的一段。
 */
function eduCellSetOf(x: EduCellSetIn): EduPick {
  if (x.f === EDU_F_PROV) {
    return { prov: x.v, kind: x.row.kind, len: x.row.len }
  }
  if (x.f === EDU_F_KIND) {
    return { prov: x.row.prov, kind: x.v, len: x.row.len }
  }
  if (x.f === EDU_F_LEN) {
    return { prov: x.row.prov, kind: x.row.kind, len: x.v }
  }
  return x.row
}

/**
 * 造教育经历下拉的选项字:所在地 = 省名(国外单独一个词),公立私立 / 时长 = 各自词条。
 *
 * @param x 取词函数与哪一格。
 * @returns 选项值 → 显示字。
 */
export function makeEduLabel(x: EduLabelIn): (v: string) => string {
  return function eduLabel(v: string): string {
    if (x.f === EDU_F_PROV && v === EDU_ABROAD) {
      return x.t(GATE_ABROAD_KEY)
    }
    if (x.f === EDU_F_PROV) {
      return x.t(K_PROV_HEAD + v)
    }
    if (x.f === EDU_F_KIND) {
      return x.t(K_KIND_HEAD + v)
    }
    return x.t(K_LEN_HEAD + v)
  }
}

/**
 * 造「+ 再加一段」。
 *
 * @param x 现在的几段与落格。
 * @returns 点击手柄。
 */
export function makeEduAdd(x: EduRowsIn): () => void {
  return function addEdu(): void {
    x.setEdu(x.edu.concat([{ prov: TEXT_NONE, kind: TEXT_NONE, len: TEXT_NONE }]))
  }
}

/**
 * 造「删第几段」(只剩一段时清空那一段,界面总留一行)。
 *
 * @param x 现在的几段、落格与第几段。
 * @returns 点击手柄。
 */
export function makeEduRemove(x: EduRowsIn): () => void {
  return function removeEdu(): void {
    const out: EduPick[] = []
    for (const [i, r] of x.edu.entries()) {
      if (i !== x.i) {
        out.push(r)
      }
    }
    if (out.length === 0) {
      out.push({ prov: TEXT_NONE, kind: TEXT_NONE, len: TEXT_NONE })
    }
    x.setEdu(out)
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
 * 2026-10-13:身份与教育经历两格一并整格覆盖。
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
      fitEdu: a.edu,
      workNocs: a.workNocs,
      matchBy: a.matchBy,
      matchMode: a.matchMode,
    }
  }
  return {
    goalBand: a.goal,
    majors: a.majors,
    nocs: a.nocs,
    resProv: a.prov,
    resCity: a.city,
    fitWho: a.who,
    fitEdu: a.edu,
    workNocs: a.workNocs,
    matchBy: a.matchBy,
    matchMode: a.matchMode,
  }
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
 * 一页表单「专业」「想做的工作」那一格的字:已选几个,一个没选说「还没答」。
 *
 * @param x 取词与个数。
 * @returns 字。
 */
export function pickedTextOf(x: GatePickedIn): string {
  if (x.n === 0) {
    return x.t(FORM_NONE_KEY)
  }
  return x.t(FORM_PICKED_KEY, { n: x.n })
}
