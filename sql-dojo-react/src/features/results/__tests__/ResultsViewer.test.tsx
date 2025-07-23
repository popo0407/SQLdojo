import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResultsViewer from '../ResultsViewer';
import { act } from 'react-dom/test-utils';
import { useResultsDataStore } from '../../../stores/useResultsDataStore';
import { useUIStore } from '../../../stores/useUIStore';
import { useResultsPaginationStore } from '../../../stores/useResultsPaginationStore';

describe('ResultsViewer', () => {
  it('データがない場合はEmptyStateメッセージが表示される', () => {
    render(<ResultsViewer />);
    // 初期状態で表示されるメッセージを検証
    expect(screen.getByText('実行ボタンを押してSQLを実行してください。')).toBeInTheDocument();
  });

  it('データがある場合はResultTableが表示される', () => {
    // ストアにダミーデータを投入
    act(() => {
      useResultsDataStore.getState().setColumns(['id', 'name']);
      useResultsDataStore.getState().setAllData([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
      useResultsDataStore.getState().setRowCount(2);
      useUIStore.getState().setIsPending(false);
      useUIStore.getState().setIsError(false);
    });
    render(<ResultsViewer />);
    // テーブルのヘッダーやデータが表示されることを検証
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('エラー時はErrorAlertが表示される', () => {
    act(() => {
      useUIStore.getState().setIsError(true);
      useUIStore.getState().setError(new Error('テストエラー'));
    });
    render(<ResultsViewer />);
    expect(screen.getByText(/テストエラー/)).toBeInTheDocument();
  });

  it('ローディング時はLoadingSpinnerが表示される', () => {
    act(() => {
      useUIStore.getState().setIsPending(true);
      useUIStore.getState().setIsError(false);
    });
    render(<ResultsViewer />);
    expect(screen.getAllByText('SQLを実行中...').length).toBeGreaterThan(0);
  });

  it('hasMoreDataかつisLoadingMore時は追加ローディング表示', () => {
    act(() => {
      useResultsDataStore.getState().setColumns(['id']);
      useResultsDataStore.getState().setAllData([{ id: 1 }]);
      useResultsDataStore.getState().setRowCount(1);
      useUIStore.getState().setIsPending(false);
      useUIStore.getState().setIsError(false);
      useResultsPaginationStore.getState().setHasMoreData(true);
      useUIStore.getState().setIsLoadingMore(true);
    });
    render(<ResultsViewer />);
    expect(screen.getAllByText('読み込み中...').length).toBeGreaterThan(0);
  });
}); 