/**
 * chat 域(全站悬浮顾问)的函数:正文排版、SSE 读流、错误码分拣、多轮上下文拼装、
 * 示例句/记忆挑选、挂件几何钳制与避让测量,以及全部 make* 手柄工厂(hooks 体内
 * 不留函数体,效果体也在这儿以 make*Effect 工厂给出,壳里只调)。
 * 2026-08-27 换装批自 ChatBox/ChatAnswer/ChatLauncher/chatExamples 四件收拢;
 * 原文的取样、事故与拍板注释全数随迁到各函数头上。
 *
 * @author Frank
 * @time 2026-08-27 02:30:00
 */
import { POPULAR_NOCS } from '@/components/profile'
import { track } from '@/lib/track'
import {
  BAR_H_MIN, BAR_SCAN_SEL, BLOCK_P, BLOCK_UL, BOTTOM_ZERO, BOX_LS_KEY, BRAND_NAME, BTN_SEL, BULLET_RE, CLB_VAR,
  COARSE_MQ, COPIED_MS, CRED_INCLUDE, DIR_E, DIR_N, DIR_S, DIR_W, DISPLAY_FLEX, DOCK_BTN, DOCK_GAP, DOCK_LS_KEY,
  DRAG_SLOP, EDGE_GAP, EV_ANSWER, EV_EXAMPLE, EV_FEEDBACK, EV_OPEN, EV_OPTION, EV_SUBMIT, EV_W_CLOSE, EV_W_DOCK_DRAG,
  EV_W_DRAG, EV_W_FALLBACK, EV_W_MAX, EV_W_MIN, EV_W_OPEN, EV_W_RESET, EV_W_RESIZE, EV_W_RESTORE, EV_W_STUCK,
  EVT_KEYDOWN, EVT_MQ_CHANGE, EVT_POINTERCANCEL, EVT_POINTERMOVE, EVT_POINTERUP, EVT_RESIZE, EVT_SCROLL,
  EXAMPLES_ANON, EXAMPLES_MAX, EXAMPLES_REG, FAULT_KEY, FAULT_LLM, FAULT_NET, GRAB_MOVE, GUIDE_KEY, H_AUTO,
  HDR_CONTENT_TYPE, HDR_CONTENT_TYPE_LOW, HINT_DELAY_MS, HINT_HIDE_MS, HINT_KEY, HINT_MAX, HISTORY_MAX, HTTP_RE,
  JOBS_DETAIL_RE, K_EX_CLB_PROV, K_EX_OCC_CMP, K_EX_OCC_PROV, K_EX_PGWP, KEY_DOT, KEY_ENTER, KEY_ESC, LOCALE_NUM,
  LS_OFF, LS_ON, MAIN_SEL, MAX_LS_KEY, MEM_NOC_MAX, MEM_PROV_MAX, METHOD_POST, MIME_JSON, MIME_SSE, NARROW_OFF_RE,
  NOC5_RE, NOC_LABEL_HEAD, NOC_WRAP_CLOSE, NOC_WRAP_OPEN, OPEN_EVT, OPT_SELF_PICK, OPTIONS_MAX, PANEL_H_MIN,
  PANEL_W_MIN, PLAN_HEAD, POINTER_MOUSE, POPOVER_OPEN_SEL, POS_AUTO, POS_FIXED, POS_STICKY, PR_HEAD, PREFILL_MAX,
  PROF_ST_HEAD, PX, RESET_ASK_MS, RETRYABLE, ROLE_ASSISTANT, ROLE_USER, SECS_TICK_MS, SELECT_NONE, SSE_BLOCK_SEP,
  SSE_DATA_HEAD, SSE_DONE, SSE_LINE_SEP, STATUS_SLUGS, STICK_SLACK, TA_H_MAX, TEXT_NONE, TH_COPIED_MS,
  TITLE_SLASH_SEP, UNIT_PCT, UNIT_SEP, URL_CHAT, URL_ME, WARN_POPOVER, WARN_STUCK, WARN_WATCHDOG, WATCHDOG2_MS,
  WATCHDOG_MS, WIDE_MQ, WWW_RE} from './constants'
import type {
  Answer, AnswerOption, AnswerOptions, Block, Box, ChatBoxPanel, ChatLang, ChatMe, ChatProfile, ChatSlots,
  ClampDockIn, ComposerChangeEvent, ComposerKeyEvent, DockPos, ErrBody, ExampleItem, ExamplesIn, Fact, Fault,
  GrabDir, GrabStart, LazyBoxModule, MeBody, Msg, MutBool, MutBox, NocOpt, PrefillDetail, ReadSseIn, SendIn,
  SetTurns, SseFrame, StepsToggleEvent, StepsToggleIn, TFn, ThreadScrollEvent, Turn, TurnPatch,
  WebSource} from './types'

/**
 * §排版 —— **不是 markdown 渲染**(2026-08-04 Open WebUI 取样后扩到全部答复)。
 * 认的记号只有两个,都是自家约定:① 空行 → 分段;② 行首 `- ` → 项目符号一条
 * (连续多条合成一组,悬挂缩进)。**不认**标题/加粗/表格/代码块 —— 那要么引
 * markdown 依赖,要么碰 dangerouslySetInnerHTML,两条都不走;产出永远是纯文本
 * 节点,注入面为零。向后兼容:没有记号就当普通段落,不显示空列表。
 * 为什么值得排:pre-wrap 一铺到底时 14 行 `- 标签: 值` 折行后续行顶回行首,
 * 读起来就是一坨(Frank 实测原话);长答复没有段落概念时一屏字没有落脚点。
 *
 * @param x 正文原文。
 * @returns 排版块队列。
 */
export function textBlocksOf(x: {
  /**
   * 正文原文(答复 / 半截流式 / 引导语)。
   */
  text: string
}): Block[] {
  const out: Block[] = []
  let para: string[] = []
  for (const raw of x.text.split(SSE_LINE_SEP)) {
    const s = raw.trim()
    if (s === '') {
      para = flushPara(out, para)
      continue
    }
    const m = BULLET_RE.exec(s)
    if (m == null || m.groups == null || m.groups.body == null) {
      para.push(s)
      continue
    }
    para = flushPara(out, para)
    const last = out[out.length - 1]
    if (last != null && last.type === BLOCK_UL) {
      last.items.push(m.groups.body)
    } else {
      out.push({ type: BLOCK_UL, text: TEXT_NONE, items: [m.groups.body] })
    }
  }
  flushPara(out, para)
  return out
}

/**
 * 攒着的段落行落成一个段块(textBlocksOf 的收口件)。
 *
 * @param out 排版块队列(就地追加)。
 * @param para 攒着的行。
 * @returns 新的空攒行表。
 */
// eslint-disable-next-line local/one-parameter -- 内部收口件:与 textBlocksOf 的局部状态成对,拆 In 对象只多一层壳
function flushPara(out: Block[], para: string[]): string[] {
  if (para.length > 0) {
    out.push({ type: BLOCK_P, text: para.join(SSE_LINE_SEP), items: [] })
  }
  return []
}

/**
 * 数字显示:value = null 一律念官方原文(**永不折成 0 或「暂无」**,总红线);
 * 单位跟数字同格(% 不留空格,其余留)。
 *
 * @param x 那条事实。
 * @returns 显示文本。
 */
export function factValueOf(x: {
  /**
   * 那条事实。
   */
  f: Fact
}): string {
  if (x.f.value == null) {
    return x.f.valueText
  }
  const v = x.f.value.toLocaleString(LOCALE_NUM)
  if (x.f.unit === '') {
    return v
  }
  if (x.f.unit === UNIT_PCT) {
    return v + x.f.unit
  }
  return v + UNIT_SEP + x.f.unit
}

/**
 * 外链判定(http/https 才开新窗并挂 noreferrer)。
 *
 * @param x 链接地址。
 * @returns 是外链。
 */
export function isExtUrl(x: {
  /**
   * 链接地址。
   */
  url: string
}): boolean {
  return HTTP_RE.test(x.url)
}

/**
 * 链接文字用**官方站点名**(域名去 www),不用「Open」——「Open」不告诉用户
 * 这是谁说的;站内页用品牌名(语言中立,不必翻译,也不会把工具层的中文 label
 * 漏进英文界面)。
 *
 * @param x 链接地址。
 * @returns 站点显示名。
 */
export function srcNameOf(x: {
  /**
   * 链接地址。
   */
  url: string
}): string {
  if (isExtUrl({ url: x.url }) === false) {
    return BRAND_NAME
  }
  try {
    return new URL(x.url).hostname.replace(WWW_RE, TEXT_NONE)
  } catch {
    return BRAND_NAME
  }
}

/**
 * 服务端回的错误码是不是我们认得的故障码 —— 认得的原样用,认不得的由调用方落
 * 兜底码(白名单漏一个码 = 把「系统繁忙」说成「没连上服务」,判据只有 FAULT_KEY
 * 一份)。谓词签名是语言规定的(必须直接收被判定的值)。
 *
 * @param code 服务端回的错误码字符串。
 * @returns 是 FAULT_KEY 里登记过的码。
 */
export function isFault(code: string): code is Fault {
  return Object.keys(FAULT_KEY).includes(code)
}

/**
 * 故障码 → 文案键。
 *
 * @param x 故障码。
 * @returns i18n 键。
 */
export function faultKeyOf(x: {
  /**
   * 故障码。
   */
  fault: Fault
}): string {
  return FAULT_KEY[x.fault]
}

/**
 * 这个故障重试有意义吗(见 RETRYABLE 的注释)。
 *
 * @param x 故障码。
 * @returns 给重试钮 = true。
 */
export function isRetryable(x: {
  /**
   * 故障码。
   */
  fault: Fault
}): boolean {
  return (RETRYABLE as readonly string[]).includes(x.fault)
}

/**
 * 开一轮空转(q 定格,其余待填;t0 = 现在,结算耗时从它算)。
 *
 * @param x 用户那句。
 * @returns 空转。
 */
export function blankTurnOf(x: {
  /**
   * 用户那句原文。
   */
  q: string
}): Turn {
  return {
    q: x.q,
    a: null,
    steps: [],
    stream: TEXT_NONE,
    guide: TEXT_NONE,
    fault: TEXT_NONE,
    stepsOpen: null,
    t0: Date.now(),
    secs: 0,
  }
}

