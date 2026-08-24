'use client'
// 答复区(2026-08-04 从 ChatBox 拆出:对话形态重做,历史在上 composer 在下)。
// 一条助手答复的三段结构 —— **结论正文 → 出处(默认折叠)→ 追问**。
// 为什么不套现成聊天框架:assistant-ui / ai-chatbot 的消息模型里只有 markdown 文本,
// 没有 facts / evidence / followups —— 而这三样正是本站与通用聊天的全部区别,
// 套进去等于把「每个数字都能点回官方原页」降级成一段纯文本。所以只抄形态,自己渲。
//
// 红线(与 lib/chat/tools 同口径,不许放松):`value === null` 是官方隐私抑制(如 "Less than 10"),
// 渲 valueText 原文,**永不折成 0 或「暂无」** —— 折了就是替官方编了个数字。
import { useState } from 'react'

import { IconCheck, IconClipboard, IconThumbDown, IconThumbUp } from '@/components/ui'
import { useLang } from '@/components/i18n'
import { UI } from '@/components/ui'
import { track } from '@/lib/track'

// 后端契约(POST /api/consult/chat 200 体)——由 api/chat/route.ts 定,这里只照抄形状,不自行扩展
export type Fact = {
  tool: string; label: string; value: number | null; valueText: string; unit: string
  evidence: { url: string; fetched: string; label?: string; section?: string }
  cited?: boolean       // 服务端回读答复打的标(lib/chat/followups.citeFacts):这条答复真用到了吗
}
// degraded = 服务端出口校验两次没过,`answer` 其实是**一句说明 + 一张原始事实清单**(lib/chat/stream.factSheet)。
// 不许假装成正常答复,也不许拿它当报错 —— 它是我们真查到的东西,只是没被组织成一段话。
/** C6 选项卡(服务端 lib/chat/types.ChatOption):需要决定才有;第 4 张「自己说」由前端固定给 */
export type AnswerOption = { label: string; consequence?: string; sendText: string; recommended?: boolean }
export type Answer = {
  answer: string; slots?: Record<string, unknown>; facts?: Fact[]; followups?: string[]
  activity?: string[] // 快速 JSON 路径里随定稿返回的真实工具轨迹；SSE 路径仍逐条收 step
  options?: { reason: string; items: AnswerOption[] }
  thread?: string   // chat_logs 同名串 ID(首轮提问哈希):面板显示+复制,拿它可从留痕拉整串对话排查
  degraded?: boolean
}

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

/** 助手正文的唯一渲染出口(答复 / 降级清单 / 引导语 / **逐句流式的半截正文**共用一套排版)。
 *  `caret` = 还在写(光标跟在最后一个块尾巴上)。半截正文走同一个渲染器不是洁癖:
 *  服务端放行的单位是**整句**,那截里早就带着行首 `- ` 了 —— 另用 pre-wrap 铺一遍,
 *  用户会先看见一串裸着的 `- `,等整段落地再跳成项目符号,白白抖一次版。 */
export function ChatText({ text, sheet, caret }: { text: string; sheet?: boolean; caret?: boolean }) {
  const blocks = textBlocks(text)
  const last = blocks.length - 1
  const tip = (on: boolean) => (on && caret ? <i className="cbCaret" /> : null)
  return (
    <div className={sheet ? 'cbA cbSheet' : 'cbA'}>
      {blocks.map((b, i) => (b.type === 'ul'
        ? <div className="cbUl" key={i}>{b.items.map((s, k) => (
          <div className="cbLi" key={k}>{s}{tip(i === last && k === b.items.length - 1)}</div>))}</div>
        : <p className="cbP" key={i}>{b.text}{tip(i === last)}</p>))}
    </div>
  )
}

