/**
 * version 域的死值:Render 注入的部署身份变量名,与本地缺省。
 *
 * @author Frank
 * @time 2026-08-24 23:40:00
 */

/**
 * 提交号的环境变量名。Render 在构建容器里注入,值是这次构建所用的 git SHA。
 * 名字由平台定死,改不了 —— 换平台要连这三个名字一起改(这也是本域寿命的上限)。
 */
export const ENV_COMMIT = 'RENDER_GIT_COMMIT'

/**
 * 分支名的环境变量名。
 */
export const ENV_BRANCH = 'RENDER_GIT_BRANCH'

/**
 * 服务名的环境变量名。同一个仓库可能部署成几个服务(web / cron),
 * 出问题时要先分清打到的是哪一个。
 */
export const ENV_SERVICE = 'RENDER_SERVICE_NAME'

/**
 * 本地 dev 没有注入变量时的提交号。写 'local' 而不是空串:
 * 哨兵脚本按值判「线上换版了没有」,空串会和「变量拼错」混成同一种症状。
 */
export const COMMIT_LOCAL = 'local'

/**
 * 分支与服务名取不到时的值。它们只是排查时的旁证,没有就留空 ——
 * 不像提交号那样有个有意义的本地缺省可编。
 */
export const FIELD_NONE = ''

/**
 * 这个端点的缓存策略头值。必须 no-store:它存在的全部意义就是**此刻**在跑什么,
 * 被任何一层缓存住,答案就成了「某个时候在跑什么」—— 那正是 2026-07-21 事故里
 * 我们被骗了一整天的东西。
 */
export const CACHE_NO_STORE = 'no-store'
