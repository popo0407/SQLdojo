import { useCallback, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { useAuth } from '../contexts/AuthContext';

/**
 * タブ専用のMonaco Editorフック（シンプル版・テスト用）
 */
export const useTabMonacoEditor = (tabId: string) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const disposablesRef = useRef<monaco.IDisposable[]>([]);
  
  // ストアとコンテキスト
  const { user } = useAuth();

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
    console.log('🔥 タブエディタ: handleEditorDidMount called for tabId:', tabId);
    editorRef.current = editor;
    
    // 既存のdisposableをクリア
    if (disposablesRef.current) {
      disposablesRef.current.forEach(d => d.dispose());
    }
    disposablesRef.current = [];
    
    console.log('🔥 タブエディタ: 補完プロバイダーを登録します');
    
    // タブエディタ専用の補完プロバイダーを登録
    const completionDisposable = monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: ['.', ' '],
      
      provideCompletionItems: async (model, position) => {
        console.log('🎯🎯🎯 タブエディタ: 補完プロバイダーが呼び出されました!!!', { 
          tabId, 
          position: `${position.lineNumber}:${position.column}`,
          modelId: model.id,
          editorModelId: editor.getModel()?.id,
          currentWord: model.getWordAtPosition(position)?.word || '',
          lineContent: model.getLineContent(position.lineNumber)
        });
        
        // このエディタのモデルかチェック
        if (model !== editor.getModel()) {
          console.log('❌ タブエディタ: 他のエディタからの呼び出しのため空の候補を返します');
          return { suggestions: [] };
        }
        
        // テスト候補を返して、補完プロバイダーが確実に動作することを確認
        console.log('✅ タブエディタ: テスト補完候補を返します');
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: position.column,
          endColumn: position.column,
        };
        
        return {
          suggestions: [
            {
              label: '🔥 TAB_COMPLETION_WORKING',
              kind: monaco.languages.CompletionItemKind.Text,
              insertText: 'TAB_COMPLETION_WORKING',
              detail: 'タブエディタの補完プロバイダーが動作中！',
              range: range
            },
            {
              label: '✅ TEST_TABLE',
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: 'TEST_TABLE',
              detail: 'テスト用テーブル',
              range: range
            }
          ]
        };
      }
    });
    
    disposablesRef.current.push(completionDisposable);
    console.log('🔥 タブエディタ: 補完プロバイダー登録完了 for tabId:', tabId);
    
    // 補完機能のテスト用：エディタにフォーカスした時に補完をトリガー
    const focusDisposable = editor.onDidFocusEditorWidget(() => {
      console.log('👀 タブエディタ: エディタがフォーカスされました。補完をテストします。');
      // 少し遅らせて補完をトリガー
      setTimeout(() => {
        console.log('🚀 タブエディタ: 手動で補完をトリガーします');
        editor.trigger('', 'editor.action.triggerSuggest', {});
      }, 100);
    });
    
    disposablesRef.current.push(focusDisposable);
    
    // テキスト変更時に補完をトリガー（デバッグ用）
    const changeDisposable = editor.onDidChangeModelContent(() => {
      console.log('📝 タブエディタ: テキストが変更されました');
      // スペースやドットが入力された時に補完をトリガー
      setTimeout(() => {
        const position = editor.getPosition();
        if (position) {
          const lineContent = editor.getModel()?.getLineContent(position.lineNumber) || '';
          const charBeforeCursor = lineContent.charAt(position.column - 2);
          if (charBeforeCursor === ' ' || charBeforeCursor === '.') {
            console.log('⚡ タブエディタ: 自動的に補完をトリガー');
            editor.trigger('', 'editor.action.triggerSuggest', {});
          }
        }
      }, 50);
    });
    
    disposablesRef.current.push(changeDisposable);
    
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
    console.log('📋 タブエディタ: タブがアクティブになりました:', tabId);
    // 必要に応じて状態復元処理を追加
  }, [tabId]);

  // タブが非アクティブになった時の処理
  const handleTabDeactivated = useCallback(() => {
    console.log('📋 タブエディタ: タブが非アクティブになりました:', tabId);
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