/**
 * §流式 —— 轨迹在流,正文也按句在流(2026-08-08;服务端路由同一段注释)。
 * 服务端一句过了逐句门(数字回查 facts / 内部码 / 语言混用 / 两态揉一句)才发
 * 一条 delta,所以到手的每一截都是核过的 —— 前端**照收照渲,不自己判**。
 * 🔴 最终以 answer 那条为准:流出去的是它的前缀,补位/重截都发生在最后一步,
 * 不许拿累计增量当定稿。
 *
 * @param x 流与四个回调。
 * @returns 错误码;空串 = 正常结束。
 */
export async function readSse(x: ReadSseIn): Promise<string> {
  const reader = x.body.getReader()
  const dec = new TextDecoder()
  let buf = TEXT_NONE
  for (;;) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }
    buf += dec.decode(value, { stream: true })
    const blocks = buf.split(SSE_BLOCK_SEP)
    const tail = blocks.pop()
    buf = TEXT_NONE
    if (tail != null) {
      buf = tail
    }
    for (const b of blocks) {
      let line: string | null = null
      for (const l of b.split(SSE_LINE_SEP)) {
        if (l.startsWith(SSE_DATA_HEAD)) {
          line = l
          break
        }
      }
      if (line == null) {
        continue
      }
      const raw = line.slice(SSE_DATA_HEAD.length).trim()
      if (raw === SSE_DONE) {
        return TEXT_NONE
      }
      let d: SseFrame | null = null
      try {
        d = JSON.parse(raw) as SseFrame
      } catch {
        continue
      }
      if (d == null) {
        continue
      }
      if (typeof d.step === 'string') {
        x.onStep(d.step)
      } else if (d.reset === true) {
        x.onReset()
      } else if (typeof d.delta === 'string') {
        x.onDelta(d.delta)
      } else if (typeof d.answer === 'string') {
        x.onFinal(d as Answer)
      } else if (d.error != null && d.error !== '') {
        return d.error
      }
    }
  }
  return TEXT_NONE
}

/**
 * 多轮上下文:把已答成的问答对带回去(不是槽位齐了吐整份报告,是多轮按需调工具);
 * 只带最近 HISTORY_MAX 条,长会话不把上下文顶爆。重试时只取被重试那轮之前的历史。
 *
 * @param x 全部轮次与重试位。
 * @returns 带回服务端的消息串。
 */
export function historyOf(x: {
  /**
   * 全部轮次。
   */
  turns: Turn[]

  /**
   * 重试哪一轮;新一轮给 null。
   */
  at: number | null
}): Msg[] {
  let base = x.turns
  if (x.at != null) {
    base = x.turns.slice(0, x.at)
  }
  const out: Msg[] = []
  for (const turn of base) {
    if (turn.a == null) {
      continue
    }
    out.push({ role: ROLE_USER, content: turn.q })
    out.push({ role: ROLE_ASSISTANT, content: turn.a.answer })
  }
  return out.slice(-HISTORY_MAX)
}

/**
 * 稳定记忆:上一轮服务端 slots(文本 history 让模型读语义,slots 才是职业/身份/
 * 经验的稳定记忆)。每轮结果已含继承后的完整 slots,只需滚动带最近一份,
 * 不必在浏览器另造状态机。
 *
 * @param x 全部轮次与重试位。
 * @returns 最近一份 slots;一份都没有 = null。
 */
export function contextOf(x: {
  /**
   * 全部轮次。
   */
  turns: Turn[]

  /**
   * 重试哪一轮;新一轮给 null。
   */
  at: number | null
}): ChatSlots | null {
  let base = x.turns
  if (x.at != null) {
    base = x.turns.slice(0, x.at)
  }
  for (let i = base.length - 1; i >= 0; i -= 1) {
    const turn = base[i]
    if (turn != null && turn.a != null && turn.a.slots != null) {
      return turn.a.slots
    }
  }
  return null
}

/**
 * 最近一轮答复带的会话 ID(chat_logs.thread,首轮提问哈希不指向人;
 * 「复制这个 ID 发给你,你就能帮我分析这段对话」—— 2026-08-09 Frank)。
 *
 * @param x 全部轮次。
 * @returns 会话 ID;一轮都没落 = null。
 */
export function threadOf(x: {
  /**
   * 全部轮次。
   */
  turns: Turn[]
}): string | null {
  for (let i = x.turns.length - 1; i >= 0; i -= 1) {
    const turn = x.turns[i]
    if (turn != null && turn.a != null && turn.a.thread != null && turn.a.thread !== '') {
      return turn.a.thread
    }
  }
  return null
}

/**
 * 出处只列**答复真的用到的**(服务端 citeFacts 回读答复标的)。旧版全量倾倒
 * 24 条:用户问中介收费,出处里摆着 AB/ON/QC 的岗位数 —— 没一条与那句话有关,
 * 读者只会当噪音。**不做兜底全量**:标不上就是没用到。
 *
 * @param x 那条答复。
 * @returns 真用到且带出处的事实。
 */
export function citedFactsOf(x: {
  /**
   * 那条答复。
   */
  a: Answer
}): Fact[] {
  const out: Fact[] = []
  if (x.a.facts == null) {
    return out
  }
  for (const f of x.a.facts) {
    if (f.cited === true && f.evidence.url !== '') {
      out.push(f)
    }
  }
  return out
}

/**
 * Activity 面板的官方来源胶囊:cited 且外链的出处按 url 去重。
 *
 * @param x 落地的答复;没落 = null。
 * @returns 去重后的 {url, name} 清单。
 */
export function webSourcesOf(x: {
  /**
   * 落地的答复;没落 = null。
   */
  a: Answer | null
}): WebSource[] {
  const seen = new Set<string>()
  const out: WebSource[] = []
  if (x.a == null || x.a.facts == null) {
    return out
  }
  for (const f of x.a.facts) {
    if (f.cited !== true || isExtUrl({ url: f.evidence.url }) === false) {
      continue
    }
    if (seen.has(f.evidence.url)) {
      continue
    }
    seen.add(f.evidence.url)
    out.push({ url: f.evidence.url, name: srcNameOf({ url: f.evidence.url }) })
  }
  return out
}

/**
 * NOC → 人话职业名:复用 profile 域的热门职业表,不另开翻译表。该表少数标签带
 * 「中文名 / 英文缩写」(如 prof.job.psw)—— 塞进整句会撞站规禁「/」杂糅,
 * 取斜杠前半截;查不到的 NOC(热门集外)给 null,由调用方整条跳过,不瞎猜职业名。
 *
 * @param x 取词函数与职业码。
 * @returns 人话名;查不到 = null。
 */
export function nocTitleOf(x: {
  /**
   * 取词函数。
   */
  t: TFn

  /**
   * NOC 五位码。
   */
  code: string
}): string | null {
  for (const p of POPULAR_NOCS) {
    if (p.noc === x.code) {
      const head = x.t(p.key).split(TITLE_SLASH_SEP)[0]
      if (head == null) {
        return null
      }
      return head.trim()
    }
  }
  return null
}

/**
 * Activity 面板里的长期记忆。只读 users.profile —— 匿名会话的临时 slots 不冒充
 * 「已保存」;返回人话句子而不是字段码;未知 NOC 保留官方码,不猜职业名。
 *
 * @param x 登录态、档案与取词函数。
 * @returns 记忆句子。
 */
export function profileMemories(x: ExamplesIn): string[] {
  if (x.loggedIn === false) {
    return []
  }
  const out: string[] = []
  if (x.profile == null) {
    return out
  }
  const p = x.profile
  if (p.currentStatus != null && (STATUS_SLUGS as readonly string[]).includes(p.currentStatus)) {
    out.push(x.t('chat.mem.status', { value: x.t(PROF_ST_HEAD + p.currentStatus) }))
  }
  if (p.nocCodes != null) {
    let n = 0
    for (const code of p.nocCodes) {
      if (n >= MEM_NOC_MAX) {
        break
      }
      if (code == null || NOC5_RE.test(code) === false) {
        continue
      }
      n += 1
      const title = nocTitleOf({ t: x.t, code })
      let value = NOC_LABEL_HEAD + code
      if (title != null && title !== '') {
        value = title + NOC_WRAP_OPEN + NOC_LABEL_HEAD + code + NOC_WRAP_CLOSE
      }
      out.push(x.t('chat.mem.occ', { value }))
    }
  }
  if (p.clb != null) {
    out.push(x.t('chat.mem.clb', { value: p.clb }))
  }
  if (p.crs != null) {
    out.push(x.t('chat.mem.crs', { value: p.crs }))
  }
  const provs: string[] = []
  if (p.targetProvinces != null) {
    for (const code of p.targetProvinces) {
      if (provs.length >= MEM_PROV_MAX) {
        break
      }
      if (code != null && code !== '') {
        provs.push(x.t(PR_HEAD + code))
      }
    }
  }
  if (provs.length > 0) {
    out.push(x.t('chat.mem.prov', { value: provs.join(x.t('sep')) }))
  }
  if (p.pgwpMonthsLeft != null) {
    out.push(x.t('chat.mem.pgwp', { value: p.pgwpMonthsLeft }))
  }
  return out
}

/**
 * 空态示例句三态(D4,设计 §2 分批 A):① 匿名写死三句;② 注册未建档写死三句
 * (槽值示范);③ 已建档从真实档案生成,候选凑不满用②补位。候选优先级对齐真人
 * 33102 案例:PGWP 倒计时 → 职业×目标省(2 省起比对,1 省问有没有戏)→
 * 语言×目标省缺口。🔴 三个候选**全部要求职业名可解析并织进句里**:编排层只有
 * 档案「写方向」,没有「读方向」—— 句里无职业的首轮提问必撞 noOcc 闸;
 * occ 解析不出 → 候选整条跳过,由②档补位(②档句句自带职业)。
 *
 * @param x 登录态、档案与取词函数。
 * @returns 三条示例句。
 */
