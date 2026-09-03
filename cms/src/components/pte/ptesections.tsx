'use client'
/**
 * 域内小件:题型四栏面板(口语 / 写作 / 阅读 / 听力;照小枫叶「练习」面板整块铺开 ——
 * Frank 2026-09-03「可以按这种整体都显示出来」「最好是有点设计质感的」):栏头带色图标与下划线,
 * 19 型全列;有题的是药丸钮带括号题数(2026-09-04 Frank「星星是什么意思」→ 重要度星撤;「和按钮放在一起,用括号」)(当前型亮态 —— Frank 2026-09-04「可以点击的应该显示成按钮」),
 * 没题的灰字不可点、不写解释。手机四栏叠一列。
 *
 * @author Frank
 * @time 2026-09-03 12:00:00
 */
import { cssOf } from '@/components/css'
import { IconChat, IconClipboard, IconMedal, IconNews } from '@/components/icons'
import { Chip } from '@/components/chip'
import { CLS_SEP, SEC_READING, SEC_SPEAKING, SEC_WRITING } from './constants'
import { listHrefOf, sectionLabelOf, sectionsOf, typeLabelOf, typeNameOf } from './functions'
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
      let body = <span className={css.typeOff}>{name}</span>
      if (x.count > 0) {
        body = (
          <Chip href={listHrefOf({ type: x.code })} active={x.code === type}>
            {typeLabelOf({ name, count: x.count })}
          </Chip>
        )
      }
      rows.push(
        <div key={x.code} className={css.typeRow}>
          {body}
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
