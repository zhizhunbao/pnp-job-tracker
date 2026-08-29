/**
 * resources 域(官方资源导航页)的函数:按搜索词筛分组、分区标题的 i18n 键、
 * 资源卡的类名预算、ItemList 结构化数据,以及搜索框的手柄工厂。
 * 零 JSX 零 hook —— 排版归各件的 tsx,状态归 hooks.ts,死值归 constants.ts。
 * 🔴 本文件**不带 `'use client'`**:页面门(服务端)要用 resItemListJsonOf 出结构化数据,
 * 标了指令就把它锁进客户端边界。
 * 2026-08-28 换装批自 Resources.tsx 的组件体与它的页面门拆户而来。
 *
 * @author Frank
 * @time 2026-08-28 12:39:03
 */
import { RES } from '@/lib/official'
import { cssOf } from '@/components/css'
import {
  CAT_KEY_HEAD, CLS_CARD_HOVER, CLS_SEP, LD_CONTEXT, LD_KEY_CONTEXT, LD_KEY_ELEMENTS, LD_KEY_NAME,
  LD_KEY_POSITION, LD_KEY_TYPE, LD_KEY_URL, LD_POS_FIRST, LD_TYPE_ITEM, LD_TYPE_LIST, TEXT_NONE,
} from './constants'
import type {
  CatKeyOfIn, GroupsOfIn, HitOfIn, QueryChangeFn, QueryChangeIn, ResGroup, ResItem,
} from './types'
import css from './resources.module.css'

/**
 * 按搜索词筛出要显示的分组:搜索词空 = 整份原样出;有词就逐条比对,
 * 一条都没命中的分组整个不出(空标题下面挂个空网格,读的人以为是加载没完)。
 *
 * @param x 搜索框现值。
 * @returns 筛过的分组;整份都没命中时给空列表(消费端出空态)。
 */
export function groupsOf(x: GroupsOfIn): ResGroup[] {
  const needle = x.query.trim().toLowerCase()
  const groups: ResGroup[] = []
  for (const group of RES) {
    const items: ResItem[] = []
    for (const item of group.items) {
      if (needle === TEXT_NONE) {
        items.push(item)
        continue
      }
      if (hitOf({ item, needle })) {
        items.push(item)
      }
    }
    if (items.length > 0) {
      groups.push({ cat: group.cat, items })
    }
  }
  return groups
}

/**
 * 一条资源命不命中搜索词:资源名与**三门**用途说明都算数 ——
 * 中文界面搜英文词(「wage」)也该找得到,这一页的用户本来就在中英之间来回切。
 *
 * @param x 待判的资源与已归一的搜索词。
 * @returns 命中与否。
 */
export function hitOf(x: HitOfIn): boolean {
  if (x.item.name.toLowerCase().includes(x.needle)) {
    return true
  }
  for (const use of Object.values(x.item.use)) {
    if (use.toLowerCase().includes(x.needle)) {
      return true
    }
  }
  return false
}

/**
 * 分区小标题的 i18n 键(分组名拼上前缀)。
 *
 * @param x 分组名。
 * @returns 取词键。
 */
export function catKeyOf(x: CatKeyOfIn): string {
  return CAT_KEY_HEAD + x.cat
}

/**
 * 资源卡的类名(整卡可点走全局 hover 规范类;白卡那几格本域自足)。
 *
 * @returns 拼好的 className。
 */
export function tileClsOf(): string {
  return [CLS_CARD_HOVER, cssOf(css.tile)].join(CLS_SEP)
}

/**
 * 整页的 ItemList 结构化数据(rich result):名称 + 官方地址,单一来源就是 lib/official
 * 的 RES —— 页面上看得见的和喂给搜索引擎的永远是同一份,不另抄一张表。
 * 序号按整页拉平后从 1 数起(分组只是排版,清单是一条线)。
 *
 * @returns 可直接塞进 script 标签的 JSON 文本。
 */
export function resItemListJsonOf(): string {
  const elements = []
  for (const group of RES) {
    for (const item of group.items) {
      elements.push({
        [LD_KEY_TYPE]: LD_TYPE_ITEM,
        [LD_KEY_POSITION]: elements.length + LD_POS_FIRST,
        [LD_KEY_NAME]: item.name,
        [LD_KEY_URL]: item.url,
      })
    }
  }
  return JSON.stringify({
    [LD_KEY_CONTEXT]: LD_CONTEXT,
    [LD_KEY_TYPE]: LD_TYPE_LIST,
    [LD_KEY_ELEMENTS]: elements,
  })
}

/**
 * 造搜索框的改值手柄:把 useState 的写入端收窄成「只收新词」的一只手 ——
 * 原样交出去的话,调用方还能塞一个更新函数进来,那不是这只手柄该有的口子。
 *
 * @param x 搜索词落格。
 * @returns 搜索框的改值手柄。
 */
export function makeQueryChange(x: QueryChangeIn): QueryChangeFn {
  return function onQueryChange(query: string): void {
    x.setQuery(query)
  }
}
