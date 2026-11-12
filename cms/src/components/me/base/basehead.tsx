'use client'
/**
 * me 桶子桶 base 的结构:卡头一行 —— 左边标题「我的简历」,右边三颗钮「下载」「替换文件」「删除」(有简历时)。
 * 2026-11-12 自子桶 resume 的 ResumeActs 裁出重写,为档案与简历并页
 * (2026-11-11 Frank「只留一份上传的吧。因为之后都可以按岗位改写」「左边我的档案,右面我的简历」)。
 * 原先右边是小钮「生成简历」「上传简历」:还没有简历时这两颗钮都在下面的上传区里,卡头不重复摆;
 * 已有简历时的「生成简历」2026-11-12 Frank「生成简历 按钮没必要」撤。
 * 同日 Frank「这部分按钮应该放一起,重新排版吧」:三颗操作钮从文件名下面挪到卡头右边(和左边档案卡的「修改」同一个位置)。
 *
 * @author Frank
 * @time 2026-11-12 10:00:00
 */
import { BaseActs } from './baseacts'
import { headClsOf } from './functions'
import type { BasePartIn } from './types'

/**
 * 卡头一行。
 *
 * @param props 「基础简历」整机面板与取词。
 * @returns 标题;有简历时右边三颗钮。
 */
export function BaseHead({ b, t }: BasePartIn) {
  return (
    <div className={headClsOf()}>
      <span>{t('rm.arch.title')}</span>
      {b.file != null && <BaseActs b={b} m={b.file} t={t} />}
    </div>
  )
}
