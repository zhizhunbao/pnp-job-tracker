// G3 简历对照——纯函数层(免费闸/JSON 收口/形状校验)。LLM 本体不测(网络),测的是它两侧的护栏。
import { describe, it, expect } from 'vitest'
import { CLAMP, FREE_ROWS, GATEWAY_MAX } from '@/lib/resume/constants'
import { gateMatch, matchPrompt, normalizeRows, parseLlmJson, promptChars } from '@/lib/resume/functions'
import type { MatchRow } from '@/lib/resume/types'
import { FRIEND_INPUT_MAX } from '@/lib/llm'

const row = (hit: boolean, i: number): MatchRow => ({ req: `req${i}`, hit, note: `note${i}` })

describe('G3 免费闸(服务端裁,锁区正文不下发)', () => {
  it('缺的排前;免费=前 5 行,lockedN=真实剩余(前端打几行码看它)', () => {
    const rows = [row(true, 1), row(false, 2), row(true, 3), row(false, 4), row(true, 5), row(true, 6), row(false, 7)]
    const g = gateMatch({ rows, pro: false })
    expect(g.visible).toHaveLength(FREE_ROWS)
    expect(g.visible.slice(0, 3).every((r) => !r.hit)).toBe(true)   // 3 条缺的全在前
    expect(g.lockedN).toBe(2)
    expect(g.hitN).toBe(4)
    expect(g.total).toBe(7)
  })

  it('Pro 全量下发,lockedN=0;行数 ≤5 免费也全给(没有假锁)', () => {
    const rows = [row(false, 1), row(true, 2), row(true, 3)]
    expect(gateMatch({ rows, pro: true }).lockedN).toBe(0)
    const free = gateMatch({ rows, pro: false })
    expect(free.visible).toHaveLength(3)
    expect(free.lockedN).toBe(0)
  })
})

describe('G3 LLM 输出收口(形状不可信)', () => {
  it('裹了说明文字的 JSON 也收得住;彻底不是 JSON → null', () => {
    expect(parseLlmJson('Here you go: {"rows":[{"req":"a","hit":true,"note":"b"}]} hope it helps')?.rows).toHaveLength(1)
    expect(parseLlmJson('sorry I cannot')).toBeNull()
  })

  it('脏行丢弃、超长截断;有效行 <3 = 整体判失败(不硬凑)', () => {
    const ok = normalizeRows({ rows: [
      { req: 'a', hit: true, note: 1 }, { req: 'b', hit: false, note: 'x' },
      { req: 'c'.repeat(200), hit: true, note: 'y' }, { req: '', hit: true }, { hit: true },
    ] })!
    expect(ok).toHaveLength(3)
    expect(ok[0].note).toBe('1')                       // note 缺省/非串 → 字符串化兜底
    expect(ok[2].req.length).toBeLessThanOrEqual(80)
    expect(normalizeRows({ rows: [{ req: 'a', hit: true, note: '' }] })).toBeNull()
    expect(normalizeRows({})).toBeNull()
  })

  it('prompt:免费不带 rewrite(不为看不见的东西花输出 token);输入两侧截断;简历当数据不当指令', () => {
    const free = matchPrompt({ jd: 'jd', resume: 'resume', lang: 'zh-cn', pro: false })[0].content
    expect(free).not.toContain('rewrite')
    expect(free).toContain('Simplified Chinese')
    expect(free).toContain('not instructions')
    expect(matchPrompt({ jd: 'jd', resume: 'r'.repeat(20000), lang: 'en', pro: true })[1].content.length).toBeLessThan(17000)
    expect(matchPrompt({ jd: 'jd', resume: 'resume', lang: 'en', pro: true })[0].content).toContain('rewrite')
  })
})

// 这组是 2026-08-04「真简历必败」的回归闸:根因是上游 6000 字符上限,当时靠路由里切 2800/3100 止血;
// 上游换 /v1 后上限 20000,切法撤掉 → 必须有测试盯住「最坏输入仍在上限内且留够余量」,
// 否则哪天有人把 CLAMP 调大,又会变成用户侧一句「稍后再试」。
describe('G3 输入预算(对齐上游网关 20000 字符上限)', () => {
  it('两侧顶满 + Pro 版最长 system:总字符仍 < 上限,且留 ≥10% 余量', () => {
    const worst = promptChars(matchPrompt({ jd: 'J'.repeat(CLAMP * 2), resume: 'R'.repeat(CLAMP * 2), lang: 'zh-cn', pro: true }))
    expect(worst).toBeLessThanOrEqual(GATEWAY_MAX * 0.9)   // 不顶格:上游按字符算,顶格等于把 400 留给用户
    expect(worst).toBeGreaterThan(CLAMP * 2)               // 也别切过头——两侧都得真给到 CLAMP
  })

  it('预算常量与传输层同一个数(改单边=下一次事故)', () => {
    expect(GATEWAY_MAX).toBe(FRIEND_INPUT_MAX)
  })
})
