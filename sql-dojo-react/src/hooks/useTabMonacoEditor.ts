import { useCallback } from 'react';
import type * as monaco from 'monaco-editor';
import { getSqlSuggestions } from '../api/sqlService';
import type { SqlCompletionItem } from '../types/api';
import { useAuth } from '../contexts/AuthContext';
import { MonacoParameterFormatter } from '../utils/monacoParameterFormatter';

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
    // SQLを大文字に変換して解析
    const upperCurrentLine = currentLine.toUpperCase();
    
    // 現在の位置がSELECTまたはWHERE句内かを判定
    const selectIndex = upperCurrentLine.indexOf('SELECT');
    const fromIndex = upperCurrentLine.indexOf('FROM');
    
    // SELECT句判定: SELECTが存在し、かつ（FROMがないか、FROMより前にある）
    const isInSelectClause = selectIndex !== -1 && 
                             (fromIndex === -1 || position.column <= fromIndex);
    
    const isInWhereClause = upperCurrentLine.includes('WHERE') || 
                           upperCurrentLine.includes('AND') || 
                           upperCurrentLine.includes('OR');
    
    if (isInSelectClause || isInWhereClause) {
      
      // FROM句からテーブル/エイリアスを抽出
      const tableAliases = extractTableAliases(sql);
      
      // エディタ内の全ての単語を抽出してカラム候補として使用
      const sqlWords = extractSqlWords(sql);
      
      // SQLキーワードとテーブル名を除外して、カラム候補を生成
      const columnCandidates = sqlWords.filter(word => 
        !SQL_KEYWORDS.includes(word.toUpperCase()) &&
        !tableAliases.some(alias => alias.name.toUpperCase() === word.toUpperCase() || alias.alias.toUpperCase() === word.toUpperCase())
      );
      
      
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
          sortText: `000_${column}`, // 最優先で表示（000で始まる！）
          range: {
            startLineNumber: position.lineNumber,
            startColumn: columnStart,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          }
        });
      });
      
      return suggestions;
    }
  } catch (error) {
    console.error('❌タブエディタ: extractContextSuggestionsエラー', error);
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
    console.log('🔍 useTabMonacoEditor: handleEditorDidMount called for tabId:', tabId);
    
    // グローバルイベントリスナーを追加してキー入力をテスト
    const globalKeyDownHandler = (event: KeyboardEvent) => {
      // Ctrl+Enter のテスト（複数の条件でテスト）
      if ((event.ctrlKey || event.metaKey) && (event.key === 'Enter' || event.code === 'Enter' || event.keyCode === 13)) {
        console.log('🔍 GLOBAL keydown: Ctrl+Enter detected globally, target:', event.target);
        console.log('🔍 GLOBAL keydown: event details:', {
          key: event.key,
          code: event.code,
          keyCode: event.keyCode,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey
        });
      }
      // Enterキーのみのテスト
      if (event.key === 'Enter' || event.code === 'Enter' || event.keyCode === 13) {
        console.log('🔍 GLOBAL keydown: Enter detected (any), Ctrl:', event.ctrlKey, 'Meta:', event.metaKey, 'Key:', event.key, 'Code:', event.code);
      }
      // F5 のテスト
      if (event.key === 'F5') {
        console.log('🔍 GLOBAL keydown: F5 detected globally, target:', event.target);
      }
      // Ctrl+S のテスト（通常はページ保存）
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        console.log('🔍 GLOBAL keydown: Ctrl+S detected globally, target:', event.target);
      }
      // 全てのキー入力をログ出力（最初の数回のみ）
      if (Math.random() < 0.1) { // 10%の確率でログ出力（スパム防止）
        const targetElement = event.target as HTMLElement;
        console.log('🔍 GLOBAL keydown: Key pressed:', event.key, 'Ctrl:', event.ctrlKey, 'Target:', targetElement?.tagName);
      }
    };
    
    // documentレベルでキャプチャフェーズでリスン
    document.addEventListener('keydown', globalKeyDownHandler, true);
    console.log('🔍 useTabMonacoEditor: Global keydown listener added for tabId:', tabId);
    
    // ショートカットキーを追加（元エディタと同じ）
    // Ctrl/Cmd + Enter: 実行
    console.log('🔍 useTabMonacoEditor: Adding Ctrl+Enter command for tabId:', tabId);
    
    // Monaco Editorのコマンドとして追加
    const commandId = editor.addCommand(monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.Enter, async () => {
      console.log('🔍 Ctrl+Enter pressed in tab editor, tabId:', tabId);
      
      // エディタから直接SQLを取得
      const currentEditorSql = editor.getValue();
      console.log('🔍 Ctrl+Enter: Current editor SQL:', JSON.stringify(currentEditorSql));
      
      // 選択範囲があるかチェック
      const selection = editor.getSelection();
      const hasSelection = selection && !selection.isEmpty();
      console.log('🔍 Ctrl+Enter: Has selection:', hasSelection);
      
      let sqlToExecute: string;
      
      if (hasSelection) {
        // 選択範囲がある場合は選択されたSQLを実行
        const model = editor.getModel();
        sqlToExecute = model ? model.getValueInRange(selection) : '';
        console.log('🔍 Ctrl+Enter: Selected SQL:', JSON.stringify(sqlToExecute));
      } else {
        // 選択範囲がない場合は全体SQLを実行
        sqlToExecute = currentEditorSql;
        console.log('🔍 Ctrl+Enter: Full SQL:', JSON.stringify(sqlToExecute));
      }
      
      // まずタブストアのSQLを最新のエディタ内容に更新
      const { useTabStore } = await import('../stores/useTabStore');
      const { useTabPageStore } = await import('../stores/useTabPageStore');
      const tabStore = useTabStore.getState();
      const tabPageStore = useTabPageStore.getState();
      
      // エディタの内容でタブのSQLを更新
      tabStore.updateTabSql(tabId, currentEditorSql);
      console.log('🔍 Ctrl+Enter: Updated tab SQL to current editor content');
      
      // SQL実行
      try {
        await tabPageStore.executeTabSql(tabId);
        console.log('🔍 Ctrl+Enter: executeTabSql completed for tabId:', tabId);
      } catch (error) {
        console.error('🔍 Ctrl+Enter: Error executing SQL:', error);
      }
    });
    console.log('🔍 useTabMonacoEditor: Command ID registered:', commandId);
    
    // 追加：DOM keydownイベントリスナーも登録してテスト
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        console.log('🔍 DOM keydown: Ctrl+Enter detected in tab editor, tabId:', tabId);
        event.preventDefault();
        event.stopPropagation();
        // この時点で実行もしてみる
        (async () => {
          const { useTabPageStore } = await import('../stores/useTabPageStore');
          const tabPageStore = useTabPageStore.getState();
          console.log('🔍 DOM handler: About to call executeTabSql for tabId:', tabId);
          await tabPageStore.executeTabSql(tabId);
          console.log('🔍 DOM handler: executeTabSql completed for tabId:', tabId);
        })();
      }
    };
    
    // エディタのDOMエレメントにイベントリスナーを追加
    const editorElement = editor.getDomNode();
    if (editorElement) {
      editorElement.addEventListener('keydown', handleKeyDown, true); // capture phase
      console.log('🔍 useTabMonacoEditor: DOM keydown listener added for tabId:', tabId);
    }

    // Ctrl/Cmd + Shift + F: 整形
    console.log('🔍 useTabMonacoEditor: Adding Ctrl+Shift+F command for tabId:', tabId);
    editor.addCommand(monacoApi.KeyMod.CtrlCmd | monacoApi.KeyMod.Shift | monacoApi.KeyCode.KeyF, async () => {
      console.log('🔍 Ctrl+Shift+F pressed in tab editor, tabId:', tabId);
      const { useTabPageStore } = await import('../stores/useTabPageStore');
      const tabPageStore = useTabPageStore.getState();
      await tabPageStore.formatTabSql(tabId);
    });

    // Ctrl/Cmd + L: クリア
    console.log('🔍 useTabMonacoEditor: Adding Ctrl+L command for tabId:', tabId);
    editor.addCommand(monacoApi.KeyMod.CtrlCmd | monacoApi.KeyCode.KeyL, async () => {
      console.log('🔍 Ctrl+L pressed in tab editor, tabId:', tabId);
      const { useTabStore } = await import('../stores/useTabStore');
      const tabStore = useTabStore.getState();
      tabStore.updateTabSql(tabId, '');
    });

    // F1: ショートカットヘルプ
    console.log('🔍 useTabMonacoEditor: Adding F1 command for tabId:', tabId);
    editor.addCommand(monacoApi.KeyCode.F1, async () => {
      console.log('🔍 F1 pressed in tab editor, tabId:', tabId);
      const { useUIStore } = await import('../stores/useUIStore');
      const uiStore = useUIStore.getState();
      uiStore.setShowShortcutHelp(true);
    });
    
    // パラメータ（{}で囲まれた文字列）を保護するカスタムフォーマッタープロバイダーを登録
    console.log('🔍 useTabMonacoEditor: Registering parameter formatter for tabId:', tabId);
    MonacoParameterFormatter.registerFormattingProvider(monacoApi);
    
    monacoApi.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: async (model: monaco.editor.ITextModel, position: monaco.Position) => {
        
        // このエディタのモデルかチェック（より厳密）
        const isTabEditorModel = model === editor.getModel();
        if (!isTabEditorModel) {
          return { suggestions: [] };
        }
        
        try {
          // 元エディタと同じSQL補完ロジック
          
          const sql = model.getValue();
          const offset = model.getOffsetAt(position);
          
          // SQL補完API呼び出し（元エディタと同じ）
          const response = await getSqlSuggestions({
            sql,
            position: offset,
            context: {}
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
          
          // 表示制御フィルタを適用（直接API呼び出し）
          let filteredSuggestions = suggestions;
          try {
            
            // 直接API呼び出しで表示制御設定を取得
            const visibilityResponse = await fetch('/api/v1/admin/visibility-settings');
            if (!visibilityResponse.ok) {
              throw new Error(`表示制御設定の取得に失敗: ${visibilityResponse.status}`);
            }
            
            const visibilityData = await visibilityResponse.json();
            
            // レスポンスはオブジェクト形式: {LOG: {}, PUBLIC: {}, ...}
            // キーが"schema.table" 形式で、値が設定オブジェクト
            const visibilitySettings = Object.entries(visibilityData).map(([key, settings]) => {
              const [schema, table] = key.split('.');
              return {
                object_type: 'table',
                object_name: table || key, // テーブル名のみ
                schema: schema,
                settings: settings as Record<string, boolean>
              };
            });
            
            // ユーザーロールを取得（動的）
            const userRole = user?.role;
            if (!userRole) {
              return { suggestions };
            }
            
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
                    return shouldShow;
                  }
                  
                  // DEFAULT設定を確認
                  const defaultSetting = setting.settings['DEFAULT'];
                  if (defaultSetting !== undefined) {
                    const shouldShow = defaultSetting;
                    return shouldShow;
                  }
                }
                
                // 設定がない場合は非表示（フォールバック禁止）
                return false;
              }
              
              // テーブル・ビュー以外（カラム、関数、キーワードなど）はそのまま表示
              return true;
            });
            
          } catch (error) {
            console.error('❌タブエディタ: 表示制御フィルタエラー', error);
            filteredSuggestions = suggestions;
          }

          // エディタ内容から動的補完候補を追加
          let enhancedSuggestions: monaco.languages.CompletionItem[] = filteredSuggestions;
          try {
            
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
            }
            
          } catch (error) {
            console.error('❌タブエディタ: 動的補完エラー', error);
            enhancedSuggestions = filteredSuggestions;
          }

          return { suggestions: enhancedSuggestions };
        } catch (error) {
          console.error('❌タブエディタ: SQL補完候補の取得エラー', error);
          
          // フォールバック: 基本的なSQL補完候補
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
              sortText: '200_SELECT', // コンテキスト補完とAPI補完の後に表示
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
    
    // エディタにフォーカス
    editor.focus();
    
  }, [user, tabId]);

  // エディタ操作用の関数群（元エディタと同じ実装）
  const getSelectedSQL = useCallback(() => {
    // このタブのエディタインスタンスが必要ですが、
    // handleEditorDidMountのスコープ外なので、
    // 実際の実装はTabSQLEditor.tsxで行います
    return '';
  }, []);

  const hasSelection = useCallback(() => {
    // このタブのエディタインスタンスが必要ですが、
    // handleEditorDidMountのスコープ外なので、
    // 実際の実装はTabSQLEditor.tsxで行います
    return false;
  }, []);

  const insertText = useCallback((text: string) => {
    // このタブのエディタインスタンスが必要ですが、
    // handleEditorDidMountのスコープ外なので、
    // 実際の実装はTabSQLEditor.tsxで行います
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
