'use client'
/**
 * 域内小件:字典弹框 —— 选中题面里的词或点词后开(modal 桶带遮罩,底下不能点不能滚,可拖,四边四角拖拽缩放(Modal edgeResize;右上放大图标撤 ——
 * Frank 2026-09-04「弹出后应该是个遮罩层」「加上上下左右放大缩小」「这个不需要」);× 归 Modal。版式照小枫叶
 * (Frank 2026-09-04「人家是这种的」):词 + 右上 ×;英/美音标胶囊各带喇叭钮(浏览器语音);
 * 一义一行(中文界面中文释义,其余英文释义 —— 「如果是韩国人呢」;「中文」标签同日撤);
 * 「词形」段列派生词族(名词 / 动词 / 形容词,WordNet;屈折变化撤 —— Frank 2026-09-04「只列名词动词形容词的形式」)。× 关。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { Button } from '@/components/button'
import { Modal } from '@/components/modal'
import { IconVolume } from '@/components/icons'
import {
  DICT_BUSY, DICT_ID, DICT_IDLE, DICT_MODAL_SIZE, DICT_NONE, KIND_LINK, SPK_UK, SPK_US, TEXT_NONE,
} from './constants'
import { bracketOf, dictFamilyOf, dictLinesOf, phonOf, spkClsOf } from './functions'
import type { PteDictIn } from './types'
import css from './pte.module.css'

/**
 * 渲染字典弹层。
 *
 * @param props 取词函数、查词面板与界面语。
 * @returns 弹层;没选词不渲。
 */
export function PteDict({ t, d, lang }: PteDictIn) {
  if (d.state === DICT_IDLE || d.word === TEXT_NONE) {
    return null
  }
  const lines = []
  if (d.entry != null) {
    let i = 0
    for (const line of dictLinesOf({ entry: d.entry, lang })) {
      lines.push(<div key={i} className={css.dictLine}>{line}</div>)
      i = i + 1
    }
  }
  const forms = []
  if (d.entry != null) {
    let i = 0
    for (const fm of dictFamilyOf({ family: d.entry.family })) {
      forms.push(
        <div key={i} className={css.dictForm}>
          <span className={css.dictFormTag}>{t(fm.key)}</span>
          <span>{fm.words}</span>
        </div>,
      )
      i = i + 1
    }
  }
  return (
    <Modal onClose={d.onClose} size={DICT_MODAL_SIZE} draggable resizable={false} edgeResize>
      <div id={DICT_ID} className={css.dict}>
        <div className={css.dictHead}>
          <span className={css.dictWord}>{d.word}</span>
        </div>
        {d.entry != null && (
          <div className={css.dictPhons}>
            <span className={css.dictPhonTag}>{t('pte.dict.uk')}</span>
            <span className={css.dictPill}>
              {bracketOf({ phon: phonOf({ own: d.entry.phoneticUk, fallback: d.entry.phonetic }) })}
            </span>
            <Button kind={KIND_LINK} sm onClick={d.onSpeakUk} ariaLabel={t('pte.dict.uk')}
              className={spkClsOf({ on: d.speaking === SPK_UK })}>
              <IconVolume />
            </Button>
            <span className={css.dictPhonTag}>{t('pte.dict.us')}</span>
            <span className={css.dictPill}>
              {bracketOf({ phon: phonOf({ own: d.entry.phoneticUs, fallback: d.entry.phonetic }) })}
            </span>
            <Button kind={KIND_LINK} sm onClick={d.onSpeakUs} ariaLabel={t('pte.dict.us')}
              className={spkClsOf({ on: d.speaking === SPK_US })}>
              <IconVolume />
            </Button>
          </div>
        )}
        {d.state === DICT_BUSY && <div className={css.dictNote}>{t('pte.dict.loading')}</div>}
        {d.state === DICT_NONE && <div className={css.dictNote}>{t('pte.dict.none')}</div>}
        {lines.length > 0 && (
          <div className={css.dictSec}>
            <div className={css.dictLines}>{lines}</div>
          </div>
        )}
        {forms.length > 0 && (
          <div className={css.dictSec}>
            <span className={css.dictTag}>{t('pte.dict.forms')}</span>
            {forms}
          </div>
        )}
      </div>
    </Modal>
  )
}
