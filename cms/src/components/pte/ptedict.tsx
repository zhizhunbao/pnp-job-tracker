'use client'
/**
 * 域内小件:字典弹层(选中一个英文单词后浮在选区下方:词 + 音标 + 词性 + 两条释义;
 * 查不到给一句「没查到」;不放出处 —— Frank 2026-09-03「不要把我给你的话都显示到网站上」)。位置是运行时算出的视口坐标,经 style 进。
 *
 * @author Frank
 * @time 2026-09-03 18:00:00
 */
import { Button } from '@/components/button'
import { CLOSE_MARK, DICT_BUSY, DICT_IDLE, DICT_NONE, KIND_LINK, TEXT_NONE } from './constants'
import { dictStyleOf } from './functions'
import type { PteDictIn } from './types'
import css from './pte.module.css'

/**
 * 渲染字典弹层。
 *
 * @param props 取词函数与查词面板。
 * @returns 弹层;没选词不渲。
 */
export function PteDict({ t, d }: PteDictIn) {
  if (d.state === DICT_IDLE) {
    return null
  }
  const defs = []
  if (d.entry != null) {
    let i = 0
    for (const def of d.entry.defs) {
      defs.push(<li key={i} className={css.dictDef}>{def}</li>)
      i = i + 1
    }
  }
  return (
    // eslint-disable-next-line react/forbid-dom-props -- 弹层位置是选区算出的运行时坐标,不是排版
    <div className={css.dict} style={dictStyleOf(d.pos)}>
      <div className={css.dictHead}>
        <span className={css.dictWord}>{d.word}</span>
        {d.entry != null && d.entry.phonetic !== TEXT_NONE && <span className={css.dictPhon}>{d.entry.phonetic}</span>}
        {d.entry != null && d.entry.pos !== TEXT_NONE && <span className={css.dictPos}>{d.entry.pos}</span>}
        <Button kind={KIND_LINK} onClick={d.onClose} ariaLabel={t('pte.dict.close')}>{CLOSE_MARK}</Button>
      </div>
      {d.state === DICT_BUSY && <div className={css.dictNote}>{t('pte.dict.loading')}</div>}
      {d.state === DICT_NONE && <div className={css.dictNote}>{t('pte.dict.none')}</div>}
      {defs.length > 0 && <ol className={css.dictDefs}>{defs}</ol>}
    </div>
  )
}
