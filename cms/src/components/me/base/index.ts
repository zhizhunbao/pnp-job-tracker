/**
 * me 桶的子桶 base —— 「基础简历」卡(档案页右栏:那一份上传的简历,卡里直接看 PDF,可下载、替换、删除、生成)。
 * 2026-11-12 自子桶 resume 裁出重写,为档案与简历并页(2026-11-11 Frank「只留一份上传的吧。因为之后都可以按岗位改写」
 * 「左边我的档案,右面我的简历」)。行为、界面件、样式都住本子桶;依赖只许父桶 → 子桶,子桶不取父桶。
 * 画 PDF 那一台用 pdf 桶的 ResumeViewer。
 *
 * @author Frank
 * @time 2026-11-12 10:00:00
 */
export { useBase } from './hooks'
export { BaseCard } from './basecard'
