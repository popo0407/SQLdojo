import { useRef, useEffect, useCallback } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useEditorStore } from '../stores/useEditorStore';
import { getSqlSuggestions } from '../api/sqlService';
import type { MonacoEditor, MonacoInstance, CompletionItem } from '../types/editor';

/**
 * Monaco Editorの補完アイテム種別を取得する関数
 */
const getMonacoCompletionItemKind = (kind: string, monacoInstance: MonacoInstance) => {
  const kindMap: { [key: string]: monaco.languages.CompletionItemKind } = {
    'keyword': monacoInstance.languages.CompletionItemKind.Keyword,
    'function': monacoInstance.languages.CompletionItemKind.Function,
    'table': monacoInstance.languages.CompletionItemKind.Class,
    'view': monacoInstance.languages.CompletionItemKind.Class,
    'column': monacoInstance.languages.CompletionItemKind.Field,
    'schema': monacoInstance.languages.CompletionItemKind.Module,
    'snippet': monacoInstance.languages.CompletionItemKind.Snippet
  };
  return kindMap[kind] || monacoInstance.languages.CompletionItemKind.Text;
};

/**
 * Monaco Editorの管理を提供するカスタムフック
 * エディタの初期化、補完機能の登録・破棄、キーボードショートカットを管理
 */
export const useMonacoEditor = () => {
  const { setEditor, formatSql } = useEditorStore();
  const completionProviderRef = useRef<monaco.IDisposable | null>(null);

  // エディタの初期化処理
  const handleEditorDidMount = useCallback((
    editor: MonacoEditor,
    monacoInstance: MonacoInstance
  ) => {
    setEditor(editor);
    
    // 古い補完機能がもしあれば、念の為に破棄する
    if (completionProviderRef.current) {
      completionProviderRef.current.dispose();
    }

    // 補完機能を登録
    completionProviderRef.current = monacoInstance.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: [' ', '.'],
      provideCompletionItems: async (model, position) => {
        const fullSql = model.getValue();
        const offset = model.getOffsetAt(position);
        
        try {
          // バックエンドAPIから補完候補を取得
          const result = await getSqlSuggestions({
            sql: fullSql,
            position: offset,
            context: null
          });
          
          // バックエンドの候補をMonaco Editorの形式に変換
          const suggestions = result.suggestions.map((item: CompletionItem) => {
            let insertText = item.insert_text || item.label;
            
            // snippet以外はすべてスペースを追加
            if (item.kind !== 'snippet') {
              if (!insertText.endsWith(' ')) {
                insertText += ' ';
              }
            }
            
            // 現在の単語の範囲を計算
            const word = model.getWordAtPosition(position);
            const wordStart = word ? {
              lineNumber: position.lineNumber,
              column: word.startColumn
            } : position;
            const wordEnd = word ? {
              lineNumber: position.lineNumber,
              column: word.endColumn
            } : position;
            
            return {
              label: item.label,
              kind: getMonacoCompletionItemKind(item.kind, monacoInstance),
              detail: item.detail || item.documentation,
              documentation: item.documentation,
              insertText: insertText,
              insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              sortText: item.sort_text || item.label,
              range: {
                startLineNumber: wordStart.lineNumber,
                startColumn: wordStart.column,
                endLineNumber: wordEnd.lineNumber,
                endColumn: wordEnd.column,
              }
            };
          });

          return { suggestions };
          
        } catch {
          // エラー時はデフォルトのキーワード補完を返す
          const word = model.getWordAtPosition(position);
          const wordStart = word ? {
            lineNumber: position.lineNumber,
            column: word.startColumn
          } : position;
          const wordEnd = word ? {
            lineNumber: position.lineNumber,
            column: word.endColumn
          } : position;
          
          return {
            suggestions: [
              {
                label: 'SELECT',
                kind: monacoInstance.languages.CompletionItemKind.Keyword,
                insertText: 'SELECT ',
                range: {
                  startLineNumber: wordStart.lineNumber,
                  startColumn: wordStart.column,
                  endLineNumber: wordEnd.lineNumber,
                  endColumn: wordEnd.column,
                }
              },
              {
                label: 'FROM',
                kind: monacoInstance.languages.CompletionItemKind.Keyword,
                insertText: 'FROM ',
                range: {
                  startLineNumber: wordStart.lineNumber,
                  startColumn: wordStart.column,
                  endLineNumber: wordEnd.lineNumber,
                  endColumn: wordEnd.column,
                }
              },
              {
                label: 'WHERE',
                kind: monacoInstance.languages.CompletionItemKind.Keyword,
                insertText: 'WHERE ',
                range: {
                  startLineNumber: wordStart.lineNumber,
                  startColumn: wordStart.column,
                  endLineNumber: wordEnd.lineNumber,
                  endColumn: wordEnd.column,
                }
              },
              {
                label: 'ORDER BY',
                kind: monacoInstance.languages.CompletionItemKind.Keyword,
                insertText: 'ORDER BY ',
                range: {
                  startLineNumber: wordStart.lineNumber,
                  startColumn: wordStart.column,
                  endLineNumber: wordEnd.lineNumber,
                  endColumn: wordEnd.column,
                }
              },
              {
                label: 'GROUP BY',
                kind: monacoInstance.languages.CompletionItemKind.Keyword,
                insertText: 'GROUP BY ',
                range: {
                  startLineNumber: wordStart.lineNumber,
                  startColumn: wordStart.column,
                  endLineNumber: wordEnd.lineNumber,
                  endColumn: wordEnd.column,
                }
              },
              {
                label: 'HAVING',
                kind: monacoInstance.languages.CompletionItemKind.Keyword,
                insertText: 'HAVING ',
                range: {
                  startLineNumber: wordStart.lineNumber,
                  startColumn: wordStart.column,
                  endLineNumber: wordEnd.lineNumber,
                  endColumn: wordEnd.column,
                }
              },
              {
                label: 'LIMIT',
                kind: monacoInstance.languages.CompletionItemKind.Keyword,
                insertText: 'LIMIT ',
                range: {
                  startLineNumber: wordStart.lineNumber,
                  startColumn: wordStart.column,
                  endLineNumber: wordEnd.lineNumber,
                  endColumn: wordEnd.column,
                }
              }
            ]
          };
        }
      }
    });

    // キーボードショートカットを追加
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      formatSql();
    });
    
    // テスト用：1秒後に手動で補完をトリガー
    setTimeout(() => {
      editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
    }, 1000);
  }, [setEditor, formatSql]);

  // コンポーネントが破棄されるときに、登録した補完機能をクリーンアップする
  useEffect(() => {
    return () => {
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
      }
    };
  }, []);

  return {
    handleEditorDidMount
  };
}; 