import { useCallback } from 'react';
import type * as monaco from 'monaco-editor';
import { getSqlSuggestions } from '../api/sqlService';
import type { SqlCompletionItem } from '../types/api';
import { useAuth } from '../contexts/AuthContext';

/**
 * エディタ内容からコンテキスト補完候補を抽出
 */
function extractContextSuggestions(
  sql: string, 
  currentLine: string, 
  position: monaco.Position, 
  monacoApi: typeof monaco
): monaco.languages.CompletionItem[] {
  const suggestions: monaco.languages.CompletionItem[] = [];
  
  try {
    console.log('🔥 タブエディタ: コンテキスト補完解析開始', {
      sql: sql.slice(0, 100),
      currentLine,
      position: `${position.lineNumber}:${position.column}`
    });
    
    // SQLを大文字に変換して解析
    const upperCurrentLine = currentLine.toUpperCase();
    
    // 現在の位置がSELECTまたはWHERE句内かを判定
    const selectIndex = upperCurrentLine.indexOf('SELECT');
    const fromIndex = upperCurrentLine.indexOf('FROM');
    
    // SELECT句判定: SELECTが存在し、かつ（FROMがないか、FROMより前にいる）
    const isInSelectClause = selectIndex !== -1 && 
                             (fromIndex === -1 || position.column <= fromIndex);
    
    const isInWhereClause = upperCurrentLine.includes('WHERE') || 
                           upperCurrentLine.includes('AND') || 
                           upperCurrentLine.includes('OR');
    
    console.log('🔥 タブエディタ: 句判定結果', {
      isInSelectClause,
      isInWhereClause,
      lineAnalysis: {
        hasSelect: selectIndex !== -1,
        hasFrom: fromIndex !== -1,
        selectIndex,
        fromIndex,
        positionColumn: position.column,
        upperCurrentLine
      }
    });
    
    if (isInSelectClause || isInWhereClause) {
      console.log('🔥 タブエディタ: SELECT/WHERE句を検出、コンテキスト補完開始');
      
      // FROM句からテーブル/エイリアスを抽出
      const tableAliases = extractTableAliases(sql);
      console.log('🔥 タブエディタ: テーブルエイリアス抽出', { aliases: tableAliases });
      
      // エディタ内の全ての単語を抽出（カラム候補として）
      const sqlWords = extractSqlWords(sql);
      console.log('🔥 タブエディタ: SQL単語抽出', { wordsCount: sqlWords.length, words: sqlWords.slice(0, 10) });
      
      // SQLキーワードとテーブル名を除外して、カラム候補を生成
      const columnCandidates = sqlWords.filter(word => 
        !SQL_KEYWORDS.includes(word.toUpperCase()) &&
        !tableAliases.some(alias => alias.name.toUpperCase() === word.toUpperCase() || alias.alias.toUpperCase() === word.toUpperCase())
      );
      
      console.log('🔥 タブエディタ: カラム候補フィルタ後', { candidatesCount: columnCandidates.length, candidates: columnCandidates.slice(0, 10) });
      
      // ユニークなカラム候補を作成
      const uniqueColumns = [...new Set(columnCandidates)];
      
      uniqueColumns.forEach(column => {
        // 現在位置から単語の始まりを探す（元エディタと同じロジック）
        const lineText = currentLine;
        let columnStart = position.column;
        while (columnStart > 1) {
          const char = lineText.charAt(columnStart - 2);
          if (!char.match(/[a-zA-Z0-9_]/)) {
            break;
          }
          columnStart--;
        }
        
        suggestions.push({
          label: column,
          kind: monacoApi.languages.CompletionItemKind.Field,
          detail: '🎯 エディタ内コンテキスト',
          documentation: `このSQLエディタ内で使用されているカラム候補: ${column}`,
          insertText: column,
          sortText: `000_${column}`, // 最優先で表示（000で始まる）
          range: {
            startLineNumber: position.lineNumber,
            startColumn: columnStart,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          }
        });
      });
      
      console.log('🔥 タブエディタ: コンテキスト補完候補生成完了', { 
        columnsCount: uniqueColumns.length,
        columns: uniqueColumns.slice(0, 5),
        suggestionsGenerated: suggestions.length
      });
    } else {
      console.log('🔥 タブエディタ: SELECT/WHERE句ではないため、コンテキスト補完をスキップ');
    }
  } catch (error) {
    console.error('❌ タブエディタ: extractContextSuggestionsエラー', error);
  }
  
  return suggestions;
}

