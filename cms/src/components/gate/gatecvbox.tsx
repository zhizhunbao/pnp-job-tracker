'use client'
/**
 * gate 域的结构:生成简历弹框(2026-11-13 Frank「生成简历 应该和 修改档案 应该是分开的吧」「档案的内容 只用来 匹配工作和通道」
 * 「生成简历需要填的内容不要放到修改档案那里」「这个应该有个预览功能吧」):全站窗口形弹框,左边四张分区卡 —— 联系方式
 * (英文姓名、电话、链接、技能)、工作经历、教育经历(这两张只摆摘要加「修改」,点了叠开各自的弹框)、模板(两张模板卡、
 * 「生成简历」与「保存」);右边是选着的那个模板的一页示例(一份虚构简历照真排版机排的,不调模型、不扣额度)。
 * 生成完叠预览框,额度用完叠升级框。和修改档案的右侧栏共用一台表单整机(GateForm 起),值存在同一处。
 *
 * @author Frank
 * @time 2026-11-13 17:00:00
 */
import { cssOf } from '@/components/css'
import { Modal, ModalHead } from '@/components/modal'
import { ResumeViewer } from '@/components/pdf'
import { UpgradeModal } from '@/components/pricing'
import {
  CARD_HEAD_CLS, CARD_MD_CLS, K_CV_CONTACT, K_CV_REASON, K_CV_TITLE, K_CV_TPL, TEXT_NONE,
} from './constants'
import { CV_BOX_H, CV_BOX_PREF, CV_BOX_W, URL_CV_SAMPLE } from './cv'
import { GateCvFields } from './gatecvfields'
import { GateCvGen } from './gatecvgen'
import { GateCvPreview } from './gatecvpreview'
import { GateField } from './gatefield'
import { GateName } from './gatename'
import { GatePicked } from './gatepicked'
import type { GateCvBoxIn } from './types'
import css from './gate.module.css'

/**
 * 生成简历弹框。
 *
 * @param props 表单整机、叠开选择器的手柄、取词、两格摘要与生成整机。
 * @returns 弹框 + 叠开的预览框与升级框。
 */
export function GateCvBox({ g, k, t, n, c }: GateCvBoxIn) {
  const head = <ModalHead kicker={TEXT_NONE} title={t(K_CV_TITLE)} sub={TEXT_NONE} ctl={null} />
  const src = URL_CV_SAMPLE + g.edit.cvc.tpl
  return (
    <>
      <Modal onClose={g.onClose} win={{ head, memo: CV_BOX_PREF, w: CV_BOX_W, h: CV_BOX_H, jd: false }}>
        <div className={cssOf(css.cvBox)}>
          <div className={cssOf(css.cvBoxForm)}>
            <section className={CARD_MD_CLS}>
              <div className={CARD_HEAD_CLS}>{t(K_CV_CONTACT)}</div>
              <GateField label={t('pf.name')}>
                <GateName g={g} t={t} />
              </GateField>
              <GateCvFields g={g} t={t} />
            </section>
            <section className={CARD_MD_CLS}>
              <div className={CARD_HEAD_CLS}>{t('pf.work')}</div>
              <GatePicked lines={n.works} onEdit={k.onWork} t={t} />
            </section>
            <section className={CARD_MD_CLS}>
              <div className={CARD_HEAD_CLS}>{t('pf.edu')}</div>
              <GatePicked lines={n.edu} onEdit={k.onEdu} t={t} />
            </section>
            <section className={CARD_MD_CLS}>
              <div className={CARD_HEAD_CLS}>{t(K_CV_TPL)}</div>
              <GateCvGen g={g} c={c} t={t} />
            </section>
          </div>
          <div className={cssOf(css.cvBoxSample)}>
            <ResumeViewer key={src} src={src} t={t} />
          </div>
        </div>
      </Modal>
      {c.doc != null && <GateCvPreview c={c} doc={c.doc} t={t} />}
      {c.upgrade && <UpgradeModal t={t} onClose={c.onUpgradeClose} reason={t(K_CV_REASON)} />}
    </>
  )
}
