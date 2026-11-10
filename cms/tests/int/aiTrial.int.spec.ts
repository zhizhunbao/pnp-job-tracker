// AI 写信试用闸(2026-10-07 批 C:免费档 AI 按 JD 写信一辈子试用 3 个职位,第 4 个起 402 弹升级框;lib/quota 试用账 + /api/apply/letter
// + 下单回跳白名单)。dev 直连生产库不碰库:鉴权、连接、模型、JD、简历抽字全 mock。
// 性质:① 试用三判(isTrialOpen / trialLeftOf / trialAfterOf)在「用量 0–4 × 本岗用没用过 × Pro 与否」全格上:Pro 恒放行、余量 null;
//          本岗用过的放行(同岗重写不另算);其余用量 < 上限才放行;免费余量 = 上限 − 用量、不低于 0;记一笔只在本岗没用过时 +1。
//       ② 写信路由:免费档用满、本岗没用过 → 402 带兜底模板信,不调模型、不记账;本岗用过 → 照写,回包余量不变;没用满 → 写成才记一笔、
//          回包余量减一;模型挂了给模板信、不记账;Pro 回包余量 null。
//       ③ 下单回跳只认「我的」页带参数的站内地址;外站、协议相对、别的路径、带怪字符、没带,一律回账户页。
// 探针:isTrialOpen 去掉 here 放行 → ① 与 ②「本岗用过」红;写成之前就 markTrial → ②「模型挂了不记账」红;
//       BACK_RE 放宽成 ^\/ → ③ 红。
// 2026-10-10 投递框三步(Frank「用户只要一点击,就弹收费。用户自己弄 不收费」):写信路由的试用撤,② 改验 Pro 闸 —— 免费档一律 402 pro、
//       不调模型不记账;Pro 照写、回包带 JD(对照框「职位要求」栏)。① 的三判仍是智能投递(lib/queue)在用。
// 探针:applyLetterRoute 去掉 isPro 判 → ②第一条红。
// 2026-10-10 Frank「删吧」(「今日待投 / 智能投递」整条撤):① 试用三判的最后消费者智能投递删了,lib/quota 的试用账函数与 TRIAL_USED /
//       TRIAL_MARK 两条 SQL 随之删,① 用例撤;桩改按 SQL 文本认 ai_trials 读写(② 仍断言「不记账」)。
// 2026-11-07 Frank 看过设计稿(docs/design/我的/我的求职-20261009.md 1.10 / 2.10)说「可以」:写信路由的试用恢复(读写方
//       lib/apply 的 loadLetterTrial / markLetterTrial,TRIAL_USED / TRIAL_MARK 回 lib/db 第 33 段)。② 改验试用闸,在「用量 0–4 ×
//       本岗用没用过」全格上:本岗用过或用量 < 3 才放行;放行时写成才记账(本岗用过不再记),回包 left = 3 − 记账后用量、不低于 0;
//       不放行 402 pro、不调模型不记账;试用中模型挂了不记账、left 不变;Pro 照写、不记账、left = null。
// 探针:isLetterTrialOpen 去掉 here → ②「本岗用过」格红;写成之前就 markLetterTrial → ②「模型挂了」红;trialLeftOf 不加记账 → left 格红。
// 2026-11-09 Frank 定额度(读写方改成 lib/apply/credit):免费每人 3 个终身一次、记在 tailor.free 名下(老的 letter 账不读);
//       会员从购买日起每 30 天一期、每期 60 个、记在 tailor.pro 名下,用完 402 并带恢复时刻,不退回去吃免费那 3 个。
//       ① 新增纯函数性质:periodOf 在「到期日 × 现在」上,当期必含现在、长 30 天、终点与到期日差 30 天的整数倍、不晚于到期日;
//          到期、没买过、读不出一律 null。creditOf:免费看累计、会员只看当期。
//       ② Pro 的两条改验:照写并记一笔在 tailor.pro 名下、left = 60 − 记账后当期用量;当期用满且本岗没记过 → 402 带 plan 与 resetAt。
// 探针:periodOf 改成按自然月 → ①红;creditOf 会员档改读 freeUsed → ①与②红;markCredit 不分档 → ②「记在 tailor.pro」红。
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { creditOf, periodOf } from '@/lib/apply/credit'
import { SQL } from '@/lib/db'
import type { QueryResult, SqlParam } from '@/lib/db'
import { returnPathsOf } from '@/lib/stripe/functions'

