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
import {
  drawCardOf, hitStreamsOf, pnpCellActiveOf, qcCellNameOf, qcGateCardsOf, quotaCardOf,
} from '@/components/pnp/functions'
import type { PnpDraw, PnpFactsIndex, PnpJob, PnpOps, PnpReq, QcChannel } from '@/components/pnp/types'
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
    kind: 'all', scope: '', scopeZh: '', scopeKo: '', authorities: [],
  },
  {
    key: 'pstq-3', program: 'PSTQ', stream: 'Stream 3: Regulated professions',
    title: 'Skilled Worker Selection Program (PSTQ) – Stream 3: Regulated professions',
    kind: 'partlyRegulated',
    scope: 'in the construction sector only, welders and pressure vessel welders, and, outside construction, pressure vessel welders and welders performing regulated tasks',
    scopeZh: '建筑业仅限焊工与压力容器焊工;建筑业以外仅限压力容器焊工与从事受监管作业的焊工',
    scopeKo: '건설업은 용접공과 압력용기 용접공만, 건설업 외는 압력용기 용접공과 규제 작업 용접공만 해당',
    authorities: ['Commission de la construction du Québec', 'CWB (Bureau canadien de soudage)'],
  },
  {
    key: 'peq-tfw', program: 'PEQ', stream: 'PEQ – Travailleurs étrangers temporaires',
    title: "Programme de l'expérience québécoise (PEQ) – Travailleurs étrangers temporaires",
    kind: 'all', scope: '', scopeZh: '', scopeKo: '', authorities: [],
  },
]

/** 魁省一岗(只填门槛卡与格子读的格) */
function jobOf(noc: string, teer: number): PnpJob {
  return {
    id: 1, province: 'QC', noc, teer, pnpEligible: false, pnpStream: '', pnpBlocks: [] as string[], eeCategory: '', company: '',
    aip: false, salaryAnnual: null, wageMedAnnual: null,
  } as PnpJob
}

/** 事实索引(只填魁省那一格) */
function indexOf(qc: Record<string, string>): PnpFactsIndex {
  return { draws: [], lists: [], excluded: [], priority: [], defaults: [], gated: [], qc }
}

const t = makeT('zh')

