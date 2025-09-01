import type { ExecuteSqlResponse, CacheReadResponse, SqlCompletionResult, SessionStatusResponse } from '../types/api';
import type { FilterConfig } from '../types/common';
import { apiClient } from './apiClient';
import { API_CONFIG } from '../config/api';

// SQL実行API
export const executeSqlOnCache = async ({ sql }: { sql: string }): Promise<ExecuteSqlResponse> => {
  return apiClient.post<ExecuteSqlResponse>('/sql/cache/execute', { sql });
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
  const response = await fetch(`${API_CONFIG.BASE_URL}/sql/cache/read`, {
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
  const response = await fetch(`${API_CONFIG.BASE_URL}/sql/cache/download/csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, filters, sort_by, sort_order }),
  });
  return response.blob();
};

// 直接SQLからCSVダウンロード (非キャッシュ経路)
export const downloadCsvDirect = async ({ sql, filename }: { sql: string; filename?: string }): Promise<Blob> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/sql/download/csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, filename }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CSVダウンロード失敗: ${response.status} ${text}`);
  }
  return response.blob();
};

// Excelダウンロード (キャッシュ経路)
export const downloadExcelFromCache = async ({
  session_id,
  filters,
  sort_by,
  sort_order,
  filename,
}: {
  session_id: string;
  filters?: FilterConfig;
  sort_by?: string;
  sort_order?: string;
  filename?: string;
}): Promise<Blob> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/sql/cache/download/excel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, filters, sort_by, sort_order, filename }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Excelダウンロード失敗: ${response.status} ${text}`);
  }
  return response.blob();
};

export const downloadSqlCsv = async (sql: string): Promise<void> => {
  try {
    const blob = await downloadCsvDirect({ sql });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query_result.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  } catch (error) {
    console.error('CSV download failed:', error);
    // You might want to show a notification to the user
  }
};

// クリップボード用TSV取得 (キャッシュ経路)
export const fetchClipboardTsvFromCache = async ({
  session_id,
  filters,
  sort_by,
  sort_order,
  filename,
}: {
  session_id: string;
  filters?: FilterConfig;
  sort_by?: string;
  sort_order?: string;
  filename?: string;
}): Promise<string> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/sql/cache/clipboard/tsv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, filters, sort_by, sort_order, filename }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TSV取得失敗: ${response.status} ${text}`);
  }
  return response.text();
};

// SQL整形API
export const formatSql = async ({ sql }: { sql: string }): Promise<string> => {
  const response = await fetch(`${API_CONFIG.BASE_URL}/sql/format`, {
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
  context: Record<string, unknown>; 
}): Promise<SqlCompletionResult> => {
  return apiClient.post<SqlCompletionResult>('/sql/suggest', { sql, position, context });
};

/**
 * セッションの進捗状態を取得する
 */
export const getSessionStatus = async (sessionId: string): Promise<SessionStatusResponse> => {
  return apiClient.get<SessionStatusResponse>(`/sql/cache/status/${sessionId}`);
}; 