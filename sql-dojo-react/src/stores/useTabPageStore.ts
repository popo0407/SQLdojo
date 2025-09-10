import { create } from 'zustand';
import { useTabStore } from './useTabStore';
import { useUIStore } from './useUIStore';
import { useEditorStore } from './useEditorStore';
import { downloadSqlCsv, formatSql } from '../api/sqlService';

// タブごとのエディタインスタンス管理
const tabEditorInstances = new Map<string, {
  getSelectedSQL: () => string;
  hasSelection: () => boolean;
  insertText: (text: string) => void;
}>();

// 警告重複防止フラグ
let isAlertShowing = false;

interface TabPageState {
  // タブエディタインスタンス登録・削除
  registerTabEditor: (tabId: string, editorAPI: {
    getSelectedSQL: () => string;
    hasSelection: () => boolean;
    insertText: (text: string) => void;
  }) => void;
  unregisterTabEditor: (tabId: string) => void;

  // タブ固有の統合アクション
  executeTabSql: (tabId: string) => Promise<void>;
  downloadTabCsv: (tabId: string) => Promise<void>;
  applyTabSort: (tabId: string, key: string) => Promise<void>;
  applyTabFilter: (tabId: string, columnName: string, filterValues: string[]) => Promise<void>;
  loadMoreTabData: (tabId: string) => Promise<void>;
  formatTabSql: (tabId: string) => Promise<void>;
  insertTextToTab: (tabId: string, text: string) => void;
  
  // 部分実行機能
  getTabSelectedSQL: (tabId: string) => string;
  hasTabSelection: (tabId: string) => boolean;
  
  // SQL履歴・サイドバー連携
  applySqlToTabFromHistory: (tabId: string) => void;
  applySqlToTabFromNewTab: () => void; // 新しいタブを作成してSQL履歴を適用
  applySidebarSelectionToTab: (tabId: string) => void;
  monitorSqlToInsert: (tabId: string) => void; // サイドバー挿入監視
  
  // レイアウト制御
  autoMinimizeOnExecution: (tabId: string, isExecuting: boolean) => void;
}

/**
 * タブエディタ専用の統合管理ストア
 * 元エディタのuseSqlPageStoreに相当する機能をタブ対応で提供
 */
