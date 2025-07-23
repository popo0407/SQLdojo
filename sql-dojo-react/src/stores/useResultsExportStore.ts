import { create } from 'zustand';
import { downloadCsvFromCache } from '../api/sqlService';
import { useResultsDataStore } from './useResultsDataStore';
import { useResultsFilterStore } from './useResultsFilterStore';
import { useResultsSessionStore } from './useResultsSessionStore';
import { useUIStore } from './useUIStore';
import type { ResultsExportActions } from '../types/results';

export const createResultsExportStore = () => create<ResultsExportActions>(() => ({
  // CSVダウンロードアクション
  downloadCsv: async () => {
    const filterStore = useResultsFilterStore.getState();
    const sessionStore = useResultsSessionStore.getState();
    const uiStore = useUIStore.getState();
    
    if (sessionStore.sessionId) {
      uiStore.setIsDownloading(true);
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
        a.download = 'result.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'CSVダウンロードに失敗しました';
        alert('CSVダウンロードに失敗しました: ' + errorMessage);
      } finally {
        uiStore.setIsDownloading(false);
      }
    } else {
      // ローカルデータからCSVダウンロード
      const exportStore = useResultsExportStore.getState();
      exportStore.downloadCsvLocal();
    }
  },
  
  downloadCsvLocal: () => {
    const dataStore = useResultsDataStore.getState();
    if (!dataStore.allData.length || !dataStore.columns.length) {
      alert('データがありません');
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
    a.download = 'result.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
}));

export const useResultsExportStore = createResultsExportStore(); 