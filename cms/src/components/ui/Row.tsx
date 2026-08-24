'use client'
// 事实行:**一条**标签-值,标签列定宽 88。
// 空值守卫是它存在的理由之一:值为 null / '' / '—' 时整行不渲染 —— 缺项不占行(宁可留空),
// 摊开进调用点就是几十处各写一遍 if。
//
// ── 与 Grid 的分界(2026-08-17 Frank「Row 和 Grid 是两回事吧」)────────────────
// 标签宽 **88 是写死的全站约定** —— 正因为写死,散在几十处的 Row 才能上下对齐成一条竖线;
// Grid 的列宽是**这一批数据**用 max-content 算的,换一批就换一个宽度。两种对齐策略互斥:
// 合成一个组件就得同时支持「我是一条」和「我是一批」两种调用姿势,那是个坏 API。
//
// 类名保留 fact* 前缀不改成 row*:裸 `.row` 会撞上 `.jtBtn38.row` 那个修饰类(筛选行的 38 高按钮)。
import React from 'react'

export function Row({ k, children }: { k: React.ReactNode; children: React.ReactNode }) {
  if (children == null || children === '' || children === '—') return null
  return (
    <div className="factRow">
      <span className="factK">{k}</span>
      <span className="factV">{children}</span>
    </div>
  )
}