describe('魁省门槛卡:焊工金标', () => {
  const cards = qcGateCardsOf({ t, lang: 'zh', job: jobOf('72106', 2), reqs: REQS, channels: WELDER })

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

  it('通道 3:适用写中文译文、执照灰字列监管机构;不挂经验与学历', () => {
    const c = at(cards, 1)
    expect(c.rows.map(r => r.label)).toEqual(['适用', '执照', '法语', '年龄', '自给', '配偶'])
    expect(at(c.rows, 0).lines).toEqual([at(WELDER, 1).scopeZh])
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
    const cards = qcGateCardsOf({ t, lang: 'zh', job: jobOf('72106', 2), reqs: [...REQS, foreign], channels: [at(WELDER, 0)] })
    const age = at(cards, 0).rows.find(r => r.label === '年龄')
    expect(age?.lines).toEqual(['18 岁以上'])
  })

  it('TEER 4 的岗落受监管通道:法语只剩口语低档(TEF 300)', () => {
    const cards = qcGateCardsOf({ t, lang: 'zh', job: jobOf('33102', 4), reqs: REQS, channels: [at(WELDER, 1)] })
    const fr = at(cards, 0).rows.find(r => r.label === '法语')
    expect(fr?.lines).toEqual(['TEF 口语 300 分起'])
    expect(fr?.notes).toEqual(['魁省口语 5 级', 'TCF 听 300、说 6 分起'])
  })

  it('适用行跟界面语言:英文照录官方原文、韩文写韩文译文', () => {
    const en = qcGateCardsOf({ t: makeT('en'), lang: 'en', job: jobOf('72106', 2), reqs: REQS, channels: [at(WELDER, 1)] })
    const ko = qcGateCardsOf({ t: makeT('ko'), lang: 'ko', job: jobOf('72106', 2), reqs: REQS, channels: [at(WELDER, 1)] })
    expect(at(at(en, 0).rows, 0).lines).toEqual([at(WELDER, 1).scope])
    expect(at(at(ko, 0).rows, 0).lines).toEqual([at(WELDER, 1).scopeKo])
  })

  it('一行门槛都挑不到的通道不出卡', () => {
    const ghost: QcChannel = { ...at(WELDER, 0), stream: 'Stream 9: nothing' }
    expect(qcGateCardsOf({ t, lang: 'zh', job: jobOf('72106', 2), reqs: REQS, channels: [ghost] })).toHaveLength(0)
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

// 2026-09-30 Frank「和其他省保持一致吧」:魁省抽选卡 / 配额卡照九省。金标手写自当天 data/mart/pnp_draws.json 魁省 09-24 那一轮
// 与 qc-stats.json 的 2026 甄选计划(官方计划数是区间,原数照写)。
describe('魁省抽选卡与配额卡', () => {
  const QC_SRC = 'https://www.quebec.ca/en/immigration/permanent/skilled-workers/skilled-worker-selection-program/invitation/2026'

  /** 魁省一行抽选(只填卡读的格) */
  function qcDraw(stream: string, streamZh: string, score: number | null, invitations: number): PnpDraw {
    return {
      province: 'QC', kind: 'draw', drawDate: '2026-09-24', stream, streamZh, score, invitations, note: '', label: 'PSTQ',
      url: QC_SRC, selection: '', program: 'PSTQ', unit: 'invitation', invitationsBelow: null,
    }
  }

  const draws: PnpDraw[] = [
    qcDraw('Stream 1: Highly qualified and specialized skills', '高技能专才通道', 634, 86),
    qcDraw('Stream 2: Intermediate and manual skills', '中低技能通道', 611, 316),
    qcDraw('Stream 3: Regulated professions', '受监管职业通道', 380, 110),
  ]
  const hits = hitStreamsOf({ channel: null, qcChannels: WELDER })

  it('高亮的组 = 本岗能走的 PSTQ 通道;PEQ 不抽选不算', () => {
    expect(hits).toEqual(['Stream 1: Highly qualified and specialized skills', 'Stream 3: Regulated professions'])
    expect(hitStreamsOf({ channel: null, qcChannels: [at(WELDER, 2)] })).toEqual([])
  })

  it('抽选卡:按官方通道分组,焊工两组高亮排前、灰字与门槛卡同名,中低技能收进其余;轮次标签 PSTQ', () => {
    const card = drawCardOf({ t, lang: 'zh', province: 'QC', draws, hitStreams: hits, genDraw: '', ops: [], reqs: [], year: '2026' })
    expect(card?.label).toBe('PSTQ')
    expect(card?.hits.map(g => [g.key, g.sub, g.score])).toEqual([
      ['Stream 1: Highly qualified and specialized skills', 'PSTQ 高技能专才通道', '最低 634 分'],
      ['Stream 3: Regulated professions', 'PSTQ 受监管职业通道', '最低 380 分'],
    ])
    expect(card?.others.map(g => g.key)).toEqual(['Stream 2: Intermediate and manual skills'])
    expect(card?.source?.href).toBe(QC_SRC)
  })

  it('配额卡:总数写甄选计划区间原文,不折成一个数;没有全年合计就只这一列', () => {
    const plan: PnpOps = {
      province: 'QC', metric: 'allocation', scopeKind: '', streamKey: '', scope: '', value: null, valueText: '32,600–35,600',
      asOf: '', period: '2026', url: 'https://cdn-contenu.quebec.ca/x.pdf',
    }
    const card = quotaCardOf({ t, province: 'QC', ops: [plan], hitStreams: hits, quotaKey: '' })
    expect(card?.title).toBe('2026 年配额')
    expect(card?.heads).toEqual(['总数'])
    expect(card?.rows.map(r => r.cells)).toEqual([['32,600–35,600']])
  })
})
