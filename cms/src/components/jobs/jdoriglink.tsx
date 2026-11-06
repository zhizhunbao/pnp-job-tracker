'use client'
/**
 * JD 标题区右端的一行小字:「查看原帖」/「返回整理版」—— 在整理版与原帖正文之间就地切换。
 * 2026-09-19 Frank「中文和韩语场景都自动整理自动翻译吧,这两个都删掉吧」「开关都撤了,就自动翻译」「加一个查看原帖的小字」:
 * 原来这里是 JdSwitches(中文对照开关 + 整理版 / 原文分段钮,09-16 定型):开关撤 —— 中 / 韩界面对照恒显;分段钮撤 ——
 * 默认就是整理版,想核对原帖的点这行小字。位置不变(标题译名同一行的右端;弹框 ActHead、详情页 Job 各挂一处)。
 * 整理版还没回或失败时不出(正文本来就是原帖,无可切)。
 * 2026-10-13 Frank「这个按钮放到 查看原帖 后面」「挪到标题行,管整页灰字」:「隐藏翻译 / 显示翻译」从相关职位卡右上挪来,
 * 跟在「查看原帖」后面(中 / 韩界面才出)。同日改判:只藏 / 出 JD 正文译文(Frank「只需要隐藏正文翻译内容」),
 * 且与「查看原帖」同时出(Frank「打开页面这两个要同时刷出来」)—— 都等整理版到了再出,译文本来只铺在整理版下面。
 * 2026-11-05 Frank「隐藏翻译这个按钮应该放到 查看原贴 左边,然后控制这个弹框的所有翻译部分」:挪到「查看原帖」左边;
 * 管的范围由「只藏正文译文」改回整片 —— 宿主(弹框 ActJd / 详情页 Job)把开关态挂 name 桶 TransProvider,
 * 标题译名、正文译文、职位信息卡地点、公司信息卡简介译文、相关职位的灰字一起听它。
 *
 * @author Frank
 * @time 2026-09-19 04:30:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { BTN_GHOST, JD_DONE } from './constants'
import { origLinkLabelOf, transToggleLabelOf } from './functions'
import type { JdOrigLinkIn } from './types'
import css from './jobs.module.css'

/**
 * 渲染「查看原帖 / 返回整理版」小字。
 *
 * @param props JD 身体状态机。
 * @returns 一行小字;正文没取到或没有整理版时两颗都不出,英文界面不出「隐藏翻译」。
 */
export function JdOrigLink({ d }: JdOrigLinkIn) {
  const orig = d.status === JD_DONE && d.fmt != null
  if (orig === false) {
    return null
  }
  return (
    <span className={cssOf(css.aiCtl)}>
      {d.hasSub && (
        <Button kind={BTN_GHOST} onClick={d.onToggleSub} className={cssOf(css.origLink)}>
          {transToggleLabelOf({ t: d.t, show: d.showSub })}
        </Button>
      )}
      <Button kind={BTN_GHOST} onClick={d.onToggleOrig} className={cssOf(css.origLink)}>
        {origLinkLabelOf({ t: d.t, showOrig: d.showOrig })}
      </Button>
    </span>
  )
}
