'use client'
/**
 * 预览弹框里那一块(Frank 10-06「不应该用 pdf.js 弹框预览吗」):舞台里用 pdf.js 把原件逐页画出来,画完前在页的位置摆一张
 * 白纸占位 + loading 桶的转圈,画好的页落在同一个位置,不跳;画不了出一句改下载。
 * 2026-10-06 Frank「预览不要有下拉框吧」「这个也太懒看了吧」:每页按可用高度整页缩放(不出滚动条),多页走 pager 桶翻页。
 * 2026-10-06 Frank「这个可以鼠标滚动放大缩小吧」「可以,做吧」:滚轮 / 触控板捏合 / 手机双指缩放(100%~300%),
 * 放大后拖动看局部(不出滚动条),双击回整页;翻页条旁加「− 百分比 +」。
 * 2026-11-07 自 account 桶 ResumePreview 在新域重写:弹框壳与标题、操作钮归 me 桶 resume 的预览框,本件只管画与翻、缩放;
 * 舞台高度改随窗口形弹框的正文撑满(窗口可拉大小)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { Loading } from '@/components/loading'
import { Pager } from '@/components/pager'
import { useResumePages } from './hooks'
import { ResumePages } from './resumepages'
import { ResumeStage } from './resumestage'
import { ResumeZoom } from './resumezoom'
import type { ResumeViewerIn } from './types'
import css from './pdf.module.css'

/**
 * 渲染预览区。
 *
 * @param props 原件地址与取词函数。
 * @returns 舞台 + 翻页条。
 */
export function ResumeViewer({ src, t }: ResumeViewerIn) {
  const pg = useResumePages({ src })
  return (
    <div className={cssOf(css.viewer)}>
      <ResumeStage onMount={pg.onStageMount}
        zoomed={pg.zoomed}
        onPointerDown={pg.onGripDown}
        onPointerMove={pg.onGripMove}
        onPointerUp={pg.onGripUp}
        onDoubleClick={pg.onZoomReset}>
        {pg.ready === false && pg.failed === false && (
          <div className={cssOf(css.paperPh)}><Loading text={t('rf.loading')} /></div>
        )}
        {pg.failed && <div className={cssOf(css.paperPh)}>{t('rf.pvFail')}</div>}
        <ResumePages onMount={pg.onBoxMount} />
      </ResumeStage>
      <div className={cssOf(css.pager)}>
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
    </div>
  )
}
