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
    'ps.extraTitle': '再回答几个问题',
    'ps.extraHint': '一次只回答一题',
    'ps.progress': '已答 {done}/{total}',
    'ps.questionN': '第 {current}/{total} 题',
    'ps.f.education': '学历',
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

describe('PnpScoreCard target questionnaire', () => {
  it('shows one choice question at a time and withholds the score until completion', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
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
      }))
    })

    expect(container.textContent).toContain('已答 0/8')
    expect(container.textContent).toContain('第 1/8 题')
    expect(container.textContent).toContain('学历')
    expect(container.querySelectorAll('select')).toHaveLength(0)
    expect(container.textContent).not.toContain('NLPNP Point Assessment Grid')

    const firstAnswer = container.querySelector('button[aria-pressed]') as HTMLButtonElement
    await act(async () => firstAnswer.click())

    expect(container.textContent).toContain('已答 1/8')
    expect(container.textContent).toContain('第 2/8 题')
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
