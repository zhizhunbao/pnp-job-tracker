'use client'
/**
 * 域内小件:省卡里的一行键值(左键右值,值右对齐后在卡里连成一条竖线)。
 * 2026-08-28 换装批自 Pulse.tsx 的 kv 闭包提出成文件。
 *
 * @author Frank
 * @time 2026-08-28 14:20:00
 */
import type { KvRowIn } from './types'
import css from './start.module.css'

/**
 * 渲染一行键值。
 *
 * @param props 键与值。
 * @returns 一行。
 */
export function KvRow({ k, v }: KvRowIn) {
  return (
    <div className={css.kv}>
      <span className={css.kvK}>{k}</span>
      <span className={css.kvV}>{v}</span>
    </div>
  )
}
