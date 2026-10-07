// 已选职业标签一行(profile 桶 OnboardingTags;首访向导与访客第 3 题共用这一件)的 × 摘除钮。
// 来由:2026-10-04 收口审查 —— × 原来没有可访问名,读屏只念「×」,胶囊外的已选码只有它能摘,却分不出摘的是哪一枚。
// 性质:① 标签 ⇔ 已选码不在这一屏胶囊里(每枚标签恰一颗 ×);
//       ② 每颗 × 的可访问名 = t('ob.tagDel', { name: 这枚标签看得见的职业名 }),名字非空、各不相同;
//       ③ 点哪颗 × 就只摘那一个码,其余码保序不动。
// 金标:热门码取译名、简历候选取官方英文名、两头都没有回落成码本身。
// 探针:去掉 ariaLabel → 「每颗 × 的可访问名」与金标两条红;name 换成码 → 金标那条红;
//       makeNocDrop 摘错码(比如摘掉第一个)→ 「点哪颗摘哪个」那条红。
// 2026-10-05 × 摘除钮改由 tag 桶 Tag 的 del 格出(带删钮的标签收进通用桶,访客第 2 题的已选专业同一枚):
//       ④ 换件前后渲染一字不变 —— 结构、属性、文字照旧,类名去掉 css module 的文件哈希后照旧
//       (换件前 × 的类出自 profile.module.css 的 .tagDel,换件后出自 tag.module.css 的同名类,声明原样搬过去)。
//       探针:Tag 里 × 钮挪到文字前 / 丢 className → ④红。
// 2026-10-05 访客第 3 题改左右两栏(Frank「也改成左右 两部分吗?」「改啊」):quiz 选职业控件不再借本件(已选一行改用 tag 桶 TagRow
//       自己摆,性质挪去 occPicker.int.spec.ts),本件的 shown 格与 callerFirst 撤、出桶名单去掉它(测试直接点文件)。
//       ① 改成「标签 ⇔ 已选码不在热门表里」;「给了胶囊码的调用方」那条随 shown 删;金标与 ④ 的码换成热门表外的。
import fc from 'fast-check'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

// 测试例外:域内件直接点文件(桶只走门的规矩不管测试;2026-10-05 起 OnboardingTags 不出桶)
import { OnboardingTags } from '@/components/profile/onboardingtags'
import type { TFn } from '@/lib/i18n'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const MESSAGES: Record<string, string> = {
  'ob.tagDel': 'Remove {name}',
  'prof.job.cook': 'Cook',
  'prof.job.truck': 'Truck driver',
}

const t = ((key: string, vars?: Record<string, string | number>) => {
  let text = key
  const hit = MESSAGES[key]
  if (hit !== undefined) {
    text = hit
  }
  return text.replace(/\{(\w+)\}/g, (_, name: string) => {
    if (vars == null || vars[name] == null) {
      return ''
    }
    return String(vars[name])
  })
}) as TFn

// 码池:两个热门码(63200 / 73300)、两个只有简历候选名的码、两个哪都没名的码。
const POOL = ['63200', '73300', '21230', '21231', '99999', '12345']
const POPULAR = ['63200', '73300']
const CANDIDATES = [
  { noc: '21230', title: 'Computer systems developers and programmers' },
  { noc: '21231', title: 'Software engineers and designers' },
]

type TagRow = { button: HTMLButtonElement; label: string }

type Rendered = { rows: TagRow[]; setNocs: ReturnType<typeof vi.fn>; done: () => Promise<void> }

async function render(nocs: string[]): Promise<Rendered> {
  const setNocs = vi.fn()
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const props: Parameters<typeof OnboardingTags>[0] = { p: { nocs, setNocs, resume: { candidates: CANDIDATES } }, t }
  await act(async () => {
    root.render(createElement(OnboardingTags, props))
  })
  const rows = Array.from(container.querySelectorAll('button')).map((button) => {
    const tag = button.parentElement as HTMLElement
    const all = tag.textContent as string
    return { button, label: all.slice(0, all.length - (button.textContent as string).length) }
  })
  async function done() {
    await act(async () => root.unmount())
    container.remove()
  }
  return { rows, setNocs, done }
}

describe('OnboardingTags 的 × 摘除钮', () => {
  it('标签 ⇔ 码不在热门表里;每颗 × 的可访问名 = 移除 + 看得见的职业名;点哪颗摘哪个', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(fc.constantFrom(...POOL), { maxLength: POOL.length }),
        async (nocs) => {
          const r = await render(nocs)
          const tagged = nocs.filter((c) => POPULAR.includes(c) === false)
          expect(r.rows.length).toBe(tagged.length)
          for (const row of r.rows) {
            expect(row.label).not.toBe('')
            expect(row.button.getAttribute('aria-label')).toBe(t('ob.tagDel', { name: row.label }))
          }
          expect(new Set(r.rows.map((row) => row.button.getAttribute('aria-label'))).size).toBe(r.rows.length)
          for (const [i, row] of r.rows.entries()) {
            await act(async () => row.button.click())
            expect(r.setNocs).toHaveBeenLastCalledWith(nocs.filter((c) => c !== tagged[i]))
          }
          await r.done()
        },
      ),
      { numRuns: 40 },
    )
  })

  it('金标:热门码不挂(胶囊回显)、候选码取官方英文名、都没有回落成码', async () => {
    const r = await render(['63200', '21230', '99999'])
    expect(r.rows.map((row) => row.button.getAttribute('aria-label'))).toEqual([
      'Remove Computer systems developers and programmers',
      'Remove 99999',
    ])
    await r.done()
  })

  it('首访向导:热门码由胶囊回显,不挂标签;其余照挂并带可访问名', async () => {
    const r = await render(['63200', '73300', '21231'])
    expect(r.rows.map((row) => row.button.getAttribute('aria-label'))).toEqual(['Remove Software engineers and designers'])
    await r.done()
  })
})

describe('④ 换成 tag 桶的 × 摘除钮后渲染一字不变(2026-10-05)', () => {
  // css module 在测试里出 `_类名_文件哈希`;换件前后 × 的类换了文件(profile → tag),只比类名本身
  function strip(html: string): string {
    return html.replace(/_([A-Za-z][A-Za-z0-9]*)_[0-9a-f]{6}/g, '$1')
  }

  it('金标:标签一行 = div.obTagRow > span.tag.pick > [职业名, button.btn.ghost.tagDel(aria-label=移除 名字)「×」]', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(createElement(OnboardingTags, {
        p: { nocs: ['21230', '99999'], setNocs: vi.fn(), resume: { candidates: CANDIDATES } }, t,
      }))
    })
    expect(strip(container.innerHTML)).toBe(
      '<div class="obTagRow">'
      + '<span class="tag pick">Computer systems developers and programmers'
      + '<button aria-label="Remove Computer systems developers and programmers" class="btn ghost tagDel">×</button></span>'
      + '<span class="tag pick">99999<button aria-label="Remove 99999" class="btn ghost tagDel">×</button></span>'
      + '</div>',
    )
    const btn = container.querySelector('button') as HTMLButtonElement
    expect(btn.className.split(' ').some((c) => /^_tagDel_[0-9a-f]{6}$/.test(c))).toBe(true)
    expect(btn.getAttribute('type')).toBeNull()
    await act(async () => root.unmount())
    container.remove()
  })
})
