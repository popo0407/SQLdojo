// alertは使用されず toast に移行したためダミー不要
import { describe, it, expect, beforeEach } from 'vitest';
import { act } from 'react';
import { createResultsExportStore } from './useResultsExportStore';
import type { StoreApi } from 'zustand';
import type { ResultsExportActions } from '../types/results';

describe('useResultsExportStore', () => {
  let store: StoreApi<ResultsExportActions>;
  beforeEach(() => {
    store = createResultsExportStore();
  });

  it('downloadCsvは最低限呼び出しできる', async () => {
    await act(async () => {
      await store.getState().downloadCsv();
    });
    expect(true).toBe(true);
  });

  it('downloadCsvLocalは最低限呼び出しできる', () => {
    act(() => {
      store.getState().downloadCsvLocal();
    });
    expect(true).toBe(true);
  });
}); 