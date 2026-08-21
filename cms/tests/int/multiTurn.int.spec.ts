// 临时探针(验完就删):**追问记不记得住上一轮**。
//
// consult() 的入参里 `history` 与 `profile` 是两格:history 是原话,profile 是抽出来的槽。
// 生产日志里「大家都是这么说的 两个一年 能换 3 年」这句 4 次成功(noc 从上一轮带下来)、
// 1 次 noOcc —— 所以要分开量两种情形:
//   A 只给 history、profile 空  → 模型自己从上文重新认职业
//   B history + profile.noc 带上 → 调用方尽了责
import { describe, it } from 'vitest'
import { getDb } from '@/lib/db/database'
import { consult } from '@/lib/consult/server'
import type { Profile, Turn } from '@/lib/consult'

const LIVE = Boolean(process.env.CHAT_LLM_BASE)

type Seq = { name: string; first: string; follow: string; profileOnFollow: Profile }

const SEQS: Seq[] = [
  {
    name: 'A 只给 history(profile 空)',
    first: '我是木匠,想去 BC 省。',
    follow: '那对语言有什么要求?',
    profileOnFollow: {},
  },
  {
    name: 'B history + profile.noc',
    first: '我是木匠,想去 BC 省。',
    follow: '那对语言有什么要求?',
    profileOnFollow: { noc: '72310', provs: ['BC'] },
  },
  {
    name: 'C 生产实录那句(只给 history)',
    first: '我是厨师,在安省读的一年制研文。',
    follow: '大家都是这么说的 两个一年 能换 3 年',
    profileOnFollow: {},
  },
]

describe.skipIf(!LIVE)('追问:上一轮的内容记不记得住', () => {
  for (const s of SEQS) {
    it(s.name, async () => {
      const db = await getDb()
      const t1 = await consult({ db, text: s.first, lang: 'zh', profile: {}, history: [] })
      console.log(`\n【${s.name}】`)
      console.log(`  轮1 「${s.first}」 → noc=${t1.noc ?? '-'} 事实${t1.facts.length}`)
      const history: Turn[] = [
        { role: 'user', content: s.first },
        { role: 'assistant', content: t1.answer },
      ]
      const t2 = await consult({ db, text: s.follow, lang: 'zh', profile: s.profileOnFollow, history })
      console.log(`  轮2 「${s.follow}」 → noc=${t2.noc ?? '-'} 事实${t2.facts.length} 降级=${t2.degraded}`)
      console.log(`  → ${t2.answer.slice(0, 200).replace(/\n/g, ' ⏎ ')}`)
      console.log(`  ⇒ 职业带下来了吗:${t2.noc === t1.noc && t1.noc ? '是' : '否'}`)
    }, 300_000)
  }
})
