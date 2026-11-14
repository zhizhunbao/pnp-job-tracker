'use client'
/**
 * me 桶子桶 base 的结构:有简历时的卡身 —— 三行「标签-值」(文件、上传日期、大小,同左边档案卡的形),下面直接是 PDF 预览
 * (pdf 桶的预览区:铺满这一栏的宽、所有页连着排,太长在这一块里上下滚);Word 浏览器画不了,出一句改下载。
 * 替换后按新的上传时刻换地址、整块重挂,重新画。2026-11-12 自子桶 resume 的 ResumePreview / ResumeItem 裁出重写
 * (去掉弹框),为档案与简历并页(2026-11-11 Frank「只留一份上传的吧。因为之后都可以按岗位改写」
 * 「左边我的档案,右面我的简历」)。
 * 同日 Frank「这个地方也重复」「这部分按钮应该放一起,重新排版吧」:加粗的文件名一行像第二个标题,和日期大小并成一行灰字;
 * 三颗操作钮挪到卡头右边(basehead.tsx)。
 * 同日 Frank「这个搞成一坨了」:三样东西用逗号连成一行灰字糊在一起,改成一样一行、标签灰字在左、值在右。
 * 2026-11-13 Frank「这部分是不是放到简历下面,然后小字就行了」:三行挪到预览下面,并成一行小灰字(文件名、上传日期、大小
 * 三样之间留空隔开,不用逗号连,不带标签);上面「三行标签-值」「下面直接是 PDF 预览」两句随之作废。
 *
 * @author Frank
 * @time 2026-11-12 10:00:00
 */
import { cssOf } from '@/components/css'
import { ResumeViewer } from '@/components/pdf'
import { dateLabelOf, isPdf, previewSrcOf, sizeLabelOf } from './functions'
import type { BaseFileIn } from './types'
import css from './base.module.css'

/**
 * 有简历时的卡身。
 *
 * @param props 那一份简历与取词。
 * @returns 预览与底下一行小灰字。
 */
export function BaseFile({ m, t }: BaseFileIn) {
  const src = previewSrcOf(m)
  return (
    <>
      <div className={cssOf(css.view)}>
        {isPdf(m) && <ResumeViewer key={src} src={src} t={t} />}
        {isPdf(m) === false && <div className={cssOf(css.none)}>{t('rf.pvFail')}</div>}
      </div>
      <div className={cssOf(css.facts)}>
        <span>{m.fileName}</span>
        <span>{dateLabelOf(m)}</span>
        <span>{sizeLabelOf(m.sizeBytes)}</span>
      </div>
    </>
  )
}
