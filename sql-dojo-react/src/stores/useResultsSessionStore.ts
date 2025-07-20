import { create } from 'zustand';
import type { 
  ResultsSessionState, 
  ResultsSessionActions 
} from '../types/results';

interface SessionStoreState extends ResultsSessionState, ResultsSessionActions {}

export const useResultsSessionStore = create<SessionStoreState>((set) => ({
  // 初期状態
  sessionId: null,
  configSettings: null,
  
  // セッター
  setSessionId: (sessionId) => set({ sessionId }),
  setConfigSettings: (configSettings) => set({ configSettings }),
})); 