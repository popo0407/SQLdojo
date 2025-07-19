import { apiClient } from './apiClient';
import type { ExecuteSqlResponse, CacheReadResponse, FilterConfig } from '../types/api';

export interface SqlExecutionParams {
  sql: string;
}

export interface CacheReadParams {
  session_id: string;
  page: number;
  page_size: number;
  filters?: FilterConfig;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

export interface CsvDownloadParams {
  session_id: string;
  filters?: FilterConfig;
  sort_by?: string;
  sort_order?: string;
}

export interface SqlFormatParams {
  sql: string;
}

export interface SqlSuggestParams {
  sql: string;
  position: number;
  context: any;
}

/**
 * SQL実行をキャッシュサーバーに依頼する
 */
export const executeSqlOnCache = async (params: SqlExecutionParams): Promise<ExecuteSqlResponse> => {
  return apiClient.post<ExecuteSqlResponse>('/sql/cache/execute', params);
};

/**
 * キャッシュから結果を読み出す
 */
export const readSqlCache = async (params: CacheReadParams): Promise<CacheReadResponse> => {
  return apiClient.post<CacheReadResponse>('/sql/cache/read', params);
};

/**
 * CSVファイルをダウンロードする
 */
export const downloadCsvFromCache = async (params: CsvDownloadParams): Promise<Blob> => {
  return apiClient.downloadCsv(params.session_id, params.filters, params.sort_by, params.sort_order);
};

/**
 * SQLを整形する
 */
export const formatSql = async (params: SqlFormatParams): Promise<string> => {
  const result = await apiClient.formatSQL(params.sql);
  return result.formatted_sql;
};

/**
 * SQL補完候補を取得する
 */
export const getSqlSuggestions = async (params: SqlSuggestParams): Promise<any> => {
  return apiClient.post('/sql/suggest', params);
}; 