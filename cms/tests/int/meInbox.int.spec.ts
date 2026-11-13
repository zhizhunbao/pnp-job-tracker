// 「我的」收件箱的交互(2026-11-13 Frank「先修收件箱问题」;components/me/inbox 与 components/me 的纯函数与手柄,jsdom)。
// 性质:① 点信:换到别的信清回信草稿并收起回信框,点的还是眼前这封不清;没读的标已读并告诉服务端,读过的不再告诉;
//       ② 未读角标:0 封不出角标,有几封出几;
//       ③ 换节写地址栏:只换 `sec` 一格,别的参数原样留着,已经是它不重写。
// 探针:makePickOf 不比 curId 一律清 → ①第二条红;一律不清 → ①第一条红;unreadBadgeOf 直接 String(n) → ②红;
//       writeSecLink 整段重写查询串 → ③「别的参数留着」红。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { writeSecLink } from '@/components/me/functions'
import { curIdOf, makePickOf, unreadBadgeOf } from '@/components/me/inbox/functions'
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
