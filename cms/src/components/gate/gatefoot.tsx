'use client'
/**
 * 访客向导的钮区:整宽主钮「下一步」+ 下面一行灰字「跳过这步」,粘在弹框底部(内容超高时题区滚,钮不动)。
 * 目标题不出主钮 —— 两张大卡点了就进下一题,只留「跳过这步」。主钮照 A1 起的判定:这一题没选也照常可点、照常往下走
 * (下一步不判答没答,makeGateNext 不改);跳过与下一步的差别在跳过先清掉这一题的答案。
 * 2026-10-04 访客四题改版立,替掉借首访向导的钮组(左跳过、右上一步 / 下一步;上一步挪去顶行的返回钮)。
 * 同日收口:主钮的高、圆角、字号走 button 桶的 xl 档,本域只给整宽。
 * 同日 Frank「跳过这步 去掉」:「跳过这步」撤;主钮改成这一题答了才可点(没答灰着点不动,判定见 functions 的 gateNextOffOf)——
 * 上面那句「没选也照常可点」作废,否则主钮自己就是一个看不见的跳过。目标题(两张大卡点了就走)整块钮区不出。
 *
 * 2026-10-09「我的档案」批:主钮的字读整机(编辑模式最后一题是「保存」);保存没成时钮上方摆一行「没存上」。
 * 2026-10-11「进我的求职先弹五题」:整机说出「跳过这步」(g.edit.skip:只问没答那几题的弹法里、这一题还空着)时,
 * 主钮下面摆一颗灰字「跳过这步」,点了 = 往后走;目标题照旧不出主钮,只摆它。别的弹法 g.edit.skip 恒 false,长相不变。
 *
 * @author Frank
 * @time 2026-10-04 02:10:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { GATE_STEP_GOAL, SKIP_BTN_KIND, SKIP_KEY, TEXT_NONE } from './constants'
import type { GatePartIn } from './types'
import css from './gate.module.css'

/**
 * 粘底钮区。
 *
 * @param props 访客向导整机与取词函数(见 GatePartIn 逐格注释)。
 * @returns 主钮(可跳时下面多一颗「跳过这步」);目标题 null(可跳时只摆「跳过这步」)。
 */
export function GateFoot({ g, t }: GatePartIn) {
  const goal = g.cur === GATE_STEP_GOAL
  if (goal && g.edit.skip === false) {
    return null
  }
  return (
    <div className={cssOf(css.foot)}>
      {g.edit.failKey !== TEXT_NONE && <div className={cssOf(css.fail)}>{t(g.edit.failKey)}</div>}
      {goal === false && (
        <Button xl onClick={g.onNext} disabled={g.nextOff} className={cssOf(css.next)}>{t(g.edit.nextKey)}</Button>
      )}
      {g.edit.skip && (
        <Button kind={SKIP_BTN_KIND} onClick={g.onNext} disabled={g.edit.saving} className={cssOf(css.skip)}>
          {t(SKIP_KEY)}
        </Button>
      )}
    </div>
  )
}
