import { describe, it, expect, beforeEach } from 'vitest';
import { act } from 'react';
import { createResultsDataStore } from './useResultsDataStore';
import type { StoreApi } from 'zustand';
import type { ResultsDataState, ResultsDataActions } from '../types/results';

type DataStoreState = ResultsDataState & ResultsDataActions;

describe('useResultsDataStore', () => {
  let store: StoreApi<DataStoreState>;
  beforeEach(() => {
    store = createResultsDataStore();
    act(() => {
      store.getState().clearResults();
    });
  });

  it('初期状態が正しい', () => {
    const state = store.getState();
    expect(state.allData).toEqual([]);
    expect(state.rawData).toEqual([]);
    expect(state.columns).toEqual([]);
    expect(state.rowCount).toBe(0);
    expect(state.execTime).toBe(0);
  });

  it('setAllDataでallDataが更新される', () => {
    act(() => {
      store.getState().setAllData([{ id: 1 }]);
    });
    expect(store.getState().allData).toEqual([{ id: 1 }]);
  });

  it('setRawDataでrawDataが更新される', () => {
    act(() => {
      store.getState().setRawData([{ id: 2 }]);
    });
    expect(store.getState().rawData).toEqual([{ id: 2 }]);
  });

  it('setColumnsでcolumnsが更新される', () => {
    act(() => {
      store.getState().setColumns(['a', 'b']);
    });
    expect(store.getState().columns).toEqual(['a', 'b']);
  });

  it('setRowCountでrowCountが更新される', () => {
    act(() => {
      store.getState().setRowCount(42);
    });
    expect(store.getState().rowCount).toBe(42);
  });

  it('setExecTimeでexecTimeが更新される', () => {
    act(() => {
      store.getState().setExecTime(1234);
    });
    expect(store.getState().execTime).toBe(1234);
  });

  it('clearResultsで全て初期化される', () => {
    act(() => {
      store.getState().setAllData([{ id: 1 }]);
      store.getState().setRawData([{ id: 2 }]);
      store.getState().setColumns(['a']);
      store.getState().setRowCount(99);
      store.getState().setExecTime(999);
      store.getState().clearResults();
    });
    const state = store.getState();
    expect(state.allData).toEqual([]);
    expect(state.rawData).toEqual([]);
    expect(state.columns).toEqual([]);
    expect(state.rowCount).toBe(0);
    expect(state.execTime).toBe(0);
  });
}); 