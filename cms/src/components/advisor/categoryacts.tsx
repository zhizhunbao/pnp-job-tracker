'use client'
/**
 * 分类弹框顶部的两钮条:中文对照(职责/要求实时翻,英文界面不出)+ AI 速读
 * (点了才生成,复用顾问免费额度 —— 不点不烧,#176 零成本默认不破)。
 * 2026-08-28 换装批自 Advisor.tsx 的 CategoryPanel 钮条提出成件(开态由类给,不再内联)。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconCompass } from '@/components/icons'
import { BTN_GHOST, LANG_EN, SPACE, TRANS_LOADING } from './constants'
import { caretOf, pillClsOf, transLabelOf, transPillClsOf } from './functions'
import type { CategoryActsIn } from './types'
import css from './advisor.module.css'

/**
 * 渲染分类弹框的两钮条。
 *
 * @param props 取词函数、界面语言与两个面板(逐格注释见 CategoryActsIn)。
 * @returns 钮条。
 */
export function CategoryActs({ t, lang, trans, ai }: CategoryActsIn) {
  return (
    <div className={cssOf(css.actsRow)}>
      {lang !== LANG_EN && (
        <Button kind={BTN_GHOST} onClick={trans.onToggle} disabled={trans.status === TRANS_LOADING}
          className={transPillClsOf({ status: trans.status, show: trans.showTrans })}>
          {transLabelOf({ t, status: trans.status, show: trans.showTrans })}
        </Button>
      )}
      <Button kind={BTN_GHOST} onClick={ai.onToggle} className={pillClsOf({ on: ai.on })}>
        <IconCompass />{SPACE}{t('cat.aiRead')}{SPACE}{caretOf({ on: ai.on })}
      </Button>
    </div>
  )
}
