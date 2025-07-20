import type { ExecuteSqlResponse, CacheReadResponse, SqlCompletionResult } from '../types/api';
import type { FilterConfig } from '../types/results';
import { apiClient } from './apiClient';

// SQL実行API
export const executeSqlOnCache = async ({ sql }: { sql: string }): Promise<ExecuteSqlResponse> => {
  const response = await fetch('/api/v1/sql/cache/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql }),
  });
  return response.json();
};

// SQLキャッシュ読み込みAPI
export const readSqlCache = async ({ 
  session_id, 
  page, 
  page_size, 
  filters, 
  sort_by, 
  sort_order 
}: { 
  session_id: string; 
  page: number; 
  page_size: number; 
  filters?: FilterConfig;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}): Promise<CacheReadResponse> => {
  const response = await fetch('/api/v1/sql/cache/read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, page, page_size, filters, sort_by, sort_order }),
  });
  return response.json();
};

// CSVダウンロードAPI
export const downloadCsvFromCache = async ({ 
  session_id, 
  filters, 
  sort_by, 
  sort_order 
}: { 
  session_id: string; 
  filters?: FilterConfig;
  sort_by?: string;
  sort_order?: string;
}): Promise<Blob> => {
  const response = await fetch('/api/v1/sql/cache/download/csv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, filters, sort_by, sort_order }),
  });
  return response.blob();
};

// SQL整形API
export const formatSql = async ({ sql }: { sql: string }): Promise<string> => {
  const response = await fetch('/api/v1/sql/format', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql }),
  });
  const result = await response.json();
  return result.formatted_sql;
};

/**
 * SQL補完候補を取得する
 */
export const getSqlSuggestions = async ({ sql, position, context }: { 
  sql: string; 
  position: number; 
  context: any; 
}): Promise<SqlCompletionResult> => {
  return apiClient.post<SqlCompletionResult>('/sql/suggest', { sql, position, context });
}; 