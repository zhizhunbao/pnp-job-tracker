// C5a-1 · 联邦 CRS / FSW67 估分器测试。
// fixture 不手抄:直接读 data/mart/ee_points_grid.json(380 行真数据,CRS 186 + FSW67 194),
// 库里改版这里立刻感知得到(手抄的 fixture 感知不到)。同一手法见 tests/int/mbEoi.int.spec.ts。
//
// 金标 = 案例 C01(docs/design/案例C01-马龙木匠路径-路径分析-20260805.md §二/配偶因素节):
// 40 岁、CLB6(四项同)、两年制加拿大大专(canadaStudy=true,eduYears=2)、加拿大经验 0、
// 海外经验不计(自雇,上游已把 expForeignMonths 传成 0)。
//   配偶不随行(单身表)CRS = 199 = 年龄 50 + 学历 98 + 语言 36 + 加拿大学习 15 —— 与文档逐项对得上,硬断言。
//   已婚配偶随行(with-spouse 表)CRS —— 文档写「185 = 47+91+32+15」,但 ee_points_grid 里
//   "40 years of age" × "With a spouse" 官方原值是 45(不是 47);45+91+32+15 = 183。
//   单身档四项在本文件里精确复现文档数字,证明不是解析器的锅;已婚档年龄那一格文档本身抄错了一格
//   (自己拿单身表反推:50+98+36+15=199 分毫不差,证明文档作者单身算对了、已婚档打错一个字)。
//   本文件按 ee_points_grid 的真实行断言 183,不为了凑 185 去硬编年龄分(那正是任务铁律禁止的事)。
import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { describe, expect, it } from 'vitest'
import {
  estimateCrs as pointsCrs, estimateFsw67 as pointsFsw,
  type CrsProfile, type EeGridRow,
} from '@/lib/points'

/** 垫片:金标沿用位置参数,分值域收对象参数(换实现时用例一个字不动) */
function estimateCrs(profile: CrsProfile, rows: EeGridRow[]) {
  return pointsCrs({ profile: profile, rows: rows })
}

/** 垫片:同上 */
function estimateFsw67(profile: CrsProfile, rows: EeGridRow[]) {
  return pointsFsw({ profile: profile, rows: rows })
}


const __dirname = path.dirname(fileURLToPath(import.meta.url))
const martPath = path.resolve(__dirname, '../../../data/mart/ee_points_grid.json')
const allRows: EeGridRow[] = JSON.parse(fs.readFileSync(martPath, 'utf8'))

describe('ee_points_grid 实况(改版会先在这里炸,而不是在金标断言里猜)', () => {
  it('380 行,CRS 186 + FSW67 194', () => {
    expect(allRows).toHaveLength(380)
    expect(allRows.filter((r) => r.grid === 'CRS')).toHaveLength(186)
    expect(allRows.filter((r) => r.grid === 'FSW67')).toHaveLength(194)
  })
  it('CRS section A 四个因子齐活', () => {
    const facs = new Set(allRows.filter((r) => r.grid === 'CRS' && r.section === 'A' && r.kind === 'detail').map((r) => r.factor))
    expect(facs).toEqual(new Set(['Age', 'Canadian Language Benchmark (CLB) level per ability', 'Canadian work experience', 'Level of Education']))
  })
  it('每一行都挂着 url + fetched(evidence 铁律 ①)', () => {
    for (const r of allRows) { expect(r.url).toBeTruthy(); expect(r.fetched).toBeTruthy() }
  })
})

// 案例 C01:马龙,40 岁,已婚配偶在中国(不随行申请)/ 单身表对照,CLB6 四项同,
// Algonquin 两年制 Ontario College Diploma(加拿大学历),加拿大经验 0,海外经验(自雇)不计入。
const goldBase = (married: boolean): CrsProfile => ({
  age: 40,
  married,
  clb: 6,
  edu: 'diploma2y',
  eduYears: 2,
  canadaStudy: true,
  expCanadaMonths: 0,
  expForeignMonths: 0,
})

const part = (r: ReturnType<typeof estimateCrs>, factor: string) => {
  const p = r.breakdown.find((b) => b.factor === factor)
  expect(p, `breakdown 里没有 factor=${factor}`).toBeTruthy()
  return p!
}

