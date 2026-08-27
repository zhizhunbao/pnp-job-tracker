import fs from 'node:fs'
import path from 'node:path'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PnpScoreCard } from '@/components/jobs'
import type { TFn } from '@/lib/i18n'
import type { ScoreFactor } from '@/lib/points'
import { resetAnswersMemory } from '@/lib/quiz'

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const allFactors: ScoreFactor[] = JSON.parse(fs.readFileSync(
  path.resolve(process.cwd(), '../data/mart/pnp_score_factors.json'),
  'utf8',
))

const t = ((key: string, vars?: Record<string, string | number>) => {
  const messages: Record<string, string> = {
    'ps.resultTitle': '各省估分',
    'ps.f.connection': '与该省的关联',
    'ps.bonusOf': '{prov} 加分项',
    'prov.NL': '纽芬兰与拉布拉多省',
    'ps.finish': '完成',
    'plan.next': '下一题',
    'plan.prev': '上一题',
    'ps.f.education': '学历',
    'ps.f.expRecent': '同职业经验(近 5 年)',
    'ps.edu.doctorate': '博士',
    'ps.edu.master': '硕士',
    'ps.edu.bachelor': '学士',
    'ps.edu.tradeCert': '技工证',
    'ps.edu.diploma2': '两年大专',
    'ps.edu.certificate1': '一年证书',
    'ps.edu.highSchool': '高中及以下',
    'ps.title': 'SCORE',
    'ps.compareHint': 'COMPARE BY THRESHOLD',
    'ps.noCompareLine': 'NO COMPARABLE LINE',
    'ps.met': 'MEETS',
    'ps.under': '{n} SHORT',
    'prov.BC': 'BC',
    'prov.SK': 'SK',
    'prov.AB': 'AB',
    'ps.yes': '是',
    'ps.no': '否',
  }
  return (messages[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(vars?.[name] ?? ''))
}) as TFn

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  // 分值卡答案持久化(3db5d0d)后组件初始 state 从 localStorage 读档:不清盘,
  // 上一个用例答的题会漏进下一个用例的 done 计数(实撞:done 期望 0 收到 3)
  localStorage.clear(); resetAnswersMemory()
})

const clickNext = async (container: HTMLElement) => {
  const next = Array.from(container.querySelectorAll('button'))
    .find((b) => /下一题|完成/.test(b.textContent || '')) as HTMLButtonElement
  await act(async () => next.click())
}

