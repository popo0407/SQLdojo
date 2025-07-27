import { describe, it, expect, beforeEach } from 'vitest';
import { act } from 'react';
import { createUIStore } from './useUIStore';
import type { StoreApi } from 'zustand';

interface UIState {
  isPending: boolean;
  isLoadingMore: boolean;
  isConfigLoading: boolean;
  isDownloading: boolean;
  isError: boolean;
  error: Error | null;
  filterModal: { show: boolean; columnName: string; currentFilters?: string[] };
  showLimitDialog: boolean;
  limitDialogData: { totalCount: number; message: string } | null;
  configSettings: { default_page_size?: number; max_records_for_csv_download?: number } | null;
  setIsPending: (pending: boolean) => void;
  setIsLoadingMore: (loading: boolean) => void;
  setIsConfigLoading: (loading: boolean) => void;
  setIsDownloading: (downloading: boolean) => void;
  setIsError: (error: boolean) => void;
  setError: (error: Error | null) => void;
  setFilterModal: (modal: { show: boolean; columnName: string; currentFilters?: string[] }) => void;
  setShowLimitDialog: (show: boolean) => void;
  setLimitDialogData: (data: { totalCount: number; message: string } | null) => void;
  setConfigSettings: (settings: { default_page_size?: number; max_records_for_csv_download?: number } | null) => void;
  clearError: () => void;
  startLoading: () => void;
  stopLoading: () => void;
}

let store: StoreApi<UIState>;

describe('useUIStore', () => {
  beforeEach(() => {
    store = createUIStore();
    act(() => {
      store.getState().clearError();
      store.getState().stopLoading();
    });
  });

  it('初期状態が正しい', () => {
    const state = store.getState();
    expect(state.isPending).toBe(false);
    expect(state.isLoadingMore).toBe(false);
    expect(state.isConfigLoading).toBe(true);
    expect(state.isDownloading).toBe(false);
    expect(state.isError).toBe(false);
    expect(state.error).toBeNull();
    expect(state.filterModal).toEqual({ show: false, columnName: '', currentFilters: [] });
    expect(state.showLimitDialog).toBe(false);
    expect(state.limitDialogData).toBeNull();
    expect(state.configSettings).toBeNull();
  });

  it('setIsPendingでisPendingが更新される', () => {
    act(() => { store.getState().setIsPending(true); });
    expect(store.getState().isPending).toBe(true);
  });

  it('setIsError/setErrorでエラー状態が更新される', () => {
    act(() => {
      store.getState().setIsError(true);
      store.getState().setError(new Error('err'));
    });
    expect(store.getState().isError).toBe(true);
    expect(store.getState().error).toEqual(new Error('err'));
  });

  it('clearErrorでエラー状態がリセットされる', () => {
    act(() => {
      store.getState().setIsError(true);
      store.getState().setError(new Error('err'));
      store.getState().clearError();
    });
    expect(store.getState().isError).toBe(false);
    expect(store.getState().error).toBeNull();
  });

  it('startLoading/stopLoadingでローディング状態が制御される', () => {
    act(() => { store.getState().startLoading(); });
    expect(store.getState().isPending).toBe(true);
    act(() => { store.getState().stopLoading(); });
    expect(store.getState().isPending).toBe(false);
  });
}); 