import { create } from 'zustand';
import { useResultsStore } from './useResultsStore';
import { useEditorStore } from './useEditorStore';
import { useParameterStore } from './useParameterStore';
import { useUIStore } from './useUIStore';

// 型定義（他のストアでも使用される共通型）
export type SortConfig = { key: string; direction: 'asc' | 'desc' };
export type FilterConfig = { [columnName: string]: string[] };
export type TableRow = Record<string, string | number | boolean | null>;
export type ConfigSettings = { default_page_size?: number; max_records_for_csv_download?: number };

interface SqlPageState {
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
export const useSqlPageStore = create<SqlPageState>(() => ({
  // SQL実行アクション
  executeSql: async () => {
    const editorStore = useEditorStore.getState();
    const resultsStore = useResultsStore.getState();
    const parameterStore = useParameterStore.getState();
    
    // エディタストアから現在のSQLを取得
    const currentSql = editorStore.sql;
    
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
    
    // 結果ストアを使用してSQL実行
    await resultsStore.executeSql(replacedSql);
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