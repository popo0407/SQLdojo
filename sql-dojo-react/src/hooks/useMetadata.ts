import { useQuery } from '@tanstack/react-query';
import { getAllMetadata } from '../api/metadataService';
import type { Schema } from '../types/api';

// メタデータを取得する非同期関数
const fetchMetadata = (): Promise<Schema[]> => {
  return getAllMetadata();
};

export const useMetadata = () => {
  return useQuery({
    queryKey: ['metadata'], // このクエリの一意なキー
    queryFn: fetchMetadata, // データを取得する関数
  });
}; 