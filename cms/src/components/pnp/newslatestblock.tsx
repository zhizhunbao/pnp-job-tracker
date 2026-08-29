'use client'
/**
 * 本省最新公告(E12-06):最新 1-2 条官方新闻标题,链 /news/[slug];无数据整块不出现。
 * 只摆标题+日期(事实),不解读 —— 详情页自带四件套与原文链。
 * Frank 走查#9 卡要 title + #1 删「全部动态 →」跳转链接;#G 去内层 marginBottom(外层卡已有底距)。
 * 2026-08-28 换装批自 Pnp.tsx 整体重写成小写件形制。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { makeT } from '@/lib/i18n'
import { BOX_GAP_NONE } from './constants'
import { boxClsOf, newsRowsOf } from './functions'
import { NewsRow } from './newsrow'
import type { NewsLatestBlockIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染本省最新公告块。
 *
 * @param props 省码、界面语言与全部动态。
 * @returns 公告块;本省没有动态时给 null(整块不出现)。
 */
export function NewsLatestBlock({ province, lang, news }: NewsLatestBlockIn) {
  const t = makeT(lang)
  const rows = newsRowsOf({ province, news })
  if (rows.length === 0) {
    return null
  }
  const lines = []
  for (const r of rows) {
    lines.push(<NewsRow key={r.key} r={r} />)
  }
  return (
    <div>
      <div className={css.cardHead}>{t('news.latest')}</div>
      <div className={boxClsOf({ clip: false, gap: BOX_GAP_NONE })}>{lines}</div>
    </div>
  )
}
