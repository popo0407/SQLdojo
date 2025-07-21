import { create } from 'zustand';
import { useResultsStore } from './useResultsStore';
import { useEditorStore } from './useEditorStore';
import { useParameterStore } from './useParameterStore';
import { useUIStore } from './useUIStore';

interface SqlPageState {
  // 状態
  isPending: boolean;
  
  // SQLページ全体の統合アクション
  executeSql: () => Promise<void>;
  downloadCsv: () => Promise<void>;
  applySort: (key: string) => Promise<void>;
  applyFilter: (columnName: string, filterValues: string[]) => Promise<void>;
  loadMoreData: () => Promise<void>;
  formatSql: () => Promise<void>;
}

/**
 * SQLページ全体の状態管理ストア
 * エディタと結果表示の連携を管理
 */
export const useSqlPageStore = create<SqlPageState>((set) => ({
  // 初期状態
  isPending: false,
  
  // SQL実行アクション
  executeSql: async () => {
    const editorStore = useEditorStore.getState();
    const resultsStore = useResultsStore.getState();
    const parameterStore = useParameterStore.getState();
    
    // 選択範囲があるかチェック
    const hasSelection = editorStore.hasSelection();
    
    // 選択範囲がある場合は選択されたSQLを取得、ない場合は全SQLを取得
    const currentSql = hasSelection ? editorStore.getSelectedSQL() : editorStore.sql;
    
    // SQLバリデーション
    const trimmedSql = currentSql.trim();
    if (!trimmedSql) {
      alert('SQLを入力してください。');
      return;
    }
    
    // 基本的な構文チェック
    if (trimmedSql.endsWith('FROM') || trimmedSql.endsWith('WHERE') || trimmedSql.endsWith('AND') || trimmedSql.endsWith('OR')) {
      alert('SQLが不完全です。FROM句の後にテーブル名を指定してください。');
      return;
    }
    
    // 選択範囲がある場合はユーザーに通知
    if (hasSelection) {
      // 選択範囲のSQLを実行
      // 必要に応じてユーザーに確認を求めることも可能
    }
    
    // パラメータ検証
    const validation = parameterStore.validateParameters();
    if (!validation.isValid) {
      // エラーメッセージをUIストアに表示
      const errorMessage = validation.errors.join('\n');
      const uiStore = useUIStore.getState();
      uiStore.setError(new Error(errorMessage));
      uiStore.setIsError(true);
      return;
    }
    
    // パラメータ置換を実行
    const replacedSql = parameterStore.getReplacedSql(trimmedSql);
    
    // 実行状態を設定
    set({ isPending: true });
    
    try {
      // 結果ストアを使用してSQL実行
      await resultsStore.executeSql(replacedSql);
    } finally {
      // 実行状態をリセット
      set({ isPending: false });
    }
  },
  
  // CSVダウンロードアクション
  downloadCsv: async () => {
    const resultsStore = useResultsStore.getState();
    
    // 結果ストアを使用してCSVダウンロード
    await resultsStore.downloadCsv();
  },
  
  // ソート適用アクション
  applySort: async (key: string) => {
    const resultsStore = useResultsStore.getState();
    
    // 結果ストアを使用してソート
    await resultsStore.applySort(key);
  },
  
  // フィルタ適用アクション
  applyFilter: async (columnName: string, filterValues: string[]) => {
    const resultsStore = useResultsStore.getState();
    
    // 結果ストアを使用してフィルタ
    await resultsStore.applyFilter(columnName, filterValues);
  },
  
  // 追加データ読み込みアクション
  loadMoreData: async () => {
    const resultsStore = useResultsStore.getState();
    
    // 結果ストアを使用してデータ読み込み
    await resultsStore.loadMoreData();
  },
  
  // SQL整形アクション
  formatSql: async () => {
    const editorStore = useEditorStore.getState();
    
    // エディタストアを使用してSQL整形
    await editorStore.formatSql();
  },
})); 