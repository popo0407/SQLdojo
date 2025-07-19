import { useState, useCallback } from 'react';
import { apiClient } from '../api/apiClient';

export const useDownloadCsv = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  // session_idを使ってCSVダウンロード
  const downloadCsv = useCallback(async (sessionId: string) => {
    setIsDownloading(true);
    try {
      const blob = await apiClient.downloadCsv(sessionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'query_result.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert(`CSVダウンロードに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsDownloading(false);
    }
  }, []);

  return {
    downloadCsv,
    isDownloading
  };
}; 