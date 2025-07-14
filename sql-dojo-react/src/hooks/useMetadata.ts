import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/apiClient';
import type { Schema } from '../types/metadata';

// メタデータを取得する非同期関数
const fetchMetadata = (): Promise<Schema[]> => {
  return apiClient.get<Schema[]>('/metadata/all');
};

export const useMetadata = () => {
  return useQuery({
    queryKey: ['metadata'], // このクエリの一意なキー
    queryFn: fetchMetadata, // データを取得する関数
  });
}; 