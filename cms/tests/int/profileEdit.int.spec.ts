/**
 * 「我的档案」批(2026-10-09)的判定件:城市区摆哪些城市、英文姓名合不合规、编辑模式主钮的字、
 * 档案取数把答案档洗成五格。金标 + 性质,不拍快照。
 * 2026-11-07 「我的」在 me 桶重写:进「我的求职」弹五题的判定 jobsQuizOpenOf 随「我的求职」归子桶 me/jobs,口径不变。
 * 同日 Frank「按 Azure 的改」:进页弹五题撤,换顶上「补全档案」提示条 —— 最后一条改验 fillTextOf(判空同一把尺 missingStepsOf)。
 * 同日 Frank「删了吧」:一题一屏的 GateEdit 删,只为它而在的判定件随之删 —— 主钮的字(editNextKeyOf)、这一回问哪几题
 * (editStepsOf)、「跳过这步」出不出(editBlankOf)、主钮灰不灰(gateNextOffOf)四样的用例一并撤;missingStepsOf、fillTextOf、
 * 城市区、英文姓名、档案取数、教育经历拆拼照验。
 *
 * @author Frank
 * @time 2026-10-09 23:50:00
 */
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { fillTextOf } from '@/components/me/jobs/functions'
import {
  cityOptsOf, eduPicksOf, eduStrsOf, missingStepsOf, nameBadOf,
} from '@/components/gate/functions'
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

describe('英文姓名', () => {
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
})

describe('档案取数:答案档 → 五格', () => {
  it('金标:jsonb 是对象或串都认;省市、目标、两份码清单照抄', () => {
    const basic = { goalBand: 2, majors: ['11.0701', '52.0201'], nocs: ['21220'], resProv: 'ON', resCity: 'Mississauga' }
    const want = {
      goal: 2, majors: ['11.0701', '52.0201'], nocs: ['21220'], prov: 'ON', abroad: false, city: 'Mississauga', asked: false,
      who: '', edu: [],
    }
    expect(toProfileBasic({ answers: { basic } })).toEqual(want)
    expect(toProfileBasic({ answers: JSON.stringify({ basic }) })).toEqual(want)
  })

  it('金标:在境外不算省市;没省不留城市;格缺 / 错型按没答;没存过档全空', () => {
    expect(toProfileBasic({ answers: { basic: { status: 'overseas', resProv: 'ON', resCity: 'Toronto' } } }))
      .toEqual({ goal: 0, majors: [], nocs: [], prov: '', abroad: true, city: '', asked: false, who: '', edu: [] })
    expect(toProfileBasic({ answers: { basic: { resCity: 'Toronto' } } }).city).toBe('')
    expect(toProfileBasic({ answers: { basic: { goalBand: null, majors: null, nocs: [7, '', '21220'] as unknown as string[] } } }))
      .toEqual({ goal: 0, majors: [], nocs: ['21220'], prov: '', abroad: false, city: '', asked: false, who: '', edu: [] })
    expect(toProfileBasic({ answers: null })).toEqual({ goal: 0, majors: [], nocs: [], prov: '', abroad: false, city: '', asked: false, who: '', edu: [] })
    expect(toProfileBasic({ answers: { basic: { jobsAsked: true } } }).asked).toBe(true)
  })
})

const FULL = {
  goal: 2, majors: ['11.0701'], nocs: ['21220'], prov: 'ON', abroad: false, city: 'Toronto', name: 'Li Wei', who: '', edu: [],
}
const EMPTY = { goal: 0, majors: [], nocs: [], prov: '', abroad: false, city: '', name: '', who: '', edu: [] }
const PF_FULL = {
  goal: 2, majors: [{ code: '11.0701', en: 'CS', zh: '', ko: '' }], nocs: [{ code: '21220', en: 'Dev', zh: '', ko: '' }],
  prov: 'ON', abroad: false, city: { code: '', en: 'Toronto', zh: '', ko: '' }, name: 'Li Wei', asked: false, who: '', edu: [],
}

