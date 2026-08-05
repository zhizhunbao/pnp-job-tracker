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
  cited?: boolean       // 服务端回读答复打的标(chatOrchestrate.citeFacts):这条答复真用到了吗
}
// degraded = 服务端出口校验两次没过,`answer` 其实是**一句说明 + 一张原始事实清单**(chatOrchestrate.factSheet)。
// 不许假装成正常答复,也不许拿它当报错 —— 它是我们真查到的东西,只是没被组织成一段话。
export type Answer = { answer: string; slots?: Record<string, unknown>; facts?: Fact[]; followups?: string[]; degraded?: boolean }

// 数字显示:value=null 一律念官方原文;单位跟数字同格(% 不留空格,其余留)
const factValue = (f: Fact): string => {
  if (f.value == null) return f.valueText || ''
  const v = f.value.toLocaleString('en-CA')
  if (!f.unit) return v
  return f.unit === '%' ? v + '%' : v + ' ' + f.unit
}
const isExt = (u: string) => /^https?:/i.test(u)
// 链接文字用**官方站点名**(域名),不用「Open」——「Open」不告诉用户这是谁说的。
// 站内页(职位板 /?prov=…)用品牌名:它语言中立,不必翻译,也不会把工具层的中文 label 漏进英文界面。
const srcName = (u: string): string => {
  if (!isExt(u)) return 'Offer2PR'
  try { return new URL(u).hostname.replace(/^www\./, '') } catch { return 'Offer2PR' }
}

/**
 * 降级清单的排版。**不是 markdown 渲染** —— 认的只有我们自己写的那个行首 `- `
 * (chatOrchestrate.factSheet 拼的),一个记号一条规则,不引解析器、不碰 innerHTML。
 *
 * 为什么值得单独排:pre-wrap 下 14 行 `- 标签: 值` 折行后**续行顶回行首**,读起来就是一坨
 * (Frank 实测原话「一坨」)。悬挂缩进 + 行距一改,同一份文字就分得清「几条事实」了。
 * 第一行是那句人话说明,单独一段,不挂项目符号。
 */
function Sheet({ text }: { text: string }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const head = lines[0] && !lines[0].startsWith('- ') ? lines[0] : ''
  const items = (head ? lines.slice(1) : lines).map((l) => l.replace(/^-\s*/, ''))
  return (
    <div className="cbA cbSheet">
      {head ? <div className="cbSheetH">{head}</div> : null}
      {items.map((l, k) => <div className="cbSheetI" key={k}>{l}</div>)}
    </div>
  )
}

