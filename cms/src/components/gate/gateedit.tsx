'use client'
/**
 * 档案编辑弹框(2026-10-09「我的档案」批,Frank「答题还是之前弹框的那种干净。样式也好看」):与访客向导同一个弹框、同一套题、
 * 同一副样子(顶行、各题、粘底主钮),只是从档案里的答案起头、末尾多问英文姓名、最后一题点「保存」,没有注册屏。
 * 整机在 hooks 的 useGateEdit;本件只拼装(专业选择器、职业选择器照访客向导挂法)。
 *
 * @author Frank
 * @time 2026-10-09 22:30:00
 */
import { cssOf } from '@/components/css'
import { MajorPicker, useMajorPicker } from '@/components/majors'
import { Modal } from '@/components/modal'
import { OccRail, useOccPicker } from '@/components/quiz'
import { GATE_MODAL_SIZE } from './constants'
import { GateFoot } from './gatefoot'
import { GateHead } from './gatehead'
import { occMajorOf } from './functions'
import { GateSteps } from './gatesteps'
import { useGateEdit } from './hooks'
import type { GateEditIn } from './types'
import css from './gate.module.css'

/**
 * 档案编辑弹框。
 *
 * @param props 取词函数、起始答案、关框与保存成功。
 * @returns 弹框。
 */
export function GateEdit({ t, seed, onClose, onSaved }: GateEditIn) {
  const g = useGateEdit({ t, seed, onClose, onSaved })
  const picker = useMajorPicker({ value: g.majors, onChange: g.onMajors })
  const occ = useOccPicker({
    t, lang: g.lang, initial: g.nocs, onChange: g.setNocs, onDone: g.onNext, majorCode: occMajorOf(g.majors),
  })
  return (
    <Modal onClose={g.onClose} size={GATE_MODAL_SIZE} draggable edgeResize back={g.back} fitKey={g.cur}>
      <div className={cssOf(css.wizard)}>
        <GateHead g={g} t={t} />
        <GateSteps g={g} t={t} jobs={<OccRail t={t} lang={g.lang} d={occ} />}>
          <MajorPicker picker={picker} t={t} lang={g.lang} />
        </GateSteps>
        <GateFoot g={g} t={t} />
      </div>
    </Modal>
  )
}
