'use client'
/**
 * 教育经历题的一段(2026-10-13 档案加题;形照 10-11 资讯页「教育经历」卡的一行):
 * 院校所在地 / 公立或私立 / 课程时长三只下拉并排(占位词即标签,放不下折行),行尾 ✕ 删这一段。
 * 2026-11-12 Frank「这部分不能直接显示具体的年份和学历 证书吗?」:三只下拉上面多一排四个输入框 —— 证书或学历名称、学校、
 * 开始年份、结束年份(占位词即标签,都选填;年份只收四位数字)。
 *
 * 同日:学校那一格边打字边搜指定院校名单(结果摆在格子下面,选中带出所在省与公立私立;名单里没有的照常手填)。
 * 同日 Frank「教育经历 和 专业是不是重复了」:最上面多一行专业(名字 + 「修改」,点开叠一层专业选择框,一段只挂一个专业)。
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
  EDU_CRED_LEN, EDU_F_CRED, EDU_F_FROM, EDU_F_TO, EDU_SCHOOL_LEN, EDU_YEAR_LEN, EDU_YEAR_MODE, K_EDU_CRED,
  K_EDU_FROM, K_EDU_SCHOOL, K_EDU_TO, FORM_SECONDARY_KIND, K_EDU_MAJOR_NONE, TEXT_NONE,
} from './constants'
import { makeEduLabel } from './edu'
import { GateSchoolHits } from './gateschoolhits'
import type { GateEduLineIn } from './types'
import css from './gate.module.css'

/**
 * 教育经历一段。
 *
 * @param props 整机、取词函数、第几段、这一段、专业的名字、专业的修改手柄与搜学校整机。
 * @returns 专业一行,一排明细输入框,下面一行三只下拉 + ✕。
 */
export function GateEduLine({ g, t, i, row, major, onMajor, sch }: GateEduLineIn) {
  return (
    <div className={cssOf(css.eduRow)}>
      <div className={cssOf(css.workOcc)}>
        {major === TEXT_NONE && <span className={cssOf(css.workOccNone)}>{t(K_EDU_MAJOR_NONE)}</span>}
        {major !== TEXT_NONE && <span>{major}</span>}
        <Button kind={FORM_SECONDARY_KIND} sm onClick={onMajor}>{t('pf.edit')}</Button>
      </div>
      <div className={cssOf(css.eduDetail)}>
        <span className={cssOf(css.eduText)}>
          <Input value={row.cred} onChange={g.edit.eduPickOf({ i, f: EDU_F_CRED })} placeholder={t(K_EDU_CRED)}
            ariaLabel={t(K_EDU_CRED)} maxLength={EDU_CRED_LEN} />
        </span>
        <span className={cssOf(css.eduText)}>
          <Input value={row.school} onChange={sch.typeOf(i)} placeholder={t(K_EDU_SCHOOL)}
            ariaLabel={t(K_EDU_SCHOOL)} maxLength={EDU_SCHOOL_LEN} />
          {sch.at === i && <GateSchoolHits sch={sch} t={t} />}
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
