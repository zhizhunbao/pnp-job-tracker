/**
 * db 域常量(2026-09-14 立文件:此前 db 域只有 sql.ts 装 SQL;第一个非 SQL 的常量 = 译文版本号)。
 *
 * @author Frank
 * @time 2026-09-14 18:00:00
 */

/**
 * 译文版本号(2026-09-14 Frank「如果存进去的是翻译不全或者之前翻译错误呢」→「可以」):库里的译文列(jobs.jd_trans_* /
 * title_* 与 companies.alias_* / ai_brief_zh / description_zh)都跟着行上的 trans_v 走 —— 读时对不上就当没有,
 * 重翻覆盖;换模型 / 改提示词把它加一,存量自动作废。老批次机翻别名 trans_v 为 NULL = 版本 0,同样过期。
 * 住 db 域:它是存储契约,读写两侧(lib/jobs、lib/employers、行构造器)都要认它。
 */
export const TRANS_V = 1