/**
 * SQLからテーブル名とエイリアスを抽出
 */
function extractTableAliases(sql: string): { name: string; alias: string }[] {
  const aliases: { name: string; alias: string }[] = [];
  const upperSql = sql.toUpperCase();
  
  // FROM句のパターンマッチング
  const fromMatches = upperSql.match(/FROM\s+([^;]+?)(?:WHERE|GROUP|ORDER|LIMIT|$)/g);
  
  fromMatches?.forEach(fromClause => {
    // テーブル名 [AS] エイリアス のパターン
    const tableAliasMatch = fromClause.match(/FROM\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/);
    if (tableAliasMatch) {
      const tableName = tableAliasMatch[1];
      const alias = tableAliasMatch[2] || tableName;
      aliases.push({ name: tableName, alias });
    }
  });
  
  return aliases;
}

/**
 * SQLから有効な単語を抽出
 */
function extractSqlWords(sql: string): string[] {
  // 英数字とアンダースコアからなる単語を抽出
  const wordMatches = sql.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g);
  return wordMatches || [];
}

/**
 * 基本的なSQLキーワード
 */
const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
  'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE', 'INDEX',
  'GROUP', 'BY', 'ORDER', 'HAVING', 'DISTINCT', 'AS', 'JOIN', 'LEFT', 'RIGHT',
  'INNER', 'OUTER', 'ON', 'NULL', 'TRUE', 'FALSE', 'CASE', 'WHEN', 'THEN',
  'ELSE', 'END', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'LIMIT', 'OFFSET'
];

/**
 * タブエディタ専用Monaco Editorカスタムフック
 */
