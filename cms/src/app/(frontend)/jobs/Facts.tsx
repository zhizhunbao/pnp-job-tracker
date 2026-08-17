'use client'
// 事实卡原语:标签-值行、多列网格、带脚注的事实盒,外加白卡壳的本地别名。
// **叶子文件** —— 谁都用它,它谁都不用(除了 ui 的白卡壳)。这是它单独成文件的全部理由:
// PNP/公司/JD/顾问弹框四处都要拼事实块,原语若和其中任何一处同住,另外三处就得反向依赖那一处。
import { CARD_MD } from '../ui'

// ── 弹框上半:每字段「事实块」(凭证)—— 值 + 口径,绝不经 LLM ──────
// 框架:按 field 分支。pnp/ee 用既有清单组件;其余「零成本」字段(地点/薪资/分类/来源/经验/时间状态)
// 直接读 job 已加载的真实字段渲染。依赖 Part B 抓取的字段(职位 JD / 公司简介 / 官方职责 / 门槛 / 抽选线)留待后续填。
export function FactRow({ k, children }: { k: React.ReactNode; children: React.ReactNode }) {
  if (children == null || children === '' || children === '—') return null
  return (
    <div style={{ display: 'flex', gap: 10, padding: '3px 0', fontSize: 13 }}>
      <span style={{ minWidth: 88, color: '#9ca3af', flexShrink: 0 }}>{k}</span>
      <span style={{ flex: 1, color: '#374151', wordBreak: 'break-word' }}>{children}</span>
    </div>
  )
}
// 多值卡一律「网格列对齐、每列左对齐」(Frank 2026-07-26 走查:「都像最后一个卡片一样排列组合,
// 每列都左对齐;没有拆成多个列的先拆」——基准=本省抽选卡的四列 grid)。
// 用法:cols=列数,children 按行铺平(每行 cols 个格);前 cols-1 列宽 max-content 跨行对齐,末列吃剩余宽。
// 铁律:一行里有多个事实就拆成列,别塞进一句话(那正是「废话多」的来源)。
export function FactGrid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols - 1}, max-content) 1fr`, columnGap: 14, rowGap: 3, alignItems: 'baseline', fontSize: 13, textAlign: 'left' }}>
      {children}
    </div>
  )
}
export const FG_K: React.CSSProperties = { color: '#9ca3af' }                                    // 标签列
export const FG_V: React.CSSProperties = { color: '#374151', fontVariantNumeric: 'tabular-nums' } // 值列
export const FG_N: React.CSSProperties = { color: '#9ca3af', fontSize: 11.5 }                     // 注列
export function FactsBox({ children, note }: { children: React.ReactNode; note?: React.ReactNode }) {
  // Frank 走查#8:去掉卡片底部横线(borderBottom+paddingBottom 退役);组间留白靠 marginBottom
  return (
    <div style={{ marginBottom: 14 }}>
      {children}
      {note ? <div style={{ marginTop: 7, fontSize: 11.5, color: '#9ca3af', lineHeight: 1.5 }}>{note}</div> : null}
    </div>
  )
}

// 分节标题:走既有 col.* 人话名(通道 / PNP / EE 类别 / AIP / 薪资…),不新造术语。
// #174 对齐详情页卡规范(Frank「对齐」):原「标题在卡外、留白分隔」退役 ——
// 每节一张 sec 同款卡(白/#e5e7eb/r12),**每卡必有 title,单节组也不例外**(#173 铁律)。
export const MODAL_CARD: React.CSSProperties = CARD_MD   // 白卡壳全站一份(ui/primitives),这里只留个本地别名
export const MODAL_CARD_HEAD: React.CSSProperties = { fontSize: 13.5, fontWeight: 700, color: '#111827', marginBottom: 6 }
// #186(Frank「公司弹框先别用卡片」):扁平节样式,公司弹框(CompanyPanel)用这套,公司详情页仍用 MODAL_CARD。
// #188(Frank 发 JD 弹框截图「公司的弹框也改成这种风格」):对齐 JdFormattedView 排版——
// 节间细线退役、节头加粗同字号、正文统一缩进(与 JD 五节整理版逐像素同款)。
export const FLAT_SEC: React.CSSProperties = { marginBottom: 10 }
export const FLAT_HEAD: React.CSSProperties = { fontWeight: 700, color: '#111827' }
export const FLAT_BODY: React.CSSProperties = { paddingLeft: 14 }
