import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      // `server-only` 毒丸(db/pool.ts)在 jsdom 下走 client 分支会 throw —— 测试里换成空模块
      'server-only': fileURLToPath(new URL('./tests/server-only-stub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
    // 测试报告落盘(2026-08-26 Frank「配置 vitest 报告」;同日并入统一的 reports/,
    // 与 lint 报告同屋):终端输出照旧,另写一份机器可读的 JSON(gitignore,不进库)。
    // HTML 报告要加 @vitest/ui 依赖,未协商先不上 —— 要看趋势/明细先吃这份 JSON。
    reporters: ['default', 'json'],
    outputFile: { json: 'reports/vitest.json' },
    // 🔴 `npm run build` 的 standalone 产物会把整个 tests/ 复制进 .next/,于是**按文件名过滤跑单个 spec 时**
    //    vitest 会把那份副本也当成目标(路径里含同样的文件名),而副本里 `@/` 别名解析不了 → 整轮报
    //    `Cannot find package '@/lib/db/database'`。跑全量时不会撞上,所以它藏了很久(2026-08-20 实撞)。
    exclude: ['**/node_modules/**', '**/.next/**'],
  },
})
