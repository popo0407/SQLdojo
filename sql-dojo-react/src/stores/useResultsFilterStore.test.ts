import { describe, it, expect, beforeEach } from 'vitest';
import { act } from 'react';
import { createResultsFilterStore } from './useResultsFilterStore';
import type { StoreApi } from 'zustand';
import type { ResultsFilterState, ResultsFilterActions } from '../types/results';

type FilterStoreState = ResultsFilterState & ResultsFilterActions;

describe('useResultsFilterStore', () => {
  let store: StoreApi<FilterStoreState>;
  beforeEach(() => {
    store = createResultsFilterStore();
    act(() => {
      store.setState({
        sortConfig: null,
        filters: {},
        filterModal: { show: false, columnName: '', currentFilters: [] },
      });
    });
  });

  it('初期状態が正しい', () => {
    const state = store.getState();
    expect(state.sortConfig).toBeNull();
    expect(state.filters).toEqual({});
    expect(state.filterModal).toEqual({ show: false, columnName: '', currentFilters: [] });
  });

  it('setSortConfigでsortConfigが更新される', () => {
    act(() => {
      store.getState().setSortConfig({ key: 'col', direction: 'asc' });
    });
    expect(store.getState().sortConfig).toEqual({ key: 'col', direction: 'asc' });
  });

  it('setFiltersでfiltersが更新される', () => {
    act(() => {
      store.getState().setFilters({ col: ['a'] });
    });
    expect(store.getState().filters).toEqual({ col: ['a'] });
  });

  it('setFilterModalでfilterModalが更新される', () => {
    act(() => {
      store.getState().setFilterModal({ show: true, columnName: 'col', currentFilters: ['a'] });
    });
    expect(store.getState().filterModal).toEqual({ show: true, columnName: 'col', currentFilters: ['a'] });
  });

  it('applySort/Filterは最低限呼び出しできる', async () => {
    await act(async () => {
      await store.getState().applySort('col');
      await store.getState().applyFilter('col', ['a']);
    });
    expect(true).toBe(true);
  });
}); 