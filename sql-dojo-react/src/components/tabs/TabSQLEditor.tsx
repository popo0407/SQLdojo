import React, { useEffect, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import { Selection } from 'monaco-editor';
import { Stack } from 'react-bootstrap';
import styles from './TabSQLEditor.module.css';
import { useTabStore } from '../../stores/useTabStore';
import { useTabPageStore } from '../../stores/useTabPageStore';
import { useProgressStore } from '../../stores/useProgressStore';
import { useTabMonacoEditor } from '../../hooks/useTabMonacoEditor';
import { useLayoutControl } from '../../hooks/useLayoutControl';
import { EditorToolbar } from '../../components/editor/EditorToolbar';
import { getTabEditorOptions } from '../../config/editorConfig';
import { TemplateSaveModal } from '../../features/templates/components/TemplateSaveModal';
import { useTemplates, useTemplateModals } from '../../features/templates/hooks/useTemplates';
import type { TemplateDropdownItem, TemplateWithPreferences } from '../../features/templates/types/template';
import { generateDummyData } from '../../api/sqlService';
import { useChartStore } from '../../stores/useChartStore';
import { convertChartConfigToXML, hasOutputTag, extractChartConfigFromSQL } from '../../utils/templateUtils';

interface TabSQLEditorProps {
  tabId: string;
}

/**
 * タブ対応SQLエディタコンポーネント
 * 特定のタブの状態を管理し、既存のSQLエディタ機能を提供
 */
const TabSQLEditor: React.FC<TabSQLEditorProps> = ({ tabId }) => {
  // エディタインスタンスを保存
  const [editorInstance, setEditorInstance] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);

  const { 
    getTab, 
    updateTabSql, 
    activeTabId,
    updateTabParameters
  } = useTabStore();
  
  // タブページストア（統合管理）
  const tabPageStore = useTabPageStore();
  const { 
    executeTabSql: executeTabSqlIntegrated,
    formatTabSql,
    downloadTabCsv
  } = tabPageStore;
  
  const tab = getTab(tabId);
  
  // 進捗ストアから状態を取得
  const { 
    isVisible: showProgress, 
    totalCount, 
    currentCount, 
    progressPercentage, 
    message 
  } = useProgressStore();
  
  // カスタムフックを使用（タブエディタ専用）
  const { 
    handleEditorDidMount: handleTabEditorDidMount,
    handleTabActivated,
    handleTabDeactivated
  } = useTabMonacoEditor(tabId);
  
  // レイアウト制御フックを使用
  useLayoutControl();

  // テンプレート機能のフック
  const { 
    state, 
    getVisibleTemplates, 
    saveTemplate,
    initializeTemplates
  } = useTemplates();

  // チャートストア（グラフ表示状態の確認用）
  const { currentConfig: chartConfig } = useChartStore();

  // テンプレートの初期化
  useEffect(() => {
    initializeTemplates();
  }, [initializeTemplates]);

  // SQL変更時にプレースホルダーを更新
  useEffect(() => {
    if (tab?.sql) {
      updateTabParameters(tabId, tab.sql);
    }
  }, [tabId, tab?.sql, updateTabParameters]);

  const {
    isSaveModalOpen,
    openSaveModal,
    closeSaveModal,
  } = useTemplateModals();

  // アクティブタブかどうかを判定
  const isActiveTab = activeTabId === tabId;

  // タブの切り替えを監視して状態保存・復元
  useEffect(() => {
    if (isActiveTab) {
      // タブがアクティブになった時
      handleTabActivated();
    } else {
      // タブが非アクティブになった時
      handleTabDeactivated();
    }
  }, [isActiveTab, handleTabActivated, handleTabDeactivated]);

  // 実際のエディタ操作関数（元エディタのuseEditorStoreと同じ実装）
  const getTabSelectedSQL = useCallback(() => {
    if (!editorInstance) return '';

    const selection = editorInstance.getSelection();
    if (!selection || selection.isEmpty()) {
      // 選択範囲がない場合は全SQLを返す
      return editorInstance.getValue();
    }

    const model = editorInstance.getModel();
    if (!model) return '';

    return model.getValueInRange(selection);
  }, [editorInstance]);

  const hasTabSelection = useCallback(() => {
    if (!editorInstance) return false;

    const selection = editorInstance.getSelection();
    return selection ? !selection.isEmpty() : false;
  }, [editorInstance]);

  const insertTabText = useCallback((text: string) => {
    if (!editorInstance) {
      console.warn('Editor instance is not available');
      return;
    }
    
    try {
      let selection = editorInstance.getSelection();
      if (!selection) {
        const position = editorInstance.getPosition();
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
        editorInstance.executeEdits('tab-insert', [op]);
        editorInstance.focus();
      } else {
        console.warn('No valid selection or position found');
      }
    } catch (error) {
      console.error('Error inserting text:', error);
      const errorMessage = error instanceof Error ? error.message : 'テキスト挿入に失敗しました';
      alert(errorMessage);
    }
  }, [editorInstance]);

  // タブエディタAPIをuseTabPageStoreに登録
  useEffect(() => {
    const editorAPI = {
      getSelectedSQL: () => getTabSelectedSQL(),
      hasSelection: () => hasTabSelection(),
      insertText: (text: string) => insertTabText(text)
    };
    
    // useTabPageStoreにタブエディタを登録
    tabPageStore.registerTabEditor(tabId, editorAPI);
    
    return () => {
      // クリーンアップ
      tabPageStore.unregisterTabEditor(tabId);
    };
  }, [tabId, getTabSelectedSQL, hasTabSelection, insertTabText, tabPageStore]);

  // クリーンアップでエディタ登録を削除
  useEffect(() => {
    return () => {
      tabPageStore.unregisterTabEditor(tabId);
    };
  }, [tabId, tabPageStore]);

  if (!tab) {
    return (
      <div className={styles.editorContainer}>
        <p>タブが見つかりません: {tabId}</p>
      </div>
    );
  }

  // タブ固有のSQL実行（統合管理経由）
  const handleExecuteSql = async () => {
    const currentTab = getTab(tabId);
    if (!currentTab) return;

    // SQLに<output>タグが含まれているかチェック
    const hasChartConfig = hasOutputTag(currentTab.sql);
    
    if (hasChartConfig) {
      // パラメータ値から出力方法を取得
      const outputMethod = currentTab.parameterState.values['出力方法'] as string;
      
      if (outputMethod === 'Excel') {
        // Excel出力の場合
        await handleExcelOutput(currentTab.sql);
        return;
      } else {
        // ブラウザ出力の場合：グラフ設定をチャートストアに反映
        const chartConfig = extractChartConfigFromSQL(currentTab.sql);
        if (chartConfig) {
          const { setChartConfig } = useChartStore.getState();
          setChartConfig(chartConfig);
        }
      }
    }
    
    // 通常のSQL実行（ブラウザ表示）
    await executeTabSqlIntegrated(tabId);
  };

  // Excel出力処理
  const handleExcelOutput = async (sql: string) => {
    try {
      // パラメータ置換処理を実行（ブラウザ出力と同様）
      const replacedSql = getTab(tabId)?.sql ? 
        useTabStore.getState().getTabReplacedSql(tabId, sql) : sql;
      
      // Excel出力時は置換済みSQLで実行（タブ状態は更新しない）
      const { executeSqlOnCache } = await import('../../api/sqlService');
      const response = await executeSqlOnCache({ sql: replacedSql });
      
      if (!response.success || !response.session_id) {
        console.error('SQL実行に失敗しました:', response.error_message);
        return;
      }

      // グラフ設定を抽出
      const chartConfig = extractChartConfigFromSQL(sql);
      
      if (!chartConfig) {
        console.error('グラフ設定が見つかりません');
        return;
      }

      // Excel出力処理
      console.log('Excelファイルを生成中...');
      
      const { downloadExcelFromCache } = await import('../../api/sqlService');
      const blob = await downloadExcelFromCache({
        session_id: response.session_id,
        chart_config: chartConfig,
        filename: 'query_result_with_chart.xlsx'
      });

      // ファイルダウンロード
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'query_result_with_chart.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      console.log('Excelファイルのダウンロードが完了しました');
    } catch (error) {
      console.error('Excel出力エラー:', error);
      // エラー表示の処理を追加
    }
  };

  // SQL更新ハンドラー
  const handleSqlChange = (value: string | undefined) => {
    const newSql = value || '';
    updateTabSql(tabId, newSql);
    // SQL変更時にプレースホルダーを即座に更新
    updateTabParameters(tabId, newSql);
  };

  // SQLクリア
  const handleClear = () => {
    updateTabSql(tabId, '');
    updateTabParameters(tabId, '');
  };

  // SQL整形（統合管理経由）
  const handleFormat = async () => {
    await formatTabSql(tabId);
  };

  // テンプレート選択ハンドラ（ツールバーのドロップダウン用）
  const handleSelectTemplateFromToolbar = (templateSql: string) => {
    const currentSql = tab.sql || '';
    const selectedText = getTabSelectedSQL();
    
    if (selectedText) {
      // 選択範囲がある場合は選択部分を置換
      insertTabText(templateSql);
    } else if (currentSql.trim()) {
      // エディタに内容があるが選択がない場合は、末尾に追加
      const separator = currentSql.endsWith('\n') ? '' : '\n\n';
      const newSql = currentSql + separator + templateSql;
      updateTabSql(tabId, newSql);
    } else {
      // エディタが空の場合は新規として設定
      updateTabSql(tabId, templateSql);
    }
  };

  // テンプレート保存ハンドラ
  const handleSaveTemplate = () => {
    openSaveModal();
  };

  // ダミーデータ生成ハンドラ
  const handleGenerateDummyData = async () => {
    try {
      console.log('ダミーデータ生成開始...');
      
      // ダミーデータAPIを呼び出し（SQL実行と同じ流れ）
      const response = await generateDummyData({ rowCount: 10000 });
      
      console.log('ダミーデータAPI レスポンス:', response);
      
      if (response.success && response.session_id) {
        // タブのSQL実行成功時と同じ処理を行う
        const { setTabSessionId, setTabExecuting, updateTabResults } = useTabStore.getState();
        
        // セッションIDを設定
        setTabSessionId(tabId, response.session_id);
        setTabExecuting(tabId, false);
        
        // ダミーデータをキャッシュから読み込む（少し待ってから）
        try {
          // データベースへの書き込み完了を待つ
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { readSqlCache } = await import('../../api/sqlService');
          const cacheResult = await readSqlCache({
            session_id: response.session_id,
            page: 1,
            page_size: 100
          });
          
          console.log('キャッシュ読み込み結果:', cacheResult);
          console.log('データサンプル:', cacheResult.data?.slice(0, 3));
          console.log('カラム情報:', cacheResult.columns);
          console.log('データの最初の行:', cacheResult.data?.[0]);
          console.log('データの形式確認:', typeof cacheResult.data?.[0], Array.isArray(cacheResult.data?.[0]));
          
          if (cacheResult.success && cacheResult.data && cacheResult.data.length > 0) {
            // データ形式を確認して必要に応じて変換
            let processedData = cacheResult.data;
            
            // データが配列の配列の場合、オブジェクト形式に変換
            if (Array.isArray(cacheResult.data) && cacheResult.data.length > 0 && Array.isArray(cacheResult.data[0])) {
              console.log('配列形式のデータを検出、オブジェクト形式に変換中...');
              const rawData = cacheResult.data as unknown;
              const arrayData = rawData as unknown[][];
              processedData = arrayData.map((row: unknown[]) => {
                const obj: Record<string, string | number | boolean | null> = {};
                cacheResult.columns?.forEach((column, index) => {
                  const value = row[index];
                  // 型を適切に変換
                  if (value === null || value === undefined) {
                    obj[column] = null;
                  } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    obj[column] = value;
                  } else {
                    obj[column] = String(value);
                  }
                });
                return obj;
              }) as Array<Record<string, string | number | boolean | null>>;
              console.log('変換後のデータサンプル:', processedData.slice(0, 2));
            }
            
            // 取得したデータをタブの結果に設定
            updateTabResults(tabId, {
              data: processedData,
              columns: cacheResult.columns || [],
              totalCount: cacheResult.total_count || 0,
              executionTime: response.execution_time || 0,
              lastExecutedSql: `-- ダミーデータ生成 (${response.total_count}行)`,
              hasMore: (cacheResult.total_count || 0) > (cacheResult.data?.length || 0),
              error: null,
            });
            
            console.log('タブ結果データ設定完了:', {
              dataLength: cacheResult.data.length,
              columns: cacheResult.columns,
              totalCount: cacheResult.total_count
            });
          } else {
            // キャッシュ読み込みに失敗した場合
            updateTabResults(tabId, {
              data: null,
              executionTime: response.execution_time || 0,
              lastExecutedSql: `-- ダミーデータ生成 (${response.total_count}行)`,
              error: cacheResult.error_message || 'データの読み込みに失敗しました',
            });
          }
        } catch (error) {
          console.error('キャッシュデータ読み込みエラー:', error);
          updateTabResults(tabId, {
            data: null,
            executionTime: response.execution_time || 0,
            lastExecutedSql: `-- ダミーデータ生成 (${response.total_count}行)`,
            error: 'データの読み込みに失敗しました',
          });
        }
        
        console.log('ダミーデータ生成成功:', {
          session_id: response.session_id,
          total_count: response.total_count,
          message: response.message
        });
        
      } else {
        // エラー処理
        console.error('ダミーデータ生成に失敗:', response.error_message);
        alert(response.error_message || 'ダミーデータ生成に失敗しました');
      }
    } catch (error) {
      console.error('ダミーデータ生成エラー:', error);
      console.error('エラータイプ:', typeof error);
      console.error('エラー詳細:', JSON.stringify(error, null, 2));
      alert('ダミーデータ生成中にエラーが発生しました');
    }
  };

  // テンプレート変換ユーティリティ
  const convertToDropdownItems = (templates: TemplateWithPreferences[]): TemplateDropdownItem[] => {
    const converted = templates.map(template => ({
      id: template.template_id,
      name: template.name,
      sql: template.sql,
      type: template.type,
      is_common: template.is_common,
      created_at: template.created_at
    }));
    
    return converted;
  };

  // エディタマウント処理（タブエディタ専用）
  const handleCombinedEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monacoApi: typeof monaco) => {
    // エディタインスタンスを保存
    setEditorInstance(editor);
    
    // タブエディタ専用の処理のみを実行
    try {
      handleTabEditorDidMount(editor, monacoApi);
    } catch (error) {
      console.error('TabSQLEditor: Error in handleTabEditorDidMount:', error);
    }
    
    // タブページストアにエディタAPIを登録（実際の関数を使用）
    const editorAPI = {
      getSelectedSQL: () => getTabSelectedSQL(),
      hasSelection: () => hasTabSelection(),
      insertText: (text: string) => insertTabText(text)
    };
    tabPageStore.registerTabEditor(tabId, editorAPI);
  };

  return (
    <Stack gap={2} className={styles.editorContainer}>
      {/* ツールバー */}
      <EditorToolbar
        onFormat={handleFormat}
        onClear={handleClear}
        onExecute={handleExecuteSql}
        onSelectTemplate={handleSelectTemplateFromToolbar}
        onSaveTemplate={handleSaveTemplate}
        onGenerateDummyData={handleGenerateDummyData}
        isPending={tab.isExecuting}
        hasSql={!!tab.sql.trim()}
        hasSelection={hasTabSelection()} // useTabPageStoreの関数を使用
        templates={convertToDropdownItems(getVisibleTemplates())}
        isTemplatesLoading={state.isLoading}
        tabId={tabId} // タブ固有のレイアウト状態管理
        onDownloadCsv={() => downloadTabCsv(tabId)} // CSV直接ダウンロード
        progressData={{
          total_count: totalCount,
          current_count: currentCount,
          progress_percentage: progressPercentage,
          message: message,
        }}
        showProgress={showProgress && isActiveTab}
        hasChart={!!chartConfig}
      />

      {/* Monaco Editor 本体 */}
      <div className={styles.editorWrapper}>
        <Editor
          height="100%"
          language="sql"
          theme="vs-light"
          value={tab.sql}
          onChange={handleSqlChange}
          onMount={handleCombinedEditorDidMount}
          options={getTabEditorOptions()}
        />
      </div>

      {/* テンプレート保存モーダル */}
      <TemplateSaveModal
        isOpen={isSaveModalOpen}
        onClose={closeSaveModal}
        initialSql={(() => {
          // グラフ設定がある場合はXMLタグを追加
          let sql = tab.sql;
          if (chartConfig) {
            const chartXML = convertChartConfigToXML(chartConfig);
            sql = sql + '\n\n' + chartXML;
          }
          return sql;
        })()}
        onSave={async (name: string, sqlContent: string) => {
          await saveTemplate(name, sqlContent);
          closeSaveModal();
        }}
        isLoading={state.isLoading}
      />
    </Stack>
  );
};

export default TabSQLEditor;
