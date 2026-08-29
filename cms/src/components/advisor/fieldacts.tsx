'use client'
/**
 * 字段事实弹框顶部的三钮栏(Frank 走查#2,2026-07-25「把按钮摆上,之后可能加新内容」):
 * 分类/地点/公司三个弹框自带钮栏,其余字段弹框统一摆这一栏。
 * 中文对照即时可用(pnp/ee 有译文;余为「以后加英文」占位);
 * AI 速读 / 打开完整页 = 前置占位(灰显 disabled,待该弹框接入 AI/专属页后点亮)。
 * 2026-08-28 换装批自 Advisor.tsx 的 AdvisorModal 钮栏提出成件(开态由类给,不再内联)。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconCompass } from '@/components/icons'
import { BTN_GHOST, CLS_SEP, LANG_EN, SPACE } from './constants'
import { pillClsOf, zhLabelOf } from './functions'
import type { FieldActsIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染字段弹框的三钮栏。
 *
 * @param props 取词函数、界面语言与对照开关。
 * @returns 钮栏。
 */
export function FieldActs({ t, lang, showZh, onToggleZh }: FieldActsIn) {
  const off = pillClsOf({ on: false }) + CLS_SEP + cssOf(css.pillOff)
  return (
    <div className={cssOf(css.acts2)}>
      {lang !== LANG_EN && (
        <Button kind={BTN_GHOST} onClick={onToggleZh} className={pillClsOf({ on: showZh })}>
          {zhLabelOf({ t, show: showZh })}
        </Button>
      )}
      <Button kind={BTN_GHOST} disabled title={t('cat.aiRead')} className={off}>
        <IconCompass />{SPACE}{t('cat.aiRead')}
      </Button>
      <Button kind={BTN_GHOST} disabled title={t('detail.openFull')} className={off}>
        {t('detail.openFull')}
      </Button>
    </div>
  )
}
