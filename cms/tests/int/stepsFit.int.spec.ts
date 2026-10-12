/**
 * 资讯页「申请步骤」分区筛选的判定(pnp 子桶 fit 的 keepStreamOf;2026-10-11 申请步骤分区筛选批 1)。
 * 判定层测试三件:穷举输入断言性质 + 手写金标(真 mart 行 + 身份对照稿)+ 变异探针。
 */
import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { keepStreamOf } from '@/components/pnp/fit'
import type { EduRow, FitsJson } from '@/components/pnp/fit/types'

type Row = { key: string, province: string, fits: FitsJson | null, status: string, steps: object[] }
const ROWS: Row[] = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../data/mart/pathways.json'), 'utf8'))
const LIVE = ROWS.filter((r) => r.status !== 'closed' && r.steps.length > 0)
const WHOS = ['', 'student', 'pgwp', 'lmia', 'open', 'abroad', 'ee']
const PROVS = ['', 'BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL', 'abroad']
const KINDS = ['', 'public', 'private']
const LENS = ['', 'y1', 'y2', 'y3', 'master']

const edu = (prov: string, kind = '', len = ''): EduRow => ({ prov, kind, len })
const keptKeys = (who: string, rows: EduRow[], province: string) =>
  LIVE.filter((r) => r.province === province && keepStreamOf({ fits: r.fits, province: r.province, filter: { who, edu: rows } }))
    .map((r) => r.key)

describe('性质', () => {
  it('啥也没选 = 全部留下', () => {
    for (const r of LIVE) {
      expect(keepStreamOf({ fits: r.fits, province: r.province, filter: { who: '', edu: [edu('')] } })).toBe(true)
    }
  })

  it('写了不能走的身份,不管教育经历填什么都藏', () => {
    for (const r of LIVE) {
      for (const who of WHOS) {
        const cell = r.fits?.[who]
        if (cell?.can !== 'no') continue
        for (const prov of PROVS) {
          for (const kind of KINDS) {
            expect(keepStreamOf({ fits: r.fits, province: r.province, filter: { who, edu: [edu(prov, kind, 'y2')] } })).toBe(false)
          }
        }
      }
    }
  })

  it('没登对照 / 没登这身份 / 没填教育经历 —— 一律留(不替官方藏)', () => {
    for (const r of LIVE) {
      for (const who of WHOS) {
        const cell = r.fits?.[who]
        if (cell != null && cell.can === 'no') continue
        expect(keepStreamOf({ fits: r.fits, province: r.province, filter: { who, edu: [edu('')] } })).toBe(true)
      }
    }
  })

  it('多填一段教育经历只会多留、不会多藏(单调)', () => {
    for (const r of LIVE) {
      for (const who of WHOS) {
        for (const a of PROVS) {
          for (const b of PROVS) {
            for (const len of LENS) {
              const one = keepStreamOf({ fits: r.fits, province: r.province, filter: { who, edu: [edu(a, 'public', len)] } })
              const two = keepStreamOf({ fits: r.fits, province: r.province, filter: { who, edu: [edu(a, 'public', len), edu(b, 'public', len)] } })
              if (one && a !== '') expect(two).toBe(true)
            }
          }
        }
      }
    }
  }, 30_000)
})

describe('金标(身份对照稿)', () => {
  it('AB 阿省公立两年制毕业工签:只藏旅游酒店', () => {
    expect(keptKeys('pgwp', [edu('AB', 'public', 'y2')], 'AB')).toEqual([
      'ab-opportunity', 'ab-accelerated-tech', 'ab-dedicated-health-care', 'ab-law-enforcement', 'ab-rural-renewal',
    ])
  })

  it('AB 外省私立一年制毕业工签:机会通道与旅游酒店都藏', () => {
    expect(keptKeys('pgwp', [edu('ON', 'private', 'y1')], 'AB')).toEqual([
      'ab-accelerated-tech', 'ab-dedicated-health-care', 'ab-law-enforcement', 'ab-rural-renewal',
    ])
  })

  it('AB 开放工签:机会通道与旅游酒店藏;人在国外同', () => {
    for (const who of ['open', 'abroad']) {
      expect(keptKeys(who, [edu('')], 'AB')).toEqual([
        'ab-accelerated-tech', 'ab-dedicated-health-care', 'ab-law-enforcement', 'ab-rural-renewal',
      ])
    }
  })

  it('安省两段一年制(AI、云计算)看 NL:国际毕业生类留(外省公立),技术工人类藏(不收 PGWP)', () => {
    const kept = keptKeys('pgwp', [edu('ON', 'public', 'y1'), edu('ON', 'public', 'y1')], 'NL')
    expect(kept).toContain('nl-international-graduate')
    expect(kept).not.toContain('nl-skilled-worker')
  })

  it('外省私立看 NL:国际毕业生类藏', () => {
    expect(keptKeys('pgwp', [edu('ON', 'private', 'y1')], 'NL')).not.toContain('nl-international-graduate')
  })

  it('萨省科技人才要两年制以上:一年制藏、两年制留;两段里有一段够就留', () => {
    expect(keptKeys('pgwp', [edu('SK', 'public', 'y1')], 'SK')).not.toContain('sk-tech-talent')
    expect(keptKeys('pgwp', [edu('SK', 'public', 'y2')], 'SK')).toContain('sk-tech-talent')
    expect(keptKeys('pgwp', [edu('ON', 'public', 'y1'), edu('abroad', 'public', 'master')], 'SK')).toContain('sk-tech-talent')
  })

  it('NB 私立学院试点:在读私立留、毕业工签藏', () => {
    expect(keptKeys('student', [edu('NB', 'private', 'y1')], 'NB')).toContain('nb-private-college-pilot')
    expect(keptKeys('student', [edu('NB', 'public', 'y1')], 'NB')).not.toContain('nb-private-college-pilot')
    expect(keptKeys('pgwp', [edu('NB', 'private', 'y1')], 'NB')).not.toContain('nb-private-college-pilot')
  })
})

describe('变异探针', () => {
  it('把机会通道 PGWP 的院校条件拿掉,外省私立就不该再被藏 —— 判定确实读了 schools', () => {
    const r = LIVE.find((x) => x.key === 'ab-opportunity')!
    const filter = { who: 'pgwp', edu: [edu('ON', 'private', 'y1')] }
    expect(keepStreamOf({ fits: r.fits, province: 'AB', filter })).toBe(false)
    const mutated: FitsJson = { ...r.fits!, pgwp: { can: 'yes' } }
    expect(keepStreamOf({ fits: mutated, province: 'AB', filter })).toBe(true)
  })

  it('把通道所在省换掉,本省条件就对不上 —— 判定确实按通道所在省算本省', () => {
    const r = LIVE.find((x) => x.key === 'pe-international-graduate')!
    const filter = { who: 'pgwp', edu: [edu('PE', 'public', 'y2')] }
    expect(keepStreamOf({ fits: r.fits, province: 'PE', filter })).toBe(true)
    expect(keepStreamOf({ fits: r.fits, province: 'NS', filter })).toBe(false)
  })
})
