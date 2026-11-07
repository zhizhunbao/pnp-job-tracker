/**
 * 生成简历里的一张分区卡(全局 cardMd 白卡 + mcardHead 卡头;右侧放钮或胶囊)。
 * CLAUDE.md「页面与弹框正文一律分区卡」。
 *
 * @author Frank
 * @time 2026-11-07 16:00:00
 */
import { CARD_HEAD_CLS, CARD_MD_CLS } from './constants'
import type { CvCardIn } from './types'
import css from './cv.module.css'

/**
 * 一张分区卡。
 *
 * @param props 卡标题、卡头右侧与内容。
 * @returns 卡。
 */
export function CvCard({ head, acts, children }: CvCardIn) {
  return (
    <div className={CARD_MD_CLS}>
      <div className={css.cardHead}>
        <div className={CARD_HEAD_CLS}>{head}</div>
        {acts != null && <span className={css.acts}>{acts}</span>}
      </div>
      {children}
    </div>
  )
}
