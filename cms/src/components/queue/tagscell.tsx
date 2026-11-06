'use client'
/**
 * 域内哑单元格:状态格 —— 一枚状态胶囊(正在跑 / 排队 / 待投 / 查找官网…),出事了再挂一枚红胶囊
 * (上轮失败 / 卡住 / 已核定不取)。四张表共用,只读展示行的三格(TagsCellRow)。
 *
 * @author Frank
 * @time 2026-11-05 23:30:00
 */
import { Tag } from '@/components/tag'
import { TEXT_NONE, VAR_BAD } from './constants'
import type { TagsCellRow } from './types'
import css from './queue.module.css'

/**
 * 渲染状态格。
 *
 * @param r 这一行的展示行。
 * @returns 一到两枚胶囊。
 */
export function TagsCell(r: TagsCellRow) {
  return (
    <span className={css.tags}>
      <Tag variant={r.tagVariant}>{r.tagText}</Tag>
      {r.warnText !== TEXT_NONE && <Tag variant={VAR_BAD}>{r.warnText}</Tag>}
    </span>
  )
}
