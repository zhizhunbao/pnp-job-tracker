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
 *
 * @author Frank
 * @time 2026-10-04 02:10:00
 */
import { useEffect, useId, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSsrSession } from '@/components/auth'
import { useLang } from '@/components/i18n'
import {
  clearGateHandoff, readGateDraft, readGateSeed, takeEntryGate, takeGateHandoff, writeGateDraft,
} from '@/lib/guest'
import { track } from '@/lib/track'
import { GATE_BACK_KEY, GATE_STEP_REG, TEXT_NONE, TRACK_GATE_OPEN } from './constants'
import {
  dropGateHandoff, focusGateQuestion, gateNextOffOf, gateProvActiveOf, gateStepOf, makeEntryClose, makeEntryDone,
  makeGateBack, makeGateClose, makeGateDone, makeGateNext, makeGoalPick, makeMajorsPick, makeProvPick, makeTouchedNocs,
  runGateSync,
} from './functions'
import type { EntryGatePanel, GateBack, GateDraft, GateHookIn, GatePanel } from './types'

/**
 * 访客向导整机(2026-10-03 付费闭环批 A1):四道题的答案 + 走到第几步 + 「动过了」+ 专业题机器。
 * (A1 立时首句末尾是「+ 预选职业的名字」;A2 起查名撤、专业题机器挂进来,收口时首句照现状改写。)
 * 初值有草稿照草稿,没有就按刚看过的职位预选职业、按设备时区预选所在省(lib/guest 的 readGateSeed);
 * 用户动过一下起,每次改动都把草稿写回本地(Google 整页登录回跳后靠它补交)。
 * 2026-10-04 A2:预选职业的名字改由职业题的选职业控件自己补(这里的查名撤);多挂一台专业题机器;
 * 注册成功回调多收这一页的路径与换地址栏(人在职位板上就按答案筛)。
 * 2026-10-05:多交一格 back(返回钮收进弹框壳,出不出、读屏名由这里给;整机多收取词函数)。
 * 同日收口审查:整机给题面一枚 useId,换了题由 focusQuestionOnStep 把焦点挪过去(开屏不挪);卸掉时由 dropHandoffOnLeave
 * 撤交接戳(这个页面里在向导里注册 / 登录成功过的不撤,见 functions 的 dropGateHandoff)。
 * 2026-10-05 专业改多选:专业格换成码清单(majors),交出值与上报口;专业题机器不再挂在这里(搬去 majors 桶,
 * 向导件 GateWizard 拿这两格开屏挂 useMajorPicker,上面「+ 专业题机器」那半随之不在本整机)。
 *
 * @param x 由头与注册后的交还口。
 * @returns 向导的整块面板。
 */
export function useGateWizard(x: GateHookIn): GatePanel {
  const [lang] = useLang()
  const path = usePathname()
  const router = useRouter()
  const intent = x.intent
  const [seed] = useState(function initGateSeed(): GateDraft {
    return readGateSeed({ intent })
  })
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState(seed.goal)
  const [majors, setMajors] = useState<string[]>(seed.majors)
  const [nocs, setNocs] = useState<string[]>(seed.nocs)
  const [prov, setProv] = useState(seed.prov)
  const [abroad, setAbroad] = useState(seed.abroad)
  const [touched, setTouched] = useState(false)
  const qid = useId()
  const lastStep = useRef(0)

  useEffect(function trackGateOpen() {
    track(TRACK_GATE_OPEN, { kind: intent })
  }, [intent])

  useEffect(function dropHandoffOnLeave() {
    return dropGateHandoff
  }, [])

  useEffect(function focusQuestionOnStep() {
    focusGateQuestion({ id: qid, step, last: lastStep })
  }, [qid, step])

  useEffect(function saveGateDraft() {
    if (touched) {
      writeGateDraft({ goal, majors, nocs, prov, abroad, intent })
    }
  }, [touched, goal, majors, nocs, prov, abroad, intent])

  const cur = gateStepOf({ step })
  const next = makeGateNext({ step, cur, setStep, setTouched })
  const provActive = gateProvActiveOf({ prov, abroad })
  const onBack = makeGateBack({ step, setStep })
  let back: GateBack = null
  if (step > 0 && cur !== GATE_STEP_REG) {
    back = { aria: x.t(GATE_BACK_KEY), onClick: onBack }
  }
  return {
    step,
    cur,
    qid,
    goal,
    onGoal: makeGoalPick({ setGoal, setTouched, next }),
    majors,
    onMajors: makeMajorsPick({ setMajors, setTouched }),
    lang,
    nocs,
    setNocs: makeTouchedNocs({ setNocs, setTouched }),
    provActive,
    onProv: makeProvPick({ setProv, setAbroad, setTouched }),
    onNext: next,
    nextOff: gateNextOffOf({ cur, majors, nocs, provActive }),
    onBack,
    back,
    onRegistered: makeGateDone({
      draft: { goal, majors, nocs, prov, abroad, intent }, onDone: x.onDone, path, replace: router.replace,
    }),
    onClose: makeGateClose({ onClose: x.onClose }),
  }
}

