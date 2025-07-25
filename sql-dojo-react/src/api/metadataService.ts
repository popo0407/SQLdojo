import type { Schema } from '../types/api';
import type { FilterConfig } from '../types/common';
import { apiClient } from './apiClient';

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
  try {
    const response = await apiClient.get<Schema[]>('/metadata/all');
    // メタデータAPIレスポンス
    return response;
  } catch (error) {
    console.error('メタデータ取得エラー:', error);
    throw error;
  }
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
export const getUniqueValues = async ({ 
  session_id, 
  column_name, 
  filters 
}: { 
  session_id: string; 
  column_name: string; 
  filters: FilterConfig;
}): Promise<{ values: string[]; truncated: boolean }> => {
  const response = await fetch('/api/v1/sql/cache/unique-values', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, column_name, filters }),
  });
  return response.json();
}; 