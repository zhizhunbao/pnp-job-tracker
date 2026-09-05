'use client'
/**
 * 开场白 + 四条胶囊(Frank 2026-09-04「首先应该打个招呼,自我介绍之类的」)。胶囊是站上有的东西,点即发;
 * 形态与答复下的卡同一种(2026-08-09 Frank「这个样式怎么上下不一致」)。不随第一轮卸载。
 *
 * @author Frank
 * @time 2026-09-05 16:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { CHIP_KEYS, PLAIN_BTN_KIND } from './constants'
import { makeChipClick } from './functions'
import type { GuideHelloIn } from './types'
import css from './guide.module.css'

/**
 * 开场白与胶囊。
 *
 * @param props 面板。
 * @returns 线程首项。
 */
export function GuideHello({ p }: GuideHelloIn) {
  const chips = []
  for (const key of CHIP_KEYS) {
    chips.push(
      <Button key={key}
        kind={PLAIN_BTN_KIND}
        className={cssOf(css.cbOpt)}
        disabled={p.busy}
        onClick={makeChipClick({ p, key })}>
        <span className={css.cbOptMain}><span className={css.cbOptLabel}>{p.t(key)}</span></span>
      </Button>,
    )
  }
  return (
    <div className={css.cbTurn}>
      <div className={css.cbMsg}><p className={css.cbP}>{p.t('chat.hello')}</p></div>
      <div className={`${css.cbEmpty} ${css.cbOpts}`}>
        <div className={css.cbOptWhy}>{p.t('chat.why')}</div>
        {chips}
        <div className={css.cbOptWhy}>{p.t('chat.ask')}</div>
      </div>
    </div>
  )
}
