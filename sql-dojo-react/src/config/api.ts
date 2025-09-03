/**
 * API設定
 * ルート直下の.envファイルからAPP_PORTを読み込み
 */
const devBase = '/api/v1';

// productionでは環境変数の存在を必須にする（設定漏れを黙認しない）
const resolvedBase = import.meta.env.DEV
  ? devBase
  : import.meta.env.VITE_API_BASE_URL;

if (!import.meta.env.DEV) {
  // 本番で VITE_API_BASE_URL が未設定または空文字の場合は明示的に失敗させる
  const missing = !resolvedBase || String(resolvedBase).trim() === '';
  if (missing) {
    // ビルド時に置換されるため、実行環境（ブラウザ）で見るより早く検出するため
    // ここでは例外を投げて fail-fast にする
    throw new Error('[API_CONFIG] VITE_API_BASE_URL is required in production builds');
  }
}

export const API_CONFIG = {
  // 開発時はViteのプロキシで同一オリジン
  BASE_URL: resolvedBase,
  // デフォルトタイムアウト(ms)
  TIMEOUT_MS: Number(import.meta.env.VITE_API_TIMEOUT_MS) || 30000,
  // 中量処理タイムアウト(ms) - SQL履歴、管理者データ、キャッシュ処理
  TIMEOUT_MEDIUM_MS: Number(import.meta.env.VITE_API_TIMEOUT_MEDIUM_MS) || 60000,
  // 重量処理タイムアウト(ms) - エディタSQL実行、ダウンロード系
  TIMEOUT_HEAVY_MS: Number(import.meta.env.VITE_API_TIMEOUT_HEAVY_MS) || 300000,
} as const;
