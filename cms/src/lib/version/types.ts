/**
 * version 域的形状。
 *
 * @author Frank
 * @time 2026-08-24 23:40:00
 */

/**
 * 部署身份:线上此刻跑的是哪一份代码。
 */
export type DeployIdent = {
  /**
   * 构建所用的 git 提交号;本地 dev 是 'local'。
   */
  commit: string

  /**
   * 构建所用的分支名;取不到给空串。
   */
  branch: string

  /**
   * Render 上的服务名(同仓库可能有 web / cron 几个);取不到给空串。
   */
  service: string
}
