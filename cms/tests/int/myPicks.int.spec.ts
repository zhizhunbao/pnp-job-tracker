// 「我的求职」今日推荐(2026-10-10 批 2,docs/design/我的/我的求职-20261009.md 第 3 节 15b / 16c / 16d;lib/myjobs 的推荐段 +
// myjobs 组件桶的 Picks)。dev 直连生产库不碰库:SQL 只核文本,组件用 fetch 桩。
// 性质:① 理由只放真的:在「投过同组 × 收藏同组 × 能走省提名 × 高于中位 × 省」全格上穷举 —— 投过同组出 occ、否则收藏同组出 saved
//          (两枚不同时出)、能走省提名且省有 PNP 简称才出 pnp(QC / 空省不出)、高于中位才出 wage,顺序固定;
//       ② 免费号:看得见前 3 条,「更多」= 其余条数,锁住的最多 2 条且**只有** title / reasons / program 三键(公司、地址、薪资、职位号
//          一概不下发);Pro:全给,更多 0、锁住空 —— 在 0~12 条的全长度上穷举;
//       ③ 今天新碰过的岗从缓存的推荐里剔掉,其余顺序不变;
//       ④ 地点一行照 Indeed:有精确地址用它,没有写「市, 省码」,只有一样写那一样;
//       ⑤ SQL:硬条件(在架、有投递邮箱、没碰过、没退信、30 天同邮箱)都在;排序键依次 = 能走省提名 → 通道档 → 发布日期 → 高于中位;
//       ⑥ 组件:免费号推荐多时出「更多推荐」卡(锁住那条的职位名看得见,假字纹理不是任何真公司名);Pro 不出;理由胶囊按码出字,
//          认不得的码不出;接口失败出「刷新再试」。
// 2026-10-11 Frank「OINP 很长时间没有捞人了」→「90 天可以」:① 再穷举「档案想做的工作同组 × 本省 offer 类通道近 90 天抽过」——
//          想做的工作同组也出 occ;过了 90 天的省不出 pnp;⑤ 能走省提名 / 通道档两个排序键都只对没过期的省生效(stale 子查询),
//          天数 = PICKS_DRAW_DAYS(90)作 $4 交给库;⑦ 答过档案后重拉带 fresh=1(不吃当天缓存)。
// 2026-10-11 晚 Frank「可以,按你说的改」(草稿被当成投过):① 改成档案命中出 occ、否则收藏命中出 saved、否则真发出去的投递命中出 applied,
//          一岗只出一枚;④ 地点一行的金标搬去 placeLine.int.spec.ts(placeLineOf 收进 lib/location);
//          ⑧ SQL:档案答了就不按收藏 / 投递选岗(两组套 cardinality(want.g) = 0)、投递只算 sent / replied、比对完整 5 位 NOC(不再 left(noc, 4))。
// 探针:reasonsOf 去掉 else(occ 与 saved 同出)→ ① 红;picksViewOf 锁住行抄整行 → ②「只有三键」红;dropTouchedOf 不剔 → ③ 红;
//       ORDER BY 里 date_posted 挪到 pnp_eligible 前 → ⑤ 红;Picks 对 Pro 也出更多卡 → ⑥ 红。
// 2026-11-07 「我的」新域重写(docs/design/我的/我的框架-20261107.md;myjobs 桶 → me 桶子桶 jobs / recommend / sub):
//       今日推荐从单独一张卡(Picks)变成「我的求职」整页正文 JobsBody 的默认页签 —— ⑥ 卡头「mj.picks + 数字」改断言页签字;
//       效果图撤推荐表的发布日期列(⑥ 原「出 2026-10-10」改断言「不出」);一行只留「投递」,「删除」(不再推)撤 —— ⑥ 加一条断言钮恰好一颗;
//       新岗推送(Push)挪进「我的订阅」(子桶 sub 的 SubBody / useSub);重拉从「按 gen 整卡重挂」改成「gen 变了推荐与我的投递重拉」(⑨ 新加)。
//       ②c 夹具对上现行 PathwayFits(原数组字面量推成联合,tsc 7 红)。lib 层(①~⑤⑧)不动。
//       探针:usePicks 依赖里漏 gen → ⑨ 红;useJobs 把 gen 也递给我的收藏 → ⑨ 红;pickColsOf 加回发布日期列 → ⑥ 红;
//       pickRowOf 的 act 拿 jobId 以外的号 → ⑥「投递」那条红。
// 2026-11-07 Frank「现在都按 Azure 的来」(me 桶子桶 jobs 五处改):
//       ⑥ 打码行与盖在上面的大钮撤 —— 免费号锁住的不再并进表、「显示更多」不再算锁住的,改在表下一行出「mj.lockLine」+ 常规主钮
//          「mj.unlock」(N = 回包 more,锁住的全部条数;点了开定价框);Pro 两样都不出(⑥ 免费 / Pro 两条改断言,⑥c 新加);
//       ⑥b 推荐原因四码(occ / saved / applied / pnp)进表:原断言「mj.why.occ / mj.why.pnp 不出」反过来,新加一条按码出胶囊;
//       ⑥「换一批」从表上方挪到页签那一行(只在今日推荐页签出);「地址」列改「地点」列 —— 链字「市, 省码」、链址仍按完整地址查。
//       探针:unlockNOf 取 locked.length 而非 more → ⑥c「N = 7」红;hiddenPicksOf 加回 more → ⑥「没有显示更多」红;
//       WHY_KEYS 漏 occ → ⑥b 红;swapShownOf 不看页签 → ⑥「切到我的收藏不出换一批」红。
// 2026-11-11 Frank「别一次性推荐 50 个」「不需要解锁其余」(任务书第 47 条):每人每天 10 条全免费 —— ② 改断言「只给前 10 条、回包只有 picks」,
//       ②b(换一批)、⑥c(解锁一行)、Pro 那条随功能撤;⑥ 改断言 10 条全列、发布日期列回来、四颗钮都没有、表下「看全部同类职位」的去处。
//       探针:picksViewOf 不切 → ② 红;pickRowOf 的 menu 留着删除 → ⑥「没有 ⋯」红;boardHrefOf 不去重 → ⑥ 去处那条红。
// 2026-11-11 任务书第 41 到 46 条(今日推荐按目标排序 + 推荐指数;lib/myjobs 子桶 recommend):
//       ② 回包多了 fits / goal / basis / need / lowOnly;②c 原 fitsOfPick / keepFitPicksOf 并进 wayOfPick / rankPicksOf ——
//          拿 PR 时找不到通道、通道没登对照的岗也不推(原「照留」只对找工作成立),找工作一条不筛;
//       ⑤ 排序键改成「档案职业命中 → 发布日期」(只出候选池,打分在 rankPicksOf),$5 = 目标是不是拿 PR;
//          10-11 那条「过期省不加分」金标随排序键撤,换成 11-11 金标(拿 PR 只取全职长期、可提名、近 $4 天抽过的省;两种目标都不取限公民或 PR 的岗);
//       ⑩ 新加:语言纯比数字(档 × 要求全格)、工作经验只比总月数(够最低一档过;不够有别的路标核对,没有别的路不推)、
//          点了职业码的语言行优先、缺档案项报哪几项、薪资分单调且不出界、排好的行分数不升且高中档与低档不混(lowOnly 当且仅当只有低档)。
//       探针:langLineOf 把 >= 写成 > → ⑩ 语言红;workLineOf 取最高月数而非最低 → ⑩ 经验红;needClbOf 不让职业码行优先 → ⑩ 安省技工红;
//          rankPicksOf 把低档并进高中档 → ⑩ 排序红;hardLinesOf 对找不到通道的岗照留 → ②c 红。
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { JobsBody } from '@/components/me/jobs'
import { SubBody, useSub } from '@/components/me/sub'
import { SQL } from '@/lib/db'
import { PICKS_DAY, PICKS_DRAW_DAYS } from '@/lib/myjobs/constants'
// 测试例外:域内函数直接点文件(server 门只放路由与注入件)
import { entryOfCookie } from '@/lib/apply/functions'
import { dropTouchedOf, loadPicks, logPicks, picksViewOf, reasonsOf } from '@/lib/myjobs/functions'
import {
  langLineOf, needClbOf, needOf, payPartOf, rankPicksOf, resumePartOf, wayOfPick, workLineOf,
} from '@/lib/myjobs/recommend/functions'
import type { PathwayFitFact, PathwayFits, PickProfile, ReqFact } from '@/lib/myjobs/recommend/types'
import type { PickRow } from '@/lib/myjobs/types'