export const useTabPageStore = create<TabPageState>((_, get) => ({
  // タブエディタインスタンス登録・削除
  registerTabEditor: (tabId: string, editorAPI: {
    getSelectedSQL: () => string;
    hasSelection: () => boolean;
    insertText: (text: string) => void;
  }) => {
    tabEditorInstances.set(tabId, editorAPI);
  },

  unregisterTabEditor: (tabId: string) => {
    tabEditorInstances.delete(tabId);
  },
  // SQL実行アクション（元エディタと同じ動作：選択範囲を自動判定）
  executeTabSql: async (tabId: string) => {
    const tabStore = useTabStore.getState();
    const tab = tabStore.getTab(tabId);
    if (!tab) return;

    // 実行中チェック
    if (tabStore.hasExecutingTab()) {
      alert(`他のタブでSQLを実行中です。完了後に再試行してください。`);
      return;
    }

    // 選択範囲があるかチェック（元エディタと同じ動作）
    const hasSelection = get().hasTabSelection(tabId);
    
    let finalSql: string;
    
    if (hasSelection) {
      // 選択範囲がある場合：選択されたSQLをそのまま実行（パラメータ置換なし）
      const selectedSql = get().getTabSelectedSQL(tabId);
      if (!selectedSql.trim()) {
        alert('選択範囲にSQLがありません。');
        return;
      }
      finalSql = selectedSql;
    } else {
      // 選択範囲がない場合：全体SQLでバリデーション・パラメータ置換
      const trimmedSql = tab.sql.trim();
      if (!trimmedSql) {
        alert('SQLを入力してください。');
        return;
      }

      // 基本的な構文チェック（元エディタと同じ）
      if (trimmedSql.endsWith('FROM') || trimmedSql.endsWith('WHERE') || trimmedSql.endsWith('AND') || trimmedSql.endsWith('OR')) {
        alert('SQLが不完全です。FROM句の後にテーブル名を指定してください。');
        return;
      }

      const validation = tabStore.validateTabParameters(tabId);
      if (!validation.isValid) {
        alert(`パラメータエラー:\n${validation.errors.join('\n')}`);
        return;
      }
      
      // パラメータ置換したSQLを取得
      finalSql = tabStore.getTabReplacedSql(tabId, tab.sql);
    }

    // バリデーションメッセージクリア（元エディタと同じ）
    const uiStore = useUIStore.getState();
    uiStore.setValidationMessages([]);

    // レイアウト自動制御
    get().autoMinimizeOnExecution(tabId, true);

    try {
      // useTabStore経由でSQL実行
      await tabStore.executeTabSql(tabId, finalSql);
    } finally {
      get().autoMinimizeOnExecution(tabId, false);
    }
  },

  // 選択範囲SQL実行アクション（削除：executeTabSqlに統合）
  // executeTabSelectedSql は不要（executeTabSql内で自動判定）

  // CSVダウンロードアクション
  downloadTabCsv: async (tabId: string) => {
    const tabStore = useTabStore.getState();
    const tab = tabStore.getTab(tabId);
    if (!tab || !tab.sql.trim()) {
      alert('SQLが入力されていません。');
      return;
    }

    try {
      // SQL直接実行でCSVダウンロード
      await downloadSqlCsv(tab.sql);
    } catch (error) {
      console.error('CSVダウンロードエラー:', error);
      alert('CSVダウンロードに失敗しました。');
    }
  },

  // ソート適用アクション
  applyTabSort: async (tabId: string, key: string) => {
    const tabStore = useTabStore.getState();
    const tab = tabStore.getTab(tabId);
    if (!tab || !tab.results.data) return;

    // タブの結果を一時的にグローバルストアに同期（重要！）
    const { useResultsDataStore } = await import('./useResultsDataStore');
    const { useResultsFilterStore } = await import('./useResultsFilterStore');
    
    const dataStore = useResultsDataStore.getState();
    const filterStore = useResultsFilterStore.getState();

    // タブデータをグローバルストアに設定
    dataStore.setAllData(tab.results.data as any[]);
    dataStore.setRawData(tab.results.data as any[]);
    dataStore.setColumns(tab.results.columns);
    
    // ソート適用
    await filterStore.applySort(key);
    
    // ソート後の結果をタブに反映
    const sortedData = dataStore.allData;
    tabStore.updateTabResults(tabId, {
      ...tab.results,
      data: sortedData
    });
  },

  // フィルタ適用アクション
  applyTabFilter: async (tabId: string, columnName: string, filterValues: string[]) => {
    const tabStore = useTabStore.getState();
    const tab = tabStore.getTab(tabId);
    if (!tab || !tab.results.data) return;

    // タブの結果を一時的にグローバルストアに同期（重要！）
    const { useResultsDataStore } = await import('./useResultsDataStore');
    const { useResultsFilterStore } = await import('./useResultsFilterStore');
    
    const dataStore = useResultsDataStore.getState();
    const filterStore = useResultsFilterStore.getState();

    // タブデータをグローバルストアに設定
    dataStore.setAllData(tab.results.data as any[]);
    dataStore.setRawData(tab.results.data as any[]);
    dataStore.setColumns(tab.results.columns);
    
    // フィルタ適用
    await filterStore.applyFilter(columnName, filterValues);
    
    // フィルタ後の結果をタブに反映
    const filteredData = dataStore.allData;
    tabStore.updateTabResults(tabId, {
      ...tab.results,
      data: filteredData
    });
  },

  // 追加データ読み込みアクション
  loadMoreTabData: async (tabId: string) => {
    const tabStore = useTabStore.getState();
    const tab = tabStore.getTab(tabId);
    if (!tab || !tab.sessionState.sessionId) return;

    // タブ固有のセッションIDでデータ追加読み込み
    const { useResultsPaginationStore } = await import('./useResultsPaginationStore');
    const paginationStore = useResultsPaginationStore.getState();
    
    // セッションIDを設定してから読み込み
    const { useResultsSessionStore } = await import('./useResultsSessionStore');
    const sessionStore = useResultsSessionStore.getState();
    sessionStore.setSessionId(tab.sessionState.sessionId);
    
    await paginationStore.loadMoreData();
    
    // 読み込み後の結果をタブに反映
    const { useResultsDataStore } = await import('./useResultsDataStore');
    const dataStore = useResultsDataStore.getState();
    
    tabStore.updateTabResults(tabId, {
      ...tab.results,
      data: dataStore.allData,
      totalCount: dataStore.rowCount,
      hasMore: paginationStore.hasMoreData
    });
  },

  // SQL整形アクション
  formatTabSql: async (tabId: string) => {
    const tabStore = useTabStore.getState();
    const tab = tabStore.getTab(tabId);
    if (!tab || !tab.sql.trim()) {
      alert('データがありません');
      return;
    }

    const uiStore = useUIStore.getState();
    
    try {
      uiStore.startLoading();
      
      // API経由で直接SQL整形（EditorStoreを使わない）
      const formattedSql = await formatSql({ sql: tab.sql });
      
      // 整形されたSQLをタブに反映
      tabStore.updateTabSql(tabId, formattedSql);
      
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'SQL整形に失敗しました';
      uiStore.setError(msg);
      throw error;
    } finally {
      uiStore.stopLoading();
    }
  },

  // テキスト挿入アクション
  insertTextToTab: (tabId: string, text: string) => {
    const editorAPI = tabEditorInstances.get(tabId);
    editorAPI?.insertText(text);
  },

  // 選択範囲SQL取得
  getTabSelectedSQL: (tabId: string) => {
    const editorAPI = tabEditorInstances.get(tabId);
    return editorAPI?.getSelectedSQL() || '';
  },

  // 選択状態チェック
  hasTabSelection: (tabId: string) => {
    const editorAPI = tabEditorInstances.get(tabId);
    return editorAPI?.hasSelection() || false;
  },

  // SQL履歴からのコピー（新しいタブを作成して適用）
  applySqlToTabFromNewTab: () => {
    const sqlToCopy = localStorage.getItem('sqlToCopy');
    if (!sqlToCopy) return;

    const tabStore = useTabStore.getState();
    
    // タブ数上限チェック（canCreateNewTabで確認）
    if (!tabStore.canCreateNewTab()) {
      // 上限時は一度だけ警告を出してlocalStorageをクリア
      localStorage.removeItem('sqlToCopy');
      
      // 警告の重複防止
      if (!isAlertShowing) {
        isAlertShowing = true;
        alert('タブは最大5個まで開けます。既存のタブを閉じてから新しいタブを作成してください。');
        setTimeout(() => {
          isAlertShowing = false;
        }, 100); // 短時間後にフラグをリセット
      }
      return;
    }

    // 新しいタブを作成
    const newTabId = tabStore.createTab();
    
    // 新しいタブにSQLを設定
    tabStore.updateTabSql(newTabId, sqlToCopy);
    
    // 使用後は削除
    localStorage.removeItem('sqlToCopy');
  },

  // SQL履歴からのコピー（既存タブ用・後方互換性）
  applySqlToTabFromHistory: (tabId: string) => {
    const sqlToCopy = localStorage.getItem('sqlToCopy');
    if (sqlToCopy) {
      const tabStore = useTabStore.getState();
      tabStore.updateTabSql(tabId, sqlToCopy);
      localStorage.removeItem('sqlToCopy'); // 使用後は削除
    }
  },

  // サイドバーからのSQL挿入監視（元エディタのuseEditorOperations相当）
  monitorSqlToInsert: (tabId: string) => {
    const editorStore = useEditorStore.getState();
    const sqlToInsert = editorStore.sqlToInsert;
    
    if (sqlToInsert) {
      // タブのエディタにテキストを挿入
      get().insertTextToTab(tabId, sqlToInsert);
      
      // 挿入後はクリア
      editorStore.clearSqlToInsert();
    }
  },

  // サイドバー選択の適用
  applySidebarSelectionToTab: (tabId: string) => {
    const editorAPI = tabEditorInstances.get(tabId);
    if (!editorAPI) return;
    
    // サイドバーから選択されたテキストを取得
    const selectedText = localStorage.getItem('selectedSidebarText') || '';
    if (selectedText) {
      editorAPI.insertText(selectedText);
      localStorage.removeItem('selectedSidebarText'); // 使用後削除
    }
  },

  // レイアウト自動制御
  autoMinimizeOnExecution: (tabId: string, isExecuting: boolean) => {
    const tabStore = useTabStore.getState();
    if (isExecuting) {
      // SQL実行時にエディタを自動最小化
      tabStore.updateTabLayoutState(tabId, { isEditorMaximized: false });
    }
  },
}));
