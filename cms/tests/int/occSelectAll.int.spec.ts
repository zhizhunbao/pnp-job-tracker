/**
 * 选职业控件大号档「全选」(2026-10-05 Frank「有可能这个大类下 我想全选」):性质 + 手写金标。
 * 全选 = 这一屏没选的职业整组选上;全选着再点 = 这一屏的职业整组撤掉;别的屏已选的职业一个不动;空清单不算全选。
 *
 * @author Frank
 * @time 2026-10-05 19:20:00
 */
import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import { isAllOn, makeAllPick, occItemsOf, occKeysOf, pickedOf } from '@/components/quiz/functions'
import type { KeyMap, OccItem, PickOfIn, TitleMap, Top } from '@/components/quiz/types'

/**
 * 造一行职业(中文短名当组键;同短名 = 同一个职业)。
 *
 * @param noc NOC 码。
 * @param short 中文短名。
 * @returns 一行。
 */
function row(noc: string, short: string): Top {
  return { noc, title: 'T' + noc, titleZh: short, titleZhShort: short, open: 1 }
}

/**
 * 一台假整机:点选入参 + 落下来的已选码。
 */
type Rig = {
  /**
   * 点选手柄的共用入参。
   */
  p: PickOfIn

  /**
   * 最后一次落下的已选码。
   */
  out: { nocs: string[] }
}

/**
 * 这一屏行的组键表(同控件整机:行自带的中文短名叠进组键)。
 *
 * @param rows 行。
 * @returns 码 → 组键。
 */
function keysOf(rows: Top[]): KeyMap {
  return occKeysOf({ keys: {}, top: rows, catalog: {}, cands: [] })
}

/**
 * 造一台假整机。
 *
 * @param nocs 进来时已选的码。
 * @param known 组键表(同控件整机的 known)。
 * @returns 假整机。
 */
function rig(nocs: string[], known: KeyMap): Rig {
  const out = { nocs }
  const titles: { m: TitleMap } = { m: {} }
  const keys: { m: KeyMap } = { m: {} }
  const p: PickOfIn = {
    nocs,
    keys: known,
    setNocs: function setNocs(v: string[]) { out.nocs = v },
    setTitles: function setTitles(f: (m: TitleMap) => TitleMap) { titles.m = f(titles.m) },
    setKeys: function setKeys(f: (m: KeyMap) => KeyMap) { keys.m = f(keys.m) },
    onChange: function onChange(v: string[]) { out.nocs = v },
    setQ: function setQ(v: string) { void v },
    setCands: function setCands(empty: []) { void empty },
  }
  return { p, out }
}

/**
 * 一屏职业(合成后的)。
 *
 * @param rows 行。
 * @returns 职业。
 */
function itemsOf(rows: Top[]): OccItem<Top>[] {
  return occItemsOf({ rows, keys: {} })
}

describe('大号档「全选」', () => {
  const rows = [row('21231', '软件开发'), row('21232', '软件开发'), row('21222', '信息系统专家'), row('22220', '网络技术员')]
  const known = keysOf(rows)
  const screen = itemsOf(rows)

  it('金标:一个没选 → 全选选上整屏(合成的那组两个码都在);再点 → 整屏撤掉', () => {
    const a = rig([], known)
    makeAllPick({ p: a.p, items: screen, lang: 'zh' })()
    expect([...a.out.nocs].sort()).toEqual(['21222', '21231', '21232', '22220'])
    const b = rig(a.out.nocs, known)
    expect(isAllOn({ items: screen, picked: pickedOf({ nocs: b.out.nocs, keys: known }) })).toBe(true)
    makeAllPick({ p: b.p, items: screen, lang: 'zh' })()
    expect(b.out.nocs).toEqual([])
  })

  it('金标:别的屏已选的职业不动;选了一半时全选只补没选的', () => {
    const a = rig(['11100', '21222'], known)
    makeAllPick({ p: a.p, items: screen, lang: 'zh' })()
    expect(a.out.nocs.filter(function isOther(n) { return n === '11100' })).toEqual(['11100'])
    expect(a.out.nocs.filter(function isDup(n) { return n === '21222' })).toEqual(['21222'])
    expect([...a.out.nocs].sort()).toEqual(['11100', '21222', '21231', '21232', '22220'])
    const b = rig(a.out.nocs, known)
    makeAllPick({ p: b.p, items: screen, lang: 'zh' })()
    expect(b.out.nocs).toEqual(['11100'])
  })

  it('空清单不算全选', () => {
    expect(isAllOn({ items: [], picked: [] })).toBe(false)
  })

  it('性质:任意进来的已选码 × 任意一屏 —— 没全选着:点后这屏全亮;全选着:点后这屏全灭;屏外码两种情况都原样', () => {
    const codes = ['10010', '11100', '21222', '21231', '21232', '22220', '64100', '65201']
    fc.assert(fc.property(
      fc.subarray(codes), fc.subarray(codes, { minLength: 1 }),
      function prop(pre, shown) {
        const shownRows = shown.map(function mk(n) { return row(n, 'S' + n) })
        const k = keysOf(shownRows)
        const items = itemsOf(shownRows)
        const wasAll = isAllOn({ items, picked: pickedOf({ nocs: pre, keys: k }) })
        const a = rig(pre, k)
        makeAllPick({ p: a.p, items, lang: 'zh' })()
        expect(isAllOn({ items, picked: pickedOf({ nocs: a.out.nocs, keys: k }) })).toBe(wasAll === false)
        for (const n of shown) {
          expect(a.out.nocs.includes(n)).toBe(wasAll === false)
        }
        for (const n of pre) {
          if (shown.includes(n) === false) {
            expect(a.out.nocs.includes(n)).toBe(true)
          }
        }
        expect(new Set(a.out.nocs).size).toBe(a.out.nocs.length)
      },
    ))
  })
})
