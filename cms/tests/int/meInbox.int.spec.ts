// 「我的」收件箱的交互(2026-11-13 Frank「先修收件箱问题」;components/me/inbox 与 components/me 的纯函数与手柄,jsdom)。
// 性质:① 点信:换到别的信清回信草稿并收起回信框,点的还是眼前这封不清;没读的标已读并告诉服务端,读过的不再告诉;
//       ② 未读角标:0 封不出角标,有几封出几;
//       ③ 换节写地址栏:只换 `sec` 一格,别的参数原样留着,已经是它不重写。
// 探针:makePickOf 不比 curId 一律清 → ①第二条红;一律不清 → ①第一条红;unreadBadgeOf 直接 String(n) → ②红;
//       writeSecLink 整段重写查询串 → ③「别的参数留着」红。
// 2026-11-13 Frank「我的这个排版和 outlook 不一样啊」:清单照 Outlook 按日期分组、今天的信写钟点。
// 性质:④ 分组按渥太华时间的日子算(不是 UTC 的日子):当天 = 今天,前一天 = 昨天,再往前但不早于本周日 = 本周,其余 = 更早;
//          穷举「今天是周几 × 差几天」,本周那一组从不越过周日;
//       ⑤ 分组不丢信不改序:各组的信接起来就是原清单,没有空组;
//       ⑥ 清单时刻:今天的写钟点,别的日子写月-日,空时刻空串。
// 探针:dayNoOf 改按 UTC 日子算 → ④金标「UTC 已是 13 号、渥太华还是 12 号」那条红;groupKeyOf 本周写死差 6 天内 → ④穷举红;
//       groupsOf 每封新开一组 → ⑤「没有重复组」红。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { writeSecLink } from '@/components/me/functions'
import {
  curIdOf, dayNoOf, fromLineOf, groupKeyOf, groupsOf, makePickOf, rowTimeOf, senderOf, unreadBadgeOf,
} from '@/components/me/inbox/functions'
import type { InboxItem, InboxView } from '@/components/me/inbox/types'

function item(id: number, read: boolean): InboxItem {
  return {
    id, appId: null, fromAddr: 'hr' + id + '@example.com', fromName: '', subject: 'S' + id, text: 'T', at: '2026-11-03T15:20:00.000Z',
    read, jobTitle: '', replies: [],
  }
}

function view(): InboxView {
  return { address: '', items: [item(1, false), item(2, true), item(3, false)] }
}

