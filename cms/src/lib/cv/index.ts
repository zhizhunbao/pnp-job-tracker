/**
 * 生成简历域的桶 —— 草稿排成版式(网页预览与 PDF 共用)、查写不进 PDF 的字、画 PDF、收窄浏览器交来的草稿。
 * 门里只有转发(闸 door-forward-only)。只被测试用的名字(cvRowsOf、whenOf)不进桶,测试直接点 functions。没有 `./server` 门:本域不连库,pdf-lib 由 resume 域路由注入。
 *
 * @author Frank
 * @time 2026-11-07 15:00:00
 */

export { CV_LINE_MAX, CV_TEXT_MAX } from './constants'
export { cvBadCharsOf, cvLayoutOf, cvLinesOf, cvModernPdfOf, cvPdfOf, toCvDraft } from './functions'
