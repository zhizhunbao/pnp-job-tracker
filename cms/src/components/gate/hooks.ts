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
  FILL_KIND_INFO, FORM_PICK_JOB, FORM_PICK_MAJOR, FORM_PICK_NONE, FORM_PICK_WORK, TEXT_NONE, TRACK_GATE_OPEN,
} from './constants'
import { eduFormRowsOf, eduListOf, eduStrsOf, makeEduAdd, makeEduPick, makeEduRemove } from './edu'
import {
  fromKeptOf, makeResumeFill,
  cityOptsOf, gateProvActiveOf, loadProvCities, makeCityPick, makeEditSave,
  makeRulePick, ruleOf,
  makeEntryClose, makeEntryDone, makeGateAuthDone, makePickSet, makeProvPick, nameBadOf,
} from './functions'
import type {
  FillMsg, ResumeFillHookIn, ResumeFillPanel,
  CitiesGot, CityOpt, CityPickHookIn, CityPickOut, DeadFlag, EduCellIn, EduPick, EduRowsPanel, EntryGatePanel,
  GateAuthHookIn, GateFormHookIn, GatePanel, GatePickPanel, ProvCitiesIn, EduSeedIn,
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
  const [majors, setMajors] = useState<string[]>(s.majors)
  const [nocs, setNocs] = useState<string[]>(s.nocs)
  const [prov, setProv] = useState(s.prov)
  const [abroad, setAbroad] = useState(s.abroad)
  const c = useCityPick({ prov, lang, seed: s.city })
  const [name, setName] = useState(s.name)
  const [who, setWho] = useState(s.who)
  const [workNocs, setWorkNocs] = useState<string[]>(s.workNocs)
  const [matchBy, setMatchBy] = useState(s.matchBy)
  const [matchMode, setMatchMode] = useState(s.matchMode)
  const [fromResume, setFromResume] = useState<string[]>(s.fromResume)
  const e = useEduRows({ list: s.eduList, strs: s.edu })
  const [saving, setSaving] = useState(false)
  const [failKey, setFail] = useState(TEXT_NONE)
  const save = makeEditSave({
    a: { goal,
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
      fromResume: fromKeptOf({ marks: fromResume, majors, workNocs, name: name.trim() }) },
    setSaving,
    setFail,
    onSaved: x.onSaved,
  })
  return {
    goal,
    majors,
    onMajors: setMajors,
    lang,
    nocs,
    setNocs,
    workNocs,
    setWorkNocs,
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
      setGoal,
      setWho,
      rule: ruleOf({ matchBy, matchMode }),
      onRule: makeRulePick({ setMatchBy, setMatchMode }),
      onSave: save,
    },
    onClose: x.onClose,
  }
}

/**
 * 教育经历题的几段(2026-10-13 档案加题;自 useGateEdit 拆出 —— 几段与改格 / 加段 / 删段三个手柄自成一件)。
 *
 * @param seed 档案里的教育经历明细与教育经历串(2026-11-12:有明细按明细起头)。
 * @returns 几段、整份写几段的落格与三个手柄。
 */
function useEduRows(seed: EduSeedIn): EduRowsPanel {
  const [edu, setEdu] = useState<EduPick[]>(eduFormRowsOf(seed))
  function eduPickOf(cell: EduCellIn): (v: string) => void {
    return makeEduPick({ cell, edu, setEdu })
  }
  function eduRemoveOf(i: number): () => void {
    return makeEduRemove({ edu, setEdu, i })
  }
  return { edu, setEdu, eduPickOf, onEduAdd: makeEduAdd({ edu, setEdu, i: 0 }), eduRemoveOf }
}

/**
 * 「从简历填写」的状态(2026-11-09「我的」第一批):取数中与一行提示。
 *
 * @param x 表单状态与选择器同步口。
 * @returns 面板。
 */
export function useResumeFill(x: ResumeFillHookIn): ResumeFillPanel {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<FillMsg>({ key: TEXT_NONE, n: 0, kind: FILL_KIND_INFO })
  return { busy, msg, onFill: makeResumeFill({ g: x.g, onWork: x.onWork, setBusy, setMsg }) }
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
    onMajor: makePickSet({ setPicking, v: FORM_PICK_MAJOR }),
    onJob: makePickSet({ setPicking, v: FORM_PICK_JOB }),
    onWork: makePickSet({ setPicking, v: FORM_PICK_WORK }),
    onDone: makePickSet({ setPicking, v: FORM_PICK_NONE }),
  }
}
