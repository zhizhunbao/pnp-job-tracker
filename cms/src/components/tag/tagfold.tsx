'use client'
/**
 * tag 域的结构:一排标签默认只露前几枚,其余收着,点开合钮列全 / 收回。
 * 2026-09-20 立(雇主板「在招地点」格首用:Frank「在招城市,必须显示才能 搜索吧。那么就加个收起展开不就行了吗」;
 * 几十个市的大雇主全铺出来会把一行撑成半屏)。「一排标签 + 折叠」是通用形态,住通用桶,业务桶只消费。
 * 不带外框:排布(横排 / 折行 / 间距)归调用方的容器。
 *
 * @author Frank
 * @time 2026-09-20 03:30:00
 */
import { useState } from 'react'
import { Button } from '@/components/button'
import { FOLD_BTN_KIND } from './constants'
import { foldBtnClsOf, makeFoldToggle, tagsShownOf } from './functions'
import { Tag } from './tag'
import type { TagFoldIn } from './types'

/**
 * 可折叠的一排标签。
 *
 * @param props 全部标签文字、默认露几枚、变体与两枚钮面(逐格注释见 TagFoldIn)。
 * @returns 标签若干;总数超过默认枚数时尾上多一枚开合钮。
 */
export function TagFold({ items, first, variant, moreText, lessText }: TagFoldIn) {
  const [all, setAll] = useState(false)
  const tags = []
  for (const item of tagsShownOf({ items, first, all })) {
    tags.push(<Tag key={item} variant={variant}>{item}</Tag>)
  }
  return (
    <>
      {tags}
      {items.length > first && (
        <Button kind={FOLD_BTN_KIND} onClick={makeFoldToggle({ on: all, set: setAll })} className={foldBtnClsOf()}>
          {all === false && moreText}
          {all && lessText}
        </Button>
      )}
    </>
  )
}
