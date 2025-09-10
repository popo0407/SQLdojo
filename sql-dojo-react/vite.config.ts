import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // ルート直下の.envファイルを読み込み
  const env = loadEnv(mode, resolve(__dirname, '..'), '')
  
  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${env.APP_PORT || '8001'}`,
          changeOrigin: true,
          secure: false,
        }
      }
    }
  }
})
