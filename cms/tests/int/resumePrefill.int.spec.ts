/**
 * 「我的」第一批(2026-11-09):从简历填档案的洗数与映射、「来自简历」标记的去留、每日推送跳过没有职业依据的人。
 * 2026-11-12:提取结果多一格教育经历(证书或学历名称、学校、起止年份):洗数,以及并进表单几段的规矩
 * (同名称同学校跳过、先填第一段明细全空的、再往后加;用户填过的不动)。
 * 同日 Frank「简历里能抽出来吧」:教育经历每条多三格(院校所在地、公立私立、课程时长):服务端只认表单下拉的取值、别的清空;
 * 并进一段时只填那一段还空着的下拉,选过的不动。教育经历几段这一族搬去 gate 桶子桶 edu,用例改从那边取。
 *
 * @author Frank
 * @time 2026-11-09 16:00:00
 */
import { describe, expect, it } from 'vitest'
import { eduMergedOf } from '@/components/gate/edu/functions'
import { fromKeptOf, isFromResume } from '@/components/gate/functions'
import { toDigestUser } from '@/lib/alerts/functions'
import { prefillFactOf, prefillMajorsOf, prefillWorksOf } from '@/lib/resume/functions'
import type { Db } from '@/lib/db'

const MARKS = ['workNocs:21232', 'workNocs:63200', 'majors:11.0701', 'name:Pat Testuser']

describe('来自简历的标记', () => {
  it('值在才算', () => {
    expect(isFromResume({ marks: MARKS, field: 'workNocs', value: '21232' })).toBe(true)
    expect(isFromResume({ marks: MARKS, field: 'majors', value: '21232' })).toBe(false)
  })

  it('未改再存全留;摘掉、改掉的才消失', () => {
    const same = { marks: MARKS, majors: ['11.0701'], workNocs: ['21232', '63200'], name: 'Pat Testuser' }
    expect(fromKeptOf(same)).toEqual(MARKS)
    expect(fromKeptOf({ marks: MARKS, majors: [], workNocs: ['63200'], name: 'Pat Q Testuser' })).toEqual(['workNocs:63200'])
  })
})

// 教育经历三只下拉都看不出(三格空串)
const NO_SEL = { prov: '', kind: '', len: '' }

