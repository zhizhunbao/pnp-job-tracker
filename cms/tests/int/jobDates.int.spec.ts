// 职位名下那行日期(components/jobs 的 jobDatesOf;2026-09-26 Frank 看过效果图点头,详情页 H1 下与职位弹框标题下同一件)。
// 钉住四件性质:
//   ① 发布格只看库里有没有发布日;
//   ② 截止格 = 发帖方写了截止日 且 没过期 —— 过期口径就是 lib/jobs 的 isExpiredJob(与 JobPosting 同一条,已下架也算过期);
//   ③ 「今天」按多伦多日期,截止日当天还算在期(晚上 8 点后 UTC 已是明天,不许提前收掉);
//   ④ 至多两格、发布在前,日期原样递给 TimeText(裁成 YYYY-MM-DD 是它的事,这里只验裁出来的日子对)。
// 2026-09-27 Frank「放到 jd 正文部分如何」→ 选 ①:JobDates 改成正文里单独一节「日期」(小标题 + 一行一条),渲染段改认 li,
// 并钉住小标题;四件性质不变。
import fc from 'fast-check'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'

// 测试例外:纯函数与组件直接点文件(桶只走门的规矩不管测试)
import { jobDatesOf } from '@/components/jobs/functions'
import { JobDates } from '@/components/jobs/jobdates'
import { isExpiredJob, toJobRow } from '@/lib/jobs/functions'
import type { JobDbRow, JobRow } from '@/lib/jobs/types'
import { ymd } from '@/lib/time'

/** 取词桩:原样回键,断言按键认格。 */
function t(key: string): string {
  return key
}

/** 库里一行 → 洗好的整行(与 seoSitemap 测试同一个造法)。 */
function jobOf(extra: Partial<JobDbRow>): JobRow {
  return toJobRow({
    row: {
      id: 4242, title: 'industrial designer', company_name: 'Acme Design', city: 'Ottawa', province: 'ON',
      status: 'open', date_posted: '2026-09-25T00:00:00.000Z', ...extra,
    } as JobDbRow,
    matchLevel: null,
    pro: false,
  })
}

/** 格子 → [标签键, 裁出来的日子]。 */
function cellsOf(job: JobRow, now: number): Array<[string, string]> {
  return jobDatesOf({ job, t, now }).map((c) => [c.label, ymd(c.iso)])
}

/** 多伦多 2026-09-26 正午(EDT = UTC-4)。 */
const NOON_0926 = Date.UTC(2026, 8, 26, 16, 0)

/** 多伦多 2026-09-26 22:00 —— UTC 已是 9-27 凌晨。 */
const LATE_0926 = Date.UTC(2026, 8, 27, 2, 0)

/** 多伦多 2026-09-27 00:30 —— 刚过零点。 */
const AFTER_MIDNIGHT_0927 = Date.UTC(2026, 8, 27, 4, 30)

describe('金标:四种情形', () => {
  it('有截止日:发布、截止两格,发布在前', () => {
    expect(cellsOf(jobOf({ valid_through: '2026-10-16T00:00:00.000Z' }), NOON_0926)).toEqual([
      ['col.datePosted', '2026-09-25'],
      ['detail.closes', '2026-10-16'],
    ])
  })

  it('没截止日:只出发布一格(不编预计截止)', () => {
    expect(cellsOf(jobOf({ valid_through: null }), NOON_0926)).toEqual([['col.datePosted', '2026-09-25']])
  })

  it('截止日已过:截止格不出', () => {
    expect(cellsOf(jobOf({ valid_through: '2026-09-25T00:00:00.000Z' }), NOON_0926)).toEqual([
      ['col.datePosted', '2026-09-25'],
    ])
  })

  it('截止日就是今天:还算在期,两格都出', () => {
    expect(cellsOf(jobOf({ valid_through: '2026-09-26T00:00:00.000Z' }), NOON_0926)).toEqual([
      ['col.datePosted', '2026-09-25'],
      ['detail.closes', '2026-09-26'],
    ])
  })
})

describe('金标:边角', () => {
  it('已下架:截止日还没到也不出截止格(与 JobPosting 同口径)', () => {
    expect(cellsOf(jobOf({ status: 'closed', valid_through: '2026-10-16T00:00:00.000Z' }), NOON_0926)).toEqual([
      ['col.datePosted', '2026-09-25'],
    ])
  })

  it('发布日与截止日都没有:一格都没有(整行不渲)', () => {
    expect(cellsOf(jobOf({ date_posted: null, valid_through: null }), NOON_0926)).toEqual([])
  })

  it('没发布日但有截止日:只出截止一格', () => {
    expect(cellsOf(jobOf({ date_posted: null, valid_through: '2026-10-16T00:00:00.000Z' }), NOON_0926)).toEqual([
      ['detail.closes', '2026-10-16'],
    ])
  })

  it('板帖带时区的截止日(东部零点落库成 UTC 04:00):裁出来仍是发帖方写的那天', () => {
    expect(cellsOf(jobOf({ valid_through: '2026-10-11T04:00:00.000Z' }), NOON_0926)).toEqual([
      ['col.datePosted', '2026-09-25'],
      ['detail.closes', '2026-10-11'],
    ])
  })
})

describe('今天按多伦多日期', () => {
  const today = jobOf({ valid_through: '2026-09-26T00:00:00.000Z' })

  it('多伦多晚上 10 点(UTC 已是明天):截止日当天照出', () => {
    expect(cellsOf(today, LATE_0926).map((c) => c[0])).toEqual(['col.datePosted', 'detail.closes'])
  })

  it('多伦多过了零点:昨天截止的收掉', () => {
    expect(cellsOf(today, AFTER_MIDNIGHT_0927).map((c) => c[0])).toEqual(['col.datePosted'])
  })
})

