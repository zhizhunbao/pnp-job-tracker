/**
 * 「我的档案」批(2026-10-09)的判定件:城市区摆哪些城市、英文姓名合不合规、编辑模式主钮的字、
 * 档案取数把答案档洗成五格。金标 + 性质,不拍快照。
 * 2026-11-07 「我的」在 me 桶重写:进「我的求职」弹五题的判定 jobsQuizOpenOf 随「我的求职」归子桶 me/jobs,口径不变。
 * 同日 Frank「按 Azure 的改」:进页弹五题撤,换顶上「补全档案」提示条 —— 最后一条改验 fillTextOf(判空同一把尺 missingStepsOf)。
 * 同日 Frank「删了吧」:一题一屏的 GateEdit 删,只为它而在的判定件随之删 —— 主钮的字(editNextKeyOf)、这一回问哪几题
 * (editStepsOf)、「跳过这步」出不出(editBlankOf)、主钮灰不灰(gateNextOffOf)四样的用例一并撤;missingStepsOf、fillTextOf、
 * 城市区、英文姓名、档案取数、教育经历拆拼照验。
 * 2026-11-12:匹配依据、匹配模式并成一只「匹配规则」下拉(四项 ↔ 两格的对照,表单与档案卡同一套);
 * 教育经历加明细 eduList(证书或学历名称、学校、起止年份):表单几段与明细互转、教育经历串由明细派生、
 * 档案取数没有明细时按老串现补、档案卡一条两行(年份名称都没有时第一行退回原先那一句)。
 *
 * @author Frank
 * @time 2026-10-09 23:50:00
 */
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { fillTextOf } from '@/components/me/jobs/functions'
import {
  cityOptsOf, eduFormRowsOf, eduListOf, eduPicksOf, eduStrsOf, makeRulePick, missingStepsOf, nameBadOf, ruleOf,
} from '@/components/gate/functions'
import { pfEduLinesOf, pfRuleKeyOf } from '@/components/me/profile/functions'
import { eduKeysOf, toProfileBasic } from '@/lib/quiz/functions'

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
      who: '', edu: [], eduList: [], workNocs: [], matchBy: '', matchMode: '', fromResume: [] }
    expect(toProfileBasic({ answers: { basic } })).toEqual(want)
    expect(toProfileBasic({ answers: JSON.stringify({ basic }) })).toEqual(want)
  })

  it('金标:在境外不算省市;没省不留城市;格缺 / 错型按没答;没存过档全空', () => {
    expect(toProfileBasic({ answers: { basic: { status: 'overseas', resProv: 'ON', resCity: 'Toronto' } } }))
      .toEqual({
        goal: 0, majors: [], nocs: [], prov: '', abroad: true, city: '', asked: false, who: '', edu: [], eduList: [],
        workNocs: [], matchBy: '', matchMode: '', fromResume: [],
      })
    expect(toProfileBasic({ answers: { basic: { resCity: 'Toronto' } } }).city).toBe('')
    expect(toProfileBasic({ answers: { basic: { goalBand: null, majors: null, nocs: [7, '', '21220'] as unknown as string[] } } }))
      .toEqual({
        goal: 0, majors: [], nocs: ['21220'], prov: '', abroad: false, city: '', asked: false, who: '', edu: [], eduList: [],
        workNocs: [], matchBy: '', matchMode: '', fromResume: [],
      })
    expect(toProfileBasic({ answers: null })).toEqual({
      goal: 0, majors: [], nocs: [], prov: '', abroad: false, city: '', asked: false, who: '', edu: [], eduList: [],
      workNocs: [], matchBy: '', matchMode: '', fromResume: [],
    })
    expect(toProfileBasic({ answers: { basic: { jobsAsked: true } } }).asked).toBe(true)
  })
})

const FULL = {
  goal: 2, majors: ['11.0701'], nocs: ['21220'], prov: 'ON', abroad: false, city: 'Toronto', name: 'Li Wei', who: 'student', edu: ['ON|public|y2'], eduList: [],
  workNocs: ['21220'], matchBy: '', matchMode: '', fromResume: [],
}
const EMPTY = {
  goal: 0, majors: [], nocs: [], prov: '', abroad: false, city: '', name: '', who: '', edu: [], eduList: [],
  workNocs: [], matchBy: '', matchMode: '', fromResume: [],
}
const PF_FULL = {
  goal: 2, majors: [{ code: '11.0701', en: 'CS', zh: '', ko: '' }], nocs: [{ code: '21220', en: 'Dev', zh: '', ko: '' }],
  prov: 'ON', abroad: false, city: { code: '', en: 'Toronto', zh: '', ko: '' }, name: 'Li Wei', asked: false, who: 'student',
  edu: ['ON|public|y2'], eduList: [], works: [{ code: '21220', en: 'Dev', zh: '', ko: '' }], matchBy: '', matchMode: '', fromResume: [],
}

