// AI 写信试用闸(2026-10-07 批 C:免费档 AI 按 JD 写信一辈子试用 3 个职位,第 4 个起 402 弹升级框;lib/quota 试用账 + /api/apply/letter
// + 下单回跳白名单)。dev 直连生产库不碰库:鉴权、连接、模型、JD、简历抽字全 mock。
// 性质:① 试用三判(isTrialOpen / trialLeftOf / trialAfterOf)在「用量 0–4 × 本岗用没用过 × Pro 与否」全格上:Pro 恒放行、余量 null;
//          本岗用过的放行(同岗重写不另算);其余用量 < 上限才放行;免费余量 = 上限 − 用量、不低于 0;记一笔只在本岗没用过时 +1。
//       ② 写信路由:免费档用满、本岗没用过 → 402 带兜底模板信,不调模型、不记账;本岗用过 → 照写,回包余量不变;没用满 → 写成才记一笔、
//          回包余量减一;模型挂了给模板信、不记账;Pro 回包余量 null。
//       ③ 下单回跳只认「我的」页带参数的站内地址;外站、协议相对、别的路径、带怪字符、没带,一律回账户页。
// 探针:isTrialOpen 去掉 here 放行 → ① 与 ②「本岗用过」红;写成之前就 markTrial → ②「模型挂了不记账」红;
//       BACK_RE 放宽成 ^\/ → ③ 红。
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { SQL } from '@/lib/db'
import type { QueryResult, SqlParam } from '@/lib/db'
import { isTrialOpen, trialAfterOf, trialLeftOf } from '@/lib/quota/server'
import type { SessionUser } from '@/lib/quota'
import { returnPathsOf } from '@/lib/stripe/functions'

const LETTER = 'Dear Hiring Manager,\n\nI am applying for the Cook position at Pie Wood. My resume shows three years of line cooking '
  + 'and food safety training.\n\nI would welcome an interview. Thank you for your time.\n\nSincerely,\nZhang San'

const h = vi.hoisted(() => {
  const user: { current: object | null } = { current: null }
  const trial = { used: 0, here: false }
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
      if (sql === SQL.TRIAL_USED) {
        return { rows: [{ used: h.trial.used, here: h.trial.here }], rowCount: 1 }
      }
      if (sql === SQL.APPLY_RESUME_BLOB) {
        return {
          rows: [{ id: 7, file_b64: 'JVBERi0=', file_name: 'zhang.pdf', mime: 'application/pdf', uploaded_at: '2026-10-06' }],
          rowCount: 1,
        }
      }
      if (sql === SQL.TRIAL_MARK) {
        h.marks.push(params)
      }
      return { rows: [], rowCount: 0 }
    },
  }),
}))

const FREE = { id: 5, email: 'zhang@test.local', role: 'user', proUntil: null }
const PRO = { id: 6, email: 'pro@test.local', role: 'user', proUntil: '2099-01-01T00:00:00.000Z' }

function user(p: { pro: boolean }): SessionUser {
  return (p.pro ? PRO : FREE) as unknown as SessionUser
}

async function write(): Promise<{ status: number, body: { text?: string, ai?: boolean, left?: number | null, error?: string } }> {
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

describe('① 试用三判', () => {
  it('全格:Pro 恒放行、余量 null;本岗用过放行;其余用量 < 上限才放行;余量不低于 0;记一笔只在本岗没用过时 +1', () => {
    const max = 3
    for (const pro of [false, true]) {
      for (const here of [false, true]) {
        for (let used = 0; used <= 4; used++) {
          const gate = { user: user({ pro }), trial: { used, here }, max }
          expect(isTrialOpen(gate)).toBe(pro || here || used < max)
          expect(trialLeftOf(gate)).toBe(pro ? null : Math.max(0, max - used))
          expect(trialAfterOf({ used, here })).toEqual(here ? { used, here } : { used: used + 1, here: true })
        }
      }
    }
  })
})

describe('② 写信路由的试用闸', () => {
  it('免费档用满、本岗没用过 → 402 带兜底模板信,不调模型、不记账', async () => {
    h.user.current = FREE
    h.trial.used = 3
    h.trial.here = false
    const r = await write()
    expect(r.status).toBe(402)
    expect(r.body.error).toBe('trial')
    expect(r.body.left).toBe(0)
    expect(r.body.text).toContain('Pie Wood')
    expect(r.body.text).toContain('Zhang San')
    expect(h.complete).not.toHaveBeenCalled()
    expect(h.marks).toEqual([])
  })

  it('本岗用过 → 照写(同岗重写不另算),回包余量不变', async () => {
    h.user.current = FREE
    h.trial.used = 3
    h.trial.here = true
    const r = await write()
    expect(r.status).toBe(200)
    expect(r.body.ai).toBe(true)
    expect(r.body.left).toBe(0)
  })

  it('没用满 → 写成才记一笔(用户、功能名、职位),回包余量减一', async () => {
    h.user.current = FREE
    h.trial.used = 1
    h.trial.here = false
    const r = await write()
    expect(r.status).toBe(200)
    expect(r.body.ai).toBe(true)
    expect(r.body.left).toBe(1)
    expect(h.marks).toEqual([[5, 'letter', 42]])
  })

  it('模型挂了 → 给兜底模板信,不记账、余量不变', async () => {
    h.user.current = FREE
    h.trial.used = 0
    h.trial.here = false
    h.complete.mockRejectedValue(new Error('down'))
    const r = await write()
    expect(r.status).toBe(200)
    expect(r.body.ai).toBe(false)
    expect(r.body.left).toBe(3)
    expect(h.marks).toEqual([])
  })

  it('Pro → 照写,回包余量 null', async () => {
    h.user.current = PRO
    h.trial.used = 9
    h.trial.here = false
    const r = await write()
    expect(r.status).toBe(200)
    expect(r.body.left).toBe(null)
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
