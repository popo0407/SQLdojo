import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // ルート直下の.envファイルを読み込み
  const env = loadEnv(mode, resolve(__dirname, '..'), '')
  
  return {
    plugins: [react()],
    define: {
      // 環境変数をVITE_プレフィックス付きで公開
      // 開発時はプロキシを使うため相対パスにする
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify('/api/v1'),
    },
    server: {
  host: '127.0.0.1',
      proxy: {
        '/api/v1': {
          target: `http://127.0.0.1:${env.APP_PORT || '8001'}`,
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})
