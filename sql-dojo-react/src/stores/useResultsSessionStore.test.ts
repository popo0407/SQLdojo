import { describe, it, expect, beforeEach } from 'vitest';
import { act } from 'react';
import { createResultsSessionStore } from './useResultsSessionStore';
import type { StoreApi } from 'zustand';
import type { ResultsSessionState, ResultsSessionActions } from '../types/results';

type SessionStoreState = ResultsSessionState & ResultsSessionActions;

describe('useResultsSessionStore', () => {
  let store: StoreApi<SessionStoreState>;
  beforeEach(() => {
    store = createResultsSessionStore();
    act(() => {
      store.setState({
        sessionId: null,
        configSettings: null,
      });
    });
  });

  it('初期状態が正しい', () => {
    const state = store.getState();
    expect(state.sessionId).toBeNull();
    expect(state.configSettings).toBeNull();
  });

  it('setSessionIdでsessionIdが更新される', () => {
    act(() => {
      store.getState().setSessionId('abc');
    });
    expect(store.getState().sessionId).toBe('abc');
  });

  it('setConfigSettingsでconfigSettingsが更新される', () => {
    act(() => {
      store.getState().setConfigSettings({ default_page_size: 10 });
    });
    expect(store.getState().configSettings).toEqual({ default_page_size: 10 });
  });
}); 