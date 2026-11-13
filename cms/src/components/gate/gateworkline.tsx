'use client'
/**
 * gate 域的结构:工作经历的一段(2026-11-12 Frank「右侧弹 sidebar 用户一项一项填,能搜索的就弹框搜索」):
 * 第一行是职业(点开叠一层选职业框,职位匹配读它)与行尾 ✕;下面职位名称、公司、城市、起止年月(占位词即标签,都选填);
 * 最后一只多行框写做了什么 —— 空着只提示该写什么,不做按字段填空(2026-11-09 Frank「骨架 就告诉这部分应该填什么即可」)。
 *
 * @author Frank
 * @time 2026-11-12 16:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Input } from '@/components/input'
import {
  EDU_BTN_KIND, EDU_REMOVE_GLYPH, FORM_SECONDARY_KIND, K_EDU_REMOVE, K_WORK_CITY, K_WORK_DESC, K_WORK_FROM, K_WORK_OCC,
  K_WORK_ORG, K_WORK_TITLE, K_WORK_TO, TEXT_NONE,
} from './constants'
import { makeAreaSet } from './functions'
import type { GateWorkLineIn } from './types'
import {
  WORK_DESC_LEN, WORK_F_CITY, WORK_F_DESC, WORK_F_FROM, WORK_F_ORG, WORK_F_TITLE, WORK_F_TO, WORK_LINE_LEN, WORK_YM_LEN,
} from './work'
import css from './gate.module.css'

/**
 * 工作经历一段。
 *
 * @param props 整机、取词函数、第几段、这一段、职业的字与选职业手柄。
 * @returns 职业一行、明细几格与「做了什么」。
 */
export function GateWorkLine({ g, t, i, row, name, onOcc }: GateWorkLineIn) {
  const w = g.edit.w
  return (
    <div className={cssOf(css.eduRow)}>
      <div className={cssOf(css.workHead)}>
        <span className={cssOf(css.workOcc)}>
          {name === TEXT_NONE && <span className={cssOf(css.workOccNone)}>{t(K_WORK_OCC)}</span>}
          {name !== TEXT_NONE && <span>{name}</span>}
          <Button kind={FORM_SECONDARY_KIND} sm onClick={onOcc}>{t('pf.edit')}</Button>
        </span>
        <Button kind={EDU_BTN_KIND} className={cssOf(css.eduRemove)} onClick={w.workRemoveOf(i)}
          title={t(K_EDU_REMOVE)}>
          {EDU_REMOVE_GLYPH}
        </Button>
      </div>
      <div className={cssOf(css.eduDetail)}>
        <span className={cssOf(css.eduText)}>
          <Input value={row.title} onChange={w.workCellOf({ i, f: WORK_F_TITLE })} placeholder={t(K_WORK_TITLE)}
            ariaLabel={t(K_WORK_TITLE)} maxLength={WORK_LINE_LEN} />
        </span>
        <span className={cssOf(css.eduYear)}>
          <Input value={row.org} onChange={w.workCellOf({ i, f: WORK_F_ORG })} placeholder={t(K_WORK_ORG)}
            ariaLabel={t(K_WORK_ORG)} maxLength={WORK_LINE_LEN} />
        </span>
        <span className={cssOf(css.eduYear)}>
          <Input value={row.city} onChange={w.workCellOf({ i, f: WORK_F_CITY })} placeholder={t(K_WORK_CITY)}
            ariaLabel={t(K_WORK_CITY)} maxLength={WORK_LINE_LEN} />
        </span>
        <span className={cssOf(css.eduYear)}>
          <Input value={row.from} onChange={w.workCellOf({ i, f: WORK_F_FROM })} placeholder={t(K_WORK_FROM)}
            ariaLabel={t(K_WORK_FROM)} maxLength={WORK_YM_LEN} />
        </span>
        <span className={cssOf(css.eduYear)}>
          <Input value={row.to} onChange={w.workCellOf({ i, f: WORK_F_TO })} placeholder={t(K_WORK_TO)}
            ariaLabel={t(K_WORK_TO)} maxLength={WORK_YM_LEN} />
        </span>
      </div>
      <textarea className={cssOf(css.area)}
        value={row.desc}
        onChange={makeAreaSet(w.workCellOf({ i, f: WORK_F_DESC }))}
        maxLength={WORK_DESC_LEN}
        aria-label={t(K_WORK_DESC)}
        placeholder={t(K_WORK_DESC)} />
    </div>
  )
}
