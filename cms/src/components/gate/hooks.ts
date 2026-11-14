'use client'
/**
 * gate 域的状态机器:访客向导整机 useGateWizard、草稿补交钩子 useGateSync、进站向导整机 useEntryGate。
 * 2026-10-04 访客四题改版自 profile 桶迁入(三台原 2026-10-03 付费闭环批 A1 / 10-04 进站即弹立,行为不变;
 * 同日审查结论「补交钩子只认交接戳(向导走到注册屏落、× 撤),别的登录一律不碰答案档」照旧)。
 * 改版只动整机交出去的面板:目标题点了直接进下一题、返回钮回上一题,钮组那三格恒 false 的凑数格撤掉。
 * 同日 A2:多一台专业题机器 useGateMajors(热门 / 防抖搜索 / 选中回显,整机开屏就取热门);职业题改用 quiz 桶选职业控件,
 * 整机不再给预选职业查名(那一格 resume 撤);注册完(邮箱当场、Google 回跳补交)人在职位板上就按答案换地址栏筛。
 * 同日收口审查:向导整机换题挪焦点、没注册成就卸掉时撤交接戳;专业题机器多交在途标;补交钩子改认「票据在且认得出人」、
 * 匿名开页先撤陈戳、交成了才记引导弹过与回职位板(那一跑下沉成 functions 的 runGateSync)。
 * 2026-10-05 专业题机器 useGateMajors 搬去 components/majors(改名 useMajorPicker,注释原样带过去),由向导件 GateWizard
 * 开屏挂上(照旧开屏就取热门);同日专业改多选,整机的专业格换成码清单。
 * 2026-10-11 Frank「我应该先注册 再问问题吧」→「需要改」:访客不再答题,访客向导整机 useGateWizard 与草稿补交钩子 useGateSync 删;
 * 新增访客注册框钩子 useGateAuth;进站整机 useEntryGate 照旧判弹不弹,弹的换成注册框。编辑整机的「动过了」凑数格随之撤。
 * 2026-11-07 Frank「删了吧」:一题一屏的档案编辑弹框 GateEdit 换成一页表单 GateForm 后删 —— 编辑整机 useGateEdit 瘦成
 * useGateForm(只留值、校验与保存;步数、换题、返回、跳过、主钮字那一套没人读了,一并撤),换题挪焦点的 useQuestionFocus 删。
 * 2026-11-12 Frank「这两个不能合并成一个吗?比如匹配规则 是 按专业,还是按什么其他的一个下拉选」:整机交出去的匹配依据、匹配模式
 * 两对值与落格换成一对「匹配规则」(rule / onRule),存的还是那两格。
 * 同日 Frank「这部分不能直接显示具体的年份和学历 证书吗?」:教育经历几段从档案的明细 eduList 起头(没有就按老的教育经历串),
 * 保存时明细与由它派生的教育经历串一并交;多交一个整份写几段的落格(「从简历填写」用)。
 *
 * 2026-11-12 Frank「右侧弹 sidebar 用户一项一项填,能搜索的就弹框搜索,最后用 sonnet 生成简历」:「做过的工作」从一串职业码
 * 改成几段(useWorkRows,职业码由各段汇出,整机不再单独存它);多电话、链接、技能、模板四格;查名字用的选职业控件
 * 由 useWorkSync 跟着各段的码走。
 * 同日 Frank「教育经历 和 专业是不是重复了」:专业并进教育经历的每一段 —— 整机的专业码由各段汇出(不再单独存、上报口撤),
 * 教育经历几段多「正在给第几段选专业」一格;一页表单的「专业」那一格与它的弹框手柄 onMajor 撤。
 * 2026-11-13 Frank「别等一周啊 都做完」(档案自动生成,不用用户填):多一只无界面的钩子 useAutoFill(全站骨架上的 GateSync 起),
 * 听「简历上传成了」与「投递发出去了」,后台把档案里空着的格子填上并存;「从简历填写」的手柄改从子桶 ./fill 取。
 *
 * @author Frank
 * @time 2026-10-04 02:10:00
 */
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSsrSession } from '@/components/auth'
import { useLang } from '@/components/i18n'
import { takeEntryGate } from '@/lib/guest'
import { track } from '@/lib/track'
import {
  FILL_KIND_INFO, FORM_PICK_EDU, FORM_PICK_JOB, FORM_PICK_NONE, FORM_PICK_WHERE, FORM_PICK_WORK,
  TEXT_NONE, TRACK_GATE_OPEN,
} from './constants'
import {
  EDU_AT_NONE, eduFormRowsOf, eduListOf, eduMajorsOf, eduStrsOf, makeEduAdd, makeEduMajor, makeEduPick, makeEduRemove,
} from './edu'
import {
  LEFT_NONE, loadCvLeft, makeCvDocClose, makeCvDownload, makeCvGen, makeCvSet, MSG_INFO,
} from './cv'
import { EV_APPLY_SENT, EV_UPLOADED, EV_UPLOADED_APPLY, makeResumeFill } from './fill'
import { loadSeed } from './seed'
import { makeSchoolPickOf, makeSchoolSearch, makeSchoolTypeOf, SCHOOL_AT_NONE, schoolQOf } from './school'
import {
  makeWorkAdd, makeWorkCell, makeWorkOcc, makeWorkOccClose, makeWorkRemove, WORK_AT_NONE, workFormRowsOf, workListOf,
  workNocsOf,
} from './work'
import {
  cvFactsOf, fillFnsOf, fromKeptOf, makeAreaSet, makeAtSet, makeAtSetOf, makeFlagOff, makeSeedSet, makeFormClose,
  makeSaveThen, onApplySentFill, onResumeUploaded,
  cityOptsOf, gateProvActiveOf, loadProvCities, makeCityPick, makeEditSave,
  makeRulePick, ruleOf,
  makeEntryClose, makeEntryDone, makeGateAuthDone, makePickSet, makeProvPick, nameBadOf,
} from './functions'
import type {
  FillMsg, ResumeFillHookIn, ResumeFillPanel,
  CitiesGot, CityOpt, CityPickHookIn, CityPickOut, DeadFlag, EduCellIn, EduPick, EduRowsPanel, EntryGatePanel,
  GateAuthHookIn, GateFormHookIn, GatePanel, GatePickPanel, ProvCitiesIn, EduSeedIn,
  WorkCellIn, WorkPick, WorkRowsPanel, WorkSeedIn, WorkSyncIn,
  SchoolHookIn, SchoolOpt, SchoolPanel, SeedLoadPanel,
  CvCellsPanel, CvGenDoc, CvGenHookIn, CvGenMsg, CvGenPanel, GateCv, GateEditSeed,
} from './types'