export function pickExamples(x: ExamplesIn): ExampleItem[] {
  if (x.loggedIn === false) {
    return [...EXAMPLES_ANON]
  }
  const cands: ExampleItem[] = []
  if (x.profile != null) {
    const p = x.profile
    const provs: string[] = []
    if (p.targetProvinces != null) {
      for (const code of p.targetProvinces) {
        if (code != null && code !== '') {
          provs.push(code)
        }
      }
    }
    let occ: NocOpt | null = null
    if (p.nocCodes != null) {
      for (const noc of p.nocCodes) {
        if (noc == null || noc === '') {
          continue
        }
        const title = nocTitleOf({ t: x.t, code: noc })
        if (title != null && title !== '') {
          occ = { noc, title }
          break
        }
      }
    }
    if (occ != null && p.pgwpMonthsLeft != null) {
      cands.push({ key: K_EX_PGWP, params: { title: occ.title, noc: occ.noc, m: p.pgwpMonthsLeft } })
    }
    const [prov0, prov1] = provs
    if (occ != null && prov0 != null && prov1 != null) {
      cands.push({
        key: K_EX_OCC_CMP,
        params: { noc: occ.noc, title: occ.title, prov: x.t(PR_HEAD + prov0), prov2: x.t(PR_HEAD + prov1) },
      })
    } else if (occ != null && prov0 != null) {
      cands.push({ key: K_EX_OCC_PROV, params: { noc: occ.noc, title: occ.title, prov: x.t(PR_HEAD + prov0) } })
    }
    if (occ != null && p.clb != null && prov0 != null) {
      cands.push({
        key: K_EX_CLB_PROV,
        params: { title: occ.title, noc: occ.noc, clb: p.clb, prov: x.t(PR_HEAD + prov0) },
      })
    }
  }
  const out = cands.slice(0, EXAMPLES_MAX)
  for (const r of EXAMPLES_REG) {
    if (out.length >= EXAMPLES_MAX) {
      break
    }
    out.push(r)
  }
  return out
}

/**
 * 埋点用短标签:取键最后一段('chat.ex.occProv' → 'occProv')。
 *
 * @param x 句模板的 i18n 键。
 * @returns 短标签。
 */
export function exampleKind(x: {
  /**
   * 句模板的 i18n 键。
   */
  key: string
}): string {
  const last = x.key.split(KEY_DOT).pop()
  if (last == null || last === '') {
    return x.key
  }
  return last
}

/**
 * 「先本地拨、后台跟投」与剪贴板这类静默口的点名件(与 account 域同名同义,
 * 各家一份):catch 里调它,静默是**点名的**,不是忘了处理。
 */
export function ignoreNetErr(): void {
  return
}

/**
 * 一轮的定点合并:带哪格改哪格(`in` 判在不在)。不用对象展开 —— 字段写全,
 * 九格逐一从底稿抄,补丁在上面逐格覆盖。
 *
 * @param x 底稿与补丁。
 * @returns 合并后的新一轮。
 */
export function turnWith(x: {
  /**
   * 底稿。
   */
  base: Turn

  /**
   * 补丁(带哪格改哪格)。
   */
  patch: TurnPatch
}): Turn {
  const next: Turn = {
    q: x.base.q,
    a: x.base.a,
    steps: x.base.steps,
    stream: x.base.stream,
    guide: x.base.guide,
    fault: x.base.fault,
    stepsOpen: x.base.stepsOpen,
    t0: x.base.t0,
    secs: x.base.secs,
  }
  if (x.patch.a !== undefined) {
    next.a = x.patch.a
  }
  if (x.patch.steps !== undefined) {
    next.steps = x.patch.steps
  }
  if (x.patch.stream !== undefined) {
    next.stream = x.patch.stream
  }
  if (x.patch.guide !== undefined) {
    next.guide = x.patch.guide
  }
  if (x.patch.fault !== undefined) {
    next.fault = x.patch.fault
  }
  if (x.patch.stepsOpen !== undefined) {
    next.stepsOpen = x.patch.stepsOpen
  }
  return next
}

/**
 * 给第 i 轮打补丁(函数式落格:并发安全,拿的永远是最新表)。
 *
 * @param x 落格、位置与补丁。
 * @returns 无。
 */
export function patchTurn(x: {
  /**
   * 轮次表落格。
   */
  setTurns: SetTurns

  /**
   * 哪一轮。
   */
  i: number

  /**
   * 补丁。
   */
  patch: TurnPatch
}): void {
  x.setTurns(function apply(prev: Turn[]): Turn[] {
    const out: Turn[] = []
    for (const [k, turn] of prev.entries()) {
      if (k === x.i) {
        out.push(turnWith({ base: turn, patch: x.patch }))
      } else {
        out.push(turn)
      }
    }
    return out
  })
}

/**
 * 终局补丁(答复 / 引导 / 故障都走这里)。做**两件只该做一次**的事:
 * ① 结算真实耗时 —— 从这一轮自己的 t0 算,不用全局秒数(重试时它已被清零);
 * ② stepsOpen 归 null = 轨迹回到默认收起。等待期间用户手点开过也一样收:
 * 那是**上一阶段**的选择,答复才是他现在要读的。至少记 1s:不足一秒显示 0s
 * 像没查过,而每一轮都真的打了后端。
 *
 * @param x 落格、位置与补丁。
 * @returns 无。
 */
export function finishTurn(x: {
  /**
   * 轮次表落格。
   */
  setTurns: SetTurns

  /**
   * 哪一轮。
   */
  i: number

  /**
   * 终局补丁。
   */
  patch: TurnPatch
}): void {
  x.setTurns(function apply(prev: Turn[]): Turn[] {
    const out: Turn[] = []
    for (const [k, turn] of prev.entries()) {
      if (k !== x.i) {
        out.push(turn)
        continue
      }
      const merged = turnWith({ base: turn, patch: x.patch })
      merged.stepsOpen = null
      merged.secs = Math.max(1, Math.round((Date.now() - turn.t0) / SECS_TICK_MS))
      out.push(merged)
    }
    return out
  })
}

/**
 * 造发话手柄(新一轮或重试):POST /api/consult/chat,流式(SSE)与 JSON 两条路。
 * 流式:轨迹逐条、正文按句、撤回清屏不留半段(服务端撤回的理由恰是「这一稿要被
 * 换掉」);终局一律走 finishTurn。JSON:引导码渲助手气泡并把光标还回输入框,
 * 认得的故障码原样用、认不得的落 net(busy 走 JSON 是真会发生的:纯联邦问句
 * 没有「认出职业」那一格,流压根没开)。
 *
 * @param x 本轮状态与全部落格。
 * @returns 发话手柄。
 */
export function makeSend(x: {
  /**
   * 当前轮次表(取历史与稳定记忆)。
   */
  turns: Turn[]

  /**
   * 有一轮在跑(闸:同时只可能有一轮)。
   */
  busy: boolean

  /**
   * 界面语言(服务端按它写轨迹与答复)。
   */
  lang: ChatLang

  /**
   * 取词函数(引导话术)。
   */
  t: TFn

  /**
   * 轮次表落格。
   */
  setTurns: SetTurns

  /**
   * 输入框落格(发出即清)。
   */
  setInput: (v: string) => void

  /**
   * 秒数落格(新一轮清零重计)。
   */
  setSecs: (v: number) => void

  /**
   * 忙态落格。
   */
  setBusy: (v: boolean) => void

  /**
   * 贴底引用(发话即回贴底)。
   */
  stick: MutBool

  /**
   * 输入框引用(清高度、引导轮还光标)。
   */
  taEl: React.RefObject<HTMLTextAreaElement | null>

  /**
   * 答复落地后重查登录档案(空态例句跟着换)。
   */
  refreshMe: () => void
}): (s: SendIn) => void {
  return function send(s: SendIn): void {
    void sendNow(x, s)
  }
}

/**
 * makeSend 的真身(async;外壳只是把 Promise 收掉)。
 *
 * @param x makeSend 的依赖包。
 * @param s 要发的句与重试位。
 * @returns 无。
 */
// eslint-disable-next-line local/one-parameter -- 与 makeSend 成对的内部真身:依赖包与发话参数天然两包,合并只是造第三个壳
async function sendNow(x: Parameters<typeof makeSend>[0], s: SendIn): Promise<void> {
  const q = s.q.trim()
  if (q === '' || x.busy) {
    return
  }
  const history = historyOf({ turns: x.turns, at: s.at })
  const context = contextOf({ turns: x.turns, at: s.at })
  let idx = x.turns.length
  if (s.at != null) {
    idx = s.at
  }
  x.setTurns(function seed(prev: Turn[]): Turn[] {
    if (s.at == null) {
      return prev.concat(blankTurnOf({ q }))
    }
    const out: Turn[] = []
    for (const [k, turn] of prev.entries()) {
      if (k === s.at) {
        out.push(blankTurnOf({ q }))
      } else {
        out.push(turn)
      }
    }
    return out
  })
  x.setInput(TEXT_NONE)
  if (x.taEl.current != null) {
    x.taEl.current.style.height = H_AUTO
  }
  x.setSecs(0)
  x.setBusy(true)
  x.stick.current = true
  track(EV_SUBMIT)
  try {
    const r = await fetch(URL_CHAT, {
      method: METHOD_POST,
      credentials: CRED_INCLUDE,
      headers: { [HDR_CONTENT_TYPE]: MIME_JSON },
      body: JSON.stringify({ text: q, lang: x.lang, history, context }),
    })
    let ctype = TEXT_NONE
    const rawType = r.headers.get(HDR_CONTENT_TYPE_LOW)
    if (rawType != null) {
      ctype = rawType
    }
    if (r.ok && ctype.includes(MIME_SSE) && r.body != null) {
      await streamedTurn({ x, idx, body: r.body })
    } else {
      await jsonTurn({ x, idx, r })
    }
  } catch {
    finishTurn({ setTurns: x.setTurns, i: idx, patch: { fault: FAULT_NET } })
  }
  x.setBusy(false)
}

/**
 * 一轮的流式分支:轨迹逐条、正文按句、撤回清屏不留半段(服务端撤回的理由恰是
 * 「这一稿要被换掉」);终局一律走 finishTurn(结算耗时 + 收起轨迹)。
 * 🔴 最终以 answer 那条为准:补位/重截都发生在最后一步,不拿累计增量当定稿 ——
 * 只有连 answer 都没有时才用增量兜底。
 *
 * @param g 依赖包、轮位与响应流。
 * @returns 无。
 */
