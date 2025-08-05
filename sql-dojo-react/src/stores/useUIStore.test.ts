import { describe, it, expect, beforeEach } from 'vitest';
import { act } from 'react';
import { createUIStore, type UIStore } from './useUIStore';
import type { StoreApi } from 'zustand';

let store: StoreApi<UIStore>;

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
    expect(state.isLoading).toBe(false);
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

  it('setError/clearErrorでエラー状態が更新される', () => {
    act(() => {
      store.getState().setError('Test error');
    });
    expect(store.getState().error).toBe('Test error');
    
    act(() => {
      store.getState().clearError();
    });
    expect(store.getState().error).toBeNull();
  });

  it('clearErrorでエラー状態がリセットされる', () => {
    act(() => {
      store.getState().setError('Test error');
      store.getState().clearError();
    });
    expect(store.getState().error).toBeNull();
  });

  it('startLoading/stopLoadingでローディング状態が制御される', () => {
    act(() => { store.getState().startLoading(); });
    expect(store.getState().isPending).toBe(true);
    act(() => { store.getState().stopLoading(); });
    expect(store.getState().isPending).toBe(false);
  });
}); 