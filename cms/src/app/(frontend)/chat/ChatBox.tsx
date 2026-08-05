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
import { ChatAnswer, CHAT_ANSWER_CSS, type Answer } from './ChatAnswer'

type Msg = { role: 'user' | 'assistant'; content: string }
type Fault = 'limit' | 'llm' | 'guard' | 'net'
// 一轮 = 用户那句 + 其中**恰好一种**结果:引导(接着聊)/ 故障 / 答复 / 还在等(steps = 工具轨迹)
type Turn = { q: string; a: Answer | null; steps: string[]; stream: string; guide: string; fault: Fault | '' }
const blank = (q: string): Turn => ({ q, a: null, steps: [], stream: '', guide: '', fault: '' })

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

export function ChatBox() {
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

  useEffect(() => { coarse.current = !!window.matchMedia?.('(pointer: coarse)').matches }, [])

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
        if (err) patch(idx, GUIDE_KEY[err] ? { guide: t(GUIDE_KEY[err]) } : { fault: (FAULT_KEY as any)[err] ? err as Fault : 'llm' })
        else if (final) { patch(idx, { a: final }); track('chat-answer') }
        else if (acc) { patch(idx, { a: { answer: acc } }); track('chat-answer') }
        else patch(idx, { fault: 'llm' })
      } else {
        const d = await r.json().catch(() => null)
        const code = String(d?.error || '')
        if (!r.ok || !d || d.error) {
          if (GUIDE_KEY[code]) {
            patch(idx, { guide: t(GUIDE_KEY[code]) })
            taRef.current?.focus()          // 引导 = 该他接着说,光标直接回到输入框
          } else {
            patch(idx, { fault: (code === 'limit' || code === 'guard' || code === 'llm') ? code : 'net' })
          }
        } else {
          patch(idx, { a: d as Answer })
          track('chat-answer')
        }
      }
    } catch {
      patch(idx, { fault: 'net' })
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
    <div>
      <style>{`
        .cbCard{background:${UI.card};border:1px solid ${UI.border};border-radius:14px;padding:10px;
          display:flex;flex-direction:column;gap:10px}
        /* 历史在上:自身滚动 + 高度封顶,composer 永远在视野里(聊天界面的通用形态,别再让输入框骑在历史上面) */
        .cbThread{display:flex;flex-direction:column;gap:16px;min-width:0;overflow-y:auto;
          max-height:min(56vh,520px);padding:2px}
        .cbThread.cbNoScroll{overflow:visible;max-height:none}
        .cbTurn{display:flex;flex-direction:column;gap:8px;min-width:0}
        /* 提问气泡:靠右、封顶宽,桌面上不拉成一整行 1160px */
        .cbQ{align-self:flex-end;max-width:min(88%,560px);background:#eff6ff;color:${UI.primaryDeep};
          border-radius:12px 12px 4px 12px;padding:9px 12px;font-size:14px;line-height:1.5;
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
        .cbRun{display:flex;flex-direction:column;gap:4px;min-width:0}
        .cbStep{font-size:12.5px;line-height:1.5;color:${UI.text2};overflow-wrap:anywhere;
          padding-left:14px;position:relative}
        .cbStep::before{content:'';position:absolute;left:3px;top:.62em;width:5px;height:5px;
          border-radius:50%;background:#bfdbfe}
        .cbStepDone::before{background:#93c5fd}
        /* 答复落地后的轨迹:整块收进折叠条并弱化(灰、12px),点开才铺 */
        .cbSteps{margin-bottom:2px}
        .cbSteps>summary{list-style:none;cursor:pointer;font-size:11.5px;color:${UI.text3};
          display:inline-flex;align-items:center;gap:6px;padding:2px 0}
        .cbSteps>summary::-webkit-details-marker{display:none}
        .cbSteps>summary::before{content:'\\25B8';font-size:9px;color:${UI.text3}}
        .cbSteps[open]>summary::before{content:'\\25BE'}
        .cbSteps>summary:hover{color:${UI.text2}}
        .cbSteps .cbStep{font-size:12px;color:${UI.text3}}
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
        @media (max-width:560px){.cbHint{display:none}}   /* .cbNum 不藏:快撞上限了手机上更要看得见 */
        ${CHAT_ANSWER_CSS}
      `}</style>

      <div className="cbCard">
        <div ref={threadRef} className={empty ? 'cbThread cbNoScroll' : 'cbThread'}
          onScroll={(e) => {
            const el = e.currentTarget
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
          }}>
          {empty ? (
            <div>
              <div className="cbTry">{t('chat.try')}</div>
              {EXAMPLES.map((k) => (
                <button key={k} className="cbEx" disabled={busy}
                  onClick={() => { track('chat-example', { kind: k.slice(-3) }); void ask(t(k)) }}>{t(k)}</button>
              ))}
            </div>
          ) : null}

          {turns.map((turn, i) => (
            <div className="cbTurn" key={i}>
              <div className="cbQ">{turn.q}</div>
              {turn.guide ? (
                // 引导:这是助手的一条消息(「再多说两句,你做什么工作」),不是表单报错
                <div className="cbA">{turn.guide}</div>
              ) : turn.fault ? (
                <div className="cbFault">
                  <span aria-hidden style={{ color: UI.warn }}>!</span>
                  <span style={{ minWidth: 0 }}>{t(FAULT_KEY[turn.fault])}</span>
                  {RETRYABLE.includes(turn.fault) && !busy ? (
                    <button className="cbLink" onClick={() => void ask(turn.q, i)}>{t('chat.retry')}</button>
                  ) : null}
                </div>
              ) : turn.a ? (
                <>
                  {/* 轨迹是**过程**不是结果:答复落地后收进折叠条,不跟结论抢视线(想复盘的人点开) */}
                  {turn.steps.length ? (
                    <details className="cbSteps">
                      <summary>{t('chat.steps')}<span className="cbCnt">{turn.steps.length}</span></summary>
                      {turn.steps.map((s, k) => <div className="cbStep" key={k}>{s}</div>)}
                    </details>
                  ) : null}
                  <ChatAnswer a={turn.a} busy={busy} onAsk={(q) => void ask(q)} />
                </>
              ) : turn.stream ? (
                <div className="cbA">{turn.stream}<i className="cbCaret" /></div>
              ) : (
                // 等待态:已查完的步骤逐条留在上面(服务端按真实进度发的),下面一行是「还在跑」的活证据
                <div className="cbRun">
                  {turn.steps.map((s, k) => <div className="cbStep cbStepDone" key={k}>{s}</div>)}
                  <div className="cbWait">
                    <span className="cbDots"><i /><i /><i /></span>
                    <span style={{ minWidth: 0 }}>{t('chat.waiting')}</span>
                    <span style={{ color: UI.text3, whiteSpace: 'nowrap' }}>{secs}s</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="cbComposer">
          <textarea ref={taRef} className="cbIn" rows={2} value={input} placeholder={t('chat.ph')} maxLength={MAX_TEXT}
            onFocus={() => { if (!opened.current) { opened.current = true; track('chat-open') } }}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'                          // 随内容长高到 160px 封顶
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
            }}
            onKeyDown={onKeyDown} />
          <div className="cbBar">
            {input.length > MAX_TEXT - 200
              ? <span className="cbNum">{input.length}/{MAX_TEXT}</span>
              : <span className="cbHint">{t('chat.hint')}</span>}
            <Button lg disabled={busy || !input.trim()} onClick={() => void ask(input)}>{t('chat.send')}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