async function streamedTurn(g: {
  /**
   * makeSend 的依赖包。
   */
  x: Parameters<typeof makeSend>[0]

  /**
   * 这一轮的位置。
   */
  idx: number

  /**
   * SSE 响应体。
   */
  body: ReadableStream<Uint8Array>
}): Promise<void> {
  let acc = TEXT_NONE
  let final: Answer | null = null
  const steps: string[] = []
  const err = await readSse({
    body: g.body,
    onDelta: function onDelta(d: string): void {
      acc += d
      patchTurn({ setTurns: g.x.setTurns, i: g.idx, patch: { stream: acc } })
    },
    onFinal: function onFinal(a: Answer): void {
      final = a
    },
    onStep: function onStep(step: string): void {
      steps.push(step)
      patchTurn({ setTurns: g.x.setTurns, i: g.idx, patch: { steps: steps.slice() } })
    },
    onReset: function onReset(): void {
      acc = TEXT_NONE
      patchTurn({ setTurns: g.x.setTurns, i: g.idx, patch: { stream: TEXT_NONE } })
    },
  })
  if (err !== '') {
    const guideKey = GUIDE_KEY[err]
    if (guideKey != null) {
      finishTurn({ setTurns: g.x.setTurns, i: g.idx, patch: { guide: g.x.t(guideKey) } })
    } else if (isFault(err)) {
      finishTurn({ setTurns: g.x.setTurns, i: g.idx, patch: { fault: err } })
    } else {
      finishTurn({ setTurns: g.x.setTurns, i: g.idx, patch: { fault: FAULT_LLM } })
    }
  } else if (final != null) {
    finishTurn({ setTurns: g.x.setTurns, i: g.idx, patch: { a: final } })
    track(EV_ANSWER)
    g.x.refreshMe()
  } else if (acc !== '') {
    finishTurn({ setTurns: g.x.setTurns, i: g.idx, patch: { a: { answer: acc } } })
    track(EV_ANSWER)
  } else {
    finishTurn({ setTurns: g.x.setTurns, i: g.idx, patch: { fault: FAULT_LLM } })
  }
}

/**
 * 一轮的 JSON 分支:引导码渲助手气泡并把光标还回输入框(引导 = 该他接着说);
 * 认得的故障码原样用、认不得的落 net(白名单漏一个码 = 把「系统繁忙」说成
 * 「没连上服务」;busy 走 JSON 是真会发生的:纯联邦问句没有「认出职业」那一格,
 * 流压根没开)。
 *
 * @param g 依赖包、轮位与响应。
 * @returns 无。
 */
async function jsonTurn(g: {
  /**
   * makeSend 的依赖包。
   */
  x: Parameters<typeof makeSend>[0]

  /**
   * 这一轮的位置。
   */
  idx: number

  /**
   * 非流式响应。
   */
  r: Response
}): Promise<void> {
  let d: Answer | null = null
  try {
    d = await g.r.json() as Answer
  } catch {
    d = null
  }
  let code = TEXT_NONE
  const dAsErr = d as ErrBody | null
  if (dAsErr != null && dAsErr.error != null) {
    code = String(dAsErr.error)
  }
  if (g.r.ok === false || d == null || code !== '') {
    const guideKey = GUIDE_KEY[code]
    if (guideKey != null) {
      finishTurn({ setTurns: g.x.setTurns, i: g.idx, patch: { guide: g.x.t(guideKey) } })
      if (g.x.taEl.current != null) {
        g.x.taEl.current.focus()
      }
    } else if (isFault(code)) {
      finishTurn({ setTurns: g.x.setTurns, i: g.idx, patch: { fault: code } })
    } else {
      finishTurn({ setTurns: g.x.setTurns, i: g.idx, patch: { fault: FAULT_NET } })
    }
  } else {
    let steps: string[] = []
    if (d.activity != null) {
      steps = d.activity
    }
    finishTurn({ setTurns: g.x.setTurns, i: g.idx, patch: { a: d, steps } })
    track(EV_ANSWER)
    g.x.refreshMe()
  }
}

/**
 * 每轮唯一交互块的数据(答复轮与引导轮共用 —— 2026-08-09 Frank 实撞两件:
 * ①「问题怎么每次都是这三个」:问过的一律不再出,全线程去重,出完就没了;
 * ②「按我的情况判一判」没认出职业时 100% 撞 noOcc —— 没 noc 就不生成这条,
 * 不发我们明知会失败的 chip;引导轮也挂这张卡,总有出口。
 * 🔴 示例只给引导轮当出口,答复轮一条都不补(答复下面再摆一遍就是同屏重复;
 * 引导轮不一样:三条示例每条都带着职业,正是反问要的答案)。
 *
 * @param x 这一轮、全线程、空态示例与取词函数。
 * @returns 选项卡数据;一条都没有 = null(输入框就在下面,不出废话)。
 */
export function optionsOf(x: {
  /**
   * 这一轮。
   */
  turn: Turn

  /**
   * 全线程(去重用)。
   */
  turns: Turn[]

  /**
   * 空态示例句(引导轮补位)。
   */
  examples: ExampleItem[]

  /**
   * 取词函数。
   */
  t: TFn
}): AnswerOptions | null {
  let real: string[] = []
  if (x.turn.a != null && x.turn.a.followups != null) {
    real = x.turn.a.followups
  }
  const asked = new Set<string>()
  for (const turn of x.turns) {
    asked.add(turn.q)
  }
  let canVerdict = false
  if (x.turn.a != null && x.turn.a.slots != null && x.turn.a.slots.noc != null && x.turn.a.slots.noc !== '') {
    canVerdict = true
  }
  const pad: string[] = []
  if (x.turn.a != null) {
    if (canVerdict) {
      pad.push(x.t('chat.padVerdict'))
    }
  } else {
    for (const ex of x.examples) {
      pad.push(x.t(ex.key, ex.params))
    }
  }
  const merged: string[] = [...real]
  for (const q of pad) {
    if (asked.has(q) || real.includes(q)) {
      continue
    }
    merged.push(q)
  }
  const items: AnswerOption[] = []
  for (const q of merged.slice(0, OPTIONS_MAX)) {
    items.push({ label: q, sendText: q })
  }
  if (x.turn.a != null && x.turn.a.options != null && x.turn.a.options.items.length > 0) {
    return x.turn.a.options
  }
  if (items.length === 0) {
    return null
  }
  let reason = x.t('chat.try')
  if (real.length > 0) {
    reason = x.t('chat.followups')
  }
  return { reason, items }
}

/**
 * 造历史区的滚动手柄:离底不足 STICK_SLACK 算贴底,新内容来了跟着滚 ——
 * 用户往回翻看旧答复时别把他甩到底。
 *
 * @param x 贴底引用。
 * @returns 滚动手柄。
 */
export function makeThreadScroll(x: {
  /**
   * 贴底引用。
   */
  stick: MutBool
}): (e: ThreadScrollEvent) => void {
  return function onScroll(e: ThreadScrollEvent): void {
    const el = e.currentTarget
    x.stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_SLACK
  }
}

/**
 * 造输入框键盘手柄:Enter 发送 / Shift+Enter 换行(IME 组合中不发);
 * 触屏上 Enter 是换行不是发送(手机上写三句话被 Enter 截断很恼人),
 * ⌘/Ctrl+Enter 仍强制发送。
 *
 * @param x 触屏引用、现输入与发话手柄。
 * @returns 键盘手柄。
 */
export function makeComposerKey(x: {
  /**
   * 触屏引用。
   */
  coarse: MutBool

  /**
   * 输入框现值。
   */
  input: string

  /**
   * 发话手柄。
   */
  send: (s: SendIn) => void
}): (e: ComposerKeyEvent) => void {
  return function onKeyDown(e: ComposerKeyEvent): void {
    if (e.key !== KEY_ENTER) {
      return
    }
    if (e.nativeEvent.isComposing === true) {
      return
    }
    if (e.shiftKey) {
      return
    }
    if (x.coarse.current === false || e.metaKey || e.ctrlKey) {
      e.preventDefault()
      x.send({ q: x.input, at: null })
    }
  }
}

/**
 * 造输入框改值手柄:随内容长高到 TA_H_MAX 封顶。
 *
 * @param x 输入框落格。
 * @returns 改值手柄。
 */
export function makeComposerChange(x: {
  /**
   * 输入框落格。
   */
  setInput: (v: string) => void
}): (e: ComposerChangeEvent) => void {
  return function onChange(e: ComposerChangeEvent): void {
    x.setInput(e.target.value)
    e.target.style.height = H_AUTO
    e.target.style.height = Math.min(e.target.scrollHeight, TA_H_MAX) + PX
  }
}

/**
 * 造输入框首次聚焦手柄:chat-open 只打第一次(每次点回输入框都算会把口径撑爆)。
 *
 * @param x 已打过的引用。
 * @returns 聚焦手柄。
 */
export function makeComposerFocus(x: {
  /**
   * 已打过 chat-open 的引用。
   */
  opened: MutBool
}): () => void {
  return function onFocus(): void {
    if (x.opened.current) {
      return
    }
    x.opened.current = true
    track(EV_OPEN)
  }
}

/**
 * 造复制会话 ID 的手柄(1.5s 回弹;权限拒了不弹错)。
 *
 * @param x 会话 ID 与反馈落格。
 * @returns 复制手柄。
 */
export function makeCopyThread(x: {
  /**
   * 会话 ID;没有 = null(钮根本不渲)。
   */
  thread: string | null

  /**
   * 反馈落格。
   */
  setThCopied: (v: boolean) => void
}): () => void {
  return function copyThread(): void {
    if (x.thread == null || navigator.clipboard == null) {
      return
    }
    navigator.clipboard.writeText(x.thread).then(function flash(): void {
      x.setThCopied(true)
      setTimeout(function unflash(): void {
        x.setThCopied(false)
      }, TH_COPIED_MS)
    }).catch(ignoreNetErr)
  }
}

/**
 * 造复制答复的手柄(1.8s 回弹;用户拒了剪贴板权限不弹错,钮保持原样)。
 *
 * @param x 答复正文与反馈落格。
 * @returns 复制手柄。
 */
export function makeCopyAnswer(x: {
  /**
   * 答复正文。
   */
  text: string

  /**
   * 反馈落格。
   */
  setCopied: (v: boolean) => void
}): () => void {
  return function copyAnswer(): void {
    if (navigator.clipboard == null) {
      return
    }
    navigator.clipboard.writeText(x.text).then(function flash(): void {
      x.setCopied(true)
      setTimeout(function unflash(): void {
        x.setCopied(false)
      }, COPIED_MS)
    }).catch(ignoreNetErr)
  }
}

