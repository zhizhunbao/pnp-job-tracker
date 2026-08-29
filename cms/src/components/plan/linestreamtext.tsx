'use client'
/**
 * plan 域的小件:一轮抽选的官方通道名,底下挂中文灰注。
 * 走查 #297:官方通道名不许截断(「Alberta Express Entry Stream – Priority Sectors
 * (Constructio…」)—— 英文界面拿到的就是官方原名,我们**没有权力**给它编个短名,
 * 放不下就换行。灰注**只在 zh 界面出**:官方原名是事实,译名是辅助,不能反过来盖掉原名。
 * 手机卡与桌面表共用这一件 —— 两处摆的本来就是同一件东西。
 * 2026-08-28 换装批第二段自 ScoreLineCard.tsx 里逐字重复两遍的那段通道名提出成件。
 *
 * @author Frank
 * @time 2026-08-28 02:15:00
 */
import { streamZhShownOf } from './functions'
import type { LineStreamTextIn } from './types'
import css from './plan.module.css'

/**
 * 渲染通道原名与它的中文灰注。
 *
 * @param props 界面语与这一轮抽选。
 * @returns 通道名。
 */
export function LineStreamText({ lang, draw }: LineStreamTextIn) {
  return (
    <>
      {draw.stream}
      {streamZhShownOf({ lang, draw }) && <span className={css.lineStreamZh}>{draw.streamZh}</span>}
    </>
  )
}
