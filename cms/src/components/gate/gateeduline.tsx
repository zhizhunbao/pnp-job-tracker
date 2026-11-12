'use client'
/**
 * 教育经历题的一段(2026-10-13 档案加题;形照 10-11 资讯页「教育经历」卡的一行):
 * 院校所在地 / 公立或私立 / 课程时长三只下拉并排(占位词即标签,放不下折行),行尾 ✕ 删这一段。
 * 2026-11-12 Frank「这部分不能直接显示具体的年份和学历 证书吗?」:三只下拉上面多一排四个输入框 —— 证书或学历名称、学校、
 * 开始年份、结束年份(占位词即标签,都选填;年份只收四位数字)。
 *
 * @author Frank
 * @time 2026-10-13 02:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Input } from '@/components/input'
import { Select } from '@/components/select'
import {
  EDU_BTN_KIND, EDU_F_KIND, EDU_F_LEN, EDU_F_PROV, EDU_KINDS, EDU_LENS, EDU_PROVS, EDU_REMOVE_GLYPH, K_EDU_KIND,
  K_EDU_LEN, K_EDU_REMOVE, K_EDU_WHERE,
  EDU_CRED_LEN, EDU_F_CRED, EDU_F_FROM, EDU_F_SCHOOL, EDU_F_TO, EDU_SCHOOL_LEN, EDU_YEAR_LEN, EDU_YEAR_MODE, K_EDU_CRED,
  K_EDU_FROM, K_EDU_SCHOOL, K_EDU_TO,
} from './constants'
import { makeEduLabel } from './functions'
import type { GateEduLineIn } from './types'
import css from './gate.module.css'

/**
 * 教育经历一段。
 *
 * @param props 整机、取词函数、第几段与这一段。
 * @returns 一排明细输入框,下面一行三只下拉 + ✕。
 */
export function GateEduLine({ g, t, i, row }: GateEduLineIn) {
  return (
    <div className={cssOf(css.eduRow)}>
      <div className={cssOf(css.eduDetail)}>
        <span className={cssOf(css.eduText)}>
          <Input value={row.cred} onChange={g.edit.eduPickOf({ i, f: EDU_F_CRED })} placeholder={t(K_EDU_CRED)}
            ariaLabel={t(K_EDU_CRED)} maxLength={EDU_CRED_LEN} />
        </span>
        <span className={cssOf(css.eduText)}>
          <Input value={row.school} onChange={g.edit.eduPickOf({ i, f: EDU_F_SCHOOL })} placeholder={t(K_EDU_SCHOOL)}
            ariaLabel={t(K_EDU_SCHOOL)} maxLength={EDU_SCHOOL_LEN} />
        </span>
        <span className={cssOf(css.eduYear)}>
          <Input value={row.from} onChange={g.edit.eduPickOf({ i, f: EDU_F_FROM })} placeholder={t(K_EDU_FROM)}
            ariaLabel={t(K_EDU_FROM)} maxLength={EDU_YEAR_LEN} inputMode={EDU_YEAR_MODE} />
        </span>
        <span className={cssOf(css.eduYear)}>
          <Input value={row.to} onChange={g.edit.eduPickOf({ i, f: EDU_F_TO })} placeholder={t(K_EDU_TO)}
            ariaLabel={t(K_EDU_TO)} maxLength={EDU_YEAR_LEN} inputMode={EDU_YEAR_MODE} />
        </span>
      </div>
      <div className={cssOf(css.eduLine)}>
        <Select value={row.prov} onChange={g.edit.eduPickOf({ i, f: EDU_F_PROV })} opts={EDU_PROVS} all={t(K_EDU_WHERE)}
          labelOf={makeEduLabel({ t, f: EDU_F_PROV })} tap />
        <Select value={row.kind} onChange={g.edit.eduPickOf({ i, f: EDU_F_KIND })} opts={EDU_KINDS} all={t(K_EDU_KIND)}
          labelOf={makeEduLabel({ t, f: EDU_F_KIND })} tap />
        <Select value={row.len} onChange={g.edit.eduPickOf({ i, f: EDU_F_LEN })} opts={EDU_LENS} all={t(K_EDU_LEN)}
          labelOf={makeEduLabel({ t, f: EDU_F_LEN })} tap />
        <Button kind={EDU_BTN_KIND} className={cssOf(css.eduRemove)} onClick={g.edit.eduRemoveOf(i)}
          title={t(K_EDU_REMOVE)}>
          {EDU_REMOVE_GLYPH}
        </Button>
      </div>
    </div>
  )
}
