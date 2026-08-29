'use client'
/**
 * AI 检索声明行(✨ + 检索日期 + 「看来源 ▾」折叠):公司简介凡是机器查来的,
 * 这一行必须在 —— 披露红线,不许省。
 * #191(Frank「懒查的原文我需要保留显示出来吧」):原文 = 检索来源网页(ai_sources
 * 一直在存,2026-07-21 撤的只是裸 URL 平铺)。对齐 JD「看原文」的收纳法:声明行挂折叠钮,
 * 点开一行一条,默认不脏版面。
 * 三处(简介卡 / 懒查 bare / 基本信息卡)原先各写各的内联,2026-08-17 收成同一套类、
 * 只有外边距分三档;2026-08-28 拆域批把那三段 JSX 也收成这一件。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { useState } from 'react'
import { Button, LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { PLAIN_BTN_KIND, SPARKLE, TARGET_BLANK, TEXT_NONE } from './constants'
import { aiNoteClsOf, httpSourcesOf, makeToggle } from './functions'
import type { CompanyAiNoteIn } from './types'
import css from './companies.module.css'

/**
 * 一行 AI 检索声明(可折叠出来源清单)。
 *
 * @param props 取词函数、检索日期、来源与位置档(逐格注释见 CompanyAiNoteIn)。
 * @returns 声明行。
 */
export function CompanyAiNote({ t, fetched, sources, kind }: CompanyAiNoteIn) {
  const [showSrc, setShowSrc] = useState(false)
  const list = httpSourcesOf({ sources })
  const rows = []
  for (const url of list) {
    rows.push(
      <div key={url} className={css.srcRow}>
        <LinkButton href={url} target={TARGET_BLANK} className={cssOf(css.srcLink)}>{url}</LinkButton>
      </div>,
    )
  }
  let srcLabel = t('fact.aiSrc')
  if (showSrc) {
    srcLabel = t('fact.aiSrcHide')
  }
  return (
    <div className={aiNoteClsOf({ kind })}>
      {SPARKLE} {t('fact.aiIntro')}
      {fetched !== TEXT_NONE && <span className={css.fetched}>{fetched}</span>}
      {list.length > 0 && (
        <Button kind={PLAIN_BTN_KIND}
          onClick={makeToggle({ on: showSrc, set: setShowSrc })}
          className={cssOf(css.srcBtn)}>
          {srcLabel}
        </Button>
      )}
      {showSrc && rows}
    </div>
  )
}
