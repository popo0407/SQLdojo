import { useState, useCallback } from 'react';
import type { ExecuteSqlResponse, CacheSQLResponse } from '../types/api';

interface ProgressState {
  isVisible: boolean;
  total_count: number;
  current_count: number;
  progress_percentage: number;
  message?: string;
}

export const useProgressIndicator = () => {
  const [progressState, setProgressState] = useState<ProgressState>({
    isVisible: false,
    total_count: 0,
    current_count: 0,
    progress_percentage: 0,
    message: undefined
  });

  const showProgress = useCallback((
    total_count: number, 
    current_count: number = 0, 
    message?: string
  ) => {
    const progress_percentage = total_count > 0 ? (current_count / total_count) * 100 : 0;
    
    setProgressState({
      isVisible: true,
      total_count,
      current_count,
      progress_percentage,
      message
    });
  }, []);

  const updateProgress = useCallback((
    current_count: number, 
    message?: string
  ) => {
    setProgressState(prev => {
      const progress_percentage = prev.total_count > 0 ? (current_count / prev.total_count) * 100 : 0;
      
      return {
        ...prev,
        current_count,
        progress_percentage,
        message
      };
    });
  }, []);

  const hideProgress = useCallback(() => {
    setProgressState({
      isVisible: false,
      total_count: 0,
      current_count: 0,
      progress_percentage: 0,
      message: undefined
    });
  }, []);

  const handleApiResponse = useCallback((response: ExecuteSqlResponse | CacheSQLResponse) => {
    if (response.total_count && response.current_count !== undefined && response.progress_percentage !== undefined) {
      showProgress(response.total_count, response.current_count, response.message);
    }
  }, [showProgress]);

  return {
    progressState,
    showProgress,
    updateProgress,
    hideProgress,
    handleApiResponse
  };
};