import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportControls } from '../ExportControls';
import { useUIStore } from '../../../stores/useUIStore';

// 簡易: 実際のZustandストアをそのまま利用

describe('ExportControls integration', () => {
  beforeEach(() => {
    // 状態初期化
    useUIStore.getState().reset();
  });

  it('ファイル名入力でstoreに反映される', () => {
    render(<ExportControls />);
    const input = screen.getByPlaceholderText('result') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'custom_name' } });
    expect(useUIStore.getState().exportFilename).toBe('custom_name');
  });

  it('Excelボタンはフラグ無効時にdisabled', () => {
  useUIStore.getState().setConfigSettings({});
    render(<ExportControls />);
    const btn = screen.getByText('Excel') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('Excelボタンはフラグ有効時にenabled', () => {
  useUIStore.getState().setConfigSettings({});
    render(<ExportControls />);
    const btn = screen.getByText('Excel') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});