describe('estimateCrs · CRS 排名分', () => {
  it('单身 / 配偶不随行(without-spouse 表)= 199,四项逐一对上文档:年龄50+学历98+语言36+加拿大学习15', () => {
    const r = estimateCrs(goldBase(false), allRows)
    expect(r.withSpouse).toBe(false)
    expect(part(r, 'age').points).toBe(50)
    expect(part(r, 'edu').points).toBe(98)
    expect(part(r, 'clb').points).toBe(36)          // CLB6 without-spouse 单项 9 分 × 4 abilities
    expect(part(r, 'canadaStudyBonus').points).toBe(15)
    expect(r.total).toBe(199)
  })

  it('已婚配偶随行(with-spouse 表)= 183:学历91+语言32+加拿大学习15 与文档一致,年龄是 45(文档写47是错的)', () => {
    const r = estimateCrs(goldBase(true), allRows)
    expect(r.withSpouse).toBe(true)
    expect(part(r, 'age').points).toBe(45)           // 官方表 "40 years of age" × With a spouse = 45,不是文档写的 47
    expect(part(r, 'edu').points).toBe(91)
    expect(part(r, 'clb').points).toBe(32)           // CLB6 with-spouse 单项 8 分 × 4 abilities,与文档「32」吻合
    expect(part(r, 'canadaStudyBonus').points).toBe(15)
    expect(r.total).toBe(183)
  })

  it('加拿大工作经验 0 个月 → 命中「None or less than a year」行,0 分且不是 needs-info(官方确有这一档)', () => {
    const r = estimateCrs(goldBase(true), allRows)
    const p = part(r, 'expCanada')
    expect(p.points).toBe(0)
    expect(p.status).toBe('zero')
    expect(p.evidence?.url).toBeTruthy()
  })

  it('技能可转移性(Section C)组合在 0 经验 / CLB6<7 时全部落零,不污染总分', () => {
    const r = estimateCrs(goldBase(true), allRows)
    for (const key of ['eduLangCombo', 'eduExpCombo', 'foreignLangCombo', 'foreignExpCombo']) {
      const p = part(r, key)
      expect(p.points).toBe(0)
    }
  })

  it('每个非零分项都挂 evidence.url(铁律①);needsInfo 只列出档案确实没提供的因子(第二语言)', () => {
    const r = estimateCrs(goldBase(true), allRows)
    for (const b of r.breakdown) if (b.points > 0) expect(b.evidence?.url).toBeTruthy()
    expect(r.needsInfo).toContain('clb2')
  })

  it('age/clb/edu 缺档 → 对应因子 needs-info,不瞎猜、不参与总分', () => {
    const blank: CrsProfile = { age: null, married: false, clb: null, edu: null, eduYears: null, canadaStudy: null, expCanadaMonths: null, expForeignMonths: null }
    const r = estimateCrs(blank, allRows)
    expect(part(r, 'age').status).toBe('needs-info')
    expect(part(r, 'edu').status).toBe('needs-info')
    expect(part(r, 'clb').status).toBe('needs-info')
    expect(r.total).toBe(0)
    expect(r.needsInfo).toEqual(expect.arrayContaining(['age', 'edu', 'clb', 'expCanada', 'canadaStudyBonus']))
  })
})

describe('estimateFsw67 · FSW 67/100 资格分(同一档案,结构同构,无独立金标但要能自洽跑通)', () => {
  it('C01 档案(0 经验)可算出非负总分,且经验因子命中"不足 1 年"而非 needs-info', () => {
    const r = estimateFsw67(goldBase(true), allRows)
    expect(r.total).toBeGreaterThanOrEqual(0)
    const exp = part(r, 'exp')
    expect(exp.points).toBe(0)
    expect(exp.status).toBe('zero')
  })

  it('年龄(40)、学历(两年制)、语言(CLB6×4)三项都能查到官方行并挂 evidence', () => {
    const r = estimateFsw67(goldBase(true), allRows)
    expect(part(r, 'age').evidence?.url).toBeTruthy()
    expect(part(r, 'edu').evidence?.url).toBeTruthy()
    expect(part(r, 'clb').evidence?.url).toBeTruthy()
    expect(part(r, 'age').points).toBeGreaterThan(0)
    expect(part(r, 'edu').points).toBeGreaterThan(0)
  })

  it('适应性里档案没有对应字段的四项(配偶语言/配偶学习/预安排就业/加拿大亲属)恒 needs-info,不瞎猜', () => {
    const r = estimateFsw67(goldBase(true), allRows)
    for (const key of ['adaptSpouseLang', 'adaptSpouseStudy', 'adaptArrangedEmployment', 'adaptRelatives']) {
      expect(part(r, key).status).toBe('needs-info')
      expect(r.needsInfo).toContain(key)
    }
  })

  it('加拿大学习(两年制,满足≥2学年门槛)命中官方行给 5 分;加拿大工作 0 个月落零', () => {
    const r = estimateFsw67(goldBase(true), allRows)
    expect(part(r, 'adaptStudy').points).toBe(5)
    expect(part(r, 'adaptWork').points).toBe(0)
    expect(part(r, 'adaptWork').status).toBe('zero')
  })
})
