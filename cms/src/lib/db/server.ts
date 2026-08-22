/**
 * 数据库层的**服务端**门:怎么拿到那一个连接池。沾 payload,浏览器包一碰就炸,
 * `'use client'` 文件只许对本门 `import type`(闸在 eslint.config.mjs)。
 * 门里只有转发(闸 door-forward-only,2026-08-21 立):`dbOf` 的家在 `./functions`(纯),
 * `getDb` 的家在 `./pool`(payload 接缝)。
 *
 * 🔴 **取池的收拢只做完了一半 —— 别照着旧注释以为已经收完了**(2026-08-18 复核):
 *    · SQL 文本那一半**做成了**:40+ 个文件从 `./sql.ts` 取语句;
 *    · 取池那一半**没迁**:`(payload.db as any).pool` 仍在 40 个文件、49 处。
 *      `as any` 的代价照旧:列名写错、参数个数对不上,TS 全程不吭声,只能等生产报错。
 *      迁移=默认值架构批 ②(2026-08-21 立项),迁完删这段。
 *    ⚠️ 先前这里还有一组 `select<R>()` / `selectOne` / `dbOrNull` 助手,在第 2 批死代码
 *    清除(`ba057f84`)里按「零消费者」删掉了 —— 要补就连调用点一起补,别只把它们加回来。
 *
 * @author Frank
 * @time 2026-08-21 15:21:00
 */

export { dbOf } from './functions'
export { getDb } from './pool'
