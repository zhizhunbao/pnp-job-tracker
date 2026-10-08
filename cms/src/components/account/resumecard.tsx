'use client'
/**
 * 「我的简历」一份简历的卡片(2026-10-08 Frank 选「照 AIApply 卡片原样」:不放缩略图):文件名(默认那份挂「默认」)、上传日期、大小;
 * 中间一行文字钮:设为默认(非默认才有)、替换文件、删除(就地二次确认);底部两颗钮:下载、预览(本页弹框,只 PDF 有)。
 * 2026-10-06 的「点图即预览」随缩略图撤;pdf.js 只留给预览弹框。
 *
 * @author Frank
 * @time 2026-10-06 12:18:31
 */
import { Button } from '@/components/button'
import { Tag } from '@/components/tag'
import { ymd } from '@/lib/time'
import {
  DEFAULT_TAG, MIME_PDF, PLAIN_BTN_KIND, RF_ACT_KIND, RF_ADD_KIND, RF_DANGER_KIND, TARGET_SELF,
} from './constants'
import { downloadUrlOf, sizeLabelOf } from './functions'
import type { ResumeCardIn } from './types'
import css from './account.module.css'

/**
 * 渲染一份简历的卡片。
 *
 * @param props 元信息、整机面板与取词函数。
 * @returns 卡片。
 */
export function ResumeCard({ meta, p, t }: ResumeCardIn) {
  const asking = p.sure === meta.id
  return (
    <div className={css.rfCard}>
      <div className={css.rfInfo}>
        <div className={css.rfName}>{meta.fileName}</div>
        {meta.isDefault && <div className={css.rfTagLine}><Tag variant={DEFAULT_TAG}>{t('rf.default')}</Tag></div>}
        <div className={css.rfMeta}>{t('rf.uploaded', { d: ymd(meta.uploadedAt) })}</div>
        <div className={css.rfMeta}>{sizeLabelOf(meta.sizeBytes)}</div>
        <div className={css.rfLinks}>
          {meta.isDefault === false && (
            <Button kind={PLAIN_BTN_KIND} className={css.rfLink} onClick={p.defaultOf(meta.id)}>
              {t('rf.setDefault')}
            </Button>
          )}
          <Button kind={PLAIN_BTN_KIND} className={css.rfLink} onClick={p.replaceOf(meta.id)} busy={p.busy}>
            {t('rf.replace')}
          </Button>
          {asking === false && (
            <Button kind={PLAIN_BTN_KIND} className={css.rfLink} onClick={p.askOf(meta.id)}>{t('rf.delete')}</Button>
          )}
          {asking && <Button kind={RF_DANGER_KIND} sm onClick={p.deleteOf(meta.id)}>{t('rf.sure')}</Button>}
          {asking && <Button kind={RF_ACT_KIND} sm onClick={p.onCancel}>{t('rf.cancel')}</Button>}
        </div>
        <div className={css.rfActs}>
          <Button kind={RF_ACT_KIND} sm href={downloadUrlOf(meta.id)} target={TARGET_SELF}>{t('rf.download')}</Button>
          {meta.mime === MIME_PDF && (
            <Button kind={RF_ADD_KIND} sm onClick={p.previewOf(meta)}>{t('rf.preview')}</Button>
          )}
        </div>
      </div>
    </div>
  )
}
