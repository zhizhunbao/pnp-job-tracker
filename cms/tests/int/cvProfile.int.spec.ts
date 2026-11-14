// @vitest-environment node
// 用档案生成简历(2026-11-12;答案档 cv 一格的清洗、档案表单「做过的工作」几段、lib/tailor/profile 的纯函数、现代款 PDF)。
// 性质:① 答案档 cv 一格过信任边界:非对象给全空、职业码只留五位数字、年月不合形清空、全空的段丢、模板只认两个值;
//       ② 表单几段:老档案只有职业码时一码一段;存档丢全空的段、年月不合形不存;职业码由各段汇出且不重复;
//       ③ 选职业:新点上的码整份替掉这一段原来的并关框;点掉已选的 = 这一段不挂职业、框不关;别的段不动;
//       ④ 生成草稿:段数与起止年月只取档案里的(模型多回的不要、少回的照档案出);模型没写的格退回档案原字;
//          结束空着的工作经历算至今;非西文字符清掉、弯引号换直引号;
//       ⑤ 记账号是负的八位日期(同一天同号);档案缺姓名或两样经历都没有 = 不够生成;
//       ⑥ 现代款 PDF 画得出,抽回的文字与传统款相同(只多颜色与色条)。
// 探针:toCvWork 不判码形 → ① 红;workListOf 不丢空段 → ② 红;makeWorkOcc 用 next 不用 fresh → ③ 红;
//       profileDraftOf 按模型段数出 → ④ 红;profileRefOf 去掉负号 → ⑤ 红。
import * as PdfLib from 'pdf-lib'
import { PDFParse } from 'pdf-parse'
import { describe, expect, it } from 'vitest'

import {
  makeWorkOcc, workFilledOf, workFormRowsOf, workLinesOf, workListOf, workNocsOf,
} from '@/components/gate/work/functions'
import type { WorkPick } from '@/components/gate/work/types'
import { eduFormRowsOf, eduMajorsOf, eduWithMajorsOf } from '@/components/gate/edu/functions'
import { makeSchoolPickOf, makeSchoolTypeOf, schoolQOf, schoolSubOf } from '@/components/gate/school/functions'
import { seedOf } from '@/components/gate/seed/functions'
import { cvLayoutOf, cvModernPdfOf, cvPdfOf, toCvDraft } from '@/lib/cv/functions'
import { toCvFacts, toEduList, toSchoolHit, toStoredBasic } from '@/lib/quiz/functions'
import {
  isProfileReady, latinOf, profileDraftOf, profileFactsOf, profileRefOf, profileSchemaOf, toProfileOut,
} from '@/lib/tailor/profile/functions'
import type { ProfileFacts, ProfileSrc } from '@/lib/tailor/profile/types'

function seg(over: Partial<WorkPick>): WorkPick {
  return { nocs: [], title: '', org: '', city: '', from: '', to: '', desc: '', ...over }
}

function src(over: Partial<ProfileSrc>): ProfileSrc {
  return {
    name: 'Li Wei', prov: 'ON', city: { code: '', en: 'Ottawa' }, majors: [{ code: '11.07', en: 'Computer Science' }],
    works: [{ code: '63200', en: 'Cooks' }], eduList: [{ cred: 'Diploma', school: 'Algonquin College', from: '2020', to: '2022' }],
    cv: {
      work: [seg({ nocs: ['63200'], title: '', org: '北京饭店', city: 'Beijing', from: '2021-03', to: '', desc: '负责热菜,每天 200 份' })],
      phone: '613-555-0100', link: 'linkedin.com/in/liwei', skills: 'Wok\n粤语',
    },
    ...over,
  }
}

async function textOf(bytes: Uint8Array): Promise<string> {
  return (await new PDFParse({ data: new Uint8Array(bytes) }).getText()).text
}