const PROVS = ['ON', 'BC', 'QC', ''] as const
const BOOLS = [true, false] as const

function row(id: number): PickRow {
  return {
    id, title: 'job ' + id, titleZh: '', titleKo: '', company: 'Secret Co ' + id, companyZh: '', companyKo: '',
    companySlug: 'secret-co-' + id, address: '1 Hidden St ' + id, city: 'Toronto', cityZh: '', cityKo: '', province: 'ON',
    salary: '$' + id + '/hr', datePosted: '2026-10-10T00:00:00.000Z', reasons: ['pnp'], program: 'OINP', hours: 'full',
    term: 'permanent', validThrough: '', pnpStream: '', pnpEligible: true, provDefault: true, abovePct: null,
    wageMedHourly: null, lmiaPositions: 0, eeCategory: '', drawLast: '', pilot: '',
    teer: 3, noc: '63200', occWant: true, occSimilar: false, designated: false,
  }
}

function profile(p: Partial<PickProfile>): PickProfile {
  return { who: 'pgwp', edu: [], goal: 1, clb: 4, totalExp: 4, prov: 'ON', city: 'Toronto', hasOcc: true, ...p }
}

function req(p: Partial<ReqFact>): ReqFact {
  return { province: 'ON', stream: 's', lang: true, value: 4, teers: [], nocs: [], unsure: false, label: 'label', ...p }
}

