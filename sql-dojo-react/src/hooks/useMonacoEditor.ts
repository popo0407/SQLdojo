import { useCallback } from 'react';
import { useEditorStore } from '../stores/useEditorStore';
import { getSqlSuggestions } from '../api/sqlService';
import type { SqlCompletionItem } from '../types/api';

/**
 * Monaco Editorのカスタムフック
 * エディタの初期化とイベントハンドリングを管理
 */
export const useMonacoEditor = () => {
  const { setEditor } = useEditorStore();

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    console.log('Monaco Editor初期化開始');
    
    // エディタインスタンスをストアに保存
    setEditor(editor);
    
    // SQL補完機能を設定
    const completionProvider = monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: async (model: any, position: any) => {
        console.log('補完リクエスト開始:', { position, model: model.getValue() });
        
        try {
          const sql = model.getValue();
          const offset = model.getOffsetAt(position);
          
          console.log('SQL補完API呼び出し:', { sql, position: offset });
          
          // バックエンドから補完候補を取得
          const response = await getSqlSuggestions({
            sql,
            position: offset,
            context: {}
          });
          
          console.log('SQL補完APIレスポンス:', response);
          
          // Monaco Editorの補完アイテム形式に変換
          const suggestions = response.suggestions.map((item: SqlCompletionItem) => {
            // kindの変換
            let kind = monaco.languages.CompletionItemKind.Text;
            switch (item.kind.toLowerCase()) {
              case 'table':
              case 'view':
                kind = monaco.languages.CompletionItemKind.Class;
                break;
              case 'function':
                kind = monaco.languages.CompletionItemKind.Function;
                break;
              case 'keyword':
                kind = monaco.languages.CompletionItemKind.Keyword;
                break;
              case 'column':
                kind = monaco.languages.CompletionItemKind.Field;
                break;
              default:
                kind = monaco.languages.CompletionItemKind.Text;
            }
            
            return {
              label: item.label,
              kind: kind,
              detail: item.detail,
              documentation: item.documentation,
              insertText: item.insert_text || item.label,
              sortText: item.sort_text || item.label,
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              }
            };
          });
          
          console.log('Monaco Editor補完アイテム:', suggestions);
          
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
    
    // 選択状態の変更を監視
    editor.onDidChangeCursorSelection(() => {
      // 選択状態が変更されたときにストアを更新
      // この時点では何もしない（hasSelection()がリアクティブに動作するため）
    });
    
    // エディタにフォーカス
    editor.focus();
    
    console.log('Monaco Editor初期化完了');
  }, [setEditor]);

  return {
    handleEditorDidMount,
  };
}; 