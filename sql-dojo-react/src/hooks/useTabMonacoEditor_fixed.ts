import { useCallback, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { useTabStore } from '../stores/useTabStore';
import { useAuthContext } from '../context/AuthContext';

/**
 * タブ専用のMonaco Editorフック（テスト版）
 */
export const useTabMonacoEditor = (tabId: string) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const disposablesRef = useRef<monaco.IDisposable[]>([]);
  
  // ストアとコンテキスト
  const { getTab, updateTabSql } = useTabStore();
  const { user } = useAuthContext();
  const tab = getTab(tabId);

  // 現在のユーザーロールを取得
  const getCurrentUserRole = useCallback(() => {
    return user?.role || null;
  }, [user?.role]);

  // エディタインスタンスを取得
  const getEditorInstance = useCallback(() => {
    return editorRef.current;
  }, []);

  // 選択されたSQLを取得
  const getSelectedSQL = useCallback(() => {
    if (!editorRef.current) return '';
    
    const selection = editorRef.current.getSelection();
    if (!selection || selection.isEmpty()) {
      return editorRef.current.getValue();
    }
    
    return editorRef.current.getModel()?.getValueInRange(selection) || '';
  }, []);

  // 選択状態をチェック
  const hasSelection = useCallback(() => {
    if (!editorRef.current) return false;
    
    const selection = editorRef.current.getSelection();
    return selection ? !selection.isEmpty() : false;
  }, []);

  // テキスト挿入
  const insertText = useCallback((text: string) => {
    if (!editorRef.current) return;
    
    const selection = editorRef.current.getSelection();
    if (selection) {
      editorRef.current.executeEdits('', [{
        range: selection,
        text: text
      }]);
    }
  }, []);

  // エディタマウント時の処理
  const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    console.log('タブエディタ: handleEditorDidMount called for tabId:', tabId);
    editorRef.current = editor;
    
    console.log('タブエディタ: 補完プロバイダーを登録します');
    
    // 既存のdisposableをクリア
    if (disposablesRef.current) {
      disposablesRef.current.forEach(d => d.dispose());
    }
    disposablesRef.current = [];
    
    // タブエディタ専用の補完プロバイダーを登録
    const completionDisposable = monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: ['.', ' ', '\n', '\t'],
      
      provideCompletionItems: async (model, position, context, token) => {
        console.log('タブエディタ: 補完プロバイダーが呼び出されました', { 
          tabId, 
          position: `${position.lineNumber}:${position.column}`,
          modelId: model.id,
          editorModelId: editor.getModel()?.id
        });
        
        // このエディタのモデルかチェック
        if (model !== editor.getModel()) {
          console.log('タブエディタ: 他のエディタからの呼び出しのため空の候補を返します');
          return { suggestions: [] };
        }
        
        // テスト候補を返して補完プロバイダーが機能しているか確認
        console.log('タブエディタ: テスト補完候補を返します');
        return {
          suggestions: [
            {
              label: 'TAB_EDITOR_TEST',
              kind: monaco.languages.CompletionItemKind.Text,
              insertText: 'TAB_EDITOR_TEST',
              detail: 'タブエディタの補完プロバイダーのテスト',
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
              }
            },
            {
              label: 'TAB_SELECT_TEST',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'SELECT * FROM ',
              detail: 'テスト用SELECT文',
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
              }
            }
          ]
        };
      }
    });
    
    disposablesRef.current.push(completionDisposable);
    console.log('タブエディタ: 補完プロバイダー登録完了 for tabId:', tabId);
    
    // クリーンアップ関数を返す
    return () => {
      if (disposablesRef.current) {
        disposablesRef.current.forEach(d => d.dispose());
        disposablesRef.current = [];
      }
      editorRef.current = null;
    };
  }, [tabId]);

  // タブがアクティブになった時の処理
  const handleTabActivated = useCallback(() => {
    console.log('タブエディタ: タブがアクティブになりました:', tabId);
    // 必要に応じて状態復元処理を追加
  }, [tabId]);

  // タブが非アクティブになった時の処理
  const handleTabDeactivated = useCallback(() => {
    console.log('タブエディタ: タブが非アクティブになりました:', tabId);
    // 必要に応じて状態保存処理を追加
  }, [tabId]);

  return {
    handleEditorDidMount,
    handleTabActivated,
    handleTabDeactivated,
    getEditorInstance,
    getSelectedSQL,
    hasSelection,
    insertText,
    getCurrentUserRole
  };
};
