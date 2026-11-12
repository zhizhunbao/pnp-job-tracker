/**
 * tailor 子桶 fix 给模型看的字:用户消息里各段的小标题(系统提示词在 tailor 的 prompts.ts)。
 *
 * @author Frank
 * @time 2026-11-12 02:00:00
 */

/**
 * 小标题:要补的那条要求。
 */
export const LABEL_REQ = 'REQUIREMENT:'

/**
 * 小标题:求职信里已经写到它的那句。
 */
export const LABEL_COVER = 'COVER LETTER SENTENCE:'

/**
 * 小标题:简历里已经写到它的那句。
 */
export const LABEL_RESUME = 'RESUME LINE:'

/**
 * 小标题:各段工作(带序号)。
 */
export const LABEL_WORKS = 'WORK ENTRIES:'

/**
 * 小标题:基础简历全文。
 */
export const LABEL_BASE = 'BASE RESUME:'

/**
 * 小标题:用户补充的事实。
 */
export const LABEL_FACTS = 'EXTRA FACTS:'
