// 魁省门槛弹框(2026-09-30 Frank 看过效果图第三版「可以」「先不要解读,只要门槛」「要不都用 TEF 呢?」;设计 docs/design/魁省门槛弹框-20260929.md)。
// 性质:① 本岗职业能走几个通道就出几张卡,卡序 = 通道序;② 每张卡只挑魁省、本通道流的门槛行,PSTQ 各卡另挂一般条件,PEQ 卡不挂;
//       ③ 标了 TEER 档的行只留管得着本岗的那一档(受监管通道的法语按 TEER 分两档);④ 法语主写 TEF,灰字魁省级数与 TCF(听说读写分开);
//       ⑤ 格子写第一个通道的名字、有通道才可点,对照表里没有的职业照旧写「魁省」不可点。
// 金标:焊工(NOC 72106,TEER 2)三张卡的行名与关键行,手写自 2026-09-30 的门槛表(仓里的 raw/pnp/qc-req.json / qc-peq-req.json,
// 真文件)与 mart 汇装的焊工通道。探针:别省同名流的行不串进来;PSTQ 一般条件不挂到 PEQ 卡;TEER 4 的岗落受监管通道的低档法语。
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

// 测试例外:域内函数直接点文件(桶只走门的规矩不管测试)
import { pnpCellActiveOf, qcCellNameOf, qcGateCardsOf } from '@/components/pnp/functions'
import type { PnpFactsIndex, PnpJob, PnpReq, QcChannel } from '@/components/pnp/types'
import { makeT } from '@/lib/i18n'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** 门槛表一行的原样(etl/pnp/qc 写的格子,只列用到的) */
type RawReq = {
  stream: string
  subject: string
  factor: string
  op: string
  value: number | null
  unit: string
  appliesTeer: number[] | string
  basis: string
  url: string
}

