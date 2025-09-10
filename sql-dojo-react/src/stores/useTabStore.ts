import { create } from 'zustand';
import type { Placeholder, ParameterType } from '../types/parameters';
import { parsePlaceholders, replacePlaceholders } from '../features/parameters/ParameterParser';

// タブ進捗ポーリング管理
let tabProgressPollingInterval: NodeJS.Timeout | null = null;

// タブ用進捗ポーリング開始
const startTabProgressPolling = async (sessionId: string, progressStore: { updateProgress: Function; hideProgress: Function }) => {
  const { getSessionStatus } = await import('../api/sqlService');
  
  const pollProgress = async () => {
    try {
      const statusResponse = await getSessionStatus(sessionId);
      
      progressStore.updateProgress({
        currentCount: statusResponse.processed_count,
        progressPercentage: statusResponse.progress_percentage,
        message: statusResponse.message || 'データを取得中...'
      });

      // ストリーミングが完了した場合はポーリング停止
      if (statusResponse.status === 'completed' || statusResponse.status === 'error' || statusResponse.status === 'cancelled') {
        if (tabProgressPollingInterval) {
          clearInterval(tabProgressPollingInterval);
          tabProgressPollingInterval = null;
        }
        // 完了表示を1秒間保持してから非表示
        setTimeout(() => {
          progressStore.hideProgress();
        }, 1000);
      }
    } catch {
      // エラーが発生した場合もポーリングを停止
      if (tabProgressPollingInterval) {
        clearInterval(tabProgressPollingInterval);
        tabProgressPollingInterval = null;
      }
      progressStore.hideProgress();
    }
  };

  // 既存のポーリングを停止
  if (tabProgressPollingInterval) {
    clearInterval(tabProgressPollingInterval);
  }

  // 初回実行
  pollProgress();
  
  // 100ms間隔でポーリング開始
  tabProgressPollingInterval = setInterval(pollProgress, 100);
};

// タブの状態インターface
export interface TabState {
  id: string;
  name: string;
  sql: string;
  results: {
    data: unknown[] | null;
    columns: string[];
    totalCount: number;
    executionTime: number;
    hasMore: boolean;
    error: string | null;
    lastExecutedSql: string | null;
    executedAt: Date | null;
  };
  isExecuting: boolean;
  hasUnsavedChanges: boolean;
  editorState?: {
    position?: { lineNumber: number; column: number };
    selection?: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
    scrollTop?: number;
    scrollLeft?: number;
    foldingState?: unknown; // Monaco Editor の folding state
    viewState?: unknown; // Monaco Editor の view state 全体
  };
  layoutState: {
    editorHeight: number;
    resultsHeight: number;
    isEditorMaximized: boolean;
  };
  // タブ固有のパラメータ状態
  parameterState: {
    values: { [key: string]: string | string[] };
    placeholders: {
      [key: string]: {
        type: ParameterType;
        options?: string[];
      }
    };
    currentPlaceholders: Placeholder[];
  };
  // タブ固有のセッション状態
  sessionState: {
    sessionId: string | null;
    configSettings: { default_page_size?: number; max_records_for_csv_download?: number } | null;
  };
}

interface TabStoreState {
  // タブ管理
  tabs: TabState[];
  activeTabId: string | null;
  nextTabNumber: number;
  
  // アクション
  createTab: () => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabName: (tabId: string, name: string) => void;
  updateTabSql: (tabId: string, sql: string) => void;
  updateTabResults: (tabId: string, resultsData: {
    data: unknown[] | null;
    columns?: string[];
    totalCount?: number;
    executionTime?: number;
    hasMore?: boolean;
    error?: string | null;
    lastExecutedSql?: string | null;
  }) => void;
  setTabExecuting: (tabId: string, isExecuting: boolean) => void;
  updateTabEditorState: (tabId: string, editorState: TabState['editorState']) => void;
  updateTabLayoutState: (tabId: string, layoutState: Partial<TabState['layoutState']>) => void;
  
  // パラメータ関連アクション
  updateTabParameters: (tabId: string, sql: string) => void;
  setTabParameterValue: (tabId: string, key: string, value: string | string[]) => void;
  clearTabParameterValues: (tabId: string) => void;
  getTabReplacedSql: (tabId: string, sql: string) => string;
  validateTabParameters: (tabId: string) => { isValid: boolean; errors: string[] };
  
