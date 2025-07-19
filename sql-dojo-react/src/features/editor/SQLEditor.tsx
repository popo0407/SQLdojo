import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { Button, ButtonGroup, Stack, Spinner } from 'react-bootstrap';
import styles from './SQLEditor.module.css';
import { useSqlPageStore } from '../../stores/useSqlPageStore';
import { useResultsStore } from '../../stores/useResultsStore';
import { useUIStore } from '../../stores/useUIStore';

// Monaco Editorの補完アイテム種別を取得する関数
const getMonacoCompletionItemKind = (kind: string, monacoInstance: typeof monaco) => {
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

const SQLEditor: React.FC = () => {
  const { sql, setSql } = useSqlPageStore();
  const executeSql = useSqlPageStore((state) => state.executeSql);
  const downloadCsv = useSqlPageStore((state) => state.downloadCsv);
  const setEditor = useSqlPageStore((state) => state.setEditor);
  const sqlToInsert = useSqlPageStore((state) => state.sqlToInsert);
  const clearSqlToInsert = useSqlPageStore((state) => state.clearSqlToInsert);
  const formatSql = useSqlPageStore((state) => state.formatSql);
  
  // UIストアから状態を取得
  const isDownloading = useUIStore((state) => state.isDownloading);
  const isPending = useUIStore((state) => state.isPending);
  
  // 補完機能の登録情報を保持するためのuseRef
  const completionProviderRef = useRef<monaco.IDisposable | null>(null);

  // onMountは、エディタの初期化が完了したときに呼ばれる
  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco
  ) => {
    console.log('SQLEditor: Editor mounted with monaco instance');
    setEditor(editor);
    
    // 古い補完機能がもしあれば、念の為に破棄する
    if (completionProviderRef.current) {
      console.log('SQLEditor: Disposing existing completion provider');
      completionProviderRef.current.dispose();
    }

    // ★★★ ここで、準備完了した monacoInstance を使って補完機能を登録する ★★★
    console.log('SQLEditor: Registering completion provider with monaco instance');
    completionProviderRef.current = monacoInstance.languages.registerCompletionItemProvider('sql', {
      // 補完候補を出すトリガーとなる文字
      triggerCharacters: [' ', '.'],

      // 補完候補を提供する関数
      provideCompletionItems: async (model, position) => {
        console.log('SQLEditor: provideCompletionItems called');
        console.log('SQLEditor: model language:', model.getLanguageId());
        console.log('SQLEditor: position:', position);
        
        const fullSql = model.getValue();
        const offset = model.getOffsetAt(position);
        
        console.log('SQLEditor: full SQL:', fullSql);
        console.log('SQLEditor: cursor offset:', offset);

        try {
          // バックエンドAPIから補完候補を取得
          const response = await fetch('/api/v1/sql/suggest', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sql: fullSql,
              position: offset,
              context: null
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();
          console.log('SQLEditor: API response:', result);
          
          // バックエンドの候補をMonaco Editorの形式に変換
          const suggestions = result.suggestions.map((item: { 
            label: string; 
            kind: string; 
            detail?: string; 
            documentation?: string; 
            insert_text?: string; 
            sort_text?: string; 
          }) => {
            // キーワードや関数の場合は末尾にスペースを追加
            let insertText = item.insert_text || item.label;
            
            // snippet以外はすべてスペースを追加
            if (item.kind !== 'snippet') {
              if (!insertText.endsWith(' ')) {
                insertText += ' ';
              }
            }
            // その他の場合（snippet等）は既存のinsert_textをそのまま使用
            
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
              detail: item.detail || item.documentation, // detailを優先、なければdocumentationを使用
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

          console.log('SQLEditor: Converted suggestions:', suggestions);
          return { suggestions };
          
        } catch (error) {
          console.error('SQLEditor: API error:', error);
          
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

    // 補完機能の登録完了を確認
    console.log('SQLEditor: Completion provider registered successfully');
    
    // キーボードショートカットを追加
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      handleFormat();
    });
    
    // テスト用：1秒後に手動で補完をトリガー
    setTimeout(() => {
      console.log('SQLEditor: Testing completion trigger...');
      editor.trigger('keyboard', 'editor.action.triggerSuggest', {});
    }, 1000);
  };
  
  // コンポーネントが破棄されるときに、登録した補完機能をクリーンアップする
  useEffect(() => {
    return () => {
      if (completionProviderRef.current) {
        console.log('SQLEditor: Cleaning up completion provider');
        completionProviderRef.current.dispose();
      }
    };
  }, []);

  // sqlToInsertを監視し、エディタに挿入
  useEffect(() => {
    if (sqlToInsert) {
      const editorInstance = useSqlPageStore.getState().editor;
      if (editorInstance) {
        const position = editorInstance.getPosition();
        if (position) {
          const range = {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          };
          const op = {
            identifier: { major: 1, minor: 1 },
            range,
            text: sqlToInsert,
            forceMoveMarkers: true,
          };
          editorInstance.executeEdits('sidebar-insert', [op]);
          editorInstance.focus();
        }
      }
      clearSqlToInsert();
    }
  }, [sqlToInsert, clearSqlToInsert]);

  const handleClear = () => {
    setSql('');
  };

  const handleFormat = async () => {
    try {
      await formatSql();
      // 成功時はメッセージ非表示（ユーザーが見た目で判断可能）
    } catch (error) {
      // エラーメッセージを表示
      const errorMessage = error instanceof Error ? error.message : 'SQL整形に失敗しました';
      alert(errorMessage);
    }
  };

  return (
    <Stack gap={2} className={styles.editorContainer}>
      {/* ツールバー */}
      <div className={styles.toolbar}>
        <ButtonGroup>
          <Button 
            variant="outline-secondary" 
            size="sm" 
            onClick={handleFormat}
            disabled={isPending || !sql.trim()}
          >
            {isPending ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                整形中...
              </>
            ) : (
              <>
                <i className="fas fa-magic me-1"></i>整形
              </>
            )}
          </Button>
          <Button variant="outline-secondary" size="sm" onClick={handleClear}>
            <i className="fas fa-eraser me-1"></i>クリア
          </Button>
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={downloadCsv}
            disabled={isDownloading || !sql.trim()}
          >
            {isDownloading ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                ダウンロード中...
              </>
            ) : (
              <>
                <i className="fas fa-download me-1"></i>CSV
              </>
            )}
          </Button>
        </ButtonGroup>
        <Button variant="success" size="sm" onClick={executeSql}>
          <i className="fas fa-play me-1"></i>実行 (Ctrl+Enter)
        </Button>
      </div>
      {/* Monaco Editor 本体 */}
      <div className={styles.editorWrapper}>
        <Editor
          height="100%"
          language="sql"
          theme="vs-light"
          value={sql}
          onChange={(value) => setSql(value || '')}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            fontFamily: 'Fira Code, JetBrains Mono, Courier New, monospace',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            lineNumbers: 'on',
            roundedSelection: false,
            readOnly: false,
            cursorStyle: 'line',
            // 補完機能を明示的に有効化
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            tabCompletion: 'on',
            wordBasedSuggestions: 'off',
          }}
        />
      </div>
    </Stack>
  );
};

export default SQLEditor; 