/**
 * 访客向导草稿的补交钩子(挂在全站骨架上,无界面):已登录 + 交接戳没过期 + 本地有草稿 → 记「首访引导弹过了」、
 * 把草稿并进答案档(只填空格)。专治 Google 整页登录 —— 跳走时向导的状态全丢,草稿在本地、戳在这个标签页,
 * 回跳后由这里补交;邮箱注册在向导里当场交接(并撤草稿与戳),到这里已无可交。
 * 没有戳的登录(页头登录、别的标签页、关掉向导之后)不碰答案档,草稿留着只给下次弹向导预填(审查 2026-10-03)。
 * 2026-10-04 A2:补交完再按这一份草稿回职位板筛(gateBoardGo;人在职位板、由头是进站或点开职位才换地址栏)——
 * Google 整页回跳那一路的筛选就在这里接上。
 * 同日收口:由头只剩进站(点开职位撤,理由见 constants 的 BOARD_INTENTS);换地址栏一页只换一次 ——
 * 补交没成会把草稿与戳放回去,10 分钟内每换一页这里都再交一次,每次都换地址栏就把用户自己后来设的筛选冲掉;
 * 这个页面里刚在向导里登录过(邮箱注册当场已换过)的也不再换。
 * 同日收口审查:① 登录态改认「票据在且认得出人」(会话种子 in 且邮箱不空,与进站向导 useEntryGate 同一把尺)——
 * 票据过期的人进站按匿名弹向导,这里原先却当他登录了去补交,401 后把戳放回去、记了引导弹过、改了地址栏;
 * ② 补交那一跑下沉成 functions 的 runGateSync:交成了才记「首访引导弹过了」、才回职位板(一页只试一次照旧,记号 boardWent);
 * ③ 匿名开页(同一把尺)先撤交接戳(dropStaleHandoff):走到注册屏又刷新 / 关页再开的,戳是陈的,不许留给之后的页头登录。
 * Google 整页登录回跳那一页已是登录态,这一步不撤,戳照常由补交那一跑取走。登出是整页刷新,开页时判的就是这一页的登录态。
 *
 * @returns 无。
 */
export function useGateSync(): void {
  const session = useSsrSession()
  const path = usePathname()
  const router = useRouter()
  const boardWent = useRef(false)
  let loggedIn = false
  if (session != null) {
    loggedIn = session.in && session.email !== TEXT_NONE
  }
  useEffect(function dropStaleHandoff() {
    if (loggedIn === false) {
      clearGateHandoff()
    }
  }, [loggedIn])
  useEffect(function syncGateDraftOnce() {
    if (loggedIn === false || takeGateHandoff() === false) {
      return
    }
    const d = readGateDraft()
    if (d == null) {
      return
    }
    void runGateSync({ draft: d, path, search: window.location.search, replace: router.replace, boardWent })
  }, [loggedIn, path, router])
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
