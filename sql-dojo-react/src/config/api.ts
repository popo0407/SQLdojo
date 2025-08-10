/**
 * API設定
 * ルート直下の.envファイルからAPP_PORTを読み込み
 */
export const API_CONFIG = {
  // 開発時はViteのプロキシを使い同一オリジン通信にしてCookie問題を回避
  BASE_URL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? '/api/v1' : 'http://127.0.0.1:8001/api/v1'),
} as const;
