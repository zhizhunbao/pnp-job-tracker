'use client'
/**
 * resources 域的状态机器:整页只有一格状态 —— 顶部搜索框里的词
 * (Frank「上面带一个文本框搜索」)。体内不留函数体:筛分组走 ./functions 的 groupsOf,
 * 改值手柄走那边的工厂(形制同 news 的 useNewsFilter)。
 * 语言/文案全站一处(LangProvider),初值由服务端 cookie 定,所以机器自己接 useLang。
 * 2026-08-28 换装批自 Resources.tsx 的组件体收进来。
 *
 * @author Frank
 * @time 2026-08-28 12:39:03
 */
import { useState } from 'react'
import { useLang } from '@/components/i18n'
import { TEXT_NONE } from './constants'
import { groupsOf, makeQueryChange } from './functions'
import type { ResourcesPanel } from './types'

/**
 * 官方资源导航整机:搜索词一格,分组随它现筛。
 * 不挂 useMemo:整页只有这一格状态,每次重渲染都是它自己变的 ——
 * 记一份旧结果省不下什么,却多一条要对齐的依赖数组。
 *
 * @returns 界面语言、取词函数、搜索词现值、筛过的分组与改值手柄。
 */
export function useResources(): ResourcesPanel {
  const [lang, , t] = useLang()
  const [query, setQuery] = useState(TEXT_NONE)
  return {
    t,
    lang,
    query,
    groups: groupsOf({ query }),
    onQueryChange: makeQueryChange({ setQuery }),
  }
}
