'use client'
/**
 * quiz 域的结构:选职业 = **控件**,不是问卷题(2026-07-31 Frank「统一一下答题功能,
 * 不需要弹框答题了」)。
 *
 * 为什么单独抽出来:三问里「处境」「目标省」是四选一,能并进 SurveyJS 答题器;而「选职业」是
 * 搜索 + 多选的控件,SurveyJS 没有这种题型。硬塞成题型 = 为了统一而造轮子。所以拆成两半:
 * 四选一的题归答题器,选职业归这个控件,全站共用一份(答题器的职业 chip、职位板、详情页都用它)。
 *
 * 数据口径照旧(与三问同源,不新写端点):热门清单 = 库里在招量前 24(`/api/quiz?top=24`),
 * 拿不到退回内置常用清单;搜索 = `/api/quiz?q=`(≥2 字、防抖);chip 上挂真在招数。
 *
 * 2026-08-28 换装批自 OccPicker.tsx(本文件的前身,git mv 保历史)整体重写成小写件形制:
 * 十格状态收进 hooks.ts 的 useOccPicker、取数与手柄下沉 functions.ts、组件体内那段 `<style>`
 * 的死值进 constants.ts 由 OccStyle 注、内联样式迁 quiz.module.css、排版按一件一文件拆成
 * 九件,本件只剩「装机 + 要不要套弹层」。
 *
 * 2026-10-04 A2(访客第 3 题「你想做什么工作?」复用本控件,不另写):多收两格 —— majorCode(热门那一屏换成该专业
 * 对应大类下在招最多的职业,/api/quiz?major=)与 lg(大号档:chip 桶大号胶囊、已选标签在上、钮区归宿主)。
 * 两格都不给时与改前逐字同行为(职位板、详情页、决策页三处消费者一个未碰)。
 * 2026-10-05 Frank「也改成左右 两部分吗?」「改啊」:大号档改成与第 2 题专业选择器同一副左右两栏(OccRail;搜索框 → 已选一行 →
 * 左栏「推荐」+ 全站大类、右边一列职业行 / 在搜时单列命中),上面「chip 桶大号胶囊、已选标签在上」作废;钮区照旧归宿主。
 * 整机(取数、归组、点选)一格未动,常规档照旧。
 *
 * @author Frank
 * @time 2026-08-28 04:10:00
 */
import { TEXT_NONE } from './constants'
import { OccBody } from './occbody'
import { OccModal } from './occmodal'
import { useOccPicker } from './hooks'
import type { OccPickerIn } from './types'

/**
 * 渲染选职业控件。
 *
 * @param props 取词函数、界面语言码、进来时已选的码、服务端热门榜、五个形态档、四个出口与专业码。
 * @returns 铺在答题卡里时直接给正文;否则套一层弹层。
 */
export function OccPicker({
  t, lang, initial, onDone, onChange, onClose, inline, doneLabel, hideDone, initialTop,
  finishLabel, onFinish, majorCode = TEXT_NONE, lg = false,
}: OccPickerIn) {
  const d = useOccPicker({ t, lang, initial, initialTop, onChange, onDone, majorCode })
  const body = (
    <OccBody t={t}
      lang={lang}
      d={d}
      inline={inline}
      hideDone={hideDone}
      doneLabel={doneLabel}
      finishLabel={finishLabel}
      onClose={onClose}
      onFinish={onFinish}
      lg={lg} />
  )
  if (inline === true) {
    return body
  }
  return <OccModal onClose={onClose}>{body}</OccModal>
}
