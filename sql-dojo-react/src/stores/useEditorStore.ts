import { create } from 'zustand';
import { editor, Selection } from 'monaco-editor';
import { formatSql } from '../api/sqlService';
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
  
  // 部分実行機能
  getSelectedSQL: () => string;
  hasSelection: () => boolean;
  
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
  setSql: (sql) => {
    set({ sql });
  },
  setEditor: (editor) => {
    set({ editor });
  },
  setSqlToInsert: (sqlToInsert) => set({ sqlToInsert }),
  clearSqlToInsert: () => set({ sqlToInsert: '' }),
  
  // 統一されたテキスト挿入アクション
  insertText: (text) => {
    const { editor } = get();
    if (!editor) {
      console.warn('Editor instance is not available');
      return;
    }
    
    try {
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
        editor.focus();
      } else {
        console.warn('No valid selection or position found');
      }
    } catch (error) {
      console.error('Error inserting text:', error);
      const errorMessage = error instanceof Error ? error.message : 'テキスト挿入に失敗しました';
      alert(errorMessage);
    }
  },
  
  // SQL整形アクション
  formatSql: async () => {
    const { sql, editor } = get();
    const uiStore = useUIStore.getState();
    
    if (!sql.trim()) {
      alert('データがありません');
      return;
    }
    
    try {
      uiStore.startLoading();
      
      const formattedSql = await formatSql({ sql });
      
      set({ sql: formattedSql });
      if (editor) {
        editor.setValue(formattedSql);
        editor.focus();
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'SQL整形に失敗しました';
      uiStore.setError(msg);
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
  
  // 部分実行機能
  getSelectedSQL: () => {
    const { editor } = get();
    if (!editor) return '';

    const selection = editor.getSelection();
    if (!selection || selection.isEmpty()) {
      // 選択範囲がない場合は全SQLを返す
      return editor.getValue();
    }

    const model = editor.getModel();
    if (!model) return '';

    const text = model.getValueInRange(selection);
    return text;
  },

  hasSelection: () => {
    const { editor } = get();
    if (!editor) return false;

    const selection = editor.getSelection();
    return selection ? !selection.isEmpty() : false;
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