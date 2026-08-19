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