describe('① 答案档 cv 一格的清洗', () => {
  it('非对象给全空;模板只认两个值', () => {
    expect(toCvFacts('x')).toEqual({ work: [], phone: '', link: '', skills: '', tpl: 'classic' })
    expect(toCvFacts({ tpl: 'modern' }).tpl).toBe('modern')
    expect(toCvFacts({ tpl: 'fancy' }).tpl).toBe('classic')
  })

  it('职业码只留五位数字、年月不合形清空、全空的段丢、超过上限的段不要', () => {
    const got = toCvFacts({
      work: [
        { nocs: ['63200', 'abc', 7], title: ' Cook ', org: 'A', city: 'B', from: '2021-13', to: '2023', desc: 'd' },
        { nocs: [], title: '', org: '', city: '', from: 'x', to: '', desc: '' },
        'junk',
      ],
      phone: 5,
    })
    expect(got.work).toEqual([{ nocs: ['63200'], title: 'Cook', org: 'A', city: 'B', from: '', to: '2023', desc: 'd' }])
    expect(got.phone).toBe('')
    const many = toCvFacts({ work: Array.from({ length: 12 }, () => ({ title: 't' })) })
    expect(many.work).toHaveLength(8)
  })

  it('服务端收答案:cv 一格洗过才落,别的格不动', () => {
    const got = toStoredBasic({ goalBand: 2, cv: { work: [{ title: 'Cook', evil: 1 }], phone: ' 1 ', hack: true } }) as Record<string, unknown>
    expect(got.goalBand).toBe(2)
    expect(got.cv).toEqual({
      work: [{ nocs: [], title: 'Cook', org: '', city: '', from: '', to: '', desc: '' }], phone: '1', link: '', skills: '', tpl: 'classic',
    })
  })
})

describe('② 表单「做过的工作」几段', () => {
  it('老档案只有职业码:一码一段;什么都没有给一个空段', () => {
    expect(workFormRowsOf({ list: [], nocs: ['63200', '65201'] }).map((r) => r.nocs)).toEqual([['63200'], ['65201']])
    expect(workFormRowsOf({ list: [], nocs: [] })).toEqual([seg({})])
    expect(workFormRowsOf({ list: [seg({ title: 'Cook' })], nocs: ['63200'] })).toEqual([seg({ title: 'Cook' })])
  })

  it('存档:丢全空的段、年月不合形不存、各格去空白;职业码汇出不重复', () => {
    const rows = [seg({ nocs: ['63200'], title: ' Cook ', from: '2021-3', to: '2022-05' }), seg({}), seg({ nocs: ['63200', '65201'] })]
    expect(workListOf(rows)).toEqual([seg({ nocs: ['63200'], title: 'Cook', from: '', to: '2022-05' }), seg({ nocs: ['63200', '65201'] })])
    expect(workNocsOf(rows)).toEqual(['63200', '65201'])
  })
})

describe('②b 从简历填写工作经历', () => {
  const job = seg({ nocs: ['63200'], title: 'Line Cook', org: 'Bassi', from: '2021-03', desc: 'Prepared 200 dishes' })

  it('用户填过任何一格明细:一格不动', () => {
    const rows = [seg({ nocs: ['65201'], org: 'Mine' })]
    expect(workFilledOf({ rows, jobs: [job], codes: ['63200'] })).toEqual({ rows, filled: false, codes: [] })
  })

  it('没填过明细:用提取到的几段;原来只挂了别的职业的段接在后面,同一个职业的不重复', () => {
    const rows = [seg({ nocs: ['63200'] }), seg({ nocs: ['65201'] }), seg({})]
    const got = workFilledOf({ rows, jobs: [job], codes: [] })
    expect(got.rows).toEqual([job, seg({ nocs: ['65201'] })])
    expect(got.filled).toBe(true)
    expect(got.codes).toEqual(['63200'])
  })

  it('没提取到几段:各段都没挂职业才按职业码一码一段;已有职业就不动', () => {
    expect(workFilledOf({ rows: [seg({})], jobs: [], codes: ['63200', '65201'] }).rows.map((r) => r.nocs)).toEqual([['63200'], ['65201']])
    const rows = [seg({ nocs: ['65201'] })]
    expect(workFilledOf({ rows, jobs: [], codes: ['63200'] })).toEqual({ rows, filled: false, codes: [] })
  })
})

describe('③ 给某一段选职业', () => {
  it('新点上的码替掉原来的并关框;别的段不动', () => {
    let rows = [seg({ nocs: ['63200'], title: 'A' }), seg({ nocs: ['65201'], title: 'B' })]
    let at = 0
    makeWorkOcc({ rows, setRows: (v) => { rows = v }, at, setAt: (v) => { at = v } })(['63200', '21231', '21232'])
    expect(rows[0]).toEqual(seg({ nocs: ['21231', '21232'], title: 'A' }))
    expect(rows[1]).toEqual(seg({ nocs: ['65201'], title: 'B' }))
    expect(at).toBe(-1)
  })

  it('点了「全选」(一次上来一大串码):这一下不算,这一段不动、框不关', () => {
    let rows = [seg({ nocs: ['63200'] })]
    let at = 0
    const many = ['63200', '10010', '10011', '10012', '10019', '10020', '10021', '10022']
    makeWorkOcc({ rows, setRows: (v) => { rows = v }, at, setAt: (v) => { at = v } })(many)
    expect(rows[0]?.nocs).toEqual(['63200'])
    expect(at).toBe(0)
  })

  it('点掉已选的:这一段不挂职业,框不关', () => {
    let rows = [seg({ nocs: ['63200'] })]
    let at = 0
    makeWorkOcc({ rows, setRows: (v) => { rows = v }, at, setAt: (v) => { at = v } })([])
    expect(rows[0]?.nocs).toEqual([])
    expect(at).toBe(0)
  })
})

