import { useEffect, useRef } from 'react';
import { languages, editor } from 'monaco-editor';
import type { IDisposable } from 'monaco-editor';

export const useSqlCompletion = () => {
  const completionProviderRef = useRef<IDisposable | null>(null);
  const editorInstanceRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // エディタインスタンスを設定する関数
  const setEditorInstance = (editorInstance: editor.IStandaloneCodeEditor) => {
    editorInstanceRef.current = editorInstance;
    console.log('useSqlCompletion: Editor instance set, registering completion provider...');
    
    // 既存のプロバイダーを破棄
    if (completionProviderRef.current) {
      console.log('useSqlCompletion: Disposing existing provider');
      completionProviderRef.current.dispose();
    }

    // SQL言語の基本設定を明示的に定義
    console.log('useSqlCompletion: Setting up SQL language configuration...');
    
    // 既存の設定をクリアしてから再設定
    try {
      languages.setLanguageConfiguration('sql', {
        comments: {
          lineComment: '--',
          blockComment: ['/*', '*/']
        },
        brackets: [
          ['{', '}'],
          ['[', ']'],
          ['(', ')']
        ],
        autoClosingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '"', close: '"' },
          { open: "'", close: "'" }
        ],
        surroundingPairs: [
          { open: '{', close: '}' },
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '"', close: '"' },
          { open: "'", close: "'" }
        ]
      });
      console.log('useSqlCompletion: SQL language configuration set successfully');
    } catch (error) {
      console.error('useSqlCompletion: Error setting SQL language configuration:', error);
    }

    console.log('useSqlCompletion: About to register completion provider...');
    
    // エディタの初期化時に補完プロバイダーを登録
    completionProviderRef.current = languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model, position) => {
        console.log('useSqlCompletion: provideCompletionItems called');
        console.log('useSqlCompletion: model language:', model.getLanguageId());
        console.log('useSqlCompletion: position:', position);
        console.log('useSqlCompletion: current word:', model.getWordUntilPosition(position));
        console.log('useSqlCompletion: model value length:', model.getValue().length);
        
        // テスト用の固定候補を返す（同期的に）
        const testSuggestions: languages.CompletionItem[] = [
          {
            label: 'SELECT',
            kind: languages.CompletionItemKind.Keyword,
            detail: 'SQL SELECT statement',
            insertText: 'SELECT ',
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            sortText: '0000',
          },
          {
            label: 'FROM',
            kind: languages.CompletionItemKind.Keyword,
            detail: 'SQL FROM clause',
            insertText: 'FROM ',
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            sortText: '0001',
          },
          {
            label: 'WHERE',
            kind: languages.CompletionItemKind.Keyword,
            detail: 'SQL WHERE clause',
            insertText: 'WHERE ',
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
            insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
            sortText: '0002',
          }
        ];
        
        console.log('useSqlCompletion: Returning test suggestions:', testSuggestions);
        return { suggestions: testSuggestions };
      },
    });

    // エディタの準備が完了したら補完をテスト
    setTimeout(() => {
      if (editorInstanceRef.current) {
        console.log('useSqlCompletion: Testing completion after registration...');
        console.log('useSqlCompletion: Editor options:', editorInstanceRef.current.getOption(1)); // 補完設定を確認
        console.log('useSqlCompletion: Editor model:', editorInstanceRef.current.getModel()?.getLanguageId());
        
        // 手動で補完をトリガー
        editorInstanceRef.current.trigger('keyboard', 'editor.action.triggerSuggest', {});
        
        // さらに1秒後に再テスト
        setTimeout(() => {
          if (editorInstanceRef.current) {
            console.log('useSqlCompletion: Retesting completion...');
            editorInstanceRef.current.trigger('keyboard', 'editor.action.triggerSuggest', {});
          }
        }, 1000);
      }
    }, 1000);
  };

  // クリーンアップ関数
  useEffect(() => {
    return () => {
      if (completionProviderRef.current) {
        console.log('useSqlCompletion: Cleaning up completion provider');
        completionProviderRef.current.dispose();
      }
    };
  }, []);

  return { setEditorInstance };
};