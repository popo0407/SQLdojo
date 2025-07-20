import { create } from 'zustand';

interface LayoutState {
  // エディタの最大化状態
  isEditorMaximized: boolean;
  
  // パネルのサイズ状態（永続化しない）
  sidebarWidth: number;
  editorHeight: number;
  resultsHeight: number;
  
  // アクション
  setEditorMaximized: (maximized: boolean) => void;
  toggleEditorMaximized: () => void;
  setSidebarWidth: (width: number) => void;
  setEditorHeight: (height: number) => void;
  setResultsHeight: (height: number) => void;
  
  // 便利なアクション
  resetLayout: () => void;
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  // 初期状態
  isEditorMaximized: false,
  sidebarWidth: 300, // デフォルトサイドバー幅
  editorHeight: 50, // デフォルトエディタ高さ（パーセンテージ）
  resultsHeight: 50, // デフォルト結果エリア高さ（パーセンテージ）
  
  // 基本セッター
  setEditorMaximized: (isEditorMaximized) => {
    set({ isEditorMaximized });
    // 最大化時は結果エリアの高さを0に、最小化時はエディタ95%、結果エリア5%に設定
    if (isEditorMaximized) {
      set({ editorHeight: 100, resultsHeight: 0 });
    } else {
      set({ editorHeight: 95, resultsHeight: 5 });
    }
  },
  toggleEditorMaximized: () => {
    const { isEditorMaximized } = get();
    const newMaximized = !isEditorMaximized;
    set({ isEditorMaximized: newMaximized });
    // 最大化時は結果エリアの高さを0に、最小化時はエディタ95%、結果エリア5%に設定
    if (newMaximized) {
      set({ editorHeight: 100, resultsHeight: 0 });
    } else {
      set({ editorHeight: 95, resultsHeight: 5 });
    }
  },
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setEditorHeight: (editorHeight) => set({ editorHeight }),
  setResultsHeight: (resultsHeight) => set({ resultsHeight }),
  
  // 便利なアクション
  resetLayout: () => set({
    isEditorMaximized: false,
    sidebarWidth: 300,
    editorHeight: 50,
    resultsHeight: 50
  }),
})); 