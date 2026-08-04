'use client'
// C2 对话即产品(设计 docs/design/对话即产品-20260803.md §二 目标形态 / §六 并存迁移):
// landing 主入口的「一句话说说你的情况」输入框 + 答复区。答题卡 2026-08-04 摘除后由它接主位。
//
// 本组件只渲染,不算数 —— 结论、数字、判定全部来自服务端工具层并挂 evidence(总红线)。三条实现红线:
//   ① `value` 可能是 null(官方隐私抑制,如 "Less than 10")→ 渲 valueText 原文,
//      **永不折成 0 或「暂无」**(折了就是替官方编了个数字,与 chatTools 同一口径);
//   ② 错误码各说各话(2026-08-03 简历对照实撞:noJd 被笼统报成「稍后再试」,用户重试也没用)——
//      tooShort/noOcc/limit/llm/guard 各一句,答不了就说答不了,不装作能答;
//   ③ 等待态给真反馈(转圈 + 秒数)但**不假装逐字生成** —— friend 模型非流式,一次十几秒。
import { useEffect, useRef, useState } from 'react'

import { useLang } from '../LangProvider'
import { Button, Notice, UI } from '../ui/primitives'
import { track } from '@/lib/track'

// 后端契约(POST /api/chat)——由 api/chat/route.ts 定,这里只照抄形状,不自行扩展
type Fact = {
  tool: string; label: string; value: number | null; valueText: string; unit: string
  evidence: { url: string; fetched: string; label?: string; section?: string }
}
type Answer = { answer: string; slots?: Record<string, unknown>; facts?: Fact[]; followups?: string[] }
type Msg = { role: 'user' | 'assistant'; content: string }
type Turn = { q: string; a: Answer | null; err: string }

// 错误码 → 文案键。落不到表里的(网络挂、500 无 body)退 net,**不并进 llm**:
// 「模型答不上来」和「请求根本没送到」是两件事,给的下一步动作也不同
const ERR_KEY: Record<string, string> = {
  tooShort: 'chat.err.tooShort', noOcc: 'chat.err.noOcc', limit: 'chat.err.limit',
  llm: 'chat.err.llm', guard: 'chat.err.guard',
}

// 数字显示:value=null 一律念官方原文;单位跟数字同格(% 不留空格,其余留)
const factValue = (f: Fact): string => {
  if (f.value == null) return f.valueText || ''
  const v = f.value.toLocaleString('en-CA')
  if (!f.unit) return v
  return f.unit === '%' ? v + '%' : v + ' ' + f.unit
}
const isExt = (u: string) => /^https?:/i.test(u)

