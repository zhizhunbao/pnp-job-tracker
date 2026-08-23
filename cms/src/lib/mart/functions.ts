/**
 * 交接域的行为:mart 文件布局的单一来源 —— 门禁、目录链、`__meta` 分片选路、表级哈希、
 * 形态切换的残留清理。upload(写)与 seed(读)此前各镜像一份这些知识,收拢在此
 * (2026-08-23;读写两侧改口径只改这一个文件)。
 *
 * 分片存在的意义:512MB 实例整文件 parse 27k 行 jobs 会 OOM(实撞),
 * 大表(>6MB)由 etl/upload_mart.py 分片上传(`name__part0..N-1` + `name__meta` 声明片数,
 * meta 最后传 = 提交语义),seed 逐片 parse→入库→释放。
 *
 * @author Frank
 * @time 2026-08-23 14:20:00
 */

import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  HDR_SEED_TOKEN, JSON_EXT, LOCAL_MART_REL, MART_DIR_NAME, META_SUFFIX, PART_INFIX,
  SHARD_SEP,
} from './constants'
import type { MartPathsOut, TokenGateIn } from './types'

/**
 * 门禁:SEED_TOKEN 已设置则必须匹配(生产必设 —— ?reset=1 可清库,公网裸奔 = 事故;
 * 本地 dev 未设则放行)。upload 与 /seed 同一把钥匙、同一段判定。
 *
 * @param input 请求与查询参数里的 token(upload 传 null)。
 * @returns 放不放行。
 */
export function seedTokenOk(input: TokenGateIn): boolean {
  const token = process.env.SEED_TOKEN
  if (token == null || token === '') {
    return true
  }
  if (input.req.headers.get(HDR_SEED_TOKEN) === token) {
    return true
  }
  return input.queryToken === token
}

/**
 * upload 的落盘目录(tmpdir 下;/tmp 随部署即弃无妨 —— 上传与 seed 前后脚,
 * 若恰逢重启丢文件,seed 读不到会响亮失败不空灌)。
 *
 * @returns 绝对路径(不保证存在,写侧自建)。
 */
export function martTmpDir(): string {
  return path.join(os.tmpdir(), MART_DIR_NAME)
}

/**
 * seed 的读取目录链:upload 落的 tmpdir 优先(Render 生产),回退本地 ../data/mart
 * (本地 dev / compose 直读 ETL 产物)。
 *
 * @returns 目录清单(按优先级)。
 */
export function martDirs(): string[] {
  return [martTmpDir(), path.resolve(process.cwd(), LOCAL_MART_REL)]
}

/**
 * 一张表本轮的有序文件清单(`__meta` 分片形制的读侧单一来源)。
 * 2026-07-11 事故防线(22c8d6a)语义:上游读失败绝不能当空表 ——
 * 两目录都不存在 = 本轮上传丢失(如部署重启清 /tmp)→ 抛错让整事务回滚;
 * 有目录而单表文件缺 = 表确实不存在 → 返回 []。
 * meta 声明的片缺失 = 半程上传 → 抛错整事务回滚。
 *
 * @param name 表名。
 * @returns 有序文件清单;该表没上传是空表。
 */
export function martPaths(name: string): MartPathsOut {
  const dirs = martDirs()
  for (const dir of dirs) {
    if (fs.existsSync(dir) === false) {
      continue
    }
    const metaP = path.join(dir, name + META_SUFFIX + JSON_EXT)
    if (fs.existsSync(metaP)) {
      const meta = JSON.parse(fs.readFileSync(metaP, 'utf8'))
      let parts = 0
      if (Array.isArray(meta) && meta[0] != null && typeof meta[0] === 'object' && Number.isInteger(meta[0].parts)) {
        parts = meta[0].parts
      }
      if (parts < 1) {
        throw new Error(`mart ${name}${META_SUFFIX} invalid`)
      }
      const out: string[] = []
      for (let k = 0; k < parts; k++) {
        const p = path.join(dir, name + PART_INFIX + k + JSON_EXT)
        if (fs.existsSync(p) === false) {
          throw new Error(`mart ${name} shard ${k + 1}/${parts} missing (partial upload? rolling back)`)
        }
        out.push(p)
      }
      return out
    }
    const single = path.join(dir, name + JSON_EXT)
    if (fs.existsSync(single)) {
      return [single]
    }
  }
  if (fs.existsSync(dirs[0]) === false && fs.existsSync(dirs[1]) === false) {
    throw new Error(`mart no data source: neither ${dirs[0]} nor ${dirs[1]} exists (upload lost? rolling back)`)
  }
  return []
}

/**
 * 表级内容哈希(裸字节,parse 前;#118):与上轮一致的表整表跳过不重灌,
 * 压 seed 耗时出代理 ~100s 危险区。哈希存 seed_state 表,随事务提交,回滚不留脏哈希。
 *
 * @param name 表名。
 * @returns 该表全部分片按序的 md5。
 */
export function martHash(name: string): string {
  const h = crypto.createHash('md5')
  for (const p of martPaths(name)) {
    h.update(fs.readFileSync(p))
  }
  return h.digest('hex')
}

/**
 * 形态切换要清的残留文件(写侧;`__meta` 形制的另一半):seed 按「有 __meta 走分片,
 * 否则走单文件」选路,旧形态文件留着会被误读 —— 单文件落地删同表旧 meta;
 * meta 落地(分片集提交)删同表旧单文件;part 分片自身不清对方。
 *
 * @param name 本次落地的文件名(不含扩展名)。
 * @returns 该删的对方文件的绝对路径;不需要清是 null。
 */
export function martCounterpart(name: string): string | null {
  const dir = martTmpDir()
  if (name.endsWith(META_SUFFIX)) {
    return path.join(dir, name.slice(0, name.length - META_SUFFIX.length) + JSON_EXT)
  }
  if (name.includes(SHARD_SEP)) {
    return null
  }
  return path.join(dir, name + META_SUFFIX + JSON_EXT)
}