/**
 * 造赞/踩手柄:点过就不再收(图标定选中态,不给人反复点的机会);只发 good/bad
 * 两个枚举,不收自由文本。走已有 funnel_events,零新表零 DDL。
 *
 * @param x 现选态、落格与这一枚代表哪个。
 * @returns 点选手柄。
 */
export function makeRate(x: {
  /**
   * 现选态;空串 = 没点过。
   */
  vote: string

  /**
   * 选态落格。
   */
  setVote: (v: 'good' | 'bad') => void

  /**
   * 这一枚代表哪个。
   */
  kind: 'good' | 'bad'
}): () => void {
  return function rate(): void {
    if (x.vote !== '') {
      return
    }
    x.setVote(x.kind)
    track(EV_FEEDBACK, { kind: x.kind })
  }
}

/**
 * 造一枚「把布尔格拨成定值」的通用小手柄(出处开合、二次确认亮/熄这类)。
 * 与 account 域同名同义,各家一份。
 *
 * @param x 拨哪格、拨成什么。
 * @returns 点一下拨过去的手柄。
 */
export function makeFlagSet(x: {
  /**
   * 拨哪格。
   */
  set: (v: boolean) => void

  /**
   * 拨成什么。
   */
  v: boolean
}): () => void {
  return function setFlag(): void {
    x.set(x.v)
  }
}

/**
 * 钳制面板框:不许拖出视口、不许小到看不见内容。resize 与 drag 共用同一道闸,
 * 也用在读 localStorage 时 —— 上次存的是 1600 宽,这次换了台小屏笔记本,
 * 不钳一下面板就有一半在视口外。
 *
 * @param x 要钳的框。
 * @returns 钳好的框。
 */
export function clampBoxOf(x: {
  /**
   * 要钳的框。
   */
  b: Box
}): Box {
  const de = document.documentElement
  const w = Math.max(PANEL_W_MIN, Math.min(x.b.w, de.clientWidth))
  const h = Math.max(PANEL_H_MIN, Math.min(x.b.h, de.clientHeight))
  return {
    w,
    h,
    x: Math.max(0, Math.min(x.b.x, de.clientWidth - w)),
    y: Math.max(0, Math.min(x.b.y, de.clientHeight - h)),
  }
}

/**
 * 钳制启动器位置(按那颗钮的边长算,不按带提示条的整条 dock ——
 * 提示条在自定义位隐藏,拿带条的宽度钳会让钮够不到屏幕右缘)。
 *
 * @param x 要钳的位置与钮的宽高。
 * @returns 钳好的位置。
 */
export function clampDockOf(x: ClampDockIn): DockPos {
  const de = document.documentElement
  return {
    x: Math.max(EDGE_GAP, Math.min(x.p.x, de.clientWidth - x.w - EDGE_GAP)),
    y: Math.max(EDGE_GAP, Math.min(x.p.y, de.clientHeight - x.h - EDGE_GAP)),
  }
}

/**
 * 有吸底动作条的路由才开避让测量。为什么要这道闸而不是全站都测:职位板列表页
 * DOM 上千个 div,扫不到条子就每帧白扫一遍;详情页只有 39 个,可以忽略。
 * 两条:职位详情页(ApplyBar)、/plan/* 四张评估页(.quizBar 手机上 fixed)。
 *
 * @param x 当前路径。
 * @returns 要测 = true。
 */
export function hasBottomBarOf(x: {
  /**
   * 当前路径。
   */
  path: string
}): boolean {
  return JOBS_DETAIL_RE.test(x.path) || x.path.startsWith(PLAN_HEAD)
}

/**
 * 找页面的吸底动作条。按**特征**找不按 class 找:ApplyBar / quizBar 都是别的
 * 组件的内联样式,写死选择器等着被改坏;特征(bottom:0 的 sticky|fixed 块)
 * 稳定得多,以后新加的底栏自动被躲开。只扫 main 内 —— 挂件自己挂在 main 外,
 * 天然不会把自己认成底栏。生产实测:详情页 39 个 div 全扫 0.3ms;找到后缓存,
 * 滚动时只剩一次 getBoundingClientRect。
 *
 * @param x 上次找到的缓存。
 * @returns 条子;没有 = null。
 */
export function findBarOf(x: {
  /**
   * 上次找到的缓存;还连着就直接用。
   */
  cached: HTMLElement | null
}): HTMLElement | null {
  if (x.cached != null && x.cached.isConnected) {
    return x.cached
  }
  for (const el of document.querySelectorAll<HTMLElement>(BAR_SCAN_SEL)) {
    const s = getComputedStyle(el)
    const stuck = s.position === POS_STICKY || s.position === POS_FIXED
    if (s.bottom === BOTTOM_ZERO && stuck && el.offsetHeight > BAR_H_MIN) {
      return el
    }
  }
  return null
}

/**
 * 这条路由的手机端连启动器圆球也不出吗(走查 #298:56×56 fixed 在 375 视口永久
 * 盖住右下角内容,顾问在评估/处境两条动线上本就不导流;职位页照旧。面板本身
 * 不受影响:页面里的「问 AI」入口 dispatch 事件仍能打开)。
 *
 * @param x 当前路径。
 * @returns 窄屏藏球 = true。
 */
export function isNarrowOffPath(x: {
  /**
   * 当前路径。
   */
  path: string
}): boolean {
  return NARROW_OFF_RE.test(x.path)
}

/**
 * 造打开面板的手柄:点开过 = 轻提示永久不再出(HINT_KEY 写成 MAX)。
 *
 * @param x 三个落格。
 * @returns 打开手柄。
 */
export function makeShow(x: {
  /**
   * 内容挂载落格(打开过一次就不再卸载)。
   */
  setMounted: (v: boolean) => void

  /**
   * 面板开合落格。
   */
  setOpen: (v: boolean) => void

  /**
   * 轻提示落格。
   */
  setHint: (v: boolean) => void
}): () => void {
  return function show(): void {
    x.setMounted(true)
    x.setOpen(true)
    x.setHint(false)
    track(EV_W_OPEN)
    try {
      localStorage.setItem(HINT_KEY, String(HINT_MAX))
    } catch {
      ignoreNetErr()
    }
  }
}

/**
 * 造关闭面板的手柄。
 *
 * @param x 面板开合落格。
 * @returns 关闭手柄。
 */
export function makeHide(x: {
  /**
   * 面板开合落格。
   */
  setOpen: (v: boolean) => void
}): () => void {
  return function hide(): void {
    x.setOpen(false)
    track(EV_W_CLOSE)
  }
}

/**
 * 造最小化手柄(与关闭同效,埋点分开 —— 最小化是「等会儿回来」,关闭是「不要了」)。
 *
 * @param x 面板开合落格。
 * @returns 最小化手柄。
 */
export function makeMinimize(x: {
  /**
   * 面板开合落格。
   */
  setOpen: (v: boolean) => void
}): () => void {
  return function minimize(): void {
    x.setOpen(false)
    track(EV_W_MIN)
  }
}

/**
 * 造桌面全屏开合手柄(偏好落 localStorage:愿意在小窗里读长答复的人每次都愿意)。
 *
 * @param x 全屏落格。
 * @returns 开合手柄。
 */
export function makeToggleMax(x: {
  /**
   * 全屏落格(函数式:翻转现值)。
   */
  setMax: (f: (v: boolean) => boolean) => void
}): () => void {
  return function toggleMax(): void {
    x.setMax(function flip(v: boolean): boolean {
      const n = v === false
      try {
        let saved = LS_OFF
        if (n) {
          saved = LS_ON
        }
        localStorage.setItem(MAX_LS_KEY, saved)
      } catch {
        ignoreNetErr()
      }
      if (n) {
        track(EV_W_MAX)
      } else {
        track(EV_W_RESTORE)
      }
      return n
    })
  }
}

/**
 * 造真清空手柄:换 ChatBox 的 key 让它整个重挂 —— 对话本就不落库、刷新即丢,
 * 「清空」就是清 state,而 remount 是 React 里最省的清 state 手段。
 *
 * @param x 两个落格。
 * @returns 清空手柄。
 */
export function makeDoReset(x: {
  /**
   * 重挂计数落格(函数式自增)。
   */
  setResetN: (f: (n: number) => number) => void

  /**
   * 二次确认落格(清完熄掉)。
   */
  setAskReset: (v: boolean) => void
}): () => void {
  return function doReset(): void {
    x.setResetN(function bump(n: number): number {
      return n + 1
    })
    x.setAskReset(false)
    track(EV_W_RESET)
  }
}

/**
 * 造重置钮的点击手柄:第一下亮二次确认(误清一整轮问答不可逆,但为这个弹模态框
 * 又太重),第二下真清。
 *
 * @param x 现确认态、真清手柄与确认落格。
 * @returns 点击手柄。
 */
export function makeResetStep(x: {
  /**
   * 二次确认亮着。
   */
  askReset: boolean

  /**
   * 真清手柄。
   */
  doReset: () => void

  /**
   * 二次确认落格。
   */
  setAskReset: (v: boolean) => void
}): () => void {
  return function resetStep(): void {
    if (x.askReset) {
      x.doReset()
      return
    }
    x.setAskReset(true)
  }
}

/**
 * 造启动器的点击手柄:拖完松手的那一下 click 要压掉,不然拖完必弹面板。
 *
 * @param x 拖动判定引用与打开手柄。
 * @returns 点击手柄。
 */
export function makeDockClick(x: {
  /**
   * 这一轮指针是拖动。
   */
  dragged: MutBool

  /**
   * 打开面板。
   */
  show: () => void
}): () => void {
  return function dockClick(): void {
    if (x.dragged.current) {
      x.dragged.current = false
      return
    }
    x.show()
  }
}

/**
 * 造启动器拖动的按下手柄(2026-08-06 Frank「图标可自由拖动到任意位置,防挡内容」):
 * 位移超过 DRAG_SLOP 才算拖;监听挂 window(指针拖出钮外也要跟得住);
 * 松手落盘 localStorage(隐私模式:这次生效,下次不记得)。
 *
 * @param x 启动器引用、拖动判定引用与位置落格。
 * @returns 按下手柄。
 */
