import { useState, useCallback } from 'react';
import type { BusinessUser, BusinessUserListResponse, BusinessUserRefreshResponse } from '../api/businessUserApi';
import { businessUserApi } from '../api/businessUserApi';

interface UseBusinessUserState {
  users: BusinessUser[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
}

export const useBusinessUser = () => {
  const [state, setState] = useState<UseBusinessUserState>({
    users: [],
    totalCount: 0,
    loading: false,
    error: null,
    refreshing: false,
  });

  /**
   * ユーザー一覧を取得
   */
  const fetchUsers = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response: BusinessUserListResponse = await businessUserApi.getBusinessUsers();
      setState(prev => ({
        ...prev,
        users: response.users,
        totalCount: response.total_count,
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ユーザー一覧の取得に失敗しました';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

  /**
   * ユーザー情報を更新
   */
  const refreshUsers = useCallback(async (): Promise<BusinessUserRefreshResponse> => {
    setState(prev => ({ ...prev, refreshing: true, error: null }));
    
    try {
      const response: BusinessUserRefreshResponse = await businessUserApi.refreshBusinessUsers();
      
      // 更新成功時は一覧を再取得
      if (response.success) {
        await fetchUsers();
      }
      
      setState(prev => ({ ...prev, refreshing: false }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ユーザー情報の更新に失敗しました';
      setState(prev => ({
        ...prev,
        refreshing: false,
        error: errorMessage,
      }));
      
      return {
        success: false,
        updated_count: 0,
        message: errorMessage,
      };
    }
  }, [fetchUsers]);

  return {
    ...state,
    fetchUsers,
    refreshUsers,
  };
};
