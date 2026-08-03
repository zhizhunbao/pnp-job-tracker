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
