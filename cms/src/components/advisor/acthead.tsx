'use client'
/**
 * 职位描述弹框的页眉左块:灰色小标 + 岗位名 + NOC 官方职业名译名。
 * 页眉与其余弹框统一灰(Frank 2026-07-21;「打开完整页」在 JobBody 的胶囊钮行)。
 * #199(Frank「chiropractor 怎么没有翻译呢」):标题下挂译名(与详情页 H1 同款,英文界面不出)。
 * 第 5 轮 #16:试用额度可见化 —— 剩余次数由 JobBody 回传后挂在这里。
 * 2026-08-28 换装批自 Advisor.tsx 的 ActModal 页眉段提出成件。
 * 2026-09-16 Frank「右边的按钮部分和左边的中文翻译放到一行」「可以」:译名自左块拆出成译名行,右端挂切换控件(ctl 槽,
 * jobs 桶 JdSwitches);译名行在标题栏里折到窗口钮下方占满整宽,按下不起拖动(点控件不会把弹框拖走)。
 * 2026-09-26 Frank 看过效果图点头:岗位名下加一行日期(dates 槽,jobs 桶 JobDates;与详情页 H1 下同一件、同一位置)。
 * 同日晚 Frank「还有这两个是不是要换个位置」:日期行挪到灰字译名行下面(岗位名 → 译名 → 日期;详情页同改)。
 * 日期行不进左块:与译名行一样折到标题与窗口钮那一行下面、独占一整行 —— 手机全屏档左块被窗口钮占去一截,两格并排放不下。
 * 2026-09-27 Frank「放到 jd 正文部分如何」→ 看过效果图选 ①:日期改成正文里单独一节(jobs 桶 JdContent 末尾),dates 槽撤。
 * 2026-09-28 并壳(Frank「别并存啊」):版式(左块 + 译名行)并进 modal 桶的 ModalHead,这里只剩「小标写什么」。
 * 2026-10-01 Frank「这种有点突兀」「这种也突兀」(没正文 / 整理版 / 原帖三档里那一节都不搭)→ 选「回到职位名下面」:dates 槽挂回,排在 ModalHead(左块 + 译名行)之后。
 * 2026-10-02 Frank「这个放到右边 和 灰字翻译在一行可以吗」「可以,按你说的做」:日期改走 ModalHead 的信息槽(meta),
 * 与灰字译名同一行、贴右排在「查看原帖」前;窄档整块换到下一行仍贴右。
 *
 * @author Frank
 * @time 2026-08-28 22:40:00
 */
import { KickerNote, ModalHead } from '@/components/modal'
import type { ActHeadIn } from './types'

/**
 * 渲染职位描述弹框的页眉左块。
 *
 * @param props 取词函数、岗位名、译名、剩余次数、切换控件与日期行。
 * @returns 页眉左块 + 译名行(日期在译名行里贴右)。
 */
export function ActHead({ t, title, sub, freeLeft, ctl, dates }: ActHeadIn) {
  return (
    <ModalHead title={title} sub={sub} ctl={ctl} meta={dates}
      kicker={(
        <>
          {t('act.descTitle')}
          {freeLeft != null && <KickerNote text={t('advisor.left', { n: freeLeft })} />}
        </>
      )} />
  )
}
