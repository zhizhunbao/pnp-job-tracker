import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
    // 🔴 `npm run build` 的 standalone 产物会把整个 tests/ 复制进 .next/,于是**按文件名过滤跑单个 spec 时**
    //    vitest 会把那份副本也当成目标(路径里含同样的文件名),而副本里 `@/` 别名解析不了 → 整轮报
    //    `Cannot find package '@/lib/db/database'`。跑全量时不会撞上,所以它藏了很久(2026-08-20 实撞)。
    exclude: ['**/node_modules/**', '**/.next/**'],
  },
})