/** 仓里的门槛表 → 弹框拿到的门槛行(形同 lib/jobs toPnpReqRow:appliesTeer 逗号串,缺格空串) */
function reqsOf(name: string, program: string): PnpReq[] {
  const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../data/raw/pnp/${name}.json`), 'utf8'))
  const out: PnpReq[] = []
  for (const r of raw.requirements as RawReq[]) {
    let teer = ''
    if (Array.isArray(r.appliesTeer)) {
      teer = r.appliesTeer.join(',')
    }
    out.push({
      province: 'QC', stream: r.stream, subject: r.subject, factor: r.factor, op: r.op, value: r.value, unit: r.unit,
      appliesTeer: teer, appliesNoc: '', excludesNoc: '', appliesArea: '', appliesCondition: '', basis: r.basis, url: r.url,
      program,
    })
  }
  return out
}

/** 取第 i 项,越界直接抛(测试里下标写死,越界就是金标错了) */
function at<T>(xs: T[], i: number): T {
  const v = xs[i]
  if (v === undefined) {
    throw new Error(`no item ${i}`)
  }
  return v
}

const REQS: PnpReq[] = [...reqsOf('qc-req', 'PSTQ'), ...reqsOf('qc-peq-req', 'PEQ')]

/** 焊工的三个通道(mart 汇装 qc_noc_streams 那一行,手写) */
const WELDER: QcChannel[] = [
  {
    key: 'pstq-1', program: 'PSTQ', stream: 'Stream 1: Highly qualified and specialized skills',
    title: 'Skilled Worker Selection Program (PSTQ) – Stream 1: Highly qualified and specialized skills',
    kind: 'all', scope: '', authorities: [],
  },
  {
    key: 'pstq-3', program: 'PSTQ', stream: 'Stream 3: Regulated professions',
    title: 'Skilled Worker Selection Program (PSTQ) – Stream 3: Regulated professions',
    kind: 'partlyRegulated',
    scope: 'in the construction sector only, welders and pressure vessel welders, and, outside construction, pressure vessel welders and welders performing regulated tasks',
    authorities: ['Commission de la construction du Québec', 'CWB (Bureau canadien de soudage)'],
  },
  {
    key: 'peq-tfw', program: 'PEQ', stream: 'PEQ – Travailleurs étrangers temporaires',
    title: "Programme de l'expérience québécoise (PEQ) – Travailleurs étrangers temporaires",
    kind: 'all', scope: '', authorities: [],
  },
]

/** 魁省一岗(只填门槛卡与格子读的格) */
function jobOf(noc: string, teer: number): PnpJob {
  return {
    id: 1, province: 'QC', noc, teer, pnpEligible: false, pnpStream: '', pnpBlock: '', eeCategory: '', company: '',
    aip: false, salaryAnnual: null, wageMedAnnual: null,
  } as PnpJob
}

/** 事实索引(只填魁省那一格) */
function indexOf(qc: Record<string, string>): PnpFactsIndex {
  return { draws: [], lists: [], excluded: [], defaults: [], gated: [], qc }
}

const t = makeT('zh')

describe('魁省门槛卡:焊工金标', () => {
  const cards = qcGateCardsOf({ t, job: jobOf('72106', 2), reqs: REQS, channels: WELDER })

  it('三个通道三张卡,卡序 = 通道序,标题官方原名、灰字界面语言名', () => {
    expect(cards.map(c => c.title)).toEqual(WELDER.map(c => c.title))
    expect(cards.map(c => c.sub)).toEqual(['PSTQ 高技能专才通道', 'PSTQ 受监管职业通道', 'PEQ 临时工分支'])
  })

  it('通道 1:职业档 / 法语 / 经验 / 学历 / 年龄 / 自给 / 配偶;法语主写 TEF,灰字魁省级数与 TCF 听说读写', () => {
    const c = at(cards, 0)
    expect(c.rows.map(r => r.label)).toEqual(['职业档', '法语', '工作经验', '学历', '年龄', '自给', '配偶'])
    const fr = at(c.rows, 1)
    expect(fr.lines).toEqual(['TEF 口语 400、书面 300 分起'])
    expect(fr.notes).toEqual(['魁省口语 7 级、书面 5 级', 'TCF 听 400、说 10、读 300、写 6 分起'])
    expect(at(c.rows, 0).lines).toEqual(['TEER 0–2'])
    expect(at(c.rows, 2).lines).toEqual(['近 5 年内至少 12 个月'])
    expect(at(c.rows, 6).lines).toEqual(['法语口语 4 级'])
    expect(at(c.rows, 6).notes).toEqual(['TEF 口语 260 分起'])
  })

  it('通道 3:适用写官方原文、执照灰字列监管机构;不挂经验与学历', () => {
    const c = at(cards, 1)
    expect(c.rows.map(r => r.label)).toEqual(['适用', '执照', '法语', '年龄', '自给', '配偶'])
    expect(at(c.rows, 0).lines).toEqual([at(WELDER, 1).scope])
    expect(at(c.rows, 1).notes).toEqual(['Commission de la construction du Québec、CWB (Bureau canadien de soudage)'])
    expect(at(c.rows, 2).lines).toEqual(['TEF 口语 400、书面 300 分起'])
  })

  it('PEQ 临时工:经验灰字全职口径、收件条件与收件期;不挂 PSTQ 一般条件(没有自给)', () => {
    const c = at(cards, 2)
    expect(c.rows.map(r => r.label)).toEqual(['职业档', '法语', '工作经验', '收件条件', '收件期', '年龄', '配偶'])
    expect(at(c.rows, 0).lines).toEqual(['TEER 0–3'])
    expect(at(c.rows, 1).lines).toEqual(['TEF 口语 400 分起'])
    expect(at(c.rows, 2).lines).toEqual(['近 36 个月内至少 24 个月'])
    expect(at(c.rows, 2).notes).toEqual(['在魁省全职,每周 30 小时以上'])
    expect(at(c.rows, 3).lines).toEqual(['2025-11-19 前在魁省做满 24 个月 TEER 0–3 工作'])
    expect(at(c.rows, 4).lines).toEqual(['2026-07-02 至 2026-10-31'])
  })
})

describe('魁省门槛卡:挑行与分档', () => {
  it('探针:别省同名流的行不串进来', () => {
    const foreign: PnpReq = { ...at(REQS, 0), province: 'ON', program: 'PNP', stream: at(WELDER, 0).stream, factor: 'age', value: 99 }
    const cards = qcGateCardsOf({ t, job: jobOf('72106', 2), reqs: [...REQS, foreign], channels: [at(WELDER, 0)] })
    const age = at(cards, 0).rows.find(r => r.label === '年龄')
    expect(age?.lines).toEqual(['18 岁以上'])
  })

  it('TEER 4 的岗落受监管通道:法语只剩口语低档(TEF 300)', () => {
    const cards = qcGateCardsOf({ t, job: jobOf('33102', 4), reqs: REQS, channels: [at(WELDER, 1)] })
    const fr = at(cards, 0).rows.find(r => r.label === '法语')
    expect(fr?.lines).toEqual(['TEF 口语 300 分起'])
    expect(fr?.notes).toEqual(['魁省口语 5 级', 'TCF 听 300、说 6 分起'])
  })

  it('一行门槛都挑不到的通道不出卡', () => {
    const ghost: QcChannel = { ...at(WELDER, 0), stream: 'Stream 9: nothing' }
    expect(qcGateCardsOf({ t, job: jobOf('72106', 2), reqs: REQS, channels: [ghost] })).toHaveLength(0)
  })
})

describe('魁省格子', () => {
  const index = indexOf({ '72106': 'pstq-1', '31301': 'pstq-3', '63200': 'pstq-2' })
  const blocked = { pnp: new Set<string>(), aip: new Set<string>() }

  it('写第一个通道的名字;对照表里没有的职业照旧「魁省」', () => {
    expect(qcCellNameOf({ t, noc: '72106', index })).toBe('PSTQ 高技能')
    expect(qcCellNameOf({ t, noc: '31301', index })).toBe('PSTQ 受监管')
    expect(qcCellNameOf({ t, noc: '99999', index })).toBe('魁省')
  })

  it('有通道才可点', () => {
    expect(pnpCellActiveOf({ job: jobOf('72106', 2), blocked, index })).toBe(true)
    expect(pnpCellActiveOf({ job: jobOf('99999', 2), blocked, index })).toBe(false)
  })

  it('三语格子文案都有(英 / 韩不回落成键名)', () => {
    expect(qcCellNameOf({ t: makeT('en'), noc: '72106', index })).toBe('PSTQ Highly skilled')
    expect(qcCellNameOf({ t: makeT('ko'), noc: '72106', index })).toBe('PSTQ 고숙련')
  })
})