/**
 * 访客注册框的钩子(2026-10-11 Frank「我应该先注册 再问问题吧」→「需要改」:访客不再答题,门只剩注册 / 登录框):
 * 开框记一笔 gate-open(kind = 由头,与访客向导时同一个埋点,漏斗前后可比),交回登录完的回调(先记「这个页面里刚登录过」再交还)。
 *
 * @param x 由头与交还口。
 * @returns 登录完回调。
 */
export function useGateAuth(x: GateAuthHookIn): () => void {
  const intent = x.intent
  useEffect(function trackGateOpen() {
    track(TRACK_GATE_OPEN, { kind: intent })
  }, [intent])
  return makeGateAuthDone({ onDone: x.onDone })
}

/**
 * 进站向导整机(2026-10-04 Frank「进来就要求用户登录注册」→「照这样改」):全站骨架上的 GateSync 起,
 * 每换一页(路径变了)判一次 —— 没登录、不在例外表里、这一页没弹过才弹(lib/guest 的 takeEntryGate,判即记);
 * × 关掉页面照常看;注册完收起、软刷让页面拿到登录态。弹着时记的是「为哪一页弹的」:换到不该弹的页
 * (比如退回职位整页)当场收起,正文永远不盖;服务端首帧读不到会话存储与地址栏,先按不弹画。
 * 同日收口审查:登录态改认「票据在且认得出人」(会话种子 in 且邮箱不空)—— 与开职位弹框 / 投递用的分层态
 * (服务端认出用户才算登录)同一把尺;票据过期的人原先进站不弹、开职位却弹。关闭 / 注册完两个回调改由
 * 下面两个工厂造(体内只留装配;profile/functions.ts 已到 991 行,逼近 1000 行闸,先住本文件顶层,同 jobs/hooks 的 makeAuthDone)。
 * 2026-10-04 迁 gate 桶:那两个工厂回到本域 functions.ts(新桶的函数抽屉远在线下)。
 * 2026-10-11 访客不再答题:判法与两个回调不变,GateSync 弹的从访客向导换成注册框(GateAuth)。
 *
 * @returns 开没开、取词函数与关闭 / 注册完两个回调。
 */