describe('模型回包洗数', () => {
  it('非字符串丢掉、超量截断、坏格按没有', () => {
    expect(prefillFactOf({ name: 12, titles: ['a', 3, ' b ', 'c', 'd'], majors: 'x', education: 'y' }))
      .toEqual({ name: '', titles: ['a', 'b', 'c'], majors: [], education: [], jobs: [] })
    expect(prefillFactOf({ name: ' Pat ', titles: null, majors: ['m1', 'm2', 'm3'], education: null }))
      .toEqual({ name: 'Pat', titles: [], majors: ['m1', 'm2'], education: [], jobs: [] })
  })

  it('工作经历(2026-11-12):照抄、去空白;起止年月只认 2021 或 2021-03;职位名称、雇主、职责都没有的丢;不是数组给空列;至多 6 段', () => {
    const got = prefillFactOf({
      name: null, titles: [], majors: [], education: [],
      jobs: [
        { occupation: 'cook', title: ' Line Cook ', employer: ' Bassi ', city: 'Ottawa', from: '2021-03', to: 'present', notes: 'Prepared 200 dishes\nUsed wok' },
        { occupation: 'cook', title: '', employer: '', city: 'X', from: '2020', to: '2021-13', notes: '' },
        { title: 'Baker', from: 2019 },
        'junk',
      ],
    }).jobs
    expect(got).toEqual([
      { occupation: 'cook', title: 'Line Cook', employer: 'Bassi', city: 'Ottawa', from: '2021-03', to: '', notes: 'Prepared 200 dishes\nUsed wok' },
      { occupation: '', title: 'Baker', employer: '', city: '', from: '2019', to: '', notes: '' },
    ])
    expect(prefillFactOf({ name: null, titles: [], majors: [], education: [], jobs: 'x' }).jobs).toEqual([])
    const many = Array.from({ length: 9 }, () => ({ title: 'T' }))
    expect(prefillFactOf({ name: null, titles: [], majors: [], education: [], jobs: many }).jobs).toHaveLength(6)
  })

  it('2026-11-13 项目不当成工作:有雇佣经历那一节的段时,项目类的节下的段全删;只有项目时照留;没标节的按雇佣经历算', () => {
    const base = { name: null, titles: [], majors: [], education: [] }
    const mixed = [
      { section: 'PROJECTS', title: 'Founder' },
      { section: 'Personal Projects', title: 'Lead Architect' },
      { section: 'PROFESSIONAL EXPERIENCE', title: 'Senior Big Data Architect' },
      { section: '', title: 'Java Developer' },
      { section: 'Volunteer', title: 'Tutor' },
    ]
    expect(prefillFactOf({ ...base, jobs: mixed }).jobs.map((j) => j.title)).toEqual(['Senior Big Data Architect', 'Java Developer'])
    const onlyProjects = [{ section: 'PROJECTS', title: 'Founder' }, { section: 'Capstone', title: 'Developer' }]
    expect(prefillFactOf({ ...base, jobs: onlyProjects }).jobs.map((j) => j.title)).toEqual(['Founder', 'Developer'])
    // 项目排在前面占满名额也不挤掉后面的雇佣经历
    const crowded = Array.from({ length: 7 }, () => ({ section: 'Projects', title: 'P' })).concat([{ section: 'Experience', title: 'Real' }])
    expect(prefillFactOf({ ...base, jobs: crowded }).jobs.map((j) => j.title)).toEqual(['Real'])
  })

  it('教育经历(2026-11-12):照抄、去空白、截断;年份只认四位数字(数字型也认);不是对象或四格全空的丢;至多 4 条', () => {
    const got = prefillFactOf({
      name: null, titles: [], majors: [],
      education: [
        { credential: ' Graduate Certificate ', school: ' Algonquin College ', from: '2025', to: 2026 },
        { credential: 'Bachelor of Engineering', school: null, from: 'Sept 2014', to: '2018-06', major: '' },
        'junk', null, ['x'],
        { credential: '', school: '', from: 'n/a', to: '', major: '' },
        { credential: 'c'.repeat(200), school: 's'.repeat(300) },
        { credential: 'Fourth', school: 'D', from: '', to: '', major: '' },
        { credential: 'Fifth', school: 'E', from: '', to: '', major: '' },
      ],
    }).education
    expect(got).toEqual([
      { credential: 'Graduate Certificate', school: 'Algonquin College', from: '2025', to: '2026', ...NO_SEL },
      { credential: 'Bachelor of Engineering', school: '', from: '', to: '', ...NO_SEL },
      { credential: 'c'.repeat(80), school: 's'.repeat(120), from: '', to: '', ...NO_SEL },
      { credential: 'Fourth', school: 'D', from: '', to: '', ...NO_SEL },
    ])
  })

  it('教育经历三只下拉的值(2026-11-12「简历里能抽出来吧」):一字不差是下拉的取值才留(去首尾空白),别的一律空串', () => {
    function selOf(x: { prov?: unknown, kind?: unknown, len?: unknown }) {
      const [row] = prefillFactOf({ name: null, titles: [], majors: [], education: [{ credential: 'Diploma', ...x }] } as never).education
      return { prov: row?.prov, kind: row?.kind, len: row?.len }
    }
    expect(selOf({ prov: 'ON', kind: 'public', len: 'y2' })).toEqual({ prov: 'ON', kind: 'public', len: 'y2' })
    expect(selOf({ prov: ' abroad ', kind: 'private', len: 'master' })).toEqual({ prov: 'abroad', kind: 'private', len: 'master' })
    for (const prov of ['ON', 'QC', 'BC', 'AB', 'SK', 'MB', 'NS', 'NB', 'NL', 'PE', 'abroad']) {
      expect(selOf({ prov }).prov).toBe(prov)
    }
    for (const len of ['y1', 'y2', 'y3', 'master']) {
      expect(selOf({ len }).len).toBe(len)
    }
    // 坏值:大小写不对、全名、表外的地区、别的格的取值、数字、对象、null、缺席
    for (const bad of ['on', 'Ontario', 'YT', 'NT', 'NU', 'US', 'Abroad', 'public', 'y1', 'ON.public.y1', 'ON, Canada', 2, { v: 'ON' }, ['ON'], null, undefined, '']) {
      expect(selOf({ prov: bad }).prov).toBe('')
    }
    for (const bad of ['Public', 'PRIVATE', 'public college', 'privately', 'ON', 'y1', true, 1, null, undefined, '']) {
      expect(selOf({ kind: bad }).kind).toBe('')
    }
    for (const bad of ['Y1', 'y4', 'y0', '1', 1, '2 years', 'Master', 'masters', 'phd', 'public', null, undefined, '']) {
      expect(selOf({ len: bad }).len).toBe('')
    }
    // 只有这三格、四格明细全空的一项照旧丢
    expect(prefillFactOf({ name: null, titles: [], majors: [], education: [{ prov: 'ON', kind: 'public', len: 'y1' }] } as never).education).toEqual([])
  })

  it('专业只取搜索第一名,去重,搜不到留空', () => {
    function hitsOf(q: string): string[] {
      if (q === 'none') {
        return []
      }
      return ['11.0701', q]
    }
    expect(prefillMajorsOf({ names: ['a', 'none', 'b'], hitsOf })).toEqual(['11.0701'])
  })
})