describe('推荐理由', () => {
  it('① 只放真的,全格穷举', () => {
    // 2026-10-12「整点有吸引力的 bullets」:多 lmia / ee / aip 三格,顺序改成 省提名 → 薪资 → LMIA → EE → AIP → 职业三选一 → 全职长期
    for (const occApplied of BOOLS) {
      for (const occSaved of BOOLS) {
        for (const occWant of BOOLS) {
          for (const pnp of BOOLS) {
            for (const offerActive of BOOLS) {
              for (const aboveMed of BOOLS) {
                for (const province of PROVS) {
                  {
                    for (const lmia of BOOLS) {
                      for (const ee of BOOLS) {
                        for (const aip of BOOLS) {
                          for (const pilot of BOOLS) {
                          for (const known of BOOLS) {
                          const r = reasonsOf({
                            occApplied, occSaved, occWant, pnp, offerActive, aboveMed, province, lmia, ee, aip,
                            pilot, known,
                          })
                          const want: string[] = []
                          if (pnp && offerActive && (province === 'ON' || province === 'BC')) {
                            want.push('pnp')
                          }
                          if (aboveMed) {
                            want.push('wage')
                          }
                          if (lmia) {
                            want.push('lmia')
                          }
                          if (ee) {
                            want.push('ee')
                          }
                          if (aip) {
                            want.push('aip')
                          }
                          if (pilot) {
                            want.push('pilot')
                          }
                          if (known) {
                            want.push('known')
                          }
                          if (occWant) {
                            want.push('occ')
                          } else if (occSaved) {
                            want.push('saved')
                          } else if (occApplied) {
                            want.push('applied')
                          }
                          expect(r).toEqual(want)
                          expect(r.filter((c) => c === 'occ' || c === 'saved' || c === 'applied').length <= 1).toBe(true)
                          }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })

  it('金标(2026-10-11):ON 能走省提名、但 offer 类通道 90 天没抽 → 不出 pnp;BC 抽过 → 出', () => {
    const base = { occApplied: false, occSaved: false, occWant: false, pnp: true, aboveMed: false, lmia: false, ee: false, aip: false, pilot: false, known: false }
    expect(reasonsOf({ ...base, province: 'ON', offerActive: false })).toEqual([])
    expect(reasonsOf({ ...base, province: 'BC', offerActive: true })).toEqual(['pnp'])
  })
})

describe('每天 10 条', () => {
  it('② 不分免费与会员:只给前 PICKS_DAY 条;推荐指数与行同序同长,其余几格原样带出(2026-11-11 任务书第 46、47 条)', () => {
    expect(PICKS_DAY).toBe(10)
    for (let n = 0; n <= 15; n++) {
      const rows = Array.from({ length: n }, (_, i) => row(i + 1))
      const fits = rows.map((r) => ({ level: 'high', goal: 'job', score: r.id, hard: [], soft: [] }))
      expect(picksViewOf({ rows, fits, goal: 'job', basis: true, need: [], lowOnly: false })).toEqual({
        picks: rows.slice(0, PICKS_DAY), fits: fits.slice(0, PICKS_DAY), goal: 'job', basis: true, need: [], lowOnly: false,
      })
    }
  })

  it('②c 按「我的通道」筛(2026-10-13;2026-11-11 并进推荐指数):具名通道对职位板标签、可提名没具名的对本省默认通道;拿 PR 时走不了的、找不到通道的、通道没登对照的都不推,院校条件看教育经历;找工作一条不筛', () => {
    const ab: PathwayFitFact = { key: 'ab-tech', reqStreams: [], province: 'AB', label: 'AB 科技', isDefault: false, fits: { pgwp: { can: 'no' }, open: { can: 'yes' } } }
    const on: PathwayFitFact = { key: 'on-default', reqStreams: [], province: 'ON', label: '', isDefault: true, fits: { pgwp: { can: 'yes', schools: [{ prov: 'own' }] } } }
    const bcWay: PathwayFitFact = { key: 'bc-default', reqStreams: [], province: 'BC', label: '', isDefault: true, fits: null }
    const ways: PathwayFits = [ab, on, bcWay]
    const named = { ...row(1), province: 'AB', pnpStream: 'AB 科技' }
    const onDefault = { ...row(2), province: 'ON' }
    const bc = { ...row(3), province: 'BC' }
    const notPnp = { ...row(4), province: 'ON', pnpEligible: false }
    const unknown = { ...row(5), province: 'AB', pnpStream: 'AB 没登的' }
    expect(wayOfPick({ row: named, ways })).toBe(ab)
    expect(wayOfPick({ row: onDefault, ways })).toBe(on)
    expect(wayOfPick({ row: notPnp, ways })).toBeNull()
    expect(wayOfPick({ row: unknown, ways })).toBeNull()
    const rows = [named, onDefault, bc, notPnp, unknown]
    const ids = (goal: string, f: { who: string, edu: string[] }) => rankPicksOf({
      rows, ways, reqs: [], matches: [], profile: profile(f), goal, prov: 'ON',
    }).rows.map((r) => rows[r.at]?.id).sort()
    // 毕业工签、安省读的书:AB 科技走不了;安省默认通道要本省院校 —— 对上了留;BC 没登对照、另两条找不到通道,都不推
    expect(ids('pr', { who: 'pgwp', edu: ['ON.public.y1'] })).toEqual([2])
    // 毕业工签、外省读的书:安省默认通道的本省院校条件对不上
    expect(ids('pr', { who: 'pgwp', edu: ['BC.public.y2'] })).toEqual([])
    // 教育经历没填:院校条件不筛(同「我的通道」卡),学历那一格标需自行核对
    const blank = rankPicksOf({ rows, ways, reqs: [], matches: [], profile: profile({ who: 'pgwp', edu: [] }), goal: 'pr', prov: 'ON' }).rows
    expect(blank.map((r) => rows[r.at]?.id)).toEqual([2])
    expect(blank[0]?.fit.hard.find((l) => l.key === 'edu')).toMatchObject({ tag: 'check', note: 'blank' })
    // 开放工签:AB 对照里有这一格且能走;安省对照里没这一格(本站未核)照留
    expect(ids('pr', { who: 'open', edu: [] })).toEqual([1, 2])
    // 找工作:不看省提名,一条不筛,也没有硬性条件各项
    const job = rankPicksOf({ rows, ways, reqs: [], matches: [], profile: profile({ who: '' }), goal: 'job', prov: 'ON' }).rows
    expect(job.map((r) => rows[r.at]?.id).sort()).toEqual([1, 2, 3, 4, 5])
    expect(job.every((r) => r.fit.hard.length === 0 && r.fit.goal === 'job')).toBe(true)
  })

  it('⑩ 语言纯比数字:本人 CLB × 要求全格,够才过;官方写明不要求算过;没有适用行这一格不出,先标核对的通道出核对', () => {
    for (let mine = 0; mine <= 10; mine++) {
      for (const need of [4, 5, 6, 7]) {
        const line = langLineOf({ reqs: [req({ value: need })], mine, check: false })
        expect(line?.tag).toBe(mine >= need ? 'pass' : 'fail')
      }
      expect(langLineOf({ reqs: [req({ value: null })], mine, check: false })).toMatchObject({ tag: 'pass', note: 'free' })
    }
    expect(langLineOf({ reqs: [], mine: 9, check: false })).toBeNull()
    expect(langLineOf({ reqs: [], mine: 9, check: true })).toMatchObject({ tag: 'check', note: 'self' })
  })

  it('⑩ 金标:点了职业码的语言行优先 —— 安省 TEER 0 到 3 要 CLB 6、技工类 CLB 5;阿省护工 33102 要 CLB 7', () => {
    expect(needClbOf([req({ value: 6, teers: ['0', '1', '2', '3'] }), req({ value: 5, nocs: ['72', '73'] })])).toBe(5)
    expect(needClbOf([req({ value: 5, teers: ['0', '1', '2', '3'] }), req({ value: 7, nocs: ['33102'] })])).toBe(7)
    expect(needClbOf([req({ value: 5 }), req({ value: 4 })])).toBe(5)
    expect(needClbOf([])).toBeNull()
  })

  it('⑩ 工作经验只比总月数:够最低一档就过;不够、有档案分不出的路标核对并带官方原文;不够又没别的路不推;一行都没有不出', () => {
    const lines = [req({ lang: false, value: 24 }), req({ lang: false, value: 12 })]
    const alt = req({ lang: false, value: 6, unsure: true, label: '6 months with the same employer' })
    for (const mine of [0, 6, 12, 24, 36, 48, 60]) {
      expect(workLineOf({ reqs: lines, mine, check: false })?.tag).toBe(mine >= 12 ? 'pass' : 'fail')
      const withAlt = workLineOf({ reqs: [...lines, alt], mine, check: false })
      expect(withAlt?.tag).toBe(mine >= 12 ? 'pass' : 'check')
      if (mine < 12) {
        expect(withAlt?.vars).toEqual({ text: '6 months with the same employer' })
      }
      expect(workLineOf({ reqs: [alt], mine, check: false })?.tag).toBe('check')
    }
    expect(workLineOf({ reqs: [], mine: 60, check: false })).toBeNull()
    expect(workLineOf({ reqs: [], mine: 60, check: true })).toMatchObject({ tag: 'check', note: 'self' })
  })

  it('⑩ 拿 PR 缺档案项:身份没答、语言没答、工作年限没答或不清楚,各报各的;都答了不报', () => {
    expect(needOf(profile({ who: '', clb: 0, totalExp: 0 }))).toEqual(['who', 'clb', 'exp'])
    expect(needOf(profile({ totalExp: 9 }))).toEqual(['exp'])
    expect(needOf(profile({ clb: 1, totalExp: 1 }))).toEqual([])
  })

  it('⑩ 薪资分随高出中位的幅度单调不降、不出 0 到 100;缺数据是一半且结论写未知', () => {
    let last = -1
    for (let pct = -60; pct <= 60; pct++) {
      const s = payPartOf(pct).score
      expect(s).toBeGreaterThanOrEqual(last)
      expect(s).toBeGreaterThanOrEqual(0)
      expect(s).toBeLessThanOrEqual(100)
      last = s
    }
    expect(payPartOf(20).score).toBe(100)
    expect(payPartOf(-20).score).toBe(0)
    expect(payPartOf(null)).toMatchObject({ score: 50, line: { tag: 'none', note: 'none' } })
  })

  it('⑫ 简历匹配(2026-11-11 任务书第 44 条):分数随命中率单调不降、到 50% 满分、不出 0 到 100;有匹配的岗匹配项是「简历匹配」并盖过职业对口,没有的照旧「职业对口」', () => {
    let last = -1
    for (let hit = 0; hit <= 100; hit++) {
      const s = resumePartOf({ id: 1, hit, total: 100 }).score
      expect(s).toBeGreaterThanOrEqual(last)
      expect(s).toBeLessThanOrEqual(100)
      last = s
    }
    expect(resumePartOf({ id: 1, hit: 50, total: 100 }).score).toBe(100)
    expect(resumePartOf({ id: 1, hit: 25, total: 100 }).score).toBe(50)
    expect(resumePartOf({ id: 1, hit: 0, total: 0 }).score).toBe(0)
    expect(resumePartOf({ id: 1, hit: 9, total: 21 }).line).toMatchObject({ key: 'resume', note: 'hit', vars: { hit: '9', all: '21' } })
    const rows = [row(1), row(2)]
    const out = rankPicksOf({
      rows, ways: [], reqs: [], matches: [{ id: 2, hit: 45, total: 100 }, { id: 1, hit: 30, total: 100 }],
      profile: profile({ who: '' }), goal: 'job', prov: 'ON',
    })
    expect(out.rows.map((r) => rows[r.at]?.id)).toEqual([2, 1])
    expect(out.rows.map((r) => r.fit.soft[0]?.key)).toEqual(['resume', 'resume'])
    const mixed = rankPicksOf({
      rows, ways: [], reqs: [], matches: [{ id: 2, hit: 40, total: 100 }], profile: profile({ who: '' }), goal: 'job', prov: 'ON',
    })
    expect(mixed.rows.map((r) => r.fit.soft[0]?.key).sort()).toEqual(['occ', 'resume'])
  })

  it('⑩ 排好的行分数不升;高中档与低档不混,lowOnly 当且仅当只有低档;同分保持候选池先后', () => {
    const mk = (id: number, occWant: boolean, pct: number | null, province: string) => (
      { ...row(id), occWant, abovePct: pct, province }
    )
    const pool = [
      mk(1, false, -30, 'BC'), mk(2, true, 20, 'ON'), mk(3, true, 0, 'ON'), mk(4, false, null, 'BC'), mk(5, true, 20, 'ON'),
      mk(6, true, -20, 'BC'),
    ]
    for (let mask = 0; mask < 64; mask++) {
      const rows = pool.filter((_, i) => (mask >> i) % 2 === 1)
      const out = rankPicksOf({ rows, ways: [], reqs: [], matches: [], profile: profile({ who: '' }), goal: 'job', prov: 'ON' })
      const scores = out.rows.map((r) => r.fit.score)
      expect([...scores].sort((a, b) => b - a)).toEqual(scores)
      const levels = new Set(out.rows.map((r) => r.fit.level === 'low'))
      expect(levels.size).toBeLessThanOrEqual(1)
      expect(out.lowOnly).toBe(out.rows.length > 0 && out.rows.every((r) => r.fit.level === 'low'))
      const hasTop = rows.some((r) => r.occWant)
      expect(out.lowOnly).toBe(rows.length > 0 && hasTop === false)
    }
    const tie = rankPicksOf({ rows: [pool[1]!, pool[4]!], ways: [], reqs: [], matches: [], profile: profile({ who: '' }), goal: 'job', prov: 'ON' })
    expect(tie.rows.map((r) => r.at)).toEqual([0, 1])
  })

  it('⑬ 推荐记录(2026-11-11 任务书第 48 条):今天给看的每条一行,位次从 1 起、档与分照推荐指数、各项结论成 JSON;零条不写库;写失败不抛', async () => {
    const rows = [row(7), row(9)]
    const fits = [
      { level: 'high', goal: 'job', score: 88, hard: [], soft: [{ key: 'occ', tag: 'high', note: 'want', vars: {} }] },
      { level: 'mid', goal: 'job', score: 51, hard: [], soft: [] },
    ]
    const json = { picks: rows, fits, goal: 'job', basis: true, need: [], lowOnly: false }
    const seen: unknown[][] = []
    const db = { query: async (_sql: string, params: unknown[]) => { seen.push(params); return { rows: [] } } }
    await logPicks({ db: db as never, userId: 5, via: 'page', json })
    expect(seen.length).toBe(1)
    const p = seen[0]!
    expect([p[0], p[2], p[3], p[4], p[5], p[6], p[7]]).toEqual([5, 'job', 'page', [7, 9], [1, 2], ['high', 'mid'], [88, 51]])
    expect(String(p[1])).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(JSON.parse((p[8] as string[])[0]!)).toEqual({ hard: [], soft: fits[0]!.soft })
    await logPicks({ db: db as never, userId: 5, via: 'page', json: { ...json, picks: [], fits: [] } })
    expect(seen.length).toBe(1)
    const bad = { query: async () => { throw new Error('boom') } }
    await expect(logPicks({ db: bad as never, userId: 5, via: 'mail', json })).resolves.toBeUndefined()
    expect(SQL.PICK_LOG_ADD).toContain('ON CONFLICT DO NOTHING')
    expect(SQL.PICK_LOG_CLICK).toContain('clicked_at IS NULL')
    expect(SQL.APPLY_ENTRY_SET).toContain('entry IS NULL')
  })

  it('⑬ 金标:投递入口 cookie 只认「这一岗」且入口是 1 到 16 个小写字母;别的岗、没带、形不对都给空串', () => {
    expect(entryOfCookie({ cookie: 'payload-token=abc; apply_from=77.picks', jobId: 77 })).toBe('picks')
    expect(entryOfCookie({ cookie: 'apply_from=77.saved; x=1', jobId: 77 })).toBe('saved')
    expect(entryOfCookie({ cookie: 'apply_from=78.picks', jobId: 77 })).toBe('')
    expect(entryOfCookie({ cookie: 'apply_from=77.PICKS', jobId: 77 })).toBe('')
    expect(entryOfCookie({ cookie: 'xapply_from=77.picks', jobId: 77 })).toBe('')
    expect(entryOfCookie({ cookie: null, jobId: 77 })).toBe('')
  })

  it('③ 今天新碰过的岗剔掉,其余顺序不变', () => {
    const rows = [row(5), row(3), row(9), row(1)]
    expect(dropTouchedOf({ rows, touched: [3, 1, 77] }).map((r) => r.id)).toEqual([5, 9])
    expect(dropTouchedOf({ rows, touched: [] })).toEqual(rows)
  })
})

describe('推荐 SQL', () => {
  it('⑤ 硬条件都在,排序键次序固定', () => {
    const q = SQL.MYJOBS_PICKS
    for (const must of [
      "j.status = 'open'", "COALESCE(j.apply_email, '') <> ''", 'a.user_id = $1 AND a.job_id = j.id', 'bounced_emails',
      "interval '30 days'", "NULLIF(u.answers->'basic'->>'resProv', '')", 'LIMIT $3',
    ]) {
      expect(q).toContain(must)
    }
    const order = q.slice(q.indexOf('ORDER BY'))
    const keys = ['j.noc = ANY(me.want_g)', 'j.date_posted', 'j.id DESC']
    const at = keys.map((k) => order.indexOf(k))
    expect(at.every((i) => i >= 0)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })

  it('⑤ 金标(2026-11-11 任务书第 42、43 条):拿 PR 只取全职长期、可提名、近 $4 天抽过的省;所在省没抽过改取抽过的省;两种目标都不取限公民或 PR 的岗', () => {
    const q = SQL.MYJOBS_PICKS
    expect(q).toContain("$5::boolean = false OR (j.employment_hours = 'full' AND j.employment_term = 'permanent'")
    expect(q).toContain('AND j.pnp_eligible AND j.province IN (SELECT code FROM fresh)))')
    expect(q).toContain("j.eligibility_flag::text IS DISTINCT FROM 'pr_required'")
    expect(q).toContain('OR ($5::boolean AND me.strict = false AND me.prov NOT IN (SELECT code FROM fresh)))')
    expect(q).toContain("info->>'offerDrawLast' IS NOT NULL AND (info->>'offerDrawLast')::date >= current_date - $4::int")
    expect(q).toContain('(st.code IS NULL) AS offer_active')
    expect(q).toContain("u.answers->'basic'->'nocs'")
    expect(q).toContain('j.teer, j.noc')
  })

  it('⑧ 金标(2026-10-11 晚):档案答了只按它选岗;投递只算真发出去的;完整 5 位 NOC 比对', () => {
    const q = SQL.MYJOBS_PICKS
    expect(q).not.toContain('left(')
    expect(q).toContain('WHERE length(w) = 5')
    const saved = q.slice(q.indexOf('FROM saved_jobs'), q.indexOf('AS saved_g'))
    expect(saved).toContain('cardinality(want.g) + cardinality(want.b) = 0 AND want.strict = false')
    const applied = q.slice(q.indexOf('FROM applications a JOIN jobs aj'), q.indexOf('AS applied_g'))
    expect(applied).toContain("a.status IN ('sent', 'replied')")
    expect(applied).toContain('cardinality(want.g) + cardinality(want.b) = 0 AND want.strict = false')
    expect(applied).not.toContain('draft')
    expect(q).toContain('j.noc = ANY(me.saved_g || me.applied_g || me.want_g)')
    // 2026-11-08 清单第 4 条:按学历走专业落的大类;严格模式不跨省替换
    expect(q).toContain('OR j.broad = ANY(me.want_b))')
    expect(q).toContain('me.strict = false AND me.prov NOT IN (SELECT code FROM fresh)')
    expect(q).toContain("u.answers->'basic'->'workNocs'")
    expect(q).toContain('(j.noc = ANY(me.want_g) OR j.broad = ANY(me.want_b)) AS occ_want')
  })

  it('⑧ 金标:三种理由各自命中(档案 = 职业对口、收藏 = 和你收藏的同类、投递 = 和你投过的同类)', () => {
    const base = {
      occApplied: false, occSaved: false, occWant: false, pnp: false, offerActive: true, aboveMed: false, province: 'ON',
      lmia: false, ee: false, aip: false, pilot: false, known: false,
    }
    expect(reasonsOf({ ...base, occWant: true })).toEqual(['occ'])
    expect(reasonsOf({ ...base, occSaved: true })).toEqual(['saved'])
    expect(reasonsOf({ ...base, occApplied: true })).toEqual(['applied'])
  })

  it('⑤ 天数 90 作 $4 交给库;库行的 offer_active / occ_want 落到理由上', async () => {
    expect(PICKS_DRAW_DAYS).toBe(90)
    const seen: unknown[][] = []
    const dbRow = {
      id: 1, title: 'cook', province: 'ON', city: 'Toronto', pnp_eligible: true, above_med: false,
      occ_applied: false, occ_saved: false, occ_want: true, offer_active: false,
    }
    const db = {
      query: async (_sql: string, params: unknown[]) => {
        seen.push(params)
        return { rows: [dbRow, { ...dbRow, id: 2, province: 'BC', occ_want: false, offer_active: true }] }
      },
    }
    const rows = await loadPicks({ db: db as never, userId: 5, prov: 'ON', pr: false })
    expect(seen[0]).toEqual([5, 'ON', 200, 90, false])
    expect(rows.map((r) => r.reasons)).toEqual([['occ'], ['pnp']])
  })
})

const t = (k: string, v?: Record<string, string | number>) => (v == null ? k : k + JSON.stringify(v))

// jsdom 没有 matchMedia(清单按它判手机卡 / 网页表格);给一个「不是窄屏」的桩 → 走网页端表格
window.matchMedia = ((q: string) => ({
  matches: false, media: q, onchange: null, addEventListener: () => undefined, removeEventListener: () => undefined,
  addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia

function stub(reply: { status: number, body: object }) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (String(url).startsWith('/api/myjobs/picks')) {
      return { status: reply.status, ok: reply.status < 300, json: async () => reply.body }
    }
    return new Promise(() => undefined)
  }))
}

async function flush() {
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

// 2026-11-07「我的」新域重写:今日推荐不再是单独一张卡(Picks),是「我的求职」整页正文 JobsBody 的默认页签
type BodyProps = { gen: number, asked: number, tab: string }

function body(p: BodyProps) {
  return createElement(JobsBody, {
    t, tab: p.tab, plan: {}, gen: p.gen, asked: p.asked, onFill: () => undefined, openApp: () => undefined,
  })
}

async function mount(tab = 'picks') {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  await act(async () => {
    root.render(body({ gen: 0, asked: 0, tab }))
  })
  await flush()
  return el
}

// 那张白卡(当前这一项的表、显示更多、解锁一行;2026-11-09 页签挪到侧边栏)
function panelOf(el: HTMLElement) {
  return el.querySelector('section') as HTMLElement
}

const PICK = {
  id: 7, title: 'administrative assistant', titleZh: '行政助理', titleKo: '', company: 'B. M. Optical Lab Limited', companyZh: '',
  companyKo: '', companySlug: '', address: '1 Bowes Rd, Concord, ON L4K 1H4', city: 'Concord', cityZh: '', cityKo: '', province: 'ON',
  salary: '$24/hr', datePosted: '2026-10-10T00:00:00.000Z', reasons: ['occ', 'pnp', 'nope'], program: 'OINP',
  hours: 'part', term: 'seasonal', validThrough: '2026-11-09T00:00:00.000Z',
  pnpStream: '', pnpEligible: true, provDefault: true, abovePct: null, wageMedHourly: null, lmiaPositions: 0, eeCategory: '',
  drawLast: '', pilot: '',
}
afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
  // 2026-11-07:「投递」往地址栏推 `?apply=`,每条用例从干净地址起
  window.history.replaceState(null, '', '/account')
})

describe('今日推荐卡', () => {
  it('⑥ 推荐行 + 通道列 + 发布日期列;10 条全列,没有换一批、显示更多、解锁;表下「看全部同类职位」(2026-11-11 任务书第 47 条)', async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ ...PICK, id: i + 20, title: 'job ' + (i + 2) }))
    stub({ status: 200, body: { picks: [PICK].concat(many).concat([{ ...PICK, id: 40, title: 'job 10' }]) } })
    const el = await mount()
    expect(el.querySelector('[role="tab"]')).toBeNull()   // 2026-11-09:页签条撤,三项在侧边栏
    expect(el.textContent).toContain('administrative assistant')
    expect(el.textContent).toContain('job 10')   // 10 条全列,不折
    expect(el.textContent).toContain('$24/hr')
    expect(el.textContent).toContain('mj.col.posted')   // 2026-11-11:发布日期列补回
    expect(el.textContent).toContain('2026-10-10')
    expect(el.textContent).toContain('2026-11-09')   // 截止日期列
    expect(el.textContent).not.toContain('Part-time')   // 2026-10-12 推荐表不出工时 / 雇佣期两列
    expect(el.textContent).not.toContain('Seasonal')
    expect(el.textContent).not.toContain('pnp.gen.ON')   // 2026-11-11 Frank「删掉」:通道列撤
    expect(el.textContent).not.toContain('mj.col.chan')
    // 2026-11-09 Frank「推荐原因删掉」「这部分加进 table 吧」:推荐原因列撤,换职位板的「中位时薪」「vs 中位」两列
    expect(el.textContent).not.toContain('mj.why.')
    expect(el.textContent).not.toContain('mj.col.why')
    expect(el.textContent).toContain('col.wageMedHr')
    expect(el.textContent).toContain('col.vsMedian')
    expect(el.textContent).not.toContain('nope')
    expect(el.querySelector('[data-lock]')).toBeNull()   // 打码行撤
    // 2026-11-11:换一批、显示更多、解锁那一行、行末「⋯」都撤;全页的钮只剩每行的「收藏」「投递」两颗
    // (同日 Frank「这个应该加一个收藏按钮」:投递左边多一颗收藏)
    expect(el.textContent).not.toContain('mj.swap')
    expect(el.textContent).not.toContain('mj.lockLine')
    expect(el.textContent).not.toContain('mj.unlock')
    expect(Array.from(el.querySelectorAll('button')).some((x) => x.textContent?.startsWith('loadMore'))).toBe(false)
    expect(el.querySelectorAll('button[aria-label="mj.more"]').length).toBe(0)
    expect(Array.from(panelOf(el).querySelectorAll('button')).map((b) => b.textContent)).toEqual(Array(10).fill(['sj.save', 'mj.apply']).flat())
    // 同日 Frank「这个也删掉」:表下「看全部同类职位」撤
    expect(el.textContent).not.toContain('mj.seeAll')
    // 2026-11-11 Frank「是不是统一成地址」:「地点」列改回「地址」列 —— 链字是完整地址一行,链址按它查
    expect(el.textContent).toContain('mj.col.addr')
    expect(el.textContent).not.toContain('mj.col.place')
    const place = Array.from(el.querySelectorAll('a')).find((a) => a.textContent === PICK.address)
    expect(place?.getAttribute('href')).toBe('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(PICK.address))
  })

  it('⑪ 推荐指数(2026-11-11 任务书第 46 条;同日弹框撤、改格内要点、再改点胶囊才展开):每行恰好一枚可点的胶囊、排在职位后面,默认不出要点;点了在原地展开这一行的要点(别的行不动、网址不变),再点收起;拿 PR 先一条「硬性条件符合」,需自行核对的硬性条件各一条,缺数据的不列;回包没带推荐指数的行这一格是空的', async () => {
    const fit = {
      level: 'mid', goal: 'pr', score: 55,
      hard: [{ key: 'lang', tag: 'pass', note: 'pass', vars: { n: '5' } }, { key: 'work', tag: 'check', note: 'text', vars: { text: 'six months' } }],
      soft: [{ key: 'occ', tag: 'high', note: 'want', vars: {} }, { key: 'pay', tag: 'none', note: 'none', vars: {} }],
    }
    stub({ status: 200, body: { picks: [PICK, { ...PICK, id: 8, title: 'cook' }], fits: [fit, { ...fit, level: 'high', goal: 'job', hard: [] }], goal: 'pr', basis: true, need: [] } })
    const el = await mount()
    const rows = () => Array.from(el.querySelectorAll('tbody tr')).filter((r) => r.querySelector('button[aria-expanded]') != null)
    const cell = (i: number) => rows()[i]!.querySelectorAll('td')[1] as HTMLElement
    // 要点在这一行下面的跨列细行里(通用 Table 的 detailOf),不在「推荐指数」格里
    const bullets = (i: number) => {
      const next = rows()[i]!.nextElementSibling
      if (next == null || next.querySelector('button[aria-expanded]') != null) {
        return []
      }
      return Array.from(next.querySelectorAll('li')).map((x) => x.textContent)
    }
    const btn = (i: number) => cell(i).querySelector('button') as HTMLElement
    expect(rows().length).toBe(2)
    for (const i of [0, 1]) {
      expect(cell(i).querySelectorAll('button').length).toBe(1)
      expect(cell(i).querySelectorAll('a').length).toBe(0)
      expect(bullets(i)).toEqual([])
      expect(btn(i).getAttribute('aria-expanded')).toBe('false')
    }
    expect(cell(0).textContent).toBe('mj.fit.lv.mid ▾')
    expect(cell(1).textContent).toBe('mj.fit.lv.high ▾')
    const before = window.location.href
    await act(async () => {
      btn(0).click()
    })
    expect(window.location.href).toBe(before)
    expect(bullets(0)).toEqual(['mj.fit.b.hard', 'mj.fit.b.check{"k":"mj.fit.k.work"}', 'mj.fit.n.occ.want{}'])
    expect(bullets(1)).toEqual([])
    expect(btn(0).getAttribute('aria-expanded')).toBe('true')
    expect(btn(0).textContent).toBe('mj.fit.lv.mid ▴')
    await act(async () => {
      btn(1).click()
    })
    expect(bullets(1)).toEqual(['mj.fit.n.occ.want{}'])
    expect(bullets(0).length).toBe(3)
    await act(async () => {
      btn(0).click()
    })
    expect(bullets(0)).toEqual([])
    expect(bullets(1).length).toBe(1)
    document.body.innerHTML = ''
    stub({ status: 200, body: { picks: [PICK] } })
    const bare = await mount()
    expect((Array.from(bare.querySelectorAll('tbody tr'))[0]!.querySelectorAll('td')[1] as HTMLElement).textContent).toBe('')
  })

  it('⑪ 三种提示(任务书第 42、45、46 条):没有职业依据不出表、出引导与「去补全」;拿 PR 缺档案项不出表、点名要补的几项;只有低档时表上方说明一句', async () => {
    stub({ status: 200, body: { picks: [], basis: false } })
    let el = await mount()
    expect(el.textContent).toContain('mj.picksNoBasis')
    expect(el.textContent).toContain('mj.fillGo')
    expect(el.querySelector('table')).toBeNull()
    document.body.innerHTML = ''
    stub({ status: 200, body: { picks: [], basis: true, goal: 'pr', need: ['who', 'exp'] } })
    el = await mount()
    expect(el.textContent).toContain('mj.picksNeed{"fields":"mj.need.whomj.fillSepmj.need.exp"}')
    expect(el.querySelector('table')).toBeNull()
    document.body.innerHTML = ''
    stub({ status: 200, body: { picks: [PICK], lowOnly: true } })
    el = await mount()
    expect(el.textContent).toContain('mj.picksLowOnly')
    expect(el.querySelector('table')).not.toBeNull()
  })

  it('⑥b 中位时薪与 vs 中位两列(2026-11-09):高于中位出「$31.73/hr」「+16%」,低于出减号,没有中位两格都空', async () => {
    const cellsOf = (el: HTMLElement) => {
      const row = Array.from(el.querySelectorAll('tr')).find((r) => r.textContent?.includes(PICK.title)) as HTMLElement
      return Array.from(row.querySelectorAll('td')).map((c) => c.textContent)
    }
    stub({ status: 200, body: { picks: [{ ...PICK, wageMedHourly: 31.73, abovePct: 16 }] } })
    const up = cellsOf(await mount())
    expect([up[5], up[6]]).toEqual(['$31.73/hr', '+16%'])
    document.body.innerHTML = ''
    stub({ status: 200, body: { picks: [{ ...PICK, wageMedHourly: 45, abovePct: -40 }] } })
    const down = cellsOf(await mount())
    expect([down[5], down[6]]).toEqual(['$45/hr', '-40%'])
    document.body.innerHTML = ''
    stub({ status: 200, body: { picks: [PICK] } })
    const none = cellsOf(await mount())
    expect([none[5], none[6]]).toEqual(['', ''])
  })

  it('⑥ 一行两颗钮「收藏」「投递」,点投递就地弹投递框;行末没有「⋯」(2026-11-11 删除钮撤,同日加收藏)', async () => {
    stub({ status: 200, body: { picks: [PICK] } })
    const el = await mount()
    const row = Array.from(el.querySelectorAll('tr')).find((r) => r.textContent?.includes(PICK.title)) as HTMLElement
    const btns = Array.from(row.querySelectorAll('button'))
    expect(btns.map((b) => b.textContent)).toEqual(['sj.save', 'mj.apply'])
    await act(async () => {
      btns[1]?.click()
    })
    expect(new URLSearchParams(window.location.search).get('apply')).toBe('7')
  })

  it('⑥ 零条出一行空态;失败出刷新再试', async () => {
    stub({ status: 200, body: { picks: [] } })
    const empty = await mount()
    expect(empty.textContent).toContain('mj.picksEmpty')
    document.body.innerHTML = ''
    stub({ status: 500, body: {} })
    const el = await mount()
    expect(el.textContent).toContain('mj.fail')
    expect(el.textContent).not.toContain('mj.picksEmpty')
  })
})

// 新岗推送卡(Push;2026-10-10 批 2):设置拉回来才出;频率 weekly 回显、「不发」是空值档;保存发 POST { freq, email },
// 回 pending 出「点 X 收到的链接后生效」;拉失败出刷新再试。探针:freqOutOf 不把空串折 off → POST 体那条红。
// 2026-10-11 批 5「提示统一 + 顶栏铃铛」:存完那一句改右上角提示(toast 总线),pending = 「确认信已发出」+ 灰字副行;卡里不再出。
// 2026-11-07「我的」新域重写:新岗推送挪进「我的订阅」页(me 桶子桶 sub,SubBody 的「新岗推送」分区卡 SubPush,状态在 useSub)——
//       挂 useSub + SubBody 整页正文,断言收在卡头 mj.push 那一张卡里;「拉失败」那条只让推送设置接口失败(付款记录照常回零条),
//       免得付款卡的同一句「刷新再试」冒充推送卡的。
type SubProps = { t: typeof t }

function SubPage(p: SubProps) {
  return createElement(SubBody, { s: useSub({ t: p.t }), t: p.t })
}

async function mountSub() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  await act(async () => {
    createRoot(el).render(createElement(SubPage, { t }))
  })
  await flush()
  return el
}

// 卡头是 mj.push 的那一张分区卡
function pushCard(el: HTMLElement) {
  return Array.from(el.querySelectorAll('section')).find((s) => s.firstElementChild?.textContent === 'mj.push') as HTMLElement
}

describe('新岗推送卡', () => {
  it('回显、保存、待确认那一句', async () => {
    const posts: string[] = []
    const toasts: unknown[] = []
    function onToast(e: Event) {
      toasts.push((e as CustomEvent).detail)
    }
    window.addEventListener('offer2pr:toast', onToast)
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && String(url) === '/api/alerts/prefs') {
        posts.push(String(init.body))
        return { status: 200, ok: true, json: async () => ({ result: 'pending' }) }
      }
      if (String(url) === '/api/alerts/prefs') {
        return { status: 200, ok: true, json: async () => ({ freq: 'weekly', email: 'me@x.com', pending: '' }) }
      }
      return new Promise(() => undefined)
    }))
    const el = pushCard(await mountSub())
    const sel = el.querySelector('select') as HTMLSelectElement
    expect(sel.value).toBe('weekly')
    expect(Array.from(sel.options).map((o) => o.value)).toEqual(['', 'daily', 'weekly'])
    const input = el.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('me@x.com')
    await act(async () => {
      sel.value = ''
      sel.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await act(async () => {
      Array.from(el.querySelectorAll('button')).find((b) => b.textContent === 'mj.pushSave')?.click()
    })
    await flush()
    expect(posts).toEqual([JSON.stringify({ freq: 'off', email: 'me@x.com' })])
    expect(toasts).toEqual([{ kind: 'ok', title: 'mj.pushMailSent', detail: 'mj.pushPending{"e":"me@x.com"}' }])
    expect(el.textContent).not.toContain('mj.pushPending')
    window.removeEventListener('offer2pr:toast', onToast)
  })

  it('拉失败出刷新再试', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url) === '/api/stripe/payments') {
        return { status: 200, ok: true, json: async () => ({ items: [] }) }
      }
      return { status: 500, ok: false, json: async () => ({}) }
    }))
    const el = await mountSub()
    expect(pushCard(el).textContent).toContain('mj.fail')
    expect(pushCard(el).querySelector('select')).toBeNull()   // 设置没拉到不出表单
    expect(el.textContent).toContain('sub.noPay')   // 付款卡照常(不是整页一起失败)
  })
})