describe('④ 生成草稿', () => {
  const facts: ProfileFacts = profileFactsOf({ p: src({}), email: 'a@test.local' })

  it('事实:职业英文名按第一个码查;没写名称和学校的教育经历不要;没选城市不带省', () => {
    expect(facts.work[0]?.occupation).toBe('Cooks')
    expect(facts.edu).toHaveLength(1)
    expect(profileFactsOf({ p: src({ city: { code: '', en: '' } }), email: '' }).region).toBe('')
    expect(profileFactsOf({ p: src({ eduList: [{ cred: '', school: '', from: '2020', to: '' }] }), email: '' }).edu).toEqual([])
  })

  it('段数与起止年月只取档案里的;模型多回的不要;结束空着的工作经历算至今', () => {
    const out = toProfileOut({
      summary: 'Cook with wok experience.',
      work: [
        { title: 'Line Cook', org: 'Beijing Hotel', city: 'Beijing', bullets: ['Prepared 200 hot dishes daily'] },
        { title: 'Invented', org: 'Fake Co', city: 'X', bullets: ['Lies'] },
      ],
      edu: [{ credential: 'Diploma', school: 'Algonquin College' }],
      skills: ['Wok cooking', 'Cantonese'],
    })
    const d = profileDraftOf({ f: facts, out })
    expect(d.work).toHaveLength(1)
    expect(d.work[0]).toMatchObject({ title: 'Line Cook', org: 'Beijing Hotel', fromY: '2021', fromM: '3', toY: '', now: true })
    expect(d.work[0]?.desc).toBe('- Prepared 200 hot dishes daily')
    expect(d.edu[0]).toMatchObject({ title: 'Diploma', org: 'Algonquin College', fromY: '2020', toY: '2022', now: false })
    expect(d.skills).toBe('Wok cooking\nCantonese')
    const layout = cvLayoutOf(toCvDraft(d))
    expect(layout.sections.map((s) => s.head)).toEqual(['PROFESSIONAL SUMMARY', 'WORK EXPERIENCE', 'EDUCATION', 'SKILLS'])
    expect(layout.sections[1]?.items[0]?.when).toBe('Mar 2021 - Present')
  })

  it('模型什么都没回:照档案原字出,非西文清掉,职位名称退到职业英文名', () => {
    const d = profileDraftOf({ f: facts, out: toProfileOut(null) })
    expect(d.work[0]).toMatchObject({ title: 'Cooks', org: '', city: 'Beijing', desc: '' })
    expect(d.skills).toBe('Wok')
    expect(d.summary).toBe('')
  })

  it('模型回的字清成排得了的字;形状不对的格当没写', () => {
    expect(latinOf(' “Chef’s” – café… 厨师 ')).toBe('"Chef\'s" - café...')
    const out = toProfileOut({ summary: 7, work: 'x', edu: [null], skills: ['a', 3, ''] })
    expect(out).toEqual({ summary: '', work: [], edu: [{ credential: '', school: '' }], skills: ['a'] })
  })

  it('输出模式点名四个顶层键', () => {
    expect(profileSchemaOf().required).toEqual(['summary', 'work', 'edu', 'skills'])
  })
})

describe('⑤ 记账号与够不够生成', () => {
  it('记账号是负的八位日期,同一天同号', () => {
    const a = profileRefOf(Date.UTC(2026, 10, 12, 1))
    expect(a).toBe(-20261112)
    expect(profileRefOf(Date.UTC(2026, 10, 12, 23))).toBe(a)
    expect(profileRefOf(Date.UTC(2026, 10, 13, 0))).toBe(-20261113)
  })

  it('缺姓名、或工作经历与教育经历都没有 = 不够', () => {
    expect(isProfileReady(profileFactsOf({ p: src({}), email: '' }))).toBe(true)
    expect(isProfileReady(profileFactsOf({ p: src({ name: ' ' }), email: '' }))).toBe(false)
    const none = src({ eduList: [], cv: { work: [], phone: '', link: '', skills: '' } })
    expect(isProfileReady(profileFactsOf({ p: none, email: '' }))).toBe(false)
  })
})

