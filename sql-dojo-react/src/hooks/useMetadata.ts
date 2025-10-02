import { useCallback } from 'react';
import { useMetadataContext } from '../contexts/MetadataContext';
import { getAllMetadata, refreshMetadata } from '../api/metadataService';

/**
 * メタデータ操作のカスタムフック
 */
export const useMetadata = () => {
  const { state, dispatch } = useMetadataContext();

  // メタデータ取得
  const fetchMetadata = useCallback(async () => {
    try {
      dispatch({ type: 'FETCH_START' });
      const data = await getAllMetadata();
      dispatch({ type: 'FETCH_SUCCESS', payload: data });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'メタデータの取得に失敗しました';
      dispatch({ type: 'FETCH_ERROR', payload: errorMessage });
      throw error;
    }
  }, [dispatch]);

  // メタデータ強制更新（管理者用）
  const refreshMetadataForce = useCallback(async () => {
    try {
      dispatch({ type: 'REFRESH_START' });
      console.info('メタデータ・マスター情報更新開始'); // ログ要件対応
      const data = await refreshMetadata();
      dispatch({ type: 'REFRESH_SUCCESS', payload: data });
      console.info('メタデータ・マスター情報更新完了'); // ログ要件対応
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'メタデータ・マスター情報の更新に失敗しました';
      dispatch({ type: 'REFRESH_ERROR', payload: errorMessage });
      console.error('メタデータ・マスター情報更新エラー:', error); // ログ要件対応
      throw error;
    }
  }, [dispatch]);

  // エラークリア
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, [dispatch]);

  return {
    // 状態
    data: state.data,
    loading: state.loading,
    refreshing: state.refreshing,
    error: state.error,
    lastUpdated: state.lastUpdated,
    // アクション
    fetchMetadata,
    refreshMetadataForce,
    clearError,
  };
}; 