describe('简历里的教育经历并进表单几段(2026-11-12)', () => {
  const BLANK = { prov: '', kind: '', len: '', cred: '', school: '', from: '', to: '', major: '' }
  const CERT = { credential: 'Graduate Certificate', school: 'Algonquin College', from: '2025', to: '2026', ...NO_SEL }
  const BENG = { credential: 'Bachelor of Engineering', school: 'Wuhan University', from: '2014', to: '2018', ...NO_SEL }

  it('先填第一段明细全空的(三只下拉照留),放不下的往后加一段(三只下拉空着)', () => {
    const rows = [{ ...BLANK, prov: 'ON', kind: 'public', len: 'y1' }]
    expect(eduMergedOf({ rows, items: [CERT, BENG] })).toEqual({
      rows: [
        { prov: 'ON', kind: 'public', len: 'y1', cred: 'Graduate Certificate', school: 'Algonquin College', from: '2025', to: '2026', major: '' },
        { ...BLANK, cred: 'Bachelor of Engineering', school: 'Wuhan University', from: '2014', to: '2018', major: '' },
      ],
      n: 2,
    })
  })

  it('同名称同学校的不再加一段(不分大小写、不看空白);填过的明细一格不动,空着的年份补上', () => {
    const mine = { ...BLANK, cred: 'graduate certificate', school: ' ALGONQUIN COLLEGE', from: '2024', to: '', major: '' }
    const typed = { ...BLANK, cred: '', school: '', from: '2010', to: '', major: '' }
    const out = eduMergedOf({ rows: [mine, typed], items: [CERT, BENG] })
    expect(out.n).toBe(2)
    expect(out.rows).toEqual([{ ...mine, to: '2026', major: '' }, typed, { ...BLANK, cred: 'Bachelor of Engineering', school: 'Wuhan University', from: '2014', to: '2018', major: '' }])
    expect(eduMergedOf({ rows: out.rows, items: [CERT, BENG] })).toEqual({ rows: out.rows, n: 0 })
  })

  it('同一段学历换个写法不再加一段(2026-11-13):只差词序、括号、横线、虚词算同一段;同校不同证书仍是两段', () => {
    const school = 'Algonquin College'
    const ai = { ...BLANK, cred: 'Graduate Certificate in AI Software Development', school, from: '2025', to: '2026' }
    const beng = { ...BLANK, cred: 'Bachelor of Engineering - Telecommunications Engineering', school: 'Wuhan University', from: '2008', to: '2012' }
    const rows = [ai, beng]
    const aiAgain = { credential: 'AI Software Development (Graduate Certificate)', school, from: '2025', to: '2026', ...NO_SEL }
    const bengAgain = { credential: 'Bachelor of Engineering — Telecommunications Engineering', school: 'wuhan university', from: '2008', to: '2012', ...NO_SEL }
    expect(eduMergedOf({ rows, items: [aiAgain, bengAgain] })).toEqual({ rows, n: 0 })
    // AI 与 Artificial Intelligence 算同一个说法
    const full = [{ ...ai, cred: 'Graduate Certificate in Artificial Intelligence Software Development' }, beng]
    expect(eduMergedOf({ rows: full, items: [aiAgain, bengAgain] })).toEqual({ rows: full, n: 0 })
    // 提取到的名称只是写得短一些(词全在已有那段里)、年份不冲突:同一段
    const bengShort = { credential: 'Bachelor of Engineering', school: 'Wuhan University', from: '2008', to: '2012', ...NO_SEL }
    expect(eduMergedOf({ rows, items: [bengShort] })).toEqual({ rows, n: 0 })
    expect(eduMergedOf({ rows: [{ ...beng, cred: 'Bachelor of Engineering' }], items: [bengAgain] }).rows.length).toBe(1)
    // 写得短一些但年份对不上:两段
    const certLater = { credential: 'Graduate Certificate', school, from: '2027', to: '2028', ...NO_SEL }
    expect(eduMergedOf({ rows, items: [certLater] }).rows.length).toBe(3)
    // 同校同年份、证书不同:两段
    const cloud = { credential: 'Graduate Certificate in Cloud Development', school, from: '2025', to: '2026', ...NO_SEL }
    const out = eduMergedOf({ rows, items: [cloud] })
    expect(out.n).toBe(1)
    expect(out.rows.length).toBe(3)
    // 同证书不同学校:两段
    expect(eduMergedOf({ rows, items: [{ ...aiAgain, school: 'Carleton University' }] }).rows.length).toBe(3)
  })

  it('名称和学校都没有的不要;年份不是四位数字的不带;到 6 段为止不再加', () => {
    expect(eduMergedOf({ rows: [BLANK], items: [{ credential: ' ', school: '', from: '2020', to: '2021', ...NO_SEL }] }))
      .toEqual({ rows: [BLANK], n: 0 })
    expect(eduMergedOf({ rows: [BLANK], items: [{ credential: 'Diploma', school: '', from: '20', to: 'now', ...NO_SEL }] }).rows)
      .toEqual([{ ...BLANK, cred: 'Diploma' }])
    const full = Array.from({ length: 6 }, (_, i) => ({ ...BLANK, cred: 'C' + i }))
    expect(eduMergedOf({ rows: full, items: [CERT] })).toEqual({ rows: full, n: 0 })
  })

  it('三只下拉(2026-11-12「简历里能抽出来吧」):并进一段时只填还空着的下拉,选过的一只不动;新加的一段整份用简历的', () => {
    const cert = { ...CERT, prov: 'ON', kind: 'public', len: 'y1' }
    const beng = { ...BENG, prov: 'abroad', kind: 'public', len: 'y3' }
    // 第一段他只选了所在地 BC:所在地照留,公立私立与时长填上;第二段是新加的
    expect(eduMergedOf({ rows: [{ ...BLANK, prov: 'BC' }], items: [cert, beng] })).toEqual({
      rows: [
        { prov: 'BC', kind: 'public', len: 'y1', cred: 'Graduate Certificate', school: 'Algonquin College', from: '2025', to: '2026', major: '' },
        { prov: 'abroad', kind: 'public', len: 'y3', cred: 'Bachelor of Engineering', school: 'Wuhan University', from: '2014', to: '2018', major: '' },
      ],
      n: 2,
    })
    // 三只都选过:一只不动
    const picked = { ...BLANK, prov: 'QC', kind: 'private', len: 'master' }
    expect(eduMergedOf({ rows: [picked], items: [cert] }).rows[0])
      .toEqual({ ...picked, cred: 'Graduate Certificate', school: 'Algonquin College', from: '2025', to: '2026', major: '' })
    // 简历看不出的那只(空串)留空;不是下拉取值的当没有
    expect(eduMergedOf({ rows: [BLANK], items: [{ ...CERT, prov: 'ON', kind: '', len: 'y9' }] }).rows[0])
      .toEqual({ ...BLANK, prov: 'ON', cred: 'Graduate Certificate', school: 'Algonquin College', from: '2025', to: '2026', major: '' })
    // 同名称同学校的不算新填的一段,但那一段空着的下拉和年份补上,选过的照留
    const mine = { ...BLANK, kind: 'private', cred: 'Graduate Certificate', school: 'Algonquin College' }
    expect(eduMergedOf({ rows: [mine], items: [cert] })).toEqual({
      rows: [{ ...mine, prov: 'ON', len: 'y1', from: '2025', to: '2026', major: '' }],
      n: 1,
    })
  })
})