export function ChatAnswer({ a, busy, onAsk }: { a: Answer; busy: boolean; onAsk: (q: string) => void }) {
  const [, , t] = useLang()
  // 🔴 出处只列**答复真的用到的**(服务端 citeFacts 回读答复标的;降级成事实清单时服务端会把有出处的全标上)。
  // 旧版全量倾倒 24 条:用户问中介收费,出处里摆着 AB/ON/QC 的岗位数 —— 没一条与那句话有关,读者只会当噪音。
  // 这里**不做兜底全量**:标不上就是没用到,列出来只是把噪音搬回来。
  const facts = (a.facts ?? []).filter((f) => f.cited && f.evidence?.url)
  return (
    <div className="cbMsg">
      {a.degraded ? <Sheet text={a.answer} /> : <div className="cbA">{a.answer}</div>}

      {/* 出处:<details> 原生折叠(零依赖、键盘可达)。默认收起 —— 一上来铺 8 行数字表会把结论压没了,
          但摘要行必须**说清有几条**,不然没人知道下面藏着可点的官方原页 */}
      {facts.length > 0 && (
        <details className="cbSrc">
          <summary>{t('chat.sources')}<span className="cbCnt">{facts.length}</span></summary>
          <div>
            {/* 一条出处 = **一行**(旧版把标签/数值/Open/抓取时间摞成四行,8 条就是 32 行)。
                抓取时间挪进链接的 title:它是取证信息,不是每行都要看的东西 */}
            {facts.map((f, k) => {
              const ev = f.evidence
              return (
                <div className="cbFact" key={k}>
                  <span style={{ minWidth: 0, color: UI.text2 }}>{f.label}</span>
                  {/* value=null → valueText 原文;两者都空就整格留白,不编「暂无」 */}
                  <span className="cbFactV">{factValue(f)}</span>
                  <a className="cbFactS" href={ev.url}
                    title={ev.fetched ? t('match.srcFetched', { d: ev.fetched.slice(0, 10) }) : ev.url}
                    target={isExt(ev.url) ? '_blank' : undefined} rel={isExt(ev.url) ? 'noreferrer' : undefined}>
                    {srcName(ev.url)}
                  </a>
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
  /* 降级清单:一条事实一行、续行悬挂缩进(pre-wrap 直接铺会让续行顶回行首,14 行糊成一坨)。
     左侧一道细线把「这是原始事实,不是组织好的答复」说清楚,不用再加一句解释文案 */
  .cbSheet{white-space:normal;border-left:2px solid ${UI.hairline};padding-left:12px}
  .cbSheetH{margin-bottom:6px;color:${UI.text2};font-size:13.5px;line-height:1.6}
  /* 项目符号用 CSS 画,不用「·」这个字(站规:那个字是分隔号,不当记号使);
     绝对定位的记号 = 真悬挂缩进,折行后自动对齐到 padding-left */
  .cbSheetI{position:relative;padding-left:14px;margin-top:6px;line-height:1.6}
  .cbSheetI::before{content:'';position:absolute;left:3px;top:.72em;width:5px;height:5px;
    border-radius:50%;background:#bfdbfe}
  .cbSrc{margin-top:12px;border-top:1px solid ${UI.hairline};padding-top:8px}
  .cbSrc>summary{list-style:none;cursor:pointer;font-size:12px;font-weight:600;color:${UI.text2};display:inline-flex;align-items:center;gap:6px;padding:2px 0}
  .cbSrc>summary::-webkit-details-marker{display:none}
  .cbSrc>summary::before{content:'\\25B8';font-size:9px;color:${UI.text3}}
  .cbSrc[open]>summary::before{content:'\\25BE'}
  .cbSrc>summary:hover{color:${UI.primary}}
  .cbCnt{background:${UI.hairline};color:${UI.text2};border-radius:999px;padding:0 7px;font-size:11px;font-weight:600}
  /* 出处行:**一条一行**(标签 | 数值 | 官方站点名),375 上标签自己折行,数值与站名不折、不横滚(站规)。
     站名列封到 40% 宽:长域名(saskatchewan.ca 这类)自己截,绝不把整行顶宽 */
  .cbFact{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,auto);gap:2px 10px;padding:7px 0;
    border-top:1px solid ${UI.hairline};align-items:baseline;font-size:13px}
  .cbFactV{text-align:right;white-space:nowrap;font-weight:600;color:${UI.text}}
  .cbFactS{max-width:40%;color:${UI.primary};text-decoration:none;white-space:nowrap;overflow:hidden;
    text-overflow:ellipsis;font-size:12px}
  .cbFactS:hover{text-decoration:underline}
  /* 追问 chip:整句放不进 375 的一行 → 允许折行(不是胶囊挤扁,是块状 chip),永不横向溢出 */
  .cbFus{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
  .cbFusT{width:100%;font-size:11.5px;font-weight:600;color:${UI.text3}}
  .cbFu{max-width:100%;text-align:left;background:#fff;border:1px solid ${UI.border};border-radius:12px;
    padding:7px 12px;font-size:13px;line-height:1.4;color:${UI.primary};font-family:inherit;cursor:pointer}
  .cbFu:hover{border-color:#bfdbfe;background:#f8fafc}
  .cbDisc{font-size:11.5px;color:${UI.text3};margin-top:12px;line-height:1.5;max-width:74ch}
`
