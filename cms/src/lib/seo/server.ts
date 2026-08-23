/**
 * seo 域的服务端门:sitemapindex 芯与分片取数(要连库的那半)。
 *
 * @author Frank
 * @time 2026-08-23 23:30:00
 */
export { sitemapIndexRoute } from './routes'
export {
  loadCompanyShardCount, loadCompanyShardIds, loadCompanyShardPage,
  loadJobShardCount, loadJobShardIds, loadJobShardPage,
} from './functions'
