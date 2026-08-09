// D4 修复回归(对话闭环总设计-20260809 §2):空态示例句三态选择。纯函数,不需要 DB/网络 ——
// 真人 33102 档案锚定案例见 docs/design/一键三合一判定-20260809.md §2(找工中/CLB 6/PGWP 剩 18 个月/目标省 BC)。
import { describe, expect, it } from 'vitest'
import { pickExamples, exampleKind, type ChatProfile } from '@/app/(frontend)/chat/chatExamples'
import { makeT } from '@/app/(frontend)/jobs/i18n'

const en = makeT('en')
const zh = makeT('zh')

describe('pickExamples —— 匿名档', () => {
  it('未登录:恒返回静态三句,任何 profile 都不改变(登录态才是唯一开关)', () => {
    const anon = pickExamples(false, null, en)
    expect(anon.map((x) => x.key)).toEqual(['chat.ex1', 'chat.ex2', 'chat.ex3'])
    expect(anon.every((x) => x.params === undefined)).toBe(true)
    const withProfile = pickExamples(false, { clb: 8, targetProvinces: ['BC'] }, en)
    expect(withProfile.map((x) => x.key)).toEqual(['chat.ex1', 'chat.ex2', 'chat.ex3'])
  })
})

describe('pickExamples —— 注册未建档', () => {
  it('已登录但 profile 为 null:退回边问边建档的三句静态示范', () => {
    expect(pickExamples(true, null, en).map((x) => x.key)).toEqual(['chat.ex.reg1', 'chat.ex.reg2', 'chat.ex.reg3'])
  })

  it('已登录但档案全空槽(现有字段都没填):没有一个候选可拼句,同样退回三句静态示范', () => {
    const empty: ChatProfile = { currentStatus: null, nocCodes: [], clb: null, crs: null, targetProvinces: [], pgwpMonthsLeft: null }
    expect(pickExamples(true, empty, en).map((x) => x.key)).toEqual(['chat.ex.reg1', 'chat.ex.reg2', 'chat.ex.reg3'])
  })
})

describe('pickExamples —— 已建档(真人 33102 案例:找工中/CLB 6/PGWP 剩 18 个月/目标省 BC)', () => {
  const anchor: ChatProfile = {
    currentStatus: 'jobhunting', nocCodes: ['33102'], clb: 6, crs: null, targetProvinces: ['BC'], pgwpMonthsLeft: 18,
  }

  it('三个槽都有值 → PGWP 倒计时 / 职业×目标省(单省问有没有戏) / CLB×目标省缺口,顺序对齐案例三句', () => {
    const items = pickExamples(true, anchor, en)
    expect(items.map((x) => x.key)).toEqual(['chat.ex.pgwp', 'chat.ex.occProv', 'chat.ex.clbProv'])
    // 🔴 三句全部织入职业名(编排层无档案读方向,句里无职业首轮必撞 noOcc)
    expect(items[0].params).toEqual({ title: 'PSW', noc: '33102', m: 18 })
    expect(items[1].params).toEqual({ noc: '33102', title: 'PSW', prov: 'British Columbia' })
    expect(items[2].params).toEqual({ title: 'PSW', noc: '33102', clb: 6, prov: 'British Columbia' })
    // 渲成句子也断言一遍(t 本身是确定性的字典查找,顺带锁住插值不漏参)
    expect(en(items[0].key, items[0].params)).toBe('I am a PSW (NOC 33102) with 18 months left on my PGWP — is there still time to make this work?')
    expect(en(items[1].key, items[1].params)).toBe('33102 (PSW) — does this have a shot in British Columbia?')
  })

  it('中文档同一份档案:职业名/省名走中文字典,不是英文残留', () => {
    const items = pickExamples(true, anchor, zh)
    expect(items[1].params).toEqual({ noc: '33102', title: '护理员', prov: '不列颠哥伦比亚' })
    expect(zh(items[1].key, items[1].params)).toBe('33102(护理员)在 不列颠哥伦比亚 有戏吗?')
  })

  it('目标省填了两个 → 职业候选换成两省比对句(occCmp),不是单省 occProv', () => {
    const items = pickExamples(true, { ...anchor, targetProvinces: ['BC', 'NS'] }, en)
    expect(items.map((x) => x.key)).toEqual(['chat.ex.pgwp', 'chat.ex.occCmp', 'chat.ex.clbProv'])
    expect(items[1].params).toEqual({ noc: '33102', title: 'PSW', prov: 'British Columbia', prov2: 'Nova Scotia' })
  })
})

describe('pickExamples —— 缺槽补位(不足 3 条候选时用②档句子补满)', () => {
  it('只有 PGWP 一个槽(无职业)→ 句里织不进职业必撞 noOcc,候选全跳过,退回三句静态示范', () => {
    const items = pickExamples(true, { pgwpMonthsLeft: 9 }, en)
    expect(items.map((x) => x.key)).toEqual(['chat.ex.reg1', 'chat.ex.reg2', 'chat.ex.reg3'])
  })

  it('有职业+PGWP 但无目标省 → 只有 PGWP 候选成句,后面用 reg1/reg2 补到 3 条', () => {
    const items = pickExamples(true, { nocCodes: ['33102'], pgwpMonthsLeft: 9 }, en)
    expect(items.map((x) => x.key)).toEqual(['chat.ex.pgwp', 'chat.ex.reg1', 'chat.ex.reg2'])
    expect(items[0].params).toEqual({ title: 'PSW', noc: '33102', m: 9 })
  })

  it('NOC 不在热门集里(查不到人话职业名)→ 三个候选全部跳过(句里无职业必撞 noOcc),退回静态示范', () => {
    const items = pickExamples(true, { nocCodes: ['99999'], targetProvinces: ['ON'], clb: 7 }, en)
    expect(items.map((x) => x.key)).toEqual(['chat.ex.reg1', 'chat.ex.reg2', 'chat.ex.reg3'])
  })

  it('职业候选与 CLB 候选都要目标省;没填目标省时两条都拼不出,全退回三句静态示范', () => {
    const items = pickExamples(true, { nocCodes: ['33102'], clb: 6 }, en)
    expect(items.map((x) => x.key)).toEqual(['chat.ex.reg1', 'chat.ex.reg2', 'chat.ex.reg3'])
  })
})

describe('exampleKind —— 埋点短标签', () => {
  it('取 key 最后一段,匿名/注册/档案三档都能识别', () => {
    expect(exampleKind('chat.ex1')).toBe('ex1')
    expect(exampleKind('chat.ex.reg2')).toBe('reg2')
    expect(exampleKind('chat.ex.occCmp')).toBe('occCmp')
  })
})