describe('收件箱:点信', () => {
  let resets = 0
  let sel: number | null = null
  let data: InboxView = view()
  const fetchMock = vi.fn(async () => new Response('{"ok":true}'))

  beforeEach(() => {
    resets = 0
    sel = null
    data = view()
    fetchMock.mockClear()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function pick(id: number, curId: number | null): void {
    makePickOf({
      data,
      setData: (v) => { data = v },
      setSel: (v) => { sel = v },
      curId,
      resetDraft: () => { resets += 1 },
    })(id)()
  }

  it('换到别的信清草稿;眼前没有信时点一封也清', () => {
    for (const curId of [null, 1, 2, 3]) {
      for (const id of [1, 2, 3]) {
        if (id === curId) {
          continue
        }
        resets = 0
        pick(id, curId)
        expect(resets, curId + '→' + id).toBe(1)
        expect(sel).toBe(id)
      }
    }
  })

  it('点的还是眼前这封不清草稿', () => {
    for (const id of [1, 2, 3]) {
      resets = 0
      pick(id, id)
      expect(resets).toBe(0)
      expect(sel).toBe(id)
    }
  })

  it('没读的标已读并告诉服务端;读过的不再告诉', () => {
    pick(1, null)
    expect(data.items.map((m) => m.read)).toEqual([true, true, false])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    pick(2, 1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    pick(1, 2)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('眼前那封的信号:没有信是 null', () => {
    expect(curIdOf(null)).toBeNull()
    expect(curIdOf(item(7, true))).toBe(7)
  })
})

describe('收件箱:未读角标', () => {
  it('0 封不出,有几封出几', () => {
    expect(unreadBadgeOf(0)).toBe('')
    for (const n of [1, 2, 9, 10, 120]) {
      expect(unreadBadgeOf(n)).toBe(String(n))
    }
  })
})

describe('「我的」:换节写地址栏', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('只换 sec 一格,别的参数留着', () => {
    window.history.replaceState(null, '', '/account?sec=inbox&msg=12&apply=99#top')
    writeSecLink('profile')
    const url = new URL(window.location.href)
    expect(url.pathname).toBe('/account')
    expect(url.searchParams.get('sec')).toBe('profile')
    expect(url.searchParams.get('msg')).toBe('12')
    expect(url.searchParams.get('apply')).toBe('99')
    expect(url.hash).toBe('#top')
  })

  it('没带 sec 时补上;已经是它不重写', () => {
    window.history.replaceState(null, '', '/account')
    writeSecLink('inbox')
    expect(window.location.search).toBe('?sec=inbox')
    const spy = vi.spyOn(window.history, 'replaceState')
    writeSecLink('inbox')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('收件箱:清单按日期分组', () => {
  // 2026-11-13 是周五;渥太华 11 月是 UTC-5。
  const NOW = Date.parse('2026-11-13T17:00:00.000Z')

  function at(id: number, iso: string): InboxItem {
    const m = item(id, true)
    m.at = iso
    return m
  }

  it('④ 金标:按渥太华的日子分,不按 UTC 的日子', () => {
    const today = dayNoOf('2026-11-13T17:00:00.000Z')
    const keyOf = (iso: string) => groupKeyOf({ day: dayNoOf(iso), today })
    expect(keyOf('2026-11-13T05:30:00.000Z')).toBe('today')
    expect(keyOf('2026-11-13T03:00:00.000Z')).toBe('yesterday')
    expect(keyOf('2026-11-10T15:00:00.000Z')).toBe('week')
    expect(keyOf('2026-11-08T15:00:00.000Z')).toBe('week')
    expect(keyOf('2026-11-07T15:00:00.000Z')).toBe('older')
    expect(keyOf('')).toBe('older')
  })

  it('④ 穷举:今天是周几 × 差几天,本周那一组从不越过周日', () => {
    const sunday = dayNoOf('2026-11-08T17:00:00.000Z')
    for (let dow = 0; dow < 7; dow++) {
      const today = sunday + dow
      for (let diff = 0; diff < 15; diff++) {
        const key = groupKeyOf({ day: today - diff, today })
        let want = 'older'
        if (diff === 0) {
          want = 'today'
        } else if (diff === 1) {
          want = 'yesterday'
        } else if (diff <= dow) {
          want = 'week'
        }
        expect(key).toBe(want)
      }
    }
  })

  it('⑤ 不丢信不改序,没有空组也没有重复组', () => {
    const items = [
      at(1, '2026-11-13T16:00:00.000Z'), at(2, '2026-11-13T05:30:00.000Z'), at(3, '2026-11-13T03:00:00.000Z'),
      at(4, '2026-11-10T15:00:00.000Z'), at(5, '2026-11-08T15:00:00.000Z'), at(6, '2026-10-11T05:46:00.000Z'), at(7, ''),
    ]
    const groups = groupsOf({ items, now: NOW })
    expect(groups.map((g) => g.key)).toEqual(['today', 'yesterday', 'week', 'older'])
    expect(groups.map((g) => g.items.map((m) => m.id))).toEqual([[1, 2], [3], [4, 5], [6, 7]])
    expect(groups.flatMap((g) => g.items)).toEqual(items)
    expect(groupsOf({ items: [], now: NOW })).toEqual([])
  })

  it('⑦ 来信卡头第二行:有名字出地址,没名字不重复地址', () => {
    const named = item(1, true)
    named.fromName = 'Sarah Chen'
    expect([senderOf(named), fromLineOf(named)]).toEqual(['Sarah Chen', 'hr1@example.com'])
    const bare = item(2, true)
    expect([senderOf(bare), fromLineOf(bare)]).toEqual(['hr2@example.com', ''])
  })

  it('⑥ 今天写钟点,别的日子写月-日', () => {
    expect(rowTimeOf({ iso: '2026-11-13T05:30:00.000Z', now: NOW })).toBe('00:30')
    expect(rowTimeOf({ iso: '2026-11-13T03:00:00.000Z', now: NOW })).toBe('11-12')
    expect(rowTimeOf({ iso: '2026-10-11T05:46:00.000Z', now: NOW })).toBe('10-11')
    expect(rowTimeOf({ iso: '', now: NOW })).toBe('')
  })
})
