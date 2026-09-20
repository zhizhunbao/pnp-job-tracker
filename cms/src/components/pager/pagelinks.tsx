'use client'
/**
 * pager 域的结构:页码链接行 ——「显示更多」式的板底下那一行真链接(首页、末页、当前页附近、±10、±100)。
 * 2026-09-20 站内链接批三(Frank「按你推荐来」「都改完」):GSC 实查 8.6 万页「已发现未抓取」,职位板 / 雇主板第 2 页之后的行
 * 没有任何页面链向它们;服务端按 ?page= 渲那一页,这一行把各页连起来。人点了是整页跳转(不是往下接),
 * 「显示更多」钮照旧。设计稿 docs/design/站内链接与收录-20260920.md。
 *
 * @author Frank
 * @time 2026-09-20 14:30:00
 */
import { LinkButton } from '@/components/button'
import { LINK_NAV_ARIA, LINK_NONE, LINK_TARGET } from './constants'
import { curClsOf, pageLinkItemsOf } from './functions'
import type { PageLinksIn } from './types'
import css from './pager.module.css'

/**
 * 页码链接行。
 *
 * @param props 当前页、总页数、列表页路径与筛选查询串(逐格注释见 PageLinksIn)。
 * @returns 一行页码;总页数 ≤1 不渲染。
 */
export function PageLinks({ page, max, path, query }: PageLinksIn) {
  const cells = []
  for (const it of pageLinkItemsOf({ page, max, path, query })) {
    if (it.href === LINK_NONE) {
      cells.push(<span key={it.k} className={curClsOf(it.cur)}>{it.text}</span>)
    } else {
      cells.push(
        <LinkButton key={it.k} href={it.href} target={LINK_TARGET} className={css.link}>{it.text}</LinkButton>,
      )
    }
  }
  if (cells.length === 0) {
    return null
  }
  return <nav aria-label={LINK_NAV_ARIA} className={css.links}>{cells}</nav>
}
