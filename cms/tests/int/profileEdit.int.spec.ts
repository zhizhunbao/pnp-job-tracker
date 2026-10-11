/**
 * 「我的档案」批(2026-10-09)的判定件:城市区摆哪些城市、英文姓名合不合规、编辑模式主钮的字、
 * 档案取数把答案档洗成五格。金标 + 性质,不拍快照。
 *
 * @author Frank
 * @time 2026-10-09 23:50:00
 */
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { jobsQuizOpenOf } from '@/components/account/functions'
import { cityOptsOf, editBlankOf, editNextKeyOf, editStepsOf, missingStepsOf, nameBadOf } from '@/components/gate/functions'
import { toProfileBasic } from '@/lib/quiz/functions'

const ROW = (name: string, zh = '', ko = '', jobs = 1) => ({ name, zh, ko, jobs })
const ON = [
  ROW('Toronto', '多伦多', '토론토', 900), ROW('Mississauga', '密西沙加', '', 400), ROW('Brampton', '宾顿', '', 300),
  ROW('Ottawa', '渥太华', '오타와', 280), ROW('Hamilton', '', '', 200), ROW('London', '伦敦', '', 150),
  ROW('Markham', '万锦', '', 140), ROW('Vaughan', '旺市', '', 130), ROW('Kitchener', '基奇纳', '', 120),
  ROW('Windsor', '温莎', '', 110), ROW('Oakville', '奥克维尔', '', 100), ROW('Burlington', '伯灵顿', '', 90),
  ROW('Barrie', '巴里', '', 80), ROW('Guelph', '圭尔夫', '', 70), ROW('Beachburg', '', '', 1),
]

describe('城市区摆哪些城市', () => {
  it('金标:没搜摆在招最多的前 12 个(保序);中文界面有译名用译名、没有用英文;韩文同理', () => {
    const zh = cityOptsOf({ all: ON, q: '', lang: 'zh' })
    expect(zh.map((c) => c.name)).toEqual(ON.slice(0, 12).map((c) => c.name))
    expect(zh[0]).toEqual({ name: 'Toronto', label: '多伦多' })
    expect(zh[4]).toEqual({ name: 'Hamilton', label: 'Hamilton' })
    expect(cityOptsOf({ all: ON, q: '', lang: 'ko' })[0]).toEqual({ name: 'Toronto', label: '토론토' })
    expect(cityOptsOf({ all: ON, q: '', lang: 'ko' })[1]).toEqual({ name: 'Mississauga', label: 'Mississauga' })
    expect(cityOptsOf({ all: ON, q: '', lang: 'en' })[0]).toEqual({ name: 'Toronto', label: 'Toronto' })
  })

  it('金标:搜英文名或界面语译名都找得到(不分大小写、去首尾空白);热门外的小地方也搜得到', () => {
    expect(cityOptsOf({ all: ON, q: '密西', lang: 'zh' }).map((c) => c.name)).toEqual(['Mississauga'])
    expect(cityOptsOf({ all: ON, q: ' MISSI ', lang: 'zh' }).map((c) => c.name)).toEqual(['Mississauga'])
    expect(cityOptsOf({ all: ON, q: 'beach', lang: 'zh' }).map((c) => c.name)).toEqual(['Beachburg'])
    expect(cityOptsOf({ all: ON, q: '没有这个城', lang: 'zh' })).toEqual([])
    expect(cityOptsOf({ all: [], q: '', lang: 'zh' })).toEqual([])
  })

  it('性质:没搜至多 12 个、搜了至多 24 个;摆出来的都在本省清单里且不重复', () => {
    const name = fc.stringMatching(/^[A-Z][a-z]{2,8}$/)
    fc.assert(fc.property(fc.uniqueArray(name, { maxLength: 60 }), fc.constantFrom('', 'a', 'e', 'on'), (names, q) => {
      const all = names.map((n) => ROW(n))
      const out = cityOptsOf({ all, q, lang: 'zh' })
      expect(out.length).toBeLessThanOrEqual(q === '' ? 12 : 24)
      const seen = new Set<string>()
      for (const c of out) {
        expect(names).toContain(c.name)
        expect(seen.has(c.name)).toBe(false)
        seen.add(c.name)
      }
    }))
  })
})

describe('英文姓名与主钮', () => {
  it('金标:没填不算不合规(选填);合规的英文名过;中文、数字、单个字母、超长不过;首尾空白不算', () => {
    expect(nameBadOf('')).toBe(false)
    expect(nameBadOf('   ')).toBe(false)
    expect(nameBadOf('Li Wei')).toBe(false)
    expect(nameBadOf("  Mary-Jane O'Neil ")).toBe(false)
    expect(nameBadOf('李伟')).toBe(true)
    expect(nameBadOf('Li Wei 2')).toBe(true)
    expect(nameBadOf('L')).toBe(true)
    expect(nameBadOf('a'.repeat(61))).toBe(true)
  })

  it('金标:编辑模式五题,前四题主钮「下一步」,最后一题「保存」', () => {
    expect([0, 1, 2, 3].map((step) => editNextKeyOf({ step, total: 5 }))).toEqual(['ob.next', 'ob.next', 'ob.next', 'ob.next'])
    expect(editNextKeyOf({ step: 4, total: 5 })).toBe('gate.save')
  })

  it('金标(2026-10-11):只问两题时第 2 题就是「保存」;只问一题第 1 题就是「保存」', () => {
    expect(editNextKeyOf({ step: 0, total: 2 })).toBe('ob.next')
    expect(editNextKeyOf({ step: 1, total: 2 })).toBe('gate.save')
    expect(editNextKeyOf({ step: 0, total: 1 })).toBe('gate.save')
  })
})