describe('isExpiredJob:今天由调用方递', () => {
  it('截止日当天不算过期,次日算', () => {
    const job = jobOf({ valid_through: '2026-09-26T00:00:00.000Z' })
    expect(isExpiredJob({ job, today: '2026-09-26' })).toBe(false)
    expect(isExpiredJob({ job, today: '2026-09-27' })).toBe(true)
  })

  it('已下架一律过期;在招且没截止日一律不过期', () => {
    expect(isExpiredJob({ job: jobOf({ status: 'closed' }), today: '2000-01-01' })).toBe(true)
    expect(isExpiredJob({ job: jobOf({ valid_through: null }), today: '2999-12-31' })).toBe(false)
  })
})

describe('性质:任意截止日 × 任意此刻 × 任意状态', () => {
  const DAY = 86_400_000
  const BASE = Date.UTC(2026, 0, 1)

  /** 独立口径的多伦多今天(不走被测的 lib/time 组合):en-CA 恰好出 YYYY-MM-DD。 */
  function torontoToday(now: number): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(now))
  }

  // 截止日贴着「此刻」前后两天生成(一年里任意时刻、跨夏令时两段):UTC 日期与多伦多日期不一致的那几个小时
  // 正是要钉的边界,离得远的日子金标已覆盖。
  const arb = fc.record({
    hasPosted: fc.boolean(),
    offset: fc.option(fc.integer({ min: -2, max: 2 }), { nil: null }),
    now: fc.integer({ min: BASE, max: BASE + 365 * DAY }),
    status: fc.constantFrom('open', 'campus', 'closed', ''),
  })

  /** 截止日:此刻所在 UTC 日往前 / 往后挪 offset 天,落库形同板帖(UTC 零点)。 */
  function deadlineOf(now: number, offset: number): string {
    return new Date(BASE + (Math.floor((now - BASE) / DAY) + offset) * DAY).toISOString()
  }

  it('发布格 ⇔ 有发布日;截止格 ⇔ 有截止日 且 没下架 且 截止日 ≥ 多伦多今天;至多两格、发布在前', () => {
    fc.assert(fc.property(arb, (x) => {
      let vt: string | null = null
      if (x.offset != null) {
        vt = deadlineOf(x.now, x.offset)
      }
      let dp: string | null = null
      if (x.hasPosted) {
        dp = '2025-12-20T00:00:00.000Z'
      }
      const job = jobOf({ status: x.status, date_posted: dp, valid_through: vt })
      const labels = jobDatesOf({ job, t, now: x.now }).map((c) => c.label)
      const wantCloses = vt != null && x.status !== 'closed' && vt.slice(0, 10) >= torontoToday(x.now)
      const want: string[] = []
      if (x.hasPosted) {
        want.push('col.datePosted')
      }
      if (wantCloses) {
        want.push('detail.closes')
      }
      expect(labels).toEqual(want)
    }), { numRuns: 500 })
  })

  it('截止格出现时,同一条 isExpiredJob 按多伦多今天判的一定是没过期', () => {
    fc.assert(fc.property(arb, (x) => {
      if (x.offset == null) {
        return
      }
      const job = jobOf({ status: x.status, valid_through: deadlineOf(x.now, x.offset) })
      const shown = jobDatesOf({ job, t, now: x.now }).some((c) => c.label === 'detail.closes')
      expect(shown).toBe(isExpiredJob({ job, today: torontoToday(x.now) }) === false)
    }), { numRuns: 500 })
  })
})

describe('JobDates 渲染(真时钟,截止日取远未来 / 远过去,结果不随跑测的日子变)', () => {
  /** 挂一次组件,交回每一格(节里每一行 li)的文本;整节没渲给 null。 */
  function cellTexts(job: JobRow): string[] | null {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const host = document.createElement('div')
    const root = createRoot(host)
    act(() => {
      root.render(React.createElement(JobDates, { job, t }))
    })
    const sec = host.firstElementChild
    let out: string[] | null = null
    if (sec != null) {
      out = Array.from(sec.querySelectorAll('li')).map((c) => String(c.textContent))
    }
    act(() => {
      root.unmount()
    })
    return out
  }

  it('两格:标签、一个空格、YYYY-MM-DD', () => {
    expect(cellTexts(jobOf({ valid_through: '2999-12-31T00:00:00.000Z' }))).toEqual([
      'col.datePosted 2026-09-25',
      'detail.closes 2999-12-31',
    ])
  })

  it('截止日已过:只剩发布一格', () => {
    expect(cellTexts(jobOf({ valid_through: '2000-01-01T00:00:00.000Z' }))).toEqual(['col.datePosted 2026-09-25'])
  })

  it('小标题:正文里一节「日期」,两行在它下面', () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const host = document.createElement('div')
    const root = createRoot(host)
    act(() => {
      root.render(React.createElement(JobDates, { job: jobOf({ valid_through: '2999-12-31T00:00:00.000Z' }), t }))
    })
    const head = host.querySelector('ul')?.previousElementSibling
    expect(head?.textContent).toBe('act.f.dates')
    act(() => {
      root.unmount()
    })
  })

  it('一格都没有:整行不渲(不留空行)', () => {
    expect(cellTexts(jobOf({ date_posted: null, valid_through: null }))).toBeNull()
  })
})
