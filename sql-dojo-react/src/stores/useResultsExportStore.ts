import { create } from 'zustand';
import { 
  downloadCsvFromCache, 
  downloadCsvDirect, 
  downloadExcelFromCache, 
  fetchClipboardTsvFromCache 
} from '../api/sqlService';
import { useResultsDataStore } from './useResultsDataStore';
import { useResultsFilterStore } from './useResultsFilterStore';
import { useResultsSessionStore } from './useResultsSessionStore';
import { useUIStore } from './useUIStore';
import { useChartStore } from './useChartStore';
import { useProgressStore } from './useProgressStore';
import type { ResultsExportActions } from '../types/results';

export const createResultsExportStore = () => create<ResultsExportActions>(() => ({
  // CSVダウンロードアクション
  downloadCsv: async () => {
    const filterStore = useResultsFilterStore.getState();
    const sessionStore = useResultsSessionStore.getState();
    const uiStore = useUIStore.getState();
  const filename = useUIStore.getState().exportFilename;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentSql: string = ((window as any).__SQL_EDITOR__?.getValue?.() || '') as string;
    
  if (sessionStore.sessionId) {
      uiStore.setIsDownloading(true);
      const progressStore = useProgressStore.getState();
      progressStore.showProgress({
        message: 'CSVファイルを生成中...'
      });
      try {
        const blob = await downloadCsvFromCache({
          session_id: sessionStore.sessionId,
          filters: filterStore.filters,
          sort_by: filterStore.sortConfig?.key,
          sort_order: (filterStore.sortConfig?.direction?.toUpperCase() || 'ASC') as 'ASC' | 'DESC'
        });
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename ? sanitizeFilename(filename, 'csv') : 'result.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch {
        uiStore.pushToast('CSVダウンロードに失敗しました', 'danger');
      } finally {
        uiStore.setIsDownloading(false);
        progressStore.hideProgress();
      }
    } else {
      // 直接SQL経路 (非キャッシュ) が使えるならサーバへ、なければローカル
      if (currentSql.trim()) {
        uiStore.setIsDownloading(true);
        const progressStore = useProgressStore.getState();
        progressStore.showProgress({
          message: 'SQLを実行してCSVを生成中...'
        });
        try {
          const blob = await downloadCsvDirect({ sql: currentSql, filename });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename ? sanitizeFilename(filename, 'csv') : 'result.csv';
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
  } catch {
          // フォールバック: ローカル
          const exportStore = useResultsExportStore.getState();
          exportStore.downloadCsvLocal();
        } finally {
          uiStore.setIsDownloading(false);
          progressStore.hideProgress();
        }
      } else {
        const exportStore = useResultsExportStore.getState();
        exportStore.downloadCsvLocal();
      }
    }
  },
  
  downloadCsvLocal: () => {
    const dataStore = useResultsDataStore.getState();
    const uiStore = useUIStore.getState();
  const filename = uiStore.exportFilename;
    if (!dataStore.allData.length || !dataStore.columns.length) {
  uiStore.pushToast('データがありません', 'warning');
      return;
    }
    const csvRows = [dataStore.columns.join(',')];
    for (const row of dataStore.allData) {
      csvRows.push(dataStore.columns.map(col => JSON.stringify(row[col] ?? '')).join(','));
    }
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename ? sanitizeFilename(filename, 'csv') : 'result.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  downloadExcel: async () => {
    const uiStore = useUIStore.getState();
    const filterStore = useResultsFilterStore.getState();
    const sessionStore = useResultsSessionStore.getState();
    const chartStore = useChartStore.getState();
    const filename = uiStore.exportFilename;
    
    if (!sessionStore.sessionId) {
      uiStore.pushToast('セッションがありません。再実行してください', 'danger');
      return;
    }
    
    uiStore.setIsDownloading(true);
    const progressStore = useProgressStore.getState();
    progressStore.showProgress({
      message: 'Excelファイルを生成中...'
    });
    try {
      const blob = await downloadExcelFromCache({
        session_id: sessionStore.sessionId,
        filters: filterStore.filters,
        sort_by: filterStore.sortConfig?.key,
        sort_order: (filterStore.sortConfig?.direction?.toUpperCase() || 'ASC'),
        filename,
        chart_config: chartStore.currentConfig || undefined, // グラフ設定を追加
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename ? sanitizeFilename(filename, 'xlsx') : 'result.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      uiStore.pushToast('Excelダウンロードに失敗しました', 'danger');
    } finally {
      uiStore.setIsDownloading(false);
      progressStore.hideProgress();
    }
  },
  copyTsvToClipboard: async () => {
    const uiStore = useUIStore.getState();
    const filterStore = useResultsFilterStore.getState();
    const sessionStore = useResultsSessionStore.getState();
    const dataStore = useResultsDataStore.getState();
    
    try {
      if (uiStore.configSettings?.max_records_for_clipboard_copy === 0) {
        uiStore.pushToast('クリップボードコピーは無効化されています', 'danger');
        return;
      }
      
      let tsv: string;
      
      if (sessionStore.sessionId) {
        // セッションがある場合はAPI経由で取得
        const progressStore = useProgressStore.getState();
        progressStore.showProgress({
          message: 'データをクリップボード用に準備中...'
        });
        tsv = await fetchClipboardTsvFromCache({
          session_id: sessionStore.sessionId,
          filters: filterStore.filters,
          sort_by: filterStore.sortConfig?.key,
          sort_order: (filterStore.sortConfig?.direction?.toUpperCase() || 'ASC'),
          filename: uiStore.exportFilename,
        });
      } else {
        // セッションがない場合はローカルデータから生成
        if (!dataStore.allData.length || !dataStore.columns.length) {
          uiStore.pushToast('データがありません', 'warning');
          return;
        }
        
        // ヘッダー行
        const tsvRows = [dataStore.columns.join('\t')];
        
        // データ行
        for (const row of dataStore.allData) {
          const rowValues = dataStore.columns.map(col => String(row[col] ?? ''));
          tsvRows.push(rowValues.join('\t'));
        }
        
        tsv = tsvRows.join('\n');
      }
      
      await navigator.clipboard.writeText(tsv);
      uiStore.pushToast('TSVをコピーしました', 'success');
      
      // セッション経由の場合は進捗表示を隠す
      if (sessionStore.sessionId) {
        const progressStore = useProgressStore.getState();
        progressStore.hideProgress();
      }
    } catch {
      uiStore.pushToast('TSVコピーに失敗しました', 'danger');
      
      // エラー時も進捗表示を隠す
      if (sessionStore.sessionId) {
        const progressStore = useProgressStore.getState();
        progressStore.hideProgress();
      }
    }
  },
}));

export const useResultsExportStore = createResultsExportStore(); 

// ファイル名サニタイズ
function sanitizeFilename(name: string, ext: string): string {
  const base = (name || '').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120) || 'result';
  return base.endsWith(`.${ext}`) ? base : `${base}.${ext}`;
}