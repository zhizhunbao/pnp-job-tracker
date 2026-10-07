'use client'
/**
 * 访客向导第三题「你想做什么工作?」:上面已选标签、下面热门职业大号胶囊(chip 桶 Chip 的 lg 档),多选,一点即选、再点取消。
 * 已选标签借 profile 桶的 OnboardingTags(只回显热门表外的码 —— 热门的胶囊本身已亮;长名换行;× 摘除),
 * 不在本桶另起一份标签形;胶囊的选 / 摘手柄与热门表同样借 profile 桶(热门表的主人)。预选逻辑不变(lib/guest 的 readGateSeed)。
 * 2026-10-04 访客四题改版立(原第三题照搬首访向导的职业步,标签在胶囊下面;改版照效果图把标签挪到上面)。
 * 同日收口:标签行改浅主色(tag 桶 pick 档,照效果图)、自己不带外距,与胶囊的间距只由 .jobs 的 gap 管。
 * 2026-10-04 A2:整题改用 quiz 桶的选职业控件 OccPicker(全站一份,不另写)—— 给它第 2 题选的专业码,热门那一屏换成
 * 该专业对应大类下在招最多的 24 个职业(没选专业照旧全站热门榜);大号档:大号胶囊、已选标签在最上面(它借的同一件
 * OnboardingTags,只回显这一屏胶囊外的码)、加一个搜索框;多选照旧,钮区照旧归本向导的 GateFoot。
 * 预选照旧:进来时已选的就是整机里的职业码(刚看过的职位预选进来的,A1 逻辑);名字由控件自己补。
 *
 * 2026-10-05 第 2 题改多选(至多 3 个专业):majorCode 这一格现在递的是逗号连的专业码清单(occMajorOf;接口
 * /api/quiz?major= 收逗号连的至多 3 个码,热门那一屏取它们本站大类并集下在招最多的职业)。名字还说「一个码」——
 * quiz 桶眼下有别的批次在改,等它空出来再把这一格改名(如 majorCodes),本件跟着改。
 * 2026-10-05 Frank「也改成左右 两部分吗?」「改啊」:控件的大号档改成与第 2 题同一副左右两栏(quiz 桶 OccRail:搜索框 →
 * 已选一行(全部已选职业,× 摘整组)→ 左栏「推荐」+ 全站大类、右边一列职业行;在搜时单列命中)。上面「已选标签借 OnboardingTags、
 * 只回显热门表外的码」「下面热门职业大号胶囊」「已选标签在最上面」几处作废;本件照旧只递专业码与大号档,
 * .jobs 改成与专业题 .majors 同一种宿主格(吃满剩下的高、紧接钮区),不另写摆法。
 * 同日收口:.jobs 与 .majors 逐格相同,并成一个 .picker(gate.module.css),本件与专业题 GateSteps 同挂它;上面两处「.jobs」现指 .picker。
 * 同日 Frank「点过来的时候 有一个闪 的过程」:选职业机器改由向导件 GateWizard 开屏就挂(useOccPicker,照第 2 题 useMajorPicker),
 * 本件只剩宿主格,里面摆向导件递来的 OccRail;上面「本件照旧只递专业码与大号档」作废 —— 专业码(occMajorOf)改由向导件递给机器。
 *
 * @author Frank
 * @time 2026-10-04 02:10:00
 */
import { cssOf } from '@/components/css'
import type { GateJobsIn } from './types'
import css from './gate.module.css'

/**
 * 职业题的答题区。
 *
 * @param props 职业题那一屏(见 GateJobsIn)。
 * @returns 宿主格(吃满剩下的高、紧接钮区)。
 */
export function GateJobs({ children }: GateJobsIn) {
  return <div className={cssOf(css.picker)}>{children}</div>
}