describe('进我的求职先弹五题(2026-10-11)', () => {
  it('金标:都答了 → 没有空着的;全空 → 五题按原序;境外算答了所在地;姓名只有空白算没填', () => {
    expect(missingStepsOf(FULL)).toEqual([])
    expect(missingStepsOf(EMPTY)).toEqual(['goal', 'major', 'job', 'work', 'prov', 'name', 'who', 'edu'])
    expect(missingStepsOf({ ...FULL, prov: '', abroad: true })).toEqual([])
    expect(missingStepsOf({ ...FULL, name: '   ', majors: [] })).toEqual(['major', 'name'])
    // 2026-10-13 身份、教育经历只在「修改」里问:没答也不算空着(老用户进「我的求职」不因加题再弹一次)
    // 2026-11-08 清单第 3 条改判:进页弹题早撤了,身份和教育经历是推荐过滤的输入(151 人 0 人填),进「补全档案」提示条
    expect(missingStepsOf({ ...FULL, who: '', edu: [] })).toEqual(['who', 'edu'])
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
    fc.assert(fc.property(fc.array(fc.record({ prov: cell(PROVS), kind: cell(KINDS), len: cell(LENS), cred: fc.constant(''), school: fc.constant(''), from: fc.constant(''), to: fc.constant('') }), { maxLength: 2 }), (rows) => {
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
    expect(eduPicksOf(['ON.public', 'bad', ''])).toEqual([{ prov: '', kind: '', len: '', cred: '', school: '', from: '', to: '' }])
    expect(eduPicksOf(['ON.public.y1'])).toEqual([{ prov: 'ON', kind: 'public', len: 'y1', cred: '', school: '', from: '', to: '' }])
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

describe('匹配规则:一只下拉 ↔ 匹配依据、匹配模式两格(2026-11-12)', () => {
  // 下拉的四项:空值档 = 按做过的工作;存的还是两格
  const PAIRS = [
    { rule: '', key: 'pf.rule.work', matchBy: 'work', matchMode: 'default' },
    { rule: 'workStrict', key: 'pf.rule.workStrict', matchBy: 'work', matchMode: 'strict' },
    { rule: 'edu', key: 'pf.rule.edu', matchBy: 'edu', matchMode: 'default' },
    { rule: 'eduStrict', key: 'pf.rule.eduStrict', matchBy: 'edu', matchMode: 'strict' },
  ]

  it('金标:四项各落一对值;那一对值读回来还是那一项;档案卡出同一项的字', () => {
    for (const p of PAIRS) {
      const got = { matchBy: '?', matchMode: '?' }
      makeRulePick({ setMatchBy: (v) => { got.matchBy = v }, setMatchMode: (v) => { got.matchMode = v } })(p.rule)
      expect(got).toEqual({ matchBy: p.matchBy, matchMode: p.matchMode })
      expect(ruleOf(got)).toBe(p.rule)
      expect(pfRuleKeyOf(got)).toBe(p.key)
    }
  })

  it('金标:没选过(两格空串)按做过的工作、默认;只空一格的按另一格', () => {
    expect(ruleOf({ matchBy: '', matchMode: '' })).toBe('')
    expect(pfRuleKeyOf({ matchBy: '', matchMode: '' })).toBe('pf.rule.work')
    expect(ruleOf({ matchBy: '', matchMode: 'strict' })).toBe('workStrict')
    expect(pfRuleKeyOf({ matchBy: 'edu', matchMode: '' })).toBe('pf.rule.edu')
  })
})

describe('教育经历明细 eduList(2026-11-12)', () => {
  const t = (k: string) => k
  const BLANK = { prov: '', kind: '', len: '', cred: '', school: '', from: '', to: '' }

  it('金标:表单几段 → 明细;教育经历串 = 明细里不空的 key,按序(与原先只收三格选全的段同一个结果)', () => {
    const rows = [
      { prov: 'ON', kind: 'public', len: 'y1', cred: ' Graduate Certificate ', school: ' Algonquin College ', from: '2025', to: '2026' },
      { prov: 'BC', kind: '', len: '', cred: 'Bachelor of Engineering', school: '', from: '201', to: '' },
      BLANK,
      { ...BLANK, prov: 'QC', kind: 'private', len: 'y3' },
    ]
    const list = eduListOf(rows)
    expect(list).toEqual([
      { key: 'ON.public.y1', cred: 'Graduate Certificate', school: 'Algonquin College', from: '2025', to: '2026' },
      { key: '', cred: 'Bachelor of Engineering', school: '', from: '', to: '' },
      { key: 'QC.private.y3', cred: '', school: '', from: '', to: '' },
    ])
    expect(eduKeysOf(list)).toEqual(['ON.public.y1', 'QC.private.y3'])
    expect(eduKeysOf(list)).toEqual(eduStrsOf(rows))
  })

  it('金标:明细 → 表单几段(key 拆回三只下拉);没有明细按老的教育经历串起头、明细全空;都没有留一行空的', () => {
    expect(eduFormRowsOf({
      list: [
        { key: 'ON.public.y1', cred: 'Graduate Certificate', school: 'Algonquin College', from: '2025', to: '2026' },
        { key: '', cred: 'Bachelor of Engineering', school: '', from: '2014', to: '' },
      ],
      strs: ['BC.private.y2'],
    })).toEqual([
      { prov: 'ON', kind: 'public', len: 'y1', cred: 'Graduate Certificate', school: 'Algonquin College', from: '2025', to: '2026' },
      { ...BLANK, cred: 'Bachelor of Engineering', from: '2014' },
    ])
    expect(eduFormRowsOf({ list: [], strs: ['BC.private.y2'] })).toEqual([{ ...BLANK, prov: 'BC', kind: 'private', len: 'y2' }])
    expect(eduFormRowsOf({ list: [], strs: [] })).toEqual([BLANK])
  })

  it('金标(档案取数):有明细用明细(洗过);没有明细按老串现补、明细全空;老串那一格原样', () => {
    const item = { key: 'ON.public.y1', cred: 'Graduate Certificate', school: 'Algonquin College', from: '2025', to: '2026' }
    const got = toProfileBasic({ answers: { basic: { fitEdu: ['ON.public.y1'], eduList: [item, 'junk', { key: 'x' }] } } as never })
    expect(got.eduList).toEqual([item])
    expect(got.edu).toEqual(['ON.public.y1'])
    const old = toProfileBasic({ answers: { basic: { fitEdu: ['ON.public.y1', 'BC.private.y2'] } } })
    expect(old.edu).toEqual(['ON.public.y1', 'BC.private.y2'])
    expect(old.eduList).toEqual([
      { key: 'ON.public.y1', cred: '', school: '', from: '', to: '' },
      { key: 'BC.private.y2', cred: '', school: '', from: '', to: '' },
    ])
  })

  it('金标(档案卡):第一行年份 + 名称,第二行学校再接原先三个词(逗号连,不用中点)', () => {
    const lines = pfEduLinesOf({
      t,
      list: [
        { key: 'ON.public.y1', cred: 'Graduate Certificate', school: 'Algonquin College', from: '2025', to: '2026' },
        { key: '', cred: 'Bachelor of Engineering', school: 'Wuhan University', from: '2014', to: '' },
        { key: '', cred: 'Diploma', school: '', from: '', to: '2010' },
        { key: 'abroad.private.master', cred: '', school: '', from: '2001', to: '2003' },
      ],
    })
    expect(lines).toEqual([
      { main: ['2025 – 2026', 'Graduate Certificate'], sub: 'Algonquin College, pr.ON, fit.kind.public, fit.len.y1' },
      { main: ['2014 –', 'Bachelor of Engineering'], sub: 'Wuhan University' },
      { main: ['2010', 'Diploma'], sub: '' },
      { main: ['2001 – 2003'], sub: 'gate.abroad, fit.kind.private, fit.len.master' },
    ])
    expect(JSON.stringify(lines)).not.toContain('·')
  })

  it('金标(档案卡退回):年份和名称都没有 → 第一行是原先那一句,第二行只剩学校、不重复那三个词;只有学校时学校上第一行', () => {
    expect(pfEduLinesOf({ t, list: [{ key: 'ON.public.y1', cred: '', school: '', from: '', to: '' }] }))
      .toEqual([{ main: ['pr.ON, fit.kind.public, fit.len.y1'], sub: '' }])
    expect(pfEduLinesOf({ t, list: [{ key: 'BC.private.y2', cred: '', school: 'Langara College', from: '', to: '' }] }))
      .toEqual([{ main: ['pr.BC, fit.kind.private, fit.len.y2'], sub: 'Langara College' }])
    expect(pfEduLinesOf({ t, list: [{ key: '', cred: '', school: 'Langara College', from: '', to: '' }] }))
      .toEqual([{ main: ['Langara College'], sub: '' }])
  })
})
