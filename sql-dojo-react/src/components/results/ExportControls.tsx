import React, { useCallback } from 'react';
import { Form, InputGroup, Button } from 'react-bootstrap';
import { useUIStore } from '../../stores/useUIStore';
import { useResultsExportStore } from '../../stores/useResultsExportStore';
import { useResultsSessionStore } from '../../stores/useResultsSessionStore';
import { useResultsDataStore } from '../../stores/useResultsDataStore';

interface ExportControlsProps {
  compact?: boolean;
}

/**
 * エクスポート操作群 (任意ファイル名 / CSV / Excel / TSVコピー)
 */
export const ExportControls: React.FC<ExportControlsProps> = ({ compact = false }) => {
  const ui = useUIStore();
  const exportStore = useResultsExportStore();
  const dataStore = useResultsDataStore();
  const sessionStore = useResultsSessionStore();
  const sessionEnabled = !!sessionStore.sessionId;
  const clipboardLimit = ui.configSettings?.max_records_for_clipboard_copy;

  const setFilename = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    ui.setExportFilename?.(e.target.value);
  }, [ui]);

  const onCsv = useCallback(() => {
    exportStore.downloadCsv();
  }, [exportStore]);

  const onExcel = useCallback(() => {
    // SQLが空でも既存表示データがある場合はローカルCSVではなくExcel生成のために一時的にSQL再構築は不可 -> サーバ側要求がSQL依存のため、UIのみの回避としてデータ無し時だけメッセージ
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(((window as any).__SQL_EDITOR__?.getValue?.() || '') as string).trim() && !dataStore.allData.length) {
      ui.pushToast('データがありません', 'warning');
      return;
    }
    exportStore.downloadExcel?.();
  }, [exportStore, dataStore.allData.length, ui]);

  const onCopyTsv = useCallback(() => {
    exportStore.copyTsvToClipboard?.();
  }, [exportStore]);

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <InputGroup size="sm" style={{ width: compact ? 240 : 300 }}>
        <InputGroup.Text>ファイル名</InputGroup.Text>
        <Form.Control
          placeholder="result"
          value={ui.exportFilename || ''}
          onChange={setFilename}
        />
      </InputGroup>
      <div style={{ display: 'flex', gap: 6 }}>
        <Button variant="outline-primary" size="sm" onClick={onCsv} disabled={ui.isDownloading}>CSV</Button>
        <Button 
          variant="outline-success" 
          size="sm" 
          onClick={onExcel} 
          disabled={ui.isDownloading || !sessionEnabled}
          title={sessionEnabled ? 'Excelダウンロード' : 'セッションがありません'}
        >Excel</Button>
        <Button 
          variant="outline-secondary" 
          size="sm" 
          onClick={onCopyTsv}
          disabled={ui.isDownloading}
          title={clipboardLimit === 0 ? 'クリップボードコピーは無効化されています' : 'TSVをクリップボードへ'}
        >TSVコピー</Button>
      </div>
    </div>
  );
};

export default ExportControls;
