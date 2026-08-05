'use client'
// C2 对话即产品(设计 docs/design/对话即产品-20260803.md §二 目标形态 / §六 并存迁移):
// landing 主入口的对话框。答题卡 2026-08-04 摘除后由它接主位。
//
// 2026-08-04 形态重做(Frank:「是不是太简陋了,参考一些开源项目」)——只抄交互范式不引框架
// (assistant-ui / Vercel ai-chatbot / LobeChat 的形状),四条改动:
//   ① **历史在上、composer 钉底**(原来输入框在上、答复往下长,第二轮起用户就迷路);
//   ② **空态给 3 个示例问题**(可点即发)—— 对着空白框写自己的移民处境门槛极高,这是转化最大的杠杆;
//   ③ 错误分两类:tooShort/noOcc 是**引导**(渲成助手气泡,接着聊),limit/llm/guard/net 是**故障**
//      (低调行内提示 + 可重试)。原来一律红色表单错误框,观感是「我做错了什么」;
//   ④ Enter 发送 / Shift+Enter 换行(IME 组合中不发),按钮进 composer 内、有内容才亮。
//
// 本组件只渲染,不算数 —— 结论、数字、判定全部来自服务端工具层并挂 evidence(总红线)。三条实现红线:
//   ① `value` 可能是 null(官方隐私抑制)→ 渲 valueText 原文,**永不折成 0 或「暂无」**(见 ChatAnswer);
//   ② 错误码各说各话(2026-08-03 简历对照实撞:noJd 被笼统报成「稍后再试」,用户重试也没用);
//   ③ 等待态给真反馈(打字指示 + 秒数)但**不假装逐字生成** —— 服务端今天还是一次性 JSON,
//      逐字渲染路径已备好(readSse)但只在上游真的吐 SSE 时才启用,详见 §流式 注释。
import { useCallback, useEffect, useRef, useState } from 'react'

import { useLang } from '../LangProvider'
import { Button, UI } from '../ui/primitives'
import { track } from '@/lib/track'
import { ChatAnswer, ChatText, CHAT_ANSWER_CSS, type Answer } from './ChatAnswer'

type Msg = { role: 'user' | 'assistant'; content: string }
type Fault = 'limit' | 'llm' | 'guard' | 'net'
// 一轮 = 用户那句 + 其中**恰好一种**结果:引导(接着聊)/ 故障 / 答复 / 还在等(steps = 工具轨迹)
// stepsOpen:`null` = 跟着默认走,也就是**收起**(2026-08-04 改;原来是「等待时展开」——
// 取样发现顺序正好反了:等待期摊开十行轨迹占掉半个面板,答复落地反而收走)。
// 用户手点过折叠条才写成布尔值(展开是**他主动的事**);下一次落地又归 null,重新收起。
// t0/secs:这一轮的**真实**耗时(t0 = 发出时刻,secs = 落地时算出来的秒数)。
// 折叠条上那个数字必须是量出来的,不是编的 —— 编的耗时比不显示更糟。
type Turn = { q: string; a: Answer | null; steps: string[]; stream: string; guide: string; fault: Fault | ''; stepsOpen: boolean | null; t0: number; secs: number }
const blank = (q: string): Turn =>
  ({ q, a: null, steps: [], stream: '', guide: '', fault: '', stepsOpen: null, t0: Date.now(), secs: 0 })

// 错误码分两类 —— 分类不是文案问题是**观感问题**:
// 「再多说两句,你做什么工作」是助手在接着聊,不是用户填错了表单
const GUIDE_KEY: Record<string, string> = { tooShort: 'chat.err.tooShort', noOcc: 'chat.err.noOcc' }
const FAULT_KEY: Record<Fault, string> = {
  limit: 'chat.err.limit', llm: 'chat.err.llm', guard: 'chat.err.guard', net: 'chat.err.net',
}
// 重试有意义的才给重试钮:limit(额度用完)重试只会再撞一次,guard(答复没对上出处)重试也是同一份事实
const RETRYABLE: Fault[] = ['llm', 'net']
const EXAMPLES = ['chat.ex1', 'chat.ex2', 'chat.ex3']
const MAX_TEXT = 1200   // 对齐服务端 chatOrchestrate.MAX_TEXT(超了是**静默截断**,不拦用户看不出后半截没被读)
                        // 常量不 import:那模块是服务端的(带 pg pool),拖进客户端包不值

