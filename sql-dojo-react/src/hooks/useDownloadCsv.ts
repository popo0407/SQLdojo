import { useState, useCallback } from 'react';
import { apiClient } from '../api/apiClient';

export const useDownloadCsv = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  // session_idを使ってCSVダウンロード
  const downloadCsv = useCallback(async (sessionId: string) => {
    setIsDownloading(true);
    try {
      const response = await apiClient.downloadCsv(sessionId);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // ファイル名を取得
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'query_result.csv';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorText = await response.text();
        throw new Error(`CSVダウンロードに失敗しました: ${errorText}`);
      }
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