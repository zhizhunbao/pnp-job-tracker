'use client'
/**
 * 预览区(Frank 10-06「不应该用 pdf.js 弹框预览吗」):用 pdf.js 把原件逐页画出来,画完前在页的位置摆一张
 * 白纸占位 + loading 桶的转圈,画好的页落在同一个位置;画不了出一句改下载。
 * 2026-11-07 自 account 桶 ResumePreview 在新域重写:弹框壳与标题、操作钮归调用方,本件只管画。
 * 2026-11-12 改成连续阅读:每一页铺满所在框的宽、从上到下排,不套灰底框;所在框限了高就在本件里上下滚,没限高就整份摊开。
 * 同日撤掉翻页条、缩放钮组「− 百分比 +」、滚轮 / 捏合缩放、拖动看局部、双击回整页
 * (Frank「全站的简历都应该是默认铺满当前的吧」「这个不嵌入一个框呢?」「也别翻页」)。
 * 仍标 data-nodrag(modal 桶的拖动忽略名单认它):在弹框里按住滚动条拖、在页上按下,不会把整个弹框拖走。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
import { cssOf } from '@/components/css'
import { Loading } from '@/components/loading'
import { useResumePages } from './hooks'
import { ResumePages } from './resumepages'
import type { ResumeViewerIn } from './types'
import css from './pdf.module.css'

/**
 * 渲染预览区。
 *
 * @param props 原件地址与取词函数。
 * @returns 占位纸(画完前 / 画不了)+ 放页的容器。
 */
export function ResumeViewer({ src, t }: ResumeViewerIn) {
  const pg = useResumePages({ src })
  return (
    <div className={cssOf(css.viewer)} data-nodrag>
      {pg.ready === false && pg.failed === false && (
        <div className={cssOf(css.paperPh)}><Loading text={t('rf.loading')} /></div>
      )}
      {pg.failed && <div className={cssOf(css.paperPh)}>{t('rf.pvFail')}</div>}
      <ResumePages onMount={pg.onBoxMount} />
    </div>
  )
}
