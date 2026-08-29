// D4 修复回归(对话闭环总设计-20260809 §2):空态示例句三态选择。纯函数,不需要 DB/网络 ——
// 真人 33102 档案锚定案例见 docs/design/一键三合一判定-20260809.md §2(找工中/CLB 6/PGWP 剩 18 个月/目标省 BC)。
import { describe, expect, it } from 'vitest'
import { pickExamples, profileMemories, exampleKind, type ChatProfile } from '@/components/chat'
import { makeT } from '@/lib/i18n'

// literalNoc 原是 lib/chat/slots 的正则(2026-08-21 旧域整删,测试本地内联):
// 「NOC 字样打头的五位码」—— 模板句必须带 NOC 前缀,裸码开头曾被抽槽模型抄错(生产实撞 31102)。
// 新链没有抽槽层,但这条守的是**前端模板的形状**,与链无关,留着。
const NOC_IN_TEXT = /(?:^|[^0-9])NOC\s*[:：#]?\s*(\d{5})(?![0-9])/i
const literalNoc = (text: string): string | null => NOC_IN_TEXT.exec(text || '')?.[1] ?? null

const en = makeT('en')
const zh = makeT('zh')

describe('pickExamples —— 匿名档', () => {
  it('未登录:恒返回静态三句,任何 profile 都不改变(登录态才是唯一开关)', () => {
    const anon = pickExamples({ loggedIn: false, profile: null, t: en })
    expect(anon.map((x) => x.key)).toEqual(['chat.ex1', 'chat.ex2', 'chat.ex3'])
    expect(anon.every((x) => x.params === undefined)).toBe(true)
    const withProfile = pickExamples({ loggedIn: false, profile: { clb: 8, targetProvinces: ['BC'] }, t: en })
    expect(withProfile.map((x) => x.key)).toEqual(['chat.ex1', 'chat.ex2', 'chat.ex3'])
  })
})

describe('pickExamples —— 注册未建档', () => {
  it('已登录但 profile 为 null:退回边问边建档的三句静态示范', () => {
    expect(pickExamples({ loggedIn: true, profile: null, t: en }).map((x) => x.key)).toEqual(['chat.ex.reg1', 'chat.ex.reg2', 'chat.ex.reg3'])
  })

  it('已登录但档案全空槽(现有字段都没填):没有一个候选可拼句,同样退回三句静态示范', () => {
    const empty: ChatProfile = { currentStatus: null, nocCodes: [], clb: null, crs: null, targetProvinces: [], pgwpMonthsLeft: null }
    expect(pickExamples({ loggedIn: true, profile: empty, t: en }).map((x) => x.key)).toEqual(['chat.ex.reg1', 'chat.ex.reg2', 'chat.ex.reg3'])
  })
})

describe('pickExamples —— 已建档(真人 33102 案例:找工中/CLB 6/PGWP 剩 18 个月/目标省 BC)', () => {
  const anchor: ChatProfile = {
    currentStatus: 'jobhunting', nocCodes: ['33102'], clb: 6, crs: null, targetProvinces: ['BC'], pgwpMonthsLeft: 18,
  }

  it('三个槽都有值 → PGWP 倒计时 / 职业×目标省(单省问有没有戏) / CLB×目标省缺口,顺序对齐案例三句', () => {
    const items = pickExamples({ loggedIn: true, profile: anchor, t: en })
    expect(items.map((x) => x.key)).toEqual(['chat.ex.pgwp', 'chat.ex.occProv', 'chat.ex.clbProv'])
    // 🔴 三句全部织入职业名(编排层无档案读方向,句里无职业首轮必撞 noOcc)
    expect(items[0]?.params).toEqual({ title: 'PSW', noc: '33102', m: 18 })
    expect(items[1]?.params).toEqual({ noc: '33102', title: 'PSW', prov: 'British Columbia' })
    expect(items[2]?.params).toEqual({ title: 'PSW', noc: '33102', clb: 6, prov: 'British Columbia' })
    // 渲成句子也断言一遍(t 本身是确定性的字典查找,顺带锁住插值不漏参)
    expect(en(items[0]?.key ?? '', items[0]?.params)).toBe('I am a PSW (NOC 33102) with 18 months left on my PGWP — is there still time to make this work?')
    // 🔴 occProv/occCmp 必须带「NOC 」前缀:literalNoc(NOC_IN_TEXT)只认 NOC 字样打头的五位码,
    //    裸码开头曾在生产被抽槽模型抄成 31102(2026-08-09 终验实撞),整份回答前提全错。
    expect(en(items[1]?.key ?? '', items[1]?.params)).toBe('NOC 33102 (PSW) — does this have a shot in British Columbia?')
  })

  it('③档带码的句子渲出来必须被 literalNoc 接住(三语)——裸码开头模型会抄错(生产实撞 31102)', () => {
    for (const T of [en, zh, makeT('ko')]) {
      const items = pickExamples({ loggedIn: true, profile: anchor, t: T })
      for (const it2 of items) {
        const sent = T(it2.key, it2.params)
        if (/\d{5}/.test(sent)) expect(literalNoc(sent), sent).toBe('33102')
      }
    }
  })

  it('中文档同一份档案:职业名/省名走中文字典,不是英文残留', () => {
    const items = pickExamples({ loggedIn: true, profile: anchor, t: zh })
    expect(items[1]?.params).toEqual({ noc: '33102', title: '护理员', prov: '不列颠哥伦比亚' })
    expect(zh(items[1]?.key ?? '', items[1]?.params)).toBe('NOC 33102(护理员)在 不列颠哥伦比亚 有戏吗?')
  })

  it('目标省填了两个 → 职业候选换成两省比对句(occCmp),不是单省 occProv', () => {
    const items = pickExamples({ loggedIn: true, profile: { ...anchor, targetProvinces: ['BC', 'NS'] }, t: en })
    expect(items.map((x) => x.key)).toEqual(['chat.ex.pgwp', 'chat.ex.occCmp', 'chat.ex.clbProv'])
    expect(items[1]?.params).toEqual({ noc: '33102', title: 'PSW', prov: 'British Columbia', prov2: 'Nova Scotia' })
  })
})

describe('pickExamples —— 缺槽补位(不足 3 条候选时用②档句子补满)', () => {
  it('只有 PGWP 一个槽(无职业)→ 句里织不进职业必撞 noOcc,候选全跳过,退回三句静态示范', () => {
    const items = pickExamples({ loggedIn: true, profile: { pgwpMonthsLeft: 9 }, t: en })
    expect(items.map((x) => x.key)).toEqual(['chat.ex.reg1', 'chat.ex.reg2', 'chat.ex.reg3'])
  })

  it('有职业+PGWP 但无目标省 → 只有 PGWP 候选成句,后面用 reg1/reg2 补到 3 条', () => {
    const items = pickExamples({ loggedIn: true, profile: { nocCodes: ['33102'], pgwpMonthsLeft: 9 }, t: en })
    expect(items.map((x) => x.key)).toEqual(['chat.ex.pgwp', 'chat.ex.reg1', 'chat.ex.reg2'])
    expect(items[0]?.params).toEqual({ title: 'PSW', noc: '33102', m: 9 })
  })

  it('NOC 不在热门集里(查不到人话职业名)→ 三个候选全部跳过(句里无职业必撞 noOcc),退回静态示范', () => {
    const items = pickExamples({ loggedIn: true, profile: { nocCodes: ['99999'], targetProvinces: ['ON'], clb: 7 }, t: en })
    expect(items.map((x) => x.key)).toEqual(['chat.ex.reg1', 'chat.ex.reg2', 'chat.ex.reg3'])
  })

  it('职业候选与 CLB 候选都要目标省;没填目标省时两条都拼不出,全退回三句静态示范', () => {
    const items = pickExamples({ loggedIn: true, profile: { nocCodes: ['33102'], clb: 6 }, t: en })
    expect(items.map((x) => x.key)).toEqual(['chat.ex.reg1', 'chat.ex.reg2', 'chat.ex.reg3'])
  })
})

describe('exampleKind —— 埋点短标签', () => {
  it('取 key 最后一段,匿名/注册/档案三档都能识别', () => {
    expect(exampleKind({ key: 'chat.ex1' })).toBe('ex1')
    expect(exampleKind({ key: 'chat.ex.reg2' })).toBe('reg2')
    expect(exampleKind({ key: 'chat.ex.occCmp' })).toBe('occCmp')
  })
})

describe('profileMemories —— Activity 只展示真正保存的长期记忆', () => {
  const anchor: ChatProfile = {
    currentStatus: 'jobhunting', nocCodes: ['33102'], clb: 6, crs: 451,
    targetProvinces: ['BC', 'NS'], pgwpMonthsLeft: 18,
  }

  it('匿名即使拿到 profile 形状也不展示，不能把临时上下文冒充长期记忆', () => {
    expect(profileMemories({ loggedIn: false, profile: anchor, t: zh })).toEqual([])
  })

  it('登录档案逐项转成人话，职业和省份复用现有字典', () => {
    expect(profileMemories({ loggedIn: true, profile: anchor, t: zh })).toEqual([
      '目前情况：在加拿大找工作',
      '职业：护理员 (NOC 33102)',
      '语言：CLB 6',
      'EE 分数：CRS 451',
      '目标省：不列颠哥伦比亚、新斯科舍',
      '工签：PGWP 还剩 18 个月',
    ])
  })

  it('热门集外 NOC 只显示官方码，不猜职业名', () => {
    expect(profileMemories({ loggedIn: true, profile: { nocCodes: ['99999'] }, t: en })).toEqual(['Occupation: NOC 99999'])
  })
})
