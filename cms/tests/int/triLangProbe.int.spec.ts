// 临时探针(**不是回归测试,选完模型就删**):同一个问题、同一个库,**三种语言各问一遍**。
//
// 🔴 为什么单独一个:`piLoopProbe` 五条全是中文,而这个站是三语的,88% 流量是英文。
// 拿中文选出来的模型,英文可能啰嗦、韩文可能直接串成中文 —— 选型的判据不能只有一门语言。
//
// 量的四件,每一件都是**看得见的形状**,不靠人打分:
//   ① 答没答出来(长度 > 0、没抛错);
//   ② **语种对不对** —— 中文答复里不许有韩文字,韩文答复里不许有中文字(英文里两者都不许);
//   ③ 事实条数与工具次数(能不能真查到);
//   ④ 耗时。
//
// 跑法(默认跳过,不让全量 vitest 依赖那台盒子):
//   CHAT_LLM_BASE=http://192.168.1.150:11434 CHAT_LLM_MODEL=<tag> CHAT_LLM_KEY= \
//     npx vitest run tests/int/triLangProbe.int.spec.ts
import { describe, expect, it } from 'vitest'
import { getDb } from '@/lib/db/database'
import { consult } from '@/lib/consult/server'
import type { Profile } from '@/lib/consult'

const LIVE = Boolean(process.env.CHAT_LLM_BASE)
const MODEL = process.env.CHAT_LLM_MODEL ?? '(默认)'

// 韩文音节块;中文汉字(去掉日文假名段,韩文里不会出现汉字词以外的汉字)
const HANGUL = /[가-힯]/
const HANZI = /[一-鿿]/

type Ask = { lang: 'zh' | 'en' | 'ko'; text: string; profile?: Profile }

// 同一个问题的三语版本 —— 问的是同一件事,答案该是同一批事实。
const ASKS: Ask[] = [
  { lang: 'zh', text: '我是木匠,BC 省提名对我有什么要求?', profile: { provs: ['BC'] } },
  { lang: 'en', text: 'I am a carpenter. What does the BC provincial nomination require of me?', profile: { provs: ['BC'] } },
  { lang: 'ko', text: '저는 목수입니다. BC주 주정부 이민은 저에게 어떤 조건을 요구하나요?', profile: { provs: ['BC'] } },
  { lang: 'zh', text: '我是护士,安省有岗位吗?', profile: { provs: ['ON'] } },
  { lang: 'en', text: 'I am a nurse. Are there any jobs in Ontario?', profile: { provs: ['ON'] } },
  { lang: 'ko', text: '저는 간호사입니다. 온타리오에 일자리가 있나요?', profile: { provs: ['ON'] } },
]

describe.skipIf(!LIVE)(`三语横评(${MODEL})`, () => {
  for (const a of ASKS) {
    it(`${a.lang} · ${a.text.slice(0, 22)}`, async () => {
      const db = await getDb()
      const steps: string[] = []
      const t0 = Date.now()
      const r = await consult({
        db, text: a.text, lang: a.lang, profile: a.profile ?? {}, history: [],
        onStep: (s: string) => { steps.push(s.slice(0, 24)) },
      })
      const secs = ((Date.now() - t0) / 1000).toFixed(1)

      // 语种纯度:两种字都查,免得「韩文问、中文答」这种串语被人眼漏掉
      const hangul = HANGUL.test(r.answer)
      const hanzi = HANZI.test(r.answer)
      const wrong = a.lang === 'zh' ? hangul : a.lang === 'ko' ? hanzi : (hangul || hanzi)

      console.log(`\n${'='.repeat(70)}\n[${a.lang}] ${a.text}`)
      console.log(
        `用时 ${secs}s | 工具 ${steps.length} 次 | 事实 ${r.facts.length} 条 | noc=${r.noc ?? '-'}`
        + ` | 降级=${r.degraded} | 串语=${wrong ? '⚠️ 是' : '否'}`,
      )
      console.log(`答: ${r.answer.slice(0, 400)}`)

      expect(r.answer.length).toBeGreaterThan(0)
    }, 180_000)
  }
})
