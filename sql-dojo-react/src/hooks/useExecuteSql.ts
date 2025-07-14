import { useMutation } from '@tanstack/react-query';
import { apiClient, ApiError } from '../api/apiClient';
import type { SqlExecutionResult } from '../types/api';

// APIを呼び出す非同期関数
const executeSql = async (sql: string): Promise<SqlExecutionResult> => {
  return apiClient.post<SqlExecutionResult, { sql: string; limit: number }>('/sql/execute', {
    sql,
    limit: 5000, // 要件に応じて変更
  });
};

export const useExecuteSql = () => {
  return useMutation<SqlExecutionResult, ApiError, string>({
    mutationFn: executeSql,
    // onSuccess, onErrorなどのコールバックもここに追加可能
  });
}; 