export function useEntryGate(): EntryGatePanel {
  const session = useSsrSession()
  const [, , t] = useLang()
  const path = usePathname()
  const router = useRouter()
  const [openAt, setOpenAt] = useState<string | null>(null)
  let loggedIn = false
  if (session != null) {
    loggedIn = session.in && session.email !== TEXT_NONE
  }
  useEffect(function judgeEntryGate() {
    if (takeEntryGate({ loggedIn, path, search: window.location.search })) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 服务端首帧读不到会话存储与地址栏参数,先按不弹画;活过来再判
      setOpenAt(path)
    }
  }, [loggedIn, path])
  return {
    open: openAt === path,
    t,
    onClose: makeEntryClose({ setOpenAt }),
    onDone: makeEntryDone({ setOpenAt, refresh: router.refresh }),
  }
}

/**
 * 城市区的那几格(2026-10-09「我的档案」批:访客向导与编辑模式共用):选中的城市、搜索词、要摆的城市。
 *
 * @param x 省码、界面语与起始城市。
 * @returns 城市区面板与城市落格。
 */
export function useCityPick(x: CityPickHookIn): CityPickOut {
  const [city, setCity] = useState(x.seed)
  const [q, setQ] = useState(TEXT_NONE)
  const opts = useProvCities({ prov: x.prov, q, lang: x.lang })
  return { panel: { city, onCity: makeCityPick({ city, setCity }), q, onQ: setQ, opts }, setCity }
}

/**
 * 一个省的城市(2026-10-09「我的档案」批:「所在地」那一屏选完省下面出城市):省换了就取那一省(stats 域,在招多的在前),
 * 再按搜索词挑这一刻要摆的。省没选 / 选了境外 / 那一省还没取回来 = 空列(城市区不出)。
 *
 * @param x 省码、搜索词与界面语。
 * @returns 要摆的城市。
 */
export function useProvCities(x: ProvCitiesIn): CityOpt[] {
  const [got, setGot] = useState<CitiesGot>({ prov: TEXT_NONE, rows: [] })
  const prov = x.prov
  useEffect(function loadCities() {
    const flag: DeadFlag = { dead: false }
    if (prov !== TEXT_NONE) {
      void loadProvCities({ prov, setAll: setGot, flag })
    }
    return function stopCities(): void {
      flag.dead = true
    }
  }, [prov])
  if (prov === TEXT_NONE || got.prov !== prov) {
    return []
  }
  return cityOptsOf({ all: got.rows, q: x.q, lang: x.lang })
}

/**
 * 编辑模式的整机(2026-10-09「我的档案」批,Frank「答题还是之前弹框的那种干净」):档案页「修改」走访客向导同一套题、同一副样子,
 * 但从档案里的答案起头、末尾多问英文姓名、最后一题点「保存」—— 不写访客草稿、不打交接戳、不进注册屏、不记 gate-open
 * (那几样是访客注册漏斗的事,编辑的人早已登录)。
 * 2026-10-13 档案加身份、教育经历两题(Frank「我的档案回答完了,自动在下面出一个 section 列出我的通道」):两格进整机 edit 段,保存一并覆盖。
 * 2026-10-11「进我的求职先弹五题」:x.missing 时只问起始答案里还空着的那几题(开框那一刻定下,答着答着不缩),
 * 空着的题出「跳过这步」(跳过 = 往后走,最后一题跳过 = 保存前面答的)。
 * 2026-11-07 Frank「删了吧」:一题一屏的 GateEdit 删,只剩一页表单 GateForm 读它 —— 改名 useGateForm;
 * 步数 / 当前题 / 题面 id / 一共几题 / 下一步 / 主钮灰 / 返回 / 跳过 / 主钮字、点了就翻页的目标与身份上报口、
 * 只问空着的(missing)与从哪题开始(start)随之撤,取词函数也不再收(只给返回钮读屏名用)。
 *
 * @param x 档案现值、关面板与存好了。
 * @returns 表单面板(七格、城市区、教育经历与保存原样读它)。
 */