describe('进我的求职先弹五题(2026-10-11)', () => {
  it('金标:都答了 → 没有空着的;全空 → 五题按原序;境外算答了所在地;姓名只有空白算没填', () => {
    expect(missingStepsOf(FULL)).toEqual([])
    expect(missingStepsOf(EMPTY)).toEqual(['goal', 'major', 'job', 'prov', 'name'])
    expect(missingStepsOf({ ...FULL, prov: '', abroad: true })).toEqual([])
    expect(missingStepsOf({ ...FULL, name: '   ', majors: [] })).toEqual(['major', 'name'])
    // 2026-10-13 身份、教育经历只在「修改」里问:没答也不算空着(老用户进「我的求职」不因加题再弹一次)
    expect(missingStepsOf({ ...FULL, who: '', edu: [] })).toEqual([])
  })

  it('金标(2026-11-07 补全提示条代替弹五题):档案没回来、都填了不出;空两样点名两样;空多于两样点名前两样再报总数', () => {
    const t = (k: string, v?: Record<string, string | number>) => (v == null ? k : k + JSON.stringify(v))
    expect(fillTextOf({ view: null, t })).toBe(null)
    expect(fillTextOf({ view: PF_FULL, t })).toBe(null)
    expect(fillTextOf({ view: { ...PF_FULL, name: '' }, t })).toBe('mj.fill{"fields":"pf.name"}')
    expect(fillTextOf({ view: { ...PF_FULL, name: '', goal: 0 }, t })).toBe('mj.fill{"fields":"pf.goalmj.fillSeppf.name"}')
    expect(fillTextOf({ view: { ...PF_FULL, name: '', goal: 0, prov: '', abroad: false }, t }))
      .toBe('mj.fillMore{"fields":"pf.goalmj.fillSeppf.where","n":3}')
    // 「这个账号弹过了」不再拦:提示条每次进页都按档案现状出(✕ 只管这一页)
    expect(fillTextOf({ view: { ...PF_FULL, name: '', asked: true }, t })).toBe('mj.fill{"fields":"pf.name"}')
  })
})

describe('档案加身份、教育经历(2026-10-13)', () => {
  const PROVS = ['ON', 'BC', 'abroad']
  const KINDS = ['public', 'private']
  const LENS = ['y1', 'y2', 'y3', 'master']
  const cell = (xs: string[]) => fc.oneof(fc.constant(''), fc.constantFrom(...xs))

  it('性质:存档串 → 几段 → 存档串原样回来;选了一半的段不存;界面总留一段', () => {
    fc.assert(fc.property(fc.array(fc.record({ prov: cell(PROVS), kind: cell(KINDS), len: cell(LENS) }), { maxLength: 2 }), (rows) => {
      const strs = eduStrsOf(rows)
      for (const s of strs) {
        expect(s.split('.')).toHaveLength(3)
        expect(s.split('.').includes('')).toBe(false)
      }
      expect(strs.length).toBe(rows.filter((r) => r.prov !== '' && r.kind !== '' && r.len !== '').length)
      expect(eduStrsOf(eduPicksOf(strs))).toEqual(strs)
      expect(eduPicksOf(strs).length).toBeGreaterThanOrEqual(1)
    }))
  })

  it('金标:格数不对的串按没有', () => {
    expect(eduPicksOf(['ON.public', 'bad', ''])).toEqual([{ prov: '', kind: '', len: '' }])
    expect(eduPicksOf(['ON.public.y1'])).toEqual([{ prov: 'ON', kind: 'public', len: 'y1' }])
  })

  it('金标:库里的身份、教育经历读得回来,错型按没答', () => {
    const basic = { goalBand: 2, fitWho: 'pgwp', fitEdu: ['ON.public.y1', 3] }
    const got = toProfileBasic({ answers: { basic } as never })
    expect(got.who).toBe('pgwp')
    expect(got.edu).toEqual(['ON.public.y1'])
    const bad = toProfileBasic({ answers: { basic: { fitWho: 5, fitEdu: 'x' } } as never })
    expect(bad.who).toBe('')
    expect(bad.edu).toEqual([])
  })
})
