'use client'
// 答复区(2026-08-04 从 ChatBox 拆出:对话形态重做,历史在上 composer 在下)。
// 一条助手答复的三段结构 —— **结论正文 → 出处(默认折叠)→ 追问**。
// 为什么不套现成聊天框架:assistant-ui / ai-chatbot 的消息模型里只有 markdown 文本,
// 没有 facts / evidence / followups —— 而这三样正是本站与通用聊天的全部区别,
// 套进去等于把「每个数字都能点回官方原页」降级成一段纯文本。所以只抄形态,自己渲。
//
// 红线(与 chatTools 同口径,不许放松):`value === null` 是官方隐私抑制(如 "Less than 10"),
// 渲 valueText 原文,**永不折成 0 或「暂无」** —— 折了就是替官方编了个数字。
import { useState } from 'react'

import { IconCheck, IconClipboard } from '../Icons'
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
 * §排版 —— **不是 markdown 渲染**(2026-08-04 Open WebUI 取样后扩到全部答复;原来只用在降级清单上)。
 * 认的记号**只有两个**,都是我们自己约定的:
 *   ① 空行  → 分段(段距 8px);
 *   ② 行首 `- ` → 项目符号一条(连续多条合成一组,悬挂缩进)。
 * **不认** 标题 / 加粗 / 表格 / 代码块 —— 那要么得引 markdown 依赖,要么得碰 dangerouslySetInnerHTML,
 * 两条都不走。产出永远是纯文本节点,注入面为零。
 *
 * 为什么值得排:pre-wrap 一铺到底时,14 行 `- 标签: 值` 折行后**续行顶回行首**,读起来就是一坨
 * (Frank 实测原话「一坨」);长答复没有段落概念时同理,一屏字没有落脚点。
 * **向后兼容**:模型今天多半还不产 `- `(提示词那半另派)—— 没有记号就当普通段落,不显示空列表。
 */
type Block = { type: 'p'; text: string } | { type: 'ul'; items: string[] }
const BULLET = /^-\s+(.+)$/
export function textBlocks(text: string): Block[] {
  const out: Block[] = []
  let para: string[] = []
  const flush = () => { if (para.length) { out.push({ type: 'p', text: para.join('\n') }); para = [] } }
  for (const raw of text.split('\n')) {
    const s = raw.trim()
    if (!s) { flush(); continue }
    const m = BULLET.exec(s)
    if (!m) { para.push(s); continue }
    flush()
    const last = out[out.length - 1]
    if (last && last.type === 'ul') last.items.push(m[1])
    else out.push({ type: 'ul', items: [m[1]] })
  }
  flush()
  return out
}

/** 助手正文的唯一渲染出口(答复 / 降级清单 / 引导语共用一套排版) */
export function ChatText({ text, sheet }: { text: string; sheet?: boolean }) {
  return (
    <div className={sheet ? 'cbA cbSheet' : 'cbA'}>
      {textBlocks(text).map((b, i) => (b.type === 'ul'
        ? <div className="cbUl" key={i}>{b.items.map((s, k) => <div className="cbLi" key={k}>{s}</div>)}</div>
        : <p className="cbP" key={i}>{b.text}</p>))}
    </div>
  )
}

