/**
 * pdf 桶 —— 用 pdf.js 画简历原件:每一页铺满所在框的宽、从上到下排(2026-11-07 自 account 桶在新域重写)。
 * 按关注点从 resume 子桶切出(画 PDF 与简历清单的增删改是两件事;合在一起 functions 过 1000 行线)。
 * 先写成 me 桶 resume 的子桶;投递框的首页预览也用这一台,为破 apply ↔ me 互取的环提成顶层通用桶(「我的简历」与投递框两家共用)。
 * 2026-11-12 只出 ResumeViewer 一个门(投递框也改用它);翻页、缩放一族撤掉
 * (Frank「全站的简历都应该是默认铺满当前的吧」「这个不嵌入一个框呢?」「也别翻页」)。
 *
 * @author Frank
 * @time 2026-11-07 18:00:00
 */
export { ResumeViewer } from './resumeviewer'