export function ChatAnswer({ a, busy, onAsk }: { a: Answer; busy: boolean; onAsk: (q: string) => void }) {
  const [, , t] = useLang()
  // 答复下方一排小图标(2026-08-05 照 GPT/Claude 形态;原来是一行文字钮)。
  // 只留三个 —— 复制 + 赞 + 踩。「分叉 / 重生成 / 继续」在我们这儿语义上不成立:
  // 对话不落库、答复过五道出口校验不能随手重来(2026-08-04 Open WebUI 取样结论)。
  const [copied, setCopied] = useState(false)
  const [srcOpen, setSrcOpen] = useState(false)   // 出处清单开合(开关在操作条同一行)
  const canCopy = typeof navigator !== 'undefined' && !!navigator.clipboard    // 非安全上下文没有它,那就不出这个钮
  // 🔴 赞/踩 —— **通用聊天的点赞是训练信号,我们的点踩是数据缺口报警器**:
  // 每一个踩都是用户在替我们标注「这里答不好」,还是按真实频次排好序的。
  // 所以问句要显眼到有人愿意点,又轻到不烦人;点过就收问句、图标定选中态,不给人反复点的机会。
  // 只发 good/bad 两个枚举,**不收自由文本**(那要动隐私页,等看到点踩率再说)。
  const [vote, setVote] = useState<'' | 'good' | 'bad'>('')
  const rate = (kind: 'good' | 'bad') => {
    if (vote) return
    setVote(kind)
    track('chat-feedback', { kind })   // 走已有 funnel_events,零新表零 DDL(白名单在 lib/funnel 那边加)
  }
  // 🔴 出处只列**答复真的用到的**(服务端 citeFacts 回读答复标的;降级成事实清单时服务端会把有出处的全标上)。
  // 旧版全量倾倒 24 条:用户问中介收费,出处里摆着 AB/ON/QC 的岗位数 —— 没一条与那句话有关,读者只会当噪音。
  // 这里**不做兜底全量**:标不上就是没用到,列出来只是把噪音搬回来。
  const facts = (a.facts ?? []).filter((f) => f.cited && f.evidence?.url)
  return (
    <div className="cbMsg">
      <ChatText text={a.answer} sheet={a.degraded} />

      {/* 操作条:图标 40×40(站规触控靶),文字只进 title/aria-label(三语),不占版面。
          问句跟在图标后面同一行,375 上放不下就 flex-wrap 折下去 —— 永不横滚 */}
      <div className="cbActs">
        {canCopy && (
          <button className="cbAct" aria-label={t(copied ? 'chat.copied' : 'chat.copy')}
            title={t(copied ? 'chat.copied' : 'chat.copy')} onClick={() => {
              navigator.clipboard.writeText(a.answer).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1800)
              }).catch(() => { /* 用户拒了剪贴板权限:不弹错,钮保持原样 */ })
            }}>
            {copied ? <IconCheck size={16} /> : <IconClipboard size={16} />}
          </button>
        )}
        <button className={vote === 'good' ? 'cbAct cbVoted' : 'cbAct'} disabled={!!vote}
          aria-label={t('chat.fb.good')} title={t('chat.fb.good')} aria-pressed={vote === 'good'}
          onClick={() => rate('good')}><IconThumbUp size={16} /></button>
        <button className={vote === 'bad' ? 'cbAct cbVoted' : 'cbAct'} disabled={!!vote}
          aria-label={t('chat.fb.bad')} title={t('chat.fb.bad')} aria-pressed={vote === 'bad'}
          onClick={() => rate('bad')}><IconThumbDown size={16} /></button>
        {/* 「解决了你的问题吗?」问句 2026-08-09 Frank 拍板撤掉:图标自解释(title/aria 三语还在),
            文字只把操作条拉宽。 */}
        {/* 出处开关与图标同一行(2026-08-09 Frank「放一行」,分割线随之撤):按钮态折叠,aria-expanded
            驱动箭头,键盘可达;展开的清单仍全宽铺在操作条下。默认收起 —— 一上来铺 8 行数字表会把
            结论压没了,但开关必须**说清有几条**,不然没人知道下面藏着可点的官方原页 */}
        {facts.length > 0 && (
          <button className="cbSrcTgl" aria-expanded={srcOpen} onClick={() => setSrcOpen((v) => !v)}>
            {t('chat.sources')}<span className="cbCnt">{facts.length}</span>
          </button>
        )}
      </div>

      {facts.length > 0 && srcOpen && (
        <div className="cbSrc">
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
        </div>
      )}

      {/* 追问胶囊堆 2026-08-09 Frank「只要你这种」拍板撤掉:每轮唯一交互块=选项卡形态
          (建档卡或装着四条推荐问题的同款卡),渲染在 ChatBox 的卡位;答复组件只管答复本体。 */}
      {/* 免责句原来钉在**每条**答复下面 —— 一轮问答铺三条就重复三遍,那是噪音不是合规。
          2026-08-05 挪到面板底部 composer 边上常驻一条(ChatBox),全局只出现一次。 */}
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
  /* 答复下方的操作条(复制 / 赞 / 踩)。图标 16px 但命中区 40×40(站规触控靶):
     大量留白让三个钮看着轻,手指按着又不飘。**不用负 margin 去抵消那份留白**(GPT 那手):
     线程是 overflow:auto 的,伸到容器左边以外会被裁掉半个命中区。glyph 因此比正文缩进约 12px,
     跟项目符号的 14px 悬挂缩进正好同一档,看着是对齐的。
     flex-wrap:375 上问句放不下就折到第二行,绝不横滚 */
  /* gap 8→0:三钮各自 40×40 触控靶(#276 底线)已经互留了足够空隙,再加 gap 图标就散了(08-09 Frank) */
  .cbActs{display:flex;flex-wrap:wrap;align-items:center;gap:2px 0;margin-top:2px}
  .cbAct{width:40px;height:40px;flex:none;display:inline-flex;align-items:center;justify-content:center;
    background:none;border:none;border-radius:8px;color:${UI.text3};cursor:pointer}
  .cbAct:hover:not(:disabled){color:${UI.text2};background:${UI.hairline}}
  .cbAct:disabled{cursor:default}
  /* 选中态:选的那个亮起来,另一个留着但退到极淡 —— 「我点过了」得一眼看得出来 */
  .cbAct:disabled:not(.cbVoted){opacity:.35}
  .cbVoted{color:${UI.primary}}
  /* 出处开关:与三图标同行同高(40px 触控靶),箭头随 aria-expanded 翻向;清单容器只留一点顶距,
     原「分割线+独占一行」的两行形态 08-09 Frank「放一行」撤掉 */
  .cbSrcTgl{border:none;background:none;cursor:pointer;font-size:12px;font-weight:600;color:${UI.text2};
    display:inline-flex;align-items:center;gap:6px;padding:0 8px;min-height:40px;font-family:inherit}
  .cbSrcTgl::before{content:'\\25B8';font-size:9px;color:${UI.text3}}
  .cbSrcTgl[aria-expanded="true"]::before{content:'\\25BE'}
  .cbSrcTgl:hover{color:${UI.primary}}
  .cbSrc{margin-top:2px}
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
`
