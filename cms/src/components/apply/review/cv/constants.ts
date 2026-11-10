/**
 * review 子桶 cv 的常量:抬头的分隔;空串与 review 同值、自抄。
 * 2026-11-10 按「大于 1000 就拆子桶」(样张 apply/letter):review 的 functions.ts 过线,切出修改简历右侧栏用的纯函数。
 * 依赖只许 review → 本子桶(经 index.ts);本子桶不取 review 的任何东西,常量自抄、形状自声明。
 *
 * @author Frank
 * @time 2026-11-10 23:00:00
 */

/**
 * 空串。
 */
export const TEXT_NONE = ''

/**
 * 一段工作的职位与公司之间的分隔。
 */
export const CV_ORG_SEP = ', '

/**
 * 一段工作的起止年之间的分隔。
 */
export const CV_YEAR_SEP = ' - '