export const useTabMonacoEditor = (tabId: string) => {
  const { user } = useAuth();
  
  const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor, monacoApi: typeof monaco) => {
    console.log('🔥 タブエディタ: handleEditorDidMount called for tabId:', tabId);
    console.log('🔥 タブエディタ: 元のeditor model ID:', editor.getModel()?.id);
    
    // 元エディタと同じ方法で補完プロバイダーを登録
    console.log('🔥 タブエディタ: 元エディタと同じ方法で補完プロバイダーを登録');
    
    monacoApi.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: async (model: monaco.editor.ITextModel, position: monaco.Position) => {
        console.log('🎯🎯🎯 タブエディタ: 補完プロバイダーが呼び出されました!!!', {
          tabId,
          modelId: model.id,
          languageId: model.getLanguageId(),
          position: `${position.lineNumber}:${position.column}`,
          lineContent: model.getLineContent(position.lineNumber),
          wordAtPosition: model.getWordAtPosition(position)
        });
        
        // このエディタのモデルかチェック（より厳密に）
        const isTabEditorModel = model === editor.getModel();
        if (!isTabEditorModel) {
          console.log('🔥 タブエディタ: 他のエディタからの呼び出しのため空の候補を返します', {
            modelId: model.id,
            editorModelId: editor.getModel()?.id,
            reason: 'タブエディタのモデルではない'
          });
          return { suggestions: [] };
        }
        
        console.log('🔥 タブエディタ: タブエディタからの正当な呼び出しを確認');
        
        try {
          // 元エディタと同じSQL補完ロジック
          console.log('🔥 タブエディタ: SQL補完API呼び出し開始');
          
          const sql = model.getValue();
          const offset = model.getOffsetAt(position);
          
          // SQL補完API呼び出し（元エディタと同じ）
          const response = await getSqlSuggestions({
            sql,
            position: offset,
            context: {}
          });
          
          console.log('🔥 タブエディタ: SQL補完APIレスポンス取得', { 
            suggestionsCount: response.suggestions.length 
          });
          
          // Monaco Editorの補完アイテム形式に変換（元エディタと同じロジック）
          const suggestions = response.suggestions.map((item: SqlCompletionItem) => {
            // kindの変換
            let kind = monacoApi.languages.CompletionItemKind.Text;
            switch (item.kind.toLowerCase()) {
              case 'table':
              case 'view':
                kind = monacoApi.languages.CompletionItemKind.Class;
                break;
              case 'column':
                kind = monacoApi.languages.CompletionItemKind.Field;
                break;
              case 'function':
                kind = monacoApi.languages.CompletionItemKind.Function;
                break;
              case 'keyword':
                kind = monacoApi.languages.CompletionItemKind.Keyword;
                break;
              case 'schema':
                kind = monacoApi.languages.CompletionItemKind.Module;
                break;
              default:
                kind = monacoApi.languages.CompletionItemKind.Text;
            }
            
            // 元エディタと同じように現在位置から単語の始まりを探す
            const currentText = model.getValue();
            const currentOffset = model.getOffsetAt(position);
            let wordStart = currentOffset;
            
            // 前方向に英数字とアンダースコアまでを単語として認識
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
              kind,
              detail: item.detail || undefined,
              documentation: item.documentation || undefined,
              insertText: item.insert_text || item.label,
              sortText: `100_${item.sort_text || item.label}`, // コンテキスト補完(000_)の後に表示
              range: {
                startLineNumber: wordStartPosition.lineNumber,
                startColumn: wordStartPosition.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              }
            };
          });
          
          console.log('🔥 タブエディタ: SQL補完候補を変換完了', { 
            suggestionsCount: suggestions.length,
            tabId 
          });

          // 表示制御フィルタを適用（直接API呼び出し）
          let filteredSuggestions = suggestions;
          try {
            console.log('🔥 タブエディタ: 表示制御フィルタを開始');
            
            // 直接API呼び出しで表示制御設定を取得
            const visibilityResponse = await fetch('/api/v1/admin/visibility-settings');
            if (!visibilityResponse.ok) {
              throw new Error(`表示制御設定の取得に失敗: ${visibilityResponse.status}`);
            }
            
            const visibilityData = await visibilityResponse.json();
            console.log('🔥 タブエディタ: 表示制御設定レスポンス', visibilityData);
            
            // レスポンスはオブジェクト形式: {LOG: {}, PUBLIC: {}, ...}
            // 各キーが "schema.table" 形式で、値が設定オブジェクト
            const visibilitySettings = Object.entries(visibilityData).map(([key, settings]) => {
              const [schema, table] = key.split('.');
              return {
                object_type: 'table',
                object_name: table || key, // テーブル名のみ
                schema: schema,
                settings: settings as Record<string, boolean>
              };
            });
            
            console.log('🔥 タブエディタ: 表示制御設定配列', {
              settingsCount: visibilitySettings.length,
              isArray: Array.isArray(visibilitySettings),
              sampleSettings: visibilitySettings.slice(0, 3)
            });
            
            // ユーザーロールを取得（動的）
            const userRole = user?.role;
            if (!userRole) {
              console.log('❌ タブエディタ: ユーザーロールが取得できないため、フィルタなしで表示');
              return { suggestions };
            }
            
            console.log('🔥 タブエディタ: ユーザーロール取得', { userRole });
            
            // 補完候補をフィルタリング（metadata-treeと同じロジック）
            filteredSuggestions = suggestions.filter(suggestion => {
              // テーブル・ビューの場合
              if (suggestion.kind === monacoApi.languages.CompletionItemKind.Class) {
                const tableName = suggestion.label;
                
                // 表示制御設定を確認
                const setting = visibilitySettings.find((s: { object_type: string; object_name: string; settings: Record<string, boolean> }) => 
                  s.object_type === 'table' && s.object_name === tableName
                );
                
                if (setting) {
                  // ロール固有設定を確認
                  const roleSpecificSetting = setting.settings[userRole];
                  if (roleSpecificSetting !== undefined) {
                    const shouldShow = roleSpecificSetting;
                    console.log('🔥 タブエディタ: テーブル表示制御判定（ロール固有）', {
                      tableName,
                      userRole,
                      shouldShow
                    });
                    return shouldShow;
                  }
                  
                  // DEFAULT設定を確認
                  const defaultSetting = setting.settings['DEFAULT'];
                  if (defaultSetting !== undefined) {
                    const shouldShow = defaultSetting;
                    console.log('🔥 タブエディタ: テーブル表示制御判定（DEFAULT）', {
                      tableName,
                      shouldShow
                    });
                    return shouldShow;
                  }
                }
                
                // 設定がない場合は非表示（フォールバック禁止）
                console.log('🔥 タブエディタ: テーブル表示制御判定（設定なし=非表示）', {
                  tableName
                });
                return false;
              }
              
              // テーブル・ビュー以外（カラム、関数、キーワードなど）はそのまま表示
              return true;
            });
            
            console.log('🔥 タブエディタ: 表示制御フィルタ完了', {
              originalCount: suggestions.length,
              filteredCount: filteredSuggestions.length,
              userRole
            });
            
          } catch (error) {
            console.error('❌ タブエディタ: 表示制御フィルタエラー', error);
            console.log('🔥 タブエディタ: フィルタエラーのため元の候補をそのまま返します');
            filteredSuggestions = suggestions;
          }

          // エディタ内容から動的補完候補を追加
          let enhancedSuggestions: monaco.languages.CompletionItem[] = filteredSuggestions;
          try {
            console.log('🔥 タブエディタ: エディタ内容解析による動的補完開始');
            
            const sql = model.getValue();
            const currentLine = model.getLineContent(position.lineNumber);
            
            // SQLコンテキストを解析してエディタ内のカラム候補を抽出
            const contextSuggestions = extractContextSuggestions(sql, currentLine, position, monacoApi);
            
            if (contextSuggestions.length > 0) {
              // 既存の候補と重複しないもののみ追加
              const existingLabels = filteredSuggestions.map(s => 
                typeof s.label === 'string' ? s.label.toLowerCase() : String(s.label).toLowerCase()
              );
              const uniqueContextSuggestions = contextSuggestions.filter((s) => {
                const label = typeof s.label === 'string' ? s.label : String(s.label);
                return !existingLabels.includes(label.toLowerCase());
              });
              
              enhancedSuggestions = [...filteredSuggestions, ...uniqueContextSuggestions];
              
              console.log('🔥 タブエディタ: 動的補完候補を追加', {
                contextSuggestionsCount: contextSuggestions.length,
                uniqueCount: uniqueContextSuggestions.length,
                finalCount: enhancedSuggestions.length
              });
            }
            
          } catch (error) {
            console.error('❌ タブエディタ: 動的補完エラー', error);
            enhancedSuggestions = filteredSuggestions;
          }

          return { suggestions: enhancedSuggestions };
        } catch (error) {
          console.error('❌ タブエディタ: SQL補完候補の取得エラー', error);
          
          // フォールバック: 基本的なSQL補完候補
          console.log('🔥 タブエディタ: フォールバック補完候補を返します');
        }
        
        // テスト用の基本的な補完候補（フォールバック）
        return {
          suggestions: [
            {
              label: 'SELECT',
              kind: monacoApi.languages.CompletionItemKind.Keyword,
              detail: 'SQL Keyword',
              documentation: 'Select data from tables',
              insertText: 'SELECT',
              sortText: '200_SELECT', // コンテキスト補完・API補完の後に表示
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              }
            },
            {
              label: 'FROM',
              kind: monacoApi.languages.CompletionItemKind.Keyword,
              detail: 'SQL Keyword',
              documentation: 'Specify the source table',
              insertText: 'FROM',
              sortText: '200_FROM',
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              }
            },
            {
              label: 'WHERE',
              kind: monacoApi.languages.CompletionItemKind.Keyword,
              detail: 'SQL Keyword',
              documentation: 'Filter conditions',
              insertText: 'WHERE',
              sortText: '200_WHERE',
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              }
            }
          ]
        };
      },
      triggerCharacters: [' ', '.', ',', '(', ')', '\n', '\t'] // 元エディタと同じトリガー文字
    });
    
    console.log('🔥 タブエディタ: 補完プロバイダー登録完了 for tabId:', tabId);
    
    // エディタにフォーカス
    editor.focus();
    
  }, [tabId, user]);

  // エディタ操作用の関数群
  const getSelectedSQL = useCallback(() => {
    return '';
  }, []);

  const hasSelection = useCallback(() => {
    return false;
  }, []);

  const insertText = useCallback((text: string) => {
    console.log('Insert text:', text);
  }, []);

  const handleTabActivated = useCallback(() => {
    console.log('Tab activated:', tabId);
  }, [tabId]);

  const handleTabDeactivated = useCallback(() => {
    console.log('Tab deactivated:', tabId);
  }, [tabId]);

  return {
    handleEditorDidMount,
    handleTabActivated,
    handleTabDeactivated,
    getSelectedSQL,
    hasSelection,
    insertText,
  };
};
