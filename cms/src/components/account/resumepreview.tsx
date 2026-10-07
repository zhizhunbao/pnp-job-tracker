'use client'
/**
 * 「我的简历」本页预览弹框(Frank 10-06「不应该用 pdf.js 弹框预览吗」):全站通用弹框,里面用 pdf.js
 * 把原件逐页画出来(手机上弹框铺满整屏);画完前出一行「加载中」。只给 PDF 开 —— Word 浏览器画不了,卡片上没有预览钮。
 *
 * 2026-10-06 Frank「预览不要有下拉框吧」「这个也太懒看了吧」:每页按可用高度整页缩放(不出滚动条),多页走 pager 桶翻页;
 * 开框即最终大小 —— 画完前在页的位置摆一张白纸占位 + loading 桶的转圈,画好的页落在同一个位置,不跳。
 *
 * 2026-10-06 Frank「这个可以鼠标滚动放大缩小吧」「可以,做吧」:滚轮 / 触控板捏合 / 手机双指缩放(100%~300%),
 * 放大后拖动看局部(不出滚动条),双击回整页;翻页条旁加「− 百分比 +」。
 *
 * @author Frank
 * @time 2026-10-06 12:18:31
 */
import { Loading } from '@/components/loading'
import { Modal } from '@/components/modal'
import { Pager } from '@/components/pager'
import { PREVIEW_SIZE } from './constants'
import { thumbSrcOf } from './functions'
import { useResumePages } from './hooks'
import { ResumePages } from './resumepages'
import { ResumeStage } from './resumestage'
import { ResumeZoom } from './resumezoom'
import type { ResumePreviewIn } from './types'
import css from './account.module.css'

/**
 * 渲染预览弹框。
 *
 * @param props 预览哪一份、关弹框与取词函数。
 * @returns 弹框。
 */
export function ResumePreview({ meta, onClose, t }: ResumePreviewIn) {
  const pg = useResumePages({ src: thumbSrcOf(meta) })
  return (
    <Modal onClose={onClose} size={PREVIEW_SIZE}>
      <div className={css.rfPvTitle}>{meta.fileName}</div>
      <ResumeStage onMount={pg.onStageMount}
        zoomed={pg.zoomed}
        onPointerDown={pg.onGripDown}
        onPointerMove={pg.onGripMove}
        onPointerUp={pg.onGripUp}
        onDoubleClick={pg.onZoomReset}>
        {pg.ready === false && pg.failed === false && (
          <div className={css.rfPaperPh}><Loading text={t('rf.loading')} /></div>
        )}
        {pg.failed && <div className={css.rfPaperPh}>{t('rf.pvFail')}</div>}
        <ResumePages onMount={pg.onBoxMount} />
      </ResumeStage>
      <div className={css.rfPager}>
        <Pager page={pg.index} max={pg.count} onPage={pg.onPage} />
        {pg.ready && (
          <ResumeZoom pct={pg.pct}
            canIn={pg.canIn}
            canOut={pg.canOut}
            onIn={pg.onZoomIn}
            onOut={pg.onZoomOut}
            onReset={pg.onZoomReset}
            t={t} />
        )}
      </div>
    </Modal>
  )
}
