'use client'
/**
 * gate 域的结构:一页表单里只有生成简历才用的三格(2026-11-12 Frank「右侧弹 sidebar 用户一项一项填,最后用 sonnet 生成简历」):
 * 电话、个人链接、技能(一行一项),都选填,直接在面板里填、随「保存」一起存;邮箱用账号邮箱,不另填。
 * 2026-11-13 Frank「生成简历需要填的内容不要放到修改档案那里」:这三格搬进生成简历弹框(GateCvBox)的「联系方式」卡,
 * 上面「一页表单里」「在面板里填」指的地方随之换成那只弹框;三格后面的灰字「选填」撤。
 *
 * @author Frank
 * @time 2026-11-12 16:00:00
 */
import { cssOf } from '@/components/css'
import { Input } from '@/components/input'
import { CV_LINE_LEN, CV_TEXT_LEN, K_CV_LINK, K_CV_PHONE, K_CV_SKILLS, K_CV_SKILLS_PH } from './constants'
import { GateField } from './gatefield'
import type { GateCvFieldsIn } from './types'
import css from './gate.module.css'

/**
 * 电话、链接、技能三格。
 *
 * @param props 表单整机与取词。
 * @returns 三格。
 */
export function GateCvFields({ g, t }: GateCvFieldsIn) {
  const v = g.edit.cvc
  return (
    <>
      <GateField label={t(K_CV_PHONE)}>
        <Input value={v.phone} onChange={v.onPhone} ariaLabel={t(K_CV_PHONE)} maxLength={CV_LINE_LEN} />
      </GateField>
      <GateField label={t(K_CV_LINK)}>
        <Input value={v.link} onChange={v.onLink} ariaLabel={t(K_CV_LINK)} maxLength={CV_LINE_LEN} />
      </GateField>
      <GateField label={t(K_CV_SKILLS)}>
        <textarea className={cssOf(css.area)}
          value={v.skills}
          onChange={v.onSkills}
          maxLength={CV_TEXT_LEN}
          aria-label={t(K_CV_SKILLS)}
          placeholder={t(K_CV_SKILLS_PH)} />
      </GateField>
    </>
  )
}
