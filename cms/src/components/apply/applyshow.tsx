'use client'
/**
 * 「简历」页选中那份的首页预览(2026-10-10 投递框三步,Frank「简历选了某一个是不是,默认就是预览的」):
 * 选中哪份,旁边(手机在下面)就直接画那份的第一页 —— 借「我的简历」预览弹框那一台 pdf.js(account 桶 useResumePages +
 * ResumePages),只是不套弹框、不翻页不缩放。画完前出一行「加载中」,画不了出一句改下载。只给 PDF 用(Word 由调用方给一句话)。
 *
 * @author Frank
 * @time 2026-10-10 10:00:00
 */
import { ResumePages, useResumePages } from '@/components/account'
import { Loading } from '@/components/loading'
import type { ApplyShowIn } from './types'
import css from './apply.module.css'

/**
 * 首页预览。
 *
 * @param props 原件地址与取词函数。
 * @returns 预览框。
 */
export function ApplyShow({ src, t }: ApplyShowIn) {
  const pg = useResumePages({ src })
  return (
    <div className={css.show}>
      {pg.ready === false && pg.failed === false && (
        <div className={css.showPh}><Loading text={t('rf.loading')} /></div>
      )}
      {pg.failed && <div className={css.showPh}>{t('rf.pvFail')}</div>}
      <ResumePages onMount={pg.onBoxMount} />
    </div>
  )
}