describe('答完档案重拉', () => {
  it('⑦ asked 0 不带 fresh;asked 变 1 重拉一次且带 fresh=1', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(String(url))
      if (String(url).startsWith('/api/myjobs/picks')) {
        return { status: 200, ok: true, json: async () => ({ picks: [] }) }
      }
      return new Promise(() => undefined)
    }))
    const el = document.createElement('div')
    document.body.appendChild(el)
    const root = createRoot(el)
    await act(async () => {
      root.render(body({ gen: 0, asked: 0, tab: 'picks' }))
    })
    await act(async () => {
      root.render(body({ gen: 0, asked: 1, tab: 'picks' }))
    })
    const picks = urls.filter((u) => u.startsWith('/api/myjobs/picks'))
    expect(picks).toHaveLength(2)
    expect(picks[0]).not.toContain('fresh=1')
    expect(picks[1]).toContain('&fresh=1')
  })

  it('⑨ 投出一封(gen 变了):今日推荐与我的投递各重拉一次,我的收藏不重拉(2026-11-07 改:原按 key 整卡重挂)', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(String(url))
      return new Promise(() => undefined)
    }))
    const el = document.createElement('div')
    document.body.appendChild(el)
    const root = createRoot(el)
    await act(async () => {
      root.render(body({ gen: 0, asked: 0, tab: 'picks' }))
    })
    await act(async () => {
      root.render(body({ gen: 1, asked: 0, tab: 'picks' }))
    })
    function count(head: string) {
      return urls.filter((u) => u.startsWith(head)).length
    }
    expect(count('/api/myjobs/picks')).toBe(2)
    expect(count('/api/myjobs/applied')).toBe(2)
    expect(count('/api/myjobs/saved')).toBe(1)
    expect(urls.filter((u) => u.startsWith('/api/myjobs/picks')).every((u) => u.includes('fresh=1') === false)).toBe(true)
  })
})
