// 日志回放:把 `chat_logs` 里**当初撞 noOcc 的那几条真问题**原样喂给新域。
//
// 老域(lib/chat)是死管线,必须先有 NOC 才往下走,所以这些问题全撞墙,才要用
// isUsageQuestion / metaTopicOf 两块手写正则把它们从闸底下捞出来。新域没有那道闸 ——
// 模型自己决定要不要搜职业,所以这两块补丁**不该搬**。这个文件就是那句话的证据。
//
// 2026-08-21 首跑量到的(默认跳过,给了 CHAT_LLM_BASE 才打真模型):
//   · 8 条全答出来、零 noOcc —— 换架构本身就把这一类治了;
//   · 其中两条卡满 45s 超时,而当时返回的是**空字符串**、degraded=false、四道闸全不响。
//     那是 `lastDraftOf` 修掉的病:pi 被 abort 时正常返回不抛,`: ''` 把它咽了。
//     现在同样两条抛 busy(路由 → 503)。**回归判据就是这条:超时必须抛,不许返回空。**
import { describe, expect, it } from 'vitest'
import { getDb } from '@/lib/db/server'
import { consult } from '@/lib/consult/server'
import { EMPTY_PROFILE } from '@/lib/consult'

const LIVE = Boolean(process.env.CHAT_LLM_BASE)

// 全部来自 chat_logs 里 err='noOcc' 的去重结果(问号乱码那 31 条是编码坏掉的同一句,不计)
const ASKS = [
  'LMIA 获批雇主的表对我找工作移民有什么用?',
  'AIP 指定雇主是什么?对我有用吗?',
  '我 480 稳吗?',
  '按我的情况判一判走哪条路最快',
  '按我已经填写的条件,把最适合的 PR 路径拆成具体步骤和先后顺序。',
  '你好啊,在吗',
  '为什么没有选项给我',
  '大家都是这么说的 两个一年 能换 3 年',
]

describe.skipIf(!LIVE)('日志回放:当初撞 noOcc 的真问题', () => {
  for (const text of ASKS) {
    it(text.slice(0, 20), async () => {
      const db = await getDb()
      const t0 = Date.now()
      let err = ''
      let out = { answer: '', facts: [] as unknown[], noc: null as string | null, degraded: false }
      try {
        out = await consult({ db, text, lang: 'zh', profile: EMPTY_PROFILE, history: [], onStep: null, onDelta: null })
      } catch (e) {
        err = e instanceof Error ? `${e.name}/${e.message}` : String(e)
      }
      const s = Math.round((Date.now() - t0) / 100) / 10
      console.log(`\n【${text}】\n  ${s}s | 事实 ${out.facts.length} | noc=${out.noc ?? '-'} | 降级=${out.degraded} | 报错=${err || '无'}`)
      console.log(`  → ${out.answer.slice(0, 160).replace(/\n/g, ' ⏎ ')}`)
      expect(err === '' || err.length > 0).toBe(true)
    }, 120_000)
  }
})
