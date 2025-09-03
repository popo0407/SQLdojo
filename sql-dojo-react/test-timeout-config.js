/**
 * タイムアウト設定のテスト確認用
 */
import { getTimeoutForEndpoint, getTimeoutCategory } from '../src/utils/timeoutUtils';
import { API_CONFIG } from '../src/config/api';

console.log('=== APIタイムアウト設定確認 ===');
console.log(`デフォルト: ${API_CONFIG.TIMEOUT_MS}ms`);
console.log(`中量処理: ${API_CONFIG.TIMEOUT_MEDIUM_MS}ms`);
console.log(`重量処理: ${API_CONFIG.TIMEOUT_HEAVY_MS}ms`);

console.log('\n=== エンドポイント別タイムアウト ===');

// 重量処理のテスト
const heavyEndpoints = ['/sql/execute', '/sql/download/csv', '/sql/export'];
heavyEndpoints.forEach(endpoint => {
  console.log(`${endpoint}: ${getTimeoutForEndpoint(endpoint)}ms (${getTimeoutCategory(endpoint)})`);
});

// 中量処理のテスト
const mediumEndpoints = ['/logs/recent', '/admin/users', '/sql/cache/read', '/sql/cache/unique-values'];
mediumEndpoints.forEach(endpoint => {
  console.log(`${endpoint}: ${getTimeoutForEndpoint(endpoint)}ms (${getTimeoutCategory(endpoint)})`);
});

// デフォルト処理のテスト
const defaultEndpoints = ['/sql/format', '/sql/validate', '/health', '/user/info'];
defaultEndpoints.forEach(endpoint => {
  console.log(`${endpoint}: ${getTimeoutForEndpoint(endpoint)}ms (${getTimeoutCategory(endpoint)})`);
});
