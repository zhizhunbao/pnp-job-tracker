'use client'
// 卡片积木(E8-08 #121,2026-07-20 Frank「按逻辑拆」拍板):纯样式原子零逻辑 ——
// 手机卡片=每域自己的组件用这三块拼(组合复用样式,不合并逻辑);解剖/hover 规范见 implementation/E8-08。
// ①Card 卡壳(白卡描边 r12,右上操作位走 position:absolute 自摆)②CardKV 键值区(两列 grid,wide 独占行)③CardAction 操作行。
//
// 白卡壳(2026-08-11 Frank「都改成一套」):**全站唯一一份**描边+圆角+白底。
// 原先散在 10 处:JobsTable.MODAL_CARD / TripleVerdictModal.CARD / 详情页 sec 三份逐字符相同,
// 加上 news/stats/account/公司页 的内联写法。padding 各页不同(密度不同)所以留在调用方,
// 壳本身不许再抄一遍;12/16 这档最常用,直接给成 CARD_MD。
import React from 'react'

import { UI } from './tokens'

export const CARD_SHELL: React.CSSProperties = { background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 12 }
export const CARD_MD: React.CSSProperties = { ...CARD_SHELL, padding: '12px 16px', marginBottom: 14 }

export function Card({ style, children }: { style?: React.CSSProperties; children: React.ReactNode }) {
  return <div style={{ ...CARD_SHELL, padding: '10px 12px', marginBottom: 8, position: 'relative', ...style }}>{children}</div>
}

export function CardKV({ items }: { items: { k: React.ReactNode; v: React.ReactNode; wide?: boolean }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 14px', marginTop: 6 }}>
      {items.map((it, i) => (
        <div key={i} style={it.wide ? { gridColumn: '1 / -1' } : undefined}>
          <div style={{ fontSize: 11.5, color: UI.text3 }}>{it.k}</div>
          <div style={{ fontSize: 13, color: '#374151' }}>{it.v}</div>
        </div>
      ))}
    </div>
  )
}

export function CardAction({ children }: { children: React.ReactNode }) {
  return <div style={{ marginTop: 6, fontSize: 12.5 }}>{children}</div>
}

// ── 升级卡与打码锁区 ─────────────────────────────────────────────
// ⚠️ 与上面的 Card 只是同住一个文件,**不是同一套皮**:Card 是白卡壳,ProCard 是琥珀色升级 CTA,
// 它不用 CARD_SHELL。2026-08-17 Frank「ProCard 和 Card 有什么关系」——答:没关系,名字是历史遗留。
// ProCard(全站统一升级卡,G3 起;规范:docs/design/G3-简历对照JD-20260803.md §1,Frank 八轮收敛定稿):
// 单行淡黄底 + 琥珀短句(零符号、超长删词不折行)+ 蓝钮「解锁 Pro」。全站升级入口一律用它,不再自造。
// LockedRows(打码锁区,G3 起):行数=真实剩余条数(数字真、纹理假 —— 真内容服务端不下发,
// 这里渲染的是固定占位假词);n≥4 时 ProCard 悬浮正中,n<4 卡放码尾(卡不许盖住超过一半的码,Frank 拍)。

export function ProCard({ text, cta, onClick, overlay = false }: {
  text: string; cta: string; onClick: () => void; overlay?: boolean   // overlay=悬浮在打码区正中(LockedRows 内部用)
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, background: '#fffbeb', border: '1px solid #fde68a',
      borderRadius: 10, padding: '10px 12px',
      ...(overlay
        ? { position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', margin: 0, width: 'max-content', maxWidth: '92%', boxShadow: '0 4px 14px rgba(0,0,0,.08)' }
        : { marginTop: 12 }),
    }}>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
      <button onClick={onClick} style={{ flex: 'none', background: UI.primary, color: '#fff', fontSize: 13, fontWeight: 600, padding: '7px 13px', borderRadius: 8, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>{cta}</button>
    </div>
  )
}

const BLUR_FILL = ['屏蔽的结论文字示例这里是一句完整的结论', '屏蔽的结论示例文字这一行也是一句结论', '屏蔽的一句结论文字示例内容占位']

export function LockedRows({ n, text, cta, onClick }: { n: number; text: string; cta: string; onClick: () => void }) {
  if (n <= 0) return null
  const overlay = n >= 4
  return (
    <div style={{ position: 'relative', marginTop: 6 }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} aria-hidden style={{ filter: 'blur(5px)', userSelect: 'none', color: UI.text3, fontSize: 13.5, padding: '7px 0', borderBottom: `1px solid ${UI.hairline}` }}>
          {BLUR_FILL[i % BLUR_FILL.length]}
        </div>
      ))}
      <ProCard text={text} cta={cta} onClick={onClick} overlay={overlay} />
    </div>
  )
}

