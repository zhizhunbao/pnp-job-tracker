'use client'
/**
 * quiz 域的结构:选目标省(十省药丸 + 一颗「还不确定」)。
 * 「还不确定」是**一等答案**,不是跳过(2026-08-12 Frank:「很多人不知道去哪个省,
 * 比如国内的厨师」)。选它 = 不按省过滤,13 条通道全判一遍再按障碍难度排 ——
 * 「该去哪个省」本来就该由我们回答,不该当成必答题拦在门口。
 * 2026-08-28 换装批自 ProvincePicker.tsx(本文件的前身,git mv 保历史)整体重写成
 * 小写件形制:两格状态收进 hooks.ts、手柄下沉 functions.ts、内联样式迁 quiz.module.css、
 * 药丸拆成一件一文件并改经 button 族。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { CANADA_PROVINCES, KEY_PROV_HEAD, TEXT_NONE } from './constants'
import { ProvPill } from './provpill'
import { QuizNav } from './quiznav'
import { QuizSub } from './quizsub'
import { QuizTitle } from './quiztitle'
import { provNextOffOf } from './functions'
import { useProvincePicker } from './hooks'
import type { ProvincePickerIn } from './types'
import css from './quiz.module.css'

/**
 * 渲染选目标省页。
 *
 * @param props 取词函数、进来时已选的省码与「还不确定」态、收卷钮的字与四个出口。
 * @returns 题干 + 药丸排 + 动作条。
 */
export function ProvincePicker({
  t, initial, onChange, onDone, onBack, unsure, finishLabel, onFinish,
}: ProvincePickerIn) {
  const d = useProvincePicker({ initial, unsure, onChange, onDone, onFinish })
  const off = provNextOffOf({ selected: d.selected, anyProv: d.anyProv })
  const pills = []
  for (const code of CANADA_PROVINCES) {
    pills.push(
      <ProvPill key={code}
        label={t(KEY_PROV_HEAD + code)}
        on={d.selected.includes(code)}
        onPick={d.pickOf(code)} />,
    )
  }
  let hint = TEXT_NONE
  if (off) {
    hint = t('quiz.pickProvince')
  }
  let done = TEXT_NONE
  if (finishLabel != null && off === false) {
    done = finishLabel
  }
  return (
    <>
      <QuizTitle>{t('quiz.q3')}</QuizTitle>
      <QuizSub>{t('quiz.q3multiSub')}</QuizSub>
      <div className={css.provWrap}>
        {pills}
        <ProvPill label={t('quiz.provAny')} on={d.anyProv} onPick={d.onAny} />
      </div>
      <QuizNav prevLabel={t('plan.prev')}
        nextLabel={t('plan.next')}
        onPrev={onBack}
        nextDisabled={off}
        onNext={d.onNext}
        hint={hint}
        doneLabel={done}
        onDone={d.onFinish} />
    </>
  )
}
