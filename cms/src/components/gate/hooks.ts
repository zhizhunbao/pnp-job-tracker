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
 *
 * @author Frank
 * @time 2026-10-04 02:10:00
 */
import { useEffect, useId, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSsrSession } from '@/components/auth'
import { useLang } from '@/components/i18n'
import { takeEntryGate } from '@/lib/guest'
import { track } from '@/lib/track'
import { GATE_BACK_KEY, TEXT_NONE, TRACK_GATE_OPEN } from './constants'
import {
  cityOptsOf, editBlankOf, editNextKeyOf, editStepsOf, focusGateQuestion, gateNextOffOf, gateProvActiveOf, gateStepOf,
  loadProvCities, makeCityPick, makeEditNext, makeEditSave, makeEntryClose, makeEntryDone, makeGateAuthDone,
  makeGateBack, makeGoalPick, makeProvPick, nameBadOf,
} from './functions'
import type {
  CitiesGot, CityOpt, CityPickHookIn, CityPickOut, DeadFlag, EntryGatePanel, GateAuthHookIn, GateBack, GateEditHookIn,
  GatePanel, GateStep, ProvCitiesIn,
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
 * 2026-10-11「进我的求职先弹五题」:x.missing 时只问起始答案里还空着的那几题(开框那一刻定下,答着答着不缩),
 * 空着的题出「跳过这步」(跳过 = 往后走,最后一题跳过 = 保存前面答的)。
 *
 * @param x 取词函数、起始答案、关框与保存成功。
 * @returns 与访客向导同形的整机面板(顶行、各题、钮区原样读它)。
 */
export function useGateEdit(x: GateEditHookIn): GatePanel {
  const [lang] = useLang()
  const s = x.seed
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState(s.goal)
  const [majors, setMajors] = useState<string[]>(s.majors)
  const [nocs, setNocs] = useState<string[]>(s.nocs)
  const [prov, setProv] = useState(s.prov)
  const [abroad, setAbroad] = useState(s.abroad)
  const c = useCityPick({ prov, lang, seed: s.city })
  const [name, setName] = useState(s.name)
  const [saving, setSaving] = useState(false)
  const [failKey, setFail] = useState(TEXT_NONE)
  const [steps] = useState(function initEditSteps(): GateStep[] {
    return editStepsOf({ seed: s, missing: x.missing })
  })
  const qid = useId()
  const lastStep = useRef(0)

  useEffect(function focusQuestionOnStep() {
    focusGateQuestion({ id: qid, step, last: lastStep })
  }, [qid, step])

  const cur = gateStepOf({ step, steps })
  const provActive = gateProvActiveOf({ prov, abroad })
  const nameBad = nameBadOf(name)
  const save = makeEditSave({
    a: { goal, majors, nocs, prov, abroad, city: c.panel.city, name: name.trim() },
    setSaving,
    setFail,
    onSaved: x.onSaved,
  })
  const next = makeEditNext({ step, total: steps.length, setStep, save })
  const skip = x.missing && editBlankOf({ cur, goal, majors, nocs, provActive, name })
  const onBack = makeGateBack({ step, setStep })
  let back: GateBack = null
  if (step > 0) {
    back = { aria: x.t(GATE_BACK_KEY), onClick: onBack }
  }
  return {
    step,
    cur,
    qid,
    goal,
    onGoal: makeGoalPick({ setGoal, next }),
    majors,
    onMajors: setMajors,
    lang,
    nocs,
    setNocs,
    provActive,
    onProv: makeProvPick({ setProv, setAbroad, setCity: c.setCity }),
    cities: c.panel,
    edit: {
      name, onName: setName, nameBad, nextKey: editNextKeyOf({ step, total: steps.length }), saving, failKey, skip,
    },
    total: steps.length,
    onNext: next,
    nextOff: gateNextOffOf({ cur, majors, nocs, provActive, nameBad }) || saving,
    onBack,
    back,
    onClose: x.onClose,
  }
}