  // セッション関連アクション
  setTabSessionId: (tabId: string, sessionId: string | null) => void;
  setTabConfigSettings: (tabId: string, settings: { default_page_size?: number; max_records_for_csv_download?: number } | null) => void;
  
  // SQL実行アクション
  executeTabSql: (tabId: string, sql: string) => Promise<void>;
  
  // 便利なゲッター
  getActiveTab: () => TabState | null;
  getTab: (tabId: string) => TabState | null;
  canCreateNewTab: () => boolean;
  hasExecutingTab: () => boolean;
  getExecutingTabId: () => string | null;
}

export const useTabStore = create<TabStoreState>((set, get) => ({
  // 初期状態
  tabs: [],
  activeTabId: null,
  nextTabNumber: 1,
  
  // タブ作成
  createTab: () => {
    const { tabs, nextTabNumber, canCreateNewTab } = get();
    
    if (!canCreateNewTab()) {
      console.warn('タブの最大数（5個）に達しています');
      return '';
    }
    
    const newTabId = `tab-${Date.now()}`;
    const newTab: TabState = {
      id: newTabId,
      name: `SQL${nextTabNumber}`,
      sql: 'SELECT * FROM ',
      results: {
        data: null,
        columns: [],
        totalCount: 0,
        executionTime: 0,
        hasMore: false,
        error: null,
        lastExecutedSql: null,
        executedAt: null,
      },
      isExecuting: false,
      hasUnsavedChanges: false,
      editorState: undefined,
      layoutState: {
        editorHeight: 50,
        resultsHeight: 50,
        isEditorMaximized: false,
      },
      parameterState: {
        values: {},
        placeholders: {},
        currentPlaceholders: [],
      },
      sessionState: {
        sessionId: null,
        configSettings: null,
      },
    };
    
    set({
      tabs: [...tabs, newTab],
      activeTabId: newTabId,
      nextTabNumber: nextTabNumber + 1,
    });
    
    return newTabId;
  },
  
  // タブ削除
  closeTab: (tabId: string) => {
    const { tabs, activeTabId } = get();
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    
    let newActiveTabId = activeTabId;
    if (activeTabId === tabId) {
      // アクティブタブが削除される場合、別のタブをアクティブにする
      const currentIndex = tabs.findIndex(tab => tab.id === tabId);
      if (newTabs.length > 0) {
        const nextIndex = Math.min(currentIndex, newTabs.length - 1);
        newActiveTabId = newTabs[nextIndex].id;
      } else {
        newActiveTabId = null;
      }
    }
    
    set({
      tabs: newTabs,
      activeTabId: newActiveTabId,
    });
  },
  
  // アクティブタブ設定
  setActiveTab: (tabId: string) => {
    const { tabs } = get();
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      set({ activeTabId: tabId });
    }
  },
  
  // タブ名更新
  updateTabName: (tabId: string, name: string) => {
    const { tabs } = get();
    const updatedTabs = tabs.map(tab =>
      tab.id === tabId ? { ...tab, name: name.trim() || tab.name } : tab
    );
    set({ tabs: updatedTabs });
  },
  
  // SQL更新
  updateTabSql: (tabId: string, sql: string) => {
    const { tabs } = get();
    const updatedTabs = tabs.map(tab =>
      tab.id === tabId 
        ? { ...tab, sql, hasUnsavedChanges: sql !== 'SELECT * FROM ' } 
        : tab
    );
    set({ tabs: updatedTabs });
  },
  
  // 結果更新
  updateTabResults: (tabId: string, resultsData: {
    data: unknown[] | null;
    columns?: string[];
    totalCount?: number;
    executionTime?: number;
    hasMore?: boolean;
    error?: string | null;
    lastExecutedSql?: string | null;
  }) => {
    const { tabs } = get();
    const updatedTabs = tabs.map(tab =>
      tab.id === tabId 
        ? { 
            ...tab, 
            results: {
              data: resultsData.data,
              columns: resultsData.columns ?? [],
              totalCount: resultsData.totalCount ?? 0,
              executionTime: resultsData.executionTime ?? 0,
              hasMore: resultsData.hasMore ?? false,
              error: resultsData.error ?? null,
              lastExecutedSql: resultsData.lastExecutedSql ?? null,
              executedAt: new Date(),
            }
          } 
        : tab
    );
    set({ tabs: updatedTabs });
  },
  
  // 実行状態更新
  setTabExecuting: (tabId: string, isExecuting: boolean) => {
    const { tabs } = get();
    const updatedTabs = tabs.map(tab =>
      tab.id === tabId ? { ...tab, isExecuting } : tab
    );
    set({ tabs: updatedTabs });
  },
  
  // エディタ状態更新
  updateTabEditorState: (tabId: string, editorState: TabState['editorState']) => {
    const { tabs } = get();
    const updatedTabs = tabs.map(tab =>
      tab.id === tabId ? { ...tab, editorState } : tab
    );
    set({ tabs: updatedTabs });
  },
  
  // レイアウト状態更新
  updateTabLayoutState: (tabId: string, layoutState: Partial<TabState['layoutState']>) => {
    const { tabs } = get();
    const updatedTabs = tabs.map(tab =>
      tab.id === tabId 
        ? { ...tab, layoutState: { ...tab.layoutState, ...layoutState } }
        : tab
    );
    set({ tabs: updatedTabs });
  },
  
  // ゲッター関数
  getActiveTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find(tab => tab.id === activeTabId) || null;
  },
  
  getTab: (tabId: string) => {
    const { tabs } = get();
    return tabs.find(tab => tab.id === tabId) || null;
  },
  
  canCreateNewTab: () => {
    const { tabs } = get();
    return tabs.length < 5; // 最大5タブ
  },
  
  hasExecutingTab: () => {
    const { tabs } = get();
    return tabs.some(tab => tab.isExecuting);
  },
  
  getExecutingTabId: () => {
    const { tabs } = get();
    const executingTab = tabs.find(tab => tab.isExecuting);
    return executingTab?.id || null;
  },

  // パラメータ関連アクション
  updateTabParameters: (tabId: string, sql: string) => {
    const { tabs } = get();
    
    // SQLからプレースホルダーを解析
    const placeholders = parsePlaceholders(sql);
    
    // プレースホルダー情報をストアに保存
    const placeholderInfo: { [key: string]: { type: ParameterType; options?: string[] } } = {};
    placeholders.forEach(placeholder => {
      placeholderInfo[placeholder.displayName] = {
        type: placeholder.type,
        options: placeholder.choices
      };
    });
    
    const updatedTabs = tabs.map(tab =>
      tab.id === tabId 
        ? { 
            ...tab, 
            parameterState: {
              ...tab.parameterState,
              currentPlaceholders: placeholders,
              placeholders: placeholderInfo,
              // 既存のvaluesは保持する
              values: tab.parameterState.values
            }
          }
        : tab
    );
    set({ tabs: updatedTabs });
  },

  setTabParameterValue: (tabId: string, key: string, value: string | string[]) => {
    const { tabs } = get();
    const updatedTabs = tabs.map(tab =>
      tab.id === tabId 
        ? { 
            ...tab, 
            parameterState: {
              ...tab.parameterState,
              values: {
                ...tab.parameterState.values,
                [key]: value
              }
            }
          }
        : tab
    );
    set({ tabs: updatedTabs });
  },

  clearTabParameterValues: (tabId: string) => {
    const { tabs } = get();
    const updatedTabs = tabs.map(tab =>
      tab.id === tabId 
        ? { 
            ...tab, 
            parameterState: {
              ...tab.parameterState,
              values: {}
            }
          }
        : tab
    );
    set({ tabs: updatedTabs });
  },

  getTabReplacedSql: (tabId: string, sql: string) => {
    const { tabs } = get();
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return sql;
    
    return replacePlaceholders(sql, tab.parameterState.values);
  },

  validateTabParameters: (tabId: string) => {
    const { tabs } = get();
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return { isValid: true, errors: [] };
    
    const { values, currentPlaceholders } = tab.parameterState;
    const errors: string[] = [];
    
    currentPlaceholders.forEach(placeholder => {
      const value = values[placeholder.displayName];
      
      // 値が未設定の場合
      if (value === undefined || value === null) {
        errors.push(`「${placeholder.displayName}」が入力されていません`);
        return;
      }
      
      // 文字列の場合（text, select）
      if (typeof value === 'string') {
        if (value.trim() === '') {
          errors.push(`「${placeholder.displayName}」が入力されていません`);
          return;
        }
        
        // select型の場合、選択肢が選択されているかチェック
        if (placeholder.type === 'select' && placeholder.choices) {
          if (!placeholder.choices.includes(value)) {
            errors.push(`「${placeholder.displayName}」で有効な選択肢を選択してください`);
          }
        }
      }
      
      // 配列の場合（multi-text, multi-text-quoted）
      if (Array.isArray(value)) {
        if (value.length === 0) {
          errors.push(`「${placeholder.displayName}」が入力されていません`);
          return;
        }
        
        // 空の文字列が含まれていないかチェック
        const hasEmptyValues = value.some(item => item.trim() === '');
        if (hasEmptyValues) {
          errors.push(`「${placeholder.displayName}」に空の項目が含まれています`);
        }
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // セッション関連アクション
  setTabSessionId: (tabId: string, sessionId: string | null) => {
    const { tabs } = get();
    const updatedTabs = tabs.map(tab =>
      tab.id === tabId 
        ? { 
            ...tab, 
            sessionState: {
              ...tab.sessionState,
              sessionId
            }
          }
        : tab
    );
    set({ tabs: updatedTabs });
  },

  setTabConfigSettings: (tabId: string, settings: { default_page_size?: number; max_records_for_csv_download?: number } | null) => {
    const { tabs } = get();
    const updatedTabs = tabs.map(tab =>
      tab.id === tabId 
        ? { 
            ...tab, 
            sessionState: {
              ...tab.sessionState,
              configSettings: settings
            }
          }
        : tab
    );
    set({ tabs: updatedTabs });
  },

  // タブ用のSQL実行
  executeTabSql: async (tabId: string, sql: string) => {
    const { tabs, updateTabResults, setTabSessionId, setTabExecuting } = get();
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // 進捗ストアとUIストアを取得
    const { useProgressStore } = await import('./useProgressStore');
    const { useUIStore } = await import('./useUIStore');
    const progressStore = useProgressStore.getState();
    const uiStore = useUIStore.getState();

    // 実行状態を設定
    setTabExecuting(tabId, true);
    uiStore.startLoading(); // UIストア連携追加
    updateTabResults(tabId, {
      error: null,
      data: null,
      columns: [],
      totalCount: 0,
      executionTime: 0,
      lastExecutedSql: sql
    });

    // 進捗リセット
    progressStore.resetProgress();

    try {
      // 既存のAPIサービスを使用
      const { executeSqlOnCache, readSqlCache } = await import('../api/sqlService');
      
      // SQL実行
      const execResult = await executeSqlOnCache({ sql });
      
      if (!execResult.success) {
        // エラーメッセージを適切に処理
        const errorMessage = execResult.error_message || execResult.message || 'SQL実行に失敗しました';
        updateTabResults(tabId, {
          error: errorMessage,
          data: null,
          columns: [],
          totalCount: 0,
          executionTime: 0,
          lastExecutedSql: sql
        });
        uiStore.setError(errorMessage); // UIストアにエラー設定
        uiStore.stopLoading();
        progressStore.hideProgress();
        return;
      }

      // 進捗データが含まれている場合は進捗表示を開始
      if (execResult.total_count && execResult.total_count > 0) {
        progressStore.showProgress({
          totalCount: execResult.total_count,
          currentCount: execResult.current_count || 0,
          progressPercentage: execResult.progress_percentage || 0,
          message: 'データを取得中...'
        });

        // セッションIDがある場合は進捗ポーリングを開始
        if (execResult.session_id) {
          const sessionId = execResult.session_id;
          setTimeout(() => {
            startTabProgressPolling(sessionId, progressStore);
          }, 200);
        }
      }

      // セッションIDを設定（グローバルセッションストアも更新）
      if (execResult.session_id) {
        setTabSessionId(tabId, execResult.session_id);
        
        // グローバルセッションストアも更新（元エディタと同等性確保）
        const { useResultsSessionStore } = await import('./useResultsSessionStore');
        const sessionStore = useResultsSessionStore.getState();
        sessionStore.setSessionId(execResult.session_id);
      } else {
        updateTabResults(tabId, {
          error: 'session_idが返されませんでした',
          data: null,
          columns: [],
          totalCount: 0,
          executionTime: 0,
          lastExecutedSql: sql
        });
        uiStore.setError('session_idが返されませんでした');
        uiStore.stopLoading();
        progressStore.hideProgress();
        return;
      }

      // 初回データ取得
      if (execResult.session_id) {
        // 設定ページサイズを取得（デフォルト100）
        const pageSize = tab.sessionState.configSettings?.default_page_size || 100;
        
        const readResult = await readSqlCache({
          session_id: execResult.session_id,
          page: 1,
          page_size: pageSize
        });

        if (readResult.success && readResult.data && readResult.columns) {
          // データを変換
          const newData = (readResult.data as unknown as unknown[][]).map((rowArr: unknown[]) => 
            Object.fromEntries((readResult.columns || []).map((col: string, i: number) => [col, rowArr[i]]))
          );

          // 型安全なデータ変換
          const typedData = newData.map(row => 
            Object.fromEntries(
              Object.entries(row).map(([key, value]) => [
                key, 
                value === null || value === undefined ? null : 
                typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : String(value)
              ])
            )
          ) as { [key: string]: string | number | boolean | null }[];

          // データストア/フィルタストア/ページネーションストアも更新
          const { useResultsDataStore } = await import('./useResultsDataStore');
          const { useResultsFilterStore } = await import('./useResultsFilterStore');
          const { useResultsPaginationStore } = await import('./useResultsPaginationStore');
          
          const dataStore = useResultsDataStore.getState();
          const filterStore = useResultsFilterStore.getState();
          const paginationStore = useResultsPaginationStore.getState();

          // 全ストアを同期更新
          dataStore.setAllData(typedData);
          dataStore.setRawData(typedData);
          dataStore.setColumns(readResult.columns);
          dataStore.setRowCount(readResult.total_count || newData.length);
          dataStore.setExecTime(readResult.execution_time || 0);

          paginationStore.setCurrentPage(1);
          paginationStore.setHasMoreData(newData.length < (readResult.total_count || newData.length));

          filterStore.setSortConfig(null);
          filterStore.setFilters({});

          // タブ結果を設定
          updateTabResults(tabId, {
            error: null,
            data: newData,
            columns: readResult.columns,
            totalCount: readResult.total_count || newData.length,
            executionTime: readResult.execution_time || 0,
            lastExecutedSql: sql
          });

          // UI状態をクリア
          uiStore.clearError();
          uiStore.stopLoading();
        } else {
          updateTabResults(tabId, {
            error: readResult.message || 'データ取得に失敗しました',
            data: null,
            columns: [],
            totalCount: 0,
            executionTime: 0,
            lastExecutedSql: sql
          });
          uiStore.setError(readResult.message || 'データ取得に失敗しました');
          uiStore.stopLoading();
          progressStore.hideProgress();
        }
      } else {
        updateTabResults(tabId, {
          error: 'session_idが返されませんでした',
          data: null,
          columns: [],
          totalCount: 0,
          executionTime: 0,
          lastExecutedSql: sql
        });
        uiStore.setError('session_idが返されませんでした');
        uiStore.stopLoading();
        progressStore.hideProgress();
      }

      // 完了時は進捗を1秒後に非表示
      setTimeout(() => {
        progressStore.hideProgress();
      }, 1000);

    } catch (error) {
      updateTabResults(tabId, {
        error: error instanceof Error ? error.message : '不明なエラーが発生しました',
        data: null,
        columns: [],
        totalCount: 0,
        executionTime: 0,
        lastExecutedSql: sql
      });
      uiStore.setError(error instanceof Error ? error.message : '不明なエラーが発生しました');
      uiStore.stopLoading();
      progressStore.hideProgress();
    } finally {
      setTabExecuting(tabId, false);
    }
  },
}));
