'use client'
/**
 * 雇主信号四维(纯展示,#181 抽出):公司弹框(取数后)与公司详情页(服务端
 * score_detail)共用同一件。档名彩字 + 依据灰句(#133 无数字口径)。
 * 🔴 语义红线:担保 None = **无记录**,不是「不担保」—— 灰句照实说,色阶也不给负判定。
 * #192(Frank):免责灰注(互不加权/非资格认定/我的匹配)从公司块摘除;
 * fact.scoreNote 仍在通道卡用。
 * 2026-08-28 拆域批自 jobs/Company.tsx 重写落位:三列改本域自己的事实网格 ——
 * 通用 Grid 的前两列是 max-content,英文档名/灰句在 375 上把整行顶出屏幕
 * (Frank 08-28 走查实拍),本域这份让每列都能收(见 companies.module.css 的 .facts)。
 *
 * @author Frank
 * @time 2026-08-28 18:13:09
 */
import { CompanyFactRow } from './companyfactrow'
import { CompanyGradeName } from './companygradename'
import { DIM_ACTIVE, DIM_FAME, DIM_SALARY, DIM_SPONSOR, KEY_NO_DATA, KEY_SP_NONE } from './constants'
import {
  activeEvidenceOf, activeTierKeyOf, fameEvidenceOf, fameTierKeyOf, salaryEvidenceOf, salaryTierKeyOf,
  sponsorEvidenceOf, sponsorTierKeyOf,
} from './functions'
import type { CompanyGradesViewIn } from './types'
import css from './companies.module.css'

/**
 * 四维评分。
 *
 * @param props 四维明细、取词函数与担保维开关(逐格注释见 CompanyGradesViewIn)。
 * @returns 三列事实网格;没有明细时整块不渲。
 */
export function CompanyGradesView({ detail, t, hideSponsor = false }: CompanyGradesViewIn) {
  if (detail == null) {
    return null
  }
  const rows = []
  const sp = detail.sponsor
  if (hideSponsor === false && sp != null) {
    rows.push(
      <CompanyFactRow key={DIM_SPONSOR}
        label={t('gr.dim.coSponsor')}
        tier={<CompanyGradeName grade={sp.g} name={t(sponsorTierKeyOf({ dim: sp, t }))} />}
        evidence={sponsorEvidenceOf({ dim: sp, t })} />,
    )
  }
  if (hideSponsor === false && sp == null) {
    rows.push(
      <CompanyFactRow key={DIM_SPONSOR}
        label={t('gr.dim.coSponsor')}
        tier={<span className={css.na}>{t(KEY_SP_NONE)}</span>} />,
    )
  }
  const act = detail.active
  if (act != null) {
    rows.push(
      <CompanyFactRow key={DIM_ACTIVE}
        label={t('gr.dim.coActive')}
        tier={<CompanyGradeName grade={act.g} name={t(activeTierKeyOf({ dim: act, t }))} />}
        evidence={activeEvidenceOf({ dim: act, t })} />,
    )
  }
  const sal = detail.salary
  if (sal != null) {
    rows.push(
      <CompanyFactRow key={DIM_SALARY}
        label={t('gr.dim.coSalary')}
        tier={<CompanyGradeName grade={sal.g} name={t(salaryTierKeyOf({ dim: sal, t }))} />}
        evidence={salaryEvidenceOf({ dim: sal, t })} />,
    )
  }
  if (sal == null) {
    rows.push(
      <CompanyFactRow key={DIM_SALARY}
        label={t('gr.dim.coSalary')}
        tier={<span className={css.na}>{t(KEY_NO_DATA)}</span>} />,
    )
  }
  const fm = detail.fame
  if (fm != null) {
    rows.push(
      <CompanyFactRow key={DIM_FAME}
        label={t('gr.dim.coFame')}
        tier={<CompanyGradeName grade={fm.g} name={t(fameTierKeyOf({ dim: fm, t }))} />}
        evidence={fameEvidenceOf({ dim: fm, t })} />,
    )
  }
  return (
    <div className={css.grades}>
      <div className={css.facts}>{rows}</div>
    </div>
  )
}
