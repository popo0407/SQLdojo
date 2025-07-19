import { create } from 'zustand';
import { editor, Selection } from 'monaco-editor';
import { apiClient } from '../api/apiClient';
import { useUIStore } from './useUIStore';
import { useSidebarStore } from './useSidebarStore';

interface EditorState {
  // SQLテキスト
  sql: string;
  
  // エディタインスタンス
  editor: editor.IStandaloneCodeEditor | null;
  
  // サイドバーからのテキスト挿入
  sqlToInsert: string;
  
  // セッター
  setSql: (sql: string) => void;
  setEditor: (editor: editor.IStandaloneCodeEditor | null) => void;
  setSqlToInsert: (text: string) => void;
  clearSqlToInsert: () => void;
  
  // アクション
  insertText: (text: string) => void;
  formatSql: () => Promise<void>;
  applySelectionToEditor: () => void;
  
  // 便利なアクション
  clearSql: () => void;
  focusEditor: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // 初期状態
  sql: 'SELECT * FROM ',
  editor: null,
  sqlToInsert: '',
  
  // セッター
  setSql: (sql) => set({ sql }),
  setEditor: (editor) => set({ editor }),
  setSqlToInsert: (sqlToInsert) => set({ sqlToInsert }),
  clearSqlToInsert: () => set({ sqlToInsert: '' }),
  
  // テキスト挿入アクション
  insertText: (text) => {
    const { editor } = get();
    if (!editor) return;
    
    let selection = editor.getSelection();
    if (!selection) {
      const position = editor.getPosition();
      if (position) {
        selection = new Selection(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column,
        );
      }
    }
    
    if (selection) {
      const op = {
        identifier: { major: 1, minor: 1 },
        range: selection,
        text: text,
        forceMoveMarkers: true,
      };
      editor.executeEdits('sidebar-insert', [op]);
    }
    editor.focus();
  },
  
  // SQL整形アクション
  formatSql: async () => {
    const { sql, editor } = get();
    const uiStore = useUIStore.getState();
    
    if (!sql.trim()) {
      alert('SQLが空です');
      return;
    }
    
    try {
      uiStore.startLoading();
      
      const result = await apiClient.formatSQL(sql);
      
      if (result.success && result.formatted_sql) {
        set({ sql: result.formatted_sql });
        if (editor) {
          editor.setValue(result.formatted_sql);
          editor.focus();
        }
      } else {
        throw new Error(result.error_message || 'SQL整形に失敗しました');
      }
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('SQL整形に失敗しました');
      uiStore.setError(errorObj);
      uiStore.setIsError(true);
      throw error;
    } finally {
      uiStore.stopLoading();
    }
  },
  
  // サイドバー選択をエディタに反映
  applySelectionToEditor: () => {
    const sidebarStore = useSidebarStore.getState();
    
    // サイドバーストアを使用して選択をエディタに反映
    sidebarStore.applySelectionToEditor();
  },
  
  // 便利なアクション
  clearSql: () => set({ sql: '' }),
  focusEditor: () => {
    const { editor } = get();
    if (editor) {
      editor.focus();
    }
  },
})); 