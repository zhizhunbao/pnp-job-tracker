'use client'
/**
 * majors 组件域的状态机器:专业选择器 useMajorPicker(热门 / 防抖搜索 / 选中回显 / 左栏大类与专业类树)。
 * 2026-10-05 自 gate 桶迁入(原名 useGateMajors,住 gate/hooks.ts,由访客向导整机开屏挂上);
 * 宿主照旧在开屏时挂它(访客向导挂在向导件上),走到这一题时热门与大类多半已到,前后翻题左栏与展开状态都留着。
 * 同日改多选:值与上报口换成码清单,手上的行换成清单,多交已选那一行。
 *
 * @author Frank
 * @time 2026-10-05 12:24:22
 */
import { useEffect, useState } from 'react'
import { MAJOR_CAT_HOT, TEXT_NONE } from './constants'
import {
  isMajorQuery, majorTopOf, makeCatPick, makeCatsLoad, makeFoldOf, makeHotMajorsLoad, makeMajorPickOf, makeMajorSearch,
  makePickedLoad, makeTreeLoad, missingCodesOf, pickedRowsOf, treeOfCat,
} from './functions'
import type { MajorCat, MajorPickerHookIn, MajorPickerPanel, MajorRow, TreeMap } from './types'

/**
 * 专业题机器(2026-10-04 A2,访客第 2 题「你学的是什么专业?」):热门具体专业(开屏取一次)+ 防抖搜索全部 CIP 2021 专业 +
 * 选中回显(点选的那一行留在手上;草稿里带来的、热门里没有的按码查回来)。单选,选中报给整机的专业上报口。
 * 2026-10-04 收口审查:多一格「搜索在途」(由 functions 的搜索启动器 / 收尾器 / 落结果三处记与落),结果那一排在途时摆占位。
 * 2026-10-05 照掌上高考改版:多管左栏 —— 大类清单(开屏取一次)、当前项(默认热门)、取过的专业类树表(切回来不重取)、
 * 展开着的那一个专业类(一次开一张,换大类收起)。
 * 2026-10-05 自 gate 桶迁入(原名 useGateMajors);同日改多选:至多 MAJOR_PICK_MAX 个,点选中的那一行摘掉,
 * 选中的码清单报给宿主的上报口(上面「单选」那句作废);手上的行换成清单(点选过的、按码查回来的都留着,
 * 已选那一行与上面那一排从它取名字);草稿带来的热门外的码逐个查回(一次查完要查的那几个)。
 *
 * @param x 现在选中的码清单与码清单上报口。
 * @returns 专业选择器面板。
 */
export function useMajorPicker(x: MajorPickerHookIn): MajorPickerPanel {
  const [hot, setHot] = useState<MajorRow[]>([])
  const [hotLoaded, setHotLoaded] = useState(false)
  const [known, setKnown] = useState<MajorRow[]>([])
  const [q, setQ] = useState(TEXT_NONE)
  const [hits, setHits] = useState<MajorRow[]>([])
  const [searching, setSearching] = useState(false)
  const [cats, setCats] = useState<MajorCat[]>([])
  const [cat, setCat] = useState(MAJOR_CAT_HOT)
  const [trees, setTrees] = useState<TreeMap>(newTreeMap)
  const [open, setOpen] = useState(TEXT_NONE)

  useEffect(function loadHotMajors() {
    return makeHotMajorsLoad({ setHot, setHotLoaded })()
  }, [])

  useEffect(function loadMajorCats() {
    return makeCatsLoad({ setCats })()
  }, [])

  useEffect(function loadMajorTree() {
    if (cat === MAJOR_CAT_HOT || trees.has(cat)) {
      return
    }
    return makeTreeLoad({ cat, setTrees })()
  }, [cat, trees])

  useEffect(function loadPickedMajors() {
    const missing = missingCodesOf({ codes: x.value, hot, hotLoaded, known })
    if (missing.length === 0) {
      return
    }
    return makePickedLoad({ codes: missing, setKnown })()
  }, [x.value, hot, hotLoaded, known])

  useEffect(function runMajorSearch() {
    return makeMajorSearch({ q, setHits, setSearching })()
  }, [q])

  return {
    codes: x.value,
    picked: pickedRowsOf({ codes: x.value, hot, known }),
    top: majorTopOf({ hot, known, codes: x.value }),
    hotLoaded,
    q,
    searchOn: isMajorQuery(q.trim()),
    searching,
    hits,
    onSearch: setQ,
    pickOf: makeMajorPickOf({ codes: x.value, setKnown, setQ, onChange: x.onChange }),
    cats,
    cat,
    onCat: makeCatPick({ setCat, setOpen }),
    tree: treeOfCat({ trees, cat }),
    open,
    foldOf: makeFoldOf({ open, setOpen }),
  }
}

/**
 * 专业类树表的初值(空表;useState 的惰性初值,本域不在渲染里每次新建)。
 * 2026-10-05 自 gate 桶迁入。
 *
 * @returns 空树表。
 */
function newTreeMap(): TreeMap {
  return new Map()
}
