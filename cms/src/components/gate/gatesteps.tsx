'use client'
/**
 * 访客向导的题目分派:停在哪一题就渲哪一题的答题区。2026-10-03 付费闭环批 A1 立(当时目标、专业、所在省三步走首访向导的
 * 单选行,职业照搬首访向导的职业步)。
 * 2026-10-04 访客四题改版自 profile 桶迁入并换装:目标 = 两张大卡(GateGoal)、专业 = 大号胶囊(GateMajors)、
 * 职业 = 已选标签 + 大号胶囊(GateJobs)、所在省 = 选择格子(GateProvs)。
 * 2026-10-05 专业题的选择器搬去 components/majors(GateMajors 撤):专业那一屏由向导件 GateWizard 挂好机器、当 children
 * 递进来(机器开屏就挂,走到这一题时热门多半已到、前后翻题状态留着),本件只给它包一层 .majors(在向导竖排里吃满多出来的高、
 * 下面紧接粘底钮区)。
 * 2026-10-05 收口:那一层的类 .majors 与职业题的 .jobs 逐格相同,并成 .picker(gate.module.css;职业题 GateJobs 同挂它)。
 *
 * 2026-10-09「我的档案」批:编辑模式末尾多一屏英文姓名(GateName)。
 *
 * @author Frank
 * @time 2026-10-04 02:10:00
 */
import { cssOf } from '@/components/css'
import { GATE_STEP_GOAL, GATE_STEP_JOB, GATE_STEP_MAJOR, GATE_STEP_NAME } from './constants'
import { GateGoal } from './gategoal'
import { GateJobs } from './gatejobs'
import { GateName } from './gatename'
import { GateProvs } from './gateprovs'
import type { GateStepsIn } from './types'
import css from './gate.module.css'

/**
 * 当前这一题的答题区。
 *
 * @param props 访客向导整机、取词函数、专业题与职业题两屏(见 GateStepsIn 逐格注释)。
 * @returns 这一题的答题区;走到最后一路 = 所在省那一题。
 */
export function GateSteps({ g, t, children, jobs }: GateStepsIn) {
  if (g.cur === GATE_STEP_GOAL) {
    return <GateGoal g={g} t={t} />
  }
  if (g.cur === GATE_STEP_MAJOR) {
    return <div className={cssOf(css.picker)}>{children}</div>
  }
  if (g.cur === GATE_STEP_JOB) {
    return <GateJobs>{jobs}</GateJobs>
  }
  if (g.cur === GATE_STEP_NAME) {
    return <GateName g={g} t={t} />
  }
  return <GateProvs g={g} t={t} />
}