const LETTER = 'Dear Hiring Manager,\n\nI am applying for the Cook position at Pie Wood. My resume shows three years of line cooking '
  + 'and food safety training.\n\nI would welcome an interview. Thank you for your time.\n\nSincerely,\nZhang San'

const h = vi.hoisted(() => {
  const user: { current: object | null } = { current: null }
  const trial = { used: 0, proUsed: 0, here: false }
  const marks: SqlParam[][] = []
  const complete = vi.fn(async (): Promise<string> => '')
  return { user, trial, marks, complete }
})

vi.mock('payload', () => ({ getPayload: async () => ({ auth: async () => ({ user: h.user.current }) }) }))
vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers() }))
vi.mock('@/lib/llm', () => ({ completeText: h.complete }))
vi.mock('@/lib/jobs/server', () => ({
  loadApplyUrlById: async () => 'https://example.com/post/42',
  jobDescription: async () => 'We need a cook with line experience and food safety training. '.repeat(4),
}))
vi.mock('@/lib/resume', async (orig) => ({
  ...(await orig<typeof import('@/lib/resume')>()),
  extractText: async () => ({ text: 'Zhang San. Line cook, 3 years. Food safety certificate.' }),
}))
vi.mock('@/lib/db/server', () => ({
  getDb: async () => ({
    query: async (sql: string, params: SqlParam[] = []): Promise<QueryResult> => {
      if (sql === SQL.APPLY_JOB) {
        return {
          rows: [{
            id: 42, title: 'Cook', company_name: 'Pie Wood', city: 'Steinbach', province: 'MB', job_status: 'active',
            apply_email: 'hr@piewood.ca',
          }],
          rowCount: 1,
        }
      }
      if (sql.includes('FROM ai_trials')) {
        return { rows: [{ free_used: h.trial.used, pro_used: h.trial.proUsed, here: h.trial.here }], rowCount: 1 }
      }
      if (sql === SQL.APPLY_RESUME_BLOB) {
        return {
          rows: [{ id: 7, file_b64: 'JVBERi0=', file_name: 'zhang.pdf', mime: 'application/pdf', uploaded_at: '2026-10-06' }],
          rowCount: 1,
        }
      }
      if (sql.includes('INSERT INTO ai_trials')) {
        h.marks.push(params)
      }
      return { rows: [], rowCount: 0 }
    },
  }),
}))

const FREE = { id: 5, email: 'zhang@test.local', role: 'user', proUntil: null }
const PRO = { id: 6, email: 'pro@test.local', role: 'user', proUntil: '2099-01-01T00:00:00.000Z' }

async function write(): Promise<{
  status: number,
  body: { text?: string, ai?: boolean, jd?: string, error?: string, left?: number | null, plan?: string, resetAt?: string | null },
}> {
  const { applyLetterRoute } = await import('@/lib/apply/routes')
  const r = await applyLetterRoute(new Request('http://x/api/apply/letter', {
    method: 'POST', body: JSON.stringify({ jobId: 42, resumeId: 7, senderName: 'Zhang San' }),
  }))
  return { status: r.status, body: await r.json() }
}

// 路由模块头一次加载要几秒(pdf-lib 等),预热一次,别算进第一条用例的 5 秒里
beforeAll(async () => {
  await import('@/lib/apply/routes')
}, 30000)