describe('PnpScoreCard target questionnaire', () => {
  it('puts one official factor group per screen, at most 4 rows', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    // NL 的 3 条加分项同属官方「与该省的关联」一组 → 一屏多选,标题是组名、小注是省名
    // (先前 3 屏是/否题;中间一版把七条摊一屏,标题只能写「以下哪些符合你的情况」= 没有主语)
    await act(async () => {
      root.render(React.createElement(PnpScoreCard, {
        t,
        lang: 'zh',
        ctx: { noc: '63200', teer: 3, province: 'NL' },
        factors: allFactors.filter((row) => row.province === 'NL'),
        draws: [],
        targetMode: true,
        questionnaireActive: true,
      }))
    })

    for (let i = 0; i < 5; i += 1) {
      const pick = container.querySelector('.qzItem input') as HTMLInputElement
      await act(async () => pick.click())
      await clickNext(container)
    }
    expect(container.textContent).toContain('与该省的关联')
    // 2026-08-16 Frank「加分项 去掉」+「为什么显示两个阿尔伯塔」:题目小注里的省名与「加分项」
    // 都撤了 —— 弹框头已经写着段落名与省名,再写一遍是重复
    expect(container.textContent).not.toContain('加分项')
    expect(container.querySelectorAll('.qzItem input[type="checkbox"]')).toHaveLength(3)

    await act(async () => root.unmount())
    container.remove()
  })

  // BC「执业资格 +5」官方只对 11 类职业成立(牙助/幼教/护理助理/技工…);清单在 mart 的 rule 里,
  // 前端按 ctx.noc 决定问不问 —— 干软件、当厨师的不该被问这一条(2026-08-11 Frank 两次点名)
  const bcEducationBonus = async (noc: string): Promise<string[]> => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(React.createElement(PnpScoreCard, {
        t, lang: 'zh', ctx: { noc, teer: Number(noc[1]), province: 'BC' },
        factors: allFactors.filter((row) => row.province === 'BC'),
        draws: [], targetMode: true, questionnaireActive: true,
      }))
    })
    let rows: string[] = []
    for (let i = 0; i < 15; i += 1) {
      const title = container.querySelector('.qzTitle')?.textContent || ''
      const checks = container.querySelectorAll('.qzItem input[type="checkbox"]')
      if (title === '学历' && checks.length) {
        rows = Array.from(container.querySelectorAll('.qzItem .qzText')).map((x) => x.textContent || '')
        break
      }
      const pick = container.querySelector('.qzItem input') as HTMLInputElement | null
      if (pick) await act(async () => pick.click())
      await clickNext(container)
    }
    await act(async () => root.unmount())
    container.remove()
    return rows
  }

  it('skips the professional-designation row when the official NOC list excludes this occupation', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const cook = await bcEducationBonus('63200')          // 厨师 —— 不在官方 11 类里
    expect(cook.length).toBeGreaterThan(0)
    expect(cook.some((x) => x.includes('执业资格'))).toBe(false)

    const ece = await bcEducationBonus('42202')           // 幼教 ECE —— 官方点名
    expect(ece.some((x) => x.includes('执业资格'))).toBe(true)
  })

  it('drops a precise question whose range is already answered by the basic quiz', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const onQuestionnaireProgress = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(React.createElement(PnpScoreCard, {
        t,
        lang: 'zh',
        ctx: { noc: '63200', teer: 3, province: 'NL' },
        factors: allFactors.filter((row) => row.province === 'NL'),
        draws: [],
        targetMode: true,
        questionnaireActive: true,
        // 基础卷答的是「5 年以上」:精确题只剩 5 这一个值,不再占一屏
        limits: { expRecent: [5], expOlder: [5] },
        onQuestionnaireProgress,
      }))
    })

    expect(onQuestionnaireProgress).toHaveBeenLastCalledWith({ done: 0, total: 4 })
    expect(container.textContent).not.toContain('同职业经验(近 5 年)')

    await act(async () => root.unmount())
    container.remove()
  })

  it('shows one choice question at a time and withholds the score until completion', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const onQuestionnaireProgress = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(React.createElement(PnpScoreCard, {
        t,
        lang: 'zh',
        ctx: { noc: '63200', teer: 3, province: 'NL' },
        factors: allFactors.filter((row) => row.province === 'NL'),
        draws: [],
        targetMode: true,
        questionnaireActive: true,
        onQuestionnaireProgress,
      }))
    })

    expect(onQuestionnaireProgress).toHaveBeenLastCalledWith({ done: 0, total: 6 })
    expect(container.textContent).toContain('学历')
    // 题卡自己不再摆标题与进度条(外层答题卡已有一套,两套进度会各走各的)
    expect(container.textContent).not.toContain('各省估分')
    expect(container.querySelectorAll('select')).toHaveLength(0)
    expect(container.textContent).not.toContain('NLPNP Point Assessment Grid')

    // 选中**不自动跳**:仍停在第 1 题,翻页由右下角的「下一题」决定
    const firstAnswer = container.querySelector('.qzItem input') as HTMLInputElement
    await act(async () => firstAnswer.click())
    expect(onQuestionnaireProgress).toHaveBeenLastCalledWith({ done: 1, total: 6 })
    expect(container.textContent).toContain('学历')

    await clickNext(container)
    expect(container.textContent).not.toContain('学历')
    expect(container.textContent).not.toContain('NLPNP Point Assessment Grid')

    await act(async () => root.unmount())
    container.remove()
  })

  // ── #304 offer 前提闸 ──────────────────────────────────────────────────────
  // AB 的 offer/offerSector/offerArea/regulated 四族全以「有 offer」为前提。闸门只认基础卷的
  // hasJobOffer(ctx.hasOffer):没答/答没有 → 四族不出题(分母跟着变小),true 才出。
  // AB 题单基线:profile 3 题(学历/语言/年龄)+ 加分 4 屏(学历完成地/双语/经验所在地/阿省亲属)。
  const renderAb = async ({ ctx, ...rest }: { ctx?: object } & Record<string, unknown> = {}) => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(React.createElement(PnpScoreCard, {
        t, lang: 'zh', ctx: { noc: '63200', teer: 3, province: 'AB', ...ctx },
        factors: allFactors.filter((row) => row.province === 'AB'),
        draws: [], ...rest,
      } as never))
    })
    return { container, root }
  }

  it('#304: no offer answered in the basic quiz -> offer-premise questions are gone', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const onQuestionnaireProgress = vi.fn()
    const { container, root } = await renderAb({ targetMode: true, questionnaireActive: true, onQuestionnaireProgress })
    // ctx.hasOffer 缺省(基础卷没答)= 关闸:offer 自问兜底也一并收掉,7 题(3 profile + 4 加分屏)
    expect(onQuestionnaireProgress).toHaveBeenLastCalledWith({ done: 0, total: 7 })
    await act(async () => root.unmount())
    container.remove()
  })

  it('#304: with an offer from the basic quiz the premise families come back', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const onQuestionnaireProgress = vi.fn()
    const { container, root } = await renderAb({ ctx: { hasOffer: true }, targetMode: true, questionnaireActive: true, onQuestionnaireProgress })
    // 开闸多出 offerSector / offerArea / regulated 三屏(offer 本行的答案来自基础卷,仍不占屏)
    expect(onQuestionnaireProgress).toHaveBeenLastCalledWith({ done: 0, total: 10 })
    await act(async () => root.unmount())
    container.remove()
  })

  it('#304: stored premise ticks stop counting when the gate is closed, kept when reopened', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    // 存量勾选:offerSector 0 / offerArea 0 / regulated 0 —— 期望差值从官方表自己读,不写死分值
    localStorage.setItem('o2p_score_answers_v1', JSON.stringify({
      ticks: { 'AB:offerSector:0': true, 'AB:offerArea:0': true, 'AB:regulated:0': true },
      rowAnswers: {}, extraAnswered: {}, profile: {},
    }))
    const pts = (factor: string, kind: string) =>
      allFactors.find((r) => r.province === 'AB' && r.factor === factor && r.kind === kind && r.seq === 0)?.points ?? 0
    const totalOf = (c: HTMLElement) => parseInt(c.querySelector('[role="tabpanel"] span')?.textContent || '', 10)

    const closed = await renderAb({ ctx: { hasOffer: false } })
    const closedTotal = totalOf(closed.container)
    await act(async () => closed.root.unmount())
    closed.container.remove()

    const open = await renderAb({ ctx: { hasOffer: true } })
    const openTotal = totalOf(open.container)
    await act(async () => open.root.unmount())
    open.container.remove()

    // 开闸 = offer 行 + 三条存量勾选恢复参与;关闸只是不参与,勾选没被删
    expect(openTotal - closedTotal).toBe(pts('offer', 'row') + pts('offerSector', 'bonus') + pts('offerArea', 'bonus') + pts('regulated', 'bonus'))
    expect(JSON.parse(localStorage.getItem('o2p_score_answers_v1')!).ticks['AB:offerSector:0']).toBe(true)
  })

  // ── #305 从基础卷答案推导的加分项 ──────────────────────────────────────────
  it('#305: derivable bonus factors stop being asked and echo as filled', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    // 基础卷:有加拿大学历、在 AB 读的、加拿大经验「没有」、法语 NCLC5+、CLB 7
    localStorage.setItem('o2p_answers_v1', JSON.stringify({
      canadaEduBand: 1, eduProv: 'AB', expBand: 1, frenchBand: 1, clbBand: 5, bandsV2: true,
    }))
    const onQuestionnaireProgress = vi.fn()
    const onQuestionnaireAnswers = vi.fn()
    const { container, root } = await renderAb({ ctx: { hasOffer: false }, targetMode: true, questionnaireActive: true, onQuestionnaireProgress, onQuestionnaireAnswers })
    // 学历完成地 / 经验所在地 / 双语三屏推掉,只剩 3 profile + 阿省亲属
    expect(onQuestionnaireProgress).toHaveBeenLastCalledWith({ done: 0, total: 4 })
    const rows = onQuestionnaireAnswers.mock.lastCall?.[0] as { key: string; value: string; filled: boolean }[]
    const derived = Object.fromEntries(rows.map((r) => [r.key, r]))
    expect(derived['AB:eduLocationCanada:0']?.filled).toBe(true)
    expect(derived['AB:eduLocationCanada:0']?.value).toBeTruthy()           // 命中「本省完成」那行的官方行文
    expect(derived['AB:workLocationCanada:0']?.value).toBe('否')            // 0 个月加拿大经验 → 恒无
    expect(derived['AB:language:0']?.value).toBe('是')                      // CLB 7 + NCLC 5 → 双语 4+ 成立
    await act(async () => root.unmount())
    container.remove()
  })

  it('#305: derived values feed the score; missing basics keep the questions', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const totalOf = (c: HTMLElement) => parseInt(c.querySelector('[role="tabpanel"] span')?.textContent || '', 10)
    const bare = await renderAb({ ctx: { hasOffer: false } })
    const bareTotal = totalOf(bare.container)
    await act(async () => bare.root.unmount())
    bare.container.remove()

    localStorage.setItem('o2p_answers_v1', JSON.stringify({
      canadaEduBand: 1, eduProv: 'AB', expBand: 1, frenchBand: 1, clbBand: 5, bandsV2: true,
    }))
    const withBasics = await renderAb({ ctx: { hasOffer: false } })
    const eduLoc = allFactors.find((r) => r.province === 'AB' && r.factor === 'eduLocationCanada' && r.seq === 0)?.points ?? 0
    const bilingual = allFactors.find((r) => r.province === 'AB' && r.factor === 'language' && r.kind === 'bonus')?.points ?? 0
    expect(totalOf(withBasics.container) - bareTotal).toBe(eduLoc + bilingual)
    await act(async () => withBasics.root.unmount())
    withBasics.container.remove()

    // 基础答案缺(canadaEduBand 没答等)→ 三屏照旧出:回到 7 题基线
    localStorage.clear()
    const onQuestionnaireProgress = vi.fn()
    const asked = await renderAb({ ctx: { hasOffer: false }, targetMode: true, questionnaireActive: true, onQuestionnaireProgress })
    expect(onQuestionnaireProgress).toHaveBeenLastCalledWith({ done: 0, total: 7 })
    await act(async () => asked.root.unmount())
    asked.container.remove()
  })

  it('shows every selected province as a separate threshold comparison', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(React.createElement(PnpScoreCard, {
        t,
        lang: 'zh',
        ctx: { noc: '63200', teer: 3, province: 'BC' },
        factors: allFactors.filter((row) => row.province === 'BC' || row.province === 'SK'),
        draws: [],
        inputs: false,
      }))
    })

    // 2026-08-12:各省从折叠手风琴改成**选项卡**(Frank「只给估分功能加选项卡」)——
    // 断言跟着形态走:一省一个 role=tab,面板与 tab 用 aria 对上,当前省的差距句直接摊开。
    const tabs = Array.from(container.querySelectorAll('[role="tab"]'))
    expect(tabs.map((x) => x.getAttribute('id'))).toEqual(['ps-prov-BC', 'ps-prov-SK'])
    expect(tabs.filter((x) => x.getAttribute('aria-selected') === 'true')).toHaveLength(1)
    for (const tab of tabs) {
      const panel = container.querySelector(`#${tab.getAttribute('aria-controls')}`)
      expect(panel, tab.getAttribute('id') ?? '').toBeTruthy()
      expect(panel!.textContent).toMatch(/NO COMPARABLE LINE|MEETS|SHORT/)
    }

    await act(async () => root.unmount())
    container.remove()
  })
})