describe('⑥ 现代款 PDF', () => {
  it('画得出,文字与传统款相同', async () => {
    const facts = profileFactsOf({ p: src({}), email: 'a@test.local' })
    const out = toProfileOut({ summary: 'Cook.', work: [{ title: 'Cook', org: 'Hotel', city: 'Beijing', bullets: ['Cooked'] }], edu: [], skills: [] })
    const layout = cvLayoutOf(toCvDraft(profileDraftOf({ f: facts, out })))
    const classic = await cvPdfOf({ pdf: PdfLib, layout })
    const modern = await cvModernPdfOf({ pdf: PdfLib, layout })
    expect(modern.byteLength).toBeGreaterThan(classic.byteLength)
    expect(await textOf(modern)).toBe(await textOf(classic))
    expect(await textOf(modern)).toContain('Li Wei')
  })
})

// 2026-11-12 同批:专业并进教育经历的每一段、教育经历里搜学校、上传简历后自动填、投递第 1 步自己取档案开修改面板。
// 性质:⑦ 老档案的专业码按序落进各段(段不够补空段),已有哪一段挂了专业就原样不动;档案的专业由各段汇出、不重复;
//       ⑧ 选中一所学校:校名换成名单里的写法、公立私立照名单;省码是下拉认得的才填(地区不动原值);别的段不动、结果收起;
//       ⑨ 上传成了:档案里做过的工作、教育经历、英文姓名有一样空着才打开修改面板并自动填;都填了什么都不做;
//       ⑩ 档案 → 起始答案:带码的名字只取码、城市取英文名。
// 探针:eduWithMajorsOf 不判已有专业 → ⑦ 红;makeSchoolPickOf 不判省码 → ⑧ 红。
describe('⑦ 专业并进教育经历', () => {
  const B = { prov: '', kind: '', len: '', cred: '', school: '', from: '', to: '', major: '' }

  it('老档案的专业码按序落进各段,段不够补空段;已有专业的原样不动;汇出不重复', () => {
    const rows = [{ ...B, school: 'Algonquin College' }]
    const out = eduWithMajorsOf({ rows, codes: ['11.0701', '52.0301'] })
    expect(out).toEqual([{ ...B, school: 'Algonquin College', major: '11.0701' }, { ...B, major: '52.0301' }])
    expect(eduWithMajorsOf({ rows: out, codes: ['99.9999'] })).toBe(out)
    expect(eduMajorsOf(out.concat([{ ...B, major: '11.0701' }]))).toEqual(['11.0701', '52.0301'])
    expect(eduFormRowsOf({ list: [], strs: [], majors: ['11.0701'] })).toEqual([{ ...B, major: '11.0701' }])
  })

  it('2026-11-13 不猜专业属于哪一段:两段以上时现有各段不动,专业各占末尾一个空段,一个不丢', () => {
    const rows = [{ ...B, school: 'Cloud program' }, { ...B, school: 'AI program' }]
    const out = eduWithMajorsOf({ rows, codes: ['11.0102', '11.0902'] })
    expect(out).toEqual([rows[0], rows[1], { ...B, major: '11.0102' }, { ...B, major: '11.0902' }])
    expect(eduMajorsOf(out)).toEqual(['11.0102', '11.0902'])
    // 没有教育经历:专业各占一段
    expect(eduWithMajorsOf({ rows: [], codes: ['11.0102'] })).toEqual([{ ...B, major: '11.0102' }])
  })

  it('2026-11-13 做过的工作摘要:字一样的几段只出一行(不写段数),不一样的照旧一段一行', () => {
    const W = { nocs: ['21232'], title: '', org: '', city: '', from: '', to: '', desc: '' }
    const t = (k: string) => k
    const rows = [W, W, { ...W, org: 'Acme' }, W]
    const names = ['Software developers', 'Software developers', 'Software developers', 'Software developers']
    expect(workLinesOf({ rows, names, t, titles: {}, full: true }).map((l) => l.name))
      .toEqual(['Software developers', 'Software developers, Acme'])
    // 修改档案里(full = false):加拿大职业黑字、职位名称灰字;同一个职业已有带职位名称的行时,不带的那行不出;公司不出
    const titles = { '21232': 'Software developers and programmers' }
    const mine = [{ ...W, title: 'Java 开发', org: 'Acme' }, W, W]
    expect(workLinesOf({ rows: mine, names, t, titles, full: false }).map((l) => [l.name, l.sub]))
      .toEqual([['Software developers and programmers', 'Java 开发']])
    // 只有职业、没有职位名称的几段:照旧合成一行
    expect(workLinesOf({ rows: [W, W], names, t, titles, full: false }).map((l) => [l.name, l.sub]))
      .toEqual([['Software developers and programmers', '']])
  })

  it('服务端收答案:专业码不合形(含老档案没有这一格)按空串;只有专业码的一条也留', () => {
    expect(toEduList([{ key: '', cred: 'Diploma', school: '', from: '', to: '' }])[0]?.major).toBe('')
    expect(toEduList([{ key: '', cred: '', school: '', from: '', to: '', major: '11.0701' }])).toHaveLength(1)
    expect(toEduList([{ key: '', cred: 'x', school: '', from: '', to: '', major: 'DROP TABLE' }])[0]?.major).toBe('')
  })
})

