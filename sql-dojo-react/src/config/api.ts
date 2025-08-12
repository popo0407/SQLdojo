/**
 * API設定
 * ルート直下の.envファイルからAPP_PORTを読み込み
 */
const devBase = '/api/v1';
const prodBase = (() => {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return `${window.location.origin}/api/v1`;
  }
  return 'http://127.0.0.1:8001/api/v1';
})();

export const API_CONFIG = {
  // 開発時はViteのプロキシで同一オリジン
  // 本番は VITE_API_BASE_URL があればそれを使用、なければ window.origin を使う
  BASE_URL: import.meta.env.DEV
    ? devBase
    : (import.meta.env.VITE_API_BASE_URL || prodBase),
  // フロントのAPI呼び出しタイムアウト(ms)。未設定時は10秒
  TIMEOUT_MS: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 10000,
} as const;
