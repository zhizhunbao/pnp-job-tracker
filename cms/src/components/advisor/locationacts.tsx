'use client'
/**
 * 地点弹框顶部的三钮条(Frank 走查#2「只要弹框就直接显示这三个按钮」):
 * 中文对照(地点内容现已本地化,这是「以后加英文」的前置占位 —— 切换态在,
 * 待英文正文接入即生效)/ AI 速读 / 打开完整页(= 该省地区统计页,地点弹框有专属 SEO 页)。
 * 事实块没回来时不给点 AI —— 它解读的就是这些数。
 * 2026-08-28 换装批自 Advisor.tsx 的 LocationPanel 钮条提出成件(开态由类给,不再内联)。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { Button, LinkButton } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconCompass } from '@/components/icons'
import {
  ARROW_EXTERNAL, BTN_GHOST, CLS_SEP, LANG_EN, SPACE, TARGET_BLANK, TEXT_NONE, URL_STATS_HEAD,
} from './constants'
import { caretOf, pillClsOf, zhLabelOf } from './functions'
import type { LocationActsIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染地点弹框的三钮条。
 *
 * @param props 取词函数、界面语言、省码与三个开关(逐格注释见 LocationActsIn)。
 * @returns 钮条;没有省码时整条不出(完整页是省页,没省就没去处)。
 */
export function LocationActs({ t, lang, province, showZh, onToggleZh, ai, factsReady }: LocationActsIn) {
  if (province === TEXT_NONE) {
    return null
  }
  return (
    <div className={cssOf(css.acts2)}>
      {lang !== LANG_EN && (
        <Button kind={BTN_GHOST} onClick={onToggleZh} className={pillClsOf({ on: showZh })}>
          {zhLabelOf({ t, show: showZh })}
        </Button>
      )}
      {factsReady && (
        <Button kind={BTN_GHOST} onClick={ai.onToggle} className={pillClsOf({ on: ai.on })}>
          <IconCompass />{SPACE}{t('cat.aiRead')}{SPACE}{caretOf({ on: ai.on })}
        </Button>
      )}
      <LinkButton href={URL_STATS_HEAD + province.toLowerCase()} target={TARGET_BLANK}
        className={cssOf(css.pillLink) + CLS_SEP + pillClsOf({ on: false })}>
        {t('detail.openFull')}{SPACE}{ARROW_EXTERNAL}
      </LinkButton>
    </div>
  )
}
