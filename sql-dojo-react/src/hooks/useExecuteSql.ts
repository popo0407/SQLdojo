import { useMutation } from '@tanstack/react-query';
import { apiClient, ApiError } from '../api/apiClient';
import type { ExecuteSqlResponse } from '../types/api';

const executeSql = async (sql: string): Promise<ExecuteSqlResponse> => {
  return apiClient.post('/sql/cache/execute', { sql });
};

export const useExecuteSql = () => {
  return useMutation<ExecuteSqlResponse, ApiError, string>({
    mutationFn: executeSql,
  });
}; 