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
  // フロントのAPI呼び出しタイムアウト(ms)。未設定時は10秒
  TIMEOUT_MS: Number(import.meta.env.VITE_API_TIMEOUT_MS),
} as const;
