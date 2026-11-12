'use client'
/**
 * me 桶子桶 base 的结构:「基础简历」卡(档案页右栏)。一张分区卡:卡头(标题 + 右边的钮)、卡身(清单没回来先占位;
 * 还没有简历出上传区;有就出文件名、操作排与卡里的 PDF 预览),卡里最下一行报错。卡身整块是拖放区。
 * 卡外挂隐藏文件框、删除确认框(2026-10-12 Frank「所有删除按钮不要直接删,先弹框确认是否删除」)、替换确认框、
 * 生成简历窗口(cv 桶;存成了重拉清单)。2026-11-12 自子桶 resume 的 ResumeBody 裁出重写,为档案与简历并页
 * (2026-11-11 Frank「只留一份上传的吧。因为之后都可以按岗位改写」「左边我的档案,右面我的简历」)。
 *
 * @author Frank
 * @time 2026-11-12 10:00:00
 */
import { cssOf } from '@/components/css'
import { CvBuilder } from '@/components/cv'
import { ConfirmModal } from '@/components/modal'
import { BaseDrop } from './basedrop'
import { BaseFile } from './basefile'
import { BaseHead } from './basehead'
import { BaseInput } from './baseinput'
import { CARD_MD_CLS, TEXT_NONE } from './constants'
import { bodyClsOf } from './functions'
import type { BasePartIn } from './types'
import css from './base.module.css'

/**
 * 「基础简历」卡。
 *
 * @param props 「基础简历」整机面板与取词。
 * @returns 卡 + 弹框。
 */
export function BaseCard({ b, t }: BasePartIn) {
  return (
    <>
      <section className={CARD_MD_CLS}>
        <BaseHead b={b} t={t} />
        {b.checked === false && <div className={cssOf(css.skel)} />}
        {b.checked && (
          <div className={bodyClsOf({ on: b.dragOn, empty: b.file == null })}
            onDragOver={b.onDragOver}
            onDragLeave={b.onDragLeave}
            onDrop={b.onDrop}>
            {b.file == null && <BaseDrop b={b} t={t} />}
            {b.file != null && <BaseFile b={b} m={b.file} t={t} />}
          </div>
        )}
        {b.err !== TEXT_NONE && <div className={cssOf(css.err)}>{b.err}</div>}
      </section>
      <BaseInput onMount={b.onInputMount} onPick={b.onPick} />
      {b.del.ask != null && (
        <ConfirmModal title={t('rf.delAsk')} body={b.del.ask.name} okText={t('rf.delete')} cancelText={t('rf.cancel')}
          onOk={b.del.onOk} onCancel={b.del.onCancel} />
      )}
      {b.rep.ask != null && (
        <ConfirmModal title={t('rf.replaceAsk')} body={b.rep.ask.name} okText={t('rf.replace')}
          cancelText={t('rf.cancel')} onOk={b.rep.onOk} onCancel={b.rep.onCancel} />
      )}
      {b.cv.open && <CvBuilder onClose={b.cv.onClose} onSaved={b.cv.onSaved} />}
    </>
  )
}