beforeEach(() => {
  h.marks.length = 0
  h.complete.mockReset()
  h.complete.mockResolvedValue(LETTER)
})

afterEach(() => {
  h.user.current = null
})

describe('② 写信路由的试用闸(2026-11-07 恢复:免费档每人 3 个职位,同岗重写不另算)', () => {
  it('免费档全格:本岗用过或用量 < 3 放行,写成才记账,left = 3 − 记账后用量;否则 402', async () => {
    h.user.current = FREE
    for (const used of [0, 1, 2, 3, 4]) {
      for (const here of [false, true]) {
        h.trial.used = used
        h.trial.here = here
        h.marks.length = 0
        h.complete.mockClear()
        const r = await write()
        if (here || used < 3) {
          const after = used + (here ? 0 : 1)
          expect(r.status).toBe(200)
          expect(r.body.ai).toBe(true)
          expect(h.marks.length).toBe(here ? 0 : 1)
          if (here === false) {
            expect(h.marks[0]).toEqual([5, 'tailor.free', 42])
          }
          expect(r.body.left).toBe(Math.max(0, 3 - after))
        } else {
          expect(r.status).toBe(402)
          expect(r.body.error).toBe('pro')
          expect(r.body.plan).toBe('free')
          expect(r.body.resetAt).toBeNull()
          expect(r.body.text).toBeUndefined()
          expect(h.complete).not.toHaveBeenCalled()
          expect(h.marks).toEqual([])
        }
      }
    }
  })

  it('试用中模型挂了 → ai = false,不记账,left 不变', async () => {
    h.user.current = FREE
    h.trial.used = 1
    h.trial.here = false
    h.complete.mockRejectedValue(new Error('down'))
    const r = await write()
    expect(r.status).toBe(200)
    expect(r.body.ai).toBe(false)
    expect(h.marks).toEqual([])
    expect(r.body.left).toBe(2)
  })

  it('Pro → 照写,回包带这一岗的 JD,记一笔在 tailor.pro 名下,left = 60 − 记账后当期用量;免费档用量不影响', async () => {
    h.user.current = PRO
    h.trial.used = 9
    h.trial.proUsed = 9
    h.trial.here = false
    const r = await write()
    expect(r.status).toBe(200)
    expect(r.body.ai).toBe(true)
    expect(r.body.jd).toContain('We need a cook')
    expect(h.marks).toEqual([[6, 'tailor.pro', 42]])
    expect(r.body.left).toBe(50)
  })

  it('Pro 当期用满:本岗没记过 → 402 带 plan 与恢复时刻,不调模型不记账;本岗记过 → 照写不再记', async () => {
    h.user.current = PRO
    h.trial.proUsed = 60
    h.trial.here = false
    const out = await write()
    expect(out.status).toBe(402)
    expect(out.body.plan).toBe('pro')
    expect(typeof out.body.resetAt).toBe('string')
    expect(Date.parse(String(out.body.resetAt))).toBeGreaterThan(Date.now())
    expect(h.complete).not.toHaveBeenCalled()
    expect(h.marks).toEqual([])
    h.trial.here = true
    const again = await write()
    expect(again.status).toBe(200)
    expect(h.marks).toEqual([])
    expect(again.body.left).toBe(0)
  })

  it('Pro 模型挂了 → ai = false(前端出「没写成」),不记账', async () => {
    h.user.current = PRO
    h.complete.mockRejectedValue(new Error('down'))
    const r = await write()
    expect(r.status).toBe(200)
    expect(r.body.ai).toBe(false)
    expect(h.marks).toEqual([])
  })
})

