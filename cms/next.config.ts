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
