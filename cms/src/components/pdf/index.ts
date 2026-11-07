/**
 * pdf 桶 —— 用 pdf.js 画简历原件:逐页画、翻页、缩放(2026-11-07 自 account 桶在新域重写)。
 * 按关注点从 resume 子桶切出(画 PDF 与简历清单的增删改是两件事;合在一起 functions 过 1000 行线)。
 * 先写成 me 桶 resume 的子桶;投递框的首页预览也用这一台,为破 apply ↔ me 互取的环提成顶层通用桶(「我的简历」与投递框两家共用)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
export { useResumePages } from './hooks'
export { ResumePages } from './resumepages'
export { ResumeViewer } from './resumeviewer'
