import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  output: 'standalone', // 容器化 cms:next build 产出自包含 server.js(见 docker/docker-compose unattended profile)
  // pdf-parse(内嵌 pdfjs)被打进 server bundle 会解析必败(裸 node 正常;2026-08-03 实撞,
  // E11-07 的 /api/resume PDF 路径同病)→ 运行时从 node_modules require,不打包
  serverExternalPackages: ['pdf-parse'],
  // 生产=standalone:pdfjs 的 worker(pdf.worker.mjs)是运行时拼路径动态加载,file tracing
  // 追不到 → 产物里没有 → 「Setting up fake worker failed: Cannot find module」(detail 探针抓的
  // 第二层)。点名整包带上,两条会解析 PDF 的路由都要
  outputFileTracingIncludes: {
    '/api/resume-extract': ['./node_modules/pdfjs-dist/**/*'],
    '/api/resume': ['./node_modules/pdfjs-dist/**/*'],
    // pi(lib/agent 的兜底解析):provider 实现走 `exports` 通配子路径 + 动态 import,
    // 追踪器**抓不到** —— 2026-08-18 实测:build 全绿、standalone/node_modules 里一个 @earendil-works 都没有,
    // 上线就是 MODULE_NOT_FOUND。不点名就漏,这是本仓第二次栽在同一件事上(pdfjs-dist 是第一次)。
    '/api/chat': ['./node_modules/@earendil-works/**/*'],
  },
  // E13-03 三页合一 + 08-06 Frank 追加拍板「完整统计都删掉,与首页重复」:
  // /stats 全家(索引/compare/省页/省×大类)退役 → 通配 301 到把脉首页(S4 已承载省级内容)。
  // 用 statusCode:301 而非 permanent:true(后者发 308)——旧链接在搜索引擎里已被收录,301 是它们认的那个。
  async redirects() {
    return [
      { source: '/stats', destination: '/start', statusCode: 301 },
      { source: '/stats/:path*', destination: '/start', statusCode: 301 },
      // 判定合一批2(设计 §6):四模块合成 /plan/pr 决策页,旧页 301(同上用 301 不用 308)
      { source: '/pathways', destination: '/plan/pr', statusCode: 301 },
      { source: '/plan/job', destination: '/plan/pr', statusCode: 301 },
      { source: '/plan/province', destination: '/plan/pr', statusCode: 301 },
      { source: '/plan/career', destination: '/plan/pr', statusCode: 301 },
      // 货架页 08-08 拍板整页下架(「这个页面就不要了」):担保雇主唯一承载=把脉页三分表橱窗。
      // 2026-08-29 Frank「下架为什么不直接删了」:门文件删掉,308 降位成这行配置(随本族用 301,
      // 语义同为永久跳转);/employers/compare|designated|hiring 是子路径,source 精确匹配不误伤。
      { source: '/employers', destination: '/start', statusCode: 301 },
      // PTE 门厅 2026-09-04 撤(Frank「这个页面怎么还存在」):题型面板已铺在题单页,/pte 直落默认型朗读。
      { source: '/pte', destination: '/pte/ra', statusCode: 301 },
      // /companies 本无列表页(公司数据懒查询,详情只从职位行进),裸地址原是 404 的洞
      // (2026-08-29 Frank「这个下面没用 page.tsx 还没处理」)—— 与 /employers 同令:
      // 名录语义的承载=把脉页三分表橱窗(08-08 拍板),301 过去;/companies/<slug> 详情不受累。
      { source: '/companies', destination: '/start', statusCode: 301 },
      // /rankings 裸路径(#120:原本 404,站内零内链但直输 URL/外发贴链会踩)→ 302 到周榜。
      // 2026-08-29 Frank「这种转发的都可以删了吧」:纯转发门一律降位本表,rankings/page.tsx 删除。
      { source: '/rankings', destination: '/rankings/weekly-top', statusCode: 302 },
      // sponsor-likely 榜 08-08 随雇主货架页一并下架(担保雇主唯一承载=把脉页),原在 [slug] 门里
      // permanentRedirect 分支,同令降位;白名单外的 slug 照旧 404。
      { source: '/rankings/sponsor-likely', destination: '/start', statusCode: 301 },
      // sitemap 全家 2026-08-29 归 /sitemaps/ 一个目录(Frank「只有一个入口/都放到一个目录」):
      // 旧入口与旧核心册是 Google 记住过的两条(GSC 提交 + 已读),301 兜底(Google 认地图跳转);
      // 分片旧址不兜 —— GSC 实查 Google 从未读到过(索引 7/21 后未重读),改名零损失。
      { source: '/sitemap-index.xml', destination: '/api/sitemaps/index.xml', statusCode: 301 },
      { source: '/sitemap.xml', destination: '/api/sitemaps/core.xml', statusCode: 301 },
      // 顶层 /sitemaps 只活了几小时(08-29→30),但 GSC 提交过且 Google 拉过一次,301 兜一轮。
      { source: '/sitemaps/:file', destination: '/api/sitemaps/:file', statusCode: 301 },
    ]
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