// ── 职位卡(手机形态)── **全站唯一一套**,2026-08-02 Frank「卡片也用 jobtable 的卡片」「以后这个定死」。
// 形态来自职位板窄屏卡,抽成组件后由职位板与 landing 职位榜共用。左列=身份(公司、地点),
// 右列=数字(薪资、时间)—— 右对齐后在卡片流里连成一条竖线,手指下滑只走右边就能比(#148 拍板)。
// 组件只管版式不管数据与交互:可点的一律由调用方给 href/onClick,胶囊排/右上钮/页脚都是插槽。

// 可点文本:三种形态都支持 —— 纯文本(不传 href/onClick)、链接、拦截成弹框的链接
// target:榜单卡的岗名直链官方原帖(站外),要新开页 —— 2026-08-11 榜单并卡时加,站内链不传即同标签
export type CardLink = { text: string; href?: string; onClick?: (e: React.MouseEvent) => void; title?: string; target?: string }

function LinkText({ v, style }: { v: CardLink; style: React.CSSProperties }) {
  const clickable = !!(v.href || v.onClick)
  if (!clickable) return <span title={v.title} style={style}>{v.text}</span>
  return (
    <a href={v.href || undefined} title={v.title} onClick={v.onClick} target={v.target} rel={v.target ? 'noreferrer' : undefined}
      style={{ ...style, color: UI.primary, textDecoration: 'none', cursor: 'pointer' }}>{v.text}</a>
  )
}

export function JobCard({ href, onCardClick, title, note, company, companyBadge, salary, location, date, chips, action, footer }: {
  href?: string                    // 整卡去处(爬虫/长按新开页也靠它);onCardClick 可拦截
  onCardClick?: (e: React.MouseEvent) => void
  title: CardLink                  // 职位名:蓝字、14.5、**不加粗**(蓝色已说明可点,再加粗是同一件事说两遍)
  note?: string                    // NOC 官方职业名译名 —— 岗名看不懂时靠这条
  company?: CardLink
  companyBadge?: React.ReactNode   // 紧跟公司名的小徽章(担保档等)——同属「身份」,不下放到胶囊排
  salary?: React.ReactNode
  location?: React.ReactNode       // 市/省可能各自可点,交给调用方渲染
  date?: React.ReactNode
  chips?: React.ReactNode          // 通道胶囊排(PNP/EE/AIP…),空则整行不出
  action?: React.ReactNode         // 右上角(星标等)
  footer?: React.ReactNode         // 更新时间等
}) {
  const Row = ({ left, right }: { left: React.ReactNode; right: React.ReactNode }) =>
    (left || right) ? (
      <div style={{ marginTop: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>{left}</span>
        <span style={{ flexShrink: 0, textAlign: 'right' }}>{right}</span>
      </div>
    ) : null

  return (
    <div data-tap-card onClick={onCardClick}
      style={{ border: `1px solid ${UI.border}`, borderRadius: 12, padding: '10px 12px', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
        <LinkText v={{ ...title, href: title.href ?? href }} style={{ fontSize: 14.5, minWidth: 0 }} />
        {action ? <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>{action}</span> : null}
      </div>
      {note ? <div style={{ fontSize: 11.5, color: UI.text3, marginTop: 1, lineHeight: 1.4 }}>{note}</div> : null}
      <Row
        left={company || companyBadge ? <>{company ? <LinkText v={company} style={{ fontSize: 12.5 }} /> : null}{companyBadge}</> : null}
        right={salary ? <span style={{ fontSize: 13, color: UI.ok, fontWeight: 700, whiteSpace: 'nowrap' }}>{salary}</span> : null}
      />
      <Row
        left={location ? <span style={{ fontSize: 12.5, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{location}</span> : null}
        right={date ? <span style={{ fontSize: 12.5, color: UI.text3, whiteSpace: 'nowrap' }}>{date}</span> : null}
      />
      {chips ? <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>{chips}</div> : null}
      {footer ? <div style={{ marginTop: 6, fontSize: 11, color: UI.text3 }}>{footer}</div> : null}
    </div>
  )
}
