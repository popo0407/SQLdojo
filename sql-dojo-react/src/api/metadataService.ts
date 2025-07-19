import { apiClient } from './apiClient';
import type { Schema, FilterConfig } from '../types/api';

export interface UniqueValuesParams {
  session_id: string;
  column_name: string;
  filters: FilterConfig;
}

export interface UniqueValuesResponse {
  values: string[];
  truncated?: boolean;
}

/**
 * DBのメタデータ（スキーマ情報）を取得する
 */
export const getAllMetadata = async (): Promise<Schema[]> => {
  return apiClient.get<Schema[]>('/metadata/all');
};

/**
 * 設定情報を取得する
 */
export const getConfigSettings = async (): Promise<any> => {
  return apiClient.get('/config/settings');
};

/**
 * カラム内のユニークな値を取得する
 */
export const getUniqueValues = async (params: UniqueValuesParams): Promise<UniqueValuesResponse> => {
  return apiClient.post<UniqueValuesResponse>('/sql/cache/unique-values', params);
}; 