export function ChatAnswer({ a, busy, onAsk }: { a: Answer; busy: boolean; onAsk: (q: string) => void }) {
  const [, , t] = useLang()
  // 每条答复只留**一个**操作:复制(2026-08-04 Open WebUI 取样结论——它那排 8-9 个图标里,
  // 「分叉 / 重生成 / 继续」在我们这儿语义上不成立:对话不落库、答复过五道出口校验不能随手重来)
  const [copied, setCopied] = useState(false)
  const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard    // 非安全上下文没有它,那就不出这个钮
  // 🔴 出处只列**答复真的用到的**(服务端 citeFacts 回读答复标的;降级成事实清单时服务端会把有出处的全标上)。
  // 旧版全量倾倒 24 条:用户问中介收费,出处里摆着 AB/ON/QC 的岗位数 —— 没一条与那句话有关,读者只会当噪音。
  // 这里**不做兜底全量**:标不上就是没用到,列出来只是把噪音搬回来。
  const facts = (a.facts ?? []).filter((f) => f.cited && f.evidence?.url)
  return (
    <div className="cbMsg">
      <ChatText text={a.answer} sheet={a.degraded} />

      {canCopy && (
        <button className="cbAct" onClick={() => {
          navigator.clipboard.writeText(a.answer).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1800)
          }).catch(() => { /* 用户拒了剪贴板权限:不弹错,钮保持原样 */ })
        }}>
          {copied ? <IconCheck /> : <IconClipboard />}
          <span>{t(copied ? 'chat.copied' : 'chat.copy')}</span>
        </button>
      )}

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
  /* 排版基线(2026-08-04 对齐 Open WebUI 取样:15px / 1.625 / 段距 8px)。
     **AI 答复满宽无气泡** —— 只有用户消息有气泡(.cbQ)。长答复套气泡是可读性杀手:
     气泡把正文再挤窄一圈,还在每段两侧加一道视觉边界。
     行宽上限不写死 ch:原来那行 max-width:74ch 在 380px 面板里从头到尾没生效过(74ch≈555px),
     是行死 CSS。真正的行宽闸门放在 .cbTurn 的 --cbW(见 ChatBox),这里只保证不撑破容器。 */
  .cbA{font-size:15px;line-height:1.625;color:${UI.text};overflow-wrap:anywhere;max-width:100%;min-width:0}
  /* 段落:空行分段 → 8px 段距(最后一段不留)。pre-wrap 保住段内的软换行 */
  .cbP{margin:0 0 8px;white-space:pre-wrap}
  .cbP:last-child{margin-bottom:0}
  /* 逐字流式的半截正文(服务端今天不发 delta,路径备着):还没成段,原样 pre-wrap 铺 */
  .cbPre{white-space:pre-wrap}
  /* 项目符号组:行首「- 」渲成这个。记号用 CSS 画,不用「·」这个字(站规:那是分隔号,不当记号使);
     绝对定位的记号 = 真悬挂缩进,折行后续行自动对齐到 padding-left,不顶回行首 */
  .cbUl{margin:0 0 8px}
  .cbUl:last-child{margin-bottom:0}
  .cbLi{position:relative;padding-left:14px;margin-top:4px;white-space:pre-wrap}
  .cbLi:first-child{margin-top:0}
  .cbLi::before{content:'';position:absolute;left:3px;top:.66em;width:5px;height:5px;
    border-radius:50%;background:#bfdbfe}
  /* 降级清单:同一套段落/项目符号排版,只多一道左细线 ——
     把「这是原始事实,不是组织好的答复」说清楚,不用再加一句解释文案 */
  .cbSheet{border-left:2px solid ${UI.hairline};padding-left:12px}
  /* 每条答复唯一的操作钮:复制。弱化到不抢正文(灰字 12px),命中区仍有 24px 高 */
  .cbAct{display:inline-flex;align-items:center;gap:6px;margin-top:8px;padding:3px 0;
    background:none;border:none;font-family:inherit;font-size:12px;line-height:1.5;
    color:${UI.text3};cursor:pointer}
  .cbAct:hover{color:${UI.text2}}
  .cbSrc{margin-top:12px;border-top:1px solid ${UI.hairline};padding-top:8px}
  .cbSrc>summary{list-style:none;cursor:pointer;font-size:12px;font-weight:600;color:${UI.text2};display:inline-flex;align-items:center;gap:6px;padding:2px 0}
  .cbSrc>summary::-webkit-details-marker{display:none}
  .cbSrc>summary::before{content:'\\25B8';font-size:9px;color:${UI.text3}}
  .cbSrc[open]>summary::before{content:'\\25BE'}
  .cbSrc>summary:hover{color:${UI.primary}}
  .cbCnt{background:${UI.hairline};color:${UI.text2};border-radius:999px;padding:0 7px;font-size:11px;font-weight:600}
  /* 出处行:**一条一行**(标签 | 数值 | 官方站点名),375 上标签自己折行,数值与站名不折、不横滚(站规)。
     站名列的封顶从 40% 换成 200px(2026-08-04 实测修):百分比 max-width 在 auto 网格轨道里是**循环依赖**
     ——轨道按内容定宽,内容又按轨道取百分比,浏览器解出来的结果是把站名一律截到 72px。
     实测三档全中:immigration-quebec.gouv.qc.ca 显示成「immig…」,连是谁说的都看不出来。
     px 封顶没有这个循环:轨道 = min(域名实宽, 200px),最长的官方域名 181px 正好整条显示。 */
  .cbFact{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,auto);gap:2px 10px;padding:7px 0;
    border-top:1px solid ${UI.hairline};align-items:baseline;font-size:13px}
  .cbFactV{text-align:right;white-space:nowrap;font-weight:600;color:${UI.text}}
  .cbFactS{max-width:200px;color:${UI.primary};text-decoration:none;white-space:nowrap;overflow:hidden;
    text-overflow:ellipsis;font-size:12px}
  .cbFactS:hover{text-decoration:underline}
  /* 追问 chip:整句放不进 375 的一行 → 允许折行(不是胶囊挤扁,是块状 chip),永不横向溢出 */
  .cbFus{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
  .cbFusT{width:100%;font-size:11.5px;font-weight:600;color:${UI.text3}}
  .cbFu{max-width:100%;text-align:left;background:#fff;border:1px solid ${UI.border};border-radius:12px;
    padding:7px 12px;font-size:13px;line-height:1.4;color:${UI.primary};font-family:inherit;cursor:pointer}
  .cbFu:hover{border-color:#bfdbfe;background:#f8fafc}
  .cbDisc{font-size:11.5px;color:${UI.text3};margin-top:12px;line-height:1.5;max-width:100%}
`
