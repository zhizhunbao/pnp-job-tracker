'use client'
/**
 * 域内小件:职位详情的面包屑(职位板 › 省 › 大类 › 中类 › 小类)。末段「本岗」由 H1 承担,
 * 不重复;职业分类路径里同名相邻的段已在 functions 的 catSegsOf 里跳过,不铺重复。
 * 2026-08-28 换装批自 Job.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 19:15:06
 */
import { LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { CRUMB_SEP, TEXT_NONE, URL_BOARD } from './constants'
import type { JobCrumbsIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染面包屑。
 *
 * @param props 首段文案、省段与职业分类路径段。
 * @returns 一行面包屑。
 */
export function JobCrumbs({ home, prov, provHref, segs }: JobCrumbsIn) {
  const cats = []
  for (const s of segs) {
    cats.push(
      <span key={s.href}>
        {CRUMB_SEP}
        <LinkButton href={s.href} className={cssOf(css.crumbLink)}>{s.txt}</LinkButton>
      </span>,
    )
  }
  return (
    <div className={cssOf(css.crumbs)}>
      <LinkButton href={URL_BOARD} className={cssOf(css.crumbLink)}>{home}</LinkButton>
      {prov !== TEXT_NONE && (
        <span>
          {CRUMB_SEP}
          <LinkButton href={provHref} className={cssOf(css.crumbLink)}>{prov}</LinkButton>
        </span>
      )}
      {cats}
    </div>
  )
}
