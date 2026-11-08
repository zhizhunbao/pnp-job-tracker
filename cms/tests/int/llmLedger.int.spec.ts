// AI 额度闸与用量账本(lib/llm/ledger)回归:最坏成本是真实成本的上界、金标单价、失败收场穷举、拿不准一律花不起。
import { describe, expect, it, vi } from 'vitest'

import { fateOf, inputBytesOf, reserve, usageCostOf } from '@/lib/llm/ledger'
import { worstCostOf } from '@/lib/llm/ledger/functions'
import { INPUT_BYTES_MAX, MODEL_PRICE, STATE } from '@/lib/llm/ledger/constants'

const MODEL = 'claude-haiku-4-5'

function fakeDb(rows: { id: string }[]) {
  return { query: vi.fn().mockResolvedValue({ rows, rowCount: rows.length }) }
}

const BASE = { feature: 'test', model: MODEL, inputBytes: 1000, inputChars: 1000, maxTokens: 500 }

describe('worstCostOf', () => {
  it('对任意不超线的真实用量都是上界', () => {
    for (const model of Object.keys(MODEL_PRICE)) {
      for (const bytes of [0, 1, 999, 50_000, INPUT_BYTES_MAX]) {
        for (const maxTokens of [1, 300, 8192]) {
          const worst = worstCostOf({ model, inputBytes: bytes, maxTokens })
          const usage = {
            input_tokens: bytes, output_tokens: maxTokens, cache_creation_input_tokens: null, cache_read_input_tokens: null,
          }
          const actual = usageCostOf({ model, usage })
          expect(worst).not.toBeNull()
          expect(actual).not.toBeNull()
          expect(worst as number).toBeGreaterThanOrEqual(actual as number)
        }
      }
    }
  })

  it('价表外的模型与超线输入算不出', () => {
    expect(worstCostOf({ model: 'claude-unknown', inputBytes: 1, maxTokens: 1 })).toBeNull()
    expect(worstCostOf({ model: MODEL, inputBytes: INPUT_BYTES_MAX + 1, maxTokens: 1 })).toBeNull()
  })
})

describe('usageCostOf 金标', () => {
  it('Haiku 4.5:1000 进 500 出 = $0.0035', () => {
    const usage = { input_tokens: 1000, output_tokens: 500, cache_creation_input_tokens: null, cache_read_input_tokens: null }
    expect(usageCostOf({ model: MODEL, usage })).toBeCloseTo(0.0035, 6)
  })

  it('缓存读写按各自单价计入', () => {
    const usage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 1000, cache_read_input_tokens: 1000 }
    expect(usageCostOf({ model: MODEL, usage })).toBeCloseTo(0.00135, 6)
  })
})

describe('inputBytesOf', () => {
  it('中文按 UTF-8 字节算,不按字符', () => {
    expect(inputBytesOf({ messages: [{ content: '中文' }, { content: 'ab' }] })).toBe(8)
  })
})

describe('fateOf', () => {
  it('官方花费封顶与余额不足:退款并换通道', () => {
    expect(fateOf({ status: 429, message: 'enforced' })).toEqual({ state: STATE.failed, keepHold: false, degrade: true })
    expect(fateOf({ status: 400, message: 'You have reached your specified API usage limits' }).degrade).toBe(true)
    expect(fateOf({ status: 400, message: 'Your credit balance is too low' }).degrade).toBe(true)
  })

  it('请求本身有问题:退款、报错、不换通道', () => {
    expect(fateOf({ status: 400, message: 'max_tokens invalid' })).toEqual({ state: STATE.failed, keepHold: false, degrade: false })
  })

  it('鉴权失败换通道', () => {
    expect(fateOf({ status: 401, message: 'invalid x-api-key' }).degrade).toBe(true)
  })

  it('5xx 与断连结局不明:预扣全额记账', () => {
    for (const status of [500, 529, null]) {
      expect(fateOf({ status, message: 'x' })).toEqual({ state: STATE.unknown, keepHold: true, degrade: true })
    }
  })
})

describe('reserve 拿不准一律花不起', () => {
  it('放得下:回预扣', async () => {
    const db = fakeDb([{ id: '7' }])
    const hold = await reserve({ db, ...BASE })
    expect(hold?.id).toBe('7')
    expect(hold?.reservedUsd).toBe(worstCostOf({ model: MODEL, inputBytes: 1000, maxTokens: 500 }))
  })

  it('线上放不下:null,并记一行 blocked', async () => {
    const db = fakeDb([])
    expect(await reserve({ db, ...BASE })).toBeNull()
    expect(db.query).toHaveBeenCalledTimes(2)
    expect(db.query.mock.calls[1]?.[1]).toContain(STATE.blocked)
  })

  it('库报错或表没建:null', async () => {
    const db = { query: vi.fn().mockRejectedValue(new Error('42P01')) }
    expect(await reserve({ db, ...BASE })).toBeNull()
  })

  it('价表外的模型:不碰库,null', async () => {
    const db = fakeDb([{ id: '7' }])
    expect(await reserve({ db, ...BASE, model: 'claude-unknown' })).toBeNull()
    expect(db.query).not.toHaveBeenCalled()
  })
})
