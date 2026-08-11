import fs from 'node:fs'
import path from 'node:path'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PnpScoreCard } from '@/app/(frontend)/jobs/PnpScoreCard'
import type { TFn } from '@/app/(frontend)/jobs/i18n'
import type { ScoreFactor } from '@/lib/pnpSelfScore'

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
  }
  return (messages[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(vars?.[name] ?? ''))
}) as TFn

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
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
    expect(container.textContent).toContain('纽芬兰与拉布拉多省 加分项')
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

    expect(container.textContent).toContain('COMPARE BY THRESHOLD')
    const provinceRows = Array.from(container.querySelectorAll('button'))
      .filter((button) => /BC|SK/.test(button.textContent || ''))
    expect(provinceRows).toHaveLength(2)
    expect(provinceRows[0].textContent).toMatch(/NO COMPARABLE LINE|MEETS|SHORT/)
    expect(provinceRows[1].textContent).toMatch(/NO COMPARABLE LINE|MEETS|SHORT/)

    await act(async () => root.unmount())
    container.remove()
  })
})