/**
 * §流式 —— **流的是工具轨迹,不是答案**(2026-08-04 拍板;服务端 api/chat/route.ts 同一段注释)。
 * 答复要过五道出口校验(违规会重试或降级),流答案 = 用户可能读到一个随后被撤回的数字。
 * 所以 `step` 事件只报「我在查什么」,正文一次性落地。
 * 事件体:
 *   data: {"step":"查在招岗位:8 条"}                → 追加一条轨迹(服务端已按用户语言写好,前端不拼字)
 *   data: {"delta":"片段"}                          → 逐字正文(**今天服务端不发**;哪天真流答案了这条路还在)
 *   data: {"answer":"…","facts":[…],"followups":[…]} → 收尾(facts 是出口校验的产物,只能整段给)
 *   data: {"error":"llm"}                           → 开流后才出的故障(前置错误仍走 JSON + 状态码)
 *   data: [DONE]
 * 返回错误码('' = 正常结束)。非 SSE(content-type 不是 text/event-stream)一律走下面的 JSON 老路径。
 */
async function readSse(
  body: ReadableStream<Uint8Array>, onDelta: (s: string) => void, onFinal: (a: Answer) => void,
  onStep: (s: string) => void,
): Promise<string> {
  const reader = body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const blocks = buf.split('\n\n')
    buf = blocks.pop() ?? ''
    for (const b of blocks) {
      const line = b.split('\n').find((l) => l.startsWith('data:'))
      if (!line) continue
      const raw = line.slice(5).trim()
      if (raw === '[DONE]') return ''
      let d: any = null
      try { d = JSON.parse(raw) } catch { continue }
      if (typeof d?.step === 'string') onStep(d.step)
      else if (typeof d?.delta === 'string') onDelta(d.delta)
      else if (typeof d?.answer === 'string') onFinal(d as Answer)
      else if (d?.error) return String(d.error)
    }
  }
  return ''
}

/**
 * @param compact   嵌在别的容器里(右下角挂件 ChatLauncher)时用:去掉自己的卡壳(边框/圆角/内边距/底色),
 *   并把历史区从「56vh 封顶」改成「撑满父级剩余高度」。**这两件事必须由本组件自己声明** ——
 *   挂件那边原来是靠父级 CSS 覆盖 .cbCard/.cbThread 做的,本文件类名一改就静默退化成卡中卡。
 * @param autoFocus 变成 true 时把光标放进输入框(挂件每次展开翻一次 false→true)。
 *   触屏上是 no-op:一展开就顶起键盘、把示例问题挤出屏幕,那是挂件最招人烦的手感。
 */
