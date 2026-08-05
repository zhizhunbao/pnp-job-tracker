'use client'
// 答复区(2026-08-04 从 ChatBox 拆出:对话形态重做,历史在上 composer 在下)。
// 一条助手答复的三段结构 —— **结论正文 → 出处(默认折叠)→ 追问**。
// 为什么不套现成聊天框架:assistant-ui / ai-chatbot 的消息模型里只有 markdown 文本,
// 没有 facts / evidence / followups —— 而这三样正是本站与通用聊天的全部区别,
// 套进去等于把「每个数字都能点回官方原页」降级成一段纯文本。所以只抄形态,自己渲。
//
// 红线(与 chatTools 同口径,不许放松):`value === null` 是官方隐私抑制(如 "Less than 10"),
// 渲 valueText 原文,**永不折成 0 或「暂无」** —— 折了就是替官方编了个数字。
import { useLang } from '../LangProvider'
import { UI } from '../ui/primitives'

// 后端契约(POST /api/chat 200 体)——由 api/chat/route.ts 定,这里只照抄形状,不自行扩展
export type Fact = {
  tool: string; label: string; value: number | null; valueText: string; unit: string
  evidence: { url: string; fetched: string; label?: string; section?: string }
}
export type Answer = { answer: string; slots?: Record<string, unknown>; facts?: Fact[]; followups?: string[] }

// 数字显示:value=null 一律念官方原文;单位跟数字同格(% 不留空格,其余留)
const factValue = (f: Fact): string => {
  if (f.value == null) return f.valueText || ''
  const v = f.value.toLocaleString('en-CA')
  if (!f.unit) return v
  return f.unit === '%' ? v + '%' : v + ' ' + f.unit
}
const isExt = (u: string) => /^https?:/i.test(u)

export function ChatAnswer({ a, busy, onAsk }: { a: Answer; busy: boolean; onAsk: (q: string) => void }) {
  const [, , t] = useLang()
  const facts = a.facts ?? []
  return (
    <div className="cbMsg">
      <div className="cbA">{a.answer}</div>

      {/* 出处:<details> 原生折叠(零依赖、键盘可达)。默认收起 —— 一上来铺 8 行数字表会把结论压没了,
          但摘要行必须**说清有几条**,不然没人知道下面藏着可点的官方原页 */}
      {facts.length > 0 && (
        <details className="cbSrc">
          <summary>{t('chat.sources')}<span className="cbCnt">{facts.length}</span></summary>
          <div>
            {facts.map((f, k) => {
              const ev = f.evidence
              return (
                <div className="cbFact" key={k}>
                  <span style={{ minWidth: 0, color: UI.text2 }}>{f.label}</span>
                  {/* value=null → valueText 原文;两者都空就整格留白,不编「暂无」 */}
                  <span className="cbFactV">{factValue(f)}</span>
                  <span className="cbFactS">
                    {ev?.url ? (
                      <a href={ev.url} title={ev.label || ev.url}
                        target={isExt(ev.url) ? '_blank' : undefined} rel={isExt(ev.url) ? 'noreferrer' : undefined}
                        style={{ color: UI.primary, textDecoration: 'none', whiteSpace: 'nowrap' }}>{t('chat.open')}</a>
                    ) : null}
                    {ev?.fetched ? (
                      <span style={{ fontSize: 11.5, color: UI.text3, whiteSpace: 'nowrap' }}>{t('match.srcFetched', { d: ev.fetched.slice(0, 10) })}</span>
                    ) : null}
                  </span>
                </div>
              )
            })}
          </div>
        </details>
      )}

      {/* 追问:点了带 history 再问一轮(不是重开一段对话) */}
      {a.followups?.length ? (
        <div className="cbFus">
          <div className="cbFusT">{t('chat.followups')}</div>
          {a.followups.map((q, k) => (
            <button key={k} className="cbFu" disabled={busy} onClick={() => onAsk(q)}
              style={busy ? { opacity: 0.5, cursor: 'default' } : undefined}>{q}</button>
          ))}
        </div>
      ) : null}

      {/* AI 免责一条(与 advisor 同一句,不另写):页脚那条是全站的,这条是「这段话是模型说的」 */}
      <div className="cbDisc">{t('advisor.disclaimer')}</div>
    </div>
  )
}

// 样式与 ChatBox 同一块 <style> 注入(答复可能同页出现多条,组件内联 <style> 会重复 N 份)
export const CHAT_ANSWER_CSS = `
  .cbMsg{min-width:0}
  /* 正文限行长:1200px 一行的散文一行 90+ 词,眼睛回不到行首。表格类(出处/追问)照旧吃满宽 */
  .cbA{font-size:14.5px;line-height:1.7;color:${UI.text};white-space:pre-wrap;overflow-wrap:anywhere;max-width:74ch}
  .cbSrc{margin-top:12px;border-top:1px solid ${UI.hairline};padding-top:8px}
  .cbSrc>summary{list-style:none;cursor:pointer;font-size:12px;font-weight:600;color:${UI.text2};display:inline-flex;align-items:center;gap:6px;padding:2px 0}
  .cbSrc>summary::-webkit-details-marker{display:none}
  .cbSrc>summary::before{content:'\\25B8';font-size:9px;color:${UI.text3}}
  .cbSrc[open]>summary::before{content:'\\25BE'}
  .cbSrc>summary:hover{color:${UI.primary}}
  .cbCnt{background:${UI.hairline};color:${UI.text2};border-radius:999px;padding:0 7px;font-size:11px;font-weight:600}
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
  /* 追问 chip:整句放不进 375 的一行 → 允许折行(不是胶囊挤扁,是块状 chip),永不横向溢出 */
  .cbFus{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
  .cbFusT{width:100%;font-size:11.5px;font-weight:600;color:${UI.text3}}
  .cbFu{max-width:100%;text-align:left;background:#fff;border:1px solid ${UI.border};border-radius:12px;
    padding:7px 12px;font-size:13px;line-height:1.4;color:${UI.primary};font-family:inherit;cursor:pointer}
  .cbFu:hover{border-color:#bfdbfe;background:#f8fafc}
  .cbDisc{font-size:11.5px;color:${UI.text3};margin-top:12px;line-height:1.5;max-width:74ch}
`
