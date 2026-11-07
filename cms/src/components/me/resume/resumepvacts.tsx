'use client'
/**
 * me 桶子桶 resume 的结构:预览框顶上那一排(照 Azure 详情页的命令栏):默认那份先挂「默认」胶囊,再是下载、设为默认、
 * 替换文件、删除(红钮;2026-10-12 Frank「所有删除按钮不要直接删,先弹框确认是否删除」:点了先弹确认框)。
 * 原卡片底部那一排钮(2026-10-12 Frank「改成和下面 下载 预览 一样的按钮样式(不同颜色),并放到一排」)挪进框里。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { Button } from '@/components/button'
import { cssOf } from '@/components/css'
import { Tag } from '@/components/tag'
import { DANGER_KIND, DEFAULT_TAG, SECONDARY_KIND, TARGET_SELF } from './constants'
import { downloadUrlOf, makeAsk } from './functions'
import type { ResumePreviewIn } from './types'
import css from './resume.module.css'

/**
 * 预览框的命令栏。
 *
 * @param props 「我的简历」整机面板、开着的那一份与取词。
 * @returns 一排钮。
 */
export function ResumePvActs({ r, m, t }: ResumePreviewIn) {
  const onDelete = makeAsk({ setAsk: r.ask.setAsk, name: m.fileName, run: r.deleteOf(m.id) })
  return (
    <div className={cssOf(css.pvActs)}>
      {m.isDefault && <Tag variant={DEFAULT_TAG}>{t('rf.default')}</Tag>}
      <Button kind={SECONDARY_KIND} sm href={downloadUrlOf(m.id)} target={TARGET_SELF}>{t('rf.download')}</Button>
      {m.isDefault === false && (
        <Button kind={SECONDARY_KIND} sm onClick={r.defaultOf(m.id)}>{t('rf.setDefault')}</Button>
      )}
      <Button kind={SECONDARY_KIND} sm onClick={r.replaceOf(m.id)} busy={r.busy}>{t('rf.replace')}</Button>
      <Button kind={DANGER_KIND} sm onClick={onDelete}>{t('rf.delete')}</Button>
    </div>
  )
}
