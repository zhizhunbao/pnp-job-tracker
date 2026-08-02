'use client'
// 职位卡(手机形态)—— **全站唯一一套**,2026-08-02 Frank「卡片也用 jobtable 的卡片」「以后这个定死」。
// 形态来自职位板窄屏卡(JobsTable ≤640 卡片列表),此处抽成组件后由职位板与 landing 职位榜共用:
//   职位名(蓝字可点、不加粗)/ NOC 译名灰注 / 公司 · 薪资(绿) / 地点 · 日期 / 通道胶囊排 / 页脚
// 左右两列是这张卡的骨:**左列=身份**(公司、地点)、**右列=数字**(薪资、时间)——
// 右列右对齐后在卡片流里连成一条竖线,手指下滑时眼睛只走右边就能比薪资、比新鲜度(#148 拍板)。
//
// 组件只管**版式**,不管数据与交互:可点的东西一律由调用方给 href/onClick,
// 胶囊排、右上角按钮、页脚都是插槽 —— 职位板要弹框/星标/排除态,landing 只有一个去处,
// 两边给不同的内容,但长相由这里定死。加字段先想清楚该不该进这张卡(卡片寸土寸金)。
import React from 'react'

import { UI } from './primitives'

// 可点文本:三种形态都支持 —— 纯文本(不传 href/onClick)、链接、拦截成弹框的链接
export type CardLink = { text: string; href?: string; onClick?: (e: React.MouseEvent) => void; title?: string }

function LinkText({ v, style }: { v: CardLink; style: React.CSSProperties }) {
  const clickable = !!(v.href || v.onClick)
  if (!clickable) return <span title={v.title} style={style}>{v.text}</span>
  return (
    <a href={v.href || undefined} title={v.title} onClick={v.onClick}
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
