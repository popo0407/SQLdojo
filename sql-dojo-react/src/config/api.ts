/**
 * API設定
 * ルート直下の.envファイルからAPP_PORTを読み込み
 */
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1',
} as const;