describe('① 额度的纯函数(2026-11-09:会员从购买日起每 30 天一期)', () => {
  const DAY = 86_400_000
  const PERIOD = 30 * DAY

  it('periodOf:当期必含现在、长 30 天、终点与到期日差整数期、不晚于到期日', () => {
    const now = Date.parse('2026-11-09T12:00:00.000Z')
    for (const aheadDays of [0.001, 0.5, 1, 29, 29.999, 30, 30.001, 45, 60, 89, 90, 120, 365]) {
      const until = now + aheadDays * DAY
      const p = periodOf({ proUntil: new Date(until).toISOString(), nowMs: now })
      expect(p).not.toBeNull()
      if (p == null) {
        continue
      }
      const start = Date.parse(p.startIso)
      const end = Date.parse(p.endIso)
      expect(end - start).toBe(PERIOD)
      expect(start).toBeLessThanOrEqual(now)
      expect(end).toBeGreaterThan(now)
      expect(end).toBeLessThanOrEqual(Math.round(until))
      expect(Math.abs(((Math.round(until) - end) / PERIOD) % 1)).toBeLessThan(1e-9)
    }
  })

  it('periodOf 金标:11-01 买 90 天,11-09 在第一期(11-01 到 12-01);12-05 在第二期(12-01 到 12-31)', () => {
    const until = '2027-01-30T00:00:00.000Z'
    expect(periodOf({ proUntil: until, nowMs: Date.parse('2026-11-09T00:00:00.000Z') })).toEqual({
      startIso: '2026-11-01T00:00:00.000Z', endIso: '2026-12-01T00:00:00.000Z',
    })
    expect(periodOf({ proUntil: until, nowMs: Date.parse('2026-12-05T00:00:00.000Z') })).toEqual({
      startIso: '2026-12-01T00:00:00.000Z', endIso: '2026-12-31T00:00:00.000Z',
    })
  })

  it('periodOf:没买过、已到期、读不出 → null', () => {
    const now = Date.parse('2026-11-09T12:00:00.000Z')
    expect(periodOf({ proUntil: null, nowMs: now })).toBeNull()
    expect(periodOf({ proUntil: '2026-11-09T12:00:00.000Z', nowMs: now })).toBeNull()
    expect(periodOf({ proUntil: '2026-01-01T00:00:00.000Z', nowMs: now })).toBeNull()
    expect(periodOf({ proUntil: 'soon', nowMs: now })).toBeNull()
  })

  it('creditOf:免费看累计(上限 3、无恢复日),会员只看当期(上限 60、恢复日 = 当期终点),余量不低于 0', () => {
    const period = { startIso: '2026-11-01T00:00:00.000Z', endIso: '2026-12-01T00:00:00.000Z' }
    for (const freeUsed of [0, 1, 3, 7]) {
      for (const proUsed of [0, 1, 59, 60, 61]) {
        for (const here of [false, true]) {
          const use = { freeUsed, proUsed, here }
          expect(creditOf({ use, period: null })).toEqual({
            plan: 'free', used: freeUsed, max: 3, left: Math.max(0, 3 - freeUsed), here, resetAt: null,
          })
          expect(creditOf({ use, period })).toEqual({
            plan: 'pro', used: proUsed, max: 60, left: Math.max(0, 60 - proUsed), here, resetAt: period.endIso,
          })
        }
      }
    }
  })
})

describe('③ 下单回跳白名单', () => {
  it('只认「我的」页带参数的站内地址,其余回账户页', () => {
    expect(returnPathsOf({ plan: '30', back: '/account?sec=sjobs&job=42' })).toEqual({
      ok: '/account?sec=sjobs&job=42&ok=1', cancel: '/account?sec=sjobs&job=42',
    })
    const home = { ok: '/account?ok=1', cancel: '/account' }
    for (const back of ['https://evil.com/account?x=1', '//evil.com/account?x=1', '/jobs/42?x=1', '/account?x=<a>', '/account', '']) {
      expect(returnPathsOf({ plan: '30', back })).toEqual(home)
    }
    expect(returnPathsOf({ plan: '30' })).toEqual(home)
    expect(returnPathsOf(null)).toEqual(home)
  })
})