export function useGateForm(x: GateFormHookIn): GatePanel {
  const [lang] = useLang()
  const s = x.seed
  const [goal, setGoal] = useState(s.goal)
  const [nocs, setNocs] = useState<string[]>(s.nocs)
  const [prov, setProv] = useState(s.prov)
  const [abroad, setAbroad] = useState(s.abroad)
  const c = useCityPick({ prov, lang, seed: s.city })
  const [name, setName] = useState(s.name)
  const [who, setWho] = useState(s.who)
  const w = useWorkRows({ list: s.cv.work, nocs: s.workNocs })
  const workNocs = workNocsOf(w.work)
  const cvc = useCvCells(s.cv)
  const [matchBy, setMatchBy] = useState(s.matchBy)
  const [matchMode, setMatchMode] = useState(s.matchMode)
  const [fromResume, setFromResume] = useState<string[]>(s.fromResume)
  const e = useEduRows({ list: s.eduList, strs: s.edu, majors: s.majors })
  const majors = eduMajorsOf(e.edu)
  const [saving, setSaving] = useState(false)
  const [failKey, setFail] = useState(TEXT_NONE)
  const [savedOnce, setSavedOnce] = useState(false)
  const a: GateEditSeed = { goal,
majors,
nocs,
prov,
abroad,
city: c.panel.city,
name: name.trim(),
who,
edu: eduStrsOf(e.edu),
eduList: eduListOf(e.edu),
      workNocs,
matchBy,
matchMode,
      fromResume: fromKeptOf({ marks: fromResume, majors, workNocs, name: name.trim() }),
      cv: cvFactsOf({ work: workListOf(w.work), cvc }) }
  const save = makeEditSave({ a, setSaving, setFail, onSaved: x.onSaved })
  return {
    goal,
    majors,
    lang,
    nocs,
    setNocs,
    workNocs,
    provActive: gateProvActiveOf({ prov, abroad }),
    onProv: makeProvPick({ setProv, setAbroad, setCity: c.setCity }),
    cities: c.panel,
    fromResume,
    setFromResume,
    edit: {
      name,
      onName: setName,
      nameBad: nameBadOf(name),
      saving,
      failKey,
      who,
      edu: e.edu,
      eduPickOf: e.eduPickOf,
      onEduAdd: e.onEduAdd,
      eduRemoveOf: e.eduRemoveOf,
      setEdu: e.setEdu,
      em: e.em,
      setGoal,
      setWho,
      rule: ruleOf({ matchBy, matchMode }),
      onRule: makeRulePick({ setMatchBy, setMatchMode }),
      onSave: save,
      w,
      cvc,
      saveThen: makeSaveThen({ a, setSaving, setFail, setSavedOnce }),
      cvReady: a.name !== TEXT_NONE && nameBadOf(name) === false && (a.cv.work.length > 0 || a.eduList.length > 0),
    },
    onClose: makeFormClose({ savedOnce, onClose: x.onClose, onSaved: x.onSaved }),
  }
}

/**
 * 教育经历题的几段(2026-10-13 档案加题;自 useGateEdit 拆出 —— 几段与改格 / 加段 / 删段三个手柄自成一件)。
 *
 * @param seed 档案里的教育经历明细、教育经历串与专业码(2026-11-12:有明细按明细起头;各段都没挂专业的,专业码按序落进各段)。
 * @returns 几段、整份写几段的落格与三个手柄。
 */
function useEduRows(seed: EduSeedIn): EduRowsPanel {
  const [edu, setEdu] = useState<EduPick[]>(eduFormRowsOf(seed))
  const [majorAt, setMajorAt] = useState<number>(EDU_AT_NONE)
  function eduPickOf(cell: EduCellIn): (v: string) => void {
    return makeEduPick({ cell, edu, setEdu })
  }
  function eduRemoveOf(i: number): () => void {
    return makeEduRemove({ edu, setEdu, i })
  }
  return {
    edu,
    setEdu,
    eduPickOf,
    onEduAdd: makeEduAdd({ edu, setEdu, i: 0 }),
    eduRemoveOf,
    em: {
      at: majorAt,
      openOf: makeAtSetOf(setMajorAt),
      onPick: makeEduMajor({ rows: edu, setRows: setEdu, at: majorAt, setAt: setMajorAt }),
      onClose: makeAtSet({ setAt: setMajorAt, v: EDU_AT_NONE }),
    },
  }
}