export function ChatBox({ compact = false, autoFocus = false }: { compact?: boolean; autoFocus?: boolean } = {}) {
  const [lang, , t] = useLang()
  const [input, setInput] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [busy, setBusy] = useState(false)
  const [secs, setSecs] = useState(0)
  const opened = useRef(false)          // chat-open 只打第一次聚焦(每次点回输入框都算一次会把口径撑爆)
  const threadRef = useRef<HTMLDivElement | null>(null)
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const stick = useRef(true)            // 用户往回翻看旧答复时别把他甩到底
  const coarse = useRef(false)          // 触屏:Enter 是换行不是发送(手机上写三句话被 Enter 截断很恼人)
  // 同一个判据的可渲染版:手机上「Enter 发送,Shift+Enter 换行」是**纯噪音**(没有 Shift 键、
  // 回车本来就是换行),还白占 composer 下面一行 —— 挂件面板本就窄。按文案铁律它一条都不沾,
  // 所以**不渲染**而不是渲了再 CSS 藏。初值 false = SSR/首帧当桌面,effect 落地后翻;
  // 窄视口那条 @media 仍留着当兜底(翻之前的那一帧就已经是藏的)。
  const [touch, setTouch] = useState(false)

  useEffect(() => {
    const m = !!window.matchMedia?.('(pointer: coarse)').matches
    coarse.current = m
    setTouch(m)
  }, [])

  // autoFocus:翻成 true 就聚焦(挂件每次展开翻一次)。触屏不聚焦 —— 见 props 注释。
  // 这里读 matchMedia 而不是 coarse.current:两个 effect 的执行顺序不该成为聚焦与否的依据。
  useEffect(() => {
    if (!autoFocus || window.matchMedia?.('(pointer: coarse)').matches) return
    taRef.current?.focus()
  }, [autoFocus])

  // 等待秒数:friend 模型十几秒不出声,只转圈用户会以为死了 —— 这是「还活着」的证据,不是进度条
  useEffect(() => {
    if (!busy) return
    setSecs(0)
    const id = setInterval(() => setSecs((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [busy])

  // 新内容后视口跟随(贴底时才跟);逐字流式时同一路径每帧生效
  useEffect(() => {
    const el = threadRef.current
    if (!el || !stick.current) return
    el.scrollTop = el.scrollHeight
  }, [turns, busy])

  const patch = (i: number, v: Partial<Turn>) =>
    setTurns((prev) => prev.map((x, k) => (k === i ? { ...x, ...v } : x)))
  /**
   * 终局补丁(答复 / 引导 / 故障都走这里)。做**两件只该做一次**的事:
   *   ① 结算真实耗时 —— 从这一轮自己的 t0 算,不用那个全局 secs(重试时它已经被清零了);
   *   ② stepsOpen 归 null = 轨迹回到默认的收起态。等待期间用户手点开过也一样收:
   *      那是**上一阶段**的选择,答复才是他现在要读的东西。
   * 至少记 1s:不足一秒显示 0s 像没查过,而每一轮都真的打了后端。
   */
  const finish = (i: number, v: Partial<Turn>) =>
    setTurns((prev) => prev.map((x, k) => (k === i
      ? { ...x, ...v, stepsOpen: null, secs: Math.max(1, Math.round((Date.now() - x.t0) / 1000)) }
      : x)))

  const ask = useCallback(async (raw: string, retryIdx?: number) => {
    const q = raw.trim()
    if (!q || busy) return
    // 多轮:把已答成的问答对带回去(§二「不是槽位齐了吐整份报告,是多轮按需调工具」);
    // 只带最近 8 条,长会话不把上下文顶爆。重试时只取被重试那轮之前的历史
    const base = retryIdx == null ? turns : turns.slice(0, retryIdx)
    const history: Msg[] = base.filter((x) => x.a)
      .flatMap((x) => [{ role: 'user' as const, content: x.q }, { role: 'assistant' as const, content: x.a!.answer }])
      .slice(-8)
    const idx = retryIdx ?? turns.length
    setTurns((prev) => (retryIdx == null ? [...prev, blank(q)] : prev.map((x, k) => (k === retryIdx ? blank(q) : x))))
    setInput('')
    if (taRef.current) taRef.current.style.height = 'auto'
    setBusy(true)
    stick.current = true
    track('chat-submit')
    try {
      const r = await fetch('/api/chat', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: q, lang, history }),
      })
      // 流式分支:服务端改造完成后自动生效(见 §流式)
      if (r.ok && (r.headers.get('content-type') || '').includes('text/event-stream') && r.body) {
        let acc = ''
        let final: Answer | null = null
        const steps: string[] = []
        const err = await readSse(r.body, (d) => { acc += d; patch(idx, { stream: acc }) }, (a) => { final = a },
          (s) => { steps.push(s); patch(idx, { steps: [...steps] }) })
        // 终局一律走 finish(结算耗时 + 收起轨迹,见它的注释)
        if (err) finish(idx, GUIDE_KEY[err] ? { guide: t(GUIDE_KEY[err]) } : { fault: (FAULT_KEY as any)[err] ? err as Fault : 'llm' })
        else if (final) { finish(idx, { a: final }); track('chat-answer') }
        else if (acc) { finish(idx, { a: { answer: acc } }); track('chat-answer') }
        else finish(idx, { fault: 'llm' })
      } else {
        const d = await r.json().catch(() => null)
        const code = String(d?.error || '')
        if (!r.ok || !d || d.error) {
          if (GUIDE_KEY[code]) {
            finish(idx, { guide: t(GUIDE_KEY[code]) })
            taRef.current?.focus()          // 引导 = 该他接着说,光标直接回到输入框
          } else {
            finish(idx, { fault: (code === 'limit' || code === 'guard' || code === 'llm') ? code : 'net' })
          }
        } else {
          finish(idx, { a: d as Answer })
          track('chat-answer')
        }
      }
    } catch {
      finish(idx, { fault: 'net' })
    }
    setBusy(false)
  }, [busy, turns, lang, t])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter') return
    if ((e.nativeEvent as unknown as { isComposing?: boolean }).isComposing) return   // 中/韩输入法选词中,别抢 Enter
    if (e.shiftKey) return
    if (!coarse.current || e.metaKey || e.ctrlKey) { e.preventDefault(); void ask(input) }
  }

  const empty = turns.length === 0
  return (
    <div className={compact ? 'cbFill' : undefined}>
      <style>{`
        /* --cbW = **正文读列宽**(2026-08-04 Open WebUI 取样:它 860px,我们桌面小窗只有 354px ——
           「Frank 在电脑上看到的就是别人手机上的观感」)。860 是上限不是宽度:
           小于它的容器(375 手机 / 380 小窗)完全吃不到这条,自然还是满宽,不横滚不截字;
           最大化(面板封 1100)才真的收到 860,并且**居中** —— 否则窗开大了正文仍是左边一条窄带。
           挂在 .cbCard 上,提问气泡/答复/示例/composer 共用同一条中轴。 */
        .cbCard{--cbW:860px;background:${UI.card};border:1px solid ${UI.border};border-radius:14px;padding:10px;
          display:flex;flex-direction:column;gap:10px}
        .cbTurn,.cbEmpty,.cbCol{width:100%;max-width:var(--cbW);margin-inline:auto}
        /* 历史在上:自身滚动 + 高度封顶,composer 永远在视野里(聊天界面的通用形态,别再让输入框骑在历史上面) */
        .cbThread{display:flex;flex-direction:column;gap:16px;min-width:0;overflow-y:auto;
          max-height:min(56vh,520px);padding:2px}
        .cbThread.cbNoScroll{overflow:visible;max-height:none}
        /* compact(嵌在挂件面板里):卸掉自己的卡壳,历史区改成撑满父级剩余高度。
           min-height:0 那三处是 flex 子项能真正收缩的前提,少一处历史区就把 composer 顶出面板。 */
        .cbFill{flex:1;min-height:0;display:flex;flex-direction:column}
        .cbFill .cbCard{flex:1;min-height:0;border:none;border-radius:0;padding:0;background:transparent}
        .cbFill .cbThread{flex:1;min-height:0;max-height:none}
        .cbFill .cbThread.cbNoScroll{overflow-y:auto}   /* 空态在挂件里也要能滚(面板矮时三条示例放不下) */
        .cbTurn{display:flex;flex-direction:column;gap:8px;min-width:0}
        /* 提问气泡:靠右、封顶宽。**气泡只给用户消息** —— AI 答复满宽无气泡(见 CHAT_ANSWER_CSS .cbA),
           长答复套气泡是可读性杀手。字号跟正文同一档(15/1.625),不然一问一答两种字看着像两个网站 */
        .cbQ{align-self:flex-end;max-width:min(88%,560px);background:#eff6ff;color:${UI.primaryDeep};
          border-radius:12px 12px 4px 12px;padding:9px 12px;font-size:15px;line-height:1.625;
          white-space:pre-wrap;overflow-wrap:anywhere}
        /* 空态示例:整宽一条一行(站规),点了直接发 —— 让人看见「这里该说什么」比任何说明文案都有用 */
        .cbTry{font-size:12px;color:${UI.text3}}
        .cbEx{display:block;width:100%;max-width:640px;text-align:left;background:${UI.bg};border:1px solid ${UI.border};
          border-radius:10px;padding:10px 12px;font-size:13.5px;line-height:1.45;color:${UI.text};
          font-family:inherit;cursor:pointer;margin-top:6px}
        .cbEx:hover{border-color:#bfdbfe;background:#f8fafc}
        /* 故障:低调行内一行(不是红色大块)。引导类走 .cbA 助手气泡,不进这里 */
        .cbFault{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;font-size:12.5px;
          color:${UI.text2};line-height:1.5}
        .cbLink{background:none;border:none;padding:0;font:inherit;color:${UI.primary};cursor:pointer;text-decoration:underline}
        /* 等待:工具轨迹(服务端按真实进度发)+ 打字指示 + 秒数。**不假装逐字生成答案**,骗不得 */
        .cbStep{font-size:12.5px;line-height:1.5;color:${UI.text2};overflow-wrap:anywhere;
          padding-left:14px;position:relative}
        .cbStep::before{content:'';position:absolute;left:3px;top:.62em;width:5px;height:5px;
          border-radius:50%;background:#93c5fd}
        /* 轨迹折叠条:**等待期就已经是折叠的一行**(2026-08-04 改;原来等待期摊开)。
           一行里装三样:活体记号(等待时的三点 / 落地后的三角)、一句话、真实耗时。
           flex-wrap:365 上中文那句 + 耗时若放不下就折第二行,绝不横滚 */
        .cbSteps{margin-bottom:2px}
        .cbSteps>summary{list-style:none;cursor:pointer;font-size:12px;line-height:1.5;color:${UI.text3};
          display:flex;align-items:center;flex-wrap:wrap;gap:4px 6px;padding:3px 0}
        .cbSteps>summary::-webkit-details-marker{display:none}
        .cbSteps>summary:hover{color:${UI.text2}}
        .cbSteps[open]{padding-bottom:4px}
        /* 三角只在「已落地」的那一行出(等待时左边站的是三点),所以挂在 span 上不挂 summary::before */
        .cbCar::before{content:'\\25B8';font-size:9px;color:${UI.text3}}
        .cbSteps[open] .cbCar::before{content:'\\25BE'}
        .cbSecs{color:${UI.text3};white-space:nowrap;font-variant-numeric:tabular-nums}
        .cbWait{display:flex;align-items:center;gap:8px;font-size:13px;color:${UI.text2}}
        .cbDots{display:inline-flex;gap:3px;align-items:center}
        .cbDots i{width:5px;height:5px;border-radius:50%;background:#93c5fd;animation:cbBlink 1.2s infinite}
        .cbDots i:nth-child(2){animation-delay:.2s}
        .cbDots i:nth-child(3){animation-delay:.4s}
        @keyframes cbBlink{0%,80%,100%{opacity:.28}40%{opacity:1}}
        .cbCaret{display:inline-block;width:2px;height:1em;background:${UI.primary};margin-left:2px;
          vertical-align:-2px;animation:cbBlink .9s steps(1,end) infinite}
        @media (prefers-reduced-motion:reduce){.cbDots i,.cbCaret{animation:none;opacity:.6}}
        /* composer 钉底:整块一个框,textarea 无边框藏在里面,发送钮在框内右下(不再孤零零占一行) */
        .cbComposer{border:1px solid ${UI.border};border-radius:12px;background:${UI.card};padding:8px 10px}
        .cbComposer:focus-within{border-color:#93c5fd;box-shadow:0 0 0 3px rgba(37,99,235,.10)}
        /* 16px:小于 16 时 iOS Safari 聚焦会自动放大页面(手机优先站规,这是全站主输入) */
        .cbIn{display:block;width:100%;box-sizing:border-box;border:none;outline:none;resize:none;
          background:transparent;font-size:16px;line-height:1.5;color:${UI.text};font-family:inherit;
          max-height:160px;overflow-y:auto}
        /* justify-end:手机上 .cbHint 藏了(没有实体 Enter 键,提示是废话),发送钮仍须顶右 */
        .cbBar{display:flex;align-items:center;gap:10px;margin-top:6px;justify-content:flex-end}
        .cbHint,.cbNum{flex:1;min-width:0;font-size:11.5px;color:${UI.text3};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        /* 手机主判据是 coarse pointer(上面的 touch,整条不渲染);这条 @media 只兜首帧那一瞬
           和「窄视口但非触屏」。.cbNum 不藏:快撞上限了手机上更要看得见 */
        @media (max-width:560px){.cbHint{display:none}}
        ${CHAT_ANSWER_CSS}
      `}</style>

      <div className="cbCard">
        <div ref={threadRef} className={empty ? 'cbThread cbNoScroll' : 'cbThread'}
          onScroll={(e) => {
            const el = e.currentTarget
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
          }}>
          {empty ? (
            <div className="cbEmpty">
              <div className="cbTry">{t('chat.try')}</div>
              {EXAMPLES.map((k) => (
                <button key={k} className="cbEx" disabled={busy}
                  onClick={() => { track('chat-example', { kind: k.slice(-3) }); void ask(t(k)) }}>{t(k)}</button>
              ))}
            </div>
          ) : null}

          {turns.map((turn, i) => {
            // live = 这一轮还在跑(整个组件同时只可能有一轮在跑:ask 头上有 busy 闸)。
            // 等待中读全局 secs(每秒 tick),落地后读这一轮自己结算的 turn.secs —— 两个数都是量的。
            // 逐字流式的半截正文**也算在跑**(耗时还没结算,turn.secs 还是 0)
            const live = busy && !(turn.a || turn.guide || turn.fault)
            return (
            <div className="cbTurn" key={i}>
              <div className="cbQ">{turn.q}</div>
              {/* 🔴 轨迹**只有这一处**(等待期和落地后同一个 <details>,不是两套渲染)。
                  两套渲染时,「等待时铺开」和「落地后折叠」之间隔着一次组件换型 ——
                  换型就有换不干净的余地(Frank 实测:答复落地了,十行轨迹还占着面板一半)。
                  一个受控 <details> 把这件事变成一个布尔量:open 只由 stepsOpen 决定,没有第二条路。
                  2026-08-04:默认从「等待时展开」改成**一直收起**(取样结论,顺序原来是反的)——
                  等待中 → 一行「正在查询… 8s」;落地后 → 一行「已核查 6 项 11s ⌄」,点开才看细节。 */}
              {turn.steps.length ? (
                <details className="cbSteps" open={turn.stepsOpen ?? false}
                  onToggle={(e) => patch(i, { stepsOpen: e.currentTarget.open })}>
                  <summary>
                    {live
                      ? <span className="cbDots" aria-hidden><i /><i /><i /></span>
                      : <span className="cbCar" aria-hidden />}
                    <span style={{ minWidth: 0 }}>
                      {live ? t('chat.stepsRunning') : t('chat.stepsDone', { n: turn.steps.length })}
                    </span>
                    <span className="cbSecs">{live ? secs : turn.secs}s</span>
                  </summary>
                  {turn.steps.map((s, k) => <div className="cbStep" key={k}>{s}</div>)}
                </details>
              ) : null}
              {turn.guide ? (
                // 引导:这是助手的一条消息(「再多说两句,你做什么工作」),不是表单报错
                <ChatText text={turn.guide} />
              ) : turn.fault ? (
                <div className="cbFault">
                  <span aria-hidden style={{ color: UI.warn }}>!</span>
                  <span style={{ minWidth: 0 }}>{t(FAULT_KEY[turn.fault])}</span>
                  {RETRYABLE.includes(turn.fault) && !busy ? (
                    <button className="cbLink" onClick={() => void ask(turn.q, i)}>{t('chat.retry')}</button>
                  ) : null}
                </div>
              ) : turn.a ? (
                <ChatAnswer a={turn.a} busy={busy} onAsk={(q) => void ask(q)} />
              ) : turn.stream ? (
                <div className="cbA cbPre">{turn.stream}<i className="cbCaret" /></div>
              ) : turn.steps.length ? null : (
                // 等待态且**还没有一条轨迹**时才出这一行 —— 有轨迹的话,上面那条折叠条自己就带三点和秒数,
                // 两个都出就是同一件事说两遍(取样结论:等待期只该有一行)
                <div className="cbWait">
                  <span className="cbDots" aria-hidden><i /><i /><i /></span>
                  <span style={{ minWidth: 0 }}>{t('chat.waiting')}</span>
                  <span className="cbSecs">{secs}s</span>
                </div>
              )}
            </div>
            )
          })}
        </div>

        {/* cbCol:composer 跟正文共用同一条中轴与读列宽(最大化时不横跨 1100px,那样输入框比正文还宽) */}
        <div className="cbComposer cbCol">
          <textarea ref={taRef} className="cbIn" rows={2} value={input} placeholder={t('chat.ph')} maxLength={MAX_TEXT}
            onFocus={() => { if (!opened.current) { opened.current = true; track('chat-open') } }}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'                          // 随内容长高到 160px 封顶
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
            }}
            onKeyDown={onKeyDown} />
          <div className="cbBar">
            {/* 字数只在快撞上限时出(手机上更要看得见);Enter 提示手机整条不渲染。
                两个都不出时 .cbBar 的 justify-content:flex-end 顶着发送钮,不会塌回左边 */}
            {input.length > MAX_TEXT - 200
              ? <span className="cbNum">{input.length}/{MAX_TEXT}</span>
              : touch ? null : <span className="cbHint">{t('chat.hint')}</span>}
            <Button lg disabled={busy || !input.trim()} onClick={() => void ask(input)}>{t('chat.send')}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
