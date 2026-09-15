'use client'
/**
 * 域内小件:录音条(照小枫叶 —— Frank 2026-09-04「改成这种」):居中圆形麦克风钮(没在录 = 点了开录,
 * 在录 = 红色跳动 + 秒数,点了停止提交),右侧 ↻ 重做;准备倒计时撤(「不要显示准备时间」)。
 * 2026-09-04 Frank「这个文字删了吧,都知道是录音」:钮下只在录时显秒数,没在录不写字(aria 仍带「录音」);
 * 同日「点了答案之后再点录音就不好使了,为什么还显示录音」+「上面的 section 只显示固定的」:提交后条不撤,
 * 中间的麦克风换成我的录音回放(没录到就留禁用的麦克风),右侧 ↻ 照旧。
 *
 * @author Frank
 * @time 2026-09-04 12:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { IconMic, IconRedo } from '@/components/icons'
import { CLS_SEP, KIND_ICON, KIND_PRIMARY } from './constants'
import { clockOf } from './functions'
import type { PteRecBarIn } from './types'
import css from './pte.module.css'

/**
 * 渲染录音条。
 *
 * @param props 取词函数、录音态、秒数、已提交与两个手柄。
 * @returns 录音条。
 */
export function PteRecBar({ t, recording, seconds, checked, recUrl, onMic, onRedo }: PteRecBarIn) {
  let micCls = cssOf(css.micRound)
  let under = t('pte.rec')
  if (recording) {
    micCls = micCls + CLS_SEP + cssOf(css.micOn)
    under = clockOf({ seconds })
  }
  return (
    <div className={css.recBar}>
      <div className={css.recSpacer} />
      <div className={css.recCenter}>
        {(checked === false || recUrl == null) && (
          <Button kind={KIND_PRIMARY} onClick={onMic} disabled={checked} ariaLabel={under} className={micCls}>
            <IconMic />
          </Button>
        )}
        {recording && <span className={css.recUnder}>{under}</span>}
        {checked && recUrl != null && (
          <audio controls src={recUrl} className={css.recAudio} aria-label={t('pte.myRec')} />
        )}
      </div>
      <div className={css.recRight}>
        <Button kind={KIND_ICON} onClick={onRedo} ariaLabel={t('pte.redo')} className={cssOf(css.redoRound)}>
          <IconRedo />
        </Button>
      </div>
    </div>
  )
}
