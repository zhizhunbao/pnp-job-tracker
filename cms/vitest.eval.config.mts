import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

/**
 * 对话评测批跑层(07_对话评测批 §1):真库 + 真模型(friend),证明「能答对多少」。
 * 与 vitest.config.mts(恒绿回归网,证明「没退化」)分开:本层允许红,红=信号不拦 CI;
 * `test` / `test:int` 不包含本层,只有 `pnpm run eval:chat` 会跑。
 * 串行(fileParallelism:false)= 别并发打爆朋友的服务与生产池(prod-pool-wedge 教训)。
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // `server-only` 毒丸(db/pool.ts):node 环境下同样要换成空模块(与 vitest.config.mts 同一手法)
      'server-only': fileURLToPath(new URL('./tests/server-only-stub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/eval/**/*.eval.spec.ts'],
    fileParallelism: false,
    testTimeout: 600_000,
    hookTimeout: 60_000,
  },
})