export function makeDockDown(x: {
  /**
   * 启动器 DOM 引用。
   */
  dockEl: React.RefObject<HTMLDivElement | null>

  /**
   * 这一轮指针是拖动(松手后压掉那次 click)。
   */
  dragged: MutBool

  /**
   * 位置落格。
   */
  setDockPos: (v: DockPos) => void
}): (e: React.PointerEvent) => void {
  return function dockDown(e: React.PointerEvent): void {
    if (e.pointerType === POINTER_MOUSE && e.button !== 0) {
      return
    }
    const d = x.dockEl.current
    if (d == null) {
      return
    }
    const r = d.getBoundingClientRect()
    const s = { px: e.clientX, py: e.clientY, x: r.left, y: r.top }
    x.dragged.current = false
    let last: DockPos | null = null
    function onMove(ev: PointerEvent): void {
      const dx = ev.clientX - s.px
      const dy = ev.clientY - s.py
      if (x.dragged.current === false && Math.hypot(dx, dy) < DRAG_SLOP) {
        return
      }
      x.dragged.current = true
      last = clampDockOf({ p: { x: s.x + dx, y: s.y + dy }, w: DOCK_BTN, h: DOCK_BTN })
      x.setDockPos(last)
    }
    function onUp(): void {
      window.removeEventListener(EVT_POINTERMOVE, onMove)
      window.removeEventListener(EVT_POINTERUP, onUp)
      window.removeEventListener(EVT_POINTERCANCEL, onUp)
      document.body.style.userSelect = TEXT_NONE
      if (last == null) {
        return
      }
      try {
        localStorage.setItem(DOCK_LS_KEY, JSON.stringify(last))
      } catch {
        ignoreNetErr()
      }
      track(EV_W_DOCK_DRAG)
    }
    document.body.style.userSelect = SELECT_NONE
    window.addEventListener(EVT_POINTERMOVE, onMove)
    window.addEventListener(EVT_POINTERUP, onUp)
    window.addEventListener(EVT_POINTERCANCEL, onUp)
  }
}

/**
 * 造缩放/拖动把手的按下手柄工厂:dir='move' 抓标题栏整体拖,其余按方向拉边
 * (拉左/上边时对边钉住:撞到最小值后左沿不许再走,否则面板被「推着」横向漂移 ——
 * 缩到底还在动是手感最糟的那种 resize)。每帧都过 clampBoxOf —— 钳制发生在
 * **过程中**不是松手时,否则拖出视口再回弹会闪。监听挂 window 不挂元素:
 * 指针拖出面板外(缩放时必然会)也要跟得住。
 *
 * @param x 面板引用、最新框引用与框落格。
 * @returns 按方向造按下手柄的工厂。
 */
export function makeGripDownOf(x: {
  /**
   * 面板 DOM 引用。
   */
  panelEl: React.RefObject<HTMLDivElement | null>

  /**
   * 拖拽过程中的最新框(pointerup 时落盘,不靠 setState 回调)。
   */
  lastBox: MutBox

  /**
   * 框落格。
   */
  setBox: (v: Box) => void
}): (d: GrabDir) => (e: React.PointerEvent) => void {
  return function gripDownOf(d: GrabDir): (e: React.PointerEvent) => void {
    return function gripDown(e: React.PointerEvent): void {
      if (x.panelEl.current == null || e.button !== 0) {
        return
      }
      e.preventDefault()
      const r = x.panelEl.current.getBoundingClientRect()
      const s = { px: e.clientX, py: e.clientY, x: r.left, y: r.top, w: r.width, h: r.height }
      function onMove(ev: PointerEvent): void {
        const nb = clampBoxOf({ b: grabbedBoxOf({ s, d, dx: ev.clientX - s.px, dy: ev.clientY - s.py }) })
        x.lastBox.current = nb
        x.setBox(nb)
      }
      function onUp(): void {
        window.removeEventListener(EVT_POINTERMOVE, onMove)
        window.removeEventListener(EVT_POINTERUP, onUp)
        window.removeEventListener(EVT_POINTERCANCEL, onUp)
        document.body.style.userSelect = TEXT_NONE
        try {
          if (x.lastBox.current != null) {
            localStorage.setItem(BOX_LS_KEY, JSON.stringify(x.lastBox.current))
          }
        } catch {
          ignoreNetErr()
        }
        if (d === GRAB_MOVE) {
          track(EV_W_DRAG)
        } else {
          track(EV_W_RESIZE)
        }
      }
      document.body.style.userSelect = SELECT_NONE
      window.addEventListener(EVT_POINTERMOVE, onMove)
      window.addEventListener(EVT_POINTERUP, onUp)
      window.addEventListener(EVT_POINTERCANCEL, onUp)
    }
  }
}

/**
 * 拖动/缩放中的下一帧框(纯几何):move 整体平移;拉边改宽高,拉左/上边对边钉住 ——
 * 撞到最小值后左沿不许再走,否则面板被「推着」横向漂移(缩到底还在动是手感最糟的
 * 那种 resize)。钳制由调用方过 clampBoxOf。
 *
 * @param g 起始几何、方向与位移。
 * @returns 未钳制的下一帧框。
 */
function grabbedBoxOf(g: {
  /**
   * 按下时的起始几何。
   */
  s: GrabStart

  /**
   * 方向档。
   */
  d: GrabDir

  /**
   * 横向位移。
   */
  dx: number

  /**
   * 纵向位移。
   */
  dy: number
}): Box {
  let bx = g.s.x
  let by = g.s.y
  let bw = g.s.w
  let bh = g.s.h
  if (g.d === GRAB_MOVE) {
    return { x: bx + g.dx, y: by + g.dy, w: bw, h: bh }
  }
  if (g.d.includes(DIR_E)) {
    bw = g.s.w + g.dx
  }
  if (g.d.includes(DIR_S)) {
    bh = g.s.h + g.dy
  }
  if (g.d.includes(DIR_W)) {
    bw = g.s.w - g.dx
    if (bw < PANEL_W_MIN) {
      bx = g.s.x + g.s.w - PANEL_W_MIN
    } else {
      bx = g.s.x + g.dx
    }
  }
  if (g.d.includes(DIR_N)) {
    bh = g.s.h - g.dy
    if (bh < PANEL_H_MIN) {
      by = g.s.y + g.s.h - PANEL_H_MIN
    } else {
      by = g.s.y + g.dy
    }
  }
  return { x: bx, y: by, w: bw, h: bh }
}

/**
 * 造标题栏按下手柄:桌面非全屏 = 拖动把手;按在钮上时不拖(不然点「收起」会先
 * 被当成一次 0 像素的拖动)。
 *
 * @param x 桌面档、全屏档与把手工厂。
 * @returns 按下手柄。
 */
export function makeHeadDown(x: {
  /**
   * 桌面档。
   */
  wide: boolean

  /**
   * 全屏档(没得拖)。
   */
  max: boolean

  /**
   * 把手工厂(dir 固定 move)。
   */
  gripDownOf: (d: GrabDir) => (e: React.PointerEvent) => void
}): (e: React.PointerEvent) => void {
  return function headDown(e: React.PointerEvent): void {
    if (x.wide === false || x.max) {
      return
    }
    const target = e.target as HTMLElement
    if (target.closest(BTN_SEL) != null) {
      return
    }
    x.gripDownOf(GRAB_MOVE)(e)
  }
}

/**
 * 面板的内联样式合成:避让距离(--clB 变量)+ 看门狗强制显示 + 桌面自定义框。
 * 自定义框只在**桌面 + 非全屏**时写成内联(手机档一个字都不写 —— 内联赢 @media,
 * 写了就是把桌面尺寸泄漏到手机的 100dvh 全屏档上)。
 *
 * @param x 避让距离、强制档与自定义框。
 * @returns 内联样式。
 */
export function panelStyleOf(x: {
  /**
   * 离视口底的实测距离(px)。
   */
  clear: number

  /**
   * 看门狗强制显示档。
   */
  force: boolean

  /**
   * 生效中的自定义框;默认档 = null。
   */
  box: Box | null
}): React.CSSProperties {
  const st: React.CSSProperties = {}
  const bag = st as Record<string, string | number>
  bag[CLB_VAR] = x.clear + PX
  if (x.force) {
    st.display = DISPLAY_FLEX
  }
  if (x.box != null) {
    st.left = x.box.x
    st.top = x.box.y
    st.right = POS_AUTO
    st.bottom = POS_AUTO
    st.width = x.box.w
    st.height = x.box.h
  }
  return st
}

/**
 * 启动器的内联样式合成:拖过用自定义位(left/top),没拖过用避让距离变量。
 *
 * @param x 自定义位与避让距离。
 * @returns 内联样式。
 */
export function dockStyleOf(x: {
  /**
   * 自定义位;没拖过 = null。
   */
  dockPos: DockPos | null

  /**
   * 离视口底的实测距离(px)。
   */
  clear: number
}): React.CSSProperties {
  const st: React.CSSProperties = {}
  if (x.dockPos != null) {
    st.left = x.dockPos.x
    st.top = x.dockPos.y
    st.right = POS_AUTO
    st.bottom = POS_AUTO
    return st
  }
  const bag = st as Record<string, string | number>
  bag[CLB_VAR] = x.clear + PX
  return st
}

/**
 * 效果体:触屏判定(coarse 引用只在挂载时定一次)。
 *
 * @param x 触屏引用。
 * @returns 效果体(无清理)。
 */
export function makeCoarseEffect(x: {
  /**
   * 触屏引用。
   */
  coarse: MutBool
}): () => void {
  return function detectCoarse(): void {
    x.coarse.current = window.matchMedia(COARSE_MQ).matches
  }
}

/**
 * 重查登录态与档案(D4:空态示例句三态动态化;复用账户页同款端点,不新开接口)。
 * 匿名/取数失败一律留在 loggedIn=false —— 绝不因为这一步网络失败让空态开天窗。
 *
 * @param x 登录态落格。
 * @returns 重查手柄。
 */
export function makeLoadMe(x: {
  /**
   * 登录态落格。
   */
  setMe: (v: ChatMe) => void
}): () => void {
  return function loadMe(): void {
    void loadMeNow(x.setMe)
  }
}

