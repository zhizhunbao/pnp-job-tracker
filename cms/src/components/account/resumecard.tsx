'use client'
/**
 * 「我的简历」一份简历的卡片(2026-10-08 Frank 选「照 AIApply 卡片原样」:不放缩略图):文件名(默认那份挂「默认」)、上传日期、大小;
 * 中间一行文字钮:设为默认(非默认才有)、替换文件、删除(就地二次确认);底部两颗钮:下载、预览(本页弹框,只 PDF 有)。
 * 2026-10-06 的「点图即预览」随缩略图撤;pdf.js 只留给预览弹框。
 * 2026-10-12 Frank「设为默认 替换文件 删除 改成和下面 下载 预览 一样的按钮样式(不同颜色),并放到一排」:中间那行文字钮撤,
 * 五颗钮并成底部一排(下载 / 预览 / 设为默认 / 替换文件 / 删除,删除是红钮);同日 Frank「所有删除按钮不要直接删,先弹框确认是否删除」:
 * 删除不再就地亮「确认删除 / 取消」两钮,改拨删除确认框(框挂在 ResumeFile),框里点「删除」才真删。
 *
 * @author Frank
 * @time 2026-10-06 12:18:31
 */
import { Button } from '@/components/button'
import { Tag } from '@/components/tag'
import { ymd } from '@/lib/time'
import { DEFAULT_TAG, MIME_PDF, RF_ACT_KIND, RF_ADD_KIND, RF_DANGER_KIND, TARGET_SELF } from './constants'
import { downloadUrlOf, makeAsk, sizeLabelOf } from './functions'
import type { ResumeCardIn } from './types'
import css from './account.module.css'

/**
 * 渲染一份简历的卡片。
 *
 * @param props 元信息、整机面板与取词函数。
 * @returns 卡片。
 */
export function ResumeCard({ meta, p, t }: ResumeCardIn) {
  return (
    <div className={css.rfCard}>
      <div className={css.rfInfo}>
        <div className={css.rfName}>{meta.fileName}</div>
        {meta.isDefault && <div className={css.rfTagLine}><Tag variant={DEFAULT_TAG}>{t('rf.default')}</Tag></div>}
        <div className={css.rfMeta}>{t('rf.uploaded', { d: ymd(meta.uploadedAt) })}</div>
        <div className={css.rfMeta}>{sizeLabelOf(meta.sizeBytes)}</div>
        <div className={css.rfActs}>
          <Button kind={RF_ACT_KIND} sm href={downloadUrlOf(meta.id)} target={TARGET_SELF}>{t('rf.download')}</Button>
          {meta.mime === MIME_PDF && (
            <Button kind={RF_ADD_KIND} sm onClick={p.previewOf(meta)}>{t('rf.preview')}</Button>
          )}
          {meta.isDefault === false && (
            <Button kind={RF_ACT_KIND} sm onClick={p.defaultOf(meta.id)}>{t('rf.setDefault')}</Button>
          )}
          <Button kind={RF_ACT_KIND} sm onClick={p.replaceOf(meta.id)} busy={p.busy}>{t('rf.replace')}</Button>
          <Button kind={RF_DANGER_KIND} sm
            onClick={makeAsk({ setAsk: p.ask.setAsk, name: meta.fileName, run: p.deleteOf(meta.id) })}>
            {t('rf.delete')}
          </Button>
        </div>
      </div>
    </div>
  )
}
