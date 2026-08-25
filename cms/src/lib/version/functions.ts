/**
 * version 域的纯函数:从环境变量读出部署身份。
 *
 * @author Frank
 * @time 2026-08-24 23:40:00
 */
import { COMMIT_LOCAL, ENV_BRANCH, ENV_COMMIT, ENV_SERVICE, FIELD_NONE } from './constants'
import type { DeployIdent } from './types'

/**
 * 读当前部署身份。
 * 不缓存、不记忆:进程活着的时候这三个值不会变,但**换了构建就是换了进程**,
 * 缓存在这儿一点便宜也占不到,反而多一层可能骗人的东西。
 *
 * @returns 部署身份三格。
 */
export function deployIdentOf(): DeployIdent {
  let commit = COMMIT_LOCAL
  const fromEnv = process.env[ENV_COMMIT]
  if (fromEnv != null && fromEnv !== FIELD_NONE) {
    commit = fromEnv
  }
  let branch = FIELD_NONE
  const branchEnv = process.env[ENV_BRANCH]
  if (branchEnv != null) {
    branch = branchEnv
  }
  let service = FIELD_NONE
  const serviceEnv = process.env[ENV_SERVICE]
  if (serviceEnv != null) {
    service = serviceEnv
  }
  return { commit, branch, service }
}