/**
 * makeLoadMe 的真身(async;外壳只把 Promise 收掉)。
 *
 * @param setMe 登录态落格。
 * @returns 无。
 */
async function loadMeNow(setMe: (v: ChatMe) => void): Promise<void> {
  try {
    const r = await fetch(URL_ME, { credentials: CRED_INCLUDE })
    const d = await r.json() as MeBody
    if (d == null || d.user == null) {
      setMe({ loggedIn: false, profile: null })
      return
    }
    let profile: ChatProfile | null = null
    if (d.user.profile != null) {
      profile = d.user.profile
    }
    setMe({ loggedIn: true, profile })
  } catch {
    ignoreNetErr()
  }
}

/**
 * 效果体:等待秒数 tick(friend 模型十几秒不出声,只转圈用户会以为死了 ——
 * 这是「还活着」的证据,不是进度条)。
 *
 * @param x 秒数落格。
 * @returns 效果体(返回清理)。
 */
export function makeSecsTickEffect(x: {
  /**
   * 秒数落格(函数式自增)。
   */
  setSecs: (f: (n: number) => number) => void
}): () => () => void {
  return function startTick(): () => void {
    const id = setInterval(function tick(): void {
      x.setSecs(function bump(n: number): number {
        return n + 1
      })
    }, SECS_TICK_MS)
    return function stopTick(): void {
      clearInterval(id)
    }
  }
}

/**
 * 效果体:新内容后视口跟随(贴底时才跟;逐字流式时同一路径每帧生效)。
 *
 * @param x 历史区引用与贴底引用。
 * @returns 效果体。
 */
export function makeStickEffect(x: {
  /**
   * 历史区 DOM 引用。
   */
  threadEl: React.RefObject<HTMLDivElement | null>

  /**
   * 贴底引用。
   */
  stick: MutBool
}): () => void {
  return function follow(): void {
    const el = x.threadEl.current
    if (el == null || x.stick.current === false) {
      return
    }
    el.scrollTop = el.scrollHeight
  }
}

/**
 * 效果体:autoFocus 翻 true 时聚焦输入框。触屏不聚焦 —— 一展开就顶起键盘、
 * 把示例问题挤出屏幕(这里读 matchMedia 而不是 coarse 引用:两个 effect 的
 * 执行顺序不该成为聚焦与否的依据)。
 *
 * @param x 输入框引用。
 * @returns 效果体。
 */
export function makeAutofocusEffect(x: {
  /**
   * 输入框 DOM 引用。
   */
  taEl: React.RefObject<HTMLTextAreaElement | null>
}): () => void {
  return function focusTa(): void {
    if (window.matchMedia(COARSE_MQ).matches) {
      return
    }
    if (x.taEl.current != null) {
      x.taEl.current.focus()
    }
  }
}

/**
 * 效果体:C6 通道卡 CTA 从页面任意处拉起挂件并预填问句(prefill 只进输入框,
 * 不自动发送 —— 以用户身份发话必须由用户按发送)。detail 是我们自己 dispatch 的,
 * 仍设长度帽防手滑。
 *
 * @param x 预填落格与打开手柄。
 * @returns 效果体(返回清理)。
 */
export function makeOpenEvtEffect(x: {
  /**
   * 预填落格。
   */
  setPrefill: (v: string) => void

  /**
   * 打开面板。
   */
  show: () => void
}): () => () => void {
  return function listen(): () => void {
    function onOpenEvt(e: Event): void {
      const detail = (e as CustomEvent).detail as PrefillDetail
      if (detail != null && typeof detail.prefill === 'string') {
        x.setPrefill(detail.prefill.slice(0, PREFILL_MAX))
      }
      x.show()
    }
    window.addEventListener(OPEN_EVT, onOpenEvt)
    return function stop(): void {
      window.removeEventListener(OPEN_EVT, onOpenEvt)
    }
  }
}

/**
 * 效果体:挂载时读三份 localStorage 偏好(全屏/自定义框/启动器位)并跟踪桌面档。
 * 读在 effect 里,不在 useState 初值里:localStorage 在服务端不存在,当初值会
 * hydration 不一致。存的东西坏了/隐私模式:退回默认档,不报错。
 *
 * @param x 四个落格与最新框引用。
 * @returns 效果体(返回清理)。
 */
export function makeMountPrefsEffect(x: {
  /**
   * 全屏落格。
   */
  setMax: (v: boolean) => void

  /**
   * 自定义框落格。
   */
  setBox: (v: Box) => void

  /**
   * 最新框引用。
   */
  lastBox: MutBox

  /**
   * 启动器位落格。
   */
  setDockPos: (v: DockPos) => void

  /**
   * 桌面档落格(跟着窗口变化走 —— 从桌面拖窄到手机档时 box 要立刻停止生效)。
   */
  setWide: (v: boolean) => void
}): () => () => void {
  return function readPrefs(): () => void {
    try {
      x.setMax(localStorage.getItem(MAX_LS_KEY) === LS_ON)
    } catch {
      ignoreNetErr()
    }
    try {
      const raw = localStorage.getItem(BOX_LS_KEY)
      if (raw != null) {
        const b = clampBoxOf({ b: JSON.parse(raw) as Box })
        x.lastBox.current = b
        x.setBox(b)
      }
    } catch {
      ignoreNetErr()
    }
    try {
      const raw = localStorage.getItem(DOCK_LS_KEY)
      if (raw != null) {
        x.setDockPos(clampDockOf({ p: JSON.parse(raw) as DockPos, w: DOCK_BTN, h: DOCK_BTN }))
      }
    } catch {
      ignoreNetErr()
    }
    const mq = window.matchMedia(WIDE_MQ)
    function sync(): void {
      x.setWide(mq.matches)
    }
    sync()
    mq.addEventListener(EVT_MQ_CHANGE, sync)
    return function stop(): void {
      mq.removeEventListener(EVT_MQ_CHANGE, sync)
    }
  }
}

/**
 * 效果体:popover 调度。popover 只是**增强**(顶层渲染、绕开父级 stacking
 * context),**不是可见性的依据** —— 可见性单一真相是 React 的 open。三条:
 * ① 只在 effect 里调(元素早已 commit);② 全包 try/catch,老引擎(Safari<17
 * 没有 showPopover、:popover-open 解析不了)静默降级;③ 重开前先问当前状态 ——
 * 对已开的 popover 再调 showPopover 会抛 already-open。
 *
 * @param x 面板引用与开合态。
 * @returns 效果体。
 */
export function makePopoverEffect(x: {
  /**
   * 面板 DOM 引用。
   */
  panelEl: React.RefObject<HTMLDivElement | null>

  /**
   * 面板开着。
   */
  open: boolean
}): () => void {
  return function syncPopover(): void {
    const el = x.panelEl.current
    if (el == null) {
      return
    }
    try {
      let on = false
      try {
        on = el.matches(POPOVER_OPEN_SEL)
      } catch {
        on = false
      }
      if (x.open && on === false) {
        el.showPopover()
      } else if (x.open === false && on) {
        el.hidePopover()
      }
    } catch (e) {
      console.warn(WARN_POPOVER, e)
    }
  }
}

/**
 * 效果体:看门狗(红线:**呼不出来是不可接受的**)。open 之后 300ms 还量不到
 * 高度 = CSS/popover 在这个引擎上没兑现 → 拽下顶层、内联 display 硬顶上去并留痕;
 * 再等 600ms 仍是 0 = 没预料到的引擎 → 收面板还启动器(用户至少看得见那个钮,
 * 而不是对着一张什么都没有的页面)。两级都打点,下次出问题有据可查。
 *
 * @param x 面板引用与两个落格。
 * @returns 效果体(返回清理)。
 */
export function makeWatchdogEffect(x: {
  /**
   * 面板 DOM 引用。
   */
  panelEl: React.RefObject<HTMLDivElement | null>

  /**
   * 强制普通层落格。
   */
  setForce: (v: boolean) => void

  /**
   * 面板开合落格(二级收面板)。
   */
  setOpen: (v: boolean) => void
}): () => () => void {
  return function watch(): () => void {
    function invisible(): boolean {
      return x.panelEl.current == null || x.panelEl.current.getBoundingClientRect().height === 0
    }
    const a = setTimeout(function levelOne(): void {
      if (invisible() === false) {
        return
      }
      console.warn(WARN_WATCHDOG)
      try {
        if (x.panelEl.current != null) {
          x.panelEl.current.hidePopover()
        }
      } catch {
        ignoreNetErr()
      }
      x.setForce(true)
      track(EV_W_FALLBACK)
    }, WATCHDOG_MS)
    const b = setTimeout(function levelTwo(): void {
      if (invisible() === false) {
        return
      }
      console.warn(WARN_STUCK)
      track(EV_W_STUCK)
      x.setOpen(false)
    }, WATCHDOG2_MS)
    return function stop(): void {
      clearTimeout(a)
      clearTimeout(b)
    }
  }
}

/**
 * 效果体:Esc 关闭(manual popover 不自带)。只在打开时挂,避免全站常驻一个
 * keydown 监听。
 *
 * @param x 关闭手柄。
 * @returns 效果体(返回清理)。
 */
export function makeEscEffect(x: {
  /**
   * 关闭面板。
   */
  hide: () => void
}): () => () => void {
  return function listen(): () => void {
    function onKey(e: KeyboardEvent): void {
      if (e.key === KEY_ESC) {
        x.hide()
      }
    }
    document.addEventListener(EVT_KEYDOWN, onKey)
    return function stop(): void {
      document.removeEventListener(EVT_KEYDOWN, onKey)
    }
  }
}

/**
 * 效果体:吸底动作条避让(红线:绝不压住吸底动作条 —— ApplyBar 是全站主转化)。
 * 量它的实时位置,不用固定上抬量(sticky 条在「粘住/停在正文末尾」之间摆动)。
 * 相交判定用**基准位的合成矩形**而不是挂件实时矩形 —— 抬起来之后就不相交了,
 * 拿实时矩形判会抬起→落下→抬起地来回抖。条子异步渲出(JD 整理完才挂)→
 * MutationObserver 补测。用 documentElement.clientWidth/Height 而不是 inner* ——
 * 后者**含滚动条**,而 fixed 按不含滚动条的初始包含块定位,生产实测差 15px,
 * 刚好把「提示条压住动作条 7px」判成不相交。
 *
 * @param x 启动器引用与距离落格。
 * @returns 效果体(返回清理)。
 */
