import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { include: ['tests/rules.test.ts', 'tests/lobby.test.mjs'], testTimeout: 15000, hookTimeout: 20000, fileParallelism: false } })