export function ChatBox() {
  const [lang, , t] = useLang()
  const [input, setInput] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [busy, setBusy] = useState(false)
  const [secs, setSecs] = useState(0)
  const opened = useRef(false)          // chat-open 只打第一次聚焦(每次点回输入框都算一次会把口径撑爆)
  const endRef = useRef<HTMLDivElement | null>(null)

  // 等待秒数:friend 模型十几秒不出声,只转圈用户会以为死了 —— 这是「还活着」的证据,不是进度条
  useEffect(() => {
    if (!busy) return
    setSecs(0)
    const id = setInterval(() => setSecs((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [busy])

  const patch = (i: number, v: Partial<Turn>) =>
    setTurns((prev) => prev.map((x, k) => (k === i ? { ...x, ...v } : x)))

  const ask = async (raw: string) => {
    const q = raw.trim()
    if (!q || busy) return
    // 多轮:把已答成的问答对带回去(§二「不是槽位齐了吐整份报告,是多轮按需调工具」);
    // 只带最近 8 条,长会话不把上下文顶爆
    const history: Msg[] = turns.filter((x) => x.a)
      .flatMap((x) => [{ role: 'user' as const, content: x.q }, { role: 'assistant' as const, content: x.a!.answer }])
      .slice(-8)
    const idx = turns.length
    setTurns((prev) => [...prev, { q, a: null, err: '' }])
    setInput('')
    setBusy(true)
    track('chat-submit')
    // 刚提交的那轮滚进视野(block:nearest = 够看见就停,不把页面甩到底)
    setTimeout(() => endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 0)
    try {
      const r = await fetch('/api/chat', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: q, lang, history }),
      })
      const d = await r.json().catch(() => null)
      if (!r.ok || !d || d.error) {
        patch(idx, { err: t(ERR_KEY[String(d?.error)] || 'chat.err.net') })
      } else {
        patch(idx, { a: d as Answer })
        track('chat-answer')
      }
    } catch {
      patch(idx, { err: t('chat.err.net') })
    }
    setBusy(false)
  }

  return (
    <div>
      <style>{`
        /* 输入框 16px:小于 16 时 iOS Safari 聚焦会自动放大页面(手机优先站规,这是全站主输入) */
        .cbIn{width:100%;box-sizing:border-box;border:1px solid ${UI.border};border-radius:10px;padding:11px 12px;
          font-size:16px;line-height:1.5;color:${UI.text};font-family:inherit;resize:vertical;background:#fff}
        .cbIn:focus{outline:none;border-color:#93c5fd;box-shadow:0 0 0 3px rgba(37,99,235,.10)}
        .cbSpin{width:14px;height:14px;flex:none;border-radius:50%;border:2px solid #bfdbfe;border-top-color:${UI.primary};animation:cbSpin .8s linear infinite}
        @keyframes cbSpin{to{transform:rotate(360deg)}}
        @media (prefers-reduced-motion:reduce){.cbSpin{animation:none}}
        /* 出处行:手机 = 标签+数值一行、来源链接自己一行(375 上三件挤一行必截数字);
           ≥700 三列一行,链接顶右。永不横滚(站规) */
        .cbFact{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;padding:8px 0;
          border-top:1px solid ${UI.hairline};align-items:baseline;font-size:13px}
        .cbFactV{text-align:right;white-space:nowrap;font-weight:600;color:${UI.text}}
        .cbFactS{grid-column:1/-1;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
        @media (min-width:700px){
          .cbFact{grid-template-columns:minmax(0,1fr) auto minmax(0,auto)}
          .cbFactS{grid-column:auto;justify-content:flex-end;flex-wrap:nowrap}
        }
        /* 追问:一行一条整宽钮(站规「一行一条」)—— 胶囊在 375 上放不下一句问句,不许横向溢出 */
        .cbFu{display:block;width:100%;text-align:left;background:#fff;border:1px solid ${UI.border};
          border-radius:10px;padding:9px 12px;font-size:13.5px;line-height:1.45;color:${UI.primary};
          font-family:inherit;cursor:pointer;margin-top:6px}
        .cbFu:hover{border-color:#bfdbfe;background:#f8fafc}
        /* 读列宽:节走全站 1320 轨(与各节同宽,不另开窄壳),但**正文与提问气泡限行长** ——
           1200px 一行的散文一行 90+ 词,眼睛回不到行首。表格类(出处行/追问钮)照旧吃满宽,
           这是段落与表格本来就不同的排法,不是版式没排完 */
        .cbA{font-size:14.5px;line-height:1.7;color:${UI.text};white-space:pre-wrap;overflow-wrap:anywhere;max-width:74ch}
        .cbQ{max-width:min(88%,620px);margin-left:auto;background:#eff6ff;border-radius:12px;padding:9px 12px;
          font-size:14px;line-height:1.5;color:#1e40af;white-space:pre-wrap;overflow-wrap:anywhere}
      `}</style>

      <div style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12, padding: 12 }}>
        {/* maxLength 对齐服务端 chatOrchestrate.MAX_TEXT(1200):服务端超了是**静默截断** ——
            前端不拦的话,用户贴 2000 字进来,后半截没被读却看不出来。这里拦住 = 他知道自己写到头了。
            常量不 import:那模块是服务端的(带 pg pool),拖进客户端包不值 */}
        <textarea className="cbIn" rows={3} value={input} placeholder={t('chat.ph')} maxLength={1200}
          onFocus={() => { if (!opened.current) { opened.current = true; track('chat-open') } }}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void ask(input) } }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button lg disabled={busy || !input.trim()} onClick={() => void ask(input)}>{t('chat.send')}</Button>
        </div>

        {turns.map((turn, i) => (
          <div key={i} style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${UI.hairline}` }}>
            <div className="cbQ">{turn.q}</div>
            {turn.err ? (
              <Notice kind="err" style={{ marginTop: 10 }}>{turn.err}</Notice>
            ) : turn.a ? (
              <div style={{ marginTop: 10 }}>
                <div className="cbA">{turn.a.answer}</div>
                {turn.a.facts?.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: UI.text3 }}>{t('chat.sources')}</div>
                    {turn.a.facts.map((f, k) => {
                      const v = factValue(f)
                      const ev = f.evidence
                      return (
                        <div className="cbFact" key={k}>
                          <span style={{ minWidth: 0, color: UI.text2 }}>{f.label}</span>
                          {/* value=null → valueText 原文;两者都空就整格留白,不编「暂无」 */}
                          <span className="cbFactV">{v}</span>
                          <span className="cbFactS">
                            {ev?.url ? (
                              <a href={ev.url} title={ev.label || ev.url}
                                target={isExt(ev.url) ? '_blank' : undefined} rel={isExt(ev.url) ? 'noreferrer' : undefined}
                                style={{ color: UI.primary, textDecoration: 'none', whiteSpace: 'nowrap' }}>{t('chat.sources')}</a>
                            ) : null}
                            {ev?.fetched ? (
                              <span style={{ fontSize: 11.5, color: UI.text3, whiteSpace: 'nowrap' }}>{t('match.srcFetched', { d: ev.fetched.slice(0, 10) })}</span>
                            ) : null}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
                {turn.a.followups?.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: UI.text3 }}>{t('chat.followups')}</div>
                    {turn.a.followups.map((q, k) => (
                      <button key={k} className="cbFu" disabled={busy} onClick={() => void ask(q)}
                        style={busy ? { opacity: 0.55, cursor: 'default' } : undefined}>{q}</button>
                    ))}
                  </div>
                ) : null}
                {/* AI 免责一条(与 advisor 同一句,不另写);页脚那条是全站的,这条是「这段话是模型说的」 */}
                <div style={{ fontSize: 11.5, color: UI.text3, marginTop: 12, lineHeight: 1.5 }}>{t('advisor.disclaimer')}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, color: UI.text2 }}>
                <span className="cbSpin" />
                <span style={{ minWidth: 0 }}>{t('chat.waiting')}</span>
                {/* 秒数紧跟提示语,不顶右:桌面 1200px 宽的行里顶右就与转圈隔了一屏,读不成一句话 */}
                <span style={{ color: UI.text3, whiteSpace: 'nowrap' }}>{secs}s</span>
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}