/**
 * 只有生成简历才用的四格(2026-11-12):电话、链接、技能、模板,从档案里的简历资料起头。
 *
 * @param seed 档案里的简历资料。
 * @returns 四格与它们的落格。
 */
function useCvCells(seed: GateCv): CvCellsPanel {
  const [phone, setPhone] = useState(seed.phone)
  const [link, setLink] = useState(seed.link)
  const [skills, setSkills] = useState(seed.skills)
  const [tpl, setTpl] = useState(seed.tpl)
  return {
    phone, onPhone: setPhone, link, onLink: setLink, skills, onSkills: makeAreaSet(setSkills), tpl, onTpl: setTpl,
  }
}

/**
 * 自己取档案当修改面板的起始答案(2026-11-12:投递第 1 步的「生成简历」改开修改面板,那里手里没有档案):挂上取一次。
 *
 * @returns 起始答案与取不到。
 */
export function useSeedLoad(): SeedLoadPanel {
  const [seed, setSeed] = useState<GateEditSeed | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(function loadSeedOnce() {
    void loadSeed({ setSeed: makeSeedSet(setSeed), setFailed })
  }, [])
  return { seed, failed }
}

/**
 * 教育经历「搜学校」的状态(2026-11-12):记下在搜哪一段(那一段学校格里的字就是检索词),字一变防抖搜一次指定院校名单;
 * 选中一所把校名、所在省、公立私立填进那一段并收起结果。名单里没有的学校照常手填。
 *
 * @param x 教育经历几段、整份写几段的落格与界面语。
 * @returns 搜学校整机。
 */
export function useSchoolSearch(x: SchoolHookIn): SchoolPanel {
  const [at, setAt] = useState<number>(SCHOOL_AT_NONE)
  const [hits, setHits] = useState<SchoolOpt[]>([])
  const q = schoolQOf({ rows: x.rows, at })
  useEffect(function searchSchools() {
    return makeSchoolSearch({ q, setHits })()
  }, [q])
  return {
    at,
    hits,
    typeOf: makeSchoolTypeOf({ rows: x.rows, setRows: x.setRows, setAt }),
    pickOf: makeSchoolPickOf({ rows: x.rows, setRows: x.setRows, at, setAt }),
    lang: x.lang,
  }
}

/**
 * 「做过的工作」的几段(2026-11-12):几段、改格 / 加段 / 删段三个手柄,和「正在给第几段选职业」那一格
 * (选职业框开没开看它;框里点了一个职业就落进那一段并关框)。
 *
 * @param seed 档案里存过的几段与老的职业码(没存过几段的按码一码一段起头)。
 * @returns 几段与手柄。
 */
function useWorkRows(seed: WorkSeedIn): WorkRowsPanel {
  const [work, setWork] = useState<WorkPick[]>(workFormRowsOf(seed))
  const [occAt, setOccAt] = useState<number>(WORK_AT_NONE)
  function workCellOf(cell: WorkCellIn): (v: string) => void {
    return makeWorkCell({ cell, rows: work, setRows: setWork })
  }
  function workRemoveOf(i: number): () => void {
    return makeWorkRemove({ rows: work, setRows: setWork, i })
  }
  return {
    work,
    setWork,
    workCellOf,
    onWorkAdd: makeWorkAdd({ rows: work, setRows: setWork, i: 0 }),
    workRemoveOf,
    occAt,
    setOccAt,
    onWorkOcc: makeWorkOcc({ rows: work, setRows: setWork, at: occAt, setAt: setOccAt }),
    onOccClose: makeWorkOccClose(setOccAt),
  }
}

/**
 * 查名字用的选职业控件跟着各段的职业码走(2026-11-12):各段的码一变,就把控件里已选的码整份换成它们,
 * 控件随之把新码的名字取回来(摘要行与各段职业那一格读它的名字表)。
 *
 * @param x 各段汇出的职业码与控件的整份替换口。
 * @returns 无。
 */
export function useWorkSync(x: WorkSyncIn): void {
  const key = x.nocs.join()
  const onReplace = x.onReplace
  useEffect(function syncWorkNocs() {
    onReplace(x.nocs)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只认码变没变(key);码清单每帧是新数组,进依赖会每帧都换
  }, [key, onReplace])
}

