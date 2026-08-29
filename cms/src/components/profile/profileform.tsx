'use client'
/**
 * 移民档案表单(E5-00 §3.2 + E11-05 ① §3.4 大白话零打字改造)的拼装件:
 * 分型(E11-04 单选,可不选)→ 职业(热门 chips + 搜索兜底,NocPicker)→
 * 英语(区间单选 → 幕后 CLB)→ EE 分(两段式:没算过 = 跳过 / 算过 → 区间,存下界)→
 * 工签剩余(区间;诚实注:match v1 不消费 PGWP)→ 目标省(chips 多选)→ 保存。
 * 保存走 Payload 自带 REST PATCH `/api/users/:id`(update 已限 selfOrAdmin;
 * profile 无字段锁 = 本人可改)。数据完整性:返回用户已填精确值(clb/crs/pgwp)
 * 未主动改档时原值保留(state 初值 = 精确值,不点不覆盖)。
 * 状态机器住 hooks 的 useProfileForm,本件只拼装;保存钮经 Button(#113 组件统一 P2:
 * primary 通栏,禁用 = 内置浅蓝)。
 * 2026-08-27 换装批自 ProfileForm.tsx(PascalCase 迁移存量)整体重写。
 *
 * @author Frank
 * @time 2026-08-27 22:00:00
 */
import { Button } from '@/components/button'
import { Chip } from '@/components/chip'
import { cssOf } from '@/components/css'
import { IconTarget } from '@/components/icons'
import { Notice } from '@/components/notice'
import { BucketRow } from './bucketrow'
import {
  CLB_OPTS, CRS_OPTS, PGWP_OPTS, SAVE_ERR_KIND, SAVE_OK_KIND, SAVED_ERR, SAVED_OK,
} from './constants'
import { clbActive, crsActive, makeCrsMode, pgwpActive, profileSaveLabelOf } from './functions'
import { useProfileForm } from './hooks'
import { NocPicker } from './nocpicker'
import { ProvRow } from './provrow'
import { StatusRow } from './statusrow'
import type { ProfileFormIn } from './types'
import css from './profile.module.css'

/**
 * 移民档案表单。
 *
 * @param props 取词函数、登录人 id、档案初值与存成回调(见 ProfileFormIn 逐格注释)。
 * @returns 档案节的整块表单。
 */
export function ProfileForm({ t, userId, initial, onSaved }: ProfileFormIn) {
  let savedCb = null
  if (onSaved != null) {
    savedCb = onSaved
  }
  const p = useProfileForm({ userId, initial, onSaved: savedCb })
  return (
    <div>
      <div className={css.secTitle}><IconTarget /> {t('prof.title')}</div>
      <div className={css.secHint}>{t('prof.hint')}</div>
      <div className={css.fieldLabel}>{t('prof.status')}</div>
      <StatusRow status={p.status} setStatus={p.setStatus} t={t} />
      <div className={css.fieldLabel}>{t('prof.noc')}</div>
      <NocPicker q={p.q}
        setQ={p.setQ}
        opts={p.opts}
        hits={p.hits}
        nocs={p.nocs}
        setNocs={p.setNocs}
        onAddTyped={p.onAddTyped}
        t={t} />
      <div className={css.fieldLabel}>{t('prof.clb')}</div>
      <BucketRow opts={CLB_OPTS} active={clbActive(p.clb)} onPick={p.setClb} t={t} />
      <div className={css.fieldLabel}>{t('prof.crs')}</div>
      <div className={css.chipsRow}>
        <Chip onClick={makeCrsMode({ on: false, setCrsCalc: p.setCrsCalc, setCrs: p.setCrs })}
          active={p.crsCalc === false}>
          {t('prof.crsCalc.no')}
        </Chip>
        <Chip onClick={makeCrsMode({ on: true, setCrsCalc: p.setCrsCalc, setCrs: p.setCrs })} active={p.crsCalc}>
          {t('prof.crsCalc.yes')}
        </Chip>
      </div>
      {p.crsCalc && <BucketRow opts={CRS_OPTS} active={crsActive(p.crs)} onPick={p.setCrs} t={t} />}
      <div className={css.fieldLabel}>{t('prof.pgwp')}</div>
      <BucketRow opts={PGWP_OPTS} active={pgwpActive(p.pgwp)} onPick={p.setPgwp} t={t} />
      <div className={css.fieldLabel}>{t('prof.prov')}</div>
      <ProvRow provs={p.provs} setProvs={p.setProvs} t={t} />
      <Button lg onClick={p.onSave} disabled={p.busy} className={cssOf(css.saveBtn)}>
        {profileSaveLabelOf({ busy: p.busy, t })}
      </Button>
      {p.saved === SAVED_OK && (
        <Notice kind={SAVE_OK_KIND} className={cssOf(css.saveNotice)}>{t('prof.saved')}</Notice>
      )}
      {p.saved === SAVED_ERR && (
        <Notice kind={SAVE_ERR_KIND} className={cssOf(css.saveNotice)}>{t('prof.err')}</Notice>
      )}
    </div>
  )
}
