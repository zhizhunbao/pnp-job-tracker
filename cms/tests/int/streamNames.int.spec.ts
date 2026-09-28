/**
 * 同一个项目全站一个名字(2026-09-26 晚 Frank「上下名字怎么对不上」「名字都用一个不行么」)。
 * 省提名弹框的通道卡(i18n stream.* / pnp.gen.*)与抽选卡本岗那一组(抽选组官方名 + drawStreamNote 灰字)原先各起各的名:
 * 通道卡「BC Construction trades / BC 建筑技工」,抽选组「Build: Construction Trades / 建筑业技工通道」,/start 抽选表又是
 * 「Build:建筑技工」。改后英文一律省里官方原名、中文 / 韩文一律通道名;本文件把两边锁在一起,改一处必须两处一起改。
 * 不是同一个项目的不锁:PE 那组 Labour & Express Entry、NL 那组 NLPNP + AIP 各覆盖好几条通道,BC 普通岗从 Innovate 那一类轮进。
 * 2026-09-27 Frank「这个高亮和上面的能走通道也不匹配啊」→ 选「组下灰字写通道名」(看过效果图):这几组的灰字改写它邀请的通道名,
 * 三语都出 —— 本文件同批加一条,锁住「组下灰字含本岗通道名」(通用通道 BC / PE / NL / NS,具名通道 PE 在需职业、NS 建筑)。
 *
 * @author Frank
 * @time 2026-09-26 23:10:00
 */
import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { PnpPathway } from '@/components/pnp/types'
import { makeT } from '@/lib/i18n'
import { drawStreamNote } from '@/lib/jobs'
import { STREAM_L10N } from '@/lib/jobs/constants'

/**
 * 通道对照(data/mart 真表;2026-09-28 通道表批二起,原 components/pnp 的 GEN_DRAW_STREAM / NAMED_DRAW_STREAMS 两张常量退役,
 * 这里从表里还原同样两张对照再锁名字:省默认通道 → 第一组抽选,具名通道(岗位通道名)→ 它的抽选组)。
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PATHWAYS: PnpPathway[] = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../data/mart/pathways.json'), 'utf8'))
const GEN_DRAW_STREAM: Record<string, string> = {}
const NAMED_DRAW_STREAMS: Record<string, string[]> = {}
for (const p of PATHWAYS) {
  if (p.isDefault && p.drawStreams[0] != null) {
    GEN_DRAW_STREAM[p.province] = p.drawStreams[0]
  }
  if (p.boardLabel != null && p.drawStreams.length > 0) {
    NAMED_DRAW_STREAMS[p.boardLabel] = p.drawStreams
  }
}

/**
 * 具名通道里与抽选组不是同一个项目的(PE 那组覆盖 Occupations in Demand 与 Workforce 各流;
 * 2026-09-27 九省体检登记 NS 建筑 → NS 按月那一组,那一组覆盖 NSNP 各流与 AIP)。
 */
const NOT_SAME_PROGRAM = new Set(['PE 在需职业', 'NS 建筑'])

/**
 * 通用通道里与抽选组同一个项目的省(BC / PE / NL 不是同一个东西,见文件头)。
 */
const GEN_SAME_PROGRAM = ['AB', 'MB', 'NB']

describe('同一个项目全站一个名字', () => {
  it('具名通道:抽选组的中文 / 韩文灰字就是通道名(阿省医护两组各带 EE / 非 EE 后缀),英文通道名是官方组名本身或其后半截', () => {
    let checked = 0
    for (const [label, draws] of Object.entries(NAMED_DRAW_STREAMS)) {
      if (NOT_SAME_PROGRAM.has(label)) {
        continue
      }
      const key = STREAM_L10N[label]
      if (key == null) {
        throw new Error('STREAM_L10N 缺通道 ' + label)
      }
      const en = makeT('en')(key)
      for (const d of draws) {
        expect(drawStreamNote({ stream: d, lang: 'zh' }).startsWith(makeT('zh')(key)), d).toBe(true)
        expect(drawStreamNote({ stream: d, lang: 'ko' }).startsWith(makeT('ko')(key)), d).toBe(true)
        expect(d.includes(en), `${d} ⊇ ${en}`).toBe(true)
        checked += 1
      }
    }
    expect(checked).toBeGreaterThanOrEqual(11)
  })

  it('通用通道(AB / MB / NB):英文就是抽选组官方名,中文 / 韩文就是通道名', () => {
    for (const p of GEN_SAME_PROGRAM) {
      const key = 'pnp.gen.' + p
      const d = GEN_DRAW_STREAM[p]
      if (d == null) {
        throw new Error('GEN_DRAW_STREAM 缺省 ' + p)
      }
      expect(makeT('en')(key), p).toBe(d)
      expect(drawStreamNote({ stream: d, lang: 'zh' }), p).toBe(makeT('zh')(key))
      expect(drawStreamNote({ stream: d, lang: 'ko' }), p).toBe(makeT('ko')(key))
    }
  })

  it('覆盖本站通道的组:组下灰字写它邀请的通道名,三语都含本岗通道名(通用 BC / PE / NL / NS,具名 PE 在需职业 / NS 建筑)', () => {
    const langs = ['zh', 'en', 'ko'] as const
    for (const p of ['BC', 'PE', 'NL', 'NS']) {
      const d = GEN_DRAW_STREAM[p]
      if (d == null) {
        throw new Error('GEN_DRAW_STREAM 缺省 ' + p)
      }
      for (const lang of langs) {
        expect(drawStreamNote({ stream: d, lang }).includes(makeT(lang)('pnp.gen.' + p)), `${p} ${lang}`).toBe(true)
      }
    }
    for (const label of NOT_SAME_PROGRAM) {
      const key = STREAM_L10N[label]
      const draws = NAMED_DRAW_STREAMS[label]
      if (key == null || draws == null) {
        throw new Error('对照表缺 ' + label)
      }
      for (const d of draws) {
        for (const lang of langs) {
          expect(drawStreamNote({ stream: d, lang }).includes(makeT(lang)(key)), `${label} ${lang}`).toBe(true)
        }
      }
    }
    // 曼省两组名字几乎一样:省里定向招募那组灰字写「MB 定向招募」,与本岗那组「MB 技术工人」分开
    expect(drawStreamNote({ stream: 'Skilled Worker Stream', lang: 'zh' })).toBe('MB 定向招募')
    expect(drawStreamNote({ stream: 'Skilled Worker in Manitoba', lang: 'zh' })).toBe('MB 技术工人')
  })

  it('金标:卑诗建筑技工那一组,上下同名', () => {
    expect(makeT('en')('stream.bcConstr')).toBe('Build: Construction Trades')
    expect(drawStreamNote({ stream: 'Build: Construction Trades', lang: 'zh' })).toBe('BC 建筑技工')
    expect(drawStreamNote({ stream: 'Build: Construction Trades', lang: 'en' })).toBe('')
  })
})