describe('⑧ 教育经历里搜学校', () => {
  const B = { prov: '', kind: '', len: 'y2', cred: 'Diploma', school: 'algon', from: '', to: '', major: '' }

  it('选中:校名、公立私立照名单,省码认得才填;别的段不动;结果收起', () => {
    let rows = [B, { ...B, school: 'other' }]
    let at = 0
    const pickOf = makeSchoolPickOf({ rows, setRows: (v) => { rows = v }, at, setAt: (v) => { at = v } })
    pickOf({ name: 'Algonquin College', nameZh: '亚岗昆学院', prov: 'ON', isPublic: true })()
    expect(rows[0]).toEqual({ ...B, school: 'Algonquin College', prov: 'ON', kind: 'public' })
    expect(rows[1]).toEqual({ ...B, school: 'other' })
    expect(at).toBe(-1)
    makeSchoolPickOf({ rows: [{ ...B, prov: 'BC' }], setRows: (v) => { rows = v }, at: 0, setAt: () => undefined })(
      { name: 'Yukon University', nameZh: '', prov: 'YT', isPublic: false })()
    expect(rows[0]).toMatchObject({ school: 'Yukon University', prov: 'BC', kind: 'private' })
  })

  it('打字落格并记下在搜这一段;检索词取那一段的学校格;灰字中文界面带译名', () => {
    let rows = [B]
    let at = -1
    makeSchoolTypeOf({ rows, setRows: (v) => { rows = v }, setAt: (v) => { at = v } })(0)(' Sen ')
    expect(rows[0]?.school).toBe(' Sen ')
    expect(schoolQOf({ rows, at })).toBe('Sen')
    expect(schoolQOf({ rows, at: -1 })).toBe('')
    const t = (k: string) => k
    const hit = { name: 'Seneca', nameZh: '圣力嘉', prov: 'ON', isPublic: true }
    expect(schoolSubOf({ hit, lang: 'zh', t })).toBe('圣力嘉, ON, fit.kind.public')
    expect(schoolSubOf({ hit, lang: 'en', t })).toBe('ON, fit.kind.public')
  })

  it('搜学校的库行 → 一所学校:空值折空串,公立只认 true', () => {
    expect(toSchoolHit({ name: 'X', name_zh: null, province: null, is_public: null })).toEqual({ name: 'X', nameZh: '', prov: '', isPublic: false })
  })
})

describe('⑨⑩ 上传后自动填与自己取档案', () => {
  // 2026-11-14 ⑨ 撤:上传后不再开修改面板,改后台自动填并存(性质住 profileAuto.int.spec.ts)
  it('档案 → 起始答案', () => {
    const got = seedOf({
      goal: 2, majors: [{ code: '11.0701' }], nocs: [{ code: '21232' }], prov: 'ON', abroad: false, city: { en: 'Ottawa' }, name: 'Li Wei',
      who: 'pgwp', edu: ['ON.public.y2'], eduList: [], works: [{ code: '63200' }], matchBy: '', matchMode: '', fromResume: [], cv: {},
    })
    expect(got).toMatchObject({ majors: ['11.0701'], nocs: ['21232'], workNocs: ['63200'], city: 'Ottawa', goal: 2 })
  })
})