/**
 * 「生成简历」一段的状态(2026-11-12 Frank「最后用 sonnet 生成简历,可以选择模板。这部分功能是收费的」):
 * 开面板取一次剩余额度;生成中、一行提示、生成出来还没存的那一份(有它预览框就开)、正在存、升级框开没开。
 *
 * @param x 表单整机。
 * @returns 生成整机。
 */
export function useCvGen(x: CvGenHookIn): CvGenPanel {
  const [, , t] = useLang()
  const [left, setLeft] = useState<number>(LEFT_NONE)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<CvGenMsg>({ key: TEXT_NONE, kind: MSG_INFO })
  const [doc, setDoc] = useState<CvGenDoc | null>(null)
  const [saving, setSaving] = useState(false)
  const [upgrade, setUpgrade] = useState(false)
  useEffect(function loadLeftOnce() {
    void loadCvLeft({ setLeft })
  }, [])
  return {
    ready: x.g.edit.cvReady,
    left,
    busy,
    msg,
    doc,
    saving,
    upgrade,
    onGen: makeCvGen({
      tpl: x.g.edit.cvc.tpl, saveThen: x.g.edit.saveThen, doc, setBusy, setMsg, setDoc, setUpgrade, setLeft,
    }),
    onSet: makeCvSet({ doc, setSaving, setMsg, setDoc, t }),
    onDownload: makeCvDownload(doc),
    onDocClose: makeCvDocClose({ doc, setDoc }),
    onUpgradeClose: makeFlagOff(setUpgrade),
  }
}

/**
 * 「从简历填写」的状态(2026-11-09「我的」第一批):取数中与一行提示。
 *
 * 2026-11-12 Frank「这个应该是自动填的吧」:x.auto 时一开面板就自己填一次(刚上传或替换了简历、档案还有空格),
 * 填上的照旧保存才入档案、可先改。
 * 2026-11-13:手柄搬去子桶 ./fill,并法由 fillFnsOf 注进去(与传简历后后台自己填的那条路同一个合并核)。
 *
 * @param x 表单状态与要不要一开就填。
 * @returns 面板。
 */
export function useResumeFill(x: ResumeFillHookIn): ResumeFillPanel {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<FillMsg>({ key: TEXT_NONE, n: 0, kind: FILL_KIND_INFO })
  const onFill = makeResumeFill({ g: x.g, setBusy, setMsg, fns: fillFnsOf() })
  return { busy, msg, onFill }
}

/**
 * 档案自动填写的监听(无界面;2026-11-13 Frank「别等一周啊 都做完」:档案自动生成,不用用户填):全站骨架上的 GateSync 起,
 * 每个页面都在。听到「简历上传成了」(「我的」页基础简历卡、投递框第 1 步各发一个事件)就后台读简历填档案里空着的格;
 * 听到「投递发出去了」就补想做的工作与现居省。两个回调都是模块级的函数,挂一次、卸载时摘。
 *
 * @returns 无。
 */
export function useAutoFill(): void {
  useEffect(function listenAutoFill() {
    window.addEventListener(EV_UPLOADED, onResumeUploaded)
    window.addEventListener(EV_UPLOADED_APPLY, onResumeUploaded)
    window.addEventListener(EV_APPLY_SENT, onApplySentFill)
    return function stopAutoFill(): void {
      window.removeEventListener(EV_UPLOADED, onResumeUploaded)
      window.removeEventListener(EV_UPLOADED_APPLY, onResumeUploaded)
      window.removeEventListener(EV_APPLY_SENT, onApplySentFill)
    }
  }, [])
}

/**
 * 一页表单里「专业」「想做的工作」两格叠开哪个选择器(2026-11-07 照 Azure 编辑面板:长清单不铺在面板里,点「修改」叠一层)。
 *
 * @returns 叠开哪个与三个手柄。
 */
export function useGatePick(): GatePickPanel {
  const [picking, setPicking] = useState<string>(FORM_PICK_NONE)
  return {
    picking,
    onJob: makePickSet({ setPicking, v: FORM_PICK_JOB }),
    onWork: makePickSet({ setPicking, v: FORM_PICK_WORK }),
    onWhere: makePickSet({ setPicking, v: FORM_PICK_WHERE }),
    onEdu: makePickSet({ setPicking, v: FORM_PICK_EDU }),
    onDone: makePickSet({ setPicking, v: FORM_PICK_NONE }),
  }
}
