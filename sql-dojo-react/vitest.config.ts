import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    // ログレベルを調整してノイズを減らす
    logLevel: 'error',
    // 不要な詳細出力を抑制
    silent: false,
    // レポーター設定
    reporter: ['default'],
    // テスト実行時の詳細度を調整
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
}); 