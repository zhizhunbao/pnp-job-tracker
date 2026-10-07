'use client'
/**
 * 访客向导(2026-10-03 付费闭环批 A1,设计稿 docs/design/付费闭环-20261003.md):未登录的人点开职位弹框、点投递 / 收藏、
 * 或进站时弹出 —— 四道点选题(目标 / 专业 / 想做什么工作 / 现在在哪个省)→ 第五屏注册。
 * 注册屏就地换成现成的 AuthForm 注册态(同一个弹框里换内容,不走 AuthModal 的 sm 壳),不出顶行与钮区 ——
 * 注册不可跳过,× 可关。弹框用 modal 桶的 card 档:电脑中号居中,手机居中卡片。
 * 状态机器住 hooks 的 useGateWizard,本件只拼装。
 * 2026-10-04 访客四题改版(方向二「图标卡格」,效果图 docs/design/img/访客四题-方向二-*-20261004.png):自 profile 桶迁入 gate 桶;
 * 外壳不再借首访向导的步数行 / 钮组 —— 顶行换成返回钮 + 四段进度条(GateHead),钮区换成粘底整宽主钮 +「跳过这步」(GateFoot),
 * 选项一律走 chip 桶的选择格与大号胶囊。
 * 同日收口审查:题面挂整机给的 id 与 tabIndex -1(只许程序挪焦点进来、不进 Tab 序列)—— 换了题焦点挪到题面上(整机的 effect 挪)。
 * 2026-10-05 Frank「左边那个按钮 和 右边的 关闭 按钮不对称啊」「这个框也可以拖动,放大缩小吧。和其他的框一样吧」:
 * 返回钮交给弹框壳的左上角 back 位(与 × 同款镜像);弹框照 pte 字典弹框开拖动与四边拉伸(电脑上;手机居中卡片,壳自己关);
 * 四道题包一层竖排(.wizard 吃满白卡的高),拉高之后专业题的左右两栏跟着长。
 * 同日「这三个放一行吗?」:题面搬进 GateHead(与两颗钮同一行),本件不再摆题面。
 * 同日「这个也是很多空白」「都有这个问题」:换屏键交当前这一题(fitKey),换题时弹框拉出来的高撤掉回到随内容,位置与宽不动。
 * 2026-10-05 专业题的选择器搬去 components/majors:本件开屏挂它的机器 useMajorPicker(值与上报口取整机的专业码清单;
 * 原先整机里挂的专业题机器搬来这里,照旧开屏就取热门、前后翻题状态留着),专业那一屏(MajorPicker)当 children 递给题目分派。
 * 2026-10-05 Frank「点过来的时候 有一个闪 的过程」:选职业机器也开屏就挂(quiz 桶 useOccPicker,专业码随第 2 题的选择变),
 * 第 2 题时推荐清单与草稿里已选职业的名字就取好,点进第 3 题不再先摆「加载中」与空白标签;那一屏(OccRail)当 jobs 递给题目分派。
 *
 * @author Frank
 * @time 2026-10-04 02:10:00
 */
import { AuthForm } from '@/components/auth'
import { cssOf } from '@/components/css'
import { MajorPicker, useMajorPicker } from '@/components/majors'
import { Modal } from '@/components/modal'
import { OccRail, useOccPicker } from '@/components/quiz'
import { GATE_AUTH_MODE, GATE_MODAL_SIZE, GATE_STEP_REG } from './constants'
import { GateFoot } from './gatefoot'
import { GateHead } from './gatehead'
import { occMajorOf } from './functions'
import { GateSteps } from './gatesteps'
import { useGateWizard } from './hooks'
import type { GateWizardIn } from './types'
import css from './gate.module.css'

/**
 * 访客向导。
 *
 * @param props 取词函数、由头、回跳地址、层级与关闭 / 交还两个回调(见 GateWizardIn 逐格注释)。
 * @returns 向导弹框。
 */
export function GateWizard({ t, intent, returnTo, z, onClose, onDone }: GateWizardIn) {
  const g = useGateWizard({ intent, onDone, onClose, t })
  const picker = useMajorPicker({ value: g.majors, onChange: g.onMajors })
  const occ = useOccPicker({
    t, lang: g.lang, initial: g.nocs, onChange: g.setNocs, onDone: g.onNext, majorCode: occMajorOf(g.majors),
  })
  return (
    <Modal onClose={g.onClose} size={GATE_MODAL_SIZE} z={z} draggable edgeResize back={g.back} fitKey={g.cur}>
      {g.cur === GATE_STEP_REG && (
        <AuthForm t={t} initialMode={GATE_AUTH_MODE} returnTo={returnTo} keepPage onDone={g.onRegistered} />
      )}
      {g.cur !== GATE_STEP_REG && (
        <div className={cssOf(css.wizard)}>
          <GateHead g={g} t={t} />
          <GateSteps g={g} t={t} jobs={<OccRail t={t} lang={g.lang} d={occ} />}>
            <MajorPicker picker={picker} t={t} lang={g.lang} />
          </GateSteps>
          <GateFoot g={g} t={t} />
        </div>
      )}
    </Modal>
  )
}
