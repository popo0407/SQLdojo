import { create } from 'zustand';
import type { 
  ResultsSessionState, 
  ResultsSessionActions 
} from '../types/results';

interface SessionStoreState extends ResultsSessionState, ResultsSessionActions {}

export const createResultsSessionStore = () => create<SessionStoreState>((set) => ({
  // 初期状態
  sessionId: null,
  configSettings: null,
  exportFilename: undefined,
  
  // セッター
  setSessionId: (sessionId) => set({ sessionId }),
  setConfigSettings: (configSettings) => set({ configSettings }),
  setExportFilename: (exportFilename: string) => set({ exportFilename }),
}));

export const useResultsSessionStore = createResultsSessionStore(); 