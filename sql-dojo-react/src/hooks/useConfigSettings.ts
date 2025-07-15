import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiError } from '../api/apiClient';
import type { ConfigSettings } from '../types/api';

export const useConfigSettings = () => {
  return useQuery<ConfigSettings, ApiError>({
    queryKey: ['configSettings'],
    queryFn: () => apiClient.get('/config/settings'),
    gcTime: 10 * 60 * 1000, // 10分間キャッシュ
    staleTime: 5 * 60 * 1000, // 5分間は新鮮
  });
}; 