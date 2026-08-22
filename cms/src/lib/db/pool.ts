/**
 * payload 接缝:手里没有 payload 实例时,怎么拿到那一个连接池。
 * db 独有的抽屉(2026-08-21 Frank 拍板:db 是基础设施,「怎么拿到那一个池」就是它的业务;
 * 「门里只许转发」闸立起后,沾 payload 的函数得有自己的家 —— functions.ts 要保持浏览器可打包,住不进去)。
 *
 * ⚠️ **不创建连接池**,只负责「怎么拿到那一个池」。池归 Payload 的 postgres adapter
 * (`payload.db.pool`)。自己再 new 一个 = 同一个库上并存两套连接 —— 那正是把生产
 * 打成 500 的那条路(踩过:多开一个 dev 实例就够把池子打爆)。要改池参数去
 * payload.config,别在这儿开第二个。
 *
 * @author Frank
 * @time 2026-08-21 23:07:25
 */

import { getPayload } from 'payload'

import config from '@/payload.config'
import { dbOf } from './functions'
import type { DbPool } from './types'

/**
 * 手里没有 payload 实例时用这个。
 * getPayload 自身按 config 记忆化,重复调用拿的是同一个实例、同一个池,不会多开连接。
 */
export async function getDb(): Promise<DbPool> {
  return dbOf(await getPayload({ config: await config }))
}
