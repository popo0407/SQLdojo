import { useCallback } from 'react';
import type * as monaco from 'monaco-editor';
import { useEditorStore } from '../stores/useEditorStore';
import { useSqlPageStore } from '../stores/useSqlPageStore';
import { useUIStore } from '../stores/useUIStore';
import { getSqlSuggestions } from '../api/sqlService';
import type { SqlCompletionItem } from '../types/api';

/**
 * Monaco Editorのカスタムフック
 * エディタの初期化とイベントハンドリングを管理
 */
export const useMonacoEditor = () => {
  const { setEditor } = useEditorStore();

  const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor, monacoApi?: typeof monaco) => {
    // Monaco Editor初期化開始
    
    // エディタインスタンスをストアに保存
    setEditor(editor);
    
    // エディタ内ショートカット（Monaco）
    if (monacoApi) {
      // Ctrl/Cmd + Enter: 実行
      editor.addCommand(monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.Enter, async () => {
        const { executeSql } = useSqlPageStore.getState();
        await executeSql();
      });

      // Ctrl/Cmd + Shift + F: 整形
      editor.addCommand(monacoApi.KeyMod.CtrlCmd | monacoApi.KeyMod.Shift | monacoApi.KeyCode.KeyF, async () => {
        const { formatSql } = useSqlPageStore.getState();
        await formatSql();
      });

      // Ctrl/Cmd + L: クリア（ブラウザのアドレスバー選択を防ぐ目的でエディタ側にもバインド）
      editor.addCommand(monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.KeyL, () => {
        const { clearSql } = useEditorStore.getState();
        clearSql();
      });

      // F1: ショートカットヘルプ（Monacoのコマンドパレットより先に自前のヘルプを開く）
      editor.addCommand(monacoApi.KeyCode.F1, () => {
        const { setShowShortcutHelp } = useUIStore.getState();
        setShowShortcutHelp(true);
      });
    }
    
    // SQL補完機能を設定
    if (monacoApi) {
      monacoApi.languages.registerCompletionItemProvider('sql', {
        provideCompletionItems: async (model: monaco.editor.ITextModel, position: monaco.Position) => {
          // 補完リクエスト開始
          
          try {
            const sql = model.getValue();
            const offset = model.getOffsetAt(position);
            
            // SQL補完API呼び出し
            
            // バックエンドから補完候補を取得
            const response = await getSqlSuggestions({
              sql,
              position: offset,
              context: {}
            });
            
            // SQL補完APIレスポンス
            
            // Monaco Editorの補完アイテム形式に変換
            const suggestions = response.suggestions.map((item: SqlCompletionItem) => {
              // kindの変換
              let kind = monacoApi.languages.CompletionItemKind.Text;
              switch (item.kind.toLowerCase()) {
                case 'table':
                case 'view':
                  kind = monacoApi.languages.CompletionItemKind.Class;
                  break;
                case 'function':
                  kind = monacoApi.languages.CompletionItemKind.Function;
                  break;
                case 'keyword':
                  kind = monacoApi.languages.CompletionItemKind.Keyword;
                  break;
                case 'column':
                  kind = monacoApi.languages.CompletionItemKind.Field;
                  break;
                default:
                  kind = monacoApi.languages.CompletionItemKind.Text;
              }
              
              // 現在の単語の範囲を計算
              const currentText = model.getValue();
              const currentOffset = model.getOffsetAt(position);
              let wordStart = currentOffset;
              
              // 単語の開始位置を見つける
              while (wordStart > 0) {
                const char = currentText.charAt(wordStart - 1);
                if (!char.match(/[a-zA-Z0-9_]/)) {
                  break;
                }
                wordStart--;
              }
              
              const wordStartPosition = model.getPositionAt(wordStart);
              
              return {
                label: item.label,
                kind: kind,
                detail: item.detail,
                documentation: item.documentation,
                insertText: item.insert_text || item.label,
                sortText: item.sort_text || item.label,
                range: {
                  startLineNumber: wordStartPosition.lineNumber,
                  startColumn: wordStartPosition.column,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column,
                }
              };
            });
            
            // Monaco Editor補完アイテム
            
            return {
              suggestions: suggestions
            };
          } catch (error) {
            console.error('SQL補完エラー:', error);
            return { suggestions: [] };
          }
        },
        triggerCharacters: [' ', '.', ',', '(', ')', '\n', '\t']
      });
    }
    
    // 選択状態の変更を監視
    editor.onDidChangeCursorSelection(() => {
      // 選択状態が変更されたときにストアを更新
      // この時点では何もしない（hasSelection()がリアクティブに動作するため）
    });
    
    // エディタにフォーカス
    editor.focus();
    
    // Monaco Editor初期化完了
  }, [setEditor]);

  return {
    handleEditorDidMount,
  };
}; 