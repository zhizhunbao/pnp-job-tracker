// 列**集**偏好(显示哪几列)的 cookie 约定:服务端 page.tsx 与客户端 Table 都要读,
// 所以住这种不带 hook 的普通模块(同 colWidths.shared.ts / filters.shared.ts 的理由)。
//
// 与 colWidths.shared.ts 的分界:那边是列**宽**(每列多宽),这边是列**集**(显示哪几列)。
// 两件事各有各的 cookie、各自失效,合成一个文件会让「改列宽为什么动到列集」这种问题多绕一圈。
//
// 2026-08-17 从 jobs/i18n.ts 搬来 —— 它当初图省事搭在那儿(要一个非 client 模块),
// 可它和语言毫无关系,把 lib/i18n/ 变成了什么都能塞的抽屉。

/** v2:新默认 10 列,bump 名让旧 cookie 失效 */
export const COLS_COOKIE = 'jobsCols3'
