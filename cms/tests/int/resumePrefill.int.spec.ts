/**
 * 「我的」第一批(2026-11-09):从简历填档案的洗数与映射、「来自简历」标记的去留、每日推送跳过没有职业依据的人。
 * 2026-11-12:提取结果多一格教育经历(证书或学历名称、学校、起止年份):洗数,以及并进表单几段的规矩
 * (同名称同学校跳过、先填第一段明细全空的、再往后加;用户填过的不动)。
 *
 * @author Frank
 * @time 2026-11-09 16:00:00
 */
import { describe, expect, it } from 'vitest'
import { eduMergedOf, fromKeptOf, isFromResume } from '@/components/gate/functions'
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

describe('模型回包洗数', () => {
  it('非字符串丢掉、超量截断、坏格按没有', () => {
    expect(prefillFactOf({ name: 12, titles: ['a', 3, ' b ', 'c', 'd'], majors: 'x', education: 'y' }))
      .toEqual({ name: '', titles: ['a', 'b', 'c'], majors: [], education: [] })
    expect(prefillFactOf({ name: ' Pat ', titles: null, majors: ['m1', 'm2', 'm3'], education: null }))
      .toEqual({ name: 'Pat', titles: [], majors: ['m1', 'm2'], education: [] })
  })

  it('教育经历(2026-11-12):照抄、去空白、截断;年份只认四位数字(数字型也认);不是对象或四格全空的丢;至多 4 条', () => {
    const got = prefillFactOf({
      name: null, titles: [], majors: [],
      education: [
        { credential: ' Graduate Certificate ', school: ' Algonquin College ', from: '2025', to: 2026 },
        { credential: 'Bachelor of Engineering', school: null, from: 'Sept 2014', to: '2018-06' },
        'junk', null, ['x'],
        { credential: '', school: '', from: 'n/a', to: '' },
        { credential: 'c'.repeat(200), school: 's'.repeat(300) },
        { credential: 'Fourth', school: 'D', from: '', to: '' },
        { credential: 'Fifth', school: 'E', from: '', to: '' },
      ],
    }).education
    expect(got).toEqual([
      { credential: 'Graduate Certificate', school: 'Algonquin College', from: '2025', to: '2026' },
      { credential: 'Bachelor of Engineering', school: '', from: '', to: '' },
      { credential: 'c'.repeat(80), school: 's'.repeat(120), from: '', to: '' },
      { credential: 'Fourth', school: 'D', from: '', to: '' },
    ])
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
  const BLANK = { prov: '', kind: '', len: '', cred: '', school: '', from: '', to: '' }
  const CERT = { credential: 'Graduate Certificate', school: 'Algonquin College', from: '2025', to: '2026' }
  const BENG = { credential: 'Bachelor of Engineering', school: 'Wuhan University', from: '2014', to: '2018' }

  it('先填第一段明细全空的(三只下拉照留),放不下的往后加一段(三只下拉空着)', () => {
    const rows = [{ ...BLANK, prov: 'ON', kind: 'public', len: 'y1' }]
    expect(eduMergedOf({ rows, items: [CERT, BENG] })).toEqual({
      rows: [
        { prov: 'ON', kind: 'public', len: 'y1', cred: 'Graduate Certificate', school: 'Algonquin College', from: '2025', to: '2026' },
        { ...BLANK, cred: 'Bachelor of Engineering', school: 'Wuhan University', from: '2014', to: '2018' },
      ],
      n: 2,
    })
  })

  it('同名称同学校的跳过(不分大小写、不看空白);用户填过的明细一格不动', () => {
    const mine = { ...BLANK, cred: 'graduate certificate', school: ' ALGONQUIN COLLEGE', from: '2024', to: '' }
    const typed = { ...BLANK, cred: '', school: '', from: '2010', to: '' }
    const out = eduMergedOf({ rows: [mine, typed], items: [CERT, BENG] })
    expect(out.n).toBe(1)
    expect(out.rows).toEqual([mine, typed, { ...BLANK, cred: 'Bachelor of Engineering', school: 'Wuhan University', from: '2014', to: '2018' }])
    expect(eduMergedOf({ rows: out.rows, items: [CERT, BENG] })).toEqual({ rows: out.rows, n: 0 })
  })

  it('名称和学校都没有的不要;年份不是四位数字的不带;到 6 段为止不再加', () => {
    expect(eduMergedOf({ rows: [BLANK], items: [{ credential: ' ', school: '', from: '2020', to: '2021' }] }))
      .toEqual({ rows: [BLANK], n: 0 })
    expect(eduMergedOf({ rows: [BLANK], items: [{ credential: 'Diploma', school: '', from: '20', to: 'now' }] }).rows)
      .toEqual([{ ...BLANK, cred: 'Diploma' }])
    const full = Array.from({ length: 6 }, (_, i) => ({ ...BLANK, cred: 'C' + i }))
    expect(eduMergedOf({ rows: full, items: [CERT] })).toEqual({ rows: full, n: 0 })
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
