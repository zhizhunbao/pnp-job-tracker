'use client'
/**
 * 官方主要职责 / 任职要求卡:逐条一行;中文对照开着时**逐句对照**
 * —— 英文行下跟译文行(noc-translate 按行编号对位,行数恒等)。
 * 同文 = 该行没翻到(#181 部分容错保留英文)→ 不重复渲。
 * #191 对齐:抓取日期全角括号退役 → 空格灰注(与公司简介检索日期同款)。
 * 2026-08-28 换装批自 Advisor.tsx 的 listBlock 提出成件。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { cssOf } from '@/components/css'
import { CARD_HEAD_CLS, CARD_MD_CLS, TEXT_NONE } from './constants'
import type { NocListIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染职责/要求卡。
 *
 * @param props 卡标题、抓取日期、原文逐条与译文逐条。
 * @returns 卡;一条都没有时整卡不渲(绝不留孤儿小标题)。
 */
export function NocList({ head, fetched, items, zhItems }: NocListIn) {
  if (items.length === 0) {
    return null
  }
  const lis = []
  for (let i = 0; i < items.length; i = i + 1) {
    const en = String(items[i])
    const zh = zhItems[i]
    let trans = null
    if (zh != null && zh !== TEXT_NONE && zh !== en) {
      trans = <div className={cssOf(css.zh)}>{zh}</div>
    }
    lis.push(<li key={en}>{en}{trans}</li>)
  }
  return (
    <div className={CARD_MD_CLS}>
      <div className={CARD_HEAD_CLS}>
        {head}
        {fetched !== TEXT_NONE && <span className={cssOf(css.fetched)}>{fetched}</span>}
      </div>
      <ul className={cssOf(css.duties)}>{lis}</ul>
    </div>
  )
}
