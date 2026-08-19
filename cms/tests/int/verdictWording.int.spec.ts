// 判定核措辞层(pv.*)守门测试。
//
// 守的是**一条会悄悄漂移的规矩**:`pathVerdict` 的 reason 有两份表述 ——
//   · `text`  中文成句,喂 lib/chat、被一堆断言钉着;
//   · `key` + `params` 三语措辞层,处境页与将来的方案卡靠它显示。
// 改了一处忘另一处,中文用户看到的东西就和英文用户看到的东西对不上,而且**没有任何报错**
// (t() 找不到键会回落中文,漏挂 key 会回落 text,两条兜底都是静默的)。
// 所以这里逐条比:**中文经措辞层渲染出来,必须与 text 逐字相同**;并且每条 reason 都得有 key。
//
// fixture 同 pathVerdict.int.spec:直接读 data/mart 真数据,不手抄。
import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { makeT } from '@/lib/i18n'
import {
  pathVerdict,
  type DesignatedEmployerRow, type OccupationRow,
  type VerdictData, type VerdictDrawRow, type VerdictProfile,
} from '@/lib/verdict/pathVerdict'
import type { Requirement } from '@/lib/rules'
import type { ScoreFactor } from '@/lib/score/pnpSelfScore'
import type { EeGridRow } from '@/lib/score/crsEstimate'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mart = <T>(name: string): T[] =>
  JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../data/mart/${name}.json`), 'utf8'))

const data: VerdictData = {
  requirements: mart<Requirement>('pnp_requirements'),
  occupations: mart<OccupationRow>('pnp_occupations'),
  draws: mart<VerdictDrawRow>('pnp_draws'),
  scoreFactors: mart<ScoreFactor>('pnp_score_factors'),
  eeGrid: mart<EeGridRow>('ee_points_grid'),
  designatedEmployers: mart<DesignatedEmployerRow>('designated_employers'),
}

const base: VerdictProfile = {
  age: 40, married: false, clb: 6, edu: 'diploma2y', eduYears: 2,
  canadaStudy: true, studyProvince: 'ON', noc: '72310', teer: 2,
  expCanadaMonths: 0, expForeignMonths: 0, foreignExpSelfEmployed: true, hasOffer: false, inCanada: true,   // 在找工作(无 offer)+ 持 PGWP 在境内
  status: 'pgwp', province: 'ON', permit: 'pgwp', fieldMatch: null, frenchOk: null,
}

// 覆盖尽量多的分支:达标/差档/缺槽/清单命中/自雇/居住/估分,一份档案打不全
const PROFILES: { name: string; p: VerdictProfile }[] = [
  { name: 'C01 木匠(0 经验 · 自雇 · CLB6)', p: base },
  { name: '语言差档(CLB4 厨师)', p: { ...base, clb: 4, noc: '63200', teer: 3 } },
  { name: '缺槽(没填 CLB / 没填经验)', p: { ...base, clb: null, expCanadaMonths: null, province: null } },
  { name: '攒了一半经验(12 个月)', p: { ...base, expCanadaMonths: 12, foreignExpSelfEmployed: false } },
  { name: '护士 CLB9 经验 36 月', p: { ...base, clb: 9, noc: '31301', teer: 1, expCanadaMonths: 36, foreignExpSelfEmployed: false } },
  { name: '没填职业', p: { ...base, noc: null, teer: null } },
]

describe('判定核措辞层 pv.*', () => {
  const tZh = makeT('zh')

  it('每条 reason 都挂了 pv.* 键', () => {
    const naked: string[] = []
    for (const { name, p } of PROFILES) {
      for (const v of pathVerdict(p, data)) {
        for (const r of v.reasons) if (!r.key) naked.push(`${name} · ${v.key} · ${r.text}`)
      }
    }
    expect(naked).toEqual([])
  })

  it('中文经措辞层渲染 = reason.text 逐字相同', () => {
    const drift: string[] = []
    for (const { name, p } of PROFILES) {
      for (const v of pathVerdict(p, data)) {
        for (const r of v.reasons) {
          if (!r.key) continue
          const rendered = tZh(r.key, r.params)
          if (rendered !== r.text) drift.push(`${name} · ${v.key} · ${r.key}\n  text: ${r.text}\n  i18n: ${rendered}`)
        }
      }
    }
    expect(drift).toEqual([])
  })

  it('三语都查得到键,不会把键名渲染出来', () => {
    const leaked: string[] = []
    for (const lang of ['zh', 'en', 'ko'] as const) {
      const t = makeT(lang)
      for (const { p } of PROFILES) {
        for (const v of pathVerdict(p, data)) {
          for (const r of v.reasons) {
            if (!r.key) continue
            if (t(r.key, r.params) === r.key) leaked.push(`${lang} · ${r.key}`)
          }
        }
      }
    }
    expect([...new Set(leaked)]).toEqual([])
  })

  it('英文态不残留中文(官方原句 quote 除外——引用不翻译)', () => {
    const cjk: string[] = []
    const tEn = makeT('en')
    for (const { p } of PROFILES) {
      for (const v of pathVerdict(p, data)) {
        for (const r of v.reasons) {
          if (!r.key) continue
          const s = tEn(r.key, r.params)
          // 参数里可能带官方中文通道名?没有 —— stream/name 全是官方英文原名。有中文只能是文案没翻。
          if (/[一-鿿]/.test(s)) cjk.push(`${r.key} → ${s}`)
        }
      }
    }
    expect([...new Set(cjk)]).toEqual([])
  })

  // 标点单列一条:2026-08-11 生产实拍,英文句子里混着「632(2026-07-30 · Draw #276)、825(…)」——
  // 汉字一个没有,可它一眼就是中文排版。分隔符是**拼在参数里**的,汉字检查抓不到,所以单独钉。
  it('英文态不残留中文标点(、。「」·、全角空格)', () => {
    const bad: string[] = []
    const tEn = makeT('en')
    for (const { p } of PROFILES) {
      for (const v of pathVerdict(p, data)) {
        for (const r of v.reasons) {
          if (!r.key) continue
          const s = tEn(r.key, r.params)
          if (/[　-〿·＀-￯]/.test(s)) bad.push(`${r.key} → ${s}`)
        }
      }
    }
    expect([...new Set(bad)]).toEqual([])
  })
})
