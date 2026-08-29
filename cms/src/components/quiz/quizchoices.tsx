'use client'
/**
 * quiz 域的结构:一道单选题的选项组。value 用受控 radio:选中不自动跳
 * (2026-07-31 Frank),跳转永远由用户按。
 * 选项两列铺开(≥900px)、每张卡片带字母徽标的口径写在 QuizStyle 那段样式里。
 * 2026-08-28 换装批自 QuizUI.tsx 提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { ROLE_RADIOGROUP } from './constants'
import { QuizChoiceRow } from './quizchoicerow'
import { alphaOf, listCls, makeChoicePick } from './functions'
import type { QuizChoicesIn } from './types'

/**
 * 渲染一道单选题的全部选项。
 *
 * @param props 同组名、全部选项、当前值、选中落格与界面语言。
 * @returns 选项组。
 */
export function QuizChoices<T extends string | number>({
  name, choices, value, onPick, lang,
}: QuizChoicesIn<T>) {
  const rows = []
  for (let i = 0; i < choices.length; i += 1) {
    const c = choices[i]
    if (c != null) {
      rows.push(
        <QuizChoiceRow key={String(c.value)}
          name={name}
          on={value === c.value}
          alpha={alphaOf({ i })}
          text={c.text}
          lang={lang}
          onPick={makeChoicePick({ value: c.value, onPick })} />,
      )
    }
  }
  return <div className={listCls()} role={ROLE_RADIOGROUP}>{rows}</div>
}
