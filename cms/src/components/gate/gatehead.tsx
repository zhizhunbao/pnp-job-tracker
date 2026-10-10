'use client'
/**
 * 访客向导的顶行:左边返回钮(第 1 题不出钮、位子照占,四道题的进度条起点对齐),右边四段进度条(走到第 N 题前 N 段主色)。
 * 2026-10-04 访客四题改版立,替掉首访向导那副「第 N 步 · 共 4 步」字行 + 单条进度条;字行撤了,
 * 进度条挂无障碍角色与原那句 ob.step 当标签,读屏照旧报得出走到第几步。右边给弹框的 × 让位(见 gate.module.css 的 .head)。
 * 同日 Frank「四个答题横线去掉吧」:看得见的四段撤了,顶行只剩返回钮与右上角的 ×;进度条那一格留着(不画段、零高),
 * 只给读屏报第几步。
 * 2026-10-05 Frank「左边那个按钮 和 右边的 关闭 按钮不对称啊」:返回钮搬给弹框壳(modal 桶左上角 back 位,与 × 同款镜像),
 * 顶行只剩给读屏的进度条;这一行的高照留,题面照旧落在两颗钮下面。
 * 同日 Frank「这三个放一行吗?」:题面搬进顶行(自 GateWizard 挪来,id 与 tabIndex -1 照旧 —— 换题挪焦点落在它上面),
 * 在左上返回钮与右上 × 之间居中;进度条零宽,读屏先报第几步再念题。
 *
 * 2026-10-09「我的档案」批:一共几题读整机(访客向导 4、编辑模式 5),不再写死四道。
 *
 * @author Frank
 * @time 2026-10-04 02:10:00
 */
import { cssOf } from '@/components/css'
import { ROLE_PROGRESS } from './constants'
import { gateQuestionKeyOf } from './functions'
import type { GatePartIn } from './types'
import css from './gate.module.css'

/**
 * 顶行。
 *
 * @param props 访客向导整机与取词函数(见 GatePartIn 逐格注释)。
 * @returns 只给读屏的进度条 + 题面(与两颗钮同一行)。
 */
export function GateHead({ g, t }: GatePartIn) {
  return (
    <div className={cssOf(css.head)}>
      <div className={cssOf(css.bar)}
        role={ROLE_PROGRESS}
        aria-valuemin={1}
        aria-valuemax={g.total}
        aria-valuenow={g.step + 1}
        aria-label={t('ob.step', { i: g.step + 1, n: g.total })} />
      <div id={g.qid} tabIndex={-1} className={cssOf(css.question)}>{t(gateQuestionKeyOf({ step: g.cur }))}</div>
    </div>
  )
}