export function makeDodgeEffect(x: {
  /**
   * 启动器 DOM 引用。
   */
  dockEl: React.RefObject<HTMLDivElement | null>

  /**
   * 离底距离落格。
   */
  setClear: (v: number) => void
}): () => () => void {
  return function watch(): () => void {
    let bar: HTMLElement | null = null
    let raf = 0
    function measure(): void {
      raf = 0
      const d = x.dockEl.current
      bar = findBarOf({ cached: bar })
      if (bar == null || d == null) {
        x.setClear(DOCK_GAP)
        return
      }
      const b = bar.getBoundingClientRect()
      const de = document.documentElement
      const top = de.clientHeight - DOCK_GAP - d.offsetHeight
      const left = de.clientWidth - DOCK_GAP - d.offsetWidth
      const clash = b.bottom > top && b.top < de.clientHeight - DOCK_GAP
        && b.right > left && b.left < de.clientWidth - DOCK_GAP
      if (clash) {
        x.setClear(Math.max(DOCK_GAP, Math.round(de.clientHeight - b.top + DOCK_GAP)))
      } else {
        x.setClear(DOCK_GAP)
      }
    }
    function schedule(): void {
      if (raf === 0) {
        raf = requestAnimationFrame(measure)
      }
    }
    schedule()
    window.addEventListener(EVT_SCROLL, schedule, { passive: true })
    window.addEventListener(EVT_RESIZE, schedule)
    const main = document.querySelector(MAIN_SEL)
    const mo = new MutationObserver(schedule)
    if (main != null) {
      mo.observe(main, { childList: true, subtree: true })
    }
    return function stop(): void {
      if (raf !== 0) {
        cancelAnimationFrame(raf)
      }
      window.removeEventListener(EVT_SCROLL, schedule)
      window.removeEventListener(EVT_RESIZE, schedule)
      mo.disconnect()
    }
  }
}

/**
 * 效果体:窗口变小时把记住的框拉回视口内 —— 不然面板可能整个在屏幕外,
 * 等于又「呼不出来」。
 *
 * @param x 框落格(函数式:有框才钳)。
 * @returns 效果体(返回清理)。
 */
export function makeBoxResizeEffect(x: {
  /**
   * 框落格(函数式)。
   */
  setBox: (f: (b: Box | null) => Box | null) => void
}): () => () => void {
  return function listen(): () => void {
    function onResize(): void {
      x.setBox(function reclamp(b: Box | null): Box | null {
        if (b == null) {
          return b
        }
        return clampBoxOf({ b })
      })
    }
    window.addEventListener(EVT_RESIZE, onResize)
    return function stop(): void {
      window.removeEventListener(EVT_RESIZE, onResize)
    }
  }
}

/**
 * 效果体:窗口变小时把启动器自定义位拉回视口内(同面板那条的理由)。
 *
 * @param x 位置落格(函数式)。
 * @returns 效果体(返回清理)。
 */
export function makeDockResizeEffect(x: {
  /**
   * 位置落格(函数式)。
   */
  setDockPos: (f: (p: DockPos | null) => DockPos | null) => void
}): () => () => void {
  return function listen(): () => void {
    function onResize(): void {
      x.setDockPos(function reclamp(p: DockPos | null): DockPos | null {
        if (p == null) {
          return p
        }
        return clampDockOf({ p, w: DOCK_BTN, h: DOCK_BTN })
      })
    }
    window.addEventListener(EVT_RESIZE, onResize)
    return function stop(): void {
      window.removeEventListener(EVT_RESIZE, onResize)
    }
  }
}

/**
 * 效果体:首访轻提示(红线:**不自动弹开** —— SaaS 挂件最招人烦的一条;只给
 * 一句静默提示,延迟出场别跟首屏抢注意力,9 秒自己走,最多 HINT_MAX 次,
 * 点开过永久不出)。隐私模式读不到就干脆不提示。
 *
 * @param x 提示落格。
 * @returns 效果体(返回清理)。
 */
export function makeHintEffect(x: {
  /**
   * 提示落格。
   */
  setHint: (v: boolean) => void
}): () => () => void {
  return function schedule(): () => void {
    let n = 0
    try {
      const raw = localStorage.getItem(HINT_KEY)
      if (raw != null) {
        n = Number(raw)
        if (Number.isNaN(n)) {
          n = 0
        }
      }
    } catch {
      return ignoreNetErr
    }
    if (n >= HINT_MAX) {
      return ignoreNetErr
    }
    const a = setTimeout(function showHint(): void {
      x.setHint(true)
      try {
        localStorage.setItem(HINT_KEY, String(n + 1))
      } catch {
        ignoreNetErr()
      }
    }, HINT_DELAY_MS)
    const b = setTimeout(function hideHint(): void {
      x.setHint(false)
    }, HINT_HIDE_MS)
    return function stop(): void {
      clearTimeout(a)
      clearTimeout(b)
    }
  }
}

/**
 * 造轨迹折叠条的开合手柄(受控 details:open 只由 stepsOpen 决定,没有第二条路 ——
 * 两套渲染之间隔着组件换型,换型就有换不干净的余地)。
 *
 * @param x 轮次表落格。
 * @returns 开合手柄。
 */
export function makeStepsToggle(x: {
  /**
   * 轮次表落格。
   */
  setTurns: SetTurns
}): (s: StepsToggleIn) => void {
  return function toggleSteps(s: StepsToggleIn): void {
    patchTurn({ setTurns: x.setTurns, i: s.i, patch: { stepsOpen: s.open } })
  }
}

/**
 * 效果体:重置二次确认问了 RESET_ASK_MS 没人确认 = 误点,自己撤回
 * (不留一个随时会清掉对话的活钮在头上)。
 *
 * @param x 二次确认落格。
 * @returns 效果体(返回清理)。
 */
export function makeAskResetTimer(x: {
  /**
   * 二次确认落格。
   */
  setAskReset: (v: boolean) => void
}): () => () => void {
  return function arm(): () => void {
    const id = setTimeout(function cancel(): void {
      x.setAskReset(false)
    }, RESET_ASK_MS)
    return function stop(): void {
      clearTimeout(id)
    }
  }
}

/**
 * 造受控 details 的 onToggle 手柄(用户手点过折叠条才写成布尔;实参是 React 的
 * ToggleEvent,只读 currentTarget.open 一格,结构上兜得住)。
 *
 * @param x 面板与这一轮的序号。
 * @returns onToggle 手柄。
 */
export function makeStepsOnToggle(x: {
  /**
   * 对话面板。
   */
  p: ChatBoxPanel

  /**
   * 哪一轮。
   */
  i: number
}): (e: StepsToggleEvent) => void {
  return function onToggle(e: StepsToggleEvent): void {
    x.p.onToggleSteps({ i: x.i, open: e.currentTarget.open })
  }
}

/**
 * 造故障轮的重试手柄:原句原轮重开(历史只取被重试那轮之前的)。
 *
 * @param x 面板、这一轮与序号。
 * @returns 重试手柄。
 */
export function makeRetry(x: {
  /**
   * 对话面板。
   */
  p: ChatBoxPanel

  /**
   * 这一轮。
   */
  turn: Turn

  /**
   * 哪一轮。
   */
  i: number
}): () => void {
  return function retry(): void {
    x.p.send({ q: x.turn.q, at: x.i })
  }
}

/**
 * 造一枚选项的点击手柄:埋点带序号,再以用户身份把原句发出去。
 *
 * @param x 面板、序号与要发的句。
 * @returns 点选手柄。
 */
export function makePick(x: {
  /**
   * 对话面板。
   */
  p: ChatBoxPanel

  /**
   * 第几枚。
   */
  k: number

  /**
   * 要发的原句。
   */
  q: string
}): () => void {
  return function pick(): void {
    track(EV_OPTION, { pick: x.k })
    x.p.send({ q: x.q, at: null })
  }
}

/**
 * 造「自己说」的点击手柄:埋点 + 光标回输入框(输入框就在下面)。
 *
 * @param x 面板。
 * @returns 点选手柄。
 */
export function makeSelf(x: {
  /**
   * 对话面板。
   */
  p: ChatBoxPanel
}): () => void {
  return function self(): void {
    track(EV_OPTION, { pick: OPT_SELF_PICK })
    if (x.p.taEl.current != null) {
      x.p.taEl.current.focus()
    }
  }
}

/**
 * 造一条示例的点击手柄:埋点带短标签,再以用户身份发出去。
 *
 * @param x 面板与那条示例。
 * @returns 点选手柄。
 */
export function makeAskExample(x: {
  /**
   * 对话面板。
   */
  p: ChatBoxPanel

  /**
   * 那条示例。
   */
  ex: ExampleItem
}): () => void {
  return function askExample(): void {
    track(EV_EXAMPLE, { kind: exampleKind({ key: x.ex.key }) })
    x.p.send({ q: x.p.t(x.ex.key, x.ex.params), at: null })
  }
}

/**
 * 造发送钮的点击手柄(把输入框现值当新一轮发出去)。
 *
 * @param x 面板。
 * @returns 点击手柄。
 */
export function makeComposerSend(x: {
  /**
   * 对话面板。
   */
  p: ChatBoxPanel
}): () => void {
  return function sendInput(): void {
    x.p.send({ q: x.p.input, at: null })
  }
}

/**
 * 懒加载的取件函数(dynamic 的入参形状由 next 定;模块路径是打包器要的静态字面量)。
 * 2026-08-27 自 chatloading.tsx 迁入 —— 一个 tsx 只住一个渲染 function(闸 one-function-per-tsx)。
 *
 * @returns ChatBox 组件的 Promise。
 */
export function loadChatBox() {
  return import('./chatbox').then(pickChatBox)
}

/**
 * 从模块里挑出组件(then 的具名回调)。
 *
 * @param m chatbox 模块(只声明真取的那一格)。
 * @returns ChatBox 组件。
 */
function pickChatBox(m: LazyBoxModule) {
  return m.ChatBox
}

/**
 * chunk 取不到时的重载(**真的解法**:换回新哈希那份)。
 * 2026-08-27 自 chatlauncher.tsx 迁入,理由同上。
 *
 * @returns 无。
 */
export function reloadPage(): void {
  location.reload()
}
