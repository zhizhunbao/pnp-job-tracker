'use client'
/**
 * tag 域的结构:一排标签默认只露前几枚,其余收着,点开合钮列全 / 收回。
 * 2026-09-20 立(雇主板「在招地点」格首用:Frank「在招城市,必须显示才能 搜索吧。那么就加个收起展开不就行了吗」;
 * 几十个市的大雇主全铺出来会把一行撑成半屏)。「一排标签 + 折叠」是通用形态,住通用桶,业务桶只消费。
 * 不带外框:排布(横排 / 折行 / 间距)归调用方的容器。
 * 2026-10-02 Frank「全站统一 都改成 展开 20 和 收起。全部统一」:尾上那枚「展开其余 N 个 / 收起」开合钮换成 pager 桶 FoldLine
 * (展开 20 个 → 再展开 20 个 → 展开其余 N 个 → 收起),开合走 useFold;钮面由 FoldLine 按取词函数与量词现拼,入参从两枚现成钮面改成取词函数 + 量词。
 *
 * @author Frank
 * @time 2026-09-20 03:30:00
 */
import { FoldLine, useFold } from '@/components/pager'
import { tagsShownOf } from './functions'
import { Tag } from './tag'
import type { TagFoldIn } from './types'

/**
 * 可折叠的一排标签。
 *
 * @param props 全部标签文字、默认露几枚、变体、取词函数与量词(逐格注释见 TagFoldIn)。
 * @returns 标签若干;总数超过默认枚数时尾上多一行展开 / 收起钮。
 */
export function TagFold({ items, first, variant, t, unit }: TagFoldIn) {
  const fold = useFold({ hidden: Math.max(0, items.length - first) })
  const tags = []
  for (const item of tagsShownOf({ items, first, extra: fold.extra })) {
    tags.push(<Tag key={item} variant={variant}>{item}</Tag>)
  }
  return (
    <>
      {tags}
      <FoldLine t={t}
        unit={unit}
        hidden={Math.max(0, items.length - first)}
        extra={fold.extra}
        busy={false}
        onMore={fold.onMore}
        onFold={fold.onFold} />
    </>
  )
}
