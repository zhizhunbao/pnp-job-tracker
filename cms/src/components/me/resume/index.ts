/**
 * me 桶的子桶 resume —— 「我的简历」一页(2026-11-07 自 account 桶 ResumeFile / CoverLetters 一族在新域重写,
 * 照 Fluent 2 / Azure 效果图 docs/design/我的/我的框架-20261107.md 2.3 / 1.4)。行为、界面件、样式都住本子桶;
 * 父桶只拼「页标题 + 右边的两颗钮 + 正文」。依赖只许父桶 → 子桶,子桶不取父桶。
 * 画 PDF 那一台住孙桶 pdf(按关注点切出);ResumePages 与 useResumePages 经这里转出,入出参同原 account 桶,
 * 投递框的首页预览也用。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
export { useResume } from './hooks'
export { ResumeActs } from './resumeacts'
export { ResumeBody } from './resumebody'