describe('职业名映射职业码', () => {
  function dbOf(sims: Record<string, { noc: string; sim: number }[]>, known: string[]): Db {
    return {
      query: async function query(sql: string, params: string[][] | string[]) {
        if (sql.includes('similarity')) {
          return { rows: sims[String(params[0])] }
        }
        return { rows: known.map(function row(noc) { return { noc, title: 't' } }) }
      },
    } as Db
  }

  it('够线才收第一名,不够留空,库内没名字的码丢掉,重复合并', async () => {
    const db = dbOf({
      dev: [{ noc: '21232', sim: 1 }], dev2: [{ noc: '21232', sim: 0.9 }], weak: [{ noc: '00012', sim: 0.59 }],
      ghost: [{ noc: '64312', sim: 0.8 }], none: [],
    }, ['21232'])
    expect(await prefillWorksOf({ db, titles: ['dev', 'dev2', 'weak', 'ghost', 'none'] })).toEqual(['21232'])
  })
})

describe('每日推送的职业依据', () => {
  it('库里算的 has_occ 原样带出,空按没有', () => {
    const row = { user_id: 1, email: 'a@b', locale: 'en', pro_until: null, last_daily_at: null }
    expect(toDigestUser({ ...row, has_occ: true }).hasOcc).toBe(true)
    expect(toDigestUser({ ...row, has_occ: false }).hasOcc).toBe(false)
    expect(toDigestUser({ ...row, has_occ: null }).hasOcc).toBe(false)
  })
})
