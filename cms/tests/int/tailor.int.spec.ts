/**
 * 按职位改写的判定(2026-11-09):引文逐字核对、打分、重试上限、新增与丢失事实的拦截。
 *
 * @author Frank
 * @time 2026-11-09 22:00:00
 */
import { describe, expect, it } from 'vitest'
import { auditOf, droppedYearsOf, newNumbersOf, reqsOf, runStep, scoreOf } from '@/lib/tailor/functions'
import type { TailorReq, TailorReview } from '@/lib/tailor/types'

function req(id: number, resume: string, cover: string, basis = true): TailorReq {
  return { id, label: 'L' + id, jd: 'J' + id, basis, resume, cover }
}

function review(reqs: TailorReq[], retryResume = 0, retryCover = 0): TailorReview {
  return { reqs, unsupported: [], score: null, retryResume, retryCover, bad: [] }
}

describe('拆要求', () => {
  it('quote 在职位描述里找不到的不要,空白差异不算不同', () => {
    const parsed = { reqs: [{ label: 'Cook', quote: 'Prepare   and cook' }, { label: 'Fake', quote: 'Fly a plane' }] }
    expect(reqsOf({ parsed, jd: 'Tasks: Prepare and\ncook meals' }).map((r) => r.label)).toEqual(['Cook'])
  })
})

describe('逐字核对', () => {
  const base = review([req(1, '', ''), req(2, '', '')])

  it('引文对不上按没写到;没有依据不算覆盖', () => {
    const parsed = {
      items: [
        { id: 1, basis: true, resume: 'fried eggs', cover: 'made up sentence' },
        { id: 2, basis: false, resume: 'cooked meals', cover: 'I cooked' },
      ],
      unsupported: [],
    }
    const out = auditOf({ review: base, parsed, resumeText: 'I   cooked meals daily', coverText: 'I cooked' })
    expect(out.reqs[0]?.resume).toBe('')
    expect(out.reqs[0]?.cover).toBe('')
    expect(out.reqs[1]?.resume).toBe('')
  })

  it('无依据的句子也要逐字在信里', () => {
    const parsed = { items: [], unsupported: ['I led a team.', 'Not in the letter.'] }
    expect(auditOf({ review: base, parsed, resumeText: '', coverText: 'I led a team.' }).unsupported).toEqual(['I led a team.'])
  })
})

describe('打分', () => {
  it('效果图口径:5/7 覆盖、信全回应 = 80', () => {
    const reqs = [1, 2, 3, 4, 5].map((i) => req(i, 'r', 'c')).concat([req(6, '', '', false), req(7, '', '', false)])
    expect(scoreOf({ reqs, unsupported: [] })).toBe(80)
  })

  it('无依据一句扣 4,不低于 0', () => {
    expect(scoreOf({ reqs: [req(1, 'r', 'c')], unsupported: ['x'] })).toBe(96)
    expect(scoreOf({ reqs: [req(1, '', '')], unsupported: ['x', 'y'] })).toBe(0)
  })
})

// 2026-11-10 Frank「第二次让用户补齐信息 再修复 要不然 白花钱」:核对完不再自动打回重写(retryStepOf 撤)。
// 探针:runAudit 的 next 改回按漏写打回 → 下面这条红。
describe('核对完不自动打回', () => {
  it('有依据但简历和求职信都没写到:核对那一步照样收尾(next 为空),只调一次模型,照实标成没写到', async () => {
    const start = review([req(1, '', ''), req(2, '', '', false)])
    const row = { id: 1, status: 'draft', cover_text: 'Dear Hiring Manager, I cook.', tailor_pdf_b64: 'JVBERi0=', tailor_review: start, tailor_facts: {}, cv_name: 'Li Wei' }
    const sqls: string[] = []
    const db = {
      query: async (sql: string) => {
        sqls.push(sql)
        if (sql.startsWith('SELECT')) {
          return { rows: [row], rowCount: 1 }
        }
        return { rows: [], rowCount: 1 }
      },
    }
    let calls = 0
    const deps = {
      complete: async () => {
        calls += 1
        return JSON.stringify({ items: [{ id: 1, basis: true, resume: '', cover: '' }, { id: 2, basis: false, resume: '', cover: '' }], unsupported: [] })
      },
      parse: (s: string) => JSON.parse(s),
      cvPdf: async () => ({ bytes: null, text: '' }),
      pdfText: async () => 'Li Wei. Line cook.',
      coverSystem: () => '',
      coverClean: (s: string) => s,
      markTrial: async () => undefined,
    }
    const out = await runStep({
      db: db as never, userId: 1, jobId: 42, step: 'audit', title: 'Cook', company: 'Pie Wood', name: 'Li Wei', jd: 'J1 J2', resumeId: 1,
      base: 'Li Wei. Line cook.', newFacts: {}, both: false, regen: false, fix: 0, deps: deps as never,
    })
    expect(out.error).toBe('')
    expect(out.next).toBe('')
    expect(calls).toBe(1)
    expect(out.review?.reqs.map((r) => [r.id, r.basis, r.resume, r.cover])).toEqual([[1, true, '', ''], [2, false, '', '']])
  })
})

describe('事实核对', () => {
  const base = 'Cook 2018 - 2021. Software 2021 - 2025. 150 meals.'

  it('新增数字拦,基础里有的放行', () => {
    expect(newNumbersOf({ text: 'Cooked 150 meals in 2018', base })).toEqual([])
    expect(newNumbersOf({ text: 'Cooked 900 meals', base })).toEqual(['900'])
  })

  it('年限不超过简历跨度放行,超过的拦', () => {
    expect(newNumbersOf({ text: '3 years of experience', base })).toEqual([])
    expect(newNumbersOf({ text: '15 years of experience', base })).toEqual(['15'])
  })

  it('丢掉一段经历的年份要报', () => {
    expect(droppedYearsOf({ text: 'Cook 2018 - 2021', base })).toEqual(['2025'])
    expect(droppedYearsOf({ text: 'Cook 2018 - 2021, then 2025', base })).toEqual([])
  })
})
