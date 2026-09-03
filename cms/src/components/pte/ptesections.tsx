'use client'
/**
 * 域内小件:题型四栏面板(口语 / 写作 / 阅读 / 听力;照小枫叶「练习」面板整块铺开 ——
 * Frank 2026-09-03「可以按这种整体都显示出来」「最好是有点设计质感的」):栏头带色图标与下划线,
 * 19 型全列带重要度星;有题的是真链接、当前型主色加粗,没题的灰字不可点、不写解释。手机四栏叠一列。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { cssOf } from '@/components/css'
import { IconChat, IconClipboard, IconMedal, IconNews } from '@/components/icons'
import { LinkButton } from '@/components/button'
import { CLS_SEP, SEC_READING, SEC_SPEAKING, SEC_WRITING } from './constants'
import { listHrefOf, sectionLabelOf, sectionsOf, starsOf, typeNameOf } from './functions'
import type { PteSectionsIn } from './types'
import css from './pte.module.css'

/**
 * 渲染四栏面板。
 *
 * @param props 题型维度、当前题型、界面语言与取词函数。
 * @returns 四栏。
 */
export function PteSections({ types, type, lang, t }: PteSectionsIn) {
  const cols = []
  for (const sec of sectionsOf({ types })) {
    const rows = []
    for (const x of sec.types) {
      const name = typeNameOf({ type: x, lang })
      const stars = starsOf({ weight: x.weight })
      let body = <span className={css.typeOff}>{name}</span>
      if (x.count > 0 && x.code === type) {
        body = <span className={css.typeNow}>{name}</span>
      } else if (x.count > 0) {
        body = <LinkButton href={listHrefOf({ type: x.code })} className={cssOf(css.typeLink)}>{name}</LinkButton>
      }
      rows.push(
        <div key={x.code} className={css.typeRow}>
          {body}
          <span className={css.typeStars}>{stars}</span>
        </div>,
      )
    }
    let icon = <IconMedal />
    let tone = cssOf(css.secListening)
    if (sec.section === SEC_SPEAKING) {
      icon = <IconChat />
      tone = cssOf(css.secSpeaking)
    } else if (sec.section === SEC_WRITING) {
      icon = <IconClipboard />
      tone = cssOf(css.secWriting)
    } else if (sec.section === SEC_READING) {
      icon = <IconNews />
      tone = cssOf(css.secReading)
    }
    cols.push(
      <div key={sec.section} className={css.secCol}>
        <div className={css.colHead}>
          <span className={cssOf(css.secIcon) + CLS_SEP + tone}>{icon}</span>
          {sectionLabelOf({ t, section: sec.section })}
        </div>
        {rows}
      </div>,
    )
  }
  return <div className={css.secCols}>{cols}</div>
}