describe('档案取数:答案档 → 五格', () => {
  it('金标:jsonb 是对象或串都认;省市、目标、两份码清单照抄', () => {
    const basic = { goalBand: 2, majors: ['11.0701', '52.0201'], nocs: ['21220'], resProv: 'ON', resCity: 'Mississauga' }
    const want = { goal: 2, majors: ['11.0701', '52.0201'], nocs: ['21220'], prov: 'ON', abroad: false, city: 'Mississauga', asked: false }
    expect(toProfileBasic({ answers: { basic } })).toEqual(want)
    expect(toProfileBasic({ answers: JSON.stringify({ basic }) })).toEqual(want)
  })

  it('金标:在境外不算省市;没省不留城市;格缺 / 错型按没答;没存过档全空', () => {
    expect(toProfileBasic({ answers: { basic: { status: 'overseas', resProv: 'ON', resCity: 'Toronto' } } }))
      .toEqual({ goal: 0, majors: [], nocs: [], prov: '', abroad: true, city: '', asked: false })
    expect(toProfileBasic({ answers: { basic: { resCity: 'Toronto' } } }).city).toBe('')
    expect(toProfileBasic({ answers: { basic: { goalBand: null, majors: null, nocs: [7, '', '21220'] as unknown as string[] } } }))
      .toEqual({ goal: 0, majors: [], nocs: ['21220'], prov: '', abroad: false, city: '', asked: false })
    expect(toProfileBasic({ answers: null })).toEqual({ goal: 0, majors: [], nocs: [], prov: '', abroad: false, city: '', asked: false })
    expect(toProfileBasic({ answers: { basic: { jobsAsked: true } } }).asked).toBe(true)
  })
})

const FULL = { goal: 2, majors: ['11.0701'], nocs: ['21220'], prov: 'ON', abroad: false, city: 'Toronto', name: 'Li Wei' }
const EMPTY = { goal: 0, majors: [], nocs: [], prov: '', abroad: false, city: '', name: '' }
const PF_FULL = {
  goal: 2, majors: [{ code: '11.0701', en: 'CS', zh: '', ko: '' }], nocs: [{ code: '21220', en: 'Dev', zh: '', ko: '' }],
  prov: 'ON', abroad: false, city: { code: '', en: 'Toronto', zh: '', ko: '' }, name: 'Li Wei', asked: false,
}

describe('进我的求职先弹五题(2026-10-11)', () => {
  it('金标:都答了 → 没有空着的;全空 → 五题按原序;境外算答了所在地;姓名只有空白算没填', () => {
    expect(missingStepsOf(FULL)).toEqual([])
    expect(missingStepsOf(EMPTY)).toEqual(['goal', 'major', 'job', 'prov', 'name'])
    expect(missingStepsOf({ ...FULL, prov: '', abroad: true })).toEqual([])
    expect(missingStepsOf({ ...FULL, name: '   ', majors: [] })).toEqual(['major', 'name'])
  })

  it('性质:missing 弹法只排空着的题且保序;不 missing 恒五题', () => {
    const ALL = ['goal', 'major', 'job', 'prov', 'name']
    fc.assert(fc.property(fc.boolean(), fc.boolean(), fc.boolean(), fc.boolean(), fc.boolean(), (g, m, j, p, n) => {
      const seed = {
        goal: g ? 1 : 0, majors: m ? ['11.0701'] : [], nocs: j ? ['21220'] : [], prov: p ? 'BC' : '', abroad: false, city: '',
        name: n ? 'Ann Lee' : '',
      }
      const steps = editStepsOf({ seed, missing: true })
      const want = ALL.filter((_, i) => [g, m, j, p, n][i] === false)
      expect(steps).toEqual(want)
      expect(editStepsOf({ seed, missing: false })).toEqual(ALL)
    }))
  })

  it('金标:「跳过这步」只在这一题空着时出', () => {
    const v = { goal: 0, majors: [], nocs: [], provActive: '', name: '' }
    expect(editBlankOf({ ...v, cur: 'goal' })).toBe(true)
    expect(editBlankOf({ ...v, cur: 'goal', goal: 1 })).toBe(false)
    expect(editBlankOf({ ...v, cur: 'major' })).toBe(true)
    expect(editBlankOf({ ...v, cur: 'major', majors: ['11.0701'] })).toBe(false)
    expect(editBlankOf({ ...v, cur: 'prov', provActive: 'ON' })).toBe(false)
    expect(editBlankOf({ ...v, cur: 'name', name: '  ' })).toBe(true)
    expect(editBlankOf({ ...v, cur: 'name', name: 'Li' })).toBe(false)
  })

  it('金标:只在有空着的、没弹过、这一页没关过时弹 —— 一人一次', () => {
    expect(jobsQuizOpenOf({ view: null, closed: false })).toBe(false)
    expect(jobsQuizOpenOf({ view: PF_FULL, closed: false })).toBe(false)
    const noName = { ...PF_FULL, name: '' }
    expect(jobsQuizOpenOf({ view: noName, closed: false })).toBe(true)
    expect(jobsQuizOpenOf({ view: noName, closed: true })).toBe(false)
    expect(jobsQuizOpenOf({ view: { ...noName, asked: true }, closed: false })).toBe(false)
  })
})
