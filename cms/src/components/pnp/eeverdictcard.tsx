'use client'
/**
 * 域内小件:联邦 EE 判定卡(结论行 + 全类别全景开关)。
 * 2026-07-25 Frank「这两个应该是两行吧」:展开钮从结论行拆出,独立一行。
 * #155(Frank「这个没有数据还需要列吗」):未命中时不铺全部类别,收成一行 + 折叠入口。
 * 2026-08-28 换装批自 Pnp.tsx 的 EeCategorySection 拆出成文件(裸 <button> 改经 button 族)。
 *
 * @author Frank
 * @time 2026-08-28 17:59:16
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconCheck } from '@/components/icons'
import { PLAIN_BTN_KIND, TEXT_NONE } from './constants'
import { eeVerdictClsOf } from './functions'
import type { EeVerdictCardIn } from './types'
import css from './pnp.module.css'

/**
 * 渲染 EE 判定卡。
 *
 * @param props 取词函数、结论话术、命中态与全景开关(逐格注释见 EeVerdictCardIn)。
 * @returns 判定卡。
 */
export function EeVerdictCard({ t, text, hit, allLabel, caret, onToggle }: EeVerdictCardIn) {
  return (
    <div className={css.card}>
      <div className={css.cardHead}>{t('col.ee')}</div>
      <div className={eeVerdictClsOf({ hit })}>
        {hit && <IconCheck />} {text}
      </div>
      {allLabel !== TEXT_NONE && (
        <div className={css.mt6}>
          <Button kind={PLAIN_BTN_KIND} className={cssOf(css.linkBtn)} onClick={onToggle}>
            {caret} {allLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
