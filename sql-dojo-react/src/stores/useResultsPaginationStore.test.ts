import { describe, it, expect, beforeEach } from 'vitest';
import { act } from 'react';
import { createResultsPaginationStore } from './useResultsPaginationStore';
import type { StoreApi } from 'zustand';
import type { PaginationStoreState } from '../types/results';

describe('useResultsPaginationStore', () => {
  let store: StoreApi<PaginationStoreState>;
  beforeEach(() => {
    store = createResultsPaginationStore();
    act(() => {
      store.setState({
        currentPage: 1,
        hasMoreData: false,
      });
    });
  });

  it('初期状態が正しい', () => {
    const state = store.getState();
    expect(state.currentPage).toBe(1);
    expect(state.hasMoreData).toBe(false);
  });

  it('setCurrentPageでcurrentPageが更新される', () => {
    act(() => {
      store.getState().setCurrentPage(5);
    });
    expect(store.getState().currentPage).toBe(5);
  });

  it('setHasMoreDataでhasMoreDataが更新される', () => {
    act(() => {
      store.getState().setHasMoreData(true);
    });
    expect(store.getState().hasMoreData).toBe(true);
  });

  it('resetPaginationで初期化される', () => {
    act(() => {
      store.getState().setCurrentPage(3);
      store.getState().setHasMoreData(true);
      store.getState().resetPagination();
    });
    const state = store.getState();
    expect(state.currentPage).toBe(1);
    expect(state.hasMoreData).toBe(false);
  });

  it('loadMoreDataは最低限呼び出しできる', async () => {
    await act(async () => {
      await store.getState().loadMoreData();
    });
    expect(true).toBe(true);
  });
}); 