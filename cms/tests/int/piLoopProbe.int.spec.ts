/**
 * 临时探针(**不是回归测试,验完就删**):拿生产里真实失败过的问句,打真库 + 局域网模型跑一趟工具循环。
 *
 * 要验的就三件:
 *   ① `你能做什么` 这类 meta 问题**不调工具直接答**(旧链在这儿 15 秒超时报 busy);
 *   ② `我 480 稳吗` 这类 CRS 问题**不被硬要职业**(旧链在这儿报 noOcc);
 *   ③ 说了职业的问题照旧查得出数,且数字来自工具。
 */
import { describe, expect, it } from 'vitest'
import { getDb } from '@/lib/db/server'
import { consult } from '@/lib/consult/functions'
import type { Profile } from '@/lib/consult/types'

const EMPTY: Profile = {}

// 🔴 打真库 + 真模型,**默认不跑**:全量 vitest 不该依赖局域网那台盒子在线。
//    要跑就显式给地址:
//    CHAT_LLM_BASE=http://192.168.1.150:11434 CHAT_LLM_MODEL=qwen3.6:latest CHAT_LLM_KEY= npx vitest run ...
const LIVE = Boolean(process.env.CHAT_LLM_BASE)

describe.skipIf(!LIVE)('pi 工具循环(打真库 + 真模型)', () => {
  const cases: { name: string; text: string; profile?: Profile }[] = [
    { name: '① meta:你能做什么(旧链 busy 超时)', text: '你能做什么' },
    { name: '② CRS:我 480 稳吗(旧链 noOcc)', text: '我 480 稳吗?' },
    { name: '③ 乱输入:LMIA ??????(旧链 noOcc,占了 41 次里的 18 次)', text: 'LMIA ??????????????????' },
    { name: '④ 正常:木匠在安省有岗位吗', text: '我是木匠,安省有岗位吗?', profile: { provs: ['ON'] } },
    { name: '⑤ 门槛:BC 省提名对木匠有什么要求', text: '我是木匠,BC 省提名对我有什么要求?', profile: { provs: ['BC'] } },
  ]

  for (const c of cases) {
    it(c.name, async () => {
      const db = await getDb()
      const steps: string[] = []
      const t0 = Date.now()
      const r = await consult({
        db,
        text: c.text,
        lang: 'zh',
        profile: { ...EMPTY, ...(c.profile ?? {}) },
        history: [],
        onStep: (s: string) => { steps.push(s.slice(0, 24)) },
      })
      const secs = ((Date.now() - t0) / 1000).toFixed(1)
      console.log(`\n${'='.repeat(70)}\n${c.name}\n问: ${c.text}`)
      console.log(`用时 ${secs}s | 工具 ${steps.length} 次 | 事实 ${r.facts.length} 条 | noc=${r.noc ?? '-'}`)
      console.log(`答: ${r.answer.slice(0, 420)}`)
      expect(r.answer.length).toBeGreaterThan(0)
    }, 120_000)
  }
})
